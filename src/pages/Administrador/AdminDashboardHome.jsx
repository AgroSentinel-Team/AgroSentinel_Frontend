import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  Tractor,
  Wrench,
} from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, Skeleton, StatCard } from '../../components/ui';

const COLORS = [
  'var(--color-forest-500)',
  'var(--color-ocean-500)',
  'var(--color-gold-500)',
  'var(--color-forest-300)',
  'var(--color-ocean-300)',
  'var(--color-gold-600)',
];
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
    OUT_OF_SERVICE: 'Fuera de servicio',
    OBSOLETE: 'Obsoleto',
  };
  return labels[status] || status || 'Sin estado';
}

function Panel({ title, description, children, className = '' }) {
  return (
    <Card className={`min-w-0 p-4 sm:p-5 ${className}`}>
      <div className="mb-3.5 sm:mb-4">
        <h2 className="text-sm font-semibold leading-snug text-ink-900 sm:text-base">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

function EmptyChart({ message = 'No hay registros para mostrar.' }) {
  return <EmptyState title={message} className="min-h-[120px] border-dashed bg-sand-50 text-xs sm:min-h-[160px]" />;
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
              <line x1="30" y1={y} x2={chartWidth - 8} y2={y} stroke="var(--color-sand-200)" strokeDasharray="4 5" />
              <text x="4" y={y + 4} fill="var(--color-ink-400)" fontSize="10">
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
              <text x={x + barWidth / 2} y="152" textAnchor="middle" fill="var(--color-ink-600)" fontSize="9">
                {point.label}
              </text>
              <text x={x + barWidth / 2} y={Math.max(11, y - 5)} textAnchor="middle" fill="var(--color-ink-900)" fontSize="9">
                {point.value}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="reportBars" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-forest-300)" />
            <stop offset="100%" stopColor="var(--color-forest-500)" />
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
            <span className="truncate font-medium text-ink-600">{label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink-900">{value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-sand-100">
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
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--color-sand-200)" strokeWidth="14" />
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
          <text x="60" y="56" textAnchor="middle" fill="var(--color-ink-900)" fontSize="20" fontWeight="700">{total}</text>
          <text x="60" y="72" textAnchor="middle" fill="var(--color-ink-600)" fontSize="8" fontWeight="600" letterSpacing="0.05em">REGISTROS</text>
        </svg>
      </div>
      <ul className="grid w-full grid-cols-2 gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
        {entries.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-sand-200 bg-sand-50 p-2">
            <span className="flex min-w-0 items-center gap-2 text-ink-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink-900">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricCard({ title, value, caption, icon: Icon, tone }) {
  return (
    <StatCard
      label={title}
      value={value}
      detail={caption}
      icon={<Icon size={20} />}
      accent={tone}
      className="min-w-0"
    />
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
    { label: 'Fuera de servicio', value: activeAssets.filter((asset) => asset.operationalStatus === 'OUT_OF_SERVICE').length },
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
      tone: 'forest',
    },
    {
      title: 'Reportes abiertos',
      value: data.reports ? openReports.length : '—',
      caption: data.reports ? 'Pendientes, en revisión o esperando repuesto' : 'Sin datos de reportes',
      icon: AlertTriangle,
      tone: 'gold',
    },
    {
      title: 'Motores monitoreados',
      value: data.predictiveAssets ? motorCount : '—',
      caption: data.predictiveAssets ? 'Activos con telemetría predictiva' : 'Sin datos predictivos',
      icon: Activity,
      tone: 'ocean',
    },
    {
      title: 'Preventivos programados',
      value: data.maintenances ? scheduledCount : '—',
      caption: data.maintenances ? 'Mantenimientos en estado programado' : 'Sin datos de mantenimiento',
      icon: Wrench,
      tone: 'forest',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-forest-700">Centro de operaciones</p>
      <PageHeader
        title="Dashboard administrativo"
        description="Indicadores en tiempo real de los registros del sistema."
        actions={
          <div className="flex flex-wrap items-center gap-3">
          {refreshedAt && (
            <span className="text-xs text-ink-600">
              Actualizado {refreshedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw size={16} className={loading ? 'shrink-0 animate-spin' : 'shrink-0'} />
            Actualizar
          </Button>
          </div>
        }
      />

      {/* Errores de carga de indicadores */}
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-gold-500/25 bg-gold-100 p-4 text-xs text-ink-900">
          <p className="font-semibold">Algunos datos no están disponibles; los indicadores afectados aparecen como “—”.</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-ink-600">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      {loading && !refreshedAt && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Cargando indicadores">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} variant="rect" className="h-28 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Tarjetas Métricas principales */}
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.title} {...metric} />)}
      </section>

      {/* Gráficas Principales */}
      <section className="grid grid-cols-1 gap-2 sm:gap-5 lg:grid-cols-2">
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
      <section className="grid grid-cols-1 gap-2 sm:gap-5 xl:grid-cols-2">
        <Panel title="Reportes recientes" description="Últimas fallas registradas por los usuarios.">
          {!data.reports ? (
            <EmptyChart message="No fue posible consultar los reportes recientes." />
          ) : reports.length === 0 ? (
            <EmptyChart message="Aún no hay reportes de fallas registrados." />
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {recentReports(reports).map((report) => (
                  <article key={report.id} className="flex min-w-0 flex-col justify-between gap-2 rounded-xl border border-sand-200 bg-sand-50 p-3 shadow-sm">
                    <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink-900">{report.assetName || `Activo ${report.assetId}`}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-forest-700">{report.tipoFalla || 'Falla sin clasificar'}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-600">{report.descripcion || 'Sin descripción'}</p>
                    </div>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-sand-200 pt-1 text-xs">
                    <span className="max-w-full rounded-full border border-sand-200 bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-600">{statusLabel(report.estado)}</span>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-ink-600">{formatDate(report.fechaReporte)}</span>
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
                <article key={maintenance.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-sand-200 bg-sand-50 p-3 shadow-sm">
                  <span className="shrink-0 rounded-xl border border-forest-300/40 bg-forest-300/20 p-2.5 text-forest-700">
                    <CalendarClock size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink-900">{maintenance.assetName || `Activo ${maintenance.assetId}`}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-600">{maintenance.technicianName || 'Sin técnico asignado'}</p>
                  </div>
                  <span className="shrink-0 text-right text-xs font-medium text-ink-600">{formatDate(maintenance.scheduledAt)}</span>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </section>

      {/* Pie de página aclaratorio */}
      <div className="flex items-center gap-2 pt-2 text-xs leading-normal text-ink-600">
        <CheckCircle2 size={15} className="shrink-0 text-forest-500" />
        <span>Las métricas se calculan con registros consultados al backend; no se usan datos de demostración.</span>
      </div>
    </div>
  );
}