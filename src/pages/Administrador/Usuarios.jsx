import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { expireSession } from '../../services/sessionService';
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const emptyForm = { name: '', email: '', role: 'TECNICO', password: '' };
const inputClass = 'w-full rounded-md border border-[#36556f] bg-[#102a3d] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400';

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
        const response = await axios.get(`${API_BASE_URL}/api/usuarios`, authConfig());
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
        ? await axios.put(`${API_BASE_URL}/api/usuarios/${editingUser.id}`, payload, authConfig())
        : await axios.post(`${API_BASE_URL}/api/usuarios`, { ...payload, password: form.password }, authConfig());
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
      const response = await axios.patch(`${API_BASE_URL}/api/usuarios/${userId}/rol`, { rol: role }, authConfig());
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
      const response = await axios.patch(`${API_BASE_URL}/api/usuarios/${user.id}/estado`, { activo: !user.active }, authConfig());
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
      await axios.delete(`${API_BASE_URL}/api/usuarios/${userToDelete.id}`, authConfig());
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
      <section className="rounded-lg border border-red-500/20 bg-[#13293a] p-8 text-center">
        <ShieldCheck className="mx-auto text-red-400" size={28} />
        <h2 className="mt-3 text-base font-semibold text-white">Acceso restringido</h2>
        <p className="mt-1 text-sm text-gray-400">Este panel está disponible únicamente para administradores.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 text-white sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Gestión de usuarios</h2>
          <p className="mt-1 text-sm text-gray-400">Administra perfiles, permisos y acceso a la plataforma.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search aria-hidden="true" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="Buscar usuarios"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, correo o rol"
              className={`${inputClass} pl-9`}
            />
          </div>
          <button
            type="button"
            onClick={() => openForm()}
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-700 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <Plus size={16} /> Nuevo usuario
          </button>
        </div>
      </div>

      {requestError && (
        <p role="alert" className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{requestError}</p>
      )}

      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-[#2d4055] bg-[#102a3d] text-xs uppercase text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
              <th scope="col" className="px-4 py-3 font-medium">Correo electrónico</th>
              <th scope="col" className="px-4 py-3 font-medium">Rol</th>
              <th scope="col" className="px-4 py-3 font-medium">Estado</th>
              <th scope="col" className="px-4 py-3 font-medium">Último acceso</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr><td colSpan="6" className="px-4 py-10 text-center text-sm text-gray-400">Cargando usuarios...</td></tr>
            ) : filteredUsers.map((user) => (
              <tr key={user.id} className="transition hover:bg-white/[0.03]">
                <td className="px-4 py-3.5 font-medium">{user.name}</td>
                <td className="px-4 py-3.5 text-gray-300">{user.email}</td>
                <td className="px-4 py-3.5">
                  <select
                    aria-label={`Rol de ${user.name}`}
                    value={user.role}
                    onChange={(event) => handleRoleChange(user.id, event.target.value)}
                    disabled={busyUserId === user.id}
                    className="max-w-[220px] rounded-md border border-[#36556f] bg-[#102a3d] px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-cyan-400"
                  >
                    {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${user.active ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {user.active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1.5"><Clock3 size={13} />{user.lastLogin}</span>
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
                      className={`rounded-md px-2 py-1.5 text-xs transition hover:bg-white/10 ${user.active ? 'text-emerald-300' : 'text-gray-300'}`}
                    >
                      {user.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                    <button
                      type="button"
                      title="Editar usuario"
                      aria-label={`Editar a ${user.name}`}
                      onClick={() => openForm(user)}
                      className="rounded-md p-2 text-gray-400 transition hover:bg-blue-500/10 hover:text-blue-300"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title="Eliminar usuario"
                      aria-label={`Eliminar a ${user.name}`}
                      onClick={() => { setUserToDelete(user); setDeleteConfirmation(''); }}
                      className="rounded-md p-2 text-gray-400 transition hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !filteredUsers.length && !requestError && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">No hay usuarios que coincidan con la búsqueda.</p>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <form onSubmit={handleSaveUser} aria-labelledby="user-form-title" className="w-full max-w-lg rounded-xl border border-[#36556f] bg-[#13293a] p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 id="user-form-title" className="text-base font-semibold">{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h3>
                <p className="mt-1 text-sm text-gray-400">Actualiza la información básica y el rol asignado.</p>
              </div>
              <button type="button" onClick={closeForm} aria-label="Cerrar formulario" className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm text-gray-300">
                <span className="mb-1.5 block">Nombre completo</span>
                <span className="relative block"><UserRound aria-hidden="true" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`${inputClass} pl-9`} /></span>
              </label>
              <label className="block text-sm text-gray-300">
                <span className="mb-1.5 block">Correo electrónico</span>
                <span className="relative block"><Mail aria-hidden="true" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`${inputClass} pl-9`} /></span>
              </label>
              <label className="block text-sm text-gray-300">
                <span className="mb-1.5 block">Rol</span>
                <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className={inputClass}>
                  {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </label>
              {!editingUser && (
                <label className="block text-sm text-gray-300">
                  <span className="mb-1.5 block">Contraseña inicial</span>
                  <input type="password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={inputClass} autoComplete="new-password" />
                </label>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">Cancelar</button>
              <button type="submit" disabled={isSaving} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">{isSaving ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </form>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" className="w-full max-w-md rounded-lg border border-red-500/30 bg-[#251d1d] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-red-500/10 p-2 text-red-400"><Trash2 size={19} /></div>
              <div>
                <h3 id="delete-title" className="text-base font-semibold text-white">Eliminar usuario</h3>
                <p id="delete-description" className="mt-1 text-sm leading-relaxed text-gray-300">Esta acción eliminará a <strong className="text-white">{userToDelete.name}</strong> y no se puede deshacer.</p>
              </div>
            </div>
            <label className="mt-5 block text-sm text-gray-300">
              Escribe <span className="font-semibold text-red-300">ELIMINAR</span> para confirmar.
              <input autoFocus value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className={`${inputClass} mt-2 border-red-500/30 focus:border-red-400`} />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setUserToDelete(null); setDeleteConfirmation(''); }} className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">Cancelar</button>
              <button type="button" disabled={deleteConfirmation !== 'ELIMINAR' || isDeleting} onClick={handleDeleteUser} className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40">{isDeleting ? 'Eliminando...' : 'Eliminar usuario'}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}