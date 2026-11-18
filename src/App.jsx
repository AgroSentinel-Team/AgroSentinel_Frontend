import { lazy, Suspense, useEffect, useReducer, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  getAuthToken,
  hasUnexpiredToken,
  isSessionAuthenticated,
  SESSION_CHANGED_EVENT,
  SESSION_EXPIRED_EVENT,
} from './services/sessionService';
import { isNetworkAvailable } from './services/offlineNetwork';
import { syncPendingOfflineOperations } from './services/offlineSync';

import Login from './pages/Login/Login';
import Registro from './pages/Registro/Registro';
import OfflineStatusBar from './components/OfflineStatusBar';
import AccesoDenegado from './pages/AccesoDenegado';
import { ACCESS_DENIED_EVENT } from './services/apiClient';
import NotificationInbox from './components/NotificationInbox';

const AdminDashboard = lazy(() => import('./pages/Administrador/AdminDashboard'));
const SuperDashboard = lazy(() => import('./pages/Supervisor/SuperDashboard'));
const TecDashboard = lazy(() => import('./pages/Tecnico/TecDashboard'));
const AlmacenDashboard = lazy(() => import('./pages/Almacenista/AlmacenDashboard'));
const OperDashboard = lazy(() => import('./pages/Operativo/OperDashboard'));
const PreventiveMaintenance = lazy(() => import('./pages/Compartido/PreventiveMaintenance'));

function getStoredRoles() {
  try {
    const roles = JSON.parse(localStorage.getItem('roles') ?? '[]');
    return Array.isArray(roles) ? roles : [];
  } catch {
    return [];
  }
}

function ProtectedRoute({ allowedRoles, children }) {
  const role = (localStorage.getItem('rol') ?? '').toUpperCase().replace(/^ROLE_/, '');
  const storedRoles = getStoredRoles();
  const effectiveRoles = new Set(
    [role, ...storedRoles].map((item) =>
      (item ?? '').toUpperCase().replace(/^ROLE_/, ''),
    ),
  );
  if (!isSessionAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.some((allowedRole) => effectiveRoles.has(allowedRole))) {
    return <Navigate to="/403" replace />;
  }
  return children;
}

function AccessDeniedRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = () => navigate('/403');
    globalThis.addEventListener(ACCESS_DENIED_EVENT, redirect);
    return () => globalThis.removeEventListener(ACCESS_DENIED_EVENT, redirect);
  }, [navigate]);

  return null;
}

function SessionExpiredNotice() {
  const navigate = useNavigate();
  const [sessionExpired, setSessionExpired] = useState(false);
  const redirectToLogin = () => {
    setSessionExpired(false);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const handleSessionExpired = () => setSessionExpired(true);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  useEffect(() => {
    if (!sessionExpired) return undefined;
    const redirectTimer = window.setTimeout(() => {
      setSessionExpired(false);
      navigate('/login', { replace: true });
    }, 1800);
    return () => window.clearTimeout(redirectTimer);
  }, [sessionExpired, navigate]);

  if (!sessionExpired) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-[#36556f] bg-[#102637] p-6 text-center text-white shadow-2xl space-y-4">
        <h2 id="session-expired-title" className="text-base sm:text-lg font-bold">
          Tu sesión ha terminado
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Serás redirigido al inicio de sesión.
        </p>
        <button
          type="button"
          onClick={redirectToLogin}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-cyan-600 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-950/40"
        >
          Ir al inicio de sesión
        </button>
      </div>
    </div>
  );
}

function getRoleLandingPath() {
  const role = (localStorage.getItem('rol') ?? '')
    .toUpperCase()
    .replace(/^ROLE_/, '');
  const roles = getStoredRoles().map((item) =>
    String(item ?? '').toUpperCase().replace(/^ROLE_/, ''),
  );
  const effectiveRoles = new Set([role, ...roles]);
  if (effectiveRoles.has('TECNICO')) return '/tecnico/dashboard';
  if (effectiveRoles.has('ADMIN') || effectiveRoles.has('ADMINISTRADOR')) {
    return '/admin/dashboard';
  }
  if (effectiveRoles.has('SUPERVISOR')) return '/supervisor/dashboard';
  if (effectiveRoles.has('ALMACENISTA')) return '/almacen/dashboard';
  if (effectiveRoles.has('OPERARIO_CAMPO') || effectiveRoles.has('OPERATIVO_CAMPO')) {
    return '/operativo/dashboard';
  }
  return '/login';
}

function SessionEntryRoute() {
  return isSessionAuthenticated()
    ? <Navigate to={getRoleLandingPath()} replace />
    : <Login />;
}

export default function App({ startupError = '' }) {
  const [, refreshSession] = useReducer((revision) => revision + 1, 0);
  useEffect(() => {
    const syncAtStartup = async () => {
      const token = getAuthToken();
      if (!token || !hasUnexpiredToken(token) || !(await isNetworkAvailable())) {
        return;
      }
      await syncPendingOfflineOperations();
    };

    void syncAtStartup().catch((error) => {
      console.error('No se pudo sincronizar la cola offline al iniciar:', error);
    });
  }, []);

  useEffect(() => {
    const refresh = () => {
      getAuthToken();
      refreshSession();
    };
    globalThis.addEventListener(SESSION_CHANGED_EVENT, refresh);
    return () => globalThis.removeEventListener(SESSION_CHANGED_EVENT, refresh);
  }, []);

  return (
    <BrowserRouter>
      <SessionExpiredNotice />
      <AccessDeniedRedirect />
      <NotificationInbox />
      {startupError && (
        <div role="alert" className="bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-200">
          {startupError}
        </div>
      )}
      <OfflineStatusBar />
      <Suspense
        fallback={
          <div role="status" className="p-8 text-center text-sm text-sky-300">
            Cargando módulo...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<SessionEntryRoute />} />
          <Route path="/login" element={<SessionEntryRoute />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/403" element={<AccesoDenegado />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ADMINISTRADOR']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPERVISOR']}>
                <SuperDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tecnico/dashboard"
            element={
              <ProtectedRoute allowedRoles={['TECNICO']}>
                <TecDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mantenimiento-preventivo"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ADMINISTRADOR']}>
                <PreventiveMaintenance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tecnico/mantenimiento-preventivo"
            element={
              <ProtectedRoute allowedRoles={['TECNICO']}>
                <PreventiveMaintenance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/almacen/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ALMACENISTA']}>
                <AlmacenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operativo/dashboard"
            element={
              <ProtectedRoute allowedRoles={['OPERARIO_CAMPO', 'OPERATIVO_CAMPO']}>
                <OperDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}