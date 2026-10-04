import { Activity, CalendarClock, CheckCircle2 } from 'lucide-react';

const history = [
  { id: 'OT-431', machine: 'Tractor John Deere 6125 J', service: 'Cambio de filtros y limpieza de admisión', date: '18/09/2026', result: 'Completada' },
  { id: 'OT-404', machine: 'Cosechadora New Holland CR 6.80', service: 'Alineación de cuchillas', date: '15/09/2026', result: 'Completada' },
  { id: 'OT-390', machine: 'Fumigadora Jacto Advance', service: 'Calibración de boquillas', date: '12/09/2026', result: 'Completada' },
  { id: 'OT-388', machine: 'Sistema de Riego Lote 3', service: 'Revisión de válvulas y presión', date: '08/09/2026', result: 'Completada' },
];

export default function Historial() {
  return (
    <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
          <CalendarClock size={16} />
        </div>
        <div>
          <h2 className="text-[13px] font-semibold text-white">Historial de Mantenimientos</h2>
          <p className="text-[11px] text-gray-400">Registro de trabajos finalizados y revisiones previas</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[11px] text-gray-300">
          <thead className="border-b border-[#2d4055] bg-[#102a3d] text-[11px] uppercase tracking-[0.12em] text-slate-400">
            <tr>
              <th className="px-3 py-3">Orden</th>
              <th className="px-3 py-3">Máquina</th>
              <th className="px-3 py-3">Servicio</th>
              <th className="px-3 py-3">Fecha</th>
              <th className="px-3 py-3">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id} className="border-b border-[#2d4055] last:border-b-0 hover:bg-white/5">
                <td className="px-3 py-3 font-semibold text-blue-400">{item.id}</td>
                <td className="px-3 py-3 text-white">{item.machine}</td>
                <td className="px-3 py-3 text-gray-400">{item.service}</td>
                <td className="px-3 py-3 text-gray-400">{item.date}</td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                    <CheckCircle2 size={10} />
                    {item.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
