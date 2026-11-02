const DATABASE_NAME = 'agrosentinel-offline';
const DATABASE_VERSION = 1;
const CACHE_STORE = 'cached_collections';
const QUEUE_STORE = 'offline_operations';

let databasePromise;

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

export async function enqueueOfflineOperation(operation) {
  const ownerKey = requireOwnerKey(operation.ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(QUEUE_STORE, 'readwrite');
  const completed = transactionCompletion(transaction);
  const id = await requestValue(
    transaction.objectStore(QUEUE_STORE).add({
      ...operation,
      ownerKey,
      status: 'pending',
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

export async function markOperationFailed(id, ownerKey, error) {
  const owner = requireOwnerKey(ownerKey);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(QUEUE_STORE, 'readwrite');
  const completed = transactionCompletion(transaction);
  const store = transaction.objectStore(QUEUE_STORE);
  const operation = await requestValue(store.get(id));
  if (operation?.ownerKey === owner) {
    store.put({
      ...operation,
      attempts: operation.attempts + 1,
      lastError: String(error),
      lastAttemptAt: new Date().toISOString(),
    });
  }
  await completed;
  dispatchQueueChanged(owner);
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
