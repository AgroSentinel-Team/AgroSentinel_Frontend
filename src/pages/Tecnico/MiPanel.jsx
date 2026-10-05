import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
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

function StatCard({ title, value, label, color }) {
  return (
    <div className="h-[76px] rounded-xl border border-[#2d4055] bg-[#172c3d] px-4 py-3">
      <div className="flex h-full items-end justify-between">
        <div>
          <p className="text-[11px] uppercase text-gray-400">{title}</p>
          <p className="mt-1 text-[22px] font-bold leading-none text-white">{value}</p>
        </div>
        <span className={`mb-[2px] text-[11px] font-medium ${color}`}>{label}</span>
      </div>
    </div>
  );
}

function getOrderSummary(failures, preventives) {
  const activeFailures = failures.filter((item) => item.estado !== 'RESUELTO');
  const activePreventives = preventives.filter((item) =>
    ['SCHEDULED', 'PARTIALLY_COMPLETED', 'URGENT_CORRECTIVE'].includes(item.status),
  );
  return [...activeFailures.map((item) => ({
    key: `failure-${item.id}`,
    id: `F-${item.id}`,
    machine: item.assetName,
    description: item.descripcion,
    status: item.estado,
    date: item.fechaReporte,
  })), ...activePreventives.map((item) => ({
    key: `preventive-${item.id}`,
    id: `MP-${item.id}`,
    machine: item.assetName,
    description: item.workDescription || 'Mantenimiento preventivo programado',
    status: item.status,
    date: item.scheduledAt,
  }))].slice(0, 5);
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
      setError(requestError.response?.data?.message || requestError.message || 'No fue posible cargar las órdenes asignadas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchPanelData()
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'No fue posible cargar las órdenes asignadas.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const orders = getOrderSummary(data.failures, data.preventives);
  const inProgress = data.failures.filter((item) => item.estado === 'EN_REVISION').length;
  const completedToday = data.history.filter((item) => item.executedAt
    && new Date(item.executedAt).toDateString() === new Date().toDateString()).length;
  const pending = data.failures.filter((item) => item.estado === 'PENDIENTE').length
    + data.preventives.filter((item) => item.status === 'SCHEDULED').length;
  const name = localStorage.getItem('nombre') || 'Técnico';

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#2d4055] bg-[#13293a] px-4 py-4">
        <h1 className="text-[16px] font-semibold text-white">Bienvenido, {name}</h1>
        <p className="mt-1 text-[11px] text-gray-400">
          Resumen de las órdenes y revisiones asignadas a tu usuario.
        </p>
      </section>

      {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title="ÓRDENES PENDIENTES" value={loading ? '—' : pending} label="Requieren atención" color="text-orange-400" />
        <StatCard title="EN PROGRESO" value={loading ? '—' : inProgress} label="En ejecución" color="text-cyan-400" />
        <StatCard title="COMPLETADAS HOY" value={loading ? '—' : completedToday} label="Registradas hoy" color="text-cyan-400" />
      </section>

      <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-white">Órdenes de Trabajo Asignadas</h2>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1 text-[11px] font-semibold text-orange-300">
              <AlertCircle size={10} />{pending} pendientes
            </span>
            <button type="button" onClick={refresh} aria-label="Actualizar órdenes" className="rounded p-1 text-gray-300 hover:bg-white/10">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        {loading ? <p className="text-sm text-gray-400">Cargando órdenes reales...</p>
          : orders.length === 0 ? <p className="text-sm text-gray-400">No tienes órdenes asignadas pendientes.</p>
            : <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.key} className="flex min-h-[47px] items-center gap-3 rounded-md border border-[#30485a] bg-[#102a3d] px-2.5 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-gray-200">
                      <span className="font-semibold text-blue-400">{order.id}</span> - {order.machine || 'Activo sin nombre'}
                    </p>
                    <p className="mt-[2px] truncate text-[11px] text-gray-500">{order.description || 'Sin descripción'}</p>
                  </div>
                  <span className="rounded bg-blue-500/15 px-2 py-1 text-[11px] text-blue-200">{order.status}</span>
                </div>
              ))}
            </div>}
        <button type="button" onClick={onOpenOrders} className="mt-3 rounded bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-500">
          Ver todas las órdenes
        </button>
      </section>
    </div>
  );
}
