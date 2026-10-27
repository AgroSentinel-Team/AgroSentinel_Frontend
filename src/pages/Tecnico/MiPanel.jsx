import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, LoaderCircle, RefreshCw, Wrench } from 'lucide-react';
import { getAssignedFailureReports, getTechnicianMaintenanceHistory } from '../../services/technicianService';
import { getPreventiveMaintenances } from '../../services/preventiveMaintenanceService';

async function fetchPanelData() {
  const [failures, preventives, history] = await Promise.all([
    getAssignedFailureReports(),
    getPreventiveMaintenances(),
    getTechnicianMaintenanceHistory(),
  ]);
  return { failures, preventives, history };
}

function StatCard({ title, value, label, color, icon: Icon }) {
  return (
    <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 shadow-lg min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {value}
          </p>
          <p className={`mt-1 text-xs font-semibold ${color}`}>{label}</p>
        </div>
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0d2030] text-cyan-300">
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
      setData(await fetchPanelData());
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
        if (active) setData(result);
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
    return () => {
      active = false;
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
    <section className="space-y-6 text-white min-w-0">
      {/* Encabezado de Bienvenida */}
      <header className="rounded-xl border border-[#2d4055] bg-[#13293a] p-5 shadow-xl space-y-1">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
          Bienvenido, {name}
        </h1>
        <p className="text-xs text-slate-400">
          Resumen general de las órdenes y revisiones asignadas a tu usuario en tiempo real.
        </p>
      </header>

      {/* Alerta de Error */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
        >
          {error}
        </div>
      )}

      {/* Grid de Estadísticas en DOS COLUMNAS (en pantallas medianas/grandes) */}
      <section className="grid grid-cols-2 gap-2 sm:gap-4">
        <StatCard
          title="ÓRDENES PENDIENTES"
          value={loading ? '—' : pending}
          label="Requieren atención inmediata"
          color="text-amber-300"
          icon={AlertCircle}
        />
        <StatCard
          title="EN PROGRESO"
          value={loading ? '—' : inProgress}
          label="En ejecución actual"
          color="text-cyan-300"
          icon={Clock3}
        />
      </section>

      {/* Layout Principal en DOS COLUMNAS: Órdenes Recientes y Acceso Rápido */}
      <div className="grid grid-cols-2 gap-2 sm:gap-6">
        {/* Columna 1: Órdenes de Trabajo Asignadas */}
        <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-5 shadow-xl space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-cyan-300 shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-white">
                Órdenes Asignadas Recientes
              </h2>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              aria-label="Actualizar órdenes"
              className="flex min-h-[36px] items-center justify-center rounded-lg border border-white/10 bg-[#102a3d] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <LoaderCircle className="mx-auto mb-2 animate-spin text-cyan-400" size={20} />
              <span>Cargando órdenes asignadas...</span>
            </div>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400 border border-white/5 rounded-lg">
              No tienes órdenes asignadas pendientes.
            </p>
          ) : (
            <div className="space-y-2.5">
              {orders.map((order) => (
                <div
                  key={order.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#30485a] bg-[#0d2030] p-3.5 shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-cyan-300">{order.id}</span>
                      <span className="text-slate-500">·</span>
                      <span className="truncate">{order.machine || 'Activo sin nombre'}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {order.description || 'Sin descripción'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenOrders}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-950/40"
          >
            <span>Ver todas las órdenes</span>
            <ArrowRight size={16} />
          </button>
        </article>

        {/* Columna 2: Actividad y Estado Operativo del Día */}
        <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-5 shadow-xl space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-white">
                Rendimiento Diario
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
              {completedToday} completadas hoy
            </span>
          </div>

          <div className="rounded-lg border border-[#30485a] bg-[#0d2030] p-4 space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Mantén el seguimiento de tus tareas para asegurar la operatividad de los equipos agrícolas asignados a tu zona de trabajo.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div className="rounded bg-[#102a3d] p-3 border border-white/5 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Total Hoy</span>
                <span className="mt-1 block text-xl font-extrabold text-white font-mono">{completedToday}</span>
              </div>
              <div className="rounded bg-[#102a3d] p-3 border border-white/5 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-400">En Curso</span>
                <span className="mt-1 block text-xl font-extrabold text-cyan-300 font-mono">{inProgress}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-xs text-cyan-200 leading-relaxed font-medium">
            Recuerda registrar cada repuesto e insumo utilizado al cerrar tus intervenciones técnicas en el sistema.
          </div>
        </article>
      </div>
    </section>
  );
}