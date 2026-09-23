import { BarChart3, TrendingUp } from 'lucide-react';

const kpis = [
  { title: 'EFICIENCIA OPERATIVA', value: '94.2%', badge: 'Excelente', badgeClass: 'bg-green-100 text-green-700' },
  { title: 'ÓRDENES COMPLETADAS', value: '187', suffix: 'órdenes', badge: 'Meta 90%', badgeClass: 'bg-orange-50 text-orange-600' },
  { title: 'TIEMPO PROM. DESPACHO', value: '23', suffix: 'minutos', badge: '−4 min', badgeClass: 'bg-green-100 text-green-700' },
  { title: 'INCIDENCIAS DEL MES', value: '3', suffix: 'casos', badge: 'Bajo', badgeClass: 'bg-blue-50 text-blue-600' },
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
    <div className="rounded-lg border border-white/10 bg-[#292929] px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between">
        <p className="text-[8px] font-medium uppercase text-slate-500">{title}</p>
        <span className={`rounded px-1.5 py-1 text-[6px] font-semibold ${badgeClass}`}>{badge}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-[22px] font-bold leading-none text-white">{value}</span>
        {suffix && <span className="text-[8px] text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}

function WeeklyChart() {
  return (
    <div className="rounded-lg border border-white/10 bg-[#292929] p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
          <TrendingUp size={16} />
        </div>
        <div>
          <h2 className="text-[11px] font-bold text-white">Rendimiento Semanal (% de Eficiencia)</h2>
          <p className="mt-0.5 text-[7px] text-slate-400">Eficiencia global medida de Lunes a Viernes en despacho de cargas</p>
        </div>
      </div>

      <div className="mt-5 flex h-[105px] items-end justify-center gap-7">
        {weeklyData.map((item) => (
          <div key={item.day} className="flex h-full w-9 flex-col items-center justify-end">
            <span className="mb-1 text-[7px] font-medium text-gray-400">{item.value}%</span>
            <div className="relative w-8 rounded-t-[5px] bg-orange-600" style={{ height: `${item.value - 55}%` }} />
            <span className="mt-2 text-[7px] text-slate-500">{item.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analisis() {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_240px]">
        <WeeklyChart />

        <div className="rounded-lg border border-white/10 bg-[#292929] p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
              <BarChart3 size={16} />
            </div>
            <h2 className="text-[11px] font-bold text-white">Resumen de Operación</h2>
          </div>

          <div className="space-y-3 text-[7px] text-slate-400">
            <div className="rounded-md border border-white/10 bg-[#1a1f2b] p-2">
              <p className="font-semibold text-white">Inventario crítico</p>
              <p className="mt-1">3 categorías bajo el umbral mínimo.</p>
            </div>
            <div className="rounded-md border border-white/10 bg-[#1a1f2b] p-2">
              <p className="font-semibold text-white">Movimientos del día</p>
              <p className="mt-1">24 entradas y 18 salidas procesadas.</p>
            </div>
            <div className="rounded-md border border-white/10 bg-[#1a1f2b] p-2">
              <p className="font-semibold text-white">Riesgo operativo</p>
              <p className="mt-1">1 sala de químicos por temperatura alta.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
