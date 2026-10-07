import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, Eye, FileText, RefreshCw, X } from 'lucide-react';
import { getFailureReports } from '../../services/assetService';
import { getCurrentUser } from '../../services/technicianService';

const STATUS_LABELS = { PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', RESUELTO: 'Resuelto' };
const STATUS_TONES = {
  PENDIENTE: 'bg-amber-400/10 text-amber-200',
  EN_REVISION: 'bg-cyan-400/10 text-cyan-200',
  RESUELTO: 'bg-emerald-400/10 text-emerald-200',
};
const PRIORITY_LABELS = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', CRITICA: 'Crítica' };

function formatDate(value) {
  if (!value) return 'No registrada';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function describeError(error) {
  return error.response?.data?.detail || error.response?.data?.message || error.message || 'No se pudieron cargar los reportes.';
}

export default function MisReportes() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCurrentUser(), getFailureReports()])
      .then(([user, userReports]) => {
        if (!cancelled) setReports(userReports.filter((report) => report.userId === user.id));
      })
      .catch((requestError) => {
        if (!cancelled) setError(describeError(requestError));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-white">Mis reportes</h1>
          <p className="mt-1 text-[12px] text-gray-400">Historial de fallas que has registrado y el estado de cada una.</p>
        </div>
        <button type="button" title="Actualizar reportes" aria-label="Actualizar reportes" onClick={() => { setLoading(true); setError(''); setRefreshKey((key) => key + 1); }} className="rounded-md border border-white/10 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-300"><RefreshCw size={15} /></button>
      </div>

      {error && <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[11px] text-red-200">{error}</p>}
      {loading ? <p className="py-10 text-center text-[11px] text-slate-400">Cargando reportes...</p> : !error && reports.length === 0 ? (
        <div className="rounded-md border border-white/10 p-8 text-center text-[11px] text-slate-400"><AlertTriangle size={20} className="mx-auto mb-2 text-slate-500" />Aún no has registrado reportes de falla.</div>
      ) : !error && (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-white/10 bg-[#13293a] p-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300"><FileText size={16} /></span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">{report.assetName || 'Activo'}</p>
                  <p className="mt-1 text-[11px] text-slate-300">{report.tipoFalla} · Prioridad {PRIORITY_LABELS[report.prioridad] || report.prioridad}</p>
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><Clock3 size={12} />{formatDate(report.fechaReporte)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={report.estado} />
                <button type="button" onClick={() => setSelectedReport(report)} className="inline-flex items-center gap-1 rounded-md border border-cyan-300/20 px-3 py-1.5 text-[10px] font-medium text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-300/5">
                  <Eye size={13} />Ver detalles
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedReport && <ReportDetails report={selectedReport} onClose={() => setSelectedReport(null)} />}
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_TONES[status] || 'bg-slate-400/10 text-slate-300'}`}>{STATUS_LABELS[status] || status || 'Sin estado'}</span>;
}

function ReportDetails({ report, onClose }) {
  const reviewed = report.estado === 'EN_REVISION' || report.estado === 'RESUELTO';
  const resolved = report.estado === 'RESUELTO';

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="report-details-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/10 bg-[#102637] p-5 shadow-2xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-cyan-300">Reporte #{report.id}</p>
          <h2 id="report-details-title" className="mt-1 text-lg font-semibold text-white">{report.tipoFalla}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar detalles del reporte" className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
      </div>

      <div className="mb-5 rounded-lg border border-white/5 bg-[#0b1d2a] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-slate-300">Estado actual</p>
          <StatusBadge status={report.estado} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatusStep label="Registrado" date={formatDate(report.fechaReporte)} active />
          <StatusStep label="En revisión" date={report.fechaInicioRevision ? formatDate(report.fechaInicioRevision) : 'Pendiente'} active={reviewed} />
          <StatusStep label="Resuelto" date={resolved ? 'Completado' : 'Pendiente'} active={resolved} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <Detail label="Maquinaria" value={report.assetName} />
        <Detail label="Marca y modelo" value={[report.assetBrand, report.assetModel].filter(Boolean).join(' ') || 'No registrados'} />
        <Detail label="Serial" value={report.assetSerialNumber} />
        <Detail label="Código de inventario" value={report.assetInventoryCode} />
        <Detail label="Prioridad" value={PRIORITY_LABELS[report.prioridad] || report.prioridad} />
        <Detail label="Grupo asignado" value={report.groupName} />
        <Detail label="Técnico asignado" value={report.assignedTechnicianName} />
        <Detail label="Fecha de registro" value={formatDate(report.fechaReporte)} />
        <div className="sm:col-span-2">
          <Detail label="Descripción" value={report.descripcion} />
        </div>
        {report.evidenciaUrl && <p className="sm:col-span-2 text-[10px] text-cyan-300">Este reporte incluye evidencia adjunta.</p>}
      </div>

      <button type="button" onClick={onClose} className="mt-6 w-full rounded-md border border-white/10 py-2 text-[11px] font-medium text-slate-300 hover:bg-white/5">Cerrar</button>
    </section>
  </div>;
}

function StatusStep({ label, date, active }) {
  return <div className={`rounded-md border p-2 ${active ? 'border-cyan-300/20 bg-cyan-300/5' : 'border-white/5 bg-white/[0.02]'}`}>
    <p className={`text-[9px] font-semibold ${active ? 'text-cyan-200' : 'text-slate-500'}`}>{label}</p>
    <p className="mt-1 text-[8px] text-slate-400">{date}</p>
  </div>;
}

function Detail({ label, value }) {
  return <div>
    <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-slate-200">{value || 'No registrado'}</p>
  </div>;
}
