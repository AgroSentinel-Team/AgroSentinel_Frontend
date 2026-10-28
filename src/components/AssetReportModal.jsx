import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  LoaderCircle,
  Package,
  Printer,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import {
  getAssetResume,
  getPredictiveHistory,
} from '../services/assetService';
import { getPreventiveMaintenanceEvidence } from '../services/preventiveMaintenanceService';

const STATUS_LABELS = {
  OPERATIONAL: 'Operativo',
  IN_REPAIR: 'En reparación',
  OBSOLETE: 'Obsoleto',
};

const EQUIPMENT_STATE_LABELS = {
  OPERATIONAL: '100% Operativo',
  OPERATIONAL_WITH_RESTRICTIONS: 'Operando con restricciones',
  INOPERATIVE_WAITING_PART: 'Inoperativo a la espera de repuesto',
};

function formatDate(value) {
  if (!value) return 'Sin registro';
  return String(value).slice(0, 10).split('-').reverse().join('/');
}

function formatDateTime(value) {
  if (!value) return 'Sin registro';
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatCurrency(value) {
  if (value === null || value === undefined) return 'Sin registro';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function EvidenceLink({ url, index }) {
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      const blob = await getPreventiveMaintenanceEvidence(url);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = url.split('/').pop() || `evidencia-${index + 1}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      alert('No fue posible descargar la evidencia.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={downloading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors print:hidden"
    >
      {downloading ? <LoaderCircle size={12} className="animate-spin" /> : <ExternalLink size={12} />}
      <span>Evidencia {index + 1}</span>
    </button>
  );
}

export default function AssetReportModal({ asset, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [resumeData, setResumeData] = useState(null);
  const [predictiveRecords, setPredictiveRecords] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([
    'CORRECTIVE',
    'PREVENTIVE',
    'PREDICTIVE',
  ]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !asset?.id) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setLoading(true);
        setError('');
        return Promise.all([
          getAssetResume(asset.id),
          asset.hasMotor ? getPredictiveHistory(asset.id) : Promise.resolve([]),
        ]);
      })
      .then((result) => {
        if (!active || !result) return;
        const [resume, predRecords] = result;
        setResumeData(resume);
        setPredictiveRecords(Array.isArray(predRecords) ? predRecords : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || err.message || 'Error al cargar la hoja de vida.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, asset?.id, asset?.hasMotor]);

  const activeAsset = resumeData?.asset || asset;
  const maintenanceHistory = useMemo(
    () => resumeData?.maintenanceHistory || [],
    [resumeData],
  );

  // Conteo de intervenciones por tipo
  const countCorrective = useMemo(
    () => maintenanceHistory.filter((m) => m.type === 'CORRECTIVE').length,
    [maintenanceHistory],
  );
  const countPreventive = useMemo(
    () => maintenanceHistory.filter((m) => m.type === 'PREVENTIVE').length,
    [maintenanceHistory],
  );
  const countPredictive = predictiveRecords.length;
  const sortedPredictiveRecords = useMemo(
    () => [...predictiveRecords].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [predictiveRecords],
  );

  const reportTypes = [
    { id: 'CORRECTIVE', label: 'Correctivos', count: countCorrective },
    { id: 'PREVENTIVE', label: 'Preventivos', count: countPreventive },
    { id: 'PREDICTIVE', label: 'Lecturas predictivas', count: countPredictive },
  ];
  const allTypesSelected = reportTypes.every((type) => selectedTypes.includes(type.id));

  const toggleReportType = (typeId) => {
    setSelectedTypes((current) =>
      current.includes(typeId)
        ? current.filter((type) => type !== typeId)
        : [...current, typeId],
    );
  };

  // Apply the same selection to the on-screen history and both export formats.
  const filteredMaintenance = useMemo(() => {
    return maintenanceHistory.filter((item) => selectedTypes.includes(item.type));
  }, [maintenanceHistory, selectedTypes]);

  const showPredictive = selectedTypes.includes('PREDICTIVE');
  const selectedRecordCount =
    filteredMaintenance.length + (showPredictive ? sortedPredictiveRecords.length : 0);
  const selectedTypeSummary = reportTypes
    .filter((type) => selectedTypes.includes(type.id))
    .map((type) => type.label)
    .join(', ') || 'Sin categorías seleccionadas';

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    if (!activeAsset) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 14;

    // Encabezado
    doc.setFillColor(13, 31, 45);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('AGROSENTINEL - REPORTE DE ACTIVO', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Hoja de vida técnica e historial de intervenciones · Generado: ${new Date().toLocaleString('es-CO')}`, 14, 18);

    y = 32;
    doc.setTextColor(20, 30, 40);
    const writeDetail = (value) => {
      const lines = doc.splitTextToSize(String(value), pageWidth - 32);
      const lineHeight = 3.5;
      if (y + lines.length * lineHeight > doc.internal.pageSize.getHeight() - 14) {
        doc.addPage();
        y = 15;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(lines, 16, y);
      y += lines.length * lineHeight + 1;
    };

    // Ficha Técnica
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. FICHA TÉCNICA DEL ACTIVO', 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const specs = [
      `Nombre: ${activeAsset.name || '—'}`,
      `Marca / Modelo: ${[activeAsset.brand, activeAsset.model].filter(Boolean).join(' / ') || '—'}`,
      `Serie: ${activeAsset.serialNumber || '—'}`,
      `Código de Inventario: ${activeAsset.inventoryCode || '—'}`,
      `Ubicación: ${activeAsset.location || '—'}`,
      `Estado Operativo: ${STATUS_LABELS[activeAsset.operationalStatus] || activeAsset.operationalStatus || '—'}`,
      `Categoría: ${activeAsset.categoryName || '—'}`,
      `Responsable: ${activeAsset.responsibleName || '—'}`,
      `Adquisición: ${formatDate(activeAsset.acquisitionDate)} (${formatCurrency(activeAsset.acquisitionCost)})`,
      `Garantía: ${formatDate(activeAsset.warrantyExpirationDate)}`,
      `Proveedor: ${activeAsset.provider || '—'}`,
      `Telemetría Motor: ${activeAsset.hasMotor ? 'Sí (ID: ' + (activeAsset.predictiveId || 'MOTOR-' + activeAsset.id) + ')' : 'No'}`,
    ];

    specs.forEach((spec, idx) => {
      const col = idx % 2 === 0 ? 14 : pageWidth / 2 + 5;
      doc.text(spec, col, y);
      if (idx % 2 === 1) y += 5;
    });
    if (specs.length % 2 === 1) y += 5;

    if (activeAsset.extraSpecifications) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Especificaciones adicionales:', 14, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(activeAsset.extraSpecifications, pageWidth - 28);
      doc.text(lines, 14, y);
      y += lines.length * 4 + 4;
    } else {
      y += 4;
    }

    // Línea separadora
    doc.setDrawColor(200, 210, 220);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    // Historial
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`2. HISTORIAL DEL ACTIVO (${selectedTypeSummary})`, 14, y);
    y += 6;

    if (filteredMaintenance.length === 0 && (!showPredictive || sortedPredictiveRecords.length === 0)) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No se encontraron registros para los filtros seleccionados.', 14, y);
    } else {
      filteredMaintenance.forEach((item, index) => {
        if (y > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage();
          y = 15;
        }
        doc.setFillColor(245, 248, 250);
        doc.rect(14, y - 4, pageWidth - 28, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const typeLabel = item.type === 'CORRECTIVE' ? 'CORRECTIVO' : 'PREVENTIVO';
        const code = item.failureReportId ? ` (Falla F-${item.failureReportId})` : '';
        doc.text(`#${index + 1} - MANTENIMIENTO ${typeLabel}${code} · ${formatDate(item.maintenanceDate || item.scheduledAt)}`, 16, y);
        y += 6;

        writeDetail(`Técnico: ${item.technicianName || '—'} | Estado final: ${item.finalEquipmentState || item.status || '—'} | Tiempo: ${item.workMinutes != null ? item.workMinutes + ' min' : '—'}`);
        if (item.initialReportedSymptom) {
          writeDetail(`Síntoma reportado: ${item.initialReportedSymptom}`);
        }
        if (item.actualFailure) {
          writeDetail(`Falla encontrada: ${item.actualFailure} | Causa raíz: ${item.rootCause || '—'}`);
        }
        if (item.tasksDescription) {
          writeDetail(`Tareas: ${item.tasksDescription}`);
        }
        if (item.testsPerformed) {
          writeDetail(`Pruebas realizadas: ${item.testsPerformed}`);
        }
        if (item.replacedParts) {
          writeDetail(`Repuestos utilizados: ${item.replacedParts}`);
        }
        if (item.pendingTasks) {
          writeDetail(`Tareas pendientes: ${item.pendingTasks}`);
        }
        if (item.recommendations) {
          writeDetail(`Recomendaciones: ${item.recommendations}`);
        }
        if (item.evidences?.length) {
          writeDetail(`Evidencias: ${item.evidences.map((url) => url.split('/').pop()).join(', ')}`);
        }
        y += 3;
      });

      if (showPredictive && sortedPredictiveRecords.length > 0) {
        if (y > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage();
          y = 15;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`LECTURAS Y ALERTAS PREDICTIVAS (${sortedPredictiveRecords.length} eventos)`, 14, y);
        y += 6;
        sortedPredictiveRecords.forEach((rec) => {
          if (y > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            y = 15;
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`[${formatDateTime(rec.timestamp)}] Alerta: ${rec.tipoFallaPredicha || 'Normal'} | Temp: ${rec.temperature}°C | Vib: ${rec.vibration} mm/s | Confianza: ${Math.round(rec.confidence * 100)}%`, 16, y);
          y += 4;
        });
      }
    }

    doc.save(`Reporte_Activo_${activeAsset.inventoryCode || activeAsset.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative my-auto max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#30485a] bg-[#0c1f2e] text-white shadow-2xl space-y-6 p-4 sm:p-6 md:p-8 print:border-none print:bg-white print:text-black print:p-4 print:max-h-none print:shadow-none print:w-full">
        
        {/* ENCABEZADO REPORTE */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/10 pb-5 print:border-b-2 print:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-950/40 shrink-0 print:border print:border-slate-800 print:bg-white print:text-slate-900">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 print:text-slate-700">
                  AgroSentinel · Gestión de Mantenimiento
                </span>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 print:border print:border-slate-400 print:text-slate-800">
                  Hoja de Vida Completa
                </span>
              </div>
              <h1 className="mt-1 text-lg sm:text-2xl font-bold tracking-tight text-white print:text-slate-900">
                {activeAsset?.name || 'Cargando activo…'}
              </h1>
              <p className="text-xs text-slate-400 print:text-slate-600">
                Código de inventario: <strong className="text-slate-200 font-mono print:text-slate-800">{activeAsset?.inventoryCode || 'S/N'}</strong> · N° de serie: <strong className="text-slate-200 font-mono print:text-slate-800">{activeAsset?.serialNumber || 'S/N'}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || Boolean(error)}
              title="Imprimir o guardar como PDF en navegador"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 transition-all shadow-sm"
            >
              <Printer size={16} />
              <span>Imprimir / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={loading || Boolean(error)}
              title="Descargar PDF generado"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition-all shadow-md shadow-cyan-950/40"
            >
              <Download size={16} />
              <span>Descargar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar reporte"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <LoaderCircle size={32} className="mx-auto animate-spin text-cyan-400" />
            <p className="text-xs text-slate-400">Cargando hoja de vida e historial completo del activo…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
            {error}
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* SECCIÓN 1: FICHA TÉCNICA COMPLETA */}
            <section className="rounded-xl border border-[#2a3e52] bg-[#102738] p-4 sm:p-6 print:border print:border-slate-300 print:bg-white print:p-3">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3 print:border-slate-300">
                <div className="flex items-center gap-2 text-cyan-300 print:text-slate-800 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <FileText size={18} />
                  <span>1. Ficha Técnica y Especificaciones del Activo</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    activeAsset?.isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 print:text-emerald-800'
                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30 print:text-slate-700'
                  }`}
                >
                  <CheckCircle2 size={13} />
                  {activeAsset?.isActive
                    ? STATUS_LABELS[activeAsset?.operationalStatus] || activeAsset?.operationalStatus
                    : 'Desactivado'}
                </span>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs print:grid-cols-3 print:gap-2">
                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Nombre del Activo</dt>
                  <dd className="mt-1 font-bold text-white print:text-slate-900">{activeAsset?.name || '—'}</dd>
                </div>
                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Marca / Modelo</dt>
                  <dd className="mt-1 font-medium text-slate-200 print:text-slate-800">
                    {[activeAsset?.brand, activeAsset?.model].filter(Boolean).join(' / ') || '—'}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">N° Serie / Código</dt>
                  <dd className="mt-1 font-mono text-cyan-200 print:text-slate-800">
                    {[activeAsset?.serialNumber, activeAsset?.inventoryCode].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Ubicación Física</dt>
                  <dd className="mt-1 font-medium text-slate-200 print:text-slate-800">{activeAsset?.location || 'Sin ubicación'}</dd>
                </div>

                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Categoría</dt>
                  <dd className="mt-1 font-medium text-slate-200 print:text-slate-800">{activeAsset?.categoryName || '—'}</dd>
                </div>
                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Responsable Asignado</dt>
                  <dd className="mt-1 font-medium text-slate-200 print:text-slate-800">{activeAsset?.responsibleName || '—'}</dd>
                </div>
                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Adquisición / Costo</dt>
                  <dd className="mt-1 font-medium text-slate-200 print:text-slate-800">
                    {formatDate(activeAsset?.acquisitionDate)} · {formatCurrency(activeAsset?.acquisitionCost)}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Vencimiento Garantía</dt>
                  <dd className="mt-1 font-medium text-slate-200 print:text-slate-800">{formatDate(activeAsset?.warrantyExpirationDate)}</dd>
                </div>

                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Proveedor</dt>
                  <dd className="mt-1 font-medium text-slate-200 print:text-slate-800">{activeAsset?.provider || 'Sin registro'}</dd>
                </div>
                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 print:bg-slate-50 print:border-slate-200 sm:col-span-2 lg:col-span-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Telemetría / Predictivo</dt>
                  <dd className="mt-1 text-slate-200 print:text-slate-800">
                    {activeAsset?.hasMotor ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold print:text-emerald-800">
                        <Activity size={13} />
                        Cuenta con sensor de motor y telemetría predictiva activa (ID: {activeAsset.predictiveId || 'MOTOR-' + activeAsset.id})
                      </span>
                    ) : (
                      'Equipo estándar sin sensores de telemetría de motor.'
                    )}
                  </dd>
                </div>

                <div className="rounded-lg bg-[#0c1f2e] p-3 border border-white/5 sm:col-span-3 lg:col-span-4 print:bg-slate-50 print:border-slate-200">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Especificaciones Técnicas Adicionales</dt>
                  <dd className="mt-1.5 whitespace-pre-wrap text-slate-300 text-xs leading-relaxed font-sans print:text-slate-800">
                    {activeAsset?.extraSpecifications || 'No hay especificaciones adicionales registradas.'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Select which history categories appear on screen and in the exports. */}
            <section className="space-y-3 rounded-xl border border-white/10 bg-[#0b1c28] p-3 sm:p-4 print:hidden">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Filter size={17} className="shrink-0 text-cyan-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                      ¿Qué deseas incluir en el reporte?
                    </h2>
                  </div>
                  <p className="mt-1 pl-6 text-[11px] leading-relaxed text-slate-400">
                    Puedes combinar categorías. La selección se aplicará a la vista, impresión y PDF.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedTypes(reportTypes.map((type) => type.id))}
                    disabled={allTypesSelected}
                    className="min-h-9 flex-1 rounded-lg border border-cyan-400/25 px-3 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:cursor-default disabled:opacity-50 sm:flex-none"
                  >
                    Seleccionar todo
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTypes([])}
                    disabled={selectedTypes.length === 0}
                    className="min-h-9 flex-1 rounded-lg border border-white/10 px-3 text-[11px] font-semibold text-slate-300 hover:bg-white/5 disabled:cursor-default disabled:opacity-50 sm:flex-none"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {reportTypes.map((type) => {
                  const checked = selectedTypes.includes(type.id);
                  return (
                    <label
                      key={type.id}
                      className={`flex min-h-[54px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                        checked
                          ? 'border-cyan-400/40 bg-cyan-500/10'
                          : 'border-white/10 bg-[#102738] hover:border-white/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleReportType(type.id)}
                        className="h-4 w-4 shrink-0 accent-cyan-500"
                      />
                      <span className="min-w-0 flex-1 text-xs font-semibold text-slate-100">
                        {type.label}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {type.count}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400" aria-live="polite">
                {selectedTypes.length === 0
                  ? 'No hay categorías seleccionadas.'
                  : `${selectedRecordCount} registros seleccionados: ${selectedTypeSummary}.`}
              </p>
            </section>

            {/* SECCIÓN 2: HISTORIAL DE MANTENIMIENTO / HOJA DE VIDA */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 print:text-slate-900 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <Wrench size={18} />
                  <span>2. Historial de Intervenciones y Hoja de Vida Operativa</span>
                </div>
                <span className="text-xs text-slate-400 print:text-slate-600 font-medium">
                  {selectedRecordCount} registros listados
                </span>
              </div>

              {filteredMaintenance.length === 0 && (!showPredictive || predictiveRecords.length === 0) ? (
                <div className="rounded-xl border border-white/5 bg-[#102738] p-8 text-center space-y-2">
                  <Clock size={28} className="mx-auto text-slate-500" />
                  <p className="text-xs font-medium text-slate-300">
                    No hay registros para las categorías seleccionadas.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Lista de Mantenimientos Preventivos y Correctivos */}
                  {filteredMaintenance.map((item, idx) => {
                    const isCorrective = item.type === 'CORRECTIVE';
                    const finalStateText = EQUIPMENT_STATE_LABELS[item.finalEquipmentState] || item.finalEquipmentState || item.status || 'Completado';

                    return (
                      <article
                        key={`maint-${item.id || idx}`}
                        className="rounded-xl border border-[#273d52] bg-[#102738] p-4 sm:p-5 shadow-sm space-y-3.5 break-inside-avoid print:border print:border-slate-300 print:bg-white print:p-3"
                      >
                        {/* Cabecera del registro */}
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-2.5 print:border-slate-300">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                                isCorrective
                                  ? 'bg-red-500/15 text-red-300 border border-red-500/30 print:text-red-800'
                                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 print:text-cyan-800'
                              }`}
                            >
                              {isCorrective ? 'Mantenimiento Correctivo' : 'Mantenimiento Preventivo'}
                            </span>
                            {item.failureReportId && (
                              <span className="font-mono text-xs text-slate-300 font-bold print:text-slate-800">
                                F-{item.failureReportId}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium print:text-slate-700">
                              Ejecutado: <strong className="text-slate-200 print:text-slate-900">{formatDateTime(item.executedAt || item.maintenanceDate || item.scheduledAt)}</strong>
                            </span>
                            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 print:text-emerald-800">
                              {finalStateText}
                            </span>
                          </div>
                        </div>

                        {/* Detalles técnicos estructurados */}
                        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-[11px] sm:text-xs print:grid-cols-3">
                          <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 print:bg-slate-50 print:border-slate-200">
                            <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Técnico Responsable</dt>
                            <dd className="mt-0.5 font-bold text-white print:text-slate-900">{item.technicianName || 'Sin asignar'}</dd>
                          </div>

                          <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 print:bg-slate-50 print:border-slate-200">
                            <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Tiempo de Trabajo</dt>
                            <dd className="mt-0.5 font-medium text-slate-200 print:text-slate-800">
                              {item.workMinutes != null ? `${item.workMinutes} minutos` : 'No registrado'}
                            </dd>
                          </div>

                          <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 print:bg-slate-50 print:border-slate-200">
                            <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Inicio Revisión</dt>
                            <dd className="mt-0.5 text-slate-300 print:text-slate-800">{formatDateTime(item.inspectionStartedAt)}</dd>
                          </div>

                          <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 print:bg-slate-50 print:border-slate-200">
                            <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Recibido por</dt>
                            <dd className="mt-0.5 text-slate-300 print:text-slate-800">{item.receivedBy || 'Sin registrar'}</dd>
                          </div>

                          {item.initialReportedSymptom && (
                            <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 col-span-2 print:bg-slate-50 print:border-slate-200">
                              <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Síntoma Inicial Reportado</dt>
                              <dd className="mt-0.5 text-slate-200 font-medium print:text-slate-800">{item.initialReportedSymptom}</dd>
                            </div>
                          )}

                          {item.actualFailure && (
                            <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 col-span-2 print:bg-slate-50 print:border-slate-200">
                              <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Falla Encontrada y Causa Raíz</dt>
                              <dd className="mt-0.5 text-slate-200 print:text-slate-800">
                                <strong>{item.actualFailure}</strong> {item.rootCause ? `— Causa: ${item.rootCause}` : ''}
                              </dd>
                            </div>
                          )}

                          <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 col-span-2 sm:col-span-3 lg:col-span-4 print:bg-slate-50 print:border-slate-200">
                            <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Tareas y Acciones Ejecutadas</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-slate-200 leading-relaxed font-sans print:text-slate-900">
                              {item.tasksDescription || 'Sin detalle de tareas.'}
                            </dd>
                          </div>

                          {item.testsPerformed && (
                            <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 col-span-2 sm:col-span-2 print:bg-slate-50 print:border-slate-200">
                              <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Pruebas Realizadas</dt>
                              <dd className="mt-0.5 text-slate-300 print:text-slate-800">{item.testsPerformed}</dd>
                            </div>
                          )}

                          {item.pendingTasks && (
                            <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 col-span-2 sm:col-span-2 print:bg-slate-50 print:border-slate-200">
                              <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Tareas Pendientes</dt>
                              <dd className="mt-0.5 whitespace-pre-wrap text-slate-300 print:text-slate-800">{item.pendingTasks}</dd>
                            </div>
                          )}

                          {item.recommendations && (
                            <div className="rounded bg-[#0b1c28] p-2.5 border border-white/5 col-span-2 sm:col-span-2 print:bg-slate-50 print:border-slate-200">
                              <dt className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Recomendaciones del Técnico</dt>
                              <dd className="mt-0.5 text-slate-300 print:text-slate-800">{item.recommendations}</dd>
                            </div>
                          )}
                        </dl>

                        {/* Repuestos utilizados */}
                        {(item.parts?.length > 0 || item.replacedParts) && (
                          <div className="rounded-lg bg-[#0b1c28] p-3 border border-white/5 space-y-1.5 print:bg-slate-50 print:border-slate-200">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 print:text-slate-800 flex items-center gap-1.5">
                              <Package size={13} />
                              Repuestos e Insumos Utilizados:
                            </p>
                            {item.parts?.length > 0 ? (
                              <ul className="divide-y divide-white/5 text-xs font-mono text-slate-200 print:text-slate-800">
                                {item.parts.map((p, pIdx) => (
                                  <li key={`part-${pIdx}`} className="py-1 flex items-center justify-between">
                                    <span>
                                      <strong>{p.name}</strong> · Código/Parte: {p.partNumber} {p.brand ? `(${p.brand})` : ''}
                                    </span>
                                    <span className="font-bold text-cyan-300 print:text-slate-900">
                                      {p.quantity} und
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-200 font-mono print:text-slate-800">{item.replacedParts}</p>
                            )}
                          </div>
                        )}

                        {/* Evidencias adjuntas */}
                        {item.evidences?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-600">Evidencias:</span>
                            {item.evidences.map((url, eIdx) => (
                              <EvidenceLink key={url} url={url} index={eIdx} />
                            ))}
                            <span className="text-[11px] text-slate-500 italic hidden print:inline">
                              ({item.evidences.length} archivos fotográficos registrados en el sistema)
                            </span>
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {/* Registros Predictivos */}
                  {showPredictive && sortedPredictiveRecords.length > 0 && (
                    <div className="space-y-3 pt-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider print:text-slate-800">
                        <Activity size={16} />
                        <span>Historial de Telemetría y Alertas Predictivas ({sortedPredictiveRecords.length})</span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-white/10 print:border-slate-300">
                        <table className="w-full text-left text-xs min-w-[700px] print:min-w-full">
                          <thead className="bg-[#0b1d2a] text-slate-400 border-b border-white/10 print:bg-slate-100 print:text-slate-700">
                            <tr>
                              <th className="px-3.5 py-2.5 font-bold">Fecha / Hora</th>
                              <th className="px-3.5 py-2.5 font-bold">Diagnóstico Predicho</th>
                              <th className="px-3.5 py-2.5 font-bold">Temp (°C)</th>
                              <th className="px-3.5 py-2.5 font-bold">Vibración</th>
                              <th className="px-3.5 py-2.5 font-bold">Presión</th>
                              <th className="px-3.5 py-2.5 font-bold">Confianza</th>
                              <th className="px-3.5 py-2.5 font-bold">Falla Confirmada</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 bg-[#102738] print:bg-white print:divide-slate-200">
                            {sortedPredictiveRecords.map((rec) => {
                              const isAlert = rec.predictionClass === 1;
                              return (
                                <tr key={`pred-${rec.id}`} className={isAlert ? 'bg-red-500/10 print:bg-red-50' : ''}>
                                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-200 print:text-slate-800">
                                    {formatDateTime(rec.timestamp)}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    <span className={`inline-flex items-center gap-1 font-semibold ${isAlert ? 'text-red-300 print:text-red-700' : 'text-emerald-300 print:text-emerald-700'}`}>
                                      {rec.tipoFallaPredicha || 'Normal'}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-200 print:text-slate-800">{rec.temperature?.toFixed(1)} °C</td>
                                  <td className="px-3.5 py-2.5 text-slate-200 print:text-slate-800">{rec.vibration?.toFixed(2)} mm/s</td>
                                  <td className="px-3.5 py-2.5 text-slate-200 print:text-slate-800">{rec.pressure?.toFixed(1)} bar</td>
                                  <td className="px-3.5 py-2.5 font-bold text-cyan-300 print:text-slate-800">
                                    {Math.round((rec.confidence || 0) * 100)}%
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-300 print:text-slate-700">
                                    {rec.fallaRealConfirmada || 'Pendiente feedback'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* PIE DE PÁGINA IMPRESIÓN CON FIRMAS */}
            <div className="hidden print:block pt-16 mt-12 border-t-2 border-slate-300">
              <div className="grid grid-cols-2 gap-12 text-center text-xs">
                <div>
                  <div className="border-b border-slate-700 w-3/4 mx-auto mb-2" />
                  <p className="font-bold text-slate-900">Firma del Técnico Responsable</p>
                  <p className="text-[10px] text-slate-600">AgroSentinel · Mantenimiento Especializado</p>
                </div>
                <div>
                  <div className="border-b border-slate-700 w-3/4 mx-auto mb-2" />
                  <p className="font-bold text-slate-900">Firma Supervisor / Recibido Conforme</p>
                  <p className="text-[10px] text-slate-600">Operaciones de Campo</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
