import { Clock3, UserRound } from 'lucide-react';

const teamActivity = [
  {
    name: 'Carlos R.',
    role: 'Almacenista Turno A',
    action: 'Registró entrada de 50 unidades de Pintura Acrílica',
    time: '09:30',
    color: 'from-navy-700 to-navy-900',
  },
  {
    name: 'María L.',
    role: 'Preparador de Despacho',
    action: 'Completó el inventario general de la Zona B',
    time: '08:45',
    color: 'from-forest-500 to-pine-900',
  },
  {
    name: 'Martín G.',
    role: 'Almacenista Turno B',
    action: 'Reportó daño de 5 disolventes en traslado',
    time: 'Ayer',
    color: 'from-gold-500 to-gold-600',
  },
  {
    name: 'Laura G.',
    role: 'Despachador',
    action: 'Solicitó autorización para ajuste de stock',
    time: 'Ayer',
    color: 'from-ocean-500 to-navy-900',
  },
];

function Avatar({ color, initials }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${color} text-xs font-bold text-white shadow-sm border border-sand-200`}
    >
      {initials}
    </div>
  );
}

export default function Equipo() {
  return (
    <section className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-4 min-w-0 text-ink-900">
      <div className="flex items-center gap-3 border-b border-sand-200 pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ocean-300/60 bg-info-soft text-ocean-700">
          <UserRound size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-ink-900 truncate">
            Actividad del Equipo
          </h2>
          <p className="mt-0.5 text-xs text-ink-600 truncate">
            Últimas acciones del personal operativo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {teamActivity.map((person, index) => {
          const initials = person.name
            .split(' ')
            .map((x) => x[0])
            .join('');

          return (
            <div
              key={person.name}
              className={`flex items-start gap-3 py-2.5 ${
                index !== teamActivity.length - 1 ? 'border-b border-sand-200/70' : ''
              }`}
            >
              <Avatar color={person.color} initials={initials} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-ink-900 leading-tight">
                      {person.name}
                    </p>
                    <p className="text-[11px] font-medium text-ocean-700/80">
                      {person.role}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-600">
                    <Clock3 size={13} className="text-ink-600 shrink-0" />
                    {person.time}
                  </span>
                </div>

                <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                  {person.action}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}