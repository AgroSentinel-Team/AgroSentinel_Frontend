import { ArrowRight, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';

const orders = [
  { id: 'OT-442', machine: 'Tractor John Deere 6125 J', description: 'Mantenimiento de 250 horas', priority: 'Alta', status: 'Pendiente', date: 'Hoy 08:30', owner: 'Héctor' },
  { id: 'OT-445', machine: 'Cosechadora New Holland CR 6.80', description: 'Reajuste de correas de transmisión', priority: 'Media', status: 'En Progreso', date: 'Hoy 09:15', owner: 'Héctor' },
  { id: 'OT-448', machine: 'Fumigadora Jacto Advance', description: 'Calibración de boquillas de aspersión', priority: 'Baja', status: 'Completada', date: 'Ayer 17:40', owner: 'Héctor' },
  { id: 'OT-451', machine: 'Sistema de Riego Lote 3', description: 'Revisión de presión y válvulas', priority: 'Media', status: 'Pendiente', date: 'Mañana 07:00', owner: 'Héctor' },
];

const priorityClass = {
  Alta: 'bg-red-500/15 text-red-300',
  Media: 'bg-amber-500/15 text-amber-300',
  Baja: 'bg-emerald-500/15 text-emerald-300',
};

const statusClass = {
  Pendiente: 'bg-blue-500/15 text-blue-300',
  'En Progreso': 'bg-cyan-500/15 text-cyan-300',
  Completada: 'bg-emerald-500/15 text-emerald-300',
};

export default function OrdenesAsignadas() {
  return (
    <section className="space-y-4 rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-white">Órdenes de Trabajo Asignadas</h2>
            <p className="text-[11px] text-gray-400">Seguimiento de mantenimientos y reparaciones del día</p>
          </div>
        </div>

        <button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-500">
          Nueva Revisión
        </button>
      </div>

      <div className="space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="rounded-md border border-[#30485a] bg-[#102a3d] p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-blue-400">{order.id}</span>
                  <span className="text-[11px] font-medium text-white">{order.machine}</span>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">{order.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-1 text-[11px] font-medium ${priorityClass[order.priority]}`}>
                  {order.priority}
                </span>

                <span className={`rounded px-2 py-1 text-[11px] font-medium ${statusClass[order.status]}`}>
                  {order.status}
                </span>

                <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-500">
                  {order.status === 'Completada' ? 'Ver detalle' : 'Iniciar'}
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-gray-400">
              <span className="inline-flex items-center gap-1"><Clock3 size={10} /> {order.date}</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 size={10} /> Responsable: {order.owner}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
