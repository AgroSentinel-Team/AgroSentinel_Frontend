import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, Plus, Search, X } from 'lucide-react';
import InventoryMovementModal from '../../components/InventoryMovementModal';
import { getInventoryItems, getInventoryMovements, registerInitialInventoryEntry, registerInventoryMovement } from '../../services/inventoryService';
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

  const columns = [
    {
      key: 'reference',
      header: 'Referencia',
      render: (entry) => (
        <Badge variant="success">
          <ArrowDownLeft size={14} />
          ENT-{entry.id}
        </Badge>
      ),
    },
    { key: 'itemName', header: 'Producto' },
    {
      key: 'reason',
      header: 'Motivo / Proveedor',
      render: (entry) => entry.motivo || '—',
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      headerClassName: 'text-right',
      cellClassName: 'text-right font-bold tabular-nums text-forest-700',
      render: (entry) => `+${entry.cantidad}`,
    },
    {
      key: 'date',
      header: 'Fecha',
      headerClassName: 'text-center',
      cellClassName: 'text-center tabular-nums',
      render: (entry) => new Date(entry.fecha).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    },
  ];

  return (
    <Card className={`min-w-0 space-y-5 p-4 sm:p-6 ${dark ? 'bg-sand-50' : ''}`}>
      <PageHeader
        title="Entradas de almacén"
        description={
          readOnly
            ? `Consulta el historial de entradas de ${groupName || 'la bodega central'}.`
            : scoped
            ? `Registra existencias de ${groupName || 'la bodega central'}.`
            : 'Registra recepciones y actualiza el stock del inventario.'
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
                aria-label="Buscar entrada"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar entrada..."
                className="pl-10"
              />
            </div>
            {!readOnly && (
              <Button
                onClick={() => { setError(''); setShowForm(true); }}
                leftIcon={<Plus size={18} />}
              >
                Registrar entrada
              </Button>
            )}
          </div>
        }
      />

      {/* Aviso de Error */}
      {error && !showForm && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-error/20 bg-error-soft p-3.5 text-sm text-error-text">
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
        caption="Historial de entradas de almacén"
        columns={columns}
        data={visible}
        emptyState={
          <EmptyState
            icon={<ArrowDownLeft size={22} />}
            title="Sin entradas registradas"
            description="No hay entradas que coincidan con esta búsqueda."
          />
        }
      />

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
    </Card>
  );
}