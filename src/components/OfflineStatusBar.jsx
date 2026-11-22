import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CloudOff, ListChecks, LoaderCircle, RefreshCw, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OFFLINE_QUEUE_CHANGED_EVENT } from '../services/offlineDatabase';
import { OFFLINE_CACHE_STATUS_EVENT } from '../services/apiClient';
import { isNetworkAvailable, subscribeToNetworkChanges } from '../services/offlineNetwork';
import {
  getQueueSummary,
  syncPendingOfflineOperations,
} from '../services/offlineSync';
import {
  clearSession,
  isSessionAuthenticated,
  needsOnlineLogin,
  SESSION_CHANGED_EVENT,
} from '../services/sessionService';
import SyncQueueModal from './SyncQueueModal';

// Mientras haya pendientes y red, se reintenta solo cada minuto (p. ej. si el servidor estaba caído).
const AUTO_RETRY_MS = 60_000;

export default function OfflineStatusBar() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState({ pending: 0, conflicts: 0 });
  const [syncing, setSyncing] = useState(false);
  const [waitingForLogin, setWaitingForLogin] = useState(false);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [connected, summary] = await Promise.all([
        isNetworkAvailable(),
        getQueueSummary(),
      ]);
      setOnline(connected);
      setQueue(summary);
      setWaitingForLogin(needsOnlineLogin());
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
      if (active) unsubscribe = stop;
      else void stop();
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

  useEffect(() => {
    if (!online || queue.pending === 0 || waitingForLogin) return undefined;
    const timer = setInterval(() => {
      if (isSessionAuthenticated()) void sync();
    }, AUTO_RETRY_MS);
    return () => clearInterval(timer);
  }, [online, queue.pending, waitingForLogin, sync]);

  const { pending, conflicts } = queue;
  const total = pending + conflicts;

  if (online && total === 0 && !waitingForLogin && !usingCachedData) {
    return null;
  }

  let text;
  if (!online) {
    text = total > 0
      ? `Sin conexión. ${total} operación(es) guardada(s) en este dispositivo; se enviarán al volver internet.`
      : 'Sin conexión. Trabajando con los datos descargados.';
  } else if (waitingForLogin) {
    text = total > 0
      ? `Hay ${total} operación(es) pendientes. Inicia sesión con conexión para sincronizar.`
      : 'Tu sesión guardada venció. Puedes consultar los datos descargados; inicia sesión con internet para sincronizar.';
  } else if (conflicts > 0) {
    text = `${conflicts} operación(es) rechazada(s) por el servidor. Revísalas para reintentar o descartar.`;
  } else if (pending > 0) {
    text = syncing
      ? `Enviando ${pending} operación(es)…`
      : `${pending} operación(es) pendiente(s) de sincronización.`;
  } else {
    text = 'No se pudo actualizar desde el servidor. Se muestran datos guardados; verifica su vigencia antes de continuar.';
  }

  const tone = !online
    ? 'border-b border-forest-700 bg-pine-900 text-white'
    : conflicts > 0 && !waitingForLogin
      ? 'border-b border-error/30 bg-error-soft text-error-text'
      : 'border-b border-gold-300/50 bg-gold-100 text-ink-900';
  const buttonClass =
    'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-current/20 px-3 font-semibold transition-all duration-200 hover:bg-black/5 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-gold-600';

  return (
    <>
      <div
        role="status"
        className={`sticky top-0 z-[60] flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pb-2 pt-[calc(0.5rem+var(--agro-safe-top))] text-xs ${tone}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!online ? (
            <CloudOff size={16} className="shrink-0" />
          ) : conflicts > 0 ? (
            <AlertTriangle size={16} className="shrink-0" />
          ) : (
            <Wifi size={16} className="shrink-0" />
          )}
          <span className="min-w-0">{text}</span>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {total > 0 && (
            <button type="button" onClick={() => setReviewOpen(true)} className={buttonClass}>
              <ListChecks size={14} />
              {conflicts > 0 ? 'Revisar' : 'Ver pendientes'}
            </button>
          )}
          {online && pending > 0 && !waitingForLogin && (
            <button type="button" onClick={sync} disabled={syncing} className={buttonClass}>
              {syncing ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sincronizar
            </button>
          )}
          {online && waitingForLogin && (
            <button type="button" onClick={reauthenticate} className={buttonClass}>
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
      <SyncQueueModal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} online={online} />
    </>
  );
}
