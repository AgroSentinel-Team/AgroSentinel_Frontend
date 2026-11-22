import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, LoaderCircle, RefreshCw, Wrench } from 'lucide-react';
import { getAssignedFailureReports, getTechnicianMaintenanceHistory } from '../../services/technicianService';
import { getPreventiveMaintenances } from '../../services/preventiveMaintenanceService';
import { WORK_PACKAGE_CHANGED_EVENT } from '../../services/workPackageService';
import WorkPackageStatus from '../../components/WorkPackageStatus';

const PARTIAL_DATA_MESSAGE =
  'Algunos datos no están disponibles sin conexión. Descarga tus órdenes cuando tengas internet.';

// Muestra lo que haya aunque falte una parte (por ejemplo, el historial sin conexión).
async function fetchPanelData() {
  const results = await Promise.allSettled([
    getAssignedFailureReports(),
    getPreventiveMaintenances(),
    getTechnicianMaintenanceHistory(),
  ]);
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length === results.length) throw failed[0].reason;
  const [failures, preventives, history] = results.map((result) =>
    result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [],
  );
  return { failures, preventives, history, partial: failed.length > 0 };
}

function StatCard({ title, value, label, color, icon: Icon }) {
  return (
    <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 shadow-lg min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-600">
            {title}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">
            {value}
          </p>
          <p className={`mt-1 text-xs font-semibold ${color}`}>{label}</p>
        </div>
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sand-200 bg-sand-50 text-ocean-700">
            <Icon size={20} />
          </span>
        )}
      </div>
    </div>
  );
}

function getOrderSummary(failures, preventives) {
  const activeFailures = failures.filter((item) => item.estado !== 'RESUELTO');
  const activePreventives = preventives.filter((item) =>
    ['SCHEDULED', 'PARTIALLY_COMPLETED', 'URGENT_CORRECTIVE'].includes(item.status),
  );
  return [
    ...activeFailures.map((item) => ({
      key: `failure-${item.id}`,
      id: `F-${item.id}`,
      machine: item.assetName,
      description: item.descripcion,
      status: item.estado,
      date: item.fechaReporte,
    })),
    ...activePreventives.map((item) => ({
      key: `preventive-${item.id}`,
      id: `MP-${item.id}`,
      machine: item.assetName,
      description: item.workDescription || 'Mantenimiento preventivo programado',
      status: item.status,
      date: item.scheduledAt,
    })),
  ].slice(0, 6);
}

export default function MiPanel({ onOpenOrders }) {
  const [data, setData] = useState({ failures: [], preventives: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchPanelData();
      setData(result);
      if (result.partial) setError(PARTIAL_DATA_MESSAGE);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'No fue posible cargar las órdenes asignadas.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchPanelData()
      .then((result) => {
        if (!active) return;
        setData(result);
        if (result.partial) setError(PARTIAL_DATA_MESSAGE);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              'No fue posible cargar las órdenes asignadas.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    // Cuando termina una descarga, se recarga el panel con los datos nuevos.
    const handleDownloaded = (event) => {
      if (!event.detail?.manifest) return;
      fetchPanelData()
        .then((result) => {
          if (!active) return;
          setData(result);
          setError(result.partial ? PARTIAL_DATA_MESSAGE : '');
        })
        .catch(() => {});
    };
    globalThis.addEventListener(WORK_PACKAGE_CHANGED_EVENT, handleDownloaded);
    return () => {
      active = false;
      globalThis.removeEventListener(WORK_PACKAGE_CHANGED_EVENT, handleDownloaded);
    };
  }, []);

  const orders = getOrderSummary(data.failures, data.preventives);
  const inProgress = data.failures.filter((item) => item.estado === 'EN_REVISION').length;
  const completedToday = data.history.filter(
    (item) =>
      item.executedAt &&
      new Date(item.executedAt).toDateString() === new Date().toDateString(),
  ).length;
  const pending =
    data.failures.filter((item) => item.estado === 'PENDIENTE').length +
    data.preventives.filter((item) => item.status === 'SCHEDULED').length;
  const name = localStorage.getItem('nombre') || 'Técnico';

  return (
    <section className="space-y-6 text-ink-900 min-w-0">
      {/* Encabezado de Bienvenida */}
      <header className="rounded-xl border border-sand-200 bg-sand-50 p-5 shadow-xl space-y-1">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-ink-900">
          Bienvenido, {name}
        </h1>
        <p className="text-xs text-ink-600">
          Resumen general de las órdenes y revisiones asignadas a tu usuario en tiempo real.
        </p>
      </header>

      <WorkPackageStatus />

      {/* Alerta de Error */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error/20 bg-error-soft p-3.5 text-xs text-error-text"
        >
          {error}
        </div>
      )}

      {/* Grid de Estadísticas en DOS COLUMNAS (en pantallas medianas/grandes) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        <StatCard
          title="ÓRDENES PENDIENTES"
          value={loading ? '—' : pending}
          label="Requieren atención inmediata"
          color="text-forest-900"
          icon={AlertCircle}
        />
        <StatCard
          title="EN PROGRESO"
          value={loading ? '—' : inProgress}
          label="En ejecución actual"
          color="text-ocean-700"
          icon={Clock3}
        />
      </section>

      {/* Layout Principal en DOS COLUMNAS: Órdenes Recientes y Acceso Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-6">
        {/* Columna 1: Órdenes de Trabajo Asignadas */}
        <article className="rounded-xl border border-sand-200 bg-sand-50 p-5 shadow-xl space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-sand-200 pb-3">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-ocean-700 shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-ink-900">
                Órdenes Asignadas Recientes
              </h2>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              aria-label="Actualizar órdenes"
              className="flex min-h-[36px] items-center justify-center rounded-lg border border-sand-200 bg-sand-50 px-3 py-1.5 text-xs font-semibold text-ink-900 hover:bg-sand-100 transition-all duration-200 ease-out"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-ocean-700' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-ink-600">
              <LoaderCircle className="mx-auto mb-2 animate-spin text-ocean-700" size={20} />
              <span>Cargando órdenes asignadas...</span>
            </div>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-600 border border-sand-200/70 rounded-lg">
              No tienes órdenes asignadas pendientes.
            </p>
          ) : (
            <div className="space-y-2.5">
              {orders.map((order) => (
                <div
                  key={order.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-sand-200 bg-sand-50 p-3.5 shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink-900 flex items-center gap-2">
                      <span className="font-mono text-ocean-700">{order.id}</span>
                      <span className="text-ink-600">·</span>
                      <span className="truncate">{order.machine || 'Activo sin nombre'}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-600">
                      {order.description || 'Sin descripción'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-ocean-300/60 bg-info-soft px-2.5 py-0.5 text-[11px] font-semibold text-ocean-700">
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenOrders}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 text-xs font-bold uppercase tracking-wider text-pine-900 hover:bg-gold-600 transition-all duration-200 ease-out shadow-lg shadow-gold-600/20"
          >
            <span>Ver todas las órdenes</span>
            <ArrowRight size={16} />
          </button>
        </article>

        {/* Columna 2: Actividad y Estado Operativo del Día */}
        <article className="rounded-xl border border-sand-200 bg-sand-50 p-5 shadow-xl space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-sand-200 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-forest-700 shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-ink-900">
                Rendimiento Diario
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-forest-300/50 bg-success-soft px-2.5 py-0.5 text-xs font-bold text-forest-700">
              {completedToday} completadas hoy
            </span>
          </div>

          <div className="rounded-lg border border-sand-200 bg-sand-50 p-4 space-y-3">
            <p className="text-xs text-ink-600 leading-relaxed">
              Mantén el seguimiento de tus tareas para asegurar la operatividad de los equipos agrícolas asignados a tu zona de trabajo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-sand-200/70">
              <div className="rounded bg-sand-50 p-3 border border-sand-200/70 text-center">
                <span className="block text-[10px] uppercase font-bold text-ink-600">Total Hoy</span>
                <span className="mt-1 block text-xl font-extrabold text-ink-900 font-mono">{completedToday}</span>
              </div>
              <div className="rounded bg-sand-50 p-3 border border-sand-200/70 text-center">
                <span className="block text-[10px] uppercase font-bold text-ink-600">En Curso</span>
                <span className="mt-1 block text-xl font-extrabold text-ocean-700 font-mono">{inProgress}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-ocean-300/60 bg-info-soft p-4 text-xs text-ocean-700 leading-relaxed font-medium">
            Recuerda registrar cada repuesto e insumo utilizado al cerrar tus intervenciones técnicas en el sistema.
          </div>
        </article>
      </div>
    </section>
  );
}