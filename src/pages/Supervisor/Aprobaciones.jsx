import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  User,
  X,
  XCircle,
} from 'lucide-react';

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
    <article className="rounded-xl border border-[#2d4055] bg-[#0d2030] p-4 shadow-md space-y-3 transition-all hover:border-[#3d5873]">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/5 pb-2.5">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white">{approval.title}</h3>
          <p className="mt-0.5 text-xs font-mono text-cyan-300">{approval.sku}</p>
        </div>
        {decision && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
              decision === 'Aprobada'
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                : 'border-red-400/30 bg-red-500/15 text-red-300'
            }`}
          >
            {decision === 'Aprobada' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {decision}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">{approval.description}</p>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
        <span className="flex items-center gap-1">
          <User size={13} className="text-slate-500 shrink-0" />
          <span>
            Por: <strong className="text-slate-200">{approval.person}</strong>
          </span>
        </span>
        <span className="flex items-center gap-1 font-mono text-slate-500">
          <Clock size={13} className="shrink-0" />
          Hace {approval.time}
        </span>
      </div>

      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => setDecision('Aprobada')}
          aria-pressed={decision === 'Aprobada'}
          className={`flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-lg border text-xs font-bold transition-colors ${
            decision === 'Aprobada'
              ? 'border-emerald-400 bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
              : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 active:bg-emerald-500/35'
          }`}
        >
          <Check size={16} />
          <span>{decision === 'Aprobada' ? 'Aprobada' : 'Aprobar'}</span>
        </button>

        <button
          type="button"
          onClick={() => setDecision('Rechazada')}
          aria-pressed={decision === 'Rechazada'}
          className={`flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-lg border text-xs font-bold transition-colors ${
            decision === 'Rechazada'
              ? 'border-red-400 bg-red-600 text-white shadow-lg shadow-red-950/40'
              : 'border-white/10 bg-[#163044] text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <X size={16} />
          <span>{decision === 'Rechazada' ? 'Rechazada' : 'Rechazar'}</span>
        </button>
      </div>
    </article>
  );
}

export default function Aprobaciones() {
  const pendingCount = approvals.length;

  return (
    <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4 min-w-0 text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <CheckCheck size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Control de Inventario
            </span>
          </div>
          <h2 className="mt-1 text-sm sm:text-base font-bold text-white">
            Aprobaciones Pendientes
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Validación requerida para movimientos, transferencias y mermas
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
          {pendingCount} pend.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {approvals.map((approval) => (
          <ApprovalCard key={approval.title} approval={approval} />
        ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
        <AlertTriangle size={18} className="shrink-0 text-amber-400 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-amber-100 font-semibold">Alerta de almacén:</strong> Revisar temperaturas del Sector Químicos de inmediato. Máximo superado en 1.5 °C.
        </p>
      </div>
    </section>
  );
}