import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, FileText, RefreshCw } from 'lucide-react';
import { getFailureReports } from '../../services/assetService';

const STATUS_LABELS = { PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', RESUELTO: 'Resuelto' };
const STATUS_TONES = {
  PENDIENTE: 'bg-amber-400/10 text-amber-200',
  EN_REVISION: 'bg-cyan-400/10 text-cyan-200',
  RESUELTO: 'bg-emerald-400/10 text-emerald-200',
};
const PRIORITY_LABELS = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', CRITICA: 'Crítica' };

function formatDate(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function MisReportes() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getFailureReports()
      .then((data) => { if (!cancelled) setReports(data); })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.response?.data?.detail || requestError.message || 'No se pudieron cargar los reportes.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-white">Mis reportes</h1>
          <p className="mt-1 text-[12px] text-gray-400">Historial de fallas registradas por tu usuario.</p>
        </div>
        <button type="button" title="Actualizar reportes" aria-label="Actualizar reportes" onClick={() => { setLoading(true); setError(''); setRefreshKey((key) => key + 1); }} className="rounded-md border border-white/10 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-300"><RefreshCw size={15} /></button>
      </div>

      {error && <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[11px] text-red-200">{error}</p>}
      {loading ? <p className="py-10 text-center text-[11px] text-slate-400">Cargando reportes...</p> : !error && reports.length === 0 ? (
        <div className="rounded-md border border-white/10 p-8 text-center text-[11px] text-slate-400"><AlertTriangle size={20} className="mx-auto mb-2 text-slate-500" />Aún no has registrado reportes de falla.</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report.id} className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-white/10 bg-[#13293a] p-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300"><FileText size={16} /></span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">{report.assetName}</p>
                  <p className="mt-1 text-[11px] text-slate-300">{report.tipoFalla} · Prioridad {PRIORITY_LABELS[report.prioridad] || report.prioridad}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-slate-400">{report.descripcion}</p>
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><Clock3 size={12} />{formatDate(report.fechaReporte)}</p>
                  {report.evidenciaUrl && <p className="mt-1 text-[10px] text-cyan-300">Evidencia adjunta</p>}
                </div>
              </div>
              <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_TONES[report.estado] || 'bg-slate-400/10 text-slate-300'}`}>{STATUS_LABELS[report.estado] || report.estado}</span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
