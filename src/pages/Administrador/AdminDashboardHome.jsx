import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  Tractor,
  Wrench,
} from 'lucide-react';

const COLORS = ['#22d3ee', '#38bdf8', '#818cf8', '#f59e0b', '#fb7185', '#34d399'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('es-CO', { month: 'short' });
const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

function isValidDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date : null;
}

function formatDate(value) {
  const date = isValidDate(value);
  return date ? DATE_FORMATTER.format(date) : 'Sin fecha';
}

function getLastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: MONTH_FORMATTER.format(date).replace('.', ''),
      value: 0,
    };
  });
}

function statusLabel(status) {
  const labels = {
    PENDIENTE: 'Pendiente',
    EN_REVISION: 'En revisión',
    ESPERA_REPUESTO: 'Espera repuesto',
    RESUELTO: 'Resuelto',
    SCHEDULED: 'Programado',
    COMPLETED: 'Completado',
    PARTIALLY_COMPLETED: 'Parcial',
    URGENT_CORRECTIVE: 'Correctivo urgente',
    OPERATIONAL: 'Operativo',
    OPERATIONAL_WITH_RESTRICTIONS: 'Con restricciones',
    IN_REPAIR: 'En reparación',
    OBSOLETE: 'Obsoleto',
  };
  return labels[status] || status || 'Sin estado';
}

function Panel({ title, description, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[#263e51] bg-[#102536] p-4 sm:p-5 shadow-lg ${className}`}>
      <div className="mb-3.5 sm:mb-4">
        <h2 className="text-sm sm:text-base font-semibold leading-snug text-white">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message = 'No hay registros para mostrar.' }) {
  return (
    <div className="flex min-h-[120px] sm:min-h-[160px] items-center justify-center rounded-xl border border-dashed border-[#30485a] p-4 text-center text-xs text-slate-400">
      {message}
    </div>
  );
}

function TrendChart({ points }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const chartHeight = 120;
  const barWidth = 24;
  const chartWidth = Math.max(230, points.length * 42);

  if (!points.some((point) => point.value > 0)) {
    return <EmptyChart message="No hay reportes de fallas en los últimos seis meses." />;
  }

  return (
    <div className="overflow-x-auto scrollbar-none pb-1">
      <svg
        viewBox={`0 0 ${chartWidth} 160`}
        role="img"
        aria-label="Reportes de fallas registrados por mes durante los últimos seis meses"
        className="h-36 sm:h-48 min-w-[220px] w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {[0, 1, 2, 3].map((line) => {
          const y = 12 + line * (chartHeight / 3);
          return (
            <g key={line}>
              <line x1="30" y1={y} x2={chartWidth - 8} y2={y} stroke="#294255" strokeDasharray="4 5" />
              <text x="4" y={y + 4} fill="#7f93a5" fontSize="10">
                {Math.round(max * (1 - line / 3))}
              </text>
            </g>
          );
        })}
        {points.map((point, index) => {
          const x = 34 + index * ((chartWidth - 45) / points.length);
          const height = (point.value / max) * (chartHeight - 8);
          const y = 12 + chartHeight - height;
          return (
            <g key={`${point.year}-${point.month}`}>
              <rect x={x} y={y} width={barWidth} height={height} rx="6" fill="url(#reportBars)" />
              <text x={x + barWidth / 2} y="152" textAnchor="middle" fill="#9aabba" fontSize="9">
                {point.label}
              </text>
              <text x={x + barWidth / 2} y={Math.max(11, y - 5)} textAnchor="middle" fill="#e2e8f0" fontSize="9">
                {point.value}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="reportBars" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function CategoryChart({ items }) {
  const entries = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(1, ...entries.map(([, value]) => value));

  if (!entries.length) return <EmptyChart message="No hay fallas categorizadas." />;

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {entries.map(([label, value], index) => (
        <div key={label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-slate-300 font-medium">{label}</span>
            <span className="shrink-0 font-semibold text-white">{value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#1d3547]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(value / max) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ items, emptyMessage }) {
  const entries = items.filter((item) => item.value > 0);
  const total = entries.reduce((sum, item) => sum + item.value, 0);
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  const segments = entries.map((item, index) => ({
    ...item,
    length: (item.value / total) * circumference,
    offset: -entries.slice(0, index).reduce((sum, previous) => (
      sum + (previous.value / total) * circumference
    ), 0),
  }));

  if (!total) return <EmptyChart message={emptyMessage} />;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 py-2">
      <div className="relative h-28 w-28 sm:h-36 sm:w-36 shrink-0">
        <svg viewBox="0 0 120 120" role="img" aria-label={`Distribución total: ${total}`} className="h-full w-full">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#1d3547" strokeWidth="14" />
          {segments.map((item, index) => (
            <circle
              key={item.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={COLORS[index % COLORS.length]}
              strokeWidth="14"
              strokeDasharray={`${item.length} ${circumference - item.length}`}
              strokeDashoffset={item.offset}
              transform="rotate(-90 60 60)"
            />
          ))}
          <text x="60" y="56" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">{total}</text>
          <text x="60" y="72" textAnchor="middle" fill="#91a5b7" fontSize="8" fontWeight="600" letterSpacing="0.05em">REGISTROS</text>
        </svg>
      </div>
      <ul className="grid w-full grid-cols-2 gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
        {entries.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-3 bg-[#0c1e2c]/60 p-2 rounded-lg border border-white/5">
            <span className="flex min-w-0 items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-white">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricCard({ title, value, caption, icon: Icon, tone }) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#263e51] bg-[#102536] p-3.5 sm:p-5 shadow-lg">
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">{title}</p>
          <p className="mt-1.5 sm:mt-2.5 text-xl sm:text-3xl font-bold leading-none text-white tracking-tight">{value}</p>
        </div>
        <span className={`rounded-xl p-2.5 sm:p-3 shrink-0 ${tone}`}><Icon size={20} className="sm:w-6 sm:h-6" /></span>
      </div>
      <p className="mt-2.5 sm:mt-3 text-[11px] sm:text-xs leading-tight text-slate-400 line-clamp-2">{caption}</p>
    </article>
  );
}

function recentReports(reports) {
  return [...reports]
    .sort((a, b) => (isValidDate(b.fechaReporte)?.getTime() ?? 0) - (isValidDate(a.fechaReporte)?.getTime() ?? 0))
    .slice(0, 5);
}

function scheduledMaintenances(maintenances) {
  return maintenances
    .filter((maintenance) => (
      maintenance.status === 'SCHEDULED'
      && (isValidDate(maintenance.scheduledAt)?.getTime() ?? 0) >= Date.now()
    ))
    .sort((a, b) => (isValidDate(a.scheduledAt)?.getTime() ?? 0) - (isValidDate(b.scheduledAt)?.getTime() ?? 0))
    .slice(0, 5);
}

export default function AdminDashboardHome({
  data,
  loading,
  errors,
  refreshedAt,
  onRefresh,
}) {
  const assets = data.assets ?? [];
  const reports = data.reports ?? [];
  const predictiveAssets = data.predictiveAssets ?? [];
  const maintenances = data.maintenances ?? [];
  const openReports = reports.filter((report) => report.estado !== 'RESUELTO');
  const activeAssets = assets.filter((asset) => asset.isActive);
  const motorCount = predictiveAssets.length;
  const scheduledCount = maintenances.filter((maintenance) => maintenance.status === 'SCHEDULED').length;

  const months = getLastSixMonths();
  reports.forEach((report) => {
    const date = isValidDate(report.fechaReporte);
    if (!date) return;
    const month = months.find((item) => item.year === date.getFullYear() && item.month === date.getMonth());
    if (month) month.value += 1;
  });

  const faultTypes = reports.reduce((counts, report) => {
    const type = report.tipoFalla?.trim().replace(/\s+/g, ' ') || 'Sin clasificar';
    const normalizedType = type.toLocaleLowerCase('es-CO');
    const existingType = Object.keys(counts).find(
      (label) => label.toLocaleLowerCase('es-CO') === normalizedType,
    );
    const label = existingType || type;
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});

  const assetStatuses = [
    { label: 'Operativo', value: activeAssets.filter((asset) => asset.operationalStatus === 'OPERATIONAL').length },
    { label: 'Con restricciones', value: activeAssets.filter((asset) => asset.operationalStatus === 'OPERATIONAL_WITH_RESTRICTIONS').length },
    { label: 'En reparación', value: activeAssets.filter((asset) => asset.operationalStatus === 'IN_REPAIR').length },
    { label: 'Obsoleto', value: activeAssets.filter((asset) => asset.operationalStatus === 'OBSOLETE').length },
  ];

  const maintenanceStatuses = [
    { label: 'Programado', value: maintenances.filter((item) => item.status === 'SCHEDULED').length },
    { label: 'Completado', value: maintenances.filter((item) => item.status === 'COMPLETED').length },
    { label: 'Parcial', value: maintenances.filter((item) => item.status === 'PARTIALLY_COMPLETED').length },
    { label: 'Correctivo urgente', value: maintenances.filter((item) => item.status === 'URGENT_CORRECTIVE').length },
  ];

  const metrics = [
    {
      title: 'Activos activos',
      value: data.assets ? activeAssets.length : '—',
      caption: data.assets ? `de ${assets.length} activos registrados` : 'Sin datos de activos',
      icon: Tractor,
      tone: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20',
    },
    {
      title: 'Reportes abiertos',
      value: data.reports ? openReports.length : '—',
      caption: data.reports ? 'Pendientes, en revisión o esperando repuesto' : 'Sin datos de reportes',
      icon: AlertTriangle,
      tone: 'bg-amber-400/10 text-amber-300 border border-amber-400/20',
    },
    {
      title: 'Motores monitoreados',
      value: data.predictiveAssets ? motorCount : '—',
      caption: data.predictiveAssets ? 'Activos con telemetría predictiva' : 'Sin datos predictivos',
      icon: Activity,
      tone: 'bg-indigo-400/10 text-indigo-300 border border-indigo-400/20',
    },
    {
      title: 'Preventivos programados',
      value: data.maintenances ? scheduledCount : '—',
      caption: data.maintenances ? 'Mantenimientos en estado programado' : 'Sin datos de mantenimiento',
      icon: Wrench,
      tone: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Centro de operaciones</p>
          <h1 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">Dashboard administrativo</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">Indicadores en tiempo real de los registros del sistema.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {refreshedAt && (
            <span className="text-xs text-slate-400">
              Actualizado {refreshedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#36556f] bg-[#102536] px-4 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-200 active:bg-[#143c50] disabled:cursor-wait disabled:opacity-60 shadow-md"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin shrink-0' : 'shrink-0'} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Errores de carga de indicadores */}
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-xs text-amber-100">
          <p className="font-semibold">Algunos datos no están disponibles; los indicadores afectados aparecen como “—”.</p>
          <ul className="mt-1.5 list-inside list-disc text-amber-100/90 space-y-0.5">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      {loading && !refreshedAt && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs text-cyan-100 animate-pulse" role="status">
          Cargando indicadores desde el backend…
        </div>
      )}

      {/* Tarjetas Métricas principales */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {metrics.map((metric) => <MetricCard key={metric.title} {...metric} />)}
      </section>

      {/* Gráficas Principales */}
      <section className="grid grid-cols-2 gap-2 sm:gap-5">
        <Panel title="Reportes de fallas" description="Registros creados durante los últimos seis meses.">
          {data.reports
            ? <TrendChart points={months} />
            : <EmptyChart message="No fue posible consultar el historial de fallas." />}
        </Panel>
        <Panel title="Fallas por categoría" description={`${data.reports ? reports.length : '—'} reportes recibidos en total.`}>
          {data.reports
            ? <CategoryChart items={faultTypes} />
            : <EmptyChart message="No fue posible consultar las categorías de fallas." />}
        </Panel>
        <Panel title="Estado operativo de activos" description={`${data.assets ? activeAssets.length : '—'} activos actualmente activos.`}>
          {data.assets
            ? <DonutChart items={assetStatuses} emptyMessage="No hay activos activos para graficar." />
            : <EmptyChart message="No fue posible consultar los activos." />}
        </Panel>
        <Panel title="Estado del mantenimiento preventivo" description={`${data.maintenances ? maintenances.length : '—'} órdenes registradas.`}>
          {data.maintenances
            ? <DonutChart items={maintenanceStatuses} emptyMessage="No hay órdenes preventivas para graficar." />
            : <EmptyChart message="No fue posible consultar el mantenimiento preventivo." />}
        </Panel>
      </section>

      {/* Listas Recientes */}
      <section className="grid grid-cols-2 gap-2 sm:gap-5">
        <Panel title="Reportes recientes" description="Últimas fallas registradas por los usuarios.">
          {!data.reports ? (
            <EmptyChart message="No fue posible consultar los reportes recientes." />
          ) : reports.length === 0 ? (
            <EmptyChart message="Aún no hay reportes de fallas registrados." />
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {recentReports(reports).map((report) => (
                  <article key={report.id} className="flex min-w-0 flex-col justify-between gap-2 rounded-xl border border-[#294255] bg-[#0c1e2c] p-3 shadow-md">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{report.assetName || `Activo ${report.assetId}`}</p>
                      <p className="mt-0.5 truncate text-xs text-cyan-300 font-medium">{report.tipoFalla || 'Falla sin clasificar'}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400 leading-relaxed">{report.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-2 pt-1 border-t border-white/5 text-xs">
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300 bg-white/5 font-medium">{statusLabel(report.estado)}</span>
                      <span className="text-[11px] text-slate-400">{formatDate(report.fechaReporte)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Próximos mantenimientos" description="Órdenes programadas más cercanas.">
          {!data.maintenances ? (
            <EmptyChart message="No fue posible consultar el calendario preventivo." />
          ) : scheduledMaintenances(maintenances).length === 0 ? (
            <EmptyChart message="No hay mantenimientos programados." />
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {scheduledMaintenances(maintenances).map((maintenance) => (
                <article key={maintenance.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#294255] bg-[#0c1e2c] p-3 shadow-md">
                  <span className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300 border border-emerald-400/20 shrink-0">
                    <CalendarClock size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{maintenance.assetName || `Activo ${maintenance.assetId}`}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{maintenance.technicianName || 'Sin técnico asignado'}</p>
                  </div>
                  <span className="shrink-0 text-right text-xs font-medium text-slate-300">{formatDate(maintenance.scheduledAt)}</span>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </section>

      {/* Pie de página aclaratorio */}
      <div className="flex items-center gap-2 pt-2 text-xs text-slate-400 leading-normal">
        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
        <span>Las métricas se calculan con registros consultados al backend; no se usan datos de demostración.</span>
      </div>
    </div>
  );
}