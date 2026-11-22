import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { isSessionAuthenticated } from '../services/sessionService';
import { isNetworkAvailable } from '../services/offlineNetwork';

function messageFrom(error) {
  return error.response?.data?.message || error.response?.data?.detail || error.message || 'No se pudieron cargar las notificaciones.';
}

export default function NotificationInbox({ floating = false }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    if (!isSessionAuthenticated()) return;
    // Sin red no se consulta: se conservan las notificaciones ya cargadas.
    if (!(await isNetworkAvailable())) return;
    try {
      setNotifications((await apiClient.get('/notifications')).data);
      setError('');
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const openNotification = async (notification) => {
    try {
      if (!notification.readAt) {
        const updated = (await apiClient.patch(`/notifications/${notification.id}/read`)).data;
        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      }
      setIsOpen(false);
      navigate(notification.targetPath || '/');
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  };

  if (!isSessionAuthenticated()) return null;
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div
      className={
        floating
          ? "fixed bottom-[calc(1.25rem+var(--agro-safe-bottom))] right-[calc(1.25rem+var(--agro-safe-right))] z-[70]"
          : "relative z-50"
      }
    >
      {isOpen && (
        <section
          aria-label="Bandeja de notificaciones"
          className={`modal-backdrop-enter absolute right-0 ${
            floating ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]"
          } ${floating ? "" : "max-sm:fixed max-sm:bottom-auto max-sm:right-[calc(0.75rem+var(--agro-safe-right))] max-sm:top-[calc(6rem+var(--agro-safe-top))]"} w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-surface/40 bg-surface/90 text-ink-900 shadow-[var(--agro-shadow-card)] backdrop-blur-xl`}
        >
          <header className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
            <h2 className="text-sm font-bold text-ink-900">Notificaciones</h2>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar notificaciones" className="inline-flex size-10 items-center justify-center rounded-xl text-ink-600 hover:bg-sand-100 hover:text-ink-900">
              <X size={16} />
            </button>
          </header>
          {error && <p role="alert" className="border-b border-error/15 bg-error-soft px-4 py-2 text-xs text-error-text">{error}</p>}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length ? notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => openNotification(notification)}
                className={`block min-h-11 w-full border-b border-sand-200/70 px-4 py-3 text-left hover:bg-sand-50 ${notification.readAt ? 'opacity-70' : ''}`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-xs font-semibold text-ink-900">{notification.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-600">{notification.message}</span>
                    <time className="mt-1.5 block text-[10px] text-ink-600">
                      {new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(notification.createdAt))}
                    </time>
                  </span>
                  {notification.readAt && <Check size={14} className="mt-0.5 shrink-0 text-forest-500" />}
                </span>
              </button>
            )) : (
              <p className="px-4 py-8 text-center text-xs text-ink-600">No tienes notificaciones.</p>
            )}
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
        aria-expanded={isOpen}
        className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-sand-200 bg-surface text-forest-700 shadow-sm hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-gold-600"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
