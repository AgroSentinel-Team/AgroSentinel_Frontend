import { useState } from 'react';
import { MoreVertical, Plus, Trash2, UsersRound } from 'lucide-react';

const seedGroups = [
	{ id: 1, name: 'Fumigación Sur', leader: 'Héctor Ortiz', members: 8, status: 'Activo' },
	{ id: 2, name: 'Cosecha Lote A', leader: 'Ana Martínez', members: 15, status: 'Activo' },
	{ id: 3, name: 'Mantenimiento', leader: 'Juan Pérez', members: 4, status: 'Ocupado' },
	{ id: 4, name: 'Bodega y Logística', leader: 'María Gómez', members: 6, status: 'Activo' },
];

export default function GruposTrabajo() {
	const [groups, setGroups] = useState(seedGroups);
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState({ name: '', leader: '', members: 1 });
	const saveGroup = (event) => { event.preventDefault(); if (!form.name.trim() || !form.leader.trim()) return; setGroups([...groups, { ...form, id: Date.now(), members: Number(form.members), status: 'Activo' }]); setForm({ name: '', leader: '', members: 1 }); setShowForm(false); };

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-[14px] font-semibold text-white">Grupos de Trabajo</h2>
					<p className="mt-1 text-[11px] text-slate-400">Organiza las cuadrillas y sus responsables.</p>
				</div>
				<button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-blue-500">
					<Plus size={14} /> Crear grupo
				</button>
			</div>

			{showForm && (
				<form onSubmit={saveGroup} className="grid gap-3 rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:grid-cols-[1.4fr_1fr_100px_auto]">
					<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre del grupo" className="rounded-md border border-[#36556f] bg-[#102a3d] px-3 py-2 text-[11px] text-white outline-none placeholder:text-slate-400 focus:border-cyan-400" />
					<input value={form.leader} onChange={(event) => setForm({ ...form, leader: event.target.value })} placeholder="Líder" className="rounded-md border border-[#36556f] bg-[#102a3d] px-3 py-2 text-[11px] text-white outline-none placeholder:text-slate-400 focus:border-cyan-400" />
					<input type="number" min="1" value={form.members} onChange={(event) => setForm({ ...form, members: event.target.value })} className="rounded-md border border-[#36556f] bg-[#102a3d] px-3 py-2 text-[11px] text-white outline-none focus:border-cyan-400" />
					<button className="rounded-md bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-500">Guardar</button>
				</form>
			)}

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{groups.map((group) => (
					<article key={group.id} className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
						<div className="mb-3 flex items-start justify-between">
							<div className="flex items-center gap-2">
								<div className="rounded-md bg-blue-500/15 p-2 text-blue-300"><UsersRound size={16} /></div>
								<h3 className="text-[13px] font-semibold text-white">{group.name}</h3>
							</div>
							<span className={`rounded px-1.5 py-0.5 text-[11px] uppercase ${group.status === 'Activo' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{group.status}</span>
						</div>
						<div className="space-y-2 text-[11px]">
							<div className="flex justify-between"><span className="text-slate-400">Líder</span><span className="text-slate-200">{group.leader}</span></div>
							<div className="flex justify-between"><span className="text-slate-400">Miembros</span><span className="text-slate-200">{group.members} operarios</span></div>
						</div>
						<div className="mt-4 flex justify-between border-t border-[#2d4055] pt-3">
							<button type="button" onClick={() => setGroups(groups.map((item) => item.id === group.id ? { ...item, status: item.status === 'Activo' ? 'Ocupado' : 'Activo' } : item))} className="text-[11px] text-blue-400 hover:text-blue-300">Cambiar estado</button>
							<div className="flex gap-3">
								<button type="button" title="Eliminar grupo" onClick={() => setGroups(groups.filter((item) => item.id !== group.id))} className="text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
								<MoreVertical size={14} className="text-slate-500" />
							</div>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
