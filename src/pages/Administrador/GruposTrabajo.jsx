import { useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Trash2, UsersRound, X } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Badge, Button, Card, EmptyState, PageHeader, Select, Skeleton, StatCard, Textarea } from '../../components/ui';

const roles = [
    { value: 'TECNICO', label: 'Técnico' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'ALMACENISTA', label: 'Almacenista' },
    { value: 'OPERATIVO_CAMPO', label: 'Operativo de campo' },
    { value: 'OPERARIO_CAMPO', label: 'Operario de campo' },
];

function roleLabel(role) {
    const normalizedRole = String(role ?? '').toUpperCase().replace(/^ROLE_/, '');
    return roles.find((item) => item.value === normalizedRole)?.label ?? normalizedRole;
}

function getGroupRoles(group) {
    const memberRoles = (group.members ?? []).flatMap((member) =>
        member.roles?.length ? member.roles : [member.rol],
    );
    return [...new Set([...(group.grantedRoles ?? []), ...memberRoles]
        .filter(Boolean)
        .map((role) => String(role).toUpperCase().replace(/^ROLE_/, '')))];
}

const emptyForm = {
    name: '',
    description: '',
    leaderId: '',
    memberIds: [],
    grantedRoles: [],
};

const inputClass =
    'min-h-11 w-full rounded-xl border border-sand-200 bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-all duration-200 placeholder:text-ink-600 focus-visible:border-gold-600 focus-visible:ring-2 focus-visible:ring-gold-500/25';

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
            <PageHeader
                title="Grupos de Trabajo"
                description="Organiza las cuadrillas, sus responsables y permisos por zona."
                actions={
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={loadData}
                        disabled={isLoading}
                        aria-label="Actualizar grupos"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={openCreateForm}
                        className="flex-1 sm:flex-initial"
                    >
                        <Plus size={18} /> Crear grupo
                    </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Grupos registrados" value={groups.length} icon={<UsersRound size={20} />} accent="forest" />
                <StatCard label="Usuarios disponibles" value={users.length} icon={<UsersRound size={20} />} accent="ocean" />
                <StatCard label="Miembros asignados" value={groups.reduce((total, group) => total + (group.members?.length ?? 0), 0)} icon={<UsersRound size={20} />} accent="gold" />
            </div>

            {/* Aviso de Error */}
            {requestError && (
                <div
                    role="alert"
                    className="flex items-start justify-between gap-3 rounded-xl border border-error/20 bg-error-soft p-3.5 text-sm text-error-text"
                >
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

            {/* Formulario Crear / Editar Grupo */}
            {showForm && (
                <Card
                    as="form"
                    onSubmit={handleSave}
                    className="min-w-0 space-y-4 p-4 sm:space-y-5 sm:p-6"
                >
                    <div className="flex items-center justify-between border-b border-sand-200 pb-3">
                        <h3 className="text-sm font-semibold text-ink-900 sm:text-base">
                            {editingGroup ? 'Editar grupo' : 'Crear grupo'}
                        </h3>
                        <button
                            type="button"
                            onClick={closeForm}
                            aria-label="Cerrar formulario"
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-sand-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-gold-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                        <label className="block space-y-1 text-[13px] font-medium text-ink-600">
                            <span>Nombre del grupo <span className="text-forest-700">*</span></span>
                            <input
                                required
                                maxLength={120}
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder="Ej. Zona norte"
                                className={inputClass}
                            />
                        </label>
                        <label className="block space-y-1 text-[13px] font-medium text-ink-600">
                            <span>Líder <span className="text-forest-700">*</span></span>
                            <Select
                                required
                                value={form.leaderId}
                                onChange={(event) => setForm({ ...form, leaderId: event.target.value })}
                            >
                                <option value="">Selecciona un líder</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.nombre} · {user.rol}
                                    </option>
                                ))}
                            </Select>
                        </label>
                    </div>

                    <label className="block space-y-1 text-[13px] font-medium text-ink-600">
                        <span>Descripción / zona</span>
                        <Textarea
                            maxLength={2000}
                            value={form.description}
                            onChange={(event) => setForm({ ...form, description: event.target.value })}
                            placeholder="Describe la zona o función del grupo"
                            rows={2}
                            className="min-h-[70px] resize-y"
                        />
                    </label>

                    {/* Checkbox Miembros */}
                    <fieldset className="space-y-2">
                        <legend className="text-[13px] font-semibold text-ink-600">
                            Miembros (el líder también queda incluido)
                        </legend>
                        {users.length === 0 ? (
                            <p className="rounded-xl border border-gold-500/20 bg-gold-100 p-3 text-xs text-ink-900">
                                No hay usuarios activos disponibles para asignar.
                            </p>
                        ) : (
                            <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-sand-200 bg-sand-50 p-2 scrollbar-none sm:grid-cols-2 sm:p-3">
                                {users.map((user) => (
                                    <label
                                        key={user.id}
                                        className="flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl px-2 py-1 transition-all duration-200 hover:bg-sand-100"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.memberIds.includes(String(user.id))}
                                            onChange={() => toggleMember(String(user.id))}
                                            className="size-5 shrink-0 cursor-pointer accent-forest-500 focus-visible:outline-2 focus-visible:outline-gold-600"
                                        />
                                        <span className="min-w-0 truncate text-sm text-ink-900">
                                            {user.nombre} <span className="text-ink-600">· {user.rol}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </fieldset>

                    {/* Checkbox Permisos Adicionales */}
                    <fieldset className="space-y-2">
                        <legend className="text-[13px] font-semibold text-ink-600">
                            Permisos adicionales del grupo
                        </legend>
                        <div className="grid grid-cols-1 gap-2 rounded-xl border border-sand-200 bg-sand-50 p-2 sm:grid-cols-2 sm:p-3 lg:grid-cols-3">
                            {roles.map((role) => (
                                <label
                                    key={role.value}
                                    className="flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl px-2 py-1 transition-all duration-200 hover:bg-sand-100"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.grantedRoles.includes(role.value)}
                                        onChange={() => toggleRole(role.value)}
                                        className="size-5 shrink-0 cursor-pointer accent-forest-500 focus-visible:outline-2 focus-visible:outline-gold-600"
                                    />
                                    <span className="text-sm text-ink-900">{role.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {/* Acciones Formulario */}
                    <div className="flex flex-col-reverse justify-end gap-2.5 border-t border-sand-200 pt-4 sm:flex-row sm:gap-3">
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
                            disabled={isSaving || !users.length}
                            className="w-full sm:w-auto"
                        >
                            {isSaving ? 'Guardando…' : 'Guardar grupo'}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Estado de Carga / Vacío / Lista de Grupos */}
            {isLoading ? (
                <Skeleton variant="rect" className="h-52 rounded-2xl" label="Cargando grupos guardados" />
            ) : groups.length === 0 ? (
                <EmptyState
                    icon={<UsersRound size={24} />}
                    title="Todavía no hay grupos de trabajo"
                    description="Crea un grupo para asignar líderes, miembros y permisos por zona."
                />
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                    {groups.map((group) => (
                        <Card
                            as="article"
                            key={group.id}
                            interactive
                            className="flex min-w-0 flex-col justify-between p-4"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2 border-b border-sand-200 pb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-ocean-300/40 bg-info-soft text-ocean-700">
                                            <UsersRound size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-sm font-semibold text-ink-900">
                                                {group.name}
                                            </h3>
                                            {group.description && (
                                                <p className="mt-0.5 line-clamp-2 text-xs text-ink-600">
                                                    {group.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Badge variant="success" size="sm" className="shrink-0 uppercase tracking-wider">Activo</Badge>
                                </div>

                                <div className="border-t border-sand-200 pt-3">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                                        Roles asociados a la zona
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {getGroupRoles(group).length ? (
                                            getGroupRoles(group).map((role) => (
                                                <Badge
                                                    key={`${group.id}-${role}`}
                                                    variant="info"
                                                    size="sm"
                                                >
                                                    {roleLabel(role)}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-ink-600">Sin roles asociados</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Acciones de la Tarjeta */}
                            <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-sand-200 pt-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditForm(group)}
                                    title="Editar grupo"
                                    aria-label={`Editar ${group.name}`}
                                >
                                    <Pencil size={18} />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(group)}
                                    disabled={busyGroupId === group.id}
                                    title="Desactivar grupo"
                                    aria-label={`Desactivar ${group.name}`}
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}