import { useMemo, useState } from 'react';
import { Minus, Package, Plus, Search } from 'lucide-react';

const seedInventory = [
	{ id: 1, item: 'Fertilizante NPK', category: 'Insumos', stock: 450, unit: 'kg', minimum: 100 },
	{ id: 2, item: 'Filtro Aceite Tractor', category: 'Repuestos', stock: 2, unit: 'und', minimum: 5 },
	{ id: 3, item: 'Semillas Maíz Híbrido', category: 'Insumos', stock: 1200, unit: 'kg', minimum: 300 },
	{ id: 4, item: 'Herbicida Glifosato', category: 'Insumos', stock: 15, unit: 'L', minimum: 20 },
];

export default function Inventario() {
	const [inventory, setInventory] = useState(seedInventory);
	const [query, setQuery] = useState('');
	const visible = useMemo(() => inventory.filter((item) => `${item.item} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [inventory, query]);
	const adjustStock = (id, amount) => setInventory(inventory.map((item) => item.id === id ? { ...item, stock: Math.max(0, item.stock + amount) } : item));
	return <section className="rounded-xl border border-white/10 bg-[#292929] p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[14px] font-semibold text-white">Control de Inventario</h2><p className="mt-1 text-[10px] text-gray-400">Actualiza existencias y detecta faltantes a tiempo.</p></div><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar insumo..." className="rounded-md border border-white/10 bg-[#181818] py-2 pl-8 pr-3 text-[11px] text-white outline-none focus:border-blue-500" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-[11px]"><thead className="border-b border-white/10 text-gray-400"><tr><th className="pb-3 font-medium">Ítem</th><th className="pb-3 font-medium">Categoría</th><th className="pb-3 text-right font-medium">Stock actual</th><th className="pb-3 text-center font-medium">Estado</th><th className="pb-3 text-right font-medium">Ajustar</th></tr></thead><tbody className="divide-y divide-white/5">{visible.map((item) => { const low = item.stock < item.minimum; return <tr key={item.id} className="hover:bg-white/5"><td className="py-3 font-medium text-white"><span className="mr-2 inline-flex rounded bg-blue-500/10 p-1 text-blue-400"><Package size={12} /></span>{item.item}</td><td className="py-3 text-gray-400">{item.category}</td><td className="py-3 text-right text-gray-200">{item.stock} {item.unit}</td><td className="py-3 text-center"><span className={`rounded px-2 py-0.5 text-[9px] ${low ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{low ? 'Bajo stock' : 'Suficiente'}</span></td><td className="py-3 text-right"><button type="button" title="Disminuir" onClick={() => adjustStock(item.id, -1)} className="mr-2 rounded bg-white/5 p-1 text-gray-300 hover:bg-white/10"><Minus size={12} /></button><button type="button" title="Aumentar" onClick={() => adjustStock(item.id, 1)} className="rounded bg-white/5 p-1 text-gray-300 hover:bg-white/10"><Plus size={12} /></button></td></tr>; })}</tbody></table></div></section>;
}
