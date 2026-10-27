import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, Calendar, Plus, Search, X } from 'lucide-react';
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
  const muted = dark ? 'text-slate-400' : 'text-[#718096]';
  const cardBg = dark ? 'border-[#294255] bg-[#0c1e2c]' : 'border-[#e2e8f0] bg-[#f8fafc]';

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
    <section className={`rounded-xl border p-4 sm:p-6 shadow-xl min-w-0 ${panel}`}>
      {/* Header Vista */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <h2 className={`text-base sm:text-lg font-semibold ${text}`}>Entradas de almacén</h2>
          <p className={`mt-0.5 text-xs ${muted}`}>
            {readOnly
              ? `Consulta el historial de entradas de ${groupName || 'la bodega central'}.`
              : scoped
              ? `Registra existencias de ${groupName || 'la bodega central'}.`
              : 'Registra recepciones y actualiza el stock del inventario.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Buscar */}
          <div className="relative flex-1 sm:w-64">
            <Search size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar entrada..."
              className={`w-full rounded-lg border px-3.5 pl-10 py-2.5 text-xs sm:text-sm outline-none transition-colors min-h-[44px] ${
                dark
                  ? 'border-[#36556f] bg-[#102a3d] text-white placeholder:text-slate-400 focus:border-cyan-400'
                  : 'border-[#dfe6ed] bg-[#f8fafc] text-[#334155] placeholder:text-slate-400 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Botón Registrar */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => { setError(''); setShowForm(true); }}
              className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-950/40"
            >
              <Plus size={18} />
              <span>Registrar entrada</span>
            </button>
          )}
        </div>
      </div>

      {/* Aviso de Error */}
      {error && !showForm && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Cerrar aviso"
            className="flex h-8 w-8 items-center justify-center rounded text-red-300 hover:bg-red-500/20 transition-colors shrink-0 -mr-1 -mt-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Vista Tarjetas para Pantallas Pequeñas (Móviles) */}
      <div className="grid min-w-0 grid-cols-2 gap-2 md:hidden">
        {visible.map((entry) => (
          <article key={entry.id} className={`min-w-0 rounded-xl border p-3 sm:p-4 space-y-2.5 shadow-md ${cardBg}`}>
            <div className="flex min-w-0 flex-col items-start gap-1 border-b border-white/5 pb-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400 text-[11px] sm:text-xs">
                <ArrowDownLeft size={16} />
                ENT-{entry.id}
              </span>
              <span className={`min-w-0 break-words text-[10px] sm:text-[11px] font-medium flex items-center gap-1 ${muted}`}>
                <Calendar size={13} />
                {new Date(entry.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>

            <div>
              <p className={`break-words text-sm font-semibold ${text}`}>{entry.itemName}</p>
              <p className={`mt-0.5 break-words text-xs ${muted}`}>{entry.motivo || 'Sin motivo / proveedor especificado'}</p>
            </div>

            <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs">
              <span className={`break-words ${muted}`}>Cantidad recibida:</span>
              <span className="font-bold text-sm text-emerald-400">+{entry.cantidad}</span>
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <p className={`p-8 text-center text-xs ${muted}`}>No hay entradas registradas.</p>
        )}
      </div>

      {/* Vista Tabla para Pantallas Medianas / Escritorio */}
      <div className={`hidden md:block overflow-x-auto rounded-lg border ${dark ? 'border-[#2d4055] bg-[#102a3d]' : 'border-[#dfe6ed] bg-white'}`}>
        <table className="w-full min-w-[650px] text-left text-xs sm:text-sm">
          <thead className={`border-b ${dark ? 'border-[#2d4055] bg-[#0b1d2a] text-slate-400' : 'border-[#e8edf2] bg-[#f8fafc] text-[#607086]'} font-semibold uppercase text-[11px] tracking-wider`}>
            <tr>
              <th className="px-4 py-3.5">Referencia</th>
              <th className="px-4 py-3.5">Producto</th>
              <th className="px-4 py-3.5">Motivo / Proveedor</th>
              <th className="px-4 py-3.5 text-right">Cantidad</th>
              <th className="px-4 py-3.5 text-center">Fecha</th>
            </tr>
          </thead>
          <tbody className={dark ? 'divide-y divide-white/5' : 'divide-y divide-[#e8edf2]'}>
            {visible.map((entry) => (
              <tr key={entry.id} className={dark ? 'hover:bg-white/[0.03] transition-colors' : 'hover:bg-[#f8fafc] transition-colors'}>
                <td className={`px-4 py-3.5 font-bold ${text}`}>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <ArrowDownLeft size={16} />
                    ENT-{entry.id}
                  </span>
                </td>
                <td className={`px-4 py-3.5 font-semibold ${text}`}>{entry.itemName}</td>
                <td className={`px-4 py-3.5 ${muted}`}>{entry.motivo || '—'}</td>
                <td className="px-4 py-3.5 text-right font-bold text-emerald-400">+{entry.cantidad}</td>
                <td className={`px-4 py-3.5 text-center ${muted}`}>{new Date(entry.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan="5" className={`px-4 py-8 text-center text-xs ${muted}`}>
                  No hay entradas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Registrar Movimiento */}
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