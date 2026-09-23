import { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

const approvals = [
  {
    title: 'Ajuste de Stock: +50 Pinturas',
    sku: 'SKU-3829-AZ',
    description: 'Entrada de excedente de obra sin SKU original en Sector B.',
    person: 'Carlos R.',
    time: '10m',
  },
  {
    title: 'Transferencia: Sector A → C',
    sku: 'SKU-9182-RD',
    description: 'Movimiento de 15 lotes de Rodillos de Fibra por espacio crítico.',
    person: 'María L.',
    time: '25m',
  },
  {
    title: 'Descarte por Merma',
    sku: 'SKU-9922-DT',
    description: 'Desecho de 5 unidades de Disolventes con envase roto en Sector Químicos.',
    person: 'Martín G.',
    time: '1h',
  },
];

function ApprovalCard({ approval }) {
  const [decision, setDecision] = useState('');

  return (
    <div className="rounded-md border border-white/10 bg-[#292929] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[9px] font-bold text-white">{approval.title}</h3>
          <p className="mt-0.5 text-[7px] text-slate-500">{approval.sku}</p>
        </div>
      </div>

      <p className="mt-2 text-[7px] leading-relaxed text-slate-500">{approval.description}</p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[6px] text-slate-500">Por: {approval.person}</span>
        <span className="text-[6px] text-slate-400">Hace {approval.time}</span>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setDecision('Aprobada')}
          aria-pressed={decision === 'Aprobada'}
          className="flex flex-1 items-center justify-center gap-1 rounded bg-green-600 py-1.5 text-[7px] font-semibold text-white transition hover:bg-green-700"
        >
          <Check size={10} />
          {decision === 'Aprobada' ? 'Aprobada' : 'Aprobar'}
        </button>

        <button
          type="button"
          onClick={() => setDecision('Rechazada')}
          aria-pressed={decision === 'Rechazada'}
          className="flex flex-1 items-center justify-center gap-1 rounded border border-white/10 bg-[#202020] py-1.5 text-[7px] font-medium text-gray-300 transition hover:bg-slate-50 hover:text-slate-800"
        >
          <X size={10} />
          {decision === 'Rechazada' ? 'Rechazada' : 'Rechazar'}
        </button>
      </div>
    </div>
  );
}

export default function Aprobaciones() {
  return (
    <section className="rounded-lg border border-white/10 bg-[#292929] p-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-bold text-white">Aprobaciones Pendientes</h2>
          <p className="text-[7px] text-slate-400">Validación necesaria para movimientos y mermas</p>
        </div>

        <span className="rounded bg-orange-100 px-2 py-1 text-[6px] font-semibold text-orange-600">3 pend.</span>
      </div>

      <div className="mt-2 space-y-2">
        {approvals.map((approval) => (
          <ApprovalCard key={approval.title} approval={approval} />
        ))}
      </div>

      <div className="mt-3 flex gap-2 rounded-md bg-orange-100 p-2">
        <AlertTriangle size={13} className="shrink-0 text-orange-500" />
        <p className="text-[7px] leading-relaxed text-orange-600">
          Revisar temperaturas del Sector Químicos de inmediato. Máx superado en 1.5°C.
        </p>
      </div>
    </section>
  );
}
