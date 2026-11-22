import { withoutAccessDeniedRedirect } from './apiClient';
import {
  getAssets,
  getAssignedAssets,
  getCategories,
  getPredictiveAssets,
  getPredictiveHistory,
} from './assetService';
import {
  getAllWorkGroups,
  getInventoryGroups,
  getInventoryItems,
} from './inventoryService';
import { cacheCollection, readCachedCollection } from './offlineDatabase';
import { isNetworkAvailable } from './offlineNetwork';
import { syncPendingOfflineOperations } from './offlineSync';
import { getPreventiveMaintenances } from './preventiveMaintenanceService';
import { ensureFreshToken, getSessionOwnerKey } from './sessionService';
import {
  getAssignedFailureReports,
  getCurrentUser,
  getFailureAssetResume,
  getTechnicianMaintenanceHistory,
} from './technicianService';

/*
 * Paquete de trabajo offline del técnico
 * --------------------------------------
 * Descarga de una vez todo lo que el técnico necesita para trabajar sin internet:
 * sus órdenes (fallas y preventivos), la ficha de cada activo, el inventario de las
 * bodegas que puede usar, su historial y los datos de apoyo de cada pantalla.
 *
 * Usa las mismas funciones que las vistas, así que lo descargado queda exactamente
 * en las claves de caché que esas vistas leen sin conexión.
 */

export const WORK_PACKAGE_CHANGED_EVENT = 'agrosentinel:work-package-changed';
const MANIFEST_COLLECTION = 'work-package-manifest';
const STALE_AFTER_MS = 15 * 60 * 1000;
const MAX_PARALLEL_REQUESTS = 4;
const MAX_PREDICTIVE_HISTORIES = 25;
const MAX_INVENTORY_ZONES = 30;
const CLOSED_FAILURE_STATES = new Set(['RESUELTO']);
const OPEN_PREVENTIVE_STATES = new Set(['SCHEDULED', 'PARTIALLY_COMPLETED', 'URGENT_CORRECTIVE']);

let activeDownload = null;
let downloading = false;

function notifyChanged(detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(WORK_PACKAGE_CHANGED_EVENT, { detail }));
}

export function isWorkPackageDownloading() {
  return downloading;
}

export async function getWorkPackageStatus() {
  const ownerKey = getSessionOwnerKey();
  if (!ownerKey) return null;
  try {
    return (await readCachedCollection(ownerKey, MANIFEST_COLLECTION)) ?? null;
  } catch {
    return null;
  }
}

export function isWorkPackageStale(manifest, now = Date.now()) {
  if (!manifest?.downloadedAt) return true;
  const downloadedAt = Date.parse(manifest.downloadedAt);
  return Number.isNaN(downloadedAt) || now - downloadedAt > STALE_AFTER_MS;
}

/** Ejecuta tareas con un límite de peticiones simultáneas (la señal en campo es mala). */
async function runLimited(tasks, limit = MAX_PARALLEL_REQUESTS) {
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const index = next++;
      const { label, run } = tasks[index];
      try {
        results[index] = { label, ok: true, value: await run() };
      } catch (error) {
        results[index] = {
          label,
          ok: false,
          message:
            error?.response?.data?.message ||
            error?.response?.data?.detail ||
            error?.message ||
            'Error desconocido',
        };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueIds(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== '').map(String))];
}

async function performDownload() {
  const ownerKey = getSessionOwnerKey();
  if (!ownerKey) {
    throw new Error('Inicia sesión para descargar tus órdenes.');
  }
  if (!(await isNetworkAvailable())) {
    throw new Error('Sin conexión. Conéctate a internet para descargar tus órdenes.');
  }
  if (!(await ensureFreshToken())) {
    throw new Error('Tu sesión venció. Inicia sesión con internet para descargar tus órdenes.');
  }

  // Primero se envía lo pendiente para que lo descargado ya incluya esos cambios.
  try {
    await syncPendingOfflineOperations();
  } catch (error) {
    console.error('No se pudo sincronizar antes de descargar el paquete de trabajo:', error);
  }

  return withoutAccessDeniedRedirect(async () => {
    // 1. Órdenes y datos base.
    const base = await runLimited([
      { label: 'Órdenes de falla', run: getAssignedFailureReports },
      { label: 'Mantenimientos preventivos', run: getPreventiveMaintenances },
      { label: 'Perfil', run: getCurrentUser },
      { label: 'Historial', run: getTechnicianMaintenanceHistory },
      { label: 'Mis grupos de trabajo', run: getInventoryGroups },
      { label: 'Zonas y bodegas', run: getAllWorkGroups },
      { label: 'Activos', run: getAssets },
      { label: 'Categorías', run: getCategories },
      { label: 'Inventario general', run: () => getInventoryItems(undefined, false) },
      { label: 'Bodega central', run: () => getInventoryItems(null, true) },
      { label: 'Activos predictivos', run: getPredictiveAssets },
      { label: 'Activos asignados', run: getAssignedAssets },
    ]);
    const valueOf = (label) => asArray(base.find((result) => result.label === label && result.ok)?.value);
    const failures = valueOf('Órdenes de falla').filter((item) => !CLOSED_FAILURE_STATES.has(item.estado));
    const preventives = valueOf('Mantenimientos preventivos').filter((item) =>
      OPEN_PREVENTIVE_STATES.has(item.status),
    );

    // 2. Detalle de cada orden e inventario de cada bodega que puede usar.
    const realFailures = failures.filter((item) => !String(item.id).startsWith('local-'));
    const zoneIds = uniqueIds([
      ...valueOf('Mis grupos de trabajo').map((group) => group.id),
      ...failures.map((item) => item.workGroupId),
      ...valueOf('Zonas y bodegas').map((group) => group.id),
    ]).slice(0, MAX_INVENTORY_ZONES);
    const predictiveAssetIds = uniqueIds(
      valueOf('Activos asignados').map((asset) => asset.id ?? asset.assetId),
    ).slice(0, MAX_PREDICTIVE_HISTORIES);

    const details = await runLimited([
      ...realFailures.map((failure) => ({
        label: `Ficha de la orden #${failure.id}`,
        failureId: failure.id,
        run: () => getFailureAssetResume(failure.id),
      })),
      ...zoneIds.map((zoneId) => ({
        label: `Inventario de la bodega ${zoneId}`,
        run: () => getInventoryItems(Number(zoneId), true),
      })),
      ...predictiveAssetIds.map((assetId) => ({
        label: `Historial predictivo del activo ${assetId}`,
        optional: true,
        run: () => getPredictiveHistory(assetId),
      })),
    ]);

    const readyFailureIds = realFailures
      .filter((failure) =>
        details.some((result) => result.ok && result.label === `Ficha de la orden #${failure.id}`),
      )
      .map((failure) => String(failure.id));

    const requiredLabels = new Set([
      'Órdenes de falla',
      'Mantenimientos preventivos',
      'Mis grupos de trabajo',
      'Zonas y bodegas',
      'Bodega central',
    ]);
    const errors = [...base, ...details]
      .filter((result) => !result.ok)
      .map((result) => ({
        label: result.label,
        message: result.message,
        required: requiredLabels.has(result.label) || result.label.startsWith('Ficha de la orden'),
      }));

    const manifest = {
      downloadedAt: new Date().toISOString(),
      failureIds: readyFailureIds,
      preventiveIds: preventives.map((item) => String(item.id)),
      counts: {
        failures: failures.length,
        preventives: preventives.length,
        inventoryZones: zoneIds.length,
      },
      errors,
      complete: !errors.some((error) => error.required),
    };
    await cacheCollection(ownerKey, MANIFEST_COLLECTION, manifest);
    return manifest;
  });
}

/** Descarga el paquete de trabajo. Si ya hay una descarga en curso, reutiliza esa. */
export function downloadWorkPackage() {
  if (!activeDownload) {
    downloading = true;
    notifyChanged({ downloading: true });
    activeDownload = performDownload()
      .then((manifest) => {
        notifyChanged({ downloading: false, manifest });
        return manifest;
      })
      .catch((error) => {
        notifyChanged({ downloading: false, error: error.message });
        throw error;
      })
      .finally(() => {
        downloading = false;
        activeDownload = null;
      });
  }
  return activeDownload;
}

/** Descarga automática: solo si hay red y lo guardado tiene más de 15 minutos. */
export async function downloadWorkPackageIfStale() {
  try {
    if (!(await isNetworkAvailable())) return null;
    const manifest = await getWorkPackageStatus();
    if (!isWorkPackageStale(manifest)) return manifest;
    return await downloadWorkPackage();
  } catch (error) {
    console.error('No se pudo descargar el paquete de trabajo:', error);
    return null;
  }
}
