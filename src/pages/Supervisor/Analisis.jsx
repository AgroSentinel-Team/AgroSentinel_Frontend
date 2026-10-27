import { BarChart3, TrendingUp } from 'lucide-react';

const kpis = [
  {
    title: 'EFICIENCIA OPERATIVA',
    value: '94.2%',
    badge: 'Excelente',
    badgeClass: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  },
  {
    title: 'ÓRDENES COMPLETADAS',
    value: '187',
    suffix: 'órdenes',
    badge: 'Meta 90%',
    badgeClass: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  },
  {
    title: 'TIEMPO PROM. DESPACHO',
    value: '23',
    suffix: 'minutos',
    badge: '−4 min',
    badgeClass: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  },
  {
    title: 'INCIDENCIAS DEL MES',
    value: '3',
    suffix: 'casos',
    badge: 'Bajo',
    badgeClass: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-300',
  },
];

const weeklyData = [
  { day: 'Lun', value: 85 },
  { day: 'Mar', value: 91 },
  { day: 'Mié', value: 94 },
  { day: 'Jue', value: 89 },
  { day: 'Vie', value: 96 },
];

function KpiCard({ title, value, suffix, badge, badgeClass }) {
  return (
    <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 shadow-lg min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </p>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}
        >
          {badge}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {value}
        </span>
        {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

function WeeklyChart() {
  const maxValue = Math.max(...weeklyData.map((d) => d.value), 100);

  return (
    <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4 min-w-0">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
          <TrendingUp size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-white truncate">
            Rendimiento Semanal (% de Eficiencia)
          </h2>
          <p className="mt-0.5 text-xs text-slate-400 truncate">
            Eficiencia global medida de Lunes a Viernes en despacho de cargas
          </p>
        </div>
      </div>

      <div className="pt-2 px-2">
        <div className="flex h-36 sm:h-44 items-end justify-between gap-2 sm:gap-4">
          {weeklyData.map((item) => {
            const heightPercent = Math.round((item.value / maxValue) * 100);
            return (
              <div
                key={item.day}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              >
                <span className="text-[11px] font-bold text-slate-300">
                  {item.value}%
                </span>
                <div
                  title={`${item.day}: ${item.value}%`}
                  className="w-full max-w-[36px] rounded-t-md bg-cyan-500/80 hover:bg-cyan-400 transition-colors"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-xs font-semibold text-slate-400">
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Analisis() {
  return (
    <section className="space-y-5 text-white min-w-0">
      <header className="border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-cyan-300">
          <BarChart3 size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Métricas de Rendimiento
          </span>
        </div>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
          Análisis Operativo
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Indicadores clave de eficiencia, tiempos de despacho y rendimiento semanal.
        </p>
      </header>

      {/* Tarjetas KPI */}
      <section className="grid grid-cols-2 gap-2 sm:gap-3.5 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      {/* Gráfico Semanal y Resumen */}
      <section className="grid grid-cols-2 gap-2 sm:gap-5">
        <WeeklyChart />

        <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4 min-w-0">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <BarChart3 size={18} />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              Resumen de Operación
            </h2>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-[#30485a] bg-[#0d2030] p-3 text-xs space-y-1">
              <p className="font-bold text-cyan-300">Inventario crítico</p>
              <p className="text-slate-300 leading-relaxed">
                3 categorías se encuentran bajo el umbral mínimo establecido.
              </p>
            </div>

            <div className="rounded-lg border border-[#30485a] bg-[#0d2030] p-3 text-xs space-y-1">
              <p className="font-bold text-emerald-300">Movimientos del día</p>
              <p className="text-slate-300 leading-relaxed">
                24 entradas y 18 salidas procesadas correctamente.
              </p>
            </div>

            <div className="rounded-lg border border-[#30485a] bg-[#0d2030] p-3 text-xs space-y-1">
              <p className="font-bold text-amber-300">Riesgo operativo</p>
              <p className="text-slate-300 leading-relaxed">
                1 sala de almacenamiento de químicos presenta alerta por temperatura elevada.
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}