import { useMemo, useState } from 'react';
import { ArrowDownLeft, PackagePlus, Plus, Search } from 'lucide-react';

const seedEntries = [
  { id: 'ENT-841', product: 'Pintura Acrílica Mate Azul', supplier: 'Pintuco', quantity: 450, unit: 'uds', date: '24/10 09:30', status: 'Completado' },
  { id: 'ENT-840', product: 'Cinta Adhesiva Alta Tracción', supplier: '3M Colombia', quantity: 1200, unit: 'uds', date: '24/10 08:45', status: 'Completado' },
  { id: 'ENT-839', product: 'Fertilizante NPK', supplier: 'AgriPro', quantity: 300, unit: 'kg', date: '23/10 16:20', status: 'Completado' },
];

export default function Entradas({ variant = 'dark' }) {
  const dark = variant === 'dark';
  const [entries, setEntries] = useState(seedEntries);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ product: '', supplier: '', quantity: '', unit: 'uds' });
  const [showForm, setShowForm] = useState(false);

  const visible = useMemo(
    () => entries.filter((entry) => `${entry.product} ${entry.supplier} ${entry.id}`.toLowerCase().includes(query.toLowerCase())),
    [entries, query]
  );

  const saveEntry = (event) => {
    event.preventDefault();
    if (!form.product.trim() || !form.quantity) return;

    setEntries([
      {
        id: `ENT-${Date.now().toString().slice(-3)}`,
        product: form.product,
        supplier: form.supplier || 'Proveedor externo',
        quantity: Number(form.quantity),
        unit: form.unit,
        date: 'Ahora',
        status: 'Completado',
      },
      ...entries,
    ]);

    setForm({ product: '', supplier: '', quantity: '', unit: 'uds' });
    setShowForm(false);
  };

  const panel = dark ? 'border-white/10 bg-[#292929]' : 'border-[#dfe6ed] bg-white';
  const text = dark ? 'text-white' : 'text-[#182235]';
  const muted = dark ? 'text-gray-400' : 'text-[#718096]';
  const field = dark ? 'border-white/10 bg-[#181818] text-white placeholder:text-gray-500' : 'border-[#dfe6ed] bg-white text-[#182235] placeholder:text-[#9aa7b8]';

  return (
    <section className={`rounded-xl border p-5 shadow-sm ${panel}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-[14px] font-semibold ${text}`}>Entradas de almacén</h2>
          <p className={`mt-1 text-[10px] ${muted}`}>Registra las recepciones de productos y suministros.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className={`relative flex items-center rounded-md border px-3 py-2 ${dark ? 'border-white/10 bg-[#181818]' : 'border-[#dfe6ed] bg-[#f8fafc]'}`}>
            <Search size={14} className={muted} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar entrada..."
              className={`ml-2 w-36 bg-transparent text-[11px] outline-none ${dark ? 'text-white placeholder:text-gray-500' : 'text-[#334155] placeholder:text-[#9aa7b8]'}`}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-orange-600"
          >
            <Plus size={13} />
            Registrar entrada
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={saveEntry} className={`mb-5 grid gap-3 rounded-lg border p-4 sm:grid-cols-[1.5fr_1fr_100px_90px_auto] ${dark ? 'border-white/10 bg-[#1b2330]' : 'border-[#dfe6ed] bg-[#f8fafc]'}`}>
          <input
            value={form.product}
            onChange={(event) => setForm({ ...form, product: event.target.value })}
            placeholder="Producto"
            className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`}
          />
          <input
            value={form.supplier}
            onChange={(event) => setForm({ ...form, supplier: event.target.value })}
            placeholder="Proveedor"
            className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`}
          />
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            placeholder="Cantidad"
            className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`}
          />
          <select
            value={form.unit}
            onChange={(event) => setForm({ ...form, unit: event.target.value })}
            className={`rounded border px-2 py-2 text-[10px] outline-none ${field}`}
          >
            <option>uds</option>
            <option>kg</option>
            <option>L</option>
            <option>rollos</option>
          </select>
          <button type="submit" className="rounded bg-green-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-green-700">
            Guardar
          </button>
        </form>
      )}

      <div className={`overflow-x-auto rounded-lg border ${dark ? 'border-white/10 bg-[#1b2330]' : 'border-[#dfe6ed] bg-white'}`}>
        <table className="w-full min-w-[700px] text-left text-[10px]">
          <thead className={`border-b ${dark ? 'border-white/10 bg-[#1b2330] text-gray-400' : 'border-[#e8edf2] bg-[#f8fafc] text-[#607086]'}`}>
            <tr>
              <th className="px-3 py-3 font-medium">Referencia</th>
              <th className="px-3 py-3 font-medium">Producto</th>
              <th className="px-3 py-3 font-medium">Proveedor</th>
              <th className="px-3 py-3 text-right font-medium">Cantidad</th>
              <th className="px-3 py-3 text-center font-medium">Fecha</th>
              <th className="px-3 py-3 text-center font-medium">Estado</th>
            </tr>
          </thead>

          <tbody className={dark ? 'divide-y divide-white/5' : 'divide-y divide-[#e8edf2]'}>
            {visible.map((entry) => (
              <tr key={entry.id} className={dark ? 'hover:bg-white/5' : 'hover:bg-[#f8fafc]'}>
                <td className={`px-3 py-3 font-semibold ${text}`}>
                  <span className="inline-flex items-center gap-1">
                    <ArrowDownLeft size={12} className="text-green-500" />
                    {entry.id}
                  </span>
                </td>
                <td className={`px-3 py-3 ${text}`}>{entry.product}</td>
                <td className={`px-3 py-3 ${muted}`}>{entry.supplier}</td>
                <td className={`px-3 py-3 text-right ${text}`}>{entry.quantity} {entry.unit}</td>
                <td className={`px-3 py-3 text-center ${muted}`}>{entry.date}</td>
                <td className="px-3 py-3 text-center">
                  <span className="rounded bg-emerald-500/15 px-2 py-1 text-[9px] font-semibold text-emerald-400">
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
