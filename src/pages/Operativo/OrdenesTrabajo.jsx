import { useState } from 'react';
import { Search, Plus, CheckCircle2, Clock3, AlertTriangle, CircleDashed } from 'lucide-react';

const orderStats = [
  { label: 'Pendientes', value: 5, tone: 'text-white', icon: AlertTriangle, accent: 'bg-blue-600/20 text-blue-400' },
  { label: 'En Progreso', value: 3, tone: 'text-white', icon: CircleDashed, accent: 'bg-cyan-600/20 text-cyan-400' },
  { label: 'Completadas', value: 28, tone: 'text-white', icon: CheckCircle2, accent: 'bg-emerald-600/20 text-emerald-400' },
  { label: 'Vencidas', value: 2, tone: 'text-white', icon: Clock3, accent: 'bg-amber-500/20 text-amber-300' },
];

const filters = ['Todos', 'Pendientes', 'En Progreso', 'Completadas', 'Vencidas'];

const orders = [
  { id: 'OT-001', type: 'Mantenimiento Preventivo', machine: 'Fendt 942 Vario (T-001)', priority: 'Alta', status: 'En Progreso', date: '28/08/2026', responsible: 'Jorge García' },
  { id: 'OT-002', type: 'Reparación Motor', machine: 'John Deere 6R 410 (T-002)', priority: 'Alta', status: 'Pendiente', date: '27/08/2026', responsible: 'Jorge García' },
  { id: 'OT-003', type: 'Cambio de Aceite', machine: 'CLAAS AXION 960 (T-003)', priority: 'Media', status: 'Pendiente', date: '30/08/2026', responsible: 'Jorge García' },
  { id: 'OT-004', type: 'Revisión Hidráulica', machine: 'Case IH Maxxum 140 (T-001)', priority: 'Alta', status: 'Completada', date: '25/08/2026', responsible: 'Jorge García' },
  { id: 'OT-005', type: 'Calibración GPS', machine: 'Amazonas ZT-42 (T-001)', priority: 'Baja', status: 'Completada', date: '22/08/2026', responsible: 'Jorge García' },
  { id: 'OT-006', type: 'Cambio Filtros', machine: 'Kuhn Multimaster 120 (T-001)', priority: 'Media', status: 'En Progreso', date: '29/08/2026', responsible: 'Jorge García' },
  { id: 'OT-007', type: 'Inspección General', machine: 'Fendt 942 Vario (T-001)', priority: 'Alta', status: 'Vencida', date: '20/08/2026', responsible: 'Jorge García' },
  { id: 'OT-008', type: 'Reparación Neumáticos', machine: 'John Deere 6R 410 (T-002)', priority: 'Media', status: 'Pendiente', date: '01/09/2026', responsible: 'Jorge García' },
];

const priorityClass = {
  Alta: 'bg-red-500/15 text-red-400 border border-red-500/30',
  Media: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  Baja: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
};

const statusClass = {
  Pendiente: 'bg-red-500/15 text-red-300',
  'En Progreso': 'bg-blue-500/15 text-blue-300',
  Completada: 'bg-emerald-500/15 text-emerald-300',
  Vencida: 'bg-amber-500/15 text-amber-300',
};

export default function OrdenesTrabajo() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const visibleOrders = orders.filter((order) => {
    const matchesFilter = activeFilter === 'Todos' || order.status === activeFilter;
    const normalizedQuery = query.toLowerCase();
    const matchesQuery = `${order.id} ${order.type} ${order.machine} ${order.responsible}`.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-white">Órdenes de Trabajo</h1>
          <p className="mt-1 text-[12px] text-gray-400">12 órdenes activas asignadas a tu cuenta</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1b2330] px-3 py-2 text-[11px] text-gray-300">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar orden..."
              className="w-36 border-0 bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
            />
          </label>

          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-500">
            <Plus size={14} />
            Nueva Orden
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orderStats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[#202a36] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-gray-400">{label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-md ${accent}`}>
                <Icon size={14} />
              </span>
            </div>
            <div className="mt-3 text-[30px] font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#202a36] overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={[
                'rounded-md px-3 py-1.5 text-[11px] transition',
                activeFilter === filter
                  ? 'bg-transparent text-white underline decoration-amber-400 decoration-2 underline-offset-8'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[11px] text-gray-200">
            <thead className="border-b border-white/10 bg-[#1b2330] text-[10px] uppercase tracking-[0.18em] text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Id orden</th>
                <th className="px-4 py-3 font-medium">Tipo de trabajo</th>
                <th className="px-4 py-3 font-medium">Máquina asignada</th>
                <th className="px-4 py-3 font-medium">Prioridad</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha prog.</th>
                <th className="px-4 py-3 font-medium">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5">
                  <td className="px-4 py-3 font-semibold text-white">{order.id}</td>
                  <td className="px-4 py-3">{order.type}</td>
                  <td className="px-4 py-3 text-gray-300">{order.machine}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-semibold ${priorityClass[order.priority]}`}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-semibold ${statusClass[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{order.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/80 text-[9px] font-bold text-white">
                        {order.responsible.charAt(0)}
                      </span>
                      <span className="text-gray-300">{order.responsible}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleOrders.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay órdenes que coincidan con la búsqueda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
