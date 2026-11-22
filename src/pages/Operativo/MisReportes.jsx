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
import PaginationControls from '../../components/PaginationControls';
import usePagination from '../../hooks/usePagination';

const STATUS_LABELS = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  RESUELTO: 'Resuelto',
};

const STATUS_TONES = {
  PENDIENTE: 'border-warning/30 bg-warning-soft text-forest-900',
  EN_REVISION: 'border-ocean-300/60 bg-info-soft text-ocean-700',
  RESUELTO: 'border-forest-300/50 bg-success-soft text-forest-700',
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
  const pagination = usePagination(reports);

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
    <section className="space-y-5 text-ink-900 min-w-0">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-sand-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-ocean-700">
            <FileText size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Historial de incidencias
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Mis reportes
          </h1>
          <p className="mt-0.5 text-xs text-ink-600">
            Historial de fallas que has registrado y el estado actual de cada una.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-sand-200 bg-sand-50 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-sand-100 transition-all duration-200 ease-out shrink-0"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-ocean-700' : ''} />
          <span>Actualizar</span>
        </button>
      </header>

      {/* Alerta de Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-error/20 bg-error-soft p-3.5 text-xs text-error-text"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-error-text hover:text-ink-900 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      {loading ? (
        <div className="py-16 text-center text-xs text-ink-600">
          <LoaderCircle className="mx-auto mb-2 animate-spin text-ocean-700" size={24} />
          <span>Cargando reportes...</span>
        </div>
      ) : !error && reports.length === 0 ? (
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-8 text-center text-xs text-ink-600 shadow-xl space-y-2">
          <AlertTriangle size={24} className="mx-auto text-ink-600" />
          <p className="font-semibold text-ink-600">Aún no has registrado reportes de falla.</p>
          <p className="text-[11px] text-ink-600">
            Los reportes creados desde el módulo de maquinaria aparecerán aquí.
          </p>
        </div>
      ) : (
        !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {pagination.pageItems.map((report) => (
              <article
                key={report.id}
                className="flex flex-col gap-3 rounded-xl border border-sand-200 bg-sand-50 p-4 shadow-md sm:flex-row sm:items-center sm:justify-between transition-all hover:border-sand-200"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ocean-300/60 bg-info-soft text-ocean-700">
                    <Wrench size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-xs sm:text-sm font-bold text-ink-900">
                        {report.assetName || 'Activo'}
                      </p>
                      <span className="text-[11px] font-medium text-ink-600">
                        #{report.id}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-600 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ocean-700">{report.tipoFalla}</span>
                      <span className="text-ink-600">·</span>
                      <span>
                        Prioridad:{' '}
                        <strong className="text-ink-900">
                          {PRIORITY_LABELS[report.prioridad] || report.prioridad}
                        </strong>
                      </span>
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-600 font-mono">
                      <Clock3 size={13} className="text-ink-600 shrink-0" />
                      {formatDate(report.fechaReporte)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2.5 pt-2 border-t border-sand-200/70 sm:border-t-0 sm:pt-0">
                  <StatusBadge status={report.estado} />
                  <button
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-ocean-300/60 bg-info-soft px-3.5 py-1.5 text-xs font-semibold text-ocean-700 hover:bg-ocean-300/30 transition-all duration-200 ease-out"
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
      {!loading && !error && reports.length > 0 && (
        <PaginationControls
          {...pagination}
          totalItems={reports.length}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.changePageSize}
        />
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
        STATUS_TONES[status] || 'border-sand-200/30 bg-sand-100 text-ink-600'
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-pine-900/35 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-details-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-sand-200 bg-sand-50 p-5 sm:p-6 shadow-2xl space-y-5 min-w-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-sand-200 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ocean-700">
              Reporte #{report.id}
            </p>
            <h2 id="report-details-title" className="mt-1 text-base sm:text-lg font-bold text-ink-900">
              {report.tipoFalla}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalles del reporte"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-sand-100 hover:text-ink-900 transition-all duration-200 ease-out shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progreso del Estado */}
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 space-y-3 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200/70 pb-2">
            <span className="text-xs font-semibold text-ink-600">Estado actual del reporte</span>
            <StatusBadge status={report.estado} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
            <div className="sm:col-span-2 rounded-lg border border-ocean-300/60 bg-info-soft p-3 text-xs text-ocean-700 font-medium">
              Este reporte incluye evidencia adjunta registrada en el sistema.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-sand-200 bg-sand-50 text-xs font-bold uppercase tracking-wider text-ink-900 hover:bg-sand-100 transition-all duration-200 ease-out"
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
      className={`rounded-lg border p-2.5 text-center transition-all duration-200 ease-out ${
        active
          ? 'border-ocean-300/60 bg-info-soft text-ocean-700'
          : 'border-sand-200/70 bg-sand-100 text-ink-600'
      }`}
    >
      <p className={`text-xs font-bold ${active ? 'text-ocean-700' : 'text-ink-600'}`}>
        {label}
      </p>
      <p className="mt-1 text-[10px] text-ink-600 truncate">{date}</p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-sand-200 bg-sand-50 p-3 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-600">{label}</p>
      <p className="mt-1 text-xs sm:text-sm font-medium text-ink-900 break-words whitespace-pre-wrap">
        {value || 'No registrado'}
      </p>
    </div>
  );
}