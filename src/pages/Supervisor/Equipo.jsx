import { Activity, Clock3, UserRound } from 'lucide-react';

const teamActivity = [
  {
    name: 'Carlos R.',
    role: 'Almacenista Turno A',
    action: 'Registró entrada de 50 unidades de Pintura Acrílica',
    time: '09:30',
    color: 'from-gray-500 to-gray-800',
  },
  {
    name: 'María L.',
    role: 'Preparador de Despacho',
    action: 'Completó el inventario general de la Zona B',
    time: '08:45',
    color: 'from-orange-300 to-gray-700',
  },
  {
    name: 'Martín G.',
    role: 'Almacenista Turno B',
    action: 'Reportó daño de 5 disolventes en traslado',
    time: 'Ayer',
    color: 'from-yellow-700 to-gray-900',
  },
  {
    name: 'Laura G.',
    role: 'Despachador',
    action: 'Solicitó autorización para ajuste de stock',
    time: 'Ayer',
    color: 'from-gray-400 to-gray-800',
  },
];

function Avatar({ color, initials }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${color} text-[7px] font-bold text-white`}
    >
      {initials}
    </div>
  );
}

export default function Equipo() {
  return (
    <section className="rounded-lg border border-white/10 bg-[#292929] p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
          <UserRound size={16} />
        </div>
        <div>
          <h2 className="text-[11px] font-bold text-white">Actividad del Equipo</h2>
          <p className="text-[7px] text-slate-400">Últimas acciones del personal operativo</p>
        </div>
      </div>

      <div className="space-y-3">
        {teamActivity.map((person, index) => (
          <div key={person.name} className={`flex gap-3 py-2 ${index !== teamActivity.length - 1 ? 'border-b border-white/10' : ''}`}>
            <Avatar color={person.color} initials={person.name.split(' ').map((x) => x[0]).join('')} />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[8px] font-bold text-white">{person.name}</p>
                  <p className="text-[6px] text-slate-400">{person.role}</p>
                </div>

                <span className="inline-flex items-center gap-1 text-[6px] text-slate-400">
                  <Clock3 size={10} />
                  {person.time}
                </span>
              </div>

              <p className="mt-1 text-[7px] leading-relaxed text-slate-500">{person.action}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
