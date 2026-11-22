import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_ROOT, apiClient } from '../../services/apiClient';
import { expireSession, getAuthToken } from '../../services/sessionService';
import {
  CheckCircle2,
  Clock3,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { Badge, Button, EmptyState, Input, PageHeader, ResponsiveTable, Select, Skeleton, StatCard } from '../../components/ui';

const roles = [
  { value: 'TECNICO', label: 'Técnico de mantenimiento' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'ALMACENISTA', label: 'Almacenista' },
  { value: 'OPERATIVO_CAMPO', label: 'Usuario operativo de campo' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
];

const emptyForm = { name: '', email: '', role: 'TECNICO', password: '' };
const inputClass =
  'min-h-11 w-full rounded-xl border border-sand-200 bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-all duration-200 placeholder:text-ink-600 focus-visible:border-gold-600 focus-visible:ring-2 focus-visible:ring-gold-500/25';

axios.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    if (typeof config.headers?.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }
  }
  return config;
});

function getRoleLabel(role) {
  return roles.find((item) => item.value === role)?.label ?? role;
}

function fromApiUser(user) {
  return {
    id: user.id,
    name: user.nombre,
    email: user.email,
    role: user.rol,
    active: user.activo,
    lastLogin: user.ultimoAcceso
      ? new Date(user.ultimoAcceso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Nunca',
  };
}

function getApiError(error) {
  if (error.response?.status === 401) expireSession();
  const response = error.response?.data;
  return response?.detail || response?.message || (typeof response === 'string' ? response : 'No fue posible completar la operación.');
}

function authConfig() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } };
}

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const isAdministrator = localStorage.getItem('rol')?.toUpperCase() === 'ADMINISTRADOR';

  useEffect(() => {
    if (!isAdministrator) return undefined;
    let isCurrent = true;

    const loadUsers = async () => {
      setIsLoading(true);
      setRequestError('');
      try {
        const response = await apiClient.get('/usuarios');
        if (isCurrent) setUsers(response.data.map(fromApiUser));
      } catch (error) {
        if (isCurrent) setRequestError(getApiError(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadUsers();
    return () => { isCurrent = false; };
  }, [isAdministrator]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) =>
      `${user.name} ${user.email} ${getRoleLabel(user.role)} ${user.active ? 'activo' : 'inactivo'}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, users]);

  const openForm = (user = null) => {
    setEditingUser(user);
    setForm(user ? { name: user.name, email: user.email, role: user.role, password: '' } : emptyForm);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleSaveUser = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setRequestError('');
    const payload = { nombre: form.name.trim(), email: form.email.trim(), rol: form.role };
    try {
      const response = editingUser
        ? await axios.put(`${API_ROOT}/usuarios/${editingUser.id}`, payload, authConfig())
        : await axios.post(`${API_ROOT}/usuarios`, { ...payload, password: form.password }, authConfig());
      const savedUser = fromApiUser(response.data);
      setUsers((current) => editingUser
        ? current.map((user) => user.id === savedUser.id ? savedUser : user)
        : [...current, savedUser]);
      closeForm();
    } catch (error) {
      setRequestError(getApiError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    setBusyUserId(userId);
    setRequestError('');
    try {
      const response = await axios.patch(`${API_ROOT}/usuarios/${userId}/rol`, { rol: role }, authConfig());
      const updatedUser = fromApiUser(response.data);
      setUsers((current) => current.map((user) => user.id === userId ? updatedUser : user));
    } catch (error) {
      setRequestError(getApiError(error));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleStatus = async (user) => {
    setBusyUserId(user.id);
    setRequestError('');
    try {
      const response = await axios.patch(`${API_ROOT}/usuarios/${user.id}/estado`, { activo: !user.active }, authConfig());
      const updatedUser = fromApiUser(response.data);
      setUsers((current) => current.map((item) => item.id === user.id ? updatedUser : item));
    } catch (error) {
      setRequestError(getApiError(error));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmation !== 'ELIMINAR' || !userToDelete) return;
    setIsDeleting(true);
    setRequestError('');
    try {
      await axios.delete(`${API_ROOT}/usuarios/${userToDelete.id}`, authConfig());
      setUsers((current) => current.filter((user) => user.id !== userToDelete.id));
      setUserToDelete(null);
      setDeleteConfirmation('');
    } catch (error) {
      setRequestError(getApiError(error));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdministrator) {
    return (
      <section className="rounded-2xl border border-error/20 bg-surface p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto text-error-text" size={32} />
        <h2 className="mt-3 text-base font-semibold text-ink-900">Acceso restringido</h2>
        <p className="mt-1 text-xs text-ink-600 sm:text-sm">
          Este panel está disponible únicamente para usuarios con rol de administrador.
        </p>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        title="Gestión de usuarios"
        description="Administra perfiles, permisos y acceso a la plataforma."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search
              aria-hidden="true"
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600"
            />
            <Input
              aria-label="Buscar usuarios"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, correo o rol"
              wrapperClassName="relative"
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => openForm()}
            className="w-full shrink-0 sm:w-auto"
          >
            <Plus size={18} /> Nuevo usuario
          </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Usuarios registrados" value={users.length} icon={<UserRound size={20} />} accent="forest" />
        <StatCard label="Usuarios activos" value={users.filter((user) => user.active).length} icon={<CheckCircle2 size={20} />} accent="ocean" />
        <StatCard label="Usuarios inactivos" value={users.filter((user) => !user.active).length} icon={<XCircle size={20} />} accent="gold" />
      </div>

      {/* Alerta de Error */}
      {requestError && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-error/20 bg-error-soft p-3.5 text-sm text-error-text">
          <span className="min-w-0 flex-1">{requestError}</span>
          <button
            type="button"
            onClick={() => setRequestError('')}
            aria-label="Cerrar aviso"
            className="flex size-9 shrink-0 -mr-1 -mt-1 items-center justify-center rounded-lg text-error-text transition-all duration-200 hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-gold-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Estado Carga / Vacío / Lista Usuarios */}
      {isLoading ? (
        <Skeleton variant="rect" className="h-52 rounded-2xl" label="Cargando usuarios" />
      ) : (
        <ResponsiveTable
          caption="Usuarios registrados"
          data={filteredUsers}
          getRowKey={(user) => user.id}
          emptyState={
            <EmptyState
              icon={<UserRound size={22} />}
              title={query.trim() ? 'No hay usuarios que coincidan con la búsqueda.' : 'Aún no hay usuarios registrados.'}
            />
          }
          columns={[
            { key: 'name', header: 'Nombre', render: (user) => <span className="font-semibold">{user.name}</span> },
            { key: 'email', header: 'Correo electrónico' },
            {
              key: 'role',
              header: 'Rol',
              render: (user) => (
                <Select
                  aria-label={`Rol de ${user.name}`}
                  value={user.role}
                  onChange={(event) => handleRoleChange(user.id, event.target.value)}
                  disabled={busyUserId === user.id}
                  className="min-h-10 max-w-[220px] px-2.5 py-1.5 text-xs"
                >
                  {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </Select>
              ),
            },
            {
              key: 'status',
              header: 'Estado',
              render: (user) => (
                <Badge variant={user.active ? 'success' : 'neutral'}>
                  {user.active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {user.active ? 'Activo' : 'Inactivo'}
                </Badge>
              ),
            },
            {
              key: 'lastLogin',
              header: 'Último acceso',
              render: (user) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink-600"><Clock3 size={14} />{user.lastLogin}</span>,
            },
            {
              key: 'actions',
              header: 'Acciones',
              headerClassName: 'text-right',
              cellClassName: 'text-right',
              render: (user) => (
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title={user.active ? 'Desactivar usuario' : 'Reactivar usuario'}
                    aria-label={user.active ? `Desactivar a ${user.name}` : `Reactivar a ${user.name}`}
                    aria-pressed={user.active}
                    onClick={() => handleToggleStatus(user)}
                    disabled={busyUserId === user.id}
                  >
                    {user.active ? 'Desactivar' : 'Reactivar'}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" title="Editar usuario" aria-label={`Editar a ${user.name}`} onClick={() => openForm(user)}>
                    <Pencil size={17} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" title="Eliminar usuario" aria-label={`Eliminar a ${user.name}`} onClick={() => { setUserToDelete(user); setDeleteConfirmation(''); }}>
                    <Trash2 size={17} />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Modal Formulario Crear / Editar Usuario */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-pine-900/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}
        >
          <form
            onSubmit={handleSaveUser}
            aria-labelledby="user-form-title"
            className="w-full min-w-0 max-w-lg rounded-t-3xl border border-surface/40 bg-surface/90 p-5 shadow-2xl backdrop-blur-xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-sand-200 pb-3">
              <div>
                <h3 id="user-form-title" className="text-base font-semibold text-ink-900">
                  {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                </h3>
                <p className="mt-0.5 text-xs text-ink-600">Actualiza la información básica y el rol asignado.</p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Cerrar formulario"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-sand-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-gold-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1 text-[13px] font-medium text-ink-600">
                <span>Nombre completo <span className="text-forest-700">*</span></span>
                <span className="relative block">
                  <UserRound aria-hidden="true" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
                  <input
                    autoFocus
                    required
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className={`${inputClass} pl-10`}
                  />
                </span>
              </label>

              <label className="block space-y-1 text-[13px] font-medium text-ink-600">
                <span>Correo electrónico <span className="text-forest-700">*</span></span>
                <span className="relative block">
                  <Mail aria-hidden="true" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    className={`${inputClass} pl-10`}
                  />
                </span>
              </label>

              <label className="block space-y-1 text-[13px] font-medium text-ink-600">
                <span>Rol <span className="text-forest-700">*</span></span>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                  className={inputClass}
                >
                  {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </label>

              {!editingUser && (
                <label className="block space-y-1 text-[13px] font-medium text-ink-600">
                  <span>Contraseña inicial <span className="text-forest-700">*</span></span>
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </label>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse justify-end gap-2.5 border-t border-sand-200 pt-4 sm:flex-row sm:gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={closeForm}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Confirmación Eliminar */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-pine-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
            className="w-full min-w-0 max-w-md rounded-t-3xl border border-surface/40 bg-surface/90 p-5 shadow-2xl backdrop-blur-xl sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-error/20 bg-error-soft text-error-text">
                <Trash2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="delete-title" className="text-base font-semibold text-ink-900">Eliminar usuario</h3>
                <p id="delete-description" className="mt-1 text-xs leading-relaxed text-ink-600">
                  Esta acción eliminará a <strong className="font-semibold text-ink-900">{userToDelete.name}</strong> y no se puede deshacer.
                </p>
              </div>
            </div>

            <label className="mt-5 block space-y-1 text-[13px] text-ink-600">
              <span>Escribe <span className="font-bold text-error-text">ELIMINAR</span> para confirmar:</span>
              <input
                autoFocus
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className={`${inputClass} border-error/40 focus-visible:border-error focus-visible:ring-error/20`}
              />
            </label>

            <div className="mt-6 flex flex-col-reverse justify-end gap-2.5 sm:flex-row sm:gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setUserToDelete(null); setDeleteConfirmation(''); }}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleteConfirmation !== 'ELIMINAR' || isDeleting}
                onClick={handleDeleteUser}
                className="w-full sm:w-auto"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar usuario'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}