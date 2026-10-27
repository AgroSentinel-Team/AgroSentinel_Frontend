import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock3,
  Eye,
  FileText,
  LoaderCircle,
  RefreshCw,
  Wrench,
  X,
} from 'lucide-react';
import { getFailureReports } from '../../services/assetService';
import { getCurrentUser } from '../../services/technicianService';

const STATUS_LABELS = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  RESUELTO: 'Resuelto',
};

const STATUS_TONES = {
  PENDIENTE: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  EN_REVISION: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-300',
  RESUELTO: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
};

const PRIORITY_LABELS = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

function formatDate(value) {
  if (!value) return 'No registrada';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function describeError(error) {
  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    'No se pudieron cargar los reportes.'
  );
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
        if (!cancelled) {
          setReports(userReports.filter((report) => report.userId === user.id));
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(describeError(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRefresh = () => {
    setLoading(true);
    setError('');
    setRefreshKey((key) => key + 1);
  };

  return (
    <section className="space-y-5 text-white min-w-0">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <FileText size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Historial de incidencias
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Mis reportes
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Historial de fallas que has registrado y el estado actual de cada una.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#102a3d] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors shrink-0"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-cyan-400' : ''} />
          <span>Actualizar</span>
        </button>
      </header>

      {/* Alerta de Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-300 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <LoaderCircle className="mx-auto mb-2 animate-spin text-cyan-400" size={24} />
          <span>Cargando reportes...</span>
        </div>
      ) : !error && reports.length === 0 ? (
        <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-8 text-center text-xs text-slate-400 shadow-xl space-y-2">
          <AlertTriangle size={24} className="mx-auto text-slate-500" />
          <p className="font-semibold text-slate-300">Aún no has registrado reportes de falla.</p>
          <p className="text-[11px] text-slate-400">
            Los reportes creados desde el módulo de maquinaria aparecerán aquí.
          </p>
        </div>
      ) : (
        !error && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {reports.map((report) => (
              <article
                key={report.id}
                className="flex flex-col gap-3 rounded-xl border border-[#2d4055] bg-[#13293a] p-4 shadow-md sm:flex-row sm:items-center sm:justify-between transition-all hover:border-[#3d5873]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <Wrench size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-xs sm:text-sm font-bold text-white">
                        {report.assetName || 'Activo'}
                      </p>
                      <span className="text-[11px] font-medium text-slate-400">
                        #{report.id}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-cyan-200">{report.tipoFalla}</span>
                      <span className="text-slate-500">·</span>
                      <span>
                        Prioridad:{' '}
                        <strong className="text-white">
                          {PRIORITY_LABELS[report.prioridad] || report.prioridad}
                        </strong>
                      </span>
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                      <Clock3 size={13} className="text-slate-500 shrink-0" />
                      {formatDate(report.fechaReporte)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2.5 pt-2 border-t border-white/5 sm:border-t-0 sm:pt-0">
                  <StatusBadge status={report.estado} />
                  <button
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 transition-colors"
                  >
                    <Eye size={14} />
                    <span>Ver detalles</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {/* Modal Detalle Reporte */}
      {selectedReport && (
        <ReportDetails report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </section>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_TONES[status] || 'border-slate-500/30 bg-slate-500/15 text-slate-300'
      }`}
    >
      {STATUS_LABELS[status] || status || 'Sin estado'}
    </span>
  );
}

function ReportDetails({ report, onClose }) {
  const reviewed = report.estado === 'EN_REVISION' || report.estado === 'RESUELTO';
  const resolved = report.estado === 'RESUELTO';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-details-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#36556f] bg-[#102637] p-5 sm:p-6 shadow-2xl space-y-5 min-w-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Reporte #{report.id}
            </p>
            <h2 id="report-details-title" className="mt-1 text-base sm:text-lg font-bold text-white">
              {report.tipoFalla}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalles del reporte"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progreso del Estado */}
        <div className="rounded-xl border border-[#2d4055] bg-[#0d2030] p-4 space-y-3 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-2">
            <span className="text-xs font-semibold text-slate-300">Estado actual del reporte</span>
            <StatusBadge status={report.estado} />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <StatusStep label="Registrado" date={formatDate(report.fechaReporte)} active />
            <StatusStep
              label="En revisión"
              date={
                report.fechaInicioRevision
                  ? formatDate(report.fechaInicioRevision)
                  : 'Pendiente'
              }
              active={reviewed}
            />
            <StatusStep
              label="Resuelto"
              date={resolved ? 'Completado' : 'Pendiente'}
              active={resolved}
            />
          </div>
        </div>

        {/* Ficha Informativa */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Detail label="Maquinaria" value={report.assetName} />
          <Detail
            label="Marca y modelo"
            value={
              [report.assetBrand, report.assetModel].filter(Boolean).join(' ') ||
              'No registrados'
            }
          />
          <Detail label="Serial" value={report.assetSerialNumber} />
          <Detail label="Código inventario" value={report.assetInventoryCode} />
          <Detail
            label="Prioridad"
            value={PRIORITY_LABELS[report.prioridad] || report.prioridad}
          />
          <Detail label="Grupo asignado" value={report.groupName} />
          <Detail label="Técnico asignado" value={report.assignedTechnicianName} />
          <Detail label="Fecha de registro" value={formatDate(report.fechaReporte)} />
          <div className="sm:col-span-2">
            <Detail label="Descripción de la falla" value={report.descripcion} />
          </div>

          {report.evidenciaUrl && (
            <div className="sm:col-span-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3 text-xs text-cyan-200 font-medium">
              Este reporte incluye evidencia adjunta registrada en el sistema.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/10 bg-[#163044] text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/10 transition-colors"
        >
          Cerrar
        </button>
      </section>
    </div>
  );
}

function StatusStep({ label, date, active }) {
  return (
    <div
      className={`rounded-lg border p-2.5 text-center transition-colors ${
        active
          ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
          : 'border-white/5 bg-white/[0.02] text-slate-500'
      }`}
    >
      <p className={`text-xs font-bold ${active ? 'text-cyan-200' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className="mt-1 text-[10px] text-slate-400 truncate">{date}</p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-[#30485a] bg-[#0d2030] p-3 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xs sm:text-sm font-medium text-slate-200 break-words whitespace-pre-wrap">
        {value || 'No registrado'}
      </p>
    </div>
  );
}