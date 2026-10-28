import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Clock3,
  FileWarning,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  Tractor,
  UsersRound,
  Wrench,
  Activity as ActivityIcon,
  ClipboardCheck,
  X,
} from 'lucide-react';
import LogoutButton from '../../components/LogoutButton';
import DashboardRoleSwitcher from '../../components/DashboardRoleSwitcher';
import FailureReportModal from '../../components/FailureReportModal';
import Inventario from '../Compartido/Inventario';
import Entradas from '../Compartido/Entradas';
import Salidas from '../Compartido/Salidas';
import Reportes from '../Compartido/Reportes';
import MantenimientoPredictivo from '../Compartido/MantenimientoPredictivo';
import { getAssets, getFailureReports } from '../../services/assetService';
import { getInventoryGroups } from '../../services/inventoryService';
import { getPreventiveMaintenances } from '../../services/preventiveMaintenanceService';

const NAVIGATION = [
  { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'Grupos de Trabajo', label: 'Grupos de Trabajo', icon: UsersRound },
  { id: 'Activos', label: 'Activos', icon: Tractor },
  { id: 'Reporte de Fallas', label: 'Reporte de Fallas', icon: FileWarning },
  { id: 'Inventario', label: 'Inventario', icon: Package },
  { id: 'Entradas', label: 'Entradas', icon: ArrowDownLeft },
  { id: 'Salidas', label: 'Salidas', icon: ArrowUpRight },
  { id: 'Reportes', label: 'Reportes', icon: BarChart3 },
  { id: 'Mantenimiento', label: 'Mantenimiento', icon: ActivityIcon },
  { id: 'Mantenimiento Preventivo', label: 'Mantenimiento Preventivo', icon: ClipboardCheck },
];

const REPORT_STATUSES = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  ESPERA_REPUESTO: 'Espera repuesto',
  RESUELTO: 'Resuelto',
};

const MAINTENANCE_STATUSES = {
  SCHEDULED: 'Programado',
  COMPLETED: 'Completado',
  PARTIALLY_COMPLETED: 'Parcialmente completado',
  URGENT_CORRECTIVE: 'Requiere correctivo',
};

const PRIORITIES = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

const inputClass =
  'w-full min-h-[44px] rounded-lg border border-[#36556f] bg-[#102a3d] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50';

function errorMessage(error) {
  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    'No se pudieron cargar los datos.'
  );
}

function formatDate(value, withTime = false) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat(
    'es-CO',
    withTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' },
  ).format(date);
}

function dateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function statusTone(status) {
  if (status === 'RESUELTO' || status === 'COMPLETED' || status === 'OPERATIONAL') {
    return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300';
  }
  if (
    status === 'ALTA' ||
    status === 'CRITICA' ||
    status === 'URGENT_CORRECTIVE' ||
    status === 'IN_REPAIR'
  ) {
    return 'border-red-400/30 bg-red-500/15 text-red-300';
  }
  if (
    status === 'EN_REVISION' ||
    status === 'PARTIALLY_COMPLETED' ||
    status === 'ESPERA_REPUESTO' ||
    status === 'MEDIA'
  ) {
    return 'border-amber-400/30 bg-amber-500/15 text-amber-300';
  }
  return 'border-cyan-400/30 bg-cyan-500/15 text-cyan-300';
}

function Badge({ children, tone = 'border-slate-500/30 bg-slate-500/15 text-slate-300' }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}
    >
      {children}
    </span>
  );
}

function MetricCard({ label, value, detail, icon: Icon, accent = 'text-cyan-300' }) {
  return (
    <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-lg min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">{detail}</p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0d2030] ${accent}`}
        >
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, description, children }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h1>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ReportDetails({ report, onClose }) {
  if (!report) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-details-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#36556f] bg-[#102637] p-5 sm:p-6 shadow-2xl space-y-5 min-w-0 text-white"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Seguimiento de falla · #{report.id}
            </p>
            <h2 id="report-details-title" className="mt-1 text-base sm:text-lg font-bold text-white">
              {report.assetName || 'Activo sin nombre'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone={statusTone(report.estado)}>
            {REPORT_STATUSES[report.estado] || report.estado || 'Sin estado'}
          </Badge>
          <Badge tone={statusTone(report.prioridad)}>
            {PRIORITIES[report.prioridad] || report.prioridad || 'Sin prioridad'}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-[#2d4055] bg-[#0d2030] p-3 text-[10px] sm:gap-3 sm:p-4 sm:text-xs">
          <div>
            <dt className="font-semibold uppercase text-slate-400 text-[10px]">Tipo de falla</dt>
            <dd className="mt-1 font-medium text-slate-200">{report.tipoFalla || 'No especificado'}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase text-slate-400 text-[10px]">Fecha de reporte</dt>
            <dd className="mt-1 font-mono text-slate-200">{formatDate(report.fechaReporte, true)}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase text-slate-400 text-[10px]">Reportado por</dt>
            <dd className="mt-1 font-medium text-slate-200">{report.userName || 'No disponible'}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase text-slate-400 text-[10px]">Técnico asignado</dt>
            <dd className="mt-1 font-medium text-slate-200">
              {report.assignedTechnicianName || 'Pendiente de asignación'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold uppercase text-slate-400 text-[10px]">Grupo / zona</dt>
            <dd className="mt-1 font-medium text-slate-200">{report.groupName || 'Sin grupo asignado'}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase text-slate-400 text-[10px]">Código de activo</dt>
            <dd className="mt-1 font-mono text-slate-200">{report.assetInventoryCode || 'No disponible'}</dd>
          </div>
        </dl>

        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Descripción reportada
          </h3>
          <p className="whitespace-pre-wrap rounded-xl border border-[#2d4055] bg-[#0d2030] p-4 text-xs sm:text-sm text-slate-200 leading-relaxed">
            {report.descripcion || 'Sin descripción.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs text-slate-400">
          <span>Vista de supervisión: este panel no modifica ni asigna la orden.</span>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] w-full sm:w-auto items-center justify-center rounded-lg border border-white/10 bg-[#163044] px-5 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/10 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </section>
    </div>
  );
}

function Overview({ assets, reports, maintenances, onNavigate, errors }) {
  const unresolvedReports = reports.filter((report) => report.estado !== 'RESUELTO');
  const activeAssets = assets.filter((asset) => asset.isActive);
  const inRepair = activeAssets.filter((asset) => asset.operationalStatus === 'IN_REPAIR');
  const scheduledMaintenances = maintenances.filter((item) => item.status === 'SCHEDULED');
  const upcoming = scheduledMaintenances
    .slice()
    .sort((a, b) => dateOnly(a.scheduledAt).localeCompare(dateOnly(b.scheduledAt)))
    .slice(0, 5);

  const statusCounts = Object.entries(REPORT_STATUSES).map(([status, label]) => ({
    status,
    label,
    count: reports.filter((report) => report.estado === status).length,
  }));
  const maxStatusCount = Math.max(1, ...statusCounts.map((item) => item.count));

  return (
    <div className="space-y-6 text-white min-w-0">
      <SectionHeading
        eyebrow="Centro de supervisión"
        title="Resumen operativo"
        description="Estado actual de los activos, fallas reportadas y mantenimientos programados."
      />

      <section className="grid grid-cols-2 gap-2 sm:gap-3.5 xl:grid-cols-4">
        <MetricCard
          label="Activos activos"
          value={errors.assets ? '—' : activeAssets.length}
          detail={
            errors.assets
              ? 'No disponible'
              : `${assets.length - activeAssets.length} inactivos`
          }
          icon={Tractor}
        />
        <MetricCard
          label="Fallas pendientes"
          value={errors.reports ? '—' : unresolvedReports.length}
          detail={errors.reports ? 'No disponible' : 'Reportes sin resolver'}
          icon={AlertTriangle}
          accent="text-amber-300"
        />
        <MetricCard
          label="En reparación"
          value={errors.assets ? '—' : inRepair.length}
          detail={errors.assets ? 'No disponible' : 'Activos en reparación'}
          icon={Activity}
          accent="text-red-300"
        />
        <MetricCard
          label="Mantenimientos programados"
          value={errors.maintenance ? '—' : scheduledMaintenances.length}
          detail={errors.maintenance ? 'No disponible' : 'Pendientes de ejecución'}
          icon={Wrench}
          accent="text-emerald-300"
        />
      </section>

      <section className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 sm:gap-5">
        <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4 min-w-0">
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white">Reportes de fallas</h2>
              <p className="mt-0.5 text-xs text-slate-400">Distribución por estado actual</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('Reporte de Fallas')}
              className="shrink-0 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Ver seguimiento
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {statusCounts.map((item) => (
              <div key={item.status} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="text-white font-mono">{item.count}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#0d2030] border border-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                    style={{
                      width: `${
                        item.count ? Math.max(6, (item.count / maxStatusCount) * 100) : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {errors.reports && (
              <p className="text-xs text-red-200 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                No se pudo cargar la distribución de reportes.
              </p>
            )}
            {!errors.reports && reports.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                No hay reportes de fallas para mostrar.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Próximos mantenimientos
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">Programaciones pendientes más cercanas</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('Mantenimiento Preventivo')}
              className="text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Ver todos
            </button>
          </div>

          {errors.maintenance ? (
            <p className="text-xs text-red-200 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              No se pudo cargar el calendario de mantenimientos.
            </p>
          ) : upcoming.length ? (
            <ul className="divide-y divide-white/5 space-y-1">
              {upcoming.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">
                      {item.assetName || 'Activo sin nombre'}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {item.technicianName || 'Técnico no asignado'} · Atención:{' '}
                      <strong className="text-slate-300">{item.attentionIndex || 'LOW'}</strong>
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-xs font-mono text-cyan-300 font-semibold">
                    {formatDate(item.scheduledAt, true)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-white/5 bg-[#0d2030] p-6 text-center text-xs text-slate-400">
              No hay mantenimientos preventivos programados.
            </p>
          )}
        </article>
      </section>

      <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-xs text-cyan-200 leading-relaxed font-medium">
        Este perfil permite consultar y dar seguimiento operativo. La creación y ejecución de mantenimientos, la gestión de órdenes y la administración de usuarios siguen en los perfiles autorizados.
      </div>
    </div>
  );
}

function OrdersView({ reports, error, title = 'Reporte de Fallas', onReportCreated }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const visibleReports = useMemo(() => {
    return reports.filter((report) => {
      const queryText = query.trim().toLocaleLowerCase('es-CO');
      const matchesQuery =
        !queryText ||
        [
          report.assetName,
          report.tipoFalla,
          report.descripcion,
          report.groupName,
          report.assignedTechnicianName,
        ].some((value) =>
          String(value || '')
            .toLocaleLowerCase('es-CO')
            .includes(queryText),
        );
      return matchesQuery && (statusFilter === 'TODOS' || report.estado === statusFilter);
    });
  }, [reports, query, statusFilter]);

  return (
    <div className="space-y-5 text-white min-w-0">
      <SectionHeading
        eyebrow="Seguimiento operativo"
        title={title}
        description="Consulta los reportes de fallas, su prioridad, zona y responsable técnico."
      >
        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-xs font-semibold text-white shadow-lg shadow-cyan-950/40 transition-colors hover:bg-cyan-500 sm:w-auto"
        >
          <Plus size={17} />
          Reportar falla
        </button>
      </SectionHeading>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#2d4055] bg-[#13293a] p-3 shadow-lg">
        <label className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`${inputClass} pl-10`}
            placeholder="Buscar activo, falla, grupo o técnico..."
            aria-label="Buscar reportes de fallas"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={`${inputClass} sm:w-auto`}
          aria-label="Filtrar por estado"
        >
          <option value="TODOS">Todos los estados</option>
          {Object.entries(REPORT_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <span className="text-xs font-semibold text-slate-400 px-1">
          {visibleReports.length} de {reports.length}
        </span>
      </div>

      {/* Vista Móvil (Tarjetas) */}
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        {visibleReports.map((report) => (
          <article
            key={report.id}
            className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 shadow-md space-y-3"
          >
            <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
              <div>
                <p className="font-bold text-xs text-white">{report.assetName || 'Activo sin nombre'}</p>
                <p className="text-[11px] text-cyan-300">{report.tipoFalla || 'Falla no especificada'}</p>
              </div>
              <Badge tone={statusTone(report.estado)}>
                {REPORT_STATUSES[report.estado] || report.estado || 'Sin estado'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Zona/Grupo</span>
                <span className="text-slate-200 font-medium">{report.groupName || 'Sin grupo'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Técnico</span>
                <span className="text-slate-200 font-medium">{report.assignedTechnicianName || 'Sin asignar'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <Badge tone={statusTone(report.prioridad)}>
                {PRIORITIES[report.prioridad] || report.prioridad || 'Sin prioridad'}
              </Badge>
              <button
                type="button"
                onClick={() => setSelectedReport(report)}
                className="font-bold text-cyan-300 hover:text-cyan-200 p-1"
              >
                Ver detalle
              </button>
            </div>
          </article>
        ))}

        {!visibleReports.length && (
          <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-8 text-center text-xs text-slate-400">
            {error ? 'No se pudieron cargar los reportes.' : 'No hay reportes que coincidan con el filtro.'}
          </div>
        )}
      </div>

      {/* Vista Escritorio (Tabla) */}
      <div className="hidden lg:block overflow-hidden rounded-xl border border-[#2d4055] bg-[#13293a] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs sm:text-sm">
            <thead className="border-b border-[#2d4055] bg-[#0b1d2a] text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Activo / Falla</th>
                <th className="px-4 py-3.5">Zona</th>
                <th className="px-4 py-3.5">Reportado</th>
                <th className="px-4 py-3.5">Técnico</th>
                <th className="px-4 py-3.5">Prioridad</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visibleReports.map((report) => (
                <tr key={report.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="max-w-[240px] px-4 py-3.5">
                    <p className="truncate font-bold text-white">
                      {report.assetName || 'Activo sin nombre'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {report.tipoFalla || 'Falla no especificada'}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">{report.groupName || 'Sin grupo'}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-300">
                    {formatDate(report.fechaReporte, true)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {report.assignedTechnicianName || 'Sin asignar'}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={statusTone(report.prioridad)}>
                      {PRIORITIES[report.prioridad] || report.prioridad || 'Sin prioridad'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={statusTone(report.estado)}>
                      {REPORT_STATUSES[report.estado] || report.estado || 'Sin estado'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="font-bold text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
              {!visibleReports.length && (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-xs text-slate-400">
                    {error
                      ? 'No se pudieron cargar los reportes.'
                      : 'No hay reportes que coincidan con el filtro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReportDetails report={selectedReport} onClose={() => setSelectedReport(null)} />
      {showReportModal && (
        <FailureReportModal
          onClose={() => setShowReportModal(false)}
          onSaved={() => {
            setShowReportModal(false);
            onReportCreated?.();
          }}
        />
      )}
    </div>
  );
}

function WorkGroupsView({ groups, error }) {
  return (
    <div className="space-y-5 text-white min-w-0">
      <SectionHeading
        eyebrow="Organización operativa"
        title="Grupos de Trabajo"
        description="Consulta los grupos y la información de sus integrantes. La administración de grupos permanece exclusiva del administrador."
      />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200"
        >
          {error}
        </div>
      )}

      {!error && groups.length === 0 && (
        <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-10 text-center text-xs text-slate-400">
          No hay grupos disponibles para tu usuario.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {groups.map((group) => (
          <article
            key={group.id}
            className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm sm:text-base font-bold text-white">{group.name}</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {group.description || 'Sin descripción registrada'}
                </p>
              </div>
              <Badge
                tone={
                  group.active
                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-500/30 bg-slate-500/15 text-slate-300'
                }
              >
                {group.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Líder asignado</span>
              <span className="font-bold text-cyan-300">{group.leaderName || 'Sin líder asignado'}</span>
            </div>

            <div className="space-y-2 pt-1 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Integrantes del grupo</span>
                <span className="font-mono text-slate-400">
                  {Array.isArray(group.members) ? group.members.length : 0}
                </span>
              </div>
              {Array.isArray(group.members) && group.members.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {group.members.map((member) => (
                    <span
                      key={member.id}
                      className="rounded-lg border border-[#36556f] bg-[#0d2030] px-3 py-1.5 text-xs text-slate-300 font-medium"
                    >
                      {member.nombre || member.email || `Usuario ${member.id}`}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Sin integrantes registrados.</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function MaintenanceView({ maintenances, error }) {
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [expandedId, setExpandedId] = useState(null);
  const today = dateOnly(new Date().toISOString());

  const visibleMaintenances = maintenances.filter(
    (item) => statusFilter === 'TODOS' || item.status === statusFilter,
  );

  return (
    <div className="space-y-5 text-white min-w-0">
      <SectionHeading
        eyebrow="Plan de mantenimiento"
        title="Mantenimiento preventivo"
        description="Consulta las programaciones, tareas registradas y resultados de ejecución."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2d4055] bg-[#13293a] p-3 shadow-lg">
        <p className="text-xs font-semibold text-slate-400">
          {visibleMaintenances.length} de {maintenances.length} programaciones
        </p>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={`${inputClass} sm:w-auto`}
          aria-label="Filtrar mantenimientos por estado"
        >
          <option value="TODOS">Todos los estados</option>
          {Object.entries(MAINTENANCE_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3.5">
        {visibleMaintenances.map((item) => {
          const overdue = item.status === 'SCHEDULED' && dateOnly(item.scheduledAt) < today;
          const expanded = expandedId === item.id;

          return (
            <article key={item.id} className="rounded-xl border border-[#2d4055] bg-[#13293a] shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold text-white">
                      {item.assetName || 'Activo sin nombre'}
                    </h2>
                    <Badge tone={statusTone(item.status)}>
                      {MAINTENANCE_STATUSES[item.status] || item.status || 'Sin estado'}
                    </Badge>
                    {overdue && (
                      <Badge tone="border-red-400/30 bg-red-500/15 text-red-300">Atrasado</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.categoryName || 'Sin categoría'} · Técnico:{' '}
                    <strong className="text-slate-200">{item.technicianName || 'No asignado'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Programado
                    </p>
                    <p className="mt-0.5 text-xs font-mono font-semibold text-cyan-300">
                      {formatDate(item.scheduledAt, true)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    className="flex min-h-[38px] items-center rounded-lg border border-[#36556f] px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    {expanded ? 'Ocultar' : 'Ver seguimiento'}
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-[#0d2030] p-3 sm:gap-4 sm:p-5 rounded-b-xl">
                  <div className="space-y-3 text-xs">
                    <p>
                      <span className="text-slate-400 font-semibold">Atención:</span>{' '}
                      <span className="text-white font-bold">{item.attentionIndex || 'Baja'}</span>
                    </p>
                    {item.executedAt && (
                      <p>
                        <span className="text-slate-400 font-semibold">Ejecutado:</span>{' '}
                        <span className="text-white font-mono">{formatDate(item.executedAt, true)}</span>
                      </p>
                    )}
                    {item.nextMaintenanceDate && (
                      <p>
                        <span className="text-slate-400 font-semibold">Próxima fecha:</span>{' '}
                        <span className="text-white font-mono">{formatDate(item.nextMaintenanceDate)}</span>
                      </p>
                    )}
                    {item.predictiveContext && (
                      <div>
                        <span className="text-slate-400 font-semibold">Contexto predictivo:</span>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[#102637] p-3 text-slate-200 leading-relaxed border border-white/5">
                          {item.predictiveContext}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 text-xs">
                    {item.workDescription && (
                      <div>
                        <span className="text-slate-400 font-semibold">Trabajo realizado:</span>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[#102637] p-3 text-slate-200 leading-relaxed border border-white/5">
                          {item.workDescription}
                        </p>
                      </div>
                    )}
                    {item.replacedParts && (
                      <p>
                        <span className="text-slate-400 font-semibold">Repuestos:</span>{' '}
                        <span className="text-white">{item.replacedParts}</span>
                      </p>
                    )}
                    {item.technicianNotes && (
                      <div>
                        <span className="text-slate-400 font-semibold">Notas del técnico:</span>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[#102637] p-3 text-slate-200 leading-relaxed border border-white/5">
                          {item.technicianNotes}
                        </p>
                      </div>
                    )}
                    {Array.isArray(item.tasks) && item.tasks.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-slate-400 font-semibold">Tareas registradas:</span>
                        <ul className="space-y-1 rounded-lg bg-[#102637] p-3 border border-white/5">
                          {item.tasks.map((task, index) => (
                            <li
                              key={`${task.description}-${index}`}
                              className={task.completed ? 'text-emerald-300 font-medium' : 'text-slate-300'}
                            >
                              {task.completed ? '✓' : '○'} {task.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {!visibleMaintenances.length && (
          <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-10 text-center text-xs text-slate-400">
            {error
              ? 'No se pudieron cargar los mantenimientos.'
              : 'No hay mantenimientos preventivos para este filtro.'}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        El perfil de supervisor puede consultar el plan y sus resultados, pero no programar ni registrar ejecuciones.
      </p>
    </div>
  );
}

function AssetsView({ assets, error }) {
  const [query, setQuery] = useState('');

  const visibleAssets = assets.filter((asset) =>
    [
      asset.name,
      asset.brand,
      asset.model,
      asset.inventoryCode,
      asset.location,
      asset.responsibleName,
    ].some((value) =>
      String(value || '')
        .toLocaleLowerCase('es-CO')
        .includes(query.trim().toLocaleLowerCase('es-CO')),
    ),
  );

  return (
    <div className="space-y-5 text-white min-w-0">
      <SectionHeading
        eyebrow="Equipos y maquinaria"
        title="Activos"
        description="Consulta el estado operativo y el responsable registrado de cada activo."
      />

      <label className="relative block max-w-xl">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={`${inputClass} pl-10`}
          placeholder="Buscar activo, código, ubicación o responsable..."
          aria-label="Buscar activos"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 sm:gap-3.5 xl:grid-cols-3">
        {visibleAssets.map((asset) => (
          <article
            key={asset.id}
            className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-3"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="min-w-0">
                <h2 className="truncate text-xs sm:text-sm font-bold text-white">
                  {asset.name || 'Activo sin nombre'}
                </h2>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {[asset.brand, asset.model].filter(Boolean).join(' ') ||
                    'Marca y modelo no registrados'}
                </p>
              </div>
              <Badge tone={statusTone(asset.operationalStatus)}>
                {String(asset.operationalStatus || 'Sin estado').replaceAll('_', ' ')}
              </Badge>
            </div>

            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Código:</dt>
                <dd className="truncate font-mono font-semibold text-slate-200">
                  {asset.inventoryCode || 'Sin código'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Ubicación:</dt>
                <dd className="truncate text-slate-200 font-medium">
                  {asset.location || 'Sin ubicación'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Responsable:</dt>
                <dd className="truncate text-slate-200 font-medium">
                  {asset.responsibleName || 'Sin responsable'}
                </dd>
              </div>
              <div className="flex justify-between gap-3 pt-1 border-t border-white/5">
                <dt className="text-slate-400">Condición:</dt>
                <dd className="text-slate-200 font-semibold">
                  {asset.isActive ? 'Activo' : 'Inactivo'}
                  {asset.hasMotor ? ' · Con motor' : ''}
                </dd>
              </div>
            </dl>
          </article>
        ))}

        {!visibleAssets.length && (
          <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-10 text-center text-xs text-slate-400 md:col-span-2 xl:col-span-3">
            {error ? 'No se pudieron cargar los activos.' : 'No hay activos que coincidan con la búsqueda.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupervisorDashboard() {
  const [activeView, setActiveView] = useState('Dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [reports, setReports] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const userName = localStorage.getItem('nombre') || 'Supervisor';
  const initials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'S';

  useEffect(() => {
    let current = true;
    Promise.allSettled([
      getAssets(),
      getFailureReports(),
      getPreventiveMaintenances(),
      getInventoryGroups(),
    ])
      .then(([assetsResult, reportsResult, maintenanceResult, groupsResult]) => {
        if (!current) return;
        const nextErrors = {};
        const applyResult = (result, key, setter, label) => {
          if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            setter(result.value);
          } else if (result.status === 'fulfilled') {
            setter([]);
            nextErrors[key] = `El servidor devolvió un formato no válido para ${label}.`;
          } else {
            nextErrors[key] = errorMessage(result.reason);
          }
        };
        applyResult(assetsResult, 'assets', setAssets, 'activos');
        applyResult(reportsResult, 'reports', setReports, 'reportes de fallas');
        applyResult(maintenanceResult, 'maintenance', setMaintenances, 'mantenimientos');
        applyResult(groupsResult, 'groups', setGroups, 'grupos de trabajo');
        setErrors(nextErrors);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [refreshKey]);

  const selectedGroup = groups.find((group) => String(group.id) === String(selectedGroupId));
  const inventoryScopeProps = {
    variant: 'dark',
    groupId: selectedGroupId,
    groupName: selectedGroup?.name,
    scoped: true,
  };

  const showInventoryScope = ['Inventario', 'Entradas', 'Salidas', 'Reportes'].includes(activeView);

  const handleNavClick = (id) => {
    setActiveView(id);
    setMobileMenuOpen(false);
  };

  const content =
    activeView === 'Grupos de Trabajo' ? (
      <WorkGroupsView groups={groups} error={errors.groups} />
    ) : activeView === 'Activos' ? (
      <AssetsView assets={assets} error={errors.assets} />
    ) : activeView === 'Reporte de Fallas' ? (
      <OrdersView
        reports={reports}
        error={errors.reports}
        title="Reporte de Fallas"
        onReportCreated={() => setRefreshKey((value) => value + 1)}
      />
    ) : activeView === 'Inventario' ? (
      <Inventario key={`inventory-${selectedGroupId ?? 'central'}`} {...inventoryScopeProps} />
    ) : activeView === 'Entradas' ? (
      <Entradas
        key={`entries-${selectedGroupId ?? 'central'}`}
        {...inventoryScopeProps}
        groups={groups}
        readOnly
      />
    ) : activeView === 'Salidas' ? (
      <Salidas
        key={`outputs-${selectedGroupId ?? 'central'}`}
        {...inventoryScopeProps}
        groups={groups}
        readOnly
      />
    ) : activeView === 'Reportes' ? (
      <Reportes key={`reports-${selectedGroupId ?? 'central'}`} {...inventoryScopeProps} />
    ) : activeView === 'Mantenimiento' ? (
      <MantenimientoPredictivo />
    ) : activeView === 'Mantenimiento Preventivo' ? (
      <MaintenanceView maintenances={maintenances} error={errors.maintenance} />
    ) : (
      <Overview
        assets={assets}
        reports={reports}
        maintenances={maintenances}
        onNavigate={setActiveView}
        errors={errors}
      />
    );

  return (
    <div className="flex min-h-screen bg-[#020d16] font-sans text-white min-w-0">
      {/* Backdrop Móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[#1f3446] bg-[#0d1f2d] transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[70px] items-center justify-between border-b border-[#1f3446] px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-[#020d16] shadow-md shadow-cyan-950/40">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-cyan-400 tracking-wide">
                AgroSentinel
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Supervisor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
            className="text-slate-400 hover:text-white md:hidden p-1"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto" aria-label="Navegación de supervisor">
          {NAVIGATION.map(({ id, label, icon: Icon }) => {
            const isActive = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNavClick(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-cyan-300' : 'text-slate-400'} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#1f3446] p-4 text-[11px] text-slate-400 text-center leading-relaxed">
          Perfil de consulta y seguimiento operativo.
        </div>
      </aside>

      {/* Ámbito Principal */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Encabezado Superior */}
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#1f3446] bg-[#0d2437]/90 px-4 sm:px-7 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#102a3d] text-slate-200 hover:bg-white/10 md:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium min-w-0">
              <span className="hidden sm:inline font-bold text-cyan-300 truncate">
                AgroSentinel
              </span>
              <span className="hidden sm:inline text-slate-500">|</span>
              <span className="text-slate-200 truncate">
                {NAVIGATION.find((item) => item.id === activeView)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <DashboardRoleSwitcher />
            {showInventoryScope && (
              <label className="flex items-center gap-2">
                <span className="hidden text-xs text-slate-400 sm:inline">Bodega</span>
                <select
                  value={selectedGroupId ?? 'central'}
                  onChange={(event) =>
                    setSelectedGroupId(
                      event.target.value === 'central' ? null : Number(event.target.value),
                    )
                  }
                  aria-label="Filtrar por bodega o grupo"
                  className="min-h-[38px] max-w-[130px] sm:max-w-[180px] rounded-lg border border-[#36556f] bg-[#102a3d] px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                >
                  <option value="central">Bodega central</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setErrors({});
                setRefreshKey((value) => value + 1);
              }}
              disabled={loading}
              aria-label="Actualizar panel"
              className="flex min-h-[38px] items-center gap-2 rounded-lg border border-[#36556f] bg-[#102a3d] px-3 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <LogoutButton className="text-slate-300 hover:bg-white/10 hover:text-white [&>span]:hidden sm:[&>span]:inline-flex" />

            <div className="hidden text-right leading-tight sm:block">
              <p className="max-w-[140px] truncate text-xs font-bold text-white">{userName}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                Supervisor
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 text-xs font-bold text-white shadow-md">
              {initials}
            </div>
          </div>
        </header>

        {/* Contenido Interactivo */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 min-w-0">
          {Object.entries(errors).map(([key, message]) => (
            <p
              key={key}
              role="alert"
              className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
            >
              {message}
            </p>
          ))}

          {loading && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3.5 text-xs font-semibold text-cyan-200">
              <Clock3 size={16} className="animate-pulse" />
              <span>Actualizando datos del sistema…</span>
            </div>
          )}

          {content}
        </main>
      </div>
    </div>
  );
}