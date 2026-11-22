import { createApi, withoutAccessDeniedRedirect } from './apiClient';
import {
  clearRecordConflict,
  IDEMPOTENCY_HEADER,
  markRecordConflict,
  revertPendingOperation,
  updateCachedViewForOperation,
  updatePredictiveFeedbackCache,
} from './offlineApi';
import {
  countPendingOperations,
  countQueuedOperations,
  dispatchQueueChanged,
  listQueuedOperations,
  markOperationConflict,
  markOperationFailed,
  OPERATION_STATUS,
  removePendingOperation,
  requeueOperation,
} from './offlineDatabase';
import { isNetworkAvailable } from './offlineNetwork';
import {
  canRefreshSession,
  ensureFreshToken,
  getSessionOwnerKey,
} from './sessionService';

/*
 * Sincronización de la cola offline
 * ---------------------------------
 * - Envía las operaciones en el orden en que se hicieron, cada una con su clave de
 *   idempotencia: si el servidor ya la había procesado, devuelve la misma respuesta.
 * - Error temporal (sin red, servidor caído, sesión por renovar): se detiene y se
 *   reintenta luego, sin perder nada.
 * - Error definitivo (el servidor la rechaza: datos inválidos, orden reasignada, sin
 *   stock…): la operación queda "en conflicto" para que el técnico la revise, y la
 *   cola sigue con las demás. Las operaciones posteriores sobre la misma orden esperan,
 *   porque dependen de la que falló.
 */

export const OFFLINE_SYNC_COMPLETED_EVENT = 'agrosentinel:offline-sync-completed';

const syncApi = createApi(undefined, false);
let activeSync;

const OPERATION_DESCRIPTIONS = {
  'failure_report.create': () => 'Reporte de falla',
  'failure_report.start_review': (operation) => `Inicio de la orden F-${operation.metadata?.failureId ?? '?'}`,
  'failure_report.intervention': (operation) =>
    `Intervención de la orden F-${operation.metadata?.failureId ?? '?'}`,
  'preventive_maintenance.schedule': () => 'Programación de mantenimiento preventivo',
  'preventive_maintenance.execution': (operation) =>
    `Ejecución del preventivo MP-${operation.metadata?.maintenanceId ?? '?'}`,
  'predictive.feedback': () => 'Confirmación de diagnóstico predictivo',
};

export function describeOperation(operation) {
  return OPERATION_DESCRIPTIONS[operation.operationType]?.(operation) ?? 'Operación guardada sin conexión';
}

/** Operaciones sobre la misma orden: si una falla, las siguientes deben esperar. */
function entityKeyOf(operation) {
  const metadata = operation.metadata ?? {};
  if (metadata.failureId != null) return `failure:${metadata.failureId}`;
  if (metadata.maintenanceId != null) return `maintenance:${metadata.maintenanceId}`;
  if (metadata.recordId != null) return `predictive:${metadata.recordId}`;
  return null;
}

function idempotencyKeyOf(operation) {
  if (operation.clientOperationId) return operation.clientOperationId;
  // Operaciones encoladas por versiones anteriores: clave estable derivada de la cola.
  return `legacy-${operation.id}-${Date.parse(operation.createdAt) || 0}`;
}

function errorMessageOf(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    (typeof error.response?.data === 'string' ? error.response.data : '') ||
    error.message ||
    'No se pudo sincronizar la operación.'
  );
}

/** true si vale la pena reintentar más tarde sin que el usuario haga nada. */
export function isTransientSyncError(error) {
  const status = error.response?.status;
  if (!status) return true;
  if (status === 401 || status === 408 || status === 425 || status === 429 || status >= 500) return true;
  return status === 409 && error.response?.data?.code === 'OPERATION_IN_PROGRESS';
}

export async function syncPendingOfflineOperations() {
  if (activeSync) {
    return activeSync;
  }
  activeSync = withoutAccessDeniedRedirect(performSync).finally(() => {
    activeSync = undefined;
  });
  return activeSync;
}

async function performSync() {
  const ownerKey = getSessionOwnerKey();
  const empty = { successful: 0, failed: 0, conflicts: 0, waiting: 0 };
  if (!ownerKey) {
    return { ...empty, waitingForLogin: true };
  }
  if (!(await isNetworkAvailable())) {
    return { ...empty, waitingForLogin: false };
  }
  // Renueva el token con el refresh token guardado; solo pide login si no se puede.
  const token = await ensureFreshToken();
  if (!token) {
    return { ...empty, waitingForLogin: !canRefreshSession() };
  }

  const queued = await listQueuedOperations(ownerKey);
  const blockedEntities = new Set(
    queued
      .filter((operation) => operation.status === OPERATION_STATUS.CONFLICT)
      .map(entityKeyOf)
      .filter(Boolean),
  );
  const pending = queued.filter((operation) => operation.status === OPERATION_STATUS.PENDING);

  let successful = 0;
  let conflicts = 0;
  let waiting = 0;
  for (const [index, operation] of pending.entries()) {
    const entityKey = entityKeyOf(operation);
    if (entityKey && blockedEntities.has(entityKey)) {
      waiting++;
      continue;
    }
    try {
      const body = operation.files?.length ? toFormData(operation) : operation.payload;
      const response = await syncApi.request({
        method: operation.method,
        url: operation.endpoint,
        data: body,
        headers: { [IDEMPOTENCY_HEADER]: idempotencyKeyOf(operation) },
      });
      await removePendingOperation(operation.id, ownerKey);
      if (operation.operationType === 'predictive.feedback') {
        await updatePredictiveFeedbackCache(
          ownerKey,
          operation.metadata,
          response.data ?? operation.payload,
          false,
        );
      }
      await reconcileCachedView(operation, ownerKey, response.data);
      successful++;
    } catch (error) {
      const message = errorMessageOf(error);
      if (isTransientSyncError(error)) {
        await markOperationFailed(operation.id, ownerKey, message);
        const result = {
          successful,
          conflicts,
          waiting,
          failed: pending.length - index,
          waitingForLogin: error.response?.status === 401 && !canRefreshSession(),
          error: message,
        };
        notifySyncCompleted(ownerKey, result);
        return result;
      }
      await markOperationConflict(operation.id, ownerKey, message, error.response?.status);
      await updateCachedViewForOperation(ownerKey, operation, (records) =>
        markRecordConflict(records, operation, message),
      );
      if (entityKey) blockedEntities.add(entityKey);
      conflicts++;
    }
  }
  const result = { successful, conflicts, waiting, failed: 0, waitingForLogin: false };
  notifySyncCompleted(ownerKey, result);
  return result;
}

function notifySyncCompleted(ownerKey, result) {
  dispatchQueueChanged(ownerKey);
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(OFFLINE_SYNC_COMPLETED_EVENT, { detail: result }));
}

async function reconcileCachedView(operation, ownerKey, response) {
  const createsRecord =
    operation.operationType === 'failure_report.create' ||
    operation.operationType === 'preventive_maintenance.schedule';
  await updateCachedViewForOperation(ownerKey, operation, (cached) => {
    if (createsRecord) {
      const withoutLocal = cached.filter((record) => record.id !== `local-${operation.id}`);
      return response && typeof response === 'object' && response.id != null
        ? [response, ...withoutLocal]
        : withoutLocal;
    }
    const recordId = operation.metadata?.failureId ?? operation.metadata?.maintenanceId;
    return cached.map((record) =>
      String(record.id) === String(recordId)
        ? {
            ...record,
            localSyncPending: false,
            reviewStartPending: false,
            syncConflict: undefined,
            syncStatus: 'SYNCED',
          }
        : record,
    );
  });
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

/* ---------- Revisión manual de la cola ---------- */

export async function getQueuedOperations() {
  const ownerKey = getSessionOwnerKey();
  return ownerKey ? listQueuedOperations(ownerKey) : [];
}

export async function getQueueSummary() {
  const ownerKey = getSessionOwnerKey();
  return ownerKey ? countQueuedOperations(ownerKey) : { pending: 0, conflicts: 0 };
}

/** Vuelve a intentar una operación en conflicto (por ejemplo, después de que el supervisor corrigió la orden). */
export async function retryQueuedOperation(operationId) {
  const ownerKey = getSessionOwnerKey();
  if (!ownerKey) return null;
  const operation = await requeueOperation(operationId, ownerKey);
  if (operation) {
    await updateCachedViewForOperation(ownerKey, operation, (records) =>
      clearRecordConflict(records, operation),
    );
  }
  return syncPendingOfflineOperations();
}

/** Elimina una operación del dispositivo. No se puede deshacer. */
export async function discardQueuedOperation(operation) {
  const ownerKey = getSessionOwnerKey();
  if (!ownerKey) return;
  await removePendingOperation(operation.id, ownerKey);
  if (operation.operationType === 'predictive.feedback') {
    await updatePredictiveFeedbackCache(ownerKey, operation.metadata, {}, false);
  } else {
    await updateCachedViewForOperation(ownerKey, operation, (records) =>
      revertPendingOperation(records, operation),
    );
  }
  dispatchQueueChanged(ownerKey);
}

export async function getPendingOfflineCount() {
  const ownerKey = getSessionOwnerKey();
  return ownerKey ? countPendingOperations(ownerKey) : 0;
}
