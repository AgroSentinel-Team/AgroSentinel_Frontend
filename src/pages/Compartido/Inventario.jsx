import { useEffect, useMemo, useState } from 'react';
import { Package, RefreshCw, Search } from 'lucide-react';
import { getInventoryItems } from '../../services/inventoryService';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  ResponsiveTable,
  Skeleton,
} from '../../components/ui';

function getErrorMessage(error) {
  if (error.response?.status === 401) {
    return 'El backend rechazó el token de acceso. Reinicia el backend con los permisos actualizados y vuelve a iniciar sesión.';
  }
  if (error.response?.status === 403) {
    return 'Tu usuario no tiene permiso para consultar el inventario.';
  }
  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    'No se pudo cargar el inventario.'
  );
}

export default function Inventario({ variant = 'dark', groupId, groupName, scoped = false }) {
  const dark = variant === 'dark';
  const [inventory, setInventory] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${reloadKey}:${groupId ?? 'central'}:${scoped}`;
  const [loadedRequestKey, setLoadedRequestKey] = useState('');
  const loading = loadedRequestKey !== requestKey;

  useEffect(() => {
    let active = true;
    getInventoryItems(groupId, scoped)
      .then((items) => {
        if (active) {
          setInventory(items);
          setError('');
        }
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [requestKey, groupId, scoped]);

  const retryLoading = () => {
    setError('');
    setReloadKey((current) => current + 1);
  };

  const visible = useMemo(
    () =>
      inventory.filter((item) =>
        `${item.item} ${item.category}`.toLowerCase().includes(query.toLowerCase())
      ),
    [inventory, query]
  );

  const columns = [
    {
      key: 'item',
      header: 'Ítem',
      render: (item) => (
        <span className="inline-flex items-center gap-2 font-semibold text-ink-900">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info-soft text-ocean-700">
            <Package size={16} />
          </span>
          {item.item}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (item) => item.category || 'Sin categoría',
    },
    {
      key: 'stock',
      header: 'Stock actual',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (item) => {
        const low = Number(item.stock) < Number(item.minimum);
        return (
          <span className={`font-bold ${low ? 'text-error-text' : 'text-ink-900'}`}>
            {item.stock} {item.unit}
          </span>
        );
      },
    },
    {
      key: 'minimum',
      header: 'Mínimo',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (item) => `${item.minimum} ${item.unit}`,
    },
    {
      key: 'status',
      header: 'Estado',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (item) => {
        const low = Number(item.stock) < Number(item.minimum);
        return (
          <Badge variant={low ? 'error' : 'success'}>
            {low ? 'Bajo stock' : 'Suficiente'}
          </Badge>
        );
      },
    },
  ];

  return (
    <Card className={`min-w-0 space-y-5 p-4 sm:p-6 ${dark ? 'bg-sand-50' : ''}`}>
      <PageHeader
        title="Inventario"
        description={
          groupName
            ? `Existencias independientes de ${groupName}.`
            : scoped
            ? 'Bodega central · existencias sin grupo asignado.'
            : 'Las alertas se activan cuando el stock actual queda por debajo del mínimo.'
        }
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600"
              />
              <Input
                aria-label="Buscar insumo"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar insumo..."
                className="pl-10"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={retryLoading}
              disabled={loading}
              aria-label="Actualizar inventario"
              title="Actualizar inventario"
              leftIcon={<RefreshCw size={18} className={loading ? 'animate-spin' : ''} />}
            />
          </div>
        }
      />

      {/* Alerta de Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-error/20 bg-error-soft p-3.5 text-sm text-error-text"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={retryLoading}
            className="shrink-0"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Estado Carga / Vacío / Lista Inventario */}
      {loading ? (
        <div className="grid gap-3">
          <Skeleton variant="rect" label="Cargando inventario" />
          <Skeleton variant="rect" label="Cargando inventario" />
        </div>
      ) : !error && (
        <ResponsiveTable
          caption="Existencias de inventario"
          columns={columns}
          data={visible}
          emptyState={
            <EmptyState
              icon={<Package size={22} />}
              title={inventory.length ? 'Sin resultados' : 'Inventario vacío'}
              description={
                inventory.length
                  ? 'No hay resultados que coincidan con la búsqueda.'
                  : 'Aún no hay productos registrados. Registra una primera entrada desde la sección Entradas.'
              }
            />
          }
        />
      )}
    </Card>
  );
}