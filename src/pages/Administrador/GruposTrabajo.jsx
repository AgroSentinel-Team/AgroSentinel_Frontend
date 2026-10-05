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

const inputClass = 'w-full rounded-md border border-[#36556f] bg-[#102a3d] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400';

function getErrorMessage(error) {
	const response = error.response?.data;
	return response?.detail || response?.message || (typeof response === 'string' ? response : 'No fue posible completar la operación.');
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
	return Promise.all([
		apiClient.get('/work-groups'),
		apiClient.get('/usuarios'),
	]);
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
		return () => { isCurrent = false; };
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
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-[14px] font-semibold text-white">Grupos de Trabajo</h2>
					<p className="mt-1 text-[11px] text-slate-400">Organiza las cuadrillas, sus responsables y permisos por zona.</p>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={loadData}
						disabled={isLoading}
						aria-label="Actualizar grupos"
						className="rounded-md border border-[#36556f] p-2 text-slate-300 transition hover:bg-[#1b3b52] disabled:opacity-50"
					>
						<RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
					</button>
					<button
						type="button"
						onClick={openCreateForm}
						className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-blue-500"
					>
						<Plus size={14} /> Crear grupo
					</button>
				</div>
			</div>

			{requestError && (
				<div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
					<span>{requestError}</span>
					<button type="button" onClick={() => setRequestError('')} aria-label="Cerrar aviso"><X size={15} /></button>
				</div>
			)}

			{showForm && (
				<form onSubmit={handleSave} className="space-y-4 rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-white">{editingGroup ? 'Editar grupo' : 'Crear grupo'}</h3>
						<button type="button" onClick={closeForm} aria-label="Cerrar formulario" className="text-slate-400 hover:text-white"><X size={16} /></button>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<label className="space-y-1 text-xs text-slate-300">
							<span>Nombre del grupo</span>
							<input
								required
								maxLength={120}
								value={form.name}
								onChange={(event) => setForm({ ...form, name: event.target.value })}
								placeholder="Ej. Zona norte"
								className={inputClass}
							/>
						</label>
						<label className="space-y-1 text-xs text-slate-300">
							<span>Líder</span>
							<select
								required
								value={form.leaderId}
								onChange={(event) => setForm({ ...form, leaderId: event.target.value })}
								className={inputClass}
							>
								<option value="">Selecciona un líder</option>
								{users.map((user) => <option key={user.id} value={user.id}>{user.nombre} · {user.rol}</option>)}
							</select>
						</label>
					</div>

					<label className="block space-y-1 text-xs text-slate-300">
						<span>Descripción / zona</span>
						<textarea
							maxLength={2000}
							value={form.description}
							onChange={(event) => setForm({ ...form, description: event.target.value })}
							placeholder="Describe la zona o función del grupo"
							rows={2}
							className={inputClass}
						/>
					</label>

					<fieldset className="space-y-2">
						<legend className="text-xs font-medium text-slate-300">Miembros (el líder también queda incluido)</legend>
						{users.length === 0 ? (
							<p className="text-xs text-amber-300">No hay usuarios activos disponibles para asignar.</p>
						) : (
							<div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border border-[#36556f] p-3 sm:grid-cols-2">
								{users.map((user) => (
									<label key={user.id} className="flex items-center gap-2 text-xs text-slate-200">
										<input
											type="checkbox"
											checked={form.memberIds.includes(String(user.id))}
											onChange={() => toggleMember(String(user.id))}
											className="accent-cyan-400"
										/>
										<span>{user.nombre}<span className="ml-1 text-slate-400">· {user.rol}</span></span>
									</label>
								))}
							</div>
						)}
					</fieldset>

					<fieldset className="space-y-2">
						<legend className="text-xs font-medium text-slate-300">Permisos adicionales del grupo</legend>
						<div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-[#36556f] p-3">
							{roles.map((role) => (
								<label key={role.value} className="flex items-center gap-2 text-xs text-slate-200">
									<input
										type="checkbox"
										checked={form.grantedRoles.includes(role.value)}
										onChange={() => toggleRole(role.value)}
										className="accent-cyan-400"
									/>
									{role.label}
								</label>
							))}
						</div>
					</fieldset>

					<div className="flex justify-end gap-2">
						<button type="button" onClick={closeForm} className="rounded-md border border-[#36556f] px-3 py-2 text-xs text-slate-300 hover:bg-[#1b3b52]">Cancelar</button>
						<button type="submit" disabled={isSaving || !users.length} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
							{isSaving ? 'Guardando…' : 'Guardar grupo'}
						</button>
					</div>
				</form>
			)}

			{isLoading ? (
				<p className="rounded-xl border border-[#2d4055] bg-[#13293a] p-6 text-center text-sm text-slate-400">Cargando grupos guardados…</p>
			) : groups.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[#36556f] bg-[#13293a] p-8 text-center">
					<UsersRound size={24} className="mx-auto text-slate-500" />
					<p className="mt-3 text-sm font-medium text-white">Todavía no hay grupos de trabajo</p>
					<p className="mt-1 text-xs text-slate-400">Crea un grupo para asignar líderes, miembros y permisos por zona.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{groups.map((group) => (
						<article key={group.id} className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
							<div className="mb-3 flex items-start justify-between gap-3">
								<div className="flex items-center gap-2">
									<div className="rounded-md bg-blue-500/15 p-2 text-blue-300"><UsersRound size={16} /></div>
									<div>
										<h3 className="text-[13px] font-semibold text-white">{group.name}</h3>
										{group.description && <p className="mt-0.5 text-[11px] text-slate-400">{group.description}</p>}
									</div>
								</div>
								<span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] uppercase text-green-400">Activo</span>
							</div>
							<div className="space-y-2 text-[11px]">
								<div className="flex justify-between gap-2"><span className="text-slate-400">Líder</span><span className="text-right text-slate-200">{group.leaderName || 'Sin asignar'}</span></div>
								<div className="flex justify-between"><span className="text-slate-400">Miembros</span><span className="text-slate-200">{group.members.length}</span></div>
								<div className="border-t border-[#2d4055] pt-2">
									<p className="mb-1 text-slate-400">Permisos</p>
									<p className="text-slate-200">{group.grantedRoles.length ? group.grantedRoles.map((role) => roles.find((item) => item.value === role)?.label ?? role).join(', ') : 'Sin permisos adicionales'}</p>
								</div>
								<div className="border-t border-[#2d4055] pt-2">
									<p className="mb-1 text-slate-400">Integrantes</p>
									<p className="text-slate-200">{group.members.map((member) => member.nombre).join(', ') || 'Sin miembros'}</p>
								</div>
							</div>
							<div className="mt-4 flex justify-end gap-3 border-t border-[#2d4055] pt-3">
								<button type="button" onClick={() => openEditForm(group)} title="Editar grupo" aria-label={`Editar ${group.name}`} className="text-slate-400 hover:text-cyan-300"><Pencil size={14} /></button>
								<button type="button" onClick={() => handleDelete(group)} disabled={busyGroupId === group.id} title="Desactivar grupo" aria-label={`Desactivar ${group.name}`} className="text-slate-400 hover:text-red-400 disabled:opacity-50"><Trash2 size={14} /></button>
							</div>
						</article>
					))}
				</div>
			)}
		</section>
	);
}
