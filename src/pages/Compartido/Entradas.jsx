import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, Plus, Search } from 'lucide-react';
import { getInventoryItems, getInventoryMovements, registerInitialInventoryEntry, registerInventoryMovement } from '../../services/inventoryService';

function getErrorMessage(error) {
  return error.response?.data?.detail || error.response?.data?.message || error.message || 'No se pudo completar la operación.';
}

export default function Entradas({ variant = 'dark' }) {
  const dark = variant === 'dark';
  const [items, setItems] = useState([]);
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    itemId: '',
    quantity: '',
    reason: '',
    item: '',
    category: '',
    unit: 'und',
    minimum: '0',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [inventory, movements] = await Promise.all([getInventoryItems(), getInventoryMovements()]);
      setItems(inventory);
      setEntries(movements.filter((movement) => movement.tipo === 'entrada'));
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
        setEntries(movements.filter((movement) => movement.tipo === 'entrada'));
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      });
    return () => { active = false; };
  }, []);

  const visible = useMemo(
    () => entries.filter((entry) => `${entry.itemName} ${entry.motivo ?? ''} ${entry.id}`.toLowerCase().includes(query.toLowerCase())),
    [entries, query],
  );
  const panel = dark ? 'border-[#2d4055] bg-[#13293a]' : 'border-[#dfe6ed] bg-white';
  const text = dark ? 'text-white' : 'text-[#182235]';
  const muted = dark ? 'text-gray-400' : 'text-[#718096]';
  const field = dark ? 'border-[#36556f] bg-[#102a3d] text-white focus:border-cyan-400' : 'border-[#dfe6ed] bg-white text-[#182235]';

  const saveEntry = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (form.itemId === '__new__') {
        await registerInitialInventoryEntry({
          item: form.item,
          category: form.category,
          unit: form.unit,
          minimum: Number(form.minimum),
          cantidad: Number(form.quantity),
          motivo: form.reason,
        });
      } else {
        await registerInventoryMovement(Number(form.itemId), {
          tipo: 'entrada',
          cantidad: Number(form.quantity),
          motivo: form.reason,
        });
      }
      setForm({ itemId: '', quantity: '', reason: '', item: '', category: '', unit: 'und', minimum: '0' });
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
        <div><h2 className={`text-[14px] font-semibold ${text}`}>Entradas de almacén</h2><p className={`mt-1 text-[10px] ${muted}`}>Registra recepciones y actualiza el stock del inventario.</p></div>
        <div className="flex items-center gap-2">
          <label className={`relative flex items-center rounded-md border px-3 py-2 ${dark ? 'border-[#36556f] bg-[#102a3d]' : 'border-[#dfe6ed] bg-[#f8fafc]'}`}><Search size={14} className={muted} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar entrada..." className={`ml-2 w-36 bg-transparent text-[11px] outline-none ${dark ? 'text-white placeholder:text-slate-400' : 'text-[#334155]'}`} /></label>
          <button type="button" onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-blue-700"><Plus size={13} /> Registrar entrada</button>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}
      {showForm && (
        <form onSubmit={saveEntry} className={`mb-5 grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_100px_1fr_auto] ${dark ? 'border-[#2d4055] bg-[#102a3d]' : 'border-[#dfe6ed] bg-[#f8fafc]'}`}>
          <select required value={form.itemId} onChange={(event) => setForm({ ...form, itemId: event.target.value })} className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`}>
            <option value="">Selecciona un ítem</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.item} ({item.stock} {item.unit})</option>)}
            <option value="__new__">+ Crear producto y registrar primera entrada</option>
          </select>
          {form.itemId === '__new__' && (
            <>
              <input required maxLength="160" value={form.item} onChange={(event) => setForm({ ...form, item: event.target.value })} placeholder="Nombre del producto" className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`} />
              <input required maxLength="80" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Categoría" className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`} />
              <input required maxLength="30" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="Unidad (und, kg, L)" className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`} />
              <input required type="number" min="0" step="0.001" value={form.minimum} onChange={(event) => setForm({ ...form, minimum: event.target.value })} placeholder="Stock mínimo" className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`} />
            </>
          )}
          <input required type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="Cantidad de entrada" className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`} />
          <input maxLength="2000" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Proveedor / motivo" className={`rounded border px-3 py-2 text-[10px] outline-none ${field}`} />
          <button disabled={saving} type="submit" className="rounded bg-green-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-green-700 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar entrada'}</button>
        </form>
      )}
      <div className={`overflow-x-auto rounded-lg border ${dark ? 'border-[#2d4055] bg-[#102a3d]' : 'border-[#dfe6ed] bg-white'}`}>
        <table className="w-full min-w-[650px] text-left text-[10px]">
          <thead className={`border-b ${dark ? 'border-[#2d4055] bg-[#102a3d] text-slate-400' : 'border-[#e8edf2] bg-[#f8fafc] text-[#607086]'}`}><tr><th className="px-3 py-3 font-medium">Referencia</th><th className="px-3 py-3 font-medium">Producto</th><th className="px-3 py-3 font-medium">Motivo / proveedor</th><th className="px-3 py-3 text-right font-medium">Cantidad</th><th className="px-3 py-3 text-center font-medium">Fecha</th></tr></thead>
          <tbody className={dark ? 'divide-y divide-white/5' : 'divide-y divide-[#e8edf2]'}>
            {visible.map((entry) => <tr key={entry.id} className={dark ? 'hover:bg-white/5' : 'hover:bg-[#f8fafc]'}><td className={`px-3 py-3 font-semibold ${text}`}><span className="inline-flex items-center gap-1"><ArrowDownLeft size={12} className="text-green-500" />ENT-{entry.id}</span></td><td className={`px-3 py-3 ${text}`}>{entry.itemName}</td><td className={`px-3 py-3 ${muted}`}>{entry.motivo || '—'}</td><td className={`px-3 py-3 text-right ${text}`}>{entry.cantidad}</td><td className={`px-3 py-3 text-center ${muted}`}>{new Date(entry.fecha).toLocaleString()}</td></tr>)}
            {visible.length === 0 && <tr><td colSpan="5" className={`px-3 py-8 text-center ${muted}`}>No hay entradas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
