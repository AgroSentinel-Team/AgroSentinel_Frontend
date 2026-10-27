import { useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Trash2, UsersRound, X } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

const roles = [
    { value: 'TECNICO', label: 'Técnico' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'ALMACENISTA', label: 'Almacenista' },
    { value: 'OPERATIVO_CAMPO', label: 'Operativo de campo' },
    { value: 'OPERARIO_CAMPO', label: 'Operario de campo' },
];

const emptyForm = {
    name: '',
    description: '',
    leaderId: '',
    memberIds: [],
    grantedRoles: [],
};

const inputClass =
    'w-full rounded-lg border border-[#36556f] bg-[#102a3d] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px]';

function getErrorMessage(error) {
    const response = error.response?.data;
    return (
        response?.detail ||
        response?.message ||
        (typeof response === 'string' ? response : 'No fue posible completar la operación.')
    );
}

function toPayload(form) {
    return {
        name: form.name.trim(),
        description: form.description.trim(),
        leaderId: Number(form.leaderId),
        memberIds: form.memberIds.map(Number),
        grantedRoles: form.grantedRoles,
    };
}

function fetchGroupsAndUsers() {
    return Promise.all([apiClient.get('/work-groups'), apiClient.get('/usuarios')]);
}

export default function GruposTrabajo() {
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingGroup, setEditingGroup] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [busyGroupId, setBusyGroupId] = useState(null);
    const [requestError, setRequestError] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        setRequestError('');
        try {
            const [groupResponse, userResponse] = await fetchGroupsAndUsers();
            setGroups(groupResponse.data);
            setUsers(userResponse.data.filter((user) => user.activo));
        } catch (error) {
            setRequestError(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let isCurrent = true;
        fetchGroupsAndUsers()
            .then(([groupResponse, userResponse]) => {
                if (!isCurrent) return;
                setGroups(groupResponse.data);
                setUsers(userResponse.data.filter((user) => user.activo));
            })
            .catch((error) => {
                if (isCurrent) setRequestError(getErrorMessage(error));
            })
            .finally(() => {
                if (isCurrent) setIsLoading(false);
            });
        return () => {
            isCurrent = false;
        };
    }, []);

    const closeForm = () => {
        setShowForm(false);
        setEditingGroup(null);
        setForm(emptyForm);
    };

    const openCreateForm = () => {
        setEditingGroup(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const openEditForm = (group) => {
        setEditingGroup(group);
        setForm({
            name: group.name,
            description: group.description ?? '',
            leaderId: group.leaderId ? String(group.leaderId) : '',
            memberIds: group.members.map((member) => String(member.id)),
            grantedRoles: group.grantedRoles,
        });
        setShowForm(true);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setRequestError('');
        try {
            const payload = toPayload(form);
            if (editingGroup) {
                await apiClient.put(`/work-groups/${editingGroup.id}`, payload);
            } else {
                await apiClient.post('/work-groups', payload);
            }
            closeForm();
            await loadData();
        } catch (error) {
            setRequestError(getErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (group) => {
        if (!window.confirm(`¿Desactivar el grupo "${group.name}"?`)) return;
        setBusyGroupId(group.id);
        setRequestError('');
        try {
            await apiClient.delete(`/work-groups/${group.id}`);
            setGroups((current) => current.filter((item) => item.id !== group.id));
        } catch (error) {
            setRequestError(getErrorMessage(error));
        } finally {
            setBusyGroupId(null);
        }
    };

    const toggleMember = (userId) => {
        setForm((current) => ({
            ...current,
            memberIds: current.memberIds.includes(userId)
                ? current.memberIds.filter((id) => id !== userId)
                : [...current.memberIds, userId],
        }));
    };

    const toggleRole = (role) => {
        setForm((current) => ({
            ...current,
            grantedRoles: current.grantedRoles.includes(role)
                ? current.grantedRoles.filter((item) => item !== role)
                : [...current.grantedRoles, role],
        }));
    };

    return (
        <section className="space-y-4 sm:space-y-6 min-w-0">
            {/* Header Vista */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-white">Grupos de Trabajo</h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                        Organiza las cuadrillas, sus responsables y permisos por zona.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={loadData}
                        disabled={isLoading}
                        aria-label="Actualizar grupos"
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#36556f] bg-[#102536] text-slate-300 transition-colors hover:bg-[#1b3b52] disabled:opacity-50 shrink-0"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        type="button"
                        onClick={openCreateForm}
                        className="flex-1 sm:flex-initial flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-950/40"
                    >
                        <Plus size={18} />
                        <span>Crear grupo</span>
                    </button>
                </div>
            </div>

            {/* Aviso de Error */}
            {requestError && (
                <div
                    role="alert"
                    className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
                >
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

            {/* Formulario Crear / Editar Grupo */}
            {showForm && (
                <form
                    onSubmit={handleSave}
                    className="space-y-4 sm:space-y-5 rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-6 shadow-xl min-w-0"
                >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <h3 className="text-sm sm:text-base font-semibold text-white">
                            {editingGroup ? 'Editar grupo' : 'Crear grupo'}
                        </h3>
                        <button
                            type="button"
                            onClick={closeForm}
                            aria-label="Cerrar formulario"
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
                        <label className="block text-xs font-medium text-slate-300 space-y-1">
                            <span>Nombre del grupo <span className="text-cyan-400">*</span></span>
                            <input
                                required
                                maxLength={120}
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder="Ej. Zona norte"
                                className={inputClass}
                            />
                        </label>
                        <label className="block text-xs font-medium text-slate-300 space-y-1">
                            <span>Líder <span className="text-cyan-400">*</span></span>
                            <select
                                required
                                value={form.leaderId}
                                onChange={(event) => setForm({ ...form, leaderId: event.target.value })}
                                className={inputClass}
                            >
                                <option value="">Selecciona un líder</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.nombre} · {user.rol}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="block text-xs font-medium text-slate-300 space-y-1">
                        <span>Descripción / zona</span>
                        <textarea
                            maxLength={2000}
                            value={form.description}
                            onChange={(event) => setForm({ ...form, description: event.target.value })}
                            placeholder="Describe la zona o función del grupo"
                            rows={2}
                            className={`${inputClass} min-h-[70px] resize-y`}
                        />
                    </label>

                    {/* Checkbox Miembros */}
                    <fieldset className="space-y-2">
                        <legend className="text-xs font-medium text-slate-300">
                            Miembros (el líder también queda incluido)
                        </legend>
                        {users.length === 0 ? (
                            <p className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                No hay usuarios activos disponibles para asignar.
                            </p>
                        ) : (
                            <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-[#36556f] bg-[#0c1e2c] p-2 sm:p-3 scrollbar-none">
                                {users.map((user) => (
                                    <label
                                        key={user.id}
                                        className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 py-1 hover:bg-white/5 transition-colors cursor-pointer select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.memberIds.includes(String(user.id))}
                                            onChange={() => toggleMember(String(user.id))}
                                            className="h-5 w-5 rounded border-white/20 bg-[#102a3d] text-cyan-500 focus:ring-cyan-400 focus:ring-offset-[#13293a] accent-cyan-500 cursor-pointer shrink-0"
                                        />
                                        <span className="text-xs text-slate-200 min-w-0 truncate">
                                            {user.nombre} <span className="text-slate-400">· {user.rol}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </fieldset>

                    {/* Checkbox Permisos Adicionales */}
                    <fieldset className="space-y-2">
                        <legend className="text-xs font-medium text-slate-300">
                            Permisos adicionales del grupo
                        </legend>
                        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#36556f] bg-[#0c1e2c] p-2 sm:p-3 lg:grid-cols-3">
                            {roles.map((role) => (
                                <label
                                    key={role.value}
                                    className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 py-1 hover:bg-white/5 transition-colors cursor-pointer select-none"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.grantedRoles.includes(role.value)}
                                        onChange={() => toggleRole(role.value)}
                                        className="h-5 w-5 rounded border-white/20 bg-[#102a3d] text-cyan-500 focus:ring-cyan-400 focus:ring-offset-[#13293a] accent-cyan-500 cursor-pointer shrink-0"
                                    />
                                    <span className="text-xs text-slate-200">{role.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {/* Acciones Formulario */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={closeForm}
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-[#36556f] px-4 text-xs font-medium text-slate-300 hover:bg-[#1b3b52] active:bg-[#204560] transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !users.length}
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-950/40"
                        >
                            {isSaving ? 'Guardando…' : 'Guardar grupo'}
                        </button>
                    </div>
                </form>
            )}

            {/* Estado de Carga / Vacío / Lista de Grupos */}
            {isLoading ? (
                <p className="rounded-xl border border-[#2d4055] bg-[#13293a] p-8 text-center text-xs text-slate-400">
                    Cargando grupos guardados…
                </p>
            ) : groups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#36556f] bg-[#13293a] p-8 text-center">
                    <UsersRound size={28} className="mx-auto text-slate-500" />
                    <p className="mt-3 text-sm font-semibold text-white">Todavía no hay grupos de trabajo</p>
                    <p className="mt-1 text-xs text-slate-400">
                        Crea un grupo para asignar líderes, miembros y permisos por zona.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
                    {groups.map((group) => (
                        <article
                            key={group.id}
                            className="flex flex-col justify-between rounded-xl border border-[#2d4055] bg-[#13293a] p-4 shadow-lg min-w-0"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/20">
                                            <UsersRound size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold text-white truncate">
                                                {group.name}
                                            </h3>
                                            {group.description && (
                                                <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
                                                    {group.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                                        Activo
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between gap-2">
                                        <span className="text-slate-400 shrink-0">Líder:</span>
                                        <span className="text-right text-slate-200 font-medium truncate">
                                            {group.leaderName || 'Sin asignar'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <span className="text-slate-400 shrink-0">Miembros:</span>
                                        <span className="text-slate-200 font-medium">{group.members.length}</span>
                                    </div>

                                    <div className="border-t border-[#2d4055] pt-2">
                                        <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-0.5">
                                            Permisos adicionales
                                        </p>
                                        <p className="text-slate-200 leading-relaxed">
                                            {group.grantedRoles.length
                                                ? group.grantedRoles
                                                      .map(
                                                          (role) =>
                                                              roles.find((item) => item.value === role)?.label ?? role
                                                      )
                                                      .join(', ')
                                                : 'Sin permisos adicionales'}
                                        </p>
                                    </div>

                                    <div className="border-t border-[#2d4055] pt-2">
                                        <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-0.5">
                                            Integrantes
                                        </p>
                                        <p className="text-slate-200 leading-relaxed line-clamp-3">
                                            {group.members.map((member) => member.nombre).join(', ') || 'Sin miembros'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones de la Tarjeta */}
                            <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-[#2d4055] pt-3">
                                <button
                                    type="button"
                                    onClick={() => openEditForm(group)}
                                    title="Editar grupo"
                                    aria-label={`Editar ${group.name}`}
                                    className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-cyan-300 active:bg-white/15 transition-colors shrink-0"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(group)}
                                    disabled={busyGroupId === group.id}
                                    title="Desactivar grupo"
                                    aria-label={`Desactivar ${group.name}`}
                                    className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 active:bg-red-500/20 disabled:opacity-50 transition-colors shrink-0"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}