import { API_ROOT, createApi } from './apiClient';
import { getSessionOwnerKey, isOfflineAuthenticated } from './sessionService';
import {
  cacheCollection,
  enqueueOfflineOperation,
  readCachedCollection,
} from './offlineDatabase';
import { isNetworkAvailable } from './offlineNetwork';

const offlineApi = createApi(API_ROOT, false);

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
}) {
  const ownerKey = getSessionOwnerKey();
  const operationId = await enqueueOfflineOperation({
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

async function enqueueAndUpdateLocalView(operation) {
  const result = await enqueue(operation);
  const ownerKey = getSessionOwnerKey();
  const metadata = operation.metadata ?? {};
  const cachedCollections = {
    'failure_report.create': 'failure-reports',
    'failure_report.start_review': 'assigned-failure-reports',
    'failure_report.intervention': 'assigned-failure-reports',
    'preventive_maintenance.schedule': 'preventive-maintenances',
    'preventive_maintenance.execution': 'preventive-maintenances',
  };
  const collection = cachedCollections[operation.operationType];
  if (!collection) {
    return result;
  }
  const cached = await readCachedCollection(ownerKey, collection);
  if (!Array.isArray(cached)) {
    return result;
  }

  let updated;
  if (operation.operationType === 'failure_report.create') {
    updated = [
      {
        ...operation.payload,
        id: `local-${result.operationId}`,
        status: 'PENDING_SYNC',
        localSyncPending: true,
        createdAt: new Date().toISOString(),
      },
      ...cached,
    ];
  } else if (operation.operationType.startsWith('failure_report.')) {
    updated = cached.map((record) =>
      String(record.id) === String(metadata.failureId)
        ? operation.operationType === 'failure_report.start_review'
          ? { ...record, reviewStartPending: true }
          : { ...record, localSyncPending: true }
        : record,
    );
  } else if (operation.operationType === 'preventive_maintenance.schedule') {
    updated = [
      {
        ...operation.payload,
        id: `local-${result.operationId}`,
        status: 'PENDING_SYNC',
        localSyncPending: true,
      },
      ...cached,
    ];
  } else {
    updated = cached.map((record) =>
      String(record.id) === String(metadata.maintenanceId)
        ? { ...record, localSyncPending: true, syncStatus: 'PENDING_SYNC' }
        : record,
    );
  }
  await cacheCollection(ownerKey, collection, updated);
  return result;
}

export async function cachedRequest(collection, request) {
  const ownerKey = getSessionOwnerKey();
  const online = await isNetworkAvailable();
  if (online && !isOfflineAuthenticated()) {
    try {
      const value = await request();
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
    throw new Error('Inicia sesion online para preparar el acceso offline.');
  }
  const cached = await readCachedCollection(ownerKey, collection);
  if (cached === undefined) {
    throw new Error(`No hay datos locales guardados para ${collection}. Conectate y actualiza la vista.`);
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
  if (!(await isNetworkAvailable()) || isOfflineAuthenticated()) {
    return enqueueAndUpdateLocalView({
      endpoint,
      method,
      payload,
      operationType,
      metadata: queueMetadata,
    });
  }
  try {
    const response = await offlineApi.request({
      method,
      url: endpoint,
      data: payload,
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
      operationType,
      metadata: queueMetadata,
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
  const files = [];
  for (const [fieldName, value] of formData.entries()) {
    if (fieldName === 'data') {
      const serialized = value instanceof Blob ? await value.text() : value;
      payload = JSON.parse(serialized);
    } else if (value instanceof Blob) {
      files.push({
        fieldName,
        name: value.name || `evidencia-${files.length + 1}`,
        type: value.type || 'application/octet-stream',
        blob: value,
      });
    } else {
      throw new Error(`El campo multipart "${fieldName}" no se puede guardar offline.`);
    }
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('El formulario multipart no contiene un campo JSON "data" valido.');
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

  if (!(await isNetworkAvailable()) || isOfflineAuthenticated()) {
    return enqueueAndUpdateLocalView({
      endpoint,
      method,
      payload,
      files,
      operationType,
      metadata: queueMetadata,
    });
  }
  try {
    const response = await offlineApi.request({
      method,
      url: endpoint,
      data: formData,
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
    });
  }
}
