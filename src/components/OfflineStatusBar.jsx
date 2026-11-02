import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudOff, LoaderCircle, RefreshCw, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OFFLINE_QUEUE_CHANGED_EVENT } from '../services/offlineDatabase';
import { OFFLINE_CACHE_STATUS_EVENT } from '../services/apiClient';
import { isNetworkAvailable, subscribeToNetworkChanges } from '../services/offlineNetwork';
import {
  getPendingOfflineCount,
  syncPendingOfflineOperations,
} from '../services/offlineSync';
import {
  clearSession,
  isOfflineAuthenticated,
  SESSION_CHANGED_EVENT,
} from '../services/sessionService';

export default function OfflineStatusBar() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [waitingForLogin, setWaitingForLogin] = useState(false);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [connected, count] = await Promise.all([
        isNetworkAvailable(),
        getPendingOfflineCount(),
      ]);
      setOnline(connected);
      setPendingCount(count);
      setWaitingForLogin(isOfflineAuthenticated());
    } catch (error) {
      console.error('No se pudo consultar el estado offline:', error);
    }
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncPendingOfflineOperations();
      setWaitingForLogin(result.waitingForLogin);
    } catch (error) {
      console.error('No se pudo sincronizar la cola offline:', error);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  const reauthenticate = async () => {
    try {
      await clearSession();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('No se pudo cerrar la sesion local:', error);
    }
  };

  useEffect(() => {
    let active = true;
    let unsubscribe;
    const handleQueueChanged = () => {
      if (active) void refresh();
    };
    const handleSessionChanged = () => {
      if (active) {
        void Promise.resolve().then(refresh);
        void sync();
      }
    };
    const handleCacheStatusChanged = (event) => {
      if (active) {
        setUsingCachedData(Boolean(event.detail?.usingCache));
      }
    };
    void Promise.resolve().then(refresh);
    void subscribeToNetworkChanges((connected) => {
      if (!active) return;
      setOnline(connected);
      if (connected) void sync();
    }).then((stop) => {
      unsubscribe = stop;
    }).catch((error) => {
      console.error('No se pudo iniciar el listener de conectividad:', error);
    });
    globalThis.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChanged);
    globalThis.addEventListener(SESSION_CHANGED_EVENT, handleSessionChanged);
    globalThis.addEventListener(OFFLINE_CACHE_STATUS_EVENT, handleCacheStatusChanged);
    return () => {
      active = false;
      void unsubscribe?.();
      globalThis.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChanged);
      globalThis.removeEventListener(SESSION_CHANGED_EVENT, handleSessionChanged);
      globalThis.removeEventListener(OFFLINE_CACHE_STATUS_EVENT, handleCacheStatusChanged);
    };
  }, [refresh, sync]);

  if (online && pendingCount === 0 && !waitingForLogin && !usingCachedData) {
    return null;
  }

  return (
    <div
      role="status"
      className={`sticky top-0 z-[60] flex min-h-10 items-center justify-between gap-3 px-4 py-2 text-xs ${
        online
          ? 'bg-amber-500/15 text-amber-100'
          : 'bg-slate-800 text-slate-100'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {online ? <Wifi size={16} /> : <CloudOff size={16} />}
        <span className="truncate">
          {!online
            ? `Sin conexión. ${pendingCount} operación(es) guardada(s) en este dispositivo.`
            : waitingForLogin
                ? pendingCount > 0
                  ? `Hay ${pendingCount} operación(es) pendientes. Inicia sesión con conexión para sincronizar.`
                  : 'Sesion local: puedes consultar datos guardados; vuelve a iniciar sesion para actualizar.'
                : usingCachedData
                  ? 'No se pudo actualizar desde el servidor. Se muestran datos guardados; verifica su vigencia antes de continuar.'
                : `${pendingCount} operación(es) pendiente(s) de sincronización.`}
        </span>
      </div>
      {online && pendingCount > 0 && !waitingForLogin && (
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-current/20 px-2.5 font-semibold disabled:opacity-60"
        >
          {syncing ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Sincronizar
        </button>
      )}
      {online && waitingForLogin && (
        <button
          type="button"
          onClick={reauthenticate}
          className="inline-flex min-h-8 shrink-0 items-center rounded-md border border-current/20 px-2.5 font-semibold"
        >
          Iniciar sesión
        </button>
      )}
    </div>
  );
}
