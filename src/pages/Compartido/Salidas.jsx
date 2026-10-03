import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { getInventoryItems, getInventoryMovements, registerInventoryMovement } from '../../services/inventoryService';

function getErrorMessage(error) {
  return error.response?.data?.detail || error.response?.data?.message || error.message || 'No se pudo completar la operación.';
}

export default function Salidas({ variant = 'dark' }) {
  const dark = variant === 'dark';
  const [items, setItems] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ itemId: '', quantity: '', reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [inventory, movements] = await Promise.all([getInventoryItems(), getInventoryMovements()]);
      setItems(inventory);
      setOutputs(movements.filter((movement) => movement.tipo === 'salida'));
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getInventoryItems(), getInventoryMovements()])
      .then(([inventory, movements]) => {
        if (!active) return;
        setItems(inventory);
        setOutputs(movements.filter((movement) => movement.tipo === 'salida'));
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      });
    return () => { active = false; };
  }, []);

  const visible = useMemo(
    () => outputs.filter((output) => `${output.itemName} ${output.motivo ?? ''} ${output.id}`.toLowerCase().includes(query.toLowerCase())),
    [outputs, query],
  );
  const panel = dark ? 'border-white/10 bg-[#292929]' : 'border-[#dfe6ed] bg-white';
  const text = dark ? 'text-white' : 'text-[#182235]';
  const muted = dark ? 'text-gray-400' : 'text-[#718096]';
  const field = dark ? 'border-white/10 bg-[#181818] text-white' : 'border-[#dfe6ed] bg-white text-[#182235]';

  const saveOutput = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await registerInventoryMovement(Number(form.itemId), {
        tipo: 'salida',
        cantidad: Number(form.quantity),
        motivo: form.reason,
      });
      setForm({ itemId: '', quantity: '', reason: '' });
      setShowForm(false);
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`rounded-xl border p-5 shadow-sm ${panel}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className={`text-[14px] font-semibold ${text}`}>Salidas de almacén</h2><p className={`mt-1 text-[10px] ${muted}`}>Registra despachos y descuenta existencias automáticamente.</p></div>
        <div className="flex items-center gap-2">
          <label className={`relative flex items-center rounded-md border px-3 py-2 ${dark ? 'border-white/10 bg-[#181818]' : 'border-[#dfe6ed] bg-[#f8fafc]'}`}><Search size={14} className={muted} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar salida..." className={`ml-2 w-36 bg-transparent text-[11px] outline-none ${dark ? 'text-white placeholder:text-gray-500' : 'text-[#334155]'}`} /></label>
          <button type="button" onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-blue-700"><Plus size={13} /> Registrar salida</button>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}
      {showForm && (
        <form onSubmit={saveOutput} className={`mb-5 grid gap-3 rounded-lg border p-4 sm:grid-cols-[1.5fr_100px_1fr_auto] ${dark ? 'border-white/10 bg-[#1b2330]' : 'border-[#dfe6ed] bg-[#f8fafc]'}`}>
          <select required value={form.itemId} onChange={(event) => setForm({ ...form, itemId: event.target.value })} className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`}><option value="">Selecciona un ítem</option>{items.map((item) => <option key={item.id} value={item.id}>{item.item} ({item.stock} {item.unit})</option>)}</select>
          <input required type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="Cantidad" className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`} />
          <input maxLength="2000" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Destino / motivo" className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`} />
          <button disabled={saving || items.length === 0} type="submit" className="rounded bg-green-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-green-700 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
          {items.length === 0 && <p className={`text-xs sm:col-span-4 ${muted}`}>Primero registra el producto con una entrada desde Entradas.</p>}
        </form>
      )}
      <div className={`overflow-x-auto rounded-lg border ${dark ? 'border-white/10 bg-[#1b2330]' : 'border-[#dfe6ed] bg-white'}`}>
        <table className="w-full min-w-[650px] text-left text-[10px]">
          <thead className={`border-b ${dark ? 'border-white/10 bg-[#1b2330] text-gray-400' : 'border-[#e8edf2] bg-[#f8fafc] text-[#607086]'}`}><tr><th className="px-3 py-3 font-medium">Referencia</th><th className="px-3 py-3 font-medium">Producto</th><th className="px-3 py-3 font-medium">Motivo / destino</th><th className="px-3 py-3 text-right font-medium">Cantidad</th><th className="px-3 py-3 text-center font-medium">Fecha</th></tr></thead>
          <tbody className={dark ? 'divide-y divide-white/5' : 'divide-y divide-[#e8edf2]'}>
            {visible.map((output) => <tr key={output.id} className={dark ? 'hover:bg-white/5' : 'hover:bg-[#f8fafc]'}><td className={`px-3 py-3 font-semibold ${text}`}><span className="inline-flex items-center gap-1"><ArrowUpRight size={12} className="text-blue-500" />SAL-{output.id}</span></td><td className={`px-3 py-3 ${text}`}>{output.itemName}</td><td className={`px-3 py-3 ${muted}`}>{output.motivo || '—'}</td><td className={`px-3 py-3 text-right ${text}`}>{output.cantidad}</td><td className={`px-3 py-3 text-center ${muted}`}>{new Date(output.fecha).toLocaleString()}</td></tr>)}
            {visible.length === 0 && <tr><td colSpan="5" className={`px-3 py-8 text-center ${muted}`}>No hay salidas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
