import { FileText, Clock3, CheckCircle2, AlertTriangle } from 'lucide-react';

const reports = [
  { title: 'Fumigadora Jacto 3030', note: 'Fuga de manguera de retorno de presión', date: 'Hoy, 8:30 AM', status: 'Evaluando', tone: 'bg-blue-500/15 text-blue-300' },
  { title: 'Tractor John Deere 6125J', note: 'Testigo de baja tensión en el tablero', date: 'Ayer, 4:15 PM', status: 'En Taller', tone: 'bg-amber-500/15 text-amber-300' },
  { title: 'Sistema de riego lote A', note: 'Bajo nivel de presión durante la prueba', date: 'Hace 2 días', status: 'Cerrado', tone: 'bg-emerald-500/15 text-emerald-300' },
];

export default function MisReportes() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-white">Mis reportes</h1>
        <p className="mt-1 text-[12px] text-gray-400">Historial de novedades reportadas por tu equipo.</p>
      </div>

      <div className="space-y-3">
        {reports.map(({ title, note, date, status, tone }) => (
          <div key={title} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#202a36] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
                <FileText size={17} />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-white">{title}</p>
                <p className="mt-1 text-[11px] text-gray-400">{note}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                  <Clock3 size={12} />
                  {date}
                </p>
              </div>
            </div>

            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}>
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
