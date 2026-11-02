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

const roles = [
  { value: 'TECNICO', label: 'Técnico de mantenimiento' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'ALMACENISTA', label: 'Almacenista' },
  { value: 'OPERATIVO_CAMPO', label: 'Usuario operativo de campo' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
];

const emptyForm = { name: '', email: '', role: 'TECNICO', password: '' };
const inputClass =
  'w-full rounded-lg border border-[#36556f] bg-[#102a3d] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px]';

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
      <section className="rounded-xl border border-red-500/20 bg-[#13293a] p-8 text-center shadow-xl">
        <ShieldCheck className="mx-auto text-red-400" size={32} />
        <h2 className="mt-3 text-base font-semibold text-white">Acceso restringido</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Este panel está disponible únicamente para usuarios con rol de administrador.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-6 text-white shadow-xl min-w-0">
      {/* Encabezado y Barra de Búsqueda */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Gestión de usuarios</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Administra perfiles, permisos y acceso a la plataforma.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search
              aria-hidden="true"
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label="Buscar usuarios"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, correo o rol"
              className={`${inputClass} pl-10`}
            />
          </div>
          <button
            type="button"
            onClick={() => openForm()}
            className="flex min-h-[44px] w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-950/40"
          >
            <Plus size={18} />
            <span>Nuevo usuario</span>
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {requestError && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
          <span className="min-w-0 flex-1">{requestError}</span>
          <button
            type="button"
            onClick={() => setRequestError('')}
            aria-label="Cerrar aviso"
            className="flex h-8 w-8 items-center justify-center rounded text-red-300 hover:bg-red-500/20 transition-colors shrink-0 -mr-1 -mt-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Estado Carga / Vacío / Lista Usuarios */}
      {isLoading ? (
        <p className="py-12 text-center text-xs text-slate-400">Cargando usuarios...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="py-12 text-center text-xs text-slate-400">
          {query.trim() ? 'No hay usuarios que coincidan con la búsqueda.' : 'Aún no hay usuarios registrados.'}
        </p>
      ) : (
        <>
          {/* Vista Tarjetas para Pantallas Pequeñas (Móviles) */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
            {filteredUsers.map((user) => (
              <article key={user.id} className="rounded-xl border border-[#294255] bg-[#0c1e2c] p-4 space-y-3 shadow-md">
                <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${user.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'}`}>
                    {user.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 text-[11px] font-medium uppercase tracking-wider block mb-1">Rol asignado</label>
                    <select
                      aria-label={`Rol de ${user.name}`}
                      value={user.role}
                      onChange={(event) => handleRoleChange(user.id, event.target.value)}
                      disabled={busyUserId === user.id}
                      className={inputClass}
                    >
                      {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Clock3 size={13} />
                      Acceso: {user.lastLogin}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    title={user.active ? 'Desactivar usuario' : 'Reactivar usuario'}
                    aria-label={user.active ? `Desactivar a ${user.name}` : `Reactivar a ${user.name}`}
                    aria-pressed={user.active}
                    onClick={() => handleToggleStatus(user)}
                    disabled={busyUserId === user.id}
                    className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                      user.active ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    {user.active ? 'Desactivar' : 'Reactivar'}
                  </button>

                  <button
                    type="button"
                    title="Editar usuario"
                    aria-label={`Editar a ${user.name}`}
                    onClick={() => openForm(user)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-cyan-300 transition-colors"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    type="button"
                    title="Eliminar usuario"
                    aria-label={`Eliminar a ${user.name}`}
                    onClick={() => { setUserToDelete(user); setDeleteConfirmation(''); }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Vista Tabla para Pantallas Medianas / Escritorio */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[850px] text-left text-xs sm:text-sm">
              <thead className="border-b border-[#2d4055] bg-[#102a3d] text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Nombre</th>
                  <th scope="col" className="px-4 py-3.5">Correo electrónico</th>
                  <th scope="col" className="px-4 py-3.5">Rol</th>
                  <th scope="col" className="px-4 py-3.5">Estado</th>
                  <th scope="col" className="px-4 py-3.5">Último acceso</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3.5 font-medium text-white">{user.name}</td>
                    <td className="px-4 py-3.5 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3.5">
                      <select
                        aria-label={`Rol de ${user.name}`}
                        value={user.role}
                        onChange={(event) => handleRoleChange(user.id, event.target.value)}
                        disabled={busyUserId === user.id}
                        className="max-w-[220px] rounded-lg border border-[#36556f] bg-[#102a3d] px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
                      >
                        {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user.active ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {user.active ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{user.lastLogin}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title={user.active ? 'Desactivar usuario' : 'Reactivar usuario'}
                          aria-label={user.active ? `Desactivar a ${user.name}` : `Reactivar a ${user.name}`}
                          aria-pressed={user.active}
                          onClick={() => handleToggleStatus(user)}
                          disabled={busyUserId === user.id}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10 ${user.active ? 'text-emerald-300' : 'text-slate-300'}`}
                        >
                          {user.active ? 'Desactivar' : 'Reactivar'}
                        </button>
                        <button
                          type="button"
                          title="Editar usuario"
                          aria-label={`Editar a ${user.name}`}
                          onClick={() => openForm(user)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-500/10 hover:text-cyan-300 transition-colors"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar usuario"
                          aria-label={`Eliminar a ${user.name}`}
                          onClick={() => { setUserToDelete(user); setDeleteConfirmation(''); }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Formulario Crear / Editar Usuario */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}
        >
          <form
            onSubmit={handleSaveUser}
            aria-labelledby="user-form-title"
            className="w-full max-w-lg rounded-xl border border-[#36556f] bg-[#13293a] p-5 sm:p-6 shadow-2xl min-w-0"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <h3 id="user-form-title" className="text-base font-semibold text-white">
                  {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">Actualiza la información básica y el rol asignado.</p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Cerrar formulario"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-medium text-slate-300 space-y-1">
                <span>Nombre completo <span className="text-cyan-400">*</span></span>
                <span className="relative block">
                  <UserRound aria-hidden="true" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    required
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className={`${inputClass} pl-10`}
                  />
                </span>
              </label>

              <label className="block text-xs font-medium text-slate-300 space-y-1">
                <span>Correo electrónico <span className="text-cyan-400">*</span></span>
                <span className="relative block">
                  <Mail aria-hidden="true" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    className={`${inputClass} pl-10`}
                  />
                </span>
              </label>

              <label className="block text-xs font-medium text-slate-300 space-y-1">
                <span>Rol <span className="text-cyan-400">*</span></span>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                  className={inputClass}
                >
                  {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </label>

              {!editingUser && (
                <label className="block text-xs font-medium text-slate-300 space-y-1">
                  <span>Contraseña inicial <span className="text-cyan-400">*</span></span>
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

            <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-medium text-slate-300 hover:bg-white/5 active:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-950/40"
              >
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Confirmación Eliminar */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
            className="w-full max-w-md rounded-xl border border-red-500/30 bg-[#251d1d] p-5 sm:p-6 shadow-2xl min-w-0"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <Trash2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="delete-title" className="text-base font-semibold text-white">Eliminar usuario</h3>
                <p id="delete-description" className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Esta acción eliminará a <strong className="text-white font-semibold">{userToDelete.name}</strong> y no se puede deshacer.
                </p>
              </div>
            </div>

            <label className="mt-5 block text-xs text-slate-300 space-y-1">
              <span>Escribe <span className="font-bold text-red-300">ELIMINAR</span> para confirmar:</span>
              <input
                autoFocus
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className={`${inputClass} border-red-500/40 focus:border-red-400`}
              />
            </label>

            <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => { setUserToDelete(null); setDeleteConfirmation(''); }}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-medium text-slate-300 hover:bg-white/5 active:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteConfirmation !== 'ELIMINAR' || isDeleting}
                onClick={handleDeleteUser}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-red-600 px-5 text-xs font-semibold text-white hover:bg-red-500 active:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-red-950/40"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar usuario'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}