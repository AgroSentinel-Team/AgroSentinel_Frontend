import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/technicianService';

const DASHBOARDS = [
  { roles: ['ADMIN', 'ADMINISTRADOR'], label: 'Administrador', path: '/admin/dashboard' },
  { roles: ['SUPERVISOR'], label: 'Supervisor', path: '/supervisor/dashboard' },
  { roles: ['TECNICO'], label: 'Técnico', path: '/tecnico/dashboard' },
  { roles: ['ALMACENISTA'], label: 'Almacén', path: '/almacen/dashboard' },
  {
    roles: ['OPERATIVO_CAMPO', 'OPERARIO_CAMPO'],
    label: 'Operativo de campo',
    path: '/operativo/dashboard',
  },
];

function normalizeRole(role) {
  return String(role ?? '').toUpperCase().replace(/^ROLE_/, '');
}

function readStoredRoles() {
  try {
    const storedRoles = JSON.parse(localStorage.getItem('roles') || '[]');
    return [...new Set([localStorage.getItem('rol'), ...(Array.isArray(storedRoles) ? storedRoles : [])]
      .map(normalizeRole)
      .filter(Boolean))];
  } catch {
    return normalizeRole(localStorage.getItem('rol'))
      ? [normalizeRole(localStorage.getItem('rol'))]
      : [];
  }
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    error.message ||
    'No fue posible actualizar los permisos de la sesión.'
  );
}

export default function DashboardRoleSwitcher() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState(readStoredRoles);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        const effectiveRoles = Array.isArray(user.roles) ? user.roles : [];
        localStorage.setItem('roles', JSON.stringify(effectiveRoles));
        if (user.rol) localStorage.setItem('rol', user.rol);
        setRoles([...new Set([user.rol, ...effectiveRoles].map(normalizeRole).filter(Boolean))]);
        setProfileError('');
      })
      .catch((error) => {
        if (active) setProfileError(getErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, []);

  const availableDashboards = useMemo(
    () => DASHBOARDS.filter((dashboard) => dashboard.roles.some((role) => roles.includes(role))),
    [roles],
  );

  if (availableDashboards.length < 2) {
    return profileError ? (
      <span
        role="status"
        title={profileError}
        className="max-w-40 text-right text-[10px] leading-tight text-amber-300"
      >
        No se actualizaron los permisos
      </span>
    ) : null;
  }

  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className="sr-only">Cambiar dashboard según tus roles</span>
      <select
        value=""
        onChange={(event) => {
          if (event.target.value) navigate(event.target.value);
        }}
        aria-label="Cambiar dashboard según tus roles"
        title={profileError || 'Cambiar dashboard'}
        className="min-h-10 max-w-36 rounded-lg border border-cyan-400/25 bg-[#102a3d] px-2 text-[11px] font-semibold text-cyan-100 outline-none focus:border-cyan-300 sm:max-w-48 sm:px-3 sm:text-xs"
      >
        <option value="" disabled>
          Cambiar módulo
        </option>
        {availableDashboards.map((dashboard) => (
          <option key={dashboard.path} value={dashboard.path}>
            {dashboard.label}
          </option>
        ))}
      </select>
      {profileError && (
        <span role="status" className="sr-only">
          No se actualizaron los permisos: {profileError}
        </span>
      )}
    </label>
  );
}
