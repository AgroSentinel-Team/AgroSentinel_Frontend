import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Plus, Search, X } from 'lucide-react';
import InventoryMovementModal from '../../components/InventoryMovementModal';
import {
  getInventoryItems,
  getInventoryMovements,
  registerInventoryMovement,
} from '../../services/inventoryService';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  ResponsiveTable,
} from '../../components/ui';

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

  const columns = [
    {
      key: 'reference',
      header: 'Referencia',
      render: (output) => (
        <Badge variant="info">
          <ArrowUpRight size={14} />
          SAL-{output.id}
        </Badge>
      ),
    },
    { key: 'itemName', header: 'Producto' },
    {
      key: 'reason',
      header: 'Motivo / Destino',
      render: (output) => output.motivo || '—',
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      headerClassName: 'text-right',
      cellClassName: 'text-right font-bold tabular-nums text-ocean-700',
      render: (output) => `-${output.cantidad}`,
    },
    {
      key: 'date',
      header: 'Fecha',
      headerClassName: 'text-center',
      cellClassName: 'text-center tabular-nums',
      render: (output) => new Date(output.fecha).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    },
  ];

  return (
    <Card className={`min-w-0 space-y-5 p-4 sm:p-6 ${dark ? 'bg-sand-50' : ''}`}>
      <PageHeader
        title="Salidas de almacén"
        description={
          readOnly
            ? `Consulta el historial de salidas de ${groupName || 'la bodega central'}.`
            : scoped
            ? `Despacha y descuenta existencias de ${groupName || 'la bodega central'}.`
            : 'Registra despachos y descuenta existencias automáticamente.'
        }
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600"
              />
              <Input
                aria-label="Buscar salida"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar salida..."
                className={query ? 'pl-10 pr-11' : 'pl-10'}
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-1 top-1/2 size-9 min-h-9 -translate-y-1/2"
                >
                  <X size={14} />
                </Button>
              )}
            </div>
            {!readOnly && (
              <Button
                onClick={() => {
                  setError('');
                  setShowForm(true);
                }}
                leftIcon={<Plus size={16} />}
              >
                Registrar salida
              </Button>
            )}
          </div>
        }
      />

      {/* Alerta de Error */}
      {error && !showForm && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-error/20 bg-error-soft p-3.5 text-sm text-error-text"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setError('')}
            aria-label="Cerrar aviso"
            className="size-8 min-h-8 shrink-0"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      <ResponsiveTable
        caption="Historial de salidas de almacén"
        columns={columns}
        data={visible}
        emptyState={
          <EmptyState
            icon={<ArrowUpRight size={22} />}
            title="Sin salidas registradas"
            description="No hay salidas que coincidan con esta búsqueda."
          />
        }
      />

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
    </Card>
  );
}