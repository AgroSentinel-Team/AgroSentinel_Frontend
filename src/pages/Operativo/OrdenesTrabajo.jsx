import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Filter,
  Plus,
  Search,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';

const INITIAL_ORDERS = [
  {
    id: 'OT-001',
    type: 'Mantenimiento Preventivo',
    machine: 'Fendt 942 Vario (T-001)',
    priority: 'Alta',
    status: 'En Progreso',
    date: '2026-08-28',
    responsible: 'Jorge García',
  },
  {
    id: 'OT-002',
    type: 'Reparación Motor',
    machine: 'John Deere 6R 410 (T-002)',
    priority: 'Alta',
    status: 'Pendiente',
    date: '2026-08-27',
    responsible: 'Jorge García',
  },
  {
    id: 'OT-003',
    type: 'Cambio de Aceite',
    machine: 'CLAAS AXION 960 (T-003)',
    priority: 'Media',
    status: 'Pendiente',
    date: '2026-08-30',
    responsible: 'Jorge García',
  },
  {
    id: 'OT-004',
    type: 'Revisión Hidráulica',
    machine: 'Case IH Maxxum 140 (T-001)',
    priority: 'Alta',
    status: 'Completada',
    date: '2026-08-25',
    responsible: 'Jorge García',
  },
  {
    id: 'OT-005',
    type: 'Calibración GPS',
    machine: 'Amazonas ZT-42 (T-001)',
    priority: 'Baja',
    status: 'Completada',
    date: '2026-08-22',
    responsible: 'Jorge García',
  },
  {
    id: 'OT-006',
    type: 'Cambio Filtros',
    machine: 'Kuhn Multimaster 120 (T-001)',
    priority: 'Media',
    status: 'En Progreso',
    date: '2026-08-29',
    responsible: 'Jorge García',
  },
  {
    id: 'OT-007',
    type: 'Inspección General',
    machine: 'Fendt 942 Vario (T-001)',
    priority: 'Alta',
    status: 'Vencida',
    date: '2026-08-20',
    responsible: 'Jorge García',
  },
  {
    id: 'OT-008',
    type: 'Reparación Neumáticos',
    machine: 'John Deere 6R 410 (T-002)',
    priority: 'Media',
    status: 'Pendiente',
    date: '2026-09-01',
    responsible: 'Jorge García',
  },
];

const FILTERS = ['Todos', 'Pendientes', 'En Progreso', 'Completadas', 'Vencidas'];

const PRIORITY_STYLES = {
  Alta: 'border-red-400/30 bg-red-500/15 text-red-300',
  Media: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  Baja: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
};

const STATUS_STYLES = {
  Pendiente: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  'En Progreso': 'border-cyan-400/30 bg-cyan-500/15 text-cyan-300',
  Completada: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  Vencida: 'border-red-400/30 bg-red-500/15 text-red-300',
};

function formatDate(dateStr) {
  if (!dateStr) return 'Sin fecha';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export default function OrdenesTrabajo() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    type: '',
    machine: '',
    priority: 'Media',
    date: '',
    responsible: 'Jorge García',
  });

  const stats = useMemo(() => {
    return [
      {
        label: 'Pendientes',
        value: orders.filter((o) => o.status === 'Pendiente').length,
        icon: AlertTriangle,
        accent: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
      },
      {
        label: 'En Progreso',
        value: orders.filter((o) => o.status === 'En Progreso').length,
        icon: CircleDashed,
        accent: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300',
      },
      {
        label: 'Completadas',
        value: orders.filter((o) => o.status === 'Completada').length,
        icon: CheckCircle2,
        accent: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
      },
      {
        label: 'Vencidas',
        value: orders.filter((o) => o.status === 'Vencida').length,
        icon: Clock3,
        accent: 'bg-red-500/15 border-red-400/30 text-red-300',
      },
    ];
  }, [orders]);

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesFilter =
        activeFilter === 'Todos' ||
        (activeFilter === 'Pendientes' && order.status === 'Pendiente') ||
        (activeFilter === 'En Progreso' && order.status === 'En Progreso') ||
        (activeFilter === 'Completadas' && order.status === 'Completada') ||
        (activeFilter === 'Vencidas' && order.status === 'Vencida');

      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        `${order.id} ${order.type} ${order.machine} ${order.responsible}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [orders, activeFilter, query]);

  const handleCreateOrder = (e) => {
    e.preventDefault();
    if (!newOrder.type || !newOrder.machine || !newOrder.date) return;

    const nextIdNumber = orders.length + 1;
    const formattedId = `OT-${String(nextIdNumber).padStart(3, '0')}`;

    const created = {
      id: formattedId,
      type: newOrder.type,
      machine: newOrder.machine,
      priority: newOrder.priority,
      status: 'Pendiente',
      date: newOrder.date,
      responsible: newOrder.responsible || 'Jorge García',
    };

    setOrders((current) => [created, ...current]);
    setIsModalOpen(false);
    setNewOrder({
      type: '',
      machine: '',
      priority: 'Media',
      date: '',
      responsible: 'Jorge García',
    });
  };

  return (
    <section className="space-y-5 text-white min-w-0">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <Wrench size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Gestión Operativa
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Órdenes de Trabajo
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {orders.length} órdenes registradas y asignadas a tu cuenta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative flex min-h-[44px] items-center rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2 text-xs text-white outline-none focus-within:border-cyan-400 transition min-w-[200px] flex-1 sm:flex-none">
            <Search size={16} className="text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por ID, tipo, máquina..."
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 active:bg-cyan-700 transition shadow-lg shadow-cyan-950/40"
          >
            <Plus size={18} />
            <span>Nueva Orden</span>
          </button>
        </div>
      </header>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 shadow-lg min-w-0"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                {label}
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${accent}`}
              >
                <Icon size={16} />
              </span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Contenedor Principal de Filtros y Tabla */}
      <div className="rounded-xl border border-[#2d4055] bg-[#13293a] shadow-xl">
        {/* Barra de Filtros */}
        <div className="flex items-center gap-2 border-b border-white/10 p-3 overflow-x-auto">
          <Filter size={16} className="text-slate-400 ml-1 shrink-0" />
          <div className="flex gap-1.5 min-w-max">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vista Móvil (Tarjetas) */}
        <div className="grid grid-cols-2 gap-2 p-3 md:hidden">
          {visibleOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-xl border border-[#294255] bg-[#0c1e2c] p-4 space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-sm font-bold text-cyan-300">{order.id}</span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                    STATUS_STYLES[order.status] || 'border-slate-500/30 bg-slate-500/15 text-slate-300'
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-white">{order.type}</p>
                <p className="mt-0.5 text-xs text-slate-400">{order.machine}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Prioridad</span>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold mt-0.5 ${
                      PRIORITY_STYLES[order.priority] || 'border-slate-500/30 bg-slate-500/15 text-slate-300'
                    }`}
                  >
                    {order.priority}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Fecha prog.</span>
                  <span className="font-mono text-slate-300 text-xs mt-0.5 block">
                    {formatDate(order.date)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-xs text-slate-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600/30 text-cyan-200 text-[10px] font-bold shrink-0">
                  {order.responsible.charAt(0)}
                </span>
                <span className="truncate">{order.responsible}</span>
              </div>
            </article>
          ))}

          {visibleOrders.length === 0 && (
            <p className="py-12 text-center text-xs text-slate-400">
              No hay órdenes de trabajo que coincidan con la búsqueda.
            </p>
          )}
        </div>

        {/* Vista Escritorio (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
            <thead className="bg-[#0b1d2a] text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-[#2d4055]">
              <tr>
                <th className="px-4 py-3.5">ID Orden</th>
                <th className="px-4 py-3.5">Tipo de trabajo</th>
                <th className="px-4 py-3.5">Máquina asignada</th>
                <th className="px-4 py-3.5">Prioridad</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5">Fecha prog.</th>
                <th className="px-4 py-3.5">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visibleOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3.5 font-bold text-cyan-300 font-mono">
                    {order.id}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-white">
                    {order.type}
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {order.machine}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        PRIORITY_STYLES[order.priority] ||
                        'border-slate-500/30 bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[order.status] ||
                        'border-slate-500/30 bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">
                    {formatDate(order.date)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600/30 border border-cyan-400/30 text-[10px] font-bold text-cyan-200 shrink-0">
                        {order.responsible.charAt(0)}
                      </span>
                      <span className="truncate">{order.responsible}</span>
                    </div>
                  </td>
                </tr>
              ))}

              {visibleOrders.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-12 text-center text-xs text-slate-400"
                  >
                    No hay órdenes de trabajo que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Orden */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="w-full max-w-lg rounded-xl border border-[#36556f] bg-[#102637] p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-cyan-300">
                <Wrench size={18} />
                <h2 id="modal-title" className="text-base sm:text-lg font-bold text-white">
                  Crear Nueva Orden de Trabajo
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tipo de trabajo <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mantenimiento de Transmisión"
                  value={newOrder.type}
                  onChange={(e) =>
                    setNewOrder((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Máquina / Equipo asignado <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Fendt 942 Vario (T-001)"
                  value={newOrder.machine}
                  onChange={(e) =>
                    setNewOrder((prev) => ({ ...prev, machine: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Prioridad <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={newOrder.priority}
                    onChange={(e) =>
                      setNewOrder((prev) => ({ ...prev, priority: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none transition focus:border-cyan-400 min-h-[44px]"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Fecha programada <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newOrder.date}
                    onChange={(e) =>
                      setNewOrder((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none transition focus:border-cyan-400 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Responsable
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-slate-300 min-h-[44px]">
                  <UserCheck size={16} className="text-cyan-400 shrink-0" />
                  <span>Jorge García</span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-lg bg-cyan-600 px-5 text-xs font-bold text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-950/40"
                >
                  Guardar Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}