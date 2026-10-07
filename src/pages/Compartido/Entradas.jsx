import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, Plus, Search } from 'lucide-react';
import InventoryMovementModal from '../../components/InventoryMovementModal';
import { getInventoryItems, getInventoryMovements, registerInitialInventoryEntry, registerInventoryMovement } from '../../services/inventoryService';

function getErrorMessage(error) {
  return error.response?.data?.detail || error.response?.data?.message || error.message || 'No se pudo completar la operación.';
}

export default function Entradas({ variant = 'dark', groupId, groupName, groups = [], onScopeChange, scoped = false, readOnly = false }) {
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
      const [inventory, movements] = await Promise.all([getInventoryItems(groupId, scoped), getInventoryMovements(groupId, scoped)]);
      setItems(inventory);
      setEntries(movements.filter((movement) => movement.tipo === 'entrada'));
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, [groupId, scoped]);

  useEffect(() => {
    let active = true;
    Promise.all([getInventoryItems(groupId, scoped), getInventoryMovements(groupId, scoped)])
      .then(([inventory, movements]) => {
        if (!active) return;
        setItems(inventory);
        setEntries(movements.filter((movement) => movement.tipo === 'entrada'));
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      });
    return () => { active = false; };
  }, [groupId, scoped]);

  const visible = useMemo(
    () => entries.filter((entry) => `${entry.itemName} ${entry.motivo ?? ''} ${entry.id}`.toLowerCase().includes(query.toLowerCase())),
    [entries, query],
  );
  const panel = dark ? 'border-[#2d4055] bg-[#13293a]' : 'border-[#dfe6ed] bg-white';
  const text = dark ? 'text-white' : 'text-[#182235]';
  const muted = dark ? 'text-gray-400' : 'text-[#718096]';
  const saveEntry = async (event, targetGroupId = groupId) => {
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
          groupId: scoped ? targetGroupId : undefined,
        });
      } else {
        await registerInventoryMovement(Number(form.itemId), {
          tipo: 'entrada',
          cantidad: Number(form.quantity),
          motivo: form.reason,
        }, targetGroupId, scoped);
      }
      setForm({ itemId: '', quantity: '', reason: '', item: '', category: '', unit: 'und', minimum: '0' });
      setShowForm(false);
      if (scoped && targetGroupId !== groupId && onScopeChange) {
        onScopeChange(targetGroupId);
      } else {
        await loadData();
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`rounded-xl border p-5 shadow-sm ${panel}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className={`text-[14px] font-semibold ${text}`}>Entradas de almacén</h2><p className={`mt-1 text-[10px] ${muted}`}>{readOnly ? `Consulta el historial de entradas de ${groupName || 'la bodega central'}.` : scoped ? `Registra existencias de ${groupName || 'la bodega central'}.` : 'Registra recepciones y actualiza el stock del inventario.'}</p></div>
        <div className="flex items-center gap-2">
          <label className={`relative flex items-center rounded-md border px-3 py-2 ${dark ? 'border-[#36556f] bg-[#102a3d]' : 'border-[#dfe6ed] bg-[#f8fafc]'}`}><Search size={14} className={muted} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar entrada..." className={`ml-2 w-36 bg-transparent text-[11px] outline-none ${dark ? 'text-white placeholder:text-slate-400' : 'text-[#334155]'}`} /></label>
          {!readOnly && <button type="button" onClick={() => { setError(''); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-blue-700"><Plus size={13} /> Registrar entrada</button>}
        </div>
      </div>
      {error && !showForm && <p role="alert" className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}
      <div className={`overflow-x-auto rounded-lg border ${dark ? 'border-[#2d4055] bg-[#102a3d]' : 'border-[#dfe6ed] bg-white'}`}>
        <table className="w-full min-w-[650px] text-left text-[10px]">
          <thead className={`border-b ${dark ? 'border-[#2d4055] bg-[#102a3d] text-slate-400' : 'border-[#e8edf2] bg-[#f8fafc] text-[#607086]'}`}><tr><th className="px-3 py-3 font-medium">Referencia</th><th className="px-3 py-3 font-medium">Producto</th><th className="px-3 py-3 font-medium">Motivo / proveedor</th><th className="px-3 py-3 text-right font-medium">Cantidad</th><th className="px-3 py-3 text-center font-medium">Fecha</th></tr></thead>
          <tbody className={dark ? 'divide-y divide-white/5' : 'divide-y divide-[#e8edf2]'}>
            {visible.map((entry) => <tr key={entry.id} className={dark ? 'hover:bg-white/5' : 'hover:bg-[#f8fafc]'}><td className={`px-3 py-3 font-semibold ${text}`}><span className="inline-flex items-center gap-1"><ArrowDownLeft size={12} className="text-green-500" />ENT-{entry.id}</span></td><td className={`px-3 py-3 ${text}`}>{entry.itemName}</td><td className={`px-3 py-3 ${muted}`}>{entry.motivo || '—'}</td><td className={`px-3 py-3 text-right ${text}`}>{entry.cantidad}</td><td className={`px-3 py-3 text-center ${muted}`}>{new Date(entry.fecha).toLocaleString()}</td></tr>)}
            {visible.length === 0 && <tr><td colSpan="5" className={`px-3 py-8 text-center ${muted}`}>No hay entradas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
      {showForm && !readOnly && (
        <InventoryMovementModal
          type="entrada"
          items={items}
          groups={groups}
          groupId={groupId}
          form={form}
          setForm={setForm}
          onSubmit={saveEntry}
          onClose={() => setShowForm(false)}
          saving={saving}
          error={error}
          groupName={groupName}
          scoped={scoped}
        />
      )}
    </section>
  );
}
