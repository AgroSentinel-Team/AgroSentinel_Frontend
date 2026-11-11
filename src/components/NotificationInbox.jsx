import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { isSessionAuthenticated } from '../services/sessionService';

function messageFrom(error) {
  return error.response?.data?.message || error.response?.data?.detail || error.message || 'No se pudieron cargar las notificaciones.';
}

export default function NotificationInbox() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    if (!isSessionAuthenticated()) return;
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
    <div className="fixed bottom-5 right-5 z-[70]">
      {isOpen && (
        <section
          aria-label="Bandeja de notificaciones"
          className="mb-3 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-white/10 bg-[#102637] shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-bold text-white">Notificaciones</h2>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar notificaciones" className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          </header>
          {error && <p role="alert" className="border-b border-red-400/20 bg-red-400/10 px-4 py-2 text-xs text-red-200">{error}</p>}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length ? notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => openNotification(notification)}
                className={`block w-full border-b border-white/5 px-4 py-3 text-left hover:bg-white/5 ${notification.readAt ? 'opacity-70' : ''}`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-xs font-semibold text-white">{notification.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-300">{notification.message}</span>
                    <time className="mt-1.5 block text-[10px] text-slate-500">
                      {new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(notification.createdAt))}
                    </time>
                  </span>
                  {notification.readAt && <Check size={14} className="mt-0.5 shrink-0 text-emerald-300" />}
                </span>
              </button>
            )) : (
              <p className="px-4 py-8 text-center text-xs text-slate-400">No tienes notificaciones.</p>
            )}
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
        aria-expanded={isOpen}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-700 text-white shadow-lg shadow-black/30 hover:bg-cyan-600"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
