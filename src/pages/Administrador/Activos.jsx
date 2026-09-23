import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Filter, Tractor, Wrench } from 'lucide-react';

const seedAssets = [
	{ id: 1, name: 'Tractor John Deere 6J', type: 'Maquinaria Pesada', location: 'Lote 4', status: 'Crítico' },
	{ id: 2, name: 'Cosechadora Case IH', type: 'Maquinaria Pesada', location: 'Bodega Principal', status: 'Mantenimiento' },
	{ id: 3, name: 'Dron DJI Agras', type: 'Tecnología', location: 'Lote 2', status: 'Operativo' },
	{ id: 4, name: 'Sistema Riego Pivot', type: 'Infraestructura', location: 'Lote 1', status: 'Operativo' },
];

export default function Activos() {
	const [assets, setAssets] = useState(seedAssets);
	const [filter, setFilter] = useState('Todos');
	const visible = assets.filter((asset) => filter === 'Todos' || asset.status === filter);
	const nextStatus = { Operativo: 'Mantenimiento', Mantenimiento: 'Operativo', Crítico: 'Mantenimiento' };
	return <section className="rounded-xl border border-white/10 bg-[#292929] p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[14px] font-semibold text-white">Maquinaria y Activos</h2><p className="mt-1 text-[10px] text-gray-400">Consulta el estado operativo de tus recursos.</p></div><label className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-[11px] text-white"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="bg-transparent outline-none"><option className="text-black">Todos</option><option className="text-black">Operativo</option><option className="text-black">Mantenimiento</option><option className="text-black">Crítico</option></select></label></div><div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{visible.map((asset) => <article key={asset.id} className="flex items-center gap-4 rounded-lg border border-white/5 bg-[#181818] p-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${asset.status === 'Operativo' ? 'bg-green-500/10 text-green-400' : asset.status === 'Mantenimiento' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}><Tractor size={20} /></div><div className="min-w-0 flex-1"><h3 className="truncate text-[12px] font-medium text-white">{asset.name}</h3><p className="text-[10px] text-gray-400">{asset.type} · {asset.location}</p><button type="button" onClick={() => setAssets(assets.map((item) => item.id === asset.id ? { ...item, status: nextStatus[item.status] } : item))} className="mt-2 text-[9px] text-blue-400 hover:text-blue-300">Actualizar estado</button></div><span className={`inline-flex items-center gap-1 text-[9px] ${asset.status === 'Operativo' ? 'text-green-400' : asset.status === 'Mantenimiento' ? 'text-yellow-400' : 'text-red-400'}`}>{asset.status === 'Mantenimiento' ? <Wrench size={10} /> : asset.status === 'Operativo' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}{asset.status}</span></article>)}</div></section>;
}
