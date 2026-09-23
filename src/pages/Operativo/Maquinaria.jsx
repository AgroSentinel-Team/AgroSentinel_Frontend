import { Gauge, Wrench, CheckCircle2 } from 'lucide-react';

const machines = [
  { name: 'Tractor John Deere 613', value: 95, description: 'Totalmente operativo', status: 'Excelente' },
  { name: 'Cosechadora New Holland', value: 80, description: 'Operacional, requiere revisión', status: 'Revisión' },
  { name: 'Fumigadora Jacto 3030', value: 40, description: 'Fuera de servicio por falla reportada', status: 'Falla' },
  { name: 'Sistema de Riego Lote A', value: 100, description: 'Presión óptima', status: 'Normal' },
];

export default function Maquinaria() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-white">Maquinaria asignada</h1>
        <p className="mt-1 text-[12px] text-gray-400">Consulta el estado operativo de tus equipos.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {machines.map(({ name, value, description, status }) => (
          <div key={name} className="rounded-2xl border border-white/10 bg-[#202a36] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
                  <Gauge size={18} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-white">{name}</p>
                  <p className="text-[10px] text-gray-400">{description}</p>
                </div>
              </div>
              <span className="rounded-full bg-blue-600/15 px-2 py-1 text-[9px] font-semibold text-blue-300">{status}</span>
            </div>

            <div className="mb-2 flex items-center justify-between text-[10px] text-gray-400">
              <span>Disponibilidad</span>
              <span>{value}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${value >= 80 ? 'bg-blue-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
