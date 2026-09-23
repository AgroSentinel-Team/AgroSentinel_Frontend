import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Gauge, Wrench } from 'lucide-react';

const initialEquipment = [
  { id: 'EQ-001', name: 'Fumigadora Jacto 3030', location: 'Lote 4 - Sector Norte', health: 42, risk: 'Alto', hours: 1840, nextService: 'En 18 horas', signal: 'Vibracion hidraulica fuera de rango' },
  { id: 'EQ-002', name: 'Tractor John Deere 6125J', location: 'Taller principal', health: 68, risk: 'Medio', hours: 2310, nextService: 'En 74 horas', signal: 'Temperatura de motor en ascenso' },
  { id: 'EQ-003', name: 'Cosechadora New Holland', location: 'Lote 2 - Sector Este', health: 91, risk: 'Bajo', hours: 980, nextService: 'En 240 horas', signal: 'Comportamiento normal' },
];

const riskStyles = {
  Alto: 'border-red-400/30 bg-red-500/10 text-red-300',
  Medio: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  Bajo: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
};

const healthStyles = {
  Alto: 'bg-red-400',
  Medio: 'bg-amber-400',
  Bajo: 'bg-emerald-400',
};

export default function MantenimientoPredictivo() {
  const [equipment, setEquipment] = useState(initialEquipment);
  const [selectedId, setSelectedId] = useState(initialEquipment[0].id);
  const [filter, setFilter] = useState('Todos');
  const [message, setMessage] = useState('');

  const selected = equipment.find((item) => item.id === selectedId) || equipment[0];
  const visibleEquipment = useMemo(
    () => filter === 'Todos' ? equipment : equipment.filter((item) => item.risk === filter),
    [equipment, filter],
  );

  const acknowledgeAlert = () => {
    setEquipment((current) => current.map((item) => item.id === selected.id ? { ...item, risk: 'Medio' } : item));
    setMessage(`Alerta de ${selected.name} marcada para seguimiento.`);
  };

  const scheduleMaintenance = () => {
    setMessage(`Mantenimiento preventivo programado para ${selected.name}.`);
  };

  return (
    <section className="space-y-5 text-white">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-300">
            <Activity size={17} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Centro de mantenimiento</span>
          </div>
          <h1 className="mt-2 text-[22px] font-bold">Mantenimiento predictivo y alertas</h1>
          <p className="mt-1 max-w-2xl text-[11px] text-slate-400">Anticipa fallas usando salud del equipo, horas de uso y señales de operación.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[10px] text-emerald-200">
          <Gauge size={14} /> Monitoreo actualizado hace 5 min
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Equipos monitoreados" value={equipment.length} icon={Gauge} tone="text-emerald-300" />
        <Metric label="Alertas activas" value={equipment.filter((item) => item.risk !== 'Bajo').length} icon={AlertTriangle} tone="text-amber-300" />
        <Metric label="Salud promedio" value={`${Math.round(equipment.reduce((total, item) => total + item.health, 0) / equipment.length)}%`} icon={Activity} tone="text-cyan-300" />
      </div>

      {message && <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"><CheckCircle2 size={14} /> {message}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.85fr]">
        <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold">Alertas por equipo</h2>
              <p className="mt-1 text-[10px] text-slate-400">Selecciona un equipo para ver su recomendacion.</p>
            </div>
            <div className="flex gap-1 rounded-lg bg-[#0d1f2d] p-1">
              {['Todos', 'Alto', 'Medio', 'Bajo'].map((option) => (
                <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-md px-2.5 py-1.5 text-[9px] font-semibold transition ${filter === option ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {visibleEquipment.map((item) => (
              <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setMessage(''); }} className={`w-full rounded-lg border p-3 text-left transition ${selected.id === item.id ? 'border-emerald-400/60 bg-[#1a382d]' : 'border-[#30485a] bg-[#102a3d] hover:border-emerald-400/40'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300"><Wrench size={15} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold">{item.name}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{item.id} · {item.location}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${riskStyles[item.risk]}`}>{item.risk}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700"><div className={`h-full rounded-full ${healthStyles[item.risk]}`} style={{ width: `${item.health}%` }} /></div>
                  <span className="text-[10px] font-semibold text-slate-300">{item.health}% salud</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-[#2d4055] bg-[#102a3d] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Equipo seleccionado</p>
              <h2 className="mt-1 text-[15px] font-semibold">{selected.name}</h2>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${riskStyles[selected.risk]}`}>{selected.risk}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
            <Info label="Horas de uso" value={`${selected.hours} h`} />
            <Info label="Proximo servicio" value={selected.nextService} />
            <Info label="Ubicacion" value={selected.location} />
            <Info label="Senal detectada" value={selected.signal} />
          </div>

          <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-amber-300"><Clock3 size={14} /><span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Recomendacion</span></div>
            <p className="mt-2 text-[11px] leading-relaxed text-amber-100">Realizar inspeccion preventiva antes del siguiente turno y registrar la lectura de sensores.</p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <button type="button" onClick={acknowledgeAlert} className="rounded-lg border border-amber-400/40 bg-amber-500 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-950 transition hover:bg-amber-400">Reconocer alerta</button>
            <button type="button" onClick={scheduleMaintenance} className="rounded-lg border border-emerald-400/40 bg-emerald-600 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emerald-500">Programar mantenimiento</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value, icon: Icon, tone }) {
  return <div className="rounded-xl border border-[#2d4055] bg-[#172c3d] px-4 py-3"><div className={`flex items-center gap-2 ${tone}`}><Icon size={14} /><span className="text-[9px] font-semibold uppercase tracking-[0.14em]">{label}</span></div><p className="mt-2 text-[24px] font-bold text-white">{value}</p></div>;
}

function Info({ label, value }) {
  return <div className="rounded-lg border border-[#30485a] bg-[#13293a] p-2.5"><p className="text-[9px] text-slate-400">{label}</p><p className="mt-1 text-[10px] font-medium text-white">{value}</p></div>;
}
