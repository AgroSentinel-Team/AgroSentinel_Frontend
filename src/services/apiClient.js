import axios, { AxiosHeaders } from 'axios';
import {
  canRefreshSession,
  ensureFreshToken,
  expireSession,
  getSessionOwnerKey,
  isOfflineAuthenticated,
  refreshSession,
} from './sessionService';
import {
  cacheCollection,
  readCachedCollection,
} from './offlineDatabase';
import { isNetworkAvailable } from './offlineNetwork';

import { API_ORIGIN, API_ROOT } from './apiConfig';

export { API_ORIGIN, API_ROOT };
export const OFFLINE_CACHE_STATUS_EVENT = 'agrosentinel:offline-cache-status';
export const ACCESS_DENIED_EVENT = 'agrosentinel:access-denied';

let accessDeniedRedirectSuppressed = 0;

/**
 * Ejecuta tareas en segundo plano (como la descarga offline) sin que un 403
 * en una consulta opcional saque al usuario a la pantalla de acceso denegado.
 */
export async function withoutAccessDeniedRedirect(task) {
  accessDeniedRedirectSuppressed++;
  try {
    return await task();
  } finally {
    accessDeniedRedirectSuppressed--;
  }
}

function notifyCacheStatus(usingCache) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') {
    return;
  }
  globalThis.dispatchEvent(new CustomEvent(OFFLINE_CACHE_STATUS_EVENT, {
    detail: { usingCache },
  }));
}

function isCacheableData(data, responseType) {
  return (!responseType || responseType === 'json') &&
    data !== null &&
    typeof data === 'object' &&
    !(data instanceof Blob) &&
    !(data instanceof ArrayBuffer);
}

function createCachedResponse(data, config) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders({ 'x-agrosentinel-cache': 'offline' }),
    config,
    request: null,
  };
}

function isTransportFailure(error) {
  return !error.response && Boolean(
    error.request ||
    error.code === 'ERR_NETWORK' ||
    error.message?.toLowerCase().includes('network'),
  );
}

export function createApi(baseURL = API_ROOT, json = true) {
  const networkAdapter = axios.getAdapter(axios.defaults.adapter);
  const api = axios.create({
    baseURL,
    ...(json ? { headers: { 'Content-Type': 'application/json' } } : {}),
    adapter: async (config) => {
      const method = (config.method ?? 'get').toLowerCase();
      const ownerKey = getSessionOwnerKey();
      const cacheKey = method === 'get' && ownerKey
        ? `request:${api.getUri(config)}`
        : undefined;
      const connected = await isNetworkAvailable();

      if (method === 'get' && (!connected || isOfflineAuthenticated())) {
        const cached = cacheKey
          ? await readCachedCollection(ownerKey, cacheKey)
          : undefined;
        if (cached !== undefined) {
          notifyCacheStatus(true);
          return createCachedResponse(cached, config);
        }
        throw new Error(
          'No hay conexión ni datos guardados para esta consulta. Conéctate y vuelve a cargar la vista.',
        );
      }

      if (!connected) {
        throw new Error(
          'Sin conexión. Esta operación no está habilitada para guardarse offline.',
        );
      }

      try {
        const response = await networkAdapter(config);
        if (cacheKey && isCacheableData(response.data, config.responseType)) {
          try {
            await cacheCollection(ownerKey, cacheKey, response.data);
          } catch (error) {
            console.error('No se pudo guardar la respuesta de la API en la caché offline:', error);
          }
          notifyCacheStatus(false);
        }
        return response;
      } catch (error) {
        if (cacheKey && isTransportFailure(error)) {
          const cached = await readCachedCollection(ownerKey, cacheKey);
          if (cached !== undefined) {
            notifyCacheStatus(true);
            return createCachedResponse(cached, config);
          }
        }
        throw error;
      }
    },
  });

  api.interceptors.request.use(async (config) => {
    // Renueva el token si está por vencer y hay red; sin red sigue en modo local.
    const token = await ensureFreshToken();
    if (!token && isOfflineAuthenticated() && config.method?.toLowerCase() !== 'get') {
      return Promise.reject(new Error(
        canRefreshSession()
          ? 'Sin conexión con el servidor. Esta operación se enviará cuando vuelva la conexión.'
          : 'La sesión local permite consultar datos guardados, pero esta operación requiere conexión e inicio de sesión.',
      ));
    }
    if (token) {
      config.headers = AxiosHeaders.from(config.headers);
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (
        error.response?.status === 403 &&
        accessDeniedRedirectSuppressed === 0 &&
        typeof globalThis.dispatchEvent === 'function'
      ) {
        globalThis.dispatchEvent(new Event(ACCESS_DENIED_EVENT));
      }
      if (error.response?.status === 401) {
        const config = error.config;
        // Un 401 suele ser un token vencido: se renueva una vez y se repite la petición.
        if (config && !config.agroSessionRetried && canRefreshSession()) {
          config.agroSessionRetried = true;
          if (await refreshSession()) {
            return api.request(config);
          }
        }
        const serverMessage = error.response.data?.message || '';
        const serverRejectedToken = /token (es )?(inválido|vencido|venció)|cuenta asociada al token/i.test(serverMessage);
        if (serverRejectedToken && !canRefreshSession()) {
          expireSession();
        } else {
          error.message = serverMessage
            ? `El servidor rechazó la solicitud (401): ${serverMessage}`
            : 'El servidor rechazó la solicitud (401). Tu sesión vigente se conservó; verifica la autorización del endpoint.';
        }
      }
      return Promise.reject(error);
    },
  );

  return api;
}

export const apiClient = createApi();
