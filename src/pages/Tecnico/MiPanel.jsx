import { AlertCircle, Clock3, Wrench } from 'lucide-react';

const orders = [
  {
    id: 'OT-442',
    machine: 'Tractor John Deere 6125 J',
    description: 'Mantenimiento de 250 horas (Cambio de aceites y filtros)',
    priority: 'Alta',
    status: 'Pendiente',
    priorityClass: 'bg-[#3b3b3b] text-gray-300',
    statusClass: 'bg-blue-700 text-white',
  },
  {
    id: 'OT-445',
    machine: 'Cosechadora New Holland CR 6.80',
    description: 'Reajuste de correas de transmisión y cuchillas de corte',
    priority: 'Media',
    status: 'En Progreso',
    priorityClass: 'bg-blue-700 text-white',
    statusClass: 'bg-blue-500 text-[#07101f]',
  },
  {
    id: 'OT-448',
    machine: 'Fumigadora Jacto Advance',
    description: 'Calibración de boquillas de aspersión',
    priority: 'Baja',
    status: 'Completada',
    priorityClass: 'bg-[#3b3b3b] text-gray-300',
    statusClass: 'bg-blue-400 text-[#07101f]',
  },
];

function StatCard({ title, value, label, labelColor }) {
  return (
    <div className="h-[76px] rounded-xl border border-white/10 bg-[#292929] px-4 py-3">
      <div className="flex h-full items-end justify-between">
        <div>
          <p className="text-[8px] uppercase text-gray-400">{title}</p>
          <p className="mt-1 text-[22px] font-bold leading-none text-white">{value}</p>
        </div>
        <span className={`mb-[2px] text-[8px] font-medium ${labelColor}`}>{label}</span>
      </div>
    </div>
  );
}

function OrderRow({ order }) {
  return (
    <div className="flex min-h-[47px] items-center rounded-md border border-white/[0.07] bg-[#2c2c2c] px-2.5 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-blue-400">{order.id}</span>
          <span className="text-[10px] font-medium text-gray-200">- {order.machine}</span>
        </div>

        <p className="mt-[2px] truncate text-[8px] text-gray-500">{order.description}</p>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-2">
        <span className={`rounded px-2 py-1 text-[7px] font-medium ${order.priorityClass}`}>
          Prioridad: {order.priority}
        </span>

        <span className={`rounded px-2 py-1 text-[7px] font-medium ${order.statusClass}`}>
          {order.status}
        </span>

        <button type="button" className="rounded bg-blue-600 px-3 py-[5px] text-[8px] font-medium text-white transition hover:bg-blue-500">
          Iniciar
        </button>
      </div>
    </div>
  );
}

export default function MiPanel() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/[0.06] bg-[#292929] px-4 py-4">
        <h1 className="text-[16px] font-semibold text-white">Bienvenido de nuevo, Héctor Fabio</h1>
        <p className="mt-1 text-[9px] text-gray-400">
          Usted tiene 4 órdenes de trabajo pendientes para hoy. El estado del clima en Cali Valle es propicio para labores mecánicas de campo.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title="ÓRDENES PENDIENTES" value="4" label="Requiere atención" labelColor="text-orange-400" />
        <StatCard title="EN PROGRESO" value="2" label="En ejecución" labelColor="text-cyan-400" />
        <StatCard title="COMPLETADAS HOY" value="3" label="Buen ritmo" labelColor="text-cyan-400" />
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-[#292929] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-white">Órdenes de Trabajo Asignadas</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1 text-[7px] font-semibold text-orange-300">
            <AlertCircle size={10} />
            4 pendientes
          </span>
        </div>

        <div className="space-y-2">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      </section>
    </div>
  );
}
