import { API_ROOT, createApi } from './apiClient';
import { ensureFreshToken, getSessionOwnerKey, isOfflineAuthenticated } from './sessionService';
import {
  cacheCollection,
  createClientOperationId,
  enqueueOfflineOperation,
  listPendingOperations,
  listQueuedOperations,
  OPERATION_STATUS,
  readCachedCollection,
} from './offlineDatabase';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
import { isNetworkAvailable } from './offlineNetwork';
import { compressImage } from './imageCompression';

const offlineApi = createApi(API_ROOT, false);

export const OFFLINE_NO_DATA = 'OFFLINE_NO_DATA';

/**
 * true si el error se debe a no tener conexión (o a no tener esos datos descargados),
 * no a que el servidor haya rechazado algo. Sirve para mostrar avisos suaves en lugar de errores.
 */
export function isOfflineError(error) {
  return Boolean(error) && (error.code === OFFLINE_NO_DATA || !error.response);
}

function offlineNoDataError(message) {
  const error = new Error(message);
  error.code = OFFLINE_NO_DATA;
  return error;
}

/** Hay red y una sesión con token vigente (renovándolo si hace falta). */
async function canReachServer() {
  if (!(await isNetworkAvailable())) return false;
  await ensureFreshToken();
  return !isOfflineAuthenticated();
}

function isTransportFailure(error) {
  return !error.response && Boolean(
    error.request ||
    error.code === 'ERR_NETWORK' ||
    error.message?.toLowerCase().includes('network'),
  );
}

async function enqueue({
  endpoint,
  method,
  payload,
  files = [],
  operationType,
  metadata = {},
  clientOperationId,
}) {
  const ownerKey = getSessionOwnerKey();
  const operationId = await enqueueOfflineOperation({
    clientOperationId,
    ownerKey,
    endpoint,
    method: method.toUpperCase(),
    payload,
    files,
    operationType,
    metadata,
  });
  return { queued: true, operationId };
}

const COLLECTION_BY_OPERATION = {
  'failure_report.create': 'failure-reports',
  'failure_report.start_review': 'assigned-failure-reports',
  'failure_report.intervention': 'assigned-failure-reports',
  'preventive_maintenance.schedule': 'preventive-maintenances',
  'preventive_maintenance.execution': 'preventive-maintenances',
};

const STARTABLE_FAILURE_STATES = new Set(['ASIGNADA', 'PENDIENTE', 'EN_REVISION']);

/**
 * Aplica una operación pendiente sobre una lista local para que la vista muestre
 * el cambio aunque todavía no se haya enviado. Es idempotente.
 */
export function applyPendingOperation(records, operation) {
  if (!Array.isArray(records)) return records;
  const metadata = operation.metadata ?? {};
  const localId = `local-${operation.id}`;
  switch (operation.operationType) {
    case 'failure_report.create':
      if (records.some((record) => record.id === localId)) return records;
      return [
        {
          ...operation.payload,
          id: localId,
          status: 'PENDING_SYNC',
          localSyncPending: true,
          createdAt: operation.createdAt ?? new Date().toISOString(),
        },
        ...records,
      ];
    case 'failure_report.start_review':
      return records.map((record) =>
        String(record.id) === String(metadata.failureId)
          ? {
              ...record,
              reviewStartPending: true,
              estado: STARTABLE_FAILURE_STATES.has(record.estado) ? 'EN_EJECUCION' : record.estado,
              fechaInicioRevision:
                record.fechaInicioRevision ?? metadata.startedAt ?? operation.createdAt ?? null,
            }
          : record,
      );
    case 'failure_report.intervention':
      return records.map((record) =>
        String(record.id) === String(metadata.failureId)
          ? { ...record, localSyncPending: true }
          : record,
      );
    case 'preventive_maintenance.schedule':
      if (records.some((record) => record.id === localId)) return records;
      return [
        {
          ...operation.payload,
          id: localId,
          status: 'PENDING_SYNC',
          localSyncPending: true,
        },
        ...records,
      ];
    case 'preventive_maintenance.execution':
      return records.map((record) =>
        String(record.id) === String(metadata.maintenanceId)
          ? { ...record, localSyncPending: true, syncStatus: 'PENDING_SYNC' }
          : record,
      );
    default:
      return records;
  }
}

function omitKeys(record, keys) {
  const copy = { ...record };
  keys.forEach((key) => delete copy[key]);
  return copy;
}

function recordIdOf(operation) {
  if (operation.operationType === 'failure_report.create'
    || operation.operationType === 'preventive_maintenance.schedule') {
    return `local-${operation.id}`;
  }
  return operation.metadata?.failureId ?? operation.metadata?.maintenanceId;
}

/** Marca en la lista el registro afectado por una operación que el servidor rechazó. */
export function markRecordConflict(records, operation, message) {
  if (!Array.isArray(records)) return records;
  const recordId = recordIdOf(operation);
  if (recordId == null) return records;
  return records.map((record) =>
    String(record.id) === String(recordId)
      ? { ...record, syncConflict: message || 'No se pudo sincronizar' }
      : record,
  );
}

/** Quita la marca de error del registro de una operación que se va a reintentar. */
export function clearRecordConflict(records, operation) {
  if (!Array.isArray(records)) return records;
  const recordId = recordIdOf(operation);
  if (recordId == null) return records;
  return records.map((record) => {
    if (String(record.id) !== String(recordId) || !('syncConflict' in record)) return record;
    return omitKeys(record, ['syncConflict']);
  });
}

/** Quita de la lista los cambios locales de una operación descartada. */
export function revertPendingOperation(records, operation) {
  if (!Array.isArray(records)) return records;
  const recordId = recordIdOf(operation);
  if (recordId == null) return records;
  if (String(recordId).startsWith('local-')) {
    return records.filter((record) => String(record.id) !== String(recordId));
  }
  return records.map((record) => {
    if (String(record.id) !== String(recordId)) return record;
    return omitKeys(record, ['localSyncPending', 'reviewStartPending', 'syncConflict', 'syncStatus']);
  });
}

/** Aplica un cambio a la lista guardada de la colección que afecta la operación. */
export async function updateCachedViewForOperation(ownerKey, operation, transform) {
  const collection = COLLECTION_BY_OPERATION[operation.operationType];
  if (!ownerKey || !collection) return;
  try {
    const cached = await readCachedCollection(ownerKey, collection);
    if (Array.isArray(cached)) {
      await cacheCollection(ownerKey, collection, transform(cached));
    }
  } catch (error) {
    console.error(`No se pudo actualizar la vista local ${collection}:`, error);
  }
}

/** Vuelve a aplicar lo pendiente sobre datos recién traídos del servidor. */
export async function overlayPendingOperations(ownerKey, collection, records) {
  if (!ownerKey || !Array.isArray(records)) return records;
  try {
    const queued = (await listQueuedOperations(ownerKey)).filter(
      (operation) => COLLECTION_BY_OPERATION[operation.operationType] === collection,
    );
    return queued.reduce((current, operation) => {
      const applied = applyPendingOperation(current, operation);
      return operation.status === OPERATION_STATUS.CONFLICT
        ? markRecordConflict(applied, operation, operation.lastError)
        : applied;
    }, records);
  } catch (error) {
    console.error('No se pudieron aplicar las operaciones pendientes a la vista:', error);
    return records;
  }
}

/**
 * Descuenta del inventario local los repuestos usados en intervenciones que aún
 * no se han enviado. Se calcula al leer (no se guarda), así no se descuenta dos veces:
 * cuando la intervención se sincroniza, sale de la cola y el servidor ya trae el stock real.
 */
export async function applyPendingStockUsage(ownerKey, items) {
  if (!ownerKey || !Array.isArray(items) || items.length === 0) return items;
  let pending;
  try {
    pending = await listPendingOperations(ownerKey);
  } catch (error) {
    console.error('No se pudo leer la cola para ajustar el stock local:', error);
    return items;
  }
  const reservedByItem = new Map();
  for (const operation of pending) {
    if (operation.operationType !== 'failure_report.intervention') continue;
    for (const part of operation.payload?.replacedParts ?? []) {
      if (part?.itemId == null) continue;
      const key = String(part.itemId);
      reservedByItem.set(key, (reservedByItem.get(key) ?? 0) + Number(part.quantity || 0));
    }
  }
  if (reservedByItem.size === 0) return items;
  return items.map((item) => {
    const reserved = reservedByItem.get(String(item.id));
    if (!reserved) return item;
    return {
      ...item,
      stock: Math.max(0, Number(item.stock || 0) - reserved),
      pendingReservedQuantity: reserved,
    };
  });
}

async function enqueueAndUpdateLocalView(operation) {
  const result = await enqueue(operation);
  const ownerKey = getSessionOwnerKey();
  const metadata = operation.metadata ?? {};
  if (operation.operationType === 'predictive.feedback') {
    await updatePredictiveFeedbackCache(
      ownerKey,
      metadata,
      operation.payload,
      true,
    );
    return result;
  }

  const collection = COLLECTION_BY_OPERATION[operation.operationType];
  if (!collection) {
    return result;
  }
  const cached = await readCachedCollection(ownerKey, collection);
  if (!Array.isArray(cached)) {
    return result;
  }
  const updated = applyPendingOperation(cached, {
    ...operation,
    id: result.operationId,
    createdAt: new Date().toISOString(),
  });
  await cacheCollection(ownerKey, collection, updated);
  return result;
}

export async function updatePredictiveFeedbackCache(
  ownerKey,
  metadata,
  feedback,
  pending,
) {
  if (!ownerKey || metadata?.assetId == null || metadata?.recordId == null) return;
  const recordId = String(metadata.recordId);
  const collections = [
    'predictive-assets',
    `predictive-history:${metadata.assetId}`,
  ];

  for (const collection of collections) {
    try {
      const cached = await readCachedCollection(ownerKey, collection);
      if (!Array.isArray(cached)) continue;
      const updated = collection === 'predictive-assets'
        ? cached.map((asset) =>
            String(asset.latestRecord?.id) === recordId
              ? {
                  ...asset,
                  latestRecord: {
                    ...asset.latestRecord,
                    ...feedback,
                    id: asset.latestRecord.id,
                    localSyncPending: pending,
                  },
                }
              : asset,
          )
        : cached.map((record) =>
            String(record.id) === recordId
              ? { ...record, ...feedback, id: record.id, localSyncPending: pending }
              : record,
          );
      await cacheCollection(ownerKey, collection, updated);
    } catch (error) {
      console.error(`No se pudo actualizar la caché ${collection} del feedback predictivo:`, error);
    }
  }
}

export async function cachedRequest(collection, request) {
  const ownerKey = getSessionOwnerKey();
  if (await canReachServer()) {
    try {
      const value = await overlayPendingOperations(ownerKey, collection, await request());
      if (ownerKey) {
        await cacheCollection(ownerKey, collection, value);
      }
      return value;
    } catch (error) {
      if (!isTransportFailure(error) || !ownerKey) {
        throw error;
      }
    }
  }

  if (!ownerKey) {
    throw offlineNoDataError('Inicia sesión con internet para preparar el acceso sin conexión.');
  }
  const cached = await readCachedCollection(ownerKey, collection);
  if (cached === undefined) {
    throw offlineNoDataError(
      'Esta información todavía no está guardada en el dispositivo. Conéctate a internet una vez para descargarla.',
    );
  }
  return cached;
}

export async function sendOrQueueJson({
  endpoint,
  method,
  payload,
  operationType,
  metadata,
}) {
  const queueMetadata = metadata ?? (
    operationType === 'failure_report.create'
      ? {
          assetId: payload?.assetId,
          groupId: payload?.groupId,
          assignedTechnicianId: payload?.assignedTechnicianId,
        }
      : undefined
  );
  // La misma clave acompaña el intento en línea y, si falla la red, la operación encolada:
  // si el servidor alcanzó a procesarla, el reintento no la duplica.
  const clientOperationId = createClientOperationId();
  if (!(await canReachServer())) {
    return enqueueAndUpdateLocalView({
      endpoint,
      method,
      payload,
      operationType,
      metadata: queueMetadata,
      clientOperationId,
    });
  }
  try {
    const response = await offlineApi.request({
      method,
      url: endpoint,
      data: payload,
      headers: { [IDEMPOTENCY_HEADER]: clientOperationId },
    });
    if (operationType === 'predictive.feedback') {
      await updatePredictiveFeedbackCache(
        getSessionOwnerKey(),
        queueMetadata,
        response.data,
        false,
      );
    }
    return response.data;
  } catch (error) {
    if (!isTransportFailure(error)) {
      throw error;
    }
    return enqueueAndUpdateLocalView({
      endpoint,
      method,
      payload,
      operationType,
      metadata: queueMetadata,
      clientOperationId,
    });
  }
}

export async function sendOrQueueForm({
  endpoint,
  method,
  formData,
  operationType,
  metadata,
}) {
  let payload;
  let dataPart;
  const files = [];
  for (const [fieldName, value] of formData.entries()) {
    if (fieldName === 'data') {
      dataPart = value;
      const serialized = value instanceof Blob ? await value.text() : value;
      payload = JSON.parse(serialized);
    } else if (value instanceof Blob) {
      // Las fotos se comprimen una sola vez: sirve tanto para enviarlas como para guardarlas offline.
      const compressed = await compressImage(value, value.name || `evidencia-${files.length + 1}`);
      files.push({
        fieldName,
        name: compressed.name,
        type: compressed.blob.type || 'application/octet-stream',
        blob: compressed.blob,
      });
    } else {
      throw new Error(`El campo multipart "${fieldName}" no se puede guardar offline.`);
    }
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('El formulario no contiene un campo "data" válido.');
  }
  const queueMetadata = metadata ?? (
    operationType === 'failure_report.create'
      ? {
          assetId: payload.assetId,
          groupId: payload.groupId,
          assignedTechnicianId: payload.assignedTechnicianId,
        }
      : undefined
  );

  const clientOperationId = createClientOperationId();
  if (!(await canReachServer())) {
    return enqueueAndUpdateLocalView({
      endpoint,
      method,
      payload,
      files,
      operationType,
      metadata: queueMetadata,
      clientOperationId,
    });
  }
  try {
    const outgoing = new FormData();
    outgoing.append('data', dataPart);
    files.forEach((file) => outgoing.append(file.fieldName, file.blob, file.name));
    const response = await offlineApi.request({
      method,
      url: endpoint,
      data: outgoing,
      headers: { [IDEMPOTENCY_HEADER]: clientOperationId },
    });
    return response.data;
  } catch (error) {
    if (!isTransportFailure(error)) {
      throw error;
    }
    return enqueueAndUpdateLocalView({
      endpoint,
      method,
      payload,
      files,
      operationType,
      metadata: queueMetadata,
      clientOperationId,
    });
  }
}
