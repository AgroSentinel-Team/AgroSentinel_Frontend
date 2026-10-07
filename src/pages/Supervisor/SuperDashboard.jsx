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
  Package,
  RefreshCw,
  Search,
  Tractor,
  UsersRound,
  Wrench,
  Activity as ActivityIcon,
  ClipboardCheck,
} from 'lucide-react';
import LogoutButton from '../../components/LogoutButton';
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

const inputClass = 'rounded-lg border border-[#36556f] bg-[#102a3d] px-3 py-2 text-[12px] text-white outline-none focus:border-cyan-400';

function errorMessage(error) {
  return error.response?.data?.detail
    || error.response?.data?.message
    || error.message
    || 'No se pudieron cargar los datos.';
}

function formatDate(value, withTime = false) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
}

function dateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function statusTone(status) {
  if (status === 'RESUELTO' || status === 'COMPLETED' || status === 'OPERATIONAL') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }
  if (status === 'ALTA' || status === 'CRITICA' || status === 'URGENT_CORRECTIVE' || status === 'IN_REPAIR') {
    return 'border-red-400/30 bg-red-400/10 text-red-200';
  }
  if (status === 'EN_REVISION' || status === 'PARTIALLY_COMPLETED' || status === 'ESPERA_REPUESTO') {
    return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  }
  return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200';
}

function Badge({ children, tone = 'border-slate-400/30 bg-slate-400/10 text-slate-200' }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{children}</span>;
}

function MetricCard({ label, value, detail, icon: Icon, accent = 'text-cyan-300' }) {
  return (
    <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
        </div>
        <span className={`rounded-lg bg-white/5 p-2.5 ${accent}`}><Icon size={18} /></span>
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, description, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{eyebrow}</p>
        <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{title}</h1>
        <p className="mt-1 text-[12px] text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ReportDetails({ report, onClose }) {
  if (!report) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="report-details-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#36556f] bg-[#102637] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">Seguimiento de falla · #{report.id}</p>
            <h2 id="report-details-title" className="mt-1 text-lg font-semibold text-white">{report.assetName || 'Activo sin nombre'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-[#36556f] px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/5">Cerrar</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={statusTone(report.estado)}>{REPORT_STATUSES[report.estado] || report.estado || 'Sin estado'}</Badge>
          <Badge tone={statusTone(report.prioridad)}>{PRIORITIES[report.prioridad] || report.prioridad || 'Sin prioridad'}</Badge>
        </div>
        <dl className="mt-5 grid gap-4 rounded-lg border border-white/10 bg-[#0b1d2a] p-4 sm:grid-cols-2">
          <div><dt className="text-[10px] uppercase tracking-wide text-slate-500">Tipo de falla</dt><dd className="mt-1 text-[12px] text-white">{report.tipoFalla || 'No especificado'}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wide text-slate-500">Fecha de reporte</dt><dd className="mt-1 text-[12px] text-white">{formatDate(report.fechaReporte, true)}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wide text-slate-500">Reportado por</dt><dd className="mt-1 text-[12px] text-white">{report.userName || 'No disponible'}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wide text-slate-500">Técnico asignado</dt><dd className="mt-1 text-[12px] text-white">{report.assignedTechnicianName || 'Pendiente de asignación'}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wide text-slate-500">Grupo / zona</dt><dd className="mt-1 text-[12px] text-white">{report.groupName || 'Sin grupo asignado'}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wide text-slate-500">Código de activo</dt><dd className="mt-1 text-[12px] text-white">{report.assetInventoryCode || 'No disponible'}</dd></div>
        </dl>
        <div className="mt-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Descripción reportada</h3>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-[#0b1d2a] p-4 text-[12px] leading-relaxed text-slate-200">{report.descripcion || 'Sin descripción.'}</p>
        </div>
        <p className="mt-4 text-[10px] text-slate-500">Vista de supervisión: este panel no modifica ni asigna la orden.</p>
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
    <div className="space-y-5">
      <SectionHeading eyebrow="Centro de supervisión" title="Resumen operativo" description="Estado actual de los activos, fallas reportadas y mantenimientos programados." />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Activos activos" value={errors.assets ? '—' : activeAssets.length} detail={errors.assets ? 'No disponible' : `${assets.length - activeAssets.length} inactivos`} icon={Tractor} />
        <MetricCard label="Fallas pendientes" value={errors.reports ? '—' : unresolvedReports.length} detail={errors.reports ? 'No disponible' : 'Reportes sin resolver'} icon={AlertTriangle} accent="text-amber-300" />
        <MetricCard label="En reparación" value={errors.assets ? '—' : inRepair.length} detail={errors.assets ? 'No disponible' : 'Activos con estado de reparación'} icon={Activity} accent="text-red-300" />
        <MetricCard label="Mantenimientos programados" value={errors.maintenance ? '—' : scheduledMaintenances.length} detail={errors.maintenance ? 'No disponible' : 'Pendientes de ejecución'} icon={Wrench} accent="text-emerald-300" />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-[14px] font-semibold text-white">Reportes de fallas</h2><p className="mt-1 text-[11px] text-slate-400">Distribución por estado actual</p></div>
            <button type="button" onClick={() => onNavigate('Reporte de Fallas')} className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200">Ver seguimiento</button>
          </div>
          <div className="mt-5 space-y-4">
            {statusCounts.map((item) => (
              <div key={item.status}>
                <div className="mb-1.5 flex justify-between text-[11px]"><span className="text-slate-300">{item.label}</span><span className="font-semibold text-white">{item.count}</span></div>
                <div className="h-2 rounded-full bg-[#0b1d2a]"><div className="h-2 rounded-full bg-cyan-500 transition-all" style={{ width: `${item.count ? Math.max(5, (item.count / maxStatusCount) * 100) : 0}%` }} /></div>
              </div>
            ))}
            {errors.reports && <p className="text-[11px] text-red-200">No se pudo cargar la distribución de reportes.</p>}
            {!errors.reports && reports.length === 0 && <p className="text-[11px] text-slate-500">No hay reportes de fallas para mostrar.</p>}
          </div>
        </article>
        <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-[14px] font-semibold text-white">Próximos mantenimientos</h2><p className="mt-1 text-[11px] text-slate-400">Programaciones pendientes más cercanas</p></div>
            <button type="button" onClick={() => onNavigate('Mantenimiento Preventivo')} className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200">Ver todos</button>
          </div>
          {errors.maintenance ? <p className="mt-4 text-[11px] text-red-200">No se pudo cargar el calendario de mantenimientos.</p> : upcoming.length ? <ul className="mt-4 divide-y divide-white/5">
            {upcoming.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0"><p className="truncate text-[12px] font-medium text-white">{item.assetName || 'Activo sin nombre'}</p><p className="mt-1 truncate text-[10px] text-slate-400">{item.technicianName || 'Técnico no asignado'} · Atención {item.attentionIndex || 'LOW'}</p></div>
                <span className="shrink-0 text-right text-[10px] text-cyan-200">{formatDate(item.scheduledAt, true)}</span>
              </li>
            ))}
          </ul> : <p className="mt-5 rounded-lg border border-white/5 bg-[#0b1d2a] p-4 text-center text-[11px] text-slate-400">No hay mantenimientos preventivos programados.</p>}
        </article>
      </section>
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-[11px] text-slate-300">
        Este perfil permite consultar y dar seguimiento. La creación y ejecución de mantenimientos, la gestión de órdenes y la administración de usuarios siguen en los perfiles autorizados.
      </div>
    </div>
  );
}

function OrdersView({ reports, error, title = 'Reporte de Fallas' }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [selectedReport, setSelectedReport] = useState(null);
  const visibleReports = useMemo(() => reports.filter((report) => {
    const queryText = query.trim().toLocaleLowerCase('es-CO');
    const matchesQuery = !queryText || [
      report.assetName,
      report.tipoFalla,
      report.descripcion,
      report.groupName,
      report.assignedTechnicianName,
    ].some((value) => String(value || '').toLocaleLowerCase('es-CO').includes(queryText));
    return matchesQuery && (statusFilter === 'TODOS' || report.estado === statusFilter);
  }), [reports, query, statusFilter]);

  return (
    <div className="space-y-4">
      <SectionHeading eyebrow="Seguimiento operativo" title={title} description="Consulta los reportes de fallas, su prioridad, zona y responsable técnico." />
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#2d4055] bg-[#13293a] p-3">
        <label className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} w-full pl-9`} placeholder="Buscar activo, falla, grupo o técnico" aria-label="Buscar reportes de fallas" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass} aria-label="Filtrar por estado">
          <option value="TODOS">Todos los estados</option>
          {Object.entries(REPORT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span className="px-2 text-[11px] text-slate-400">{visibleReports.length} de {reports.length}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#2d4055] bg-[#13293a]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[11px]">
            <thead className="border-b border-[#2d4055] bg-[#102a3d] text-slate-400"><tr>
              <th className="px-4 py-3 font-medium">Activo / falla</th><th className="px-4 py-3 font-medium">Zona</th><th className="px-4 py-3 font-medium">Reportado</th><th className="px-4 py-3 font-medium">Técnico</th><th className="px-4 py-3 font-medium">Prioridad</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Detalle</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {visibleReports.map((report) => (
                <tr key={report.id} className="hover:bg-white/[0.025]">
                  <td className="max-w-[240px] px-4 py-3"><p className="truncate font-medium text-white">{report.assetName || 'Activo sin nombre'}</p><p className="mt-1 truncate text-slate-400">{report.tipoFalla || 'Falla no especificada'}</p></td>
                  <td className="px-4 py-3 text-slate-300">{report.groupName || 'Sin grupo'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{formatDate(report.fechaReporte, true)}</td>
                  <td className="px-4 py-3 text-slate-300">{report.assignedTechnicianName || 'Sin asignar'}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(report.prioridad)}>{PRIORITIES[report.prioridad] || report.prioridad || 'Sin prioridad'}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={statusTone(report.estado)}>{REPORT_STATUSES[report.estado] || report.estado || 'Sin estado'}</Badge></td>
                  <td className="px-4 py-3"><button type="button" onClick={() => setSelectedReport(report)} className="font-semibold text-cyan-300 hover:text-cyan-100">Ver detalle</button></td>
                </tr>
              ))}
              {!visibleReports.length && <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-400">{error ? 'No se pudieron cargar los reportes.' : 'No hay reportes que coincidan con el filtro.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <ReportDetails report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}

function WorkGroupsView({ groups, error }) {
  return (
    <div className="space-y-4">
      <SectionHeading eyebrow="Organización operativa" title="Grupos de Trabajo" description="Consulta los grupos y la información de sus integrantes. La administración de grupos y roles permanece exclusiva del administrador." />
      {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-[11px] text-red-200">{error}</p>}
      {!error && groups.length === 0 && <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-10 text-center text-[11px] text-slate-400">No hay grupos disponibles para tu usuario.</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <article key={group.id} className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-semibold text-white">{group.name}</h2>
                <p className="mt-1 text-[11px] text-slate-400">{group.description || 'Sin descripción registrada'}</p>
              </div>
              <Badge tone={group.active ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-slate-400/30 bg-slate-400/10 text-slate-300'}>
                {group.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px]">
              <span className="text-slate-500">Líder</span>
              <span className="text-slate-200">{group.leaderName || 'Sin líder asignado'}</span>
            </div>
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-300">Integrantes</span>
                <span className="text-slate-500">{Array.isArray(group.members) ? group.members.length : 0}</span>
              </div>
              {Array.isArray(group.members) && group.members.length > 0
                ? <div className="flex flex-wrap gap-2">{group.members.map((member) => <span key={member.id} className="rounded-md border border-[#36556f] bg-[#102a3d] px-2.5 py-1.5 text-[10px] text-slate-300">{member.nombre || member.email || `Usuario ${member.id}`}</span>)}</div>
                : <p className="text-[10px] text-slate-500">Sin integrantes registrados.</p>}
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
  const visibleMaintenances = maintenances.filter((item) => statusFilter === 'TODOS' || item.status === statusFilter);

  return (
    <div className="space-y-4">
      <SectionHeading eyebrow="Plan de mantenimiento" title="Mantenimiento preventivo" description="Consulta las programaciones, tareas registradas y resultados de ejecución." />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2d4055] bg-[#13293a] p-3">
        <p className="text-[11px] text-slate-400">{visibleMaintenances.length} de {maintenances.length} programaciones</p>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass} aria-label="Filtrar mantenimientos por estado">
          <option value="TODOS">Todos los estados</option>
          {Object.entries(MAINTENANCE_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        {visibleMaintenances.map((item) => {
          const overdue = item.status === 'SCHEDULED' && dateOnly(item.scheduledAt) < today;
          const expanded = expandedId === item.id;
          return (
            <article key={item.id} className="rounded-xl border border-[#2d4055] bg-[#13293a]">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-[13px] font-semibold text-white">{item.assetName || 'Activo sin nombre'}</h2><Badge tone={statusTone(item.status)}>{MAINTENANCE_STATUSES[item.status] || item.status || 'Sin estado'}</Badge>{overdue && <Badge tone="border-red-400/30 bg-red-400/10 text-red-200">Atrasado</Badge>}</div>
                  <p className="mt-1 text-[11px] text-slate-400">{item.categoryName || 'Sin categoría'} · Técnico: {item.technicianName || 'No asignado'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><p className="text-[9px] uppercase tracking-wide text-slate-500">Programado</p><p className="mt-1 text-[11px] text-cyan-200">{formatDate(item.scheduledAt, true)}</p></div>
                  <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : item.id)} className="rounded-lg border border-[#36556f] px-3 py-2 text-[10px] font-semibold text-slate-200 hover:bg-white/5">{expanded ? 'Ocultar' : 'Ver seguimiento'}</button>
                </div>
              </div>
              {expanded && (
                <div className="grid gap-4 border-t border-white/5 p-4 md:grid-cols-2">
                  <div className="space-y-3 text-[11px]">
                    <p><span className="text-slate-500">Atención:</span> <span className="text-white">{item.attentionIndex || 'Baja'}</span></p>
                    {item.executedAt && <p><span className="text-slate-500">Ejecutado:</span> <span className="text-white">{formatDate(item.executedAt, true)}</span></p>}
                    {item.nextMaintenanceDate && <p><span className="text-slate-500">Próxima fecha:</span> <span className="text-white">{formatDate(item.nextMaintenanceDate)}</span></p>}
                    {item.predictiveContext && <p><span className="text-slate-500">Contexto predictivo:</span><span className="mt-1 block whitespace-pre-wrap text-slate-200">{item.predictiveContext}</span></p>}
                  </div>
                  <div className="space-y-3 text-[11px]">
                    {item.workDescription && <p><span className="text-slate-500">Trabajo realizado:</span><span className="mt-1 block whitespace-pre-wrap text-slate-200">{item.workDescription}</span></p>}
                    {item.replacedParts && <p><span className="text-slate-500">Repuestos:</span> <span className="text-white">{item.replacedParts}</span></p>}
                    {item.technicianNotes && <p><span className="text-slate-500">Notas del técnico:</span><span className="mt-1 block whitespace-pre-wrap text-slate-200">{item.technicianNotes}</span></p>}
                    {Array.isArray(item.tasks) && item.tasks.length > 0 && <div><p className="mb-1 text-slate-500">Tareas</p><ul className="space-y-1">{item.tasks.map((task, index) => <li key={`${task.description}-${index}`} className={task.completed ? 'text-emerald-200' : 'text-slate-300'}>{task.completed ? '✓' : '○'} {task.description}</li>)}</ul></div>}
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {!visibleMaintenances.length && <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-10 text-center text-[11px] text-slate-400">{error ? 'No se pudieron cargar los mantenimientos.' : 'No hay mantenimientos preventivos para este filtro.'}</div>}
      </div>
      <p className="text-[10px] text-slate-500">El perfil de supervisor puede consultar el plan y sus resultados, pero no programar ni registrar ejecuciones.</p>
    </div>
  );
}

function AssetsView({ assets, error }) {
  const [query, setQuery] = useState('');
  const visibleAssets = assets.filter((asset) => [
    asset.name,
    asset.brand,
    asset.model,
    asset.inventoryCode,
    asset.location,
    asset.responsibleName,
  ].some((value) => String(value || '').toLocaleLowerCase('es-CO').includes(query.trim().toLocaleLowerCase('es-CO'))));

  return (
    <div className="space-y-4">
      <SectionHeading eyebrow="Equipos y maquinaria" title="Activos" description="Consulta el estado operativo y el responsable registrado de cada activo." />
      <label className="relative block max-w-xl">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} w-full pl-9`} placeholder="Buscar activo, código, ubicación o responsable" aria-label="Buscar activos" />
      </label>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleAssets.map((asset) => (
          <article key={asset.id} className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="truncate text-[13px] font-semibold text-white">{asset.name || 'Activo sin nombre'}</h2><p className="mt-1 truncate text-[10px] text-slate-400">{[asset.brand, asset.model].filter(Boolean).join(' ') || 'Marca y modelo no registrados'}</p></div>
              <Badge tone={statusTone(asset.operationalStatus)}>{String(asset.operationalStatus || 'Sin estado').replaceAll('_', ' ')}</Badge>
            </div>
            <dl className="mt-4 space-y-2 border-t border-white/5 pt-3 text-[11px]">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Código</dt><dd className="truncate text-right text-slate-200">{asset.inventoryCode || 'Sin código'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Ubicación</dt><dd className="truncate text-right text-slate-200">{asset.location || 'Sin ubicación'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Responsable</dt><dd className="truncate text-right text-slate-200">{asset.responsibleName || 'Sin responsable'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Condición</dt><dd className="text-right text-slate-200">{asset.isActive ? 'Activo' : 'Inactivo'}{asset.hasMotor ? ' · Con motor' : ''}</dd></div>
            </dl>
          </article>
        ))}
        {!visibleAssets.length && <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-10 text-center text-[11px] text-slate-400 md:col-span-2 xl:col-span-3">{error ? 'No se pudieron cargar los activos.' : 'No hay activos que coincidan con la búsqueda.'}</div>}
      </div>
    </div>
  );
}

export default function SupervisorDashboard() {
  const [activeView, setActiveView] = useState('Dashboard');
  const [assets, setAssets] = useState([]);
  const [reports, setReports] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const userName = localStorage.getItem('nombre') || 'Supervisor';
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'S';

  useEffect(() => {
    let current = true;
    Promise.allSettled([getAssets(), getFailureReports(), getPreventiveMaintenances(), getInventoryGroups()])
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
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [refreshKey]);

  const selectedGroup = groups.find((group) => String(group.id) === String(selectedGroupId));
  const inventoryScopeProps = {
    variant: 'dark',
    groupId: selectedGroupId,
    groupName: selectedGroup?.name,
    scoped: true,
  };
  const showInventoryScope = ['Inventario', 'Entradas', 'Salidas', 'Reportes'].includes(activeView);
  const content = activeView === 'Grupos de Trabajo'
    ? <WorkGroupsView groups={groups} error={errors.groups} />
    : activeView === 'Activos'
      ? <AssetsView assets={assets} error={errors.assets} />
      : activeView === 'Reporte de Fallas'
        ? <OrdersView reports={reports} error={errors.reports} title="Reporte de Fallas" />
        : activeView === 'Inventario'
          ? <Inventario key={`inventory-${selectedGroupId ?? 'central'}`} {...inventoryScopeProps} />
          : activeView === 'Entradas'
            ? <Entradas key={`entries-${selectedGroupId ?? 'central'}`} {...inventoryScopeProps} groups={groups} readOnly />
            : activeView === 'Salidas'
              ? <Salidas key={`outputs-${selectedGroupId ?? 'central'}`} {...inventoryScopeProps} groups={groups} readOnly />
              : activeView === 'Reportes'
                ? <Reportes key={`reports-${selectedGroupId ?? 'central'}`} {...inventoryScopeProps} />
                : activeView === 'Mantenimiento'
                  ? <MantenimientoPredictivo />
                  : activeView === 'Mantenimiento Preventivo'
                    ? <MaintenanceView maintenances={maintenances} error={errors.maintenance} />
                    : <Overview assets={assets} reports={reports} maintenances={maintenances} onNavigate={setActiveView} errors={errors} />;

  return (
    <div className="min-h-screen bg-[#071521] font-sans text-white">
      <div className="flex min-h-screen w-full overflow-hidden bg-[#020d16]">
        <aside className="hidden w-[190px] flex-none border-r border-[#1b2f3f] bg-[#0d1f2d] md:block">
          <div className="flex h-[58px] items-center gap-2 border-b border-[#1b2f3f] px-4">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#0f9ec7]">
              <Activity size={15} strokeWidth={2} className="text-white" />
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-none text-cyan-300">AgroSentinel</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-400">Supervisor</p>
            </div>
          </div>
          <nav className="space-y-1 px-3 py-4" aria-label="Navegación de supervisor">
            {NAVIGATION.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveView(id)}
                aria-current={activeView === id ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[11px] transition ${
                  activeView === id
                    ? 'bg-[#143c50] text-cyan-200 shadow-[inset_0_1px_0_rgba(125,211,252,0.1)]'
                    : 'text-slate-300 hover:bg-[#143c50] hover:text-white'
                }`}
              >
                <Icon size={14} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="mx-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-[9px] leading-relaxed text-slate-500">
            Perfil de consulta para seguimiento operativo. No incluye administración de usuarios o roles.
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col bg-[#020d16]">
          <header className="flex min-h-[58px] flex-wrap items-center justify-between gap-3 border-b border-[#1f3446] bg-[#0d2437] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-[14px] font-semibold text-cyan-300">AgroSentinel</span>
              <span className="text-slate-500">|</span>
              <span className="truncate text-[11px] font-semibold text-slate-300">{NAVIGATION.find((item) => item.id === activeView)?.label}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {showInventoryScope && (
                <label className="flex items-center gap-2">
                  <span className="hidden text-[10px] text-slate-400 sm:inline">Bodega</span>
                  <select
                    value={selectedGroupId ?? 'central'}
                    onChange={(event) => setSelectedGroupId(event.target.value === 'central' ? null : Number(event.target.value))}
                    aria-label="Filtrar por bodega o grupo"
                    className="max-w-36 rounded-md border border-[#36556f] bg-[#102a3d] px-2 py-2 text-[10px] text-white outline-none focus:border-cyan-400 sm:max-w-48 sm:text-[11px]"
                  >
                    <option value="central">Bodega central</option>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={() => { setLoading(true); setErrors({}); setRefreshKey((value) => value + 1); }}
                disabled={loading}
                aria-label="Actualizar panel"
                className="inline-flex h-8 items-center gap-2 rounded-md border border-[#36556f] px-2.5 text-[10px] font-medium text-slate-200 transition hover:bg-white/5 disabled:opacity-50 sm:px-3 sm:text-[11px]"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
              <LogoutButton className="text-slate-300 hover:bg-[#1d3d52] hover:text-white" />
              <div className="hidden text-right leading-tight sm:block">
                <p className="max-w-36 truncate text-[11px] font-medium text-white">{userName}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300">Supervisor</p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/60 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 text-[10px] font-bold text-white">
                {initials}
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {Object.entries(errors).map(([key, message]) => <p key={key} role="alert" className="mb-3 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-[11px] text-red-200">{message}</p>)}
            {loading && <div className="mb-4 flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-[11px] text-cyan-100"><Clock3 size={14} className="animate-pulse" />Actualizando datos del sistema…</div>}
            {content}
          </div>
        </main>
      </div>
    </div>
  );
}
