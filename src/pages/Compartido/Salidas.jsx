import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Plus, Search, X } from 'lucide-react';
import InventoryMovementModal from '../../components/InventoryMovementModal';
import {
  getInventoryItems,
  getInventoryMovements,
  registerInventoryMovement,
} from '../../services/inventoryService';

function getErrorMessage(error) {
  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    'No se pudo completar la operación.'
  );
}

export default function Salidas({
  variant = 'dark',
  groupId,
  groupName,
  groups = [],
  onScopeChange,
  scoped = false,
  readOnly = false,
}) {
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
      const [inventory, movements] = await Promise.all([
        getInventoryItems(groupId, scoped),
        getInventoryMovements(groupId, scoped),
      ]);
      setItems(inventory);
      setOutputs(movements.filter((movement) => movement.tipo === 'salida'));
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, [groupId, scoped]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getInventoryItems(groupId, scoped),
      getInventoryMovements(groupId, scoped),
    ])
      .then(([inventory, movements]) => {
        if (!active) return;
        setItems(inventory);
        setOutputs(movements.filter((movement) => movement.tipo === 'salida'));
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      });
    return () => {
      active = false;
    };
  }, [groupId, scoped]);

  const visible = useMemo(
    () =>
      outputs.filter((output) =>
        `${output.itemName} ${output.motivo ?? ''} ${output.id}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [outputs, query],
  );

  const panel = dark ? 'border-[#2d4055] bg-[#13293a]' : 'border-[#dfe6ed] bg-white';
  const text = dark ? 'text-white' : 'text-[#182235]';
  const muted = dark ? 'text-slate-400' : 'text-[#718096]';

  const saveOutput = async (event, targetGroupId = groupId) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await registerInventoryMovement(
        Number(form.itemId),
        {
          tipo: 'salida',
          cantidad: Number(form.quantity),
          motivo: form.reason,
        },
        targetGroupId,
        scoped,
      );
      setForm({ itemId: '', quantity: '', reason: '' });
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
    <section className={`rounded-xl border p-4 sm:p-5 shadow-xl min-w-0 ${panel} ${text}`}>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className={`text-base sm:text-lg font-bold tracking-tight ${text}`}>
            Salidas de almacén
          </h2>
          <p className={`mt-0.5 text-xs ${muted}`}>
            {readOnly
              ? `Consulta el historial de salidas de ${groupName || 'la bodega central'}.`
              : scoped
              ? `Despacha y descuenta existencias de ${groupName || 'la bodega central'}.`
              : 'Registra despachos y descuenta existencias automáticamente.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label
            className={`relative flex min-h-[44px] items-center rounded-lg border px-3 py-2 transition min-w-[200px] flex-1 sm:flex-none ${
              dark
                ? 'border-[#36556f] bg-[#102a3d] focus-within:border-cyan-400'
                : 'border-[#dfe6ed] bg-[#f8fafc] focus-within:border-blue-500'
            }`}
          >
            <Search size={16} className={`${muted} shrink-0`} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar salida..."
              className={`ml-2 w-full bg-transparent text-xs sm:text-sm outline-none ${
                dark ? 'text-white placeholder:text-slate-400' : 'text-[#334155]'
              }`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </label>

          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setShowForm(true);
              }}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 active:bg-blue-700 transition shadow-lg shadow-blue-950/40"
            >
              <Plus size={16} />
              <span>Registrar salida</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Error */}
      {error && !showForm && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-300 hover:text-white p-1 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tarjetas Móviles */}
      <div className="grid grid-cols-2 gap-2 md:hidden">
        {visible.map((output) => (
          <article
            key={output.id}
            className={`rounded-xl border p-4 space-y-3 shadow-md ${
              dark ? 'border-[#294255] bg-[#0c1e2c]' : 'border-[#e8edf2] bg-[#f8fafc]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="inline-flex items-center gap-1.5 font-bold text-blue-400 text-xs">
                <ArrowUpRight size={14} className="text-blue-500" />
                SAL-{output.id}
              </span>
              <span className={`text-xs font-mono ${muted}`}>
                {new Date(output.fecha).toLocaleString('es-CO', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">{output.itemName}</p>
              <p className={`mt-0.5 text-xs ${muted}`}>
                Motivo/Destino: {output.motivo || '—'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className={`text-xs font-medium ${muted}`}>Cantidad despachada:</span>
              <span className="rounded-md bg-blue-500/15 border border-blue-400/30 px-2.5 py-1 text-xs font-bold text-blue-200">
                -{output.cantidad}
              </span>
            </div>
          </article>
        ))}

        {visible.length === 0 && (
          <p className={`py-12 text-center text-xs ${muted}`}>
            No hay salidas registradas.
          </p>
        )}
      </div>

      {/* Tabla Escritorio */}
      <div
        className={`hidden md:block overflow-x-auto rounded-xl border ${
          dark ? 'border-[#2d4055] bg-[#102a3d]' : 'border-[#dfe6ed] bg-white'
        }`}
      >
        <table className="w-full min-w-[650px] text-left text-xs sm:text-sm">
          <thead
            className={`border-b text-xs font-semibold uppercase tracking-wider ${
              dark
                ? 'border-[#2d4055] bg-[#0b1d2a] text-slate-400'
                : 'border-[#e8edf2] bg-[#f8fafc] text-[#607086]'
            }`}
          >
            <tr>
              <th className="px-4 py-3.5">Referencia</th>
              <th className="px-4 py-3.5">Producto</th>
              <th className="px-4 py-3.5">Motivo / Destino</th>
              <th className="px-4 py-3.5 text-right">Cantidad</th>
              <th className="px-4 py-3.5 text-center">Fecha</th>
            </tr>
          </thead>
          <tbody className={dark ? 'divide-y divide-white/5' : 'divide-y divide-[#e8edf2]'}>
            {visible.map((output) => (
              <tr
                key={output.id}
                className={`transition-colors ${
                  dark ? 'hover:bg-white/[0.03]' : 'hover:bg-[#f8fafc]'
                }`}
              >
                <td className={`px-4 py-3.5 font-bold ${text}`}>
                  <span className="inline-flex items-center gap-1.5 text-blue-400">
                    <ArrowUpRight size={14} className="text-blue-500 shrink-0" />
                    SAL-{output.id}
                  </span>
                </td>
                <td className={`px-4 py-3.5 font-semibold ${text}`}>{output.itemName}</td>
                <td className={`px-4 py-3.5 ${muted}`}>{output.motivo || '—'}</td>
                <td className="px-4 py-3.5 text-right font-bold text-blue-300">
                  -{output.cantidad}
                </td>
                <td className={`px-4 py-3.5 text-center font-mono text-xs ${muted}`}>
                  {new Date(output.fecha).toLocaleString('es-CO')}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan="5" className={`px-4 py-12 text-center text-xs ${muted}`}>
                  No hay salidas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Movimiento */}
      {showForm && !readOnly && (
        <InventoryMovementModal
          type="salida"
          items={items}
          groups={groups}
          groupId={groupId}
          form={form}
          setForm={setForm}
          onSubmit={saveOutput}
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