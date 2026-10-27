import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { hasUnexpiredToken, SESSION_EXPIRED_EVENT } from './services/sessionService';

import Login from './pages/Login/Login';
import Registro from './pages/Registro/Registro';
import AdminDashboard from './pages/Administrador/AdminDashboard';
import SuperDashboard from './pages/Supervisor/SuperDashboard';
import TecDashboard from './pages/Tecnico/TecDashboard';
import AlmacenDashboard from './pages/Almacenista/AlmacenDashboard';
import OperDashboard from './pages/Operativo/OperDashboard';
import PreventiveMaintenance from './pages/Compartido/PreventiveMaintenance';

function getStoredRoles() {
  try {
    const roles = JSON.parse(localStorage.getItem('roles') ?? '[]');
    return Array.isArray(roles) ? roles : [];
  } catch {
    return [];
  }
}

function ProtectedRoute({ allowedRoles, children }) {
  const token = localStorage.getItem('token');
  const role = (localStorage.getItem('rol') ?? '').toUpperCase().replace(/^ROLE_/, '');
  const storedRoles = getStoredRoles();
  const effectiveRoles = new Set(
    [role, ...storedRoles].map((item) =>
      (item ?? '').toUpperCase().replace(/^ROLE_/, ''),
    ),
  );
  if (
    !hasUnexpiredToken(token) ||
    !allowedRoles.some((allowedRole) => effectiveRoles.has(allowedRole))
  ) {
    return <Navigate to="/login" replace />;
  }
  return children;
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

export default function App() {
  return (
    <BrowserRouter>
      <SessionExpiredNotice />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
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
    </BrowserRouter>
  );
}