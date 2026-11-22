const DATABASE_NAME = 'agrosentinel-offline';
const DATABASE_VERSION = 1;
const CACHE_STORE = 'cached_collections';
const QUEUE_STORE = 'offline_operations';

let databasePromise;

export const OPERATION_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFLICT: 'conflict',
});

/** Identificador único de la operación; el servidor lo usa para no ejecutarla dos veces. */
export function createClientOperationId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function requireOwnerKey(ownerKey) {
  const normalized = String(ownerKey ?? '').trim().toLowerCase();
  if (!normalized) {
    throw new Error('No se puede guardar trabajo offline sin una cuenta activa.');
  }
  return normalized;
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Fallo en IndexedDB.'));
  });
}

function transactionCompletion(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('La transaccion IndexedDB fue cancelada.'));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Fallo en la transaccion IndexedDB.'));
  });
}

export function openOfflineDatabase(factory = globalThis.indexedDB) {
  if (!factory) {
    return Promise.reject(new Error('Este dispositivo no ofrece almacenamiento IndexedDB.'));
  }
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        const queue = database.createObjectStore(QUEUE_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        queue.createIndex('owner_status', ['ownerKey', 'status']);
        queue.createIndex('owner_created', ['ownerKey', 'createdAt']);
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () =>
      reject(request.error ?? new Error('No se pudo abrir la base local offline.'));
    request.onblocked = () =>
      reject(new Error('Cierra otras ventanas de AgroSentinel para actualizar la base offline.'));
  }).catch((error) => {
    databasePromise = undefined;
    throw error;
  });

  return databasePromise;
}

export async function cacheCollection(ownerKey, collection, value) {
  const owner = requireOwnerKey(ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(CACHE_STORE, 'readwrite');
  const completed = transactionCompletion(transaction);
  transaction.objectStore(CACHE_STORE).put({
    key: `${owner}:${collection}`,
    ownerKey: owner,
    collection,
    value,
    updatedAt: new Date().toISOString(),
  });
  await completed;
}

export async function readCachedCollection(ownerKey, collection) {
  const owner = requireOwnerKey(ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(CACHE_STORE, 'readonly');
  const record = await requestValue(
    transaction.objectStore(CACHE_STORE).get(`${owner}:${collection}`),
  );
  await transactionCompletion(transaction);
  return record?.value;
}

export async function deleteCachedCollection(ownerKey, collection) {
  const owner = requireOwnerKey(ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(CACHE_STORE, 'readwrite');
  const completed = transactionCompletion(transaction);
  transaction.objectStore(CACHE_STORE).delete(`${owner}:${collection}`);
  await completed;
}

export async function enqueueOfflineOperation(operation) {
  const ownerKey = requireOwnerKey(operation.ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(QUEUE_STORE, 'readwrite');
  const completed = transactionCompletion(transaction);
  const id = await requestValue(
    transaction.objectStore(QUEUE_STORE).add({
      ...operation,
      clientOperationId: operation.clientOperationId || createClientOperationId(),
      ownerKey,
      status: OPERATION_STATUS.PENDING,
      attempts: 0,
      createdAt: new Date().toISOString(),
      lastError: null,
    }),
  );
  await completed;
  dispatchQueueChanged(ownerKey);
  return id;
}

export async function listPendingOperations(ownerKey) {
  const owner = requireOwnerKey(ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(QUEUE_STORE, 'readonly');
  const operations = await requestValue(
    transaction
      .objectStore(QUEUE_STORE)
      .index('owner_status')
      .getAll([owner, 'pending']),
  );
  await transactionCompletion(transaction);
  return operations.sort((first, second) => first.id - second.id);
}

/** Pendientes y en conflicto, en el orden en que se crearon. */
export async function listQueuedOperations(ownerKey) {
  const owner = requireOwnerKey(ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(QUEUE_STORE, 'readonly');
  const index = transaction.objectStore(QUEUE_STORE).index('owner_status');
  const [pending, conflicts] = await Promise.all([
    requestValue(index.getAll([owner, OPERATION_STATUS.PENDING])),
    requestValue(index.getAll([owner, OPERATION_STATUS.CONFLICT])),
  ]);
  await transactionCompletion(transaction);
  return [...pending, ...conflicts].sort((first, second) => first.id - second.id);
}

async function updateOperation(id, ownerKey, update) {
  const owner = requireOwnerKey(ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(QUEUE_STORE, 'readwrite');
  const completed = transactionCompletion(transaction);
  const store = transaction.objectStore(QUEUE_STORE);
  const operation = await requestValue(store.get(id));
  let updated = null;
  if (operation?.ownerKey === owner) {
    updated = update(operation);
    store.put(updated);
  }
  await completed;
  dispatchQueueChanged(owner);
  return updated;
}

/** El servidor rechazó la operación de forma definitiva: se aparta para revisión. */
export function markOperationConflict(id, ownerKey, error, httpStatus) {
  return updateOperation(id, ownerKey, (operation) => ({
    ...operation,
    status: OPERATION_STATUS.CONFLICT,
    attempts: operation.attempts + 1,
    lastError: String(error),
    lastHttpStatus: httpStatus ?? null,
    lastAttemptAt: new Date().toISOString(),
  }));
}

/** Vuelve a poner en cola una operación en conflicto para reintentarla. */
export function requeueOperation(id, ownerKey) {
  return updateOperation(id, ownerKey, (operation) => ({
    ...operation,
    status: OPERATION_STATUS.PENDING,
    lastError: null,
    lastHttpStatus: null,
  }));
}

export async function countQueuedOperations(ownerKey) {
  const operations = await listQueuedOperations(ownerKey);
  const conflicts = operations.filter((operation) => operation.status === OPERATION_STATUS.CONFLICT).length;
  return { pending: operations.length - conflicts, conflicts };
}

export async function countPendingOperations(ownerKey) {
  return (await listPendingOperations(ownerKey)).length;
}

export async function removePendingOperation(id, ownerKey) {
  const owner = requireOwnerKey(ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(QUEUE_STORE, 'readwrite');
  const completed = transactionCompletion(transaction);
  const store = transaction.objectStore(QUEUE_STORE);
  const existing = await requestValue(store.get(id));
  if (existing?.ownerKey === owner) {
    store.delete(id);
  }
  await completed;
  dispatchQueueChanged(owner);
}

/** Falla temporal (sin red, servidor caído): la operación sigue pendiente. */
export async function markOperationFailed(id, ownerKey, error) {
  await updateOperation(id, ownerKey, (operation) => ({
    ...operation,
    attempts: operation.attempts + 1,
    lastError: String(error),
    lastAttemptAt: new Date().toISOString(),
  }));
}

export async function clearCachedCollections(ownerKey) {
  const owner = requireOwnerKey(ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(CACHE_STORE, 'readwrite');
  const completed = transactionCompletion(transaction);
  const store = transaction.objectStore(CACHE_STORE);
  const request = store.openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) {
      return;
    }
    if (cursor.value.ownerKey === owner) {
      cursor.delete();
    }
    cursor.continue();
  };
  await completed;
}

export function dispatchQueueChanged(ownerKey) {
  if (typeof globalThis.dispatchEvent !== 'function') {
    return;
  }
  globalThis.dispatchEvent(
    new CustomEvent('agrosentinel:offline-queue-changed', {
      detail: { ownerKey },
    }),
  );
}

export const OFFLINE_QUEUE_CHANGED_EVENT = 'agrosentinel:offline-queue-changed';
