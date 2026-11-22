import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { CheckCircle2, Download, LoaderCircle, X } from 'lucide-react';
import {
  closeFailureReport,
  getFailureEvidence,
  getFailureIntervention,
} from '../services/assetService';

function messageFrom(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    error.message ||
    'No se pudo completar la revisión de la orden.'
  );
}

function addPdfText(pdf, lines) {
  let y = 18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  lines.forEach((line) => {
    const wrapped = pdf.splitTextToSize(String(line || '—'), 175);
    wrapped.forEach((textLine) => {
      if (y > 278) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(textLine, 18, y);
      y += 6;
    });
  });
}

export default function FailureClosureModal({ report, onClose, onClosed }) {
  const [intervention, setIntervention] = useState(null);
  const [evidenceUrls, setEvidenceUrls] = useState([]);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [closedReport, setClosedReport] = useState(null);

  useEffect(() => {
    let active = true;
    getFailureIntervention(report.id)
      .then((result) => {
        if (active) setIntervention(result);
      })
      .catch((requestError) => {
        if (active) setError(messageFrom(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [report.id]);

  useEffect(() => {
    let active = true;
    const objectUrls = [];
    const evidences = intervention?.evidences || [];
    Promise.all(
      evidences.map(async (path) => {
        const blob = await getFailureEvidence(path);
        return { path, objectUrl: URL.createObjectURL(blob) };
      }),
    )
      .then((results) => {
        if (!active) {
          results.forEach(({ objectUrl }) => URL.revokeObjectURL(objectUrl));
          return;
        }
        objectUrls.push(...results.map(({ objectUrl }) => objectUrl));
        setEvidenceUrls(results);
      })
      .catch((requestError) => {
        if (active) setError(`No se pudieron cargar las fotos del mantenimiento: ${messageFrom(requestError)}`);
      });
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [intervention]);

  const downloadReport = (closedReport = report) => {
    if (!intervention) return;
    const pdf = new jsPDF();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(`Cierre de mantenimiento - Falla #${report.id}`, 18, 14);
    addPdfText(pdf, [
      `Activo: ${report.assetName || intervention.assetName || 'Sin nombre'}`,
      `Tipo de falla: ${report.tipoFalla || 'No especificado'}`,
      `Técnico: ${intervention.technicianName || report.assignedTechnicianName || 'Sin asignar'}`,
      `Fecha de reporte: ${report.fechaReporte || '—'}`,
      `Inicio de ejecución: ${report.fechaInicioRevision || '—'}`,
      `Fecha de envío a revisión: ${report.fechaEnvioCierre || 'No enviada'}`,
      `Fecha de cierre: ${closedReport.fechaCierre || 'Pendiente de cierre'}`,
      `Tiempo total de reparación: ${closedReport.repairDurationMinutes == null
        ? 'Pendiente de cierre'
        : `${closedReport.repairDurationMinutes} minutos`}`,
      `Tiempo trabajado: ${intervention.workMinutes ?? 0} minutos`,
      `Horómetro al mantenimiento: ${intervention.horometerAtMaintenance ?? 'Sin lectura'}`,
      `Falla encontrada: ${intervention.actualFailure || '—'}`,
      `Causa raíz: ${intervention.rootCause || '—'}`,
      `Actividades: ${intervention.tasksDescription || '—'}`,
      `Pruebas realizadas: ${intervention.testsPerformed || '—'}`,
      `Repuestos: ${intervention.replacedParts || 'Ninguno'}`,
      `Estado final del activo: ${intervention.finalEquipmentState || '—'}`,
      `Recomendaciones: ${intervention.recommendations || '—'}`,
      `Pendientes: ${intervention.pendingTasks || 'Ninguno'}`,
      `Recibido por: ${intervention.receivedBy || '—'}`,
      `Observaciones de revisión: ${observations || intervention.reviewObservations || '—'}`,
      `Revisado por: ${localStorage.getItem('nombre') || 'Supervisor/Administrador'}`,
    ]);
    pdf.save(`cierre-mantenimiento-${report.id}.pdf`);
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!observations.trim()) {
      setError('Agrega las observaciones de la revisión antes del cierre definitivo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const closed = await closeFailureReport(report.id, observations.trim());
      setClosedReport(closed);
      try {
        downloadReport(closed);
      } catch (pdfError) {
        setError(`La orden quedó cerrada, pero no se pudo generar el PDF: ${messageFrom(pdfError)}`);
        return;
      }
      onClosed?.(closed);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-pine-900/35 px-0 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="failure-closure-title"
        className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-surface/40 bg-surface/70 px-4 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink-900 shadow-2xl backdrop-blur-xl sm:rounded-2xl sm:p-6"
      >
        <header className="flex items-start justify-between gap-3 border-b border-sand-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ocean-700">
              Revisión de cierre · Falla #{report.id}
            </p>
            <h2 id="failure-closure-title" className="mt-1 text-lg font-bold">
              {report.assetName || 'Activo sin nombre'}
            </h2>
            <p className="mt-1 text-xs text-ink-600">
              Verifica las actividades, repuestos, pruebas y evidencia antes de autorizar.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-ink-600 hover:bg-sand-100">
            <X size={20} />
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-600">
            <LoaderCircle size={18} className="animate-spin" /> Cargando intervención…
          </div>
        ) : intervention ? (
          <div className="space-y-5 py-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ['Técnico', intervention.technicianName || report.assignedTechnicianName],
                ['Tiempo trabajado', `${intervention.workMinutes ?? 0} minutos`],
                ['Falla encontrada', intervention.actualFailure],
                ['Causa raíz', intervention.rootCause],
                ['Trabajo realizado', intervention.tasksDescription],
                ['Pruebas realizadas', intervention.testsPerformed],
                ['Repuestos utilizados', intervention.replacedParts || 'Ninguno'],
                ['Estado final propuesto', intervention.finalEquipmentState],
                ['Recomendaciones', intervention.recommendations],
                ['Pendientes', intervention.pendingTasks || 'Ninguno'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-sand-200 bg-sand-50 p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-600">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-xs text-ink-900">{value || '—'}</dd>
                </div>
              ))}
            </dl>

            {evidenceUrls.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ocean-700">Fotos del mantenimiento</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {evidenceUrls.map(({ path, objectUrl }) => (
                    <a
                      key={path}
                      href={objectUrl}
                      download={`falla-${report.id}-${path.split('/').pop()}`}
                      className="group relative overflow-hidden rounded-lg border border-sand-200"
                    >
                      <img src={objectUrl} alt="Evidencia de mantenimiento" className="h-32 w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-pine-900/80 p-2 text-[11px] text-white">
                        <Download size={13} /> Descargar
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={submitReview} className="space-y-3 border-t border-sand-200 pt-4">
              <label className="block text-xs font-semibold text-ink-900" htmlFor="closure-observations">
                Observaciones de revisión y cierre definitivo
                <textarea
                  id="closure-observations"
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                  required
                  maxLength={5000}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-sand-200 bg-sand-50 p-3 text-sm text-ink-900 outline-none focus:border-gold-600"
                  placeholder="Confirma qué se revisó o indica ajustes requeridos…"
                />
              </label>
              {error && <p role="alert" className="rounded-lg border border-error/20 bg-error-soft p-3 text-xs text-error-text">{error}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => downloadReport(closedReport || report)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-sand-200 px-3 text-xs font-semibold text-ink-900 hover:bg-sand-100"
                >
                  <Download size={15} /> Descargar PDF
                </button>
                <button
                  type="submit"
                  disabled={saving || Boolean(closedReport)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-4 text-xs font-bold text-pine-900 transition-all duration-200 ease-out hover:bg-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-60"
                >
                  {saving ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {closedReport ? 'Orden cerrada' : 'Autorizar cierre definitivo'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <p role="alert" className="my-5 rounded-lg border border-error/20 bg-error-soft p-3 text-xs text-error-text">
            {error || 'No existe una intervención para revisar.'}
          </p>
        )}
      </section>
    </div>
  );
}
