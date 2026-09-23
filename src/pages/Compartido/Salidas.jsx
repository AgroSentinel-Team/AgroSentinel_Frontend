import { useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, Plus, Search } from 'lucide-react';

const seedOutputs = [
  { id: 'SAL-339', product: 'Rodillo Profesional Fibra 9"', destination: 'Obra Norte', quantity: 120, unit: 'uds', date: '24/10 09:12', status: 'En Proceso' },
  { id: 'SAL-338', product: 'Disolvente Industrial Standard', destination: 'Planta 2', quantity: 30, unit: 'uds', date: '23/10 17:10', status: 'Demorado' },
  { id: 'SAL-337', product: 'Brocha Cerdas Naturales 3"', destination: 'Campo Sur', quantity: 80, unit: 'uds', date: '23/10 13:40', status: 'Completado' },
];

export default function Salidas({ variant = 'dark' }) {
  const dark = variant === 'dark';
  const [outputs, setOutputs] = useState(seedOutputs);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product: '', destination: '', quantity: '', unit: 'uds' });

  const visible = useMemo(
    () => outputs.filter((output) => `${output.product} ${output.destination} ${output.id}`.toLowerCase().includes(query.toLowerCase())),
    [outputs, query]
  );

  const saveOutput = (event) => {
    event.preventDefault();
    if (!form.product.trim() || !form.quantity) return;

    setOutputs([
      {
        id: `SAL-${Date.now().toString().slice(-3)}`,
        product: form.product,
        destination: form.destination || 'Destino no indicado',
        quantity: Number(form.quantity),
        unit: form.unit,
        date: 'Ahora',
        status: 'En Proceso',
      },
      ...outputs,
    ]);

    setForm({ product: '', destination: '', quantity: '', unit: 'uds' });
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
          <h2 className={`text-[14px] font-semibold ${text}`}>Salidas de almacén</h2>
          <p className={`mt-1 text-[10px] ${muted}`}>Prepara y controla los despachos solicitados.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className={`relative flex items-center rounded-md border px-3 py-2 ${dark ? 'border-white/10 bg-[#181818]' : 'border-[#dfe6ed] bg-[#f8fafc]'}`}>
            <Search size={14} className={muted} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar salida..."
              className={`ml-2 w-36 bg-transparent text-[11px] outline-none ${dark ? 'text-white placeholder:text-gray-500' : 'text-[#334155] placeholder:text-[#9aa7b8]'}`}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={13} />
            Registrar salida
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={saveOutput} className={`mb-5 grid gap-3 rounded-lg border p-4 sm:grid-cols-[1.5fr_1fr_100px_90px_auto] ${dark ? 'border-white/10 bg-[#1b2330]' : 'border-[#dfe6ed] bg-[#f8fafc]'}`}>
          <input
            value={form.product}
            onChange={(event) => setForm({ ...form, product: event.target.value })}
            placeholder="Producto"
            className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`}
          />
          <input
            value={form.destination}
            onChange={(event) => setForm({ ...form, destination: event.target.value })}
            placeholder="Destino / solicitante"
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
              <th className="px-3 py-3 font-medium">Destino</th>
              <th className="px-3 py-3 text-right font-medium">Cantidad</th>
              <th className="px-3 py-3 text-center font-medium">Fecha</th>
              <th className="px-3 py-3 text-center font-medium">Estado</th>
            </tr>
          </thead>

          <tbody className={dark ? 'divide-y divide-white/5' : 'divide-y divide-[#e8edf2]'}>
            {visible.map((output) => (
              <tr key={output.id} className={dark ? 'hover:bg-white/5' : 'hover:bg-[#f8fafc]'}>
                <td className={`px-3 py-3 font-semibold ${text}`}>
                  <span className="inline-flex items-center gap-1">
                    <ArrowUpRight size={12} className="text-blue-500" />
                    {output.id}
                  </span>
                </td>
                <td className={`px-3 py-3 ${text}`}>{output.product}</td>
                <td className={`px-3 py-3 ${muted}`}>{output.destination}</td>
                <td className={`px-3 py-3 text-right ${text}`}>{output.quantity} {output.unit}</td>
                <td className={`px-3 py-3 text-center ${muted}`}>{output.date}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`rounded px-2 py-1 text-[9px] font-semibold ${
                    output.status === 'Completado'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : output.status === 'Demorado'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-blue-500/15 text-blue-300'
                  }`}>
                    {output.status}
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
