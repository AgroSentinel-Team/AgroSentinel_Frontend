import { createApi } from './apiClient';
import {
  cacheCollection,
  countPendingOperations,
  dispatchQueueChanged,
  listPendingOperations,
  markOperationFailed,
  readCachedCollection,
  removePendingOperation,
} from './offlineDatabase';
import { isNetworkAvailable } from './offlineNetwork';
import {
  getAuthToken,
  getSessionOwnerKey,
  hasUnexpiredToken,
  isOfflineAuthenticated,
} from './sessionService';

const syncApi = createApi(undefined, false);
let activeSync;

export async function syncPendingOfflineOperations() {
  if (activeSync) {
    return activeSync;
  }
  activeSync = performSync().finally(() => {
    activeSync = undefined;
  });
  return activeSync;
}

async function performSync() {
  const ownerKey = getSessionOwnerKey();
  if (!ownerKey) {
    return { successful: 0, failed: 0, waitingForLogin: true };
  }
  if (!(await isNetworkAvailable())) {
    return { successful: 0, failed: 0, waitingForLogin: false };
  }
  const token = getAuthToken();
  if (!token || !hasUnexpiredToken(token) || isOfflineAuthenticated()) {
    return { successful: 0, failed: 0, waitingForLogin: true };
  }

  const pending = await listPendingOperations(ownerKey);
  let successful = 0;
  for (const operation of pending) {
    try {
      const body = operation.files?.length
        ? toFormData(operation)
        : operation.payload;
      const response = await syncApi.request({
        method: operation.method,
        url: operation.endpoint,
        data: body,
      });
      await removePendingOperation(operation.id, ownerKey);
      await reconcileCachedView(operation, ownerKey, response.data);
      successful++;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'No se pudo sincronizar la operacion.';
      await markOperationFailed(operation.id, ownerKey, message);
      return {
        successful,
        failed: pending.length - successful,
        waitingForLogin: error.response?.status === 401,
        error: message,
      };
    }
  }
  dispatchQueueChanged(ownerKey);
  return { successful, failed: 0, waitingForLogin: false };
}

async function reconcileCachedView(operation, ownerKey, response) {
  const cacheByOperation = {
    'failure_report.create': 'failure-reports',
    'failure_report.start_review': 'assigned-failure-reports',
    'failure_report.intervention': 'assigned-failure-reports',
    'preventive_maintenance.schedule': 'preventive-maintenances',
    'preventive_maintenance.execution': 'preventive-maintenances',
  };
  const collection = cacheByOperation[operation.operationType];
  if (!collection) return;
  const cached = await readCachedCollection(ownerKey, collection);
  if (!Array.isArray(cached)) return;

  let updated;
  if (operation.operationType === 'failure_report.create') {
    updated = cached.filter((record) => record.id !== `local-${operation.id}`);
    if (response && typeof response === 'object') {
      updated = [response, ...updated];
    }
  } else {
    const recordId =
      operation.metadata?.failureId ?? operation.metadata?.maintenanceId;
    updated = cached.map((record) =>
      String(record.id) === String(recordId)
        ? {
            ...record,
            localSyncPending: false,
            reviewStartPending: false,
            syncStatus: 'SYNCED',
          }
        : record,
    );
  }
  await cacheCollection(ownerKey, collection, updated);
}

function toFormData(operation) {
  const formData = new FormData();
  formData.append(
    'data',
    new Blob([JSON.stringify(operation.payload)], { type: 'application/json' }),
  );
  for (const file of operation.files) {
    formData.append(file.fieldName, file.blob, file.name);
  }
  return formData;
}

export async function getPendingOfflineCount() {
  const ownerKey = getSessionOwnerKey();
  return ownerKey ? countPendingOperations(ownerKey) : 0;
}
