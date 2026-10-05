import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, RefreshCw } from 'lucide-react';
import { getTechnicianMaintenanceHistory } from '../../services/technicianService';
import { getPreventiveMaintenanceEvidence } from '../../services/preventiveMaintenanceService';

function display(value, fallback = 'No registrado') {
  return value === null || value === undefined || value === '' ? fallback : value;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'No registrada';
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-200">{display(value)}</dd>
    </div>
  );
}

function EvidenceDownload({ url, index }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const blob = await getPreventiveMaintenanceEvidence(url);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = url.split('/').pop() || `evidencia-${index + 1}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'No fue posible descargar la evidencia.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={download} disabled={downloading} className="text-cyan-300 underline disabled:opacity-50">
        {downloading ? 'Descargando…' : `Evidencia ${index + 1}`}
      </button>
      {error && <span role="alert" className="text-red-300">{error}</span>}
    </span>
  );
}

function HistoryDetails({ item }) {
  return (
    <div className="grid gap-4 border-t border-[#2d4055] px-3 py-4 sm:grid-cols-2">
      <Detail label="Equipo intervenido" value={item.equipmentIntervened || item.assetName} />
      <Detail label="Tipo / orden" value={`${display(item.type)}${item.failureReportId ? ` · F-${item.failureReportId}` : ''}`} />
      <Detail label="Síntoma inicialmente reportado" value={item.initialReportedSymptom} />
      <Detail label="Falla real encontrada" value={item.actualFailure} />
      <Detail label="Causa raíz" value={item.rootCause} />
      <Detail label="Tareas ejecutadas" value={item.tasksDescription} />
      <Detail label="Fecha reportada" value={formatDate(item.interventionReportedAt)} />
      <Detail label="Inicio de revisión" value={formatDate(item.inspectionStartedAt)} />
      <Detail label="Ejecución / cierre" value={formatDate(item.executedAt)} />
      <Detail label="Fecha de mantenimiento" value={item.maintenanceDate} />
      <Detail label="Tiempo de trabajo (minutos)" value={item.workMinutes} />
      <Detail label="Pruebas realizadas" value={item.testsPerformed} />
      <Detail label="Estado final del equipo" value={item.finalEquipmentState} />
      <Detail label="Recomendaciones" value={item.recommendations} />
      <Detail label="Tareas pendientes" value={item.pendingTasks} />
      <Detail label="Técnico responsable" value={item.technicianName} />
      <Detail label="Recibido a conformidad por" value={item.receivedBy} />
      <Detail label="Proveedor" value={item.provider} />
      <Detail label="Costo" value={item.cost} />
      <Detail label="Próxima fecha recomendada" value={item.nextRecommendedDate} />
      <Detail label="Estado del registro" value={item.status} />
      <div className="sm:col-span-2">
        <dt className="text-[10px] uppercase tracking-wide text-gray-500">Repuestos e insumos</dt>
        <dd className="mt-1 text-xs text-gray-200">
          {item.parts?.length ? (
            <ul className="space-y-1">
              {item.parts.map((part, index) => (
                <li key={`${part.partNumber}-${index}`}>
                  {display(part.name)} · Parte: {display(part.partNumber)} · Marca: {display(part.brand)} · Cantidad: {display(part.quantity)}
                </li>
              ))}
            </ul>
          ) : display(item.replacedParts)}
        </dd>
      </div>
      {item.evidences?.length > 0 && (
        <div className="sm:col-span-2">
          <dt className="text-[10px] uppercase tracking-wide text-gray-500">Evidencias registradas</dt>
          <dd className="mt-1 flex flex-wrap gap-3 text-xs">
            {item.evidences.map((url, index) => (
              <EvidenceDownload key={`${url}-${index}`} url={url} index={index} />
            ))}
          </dd>
        </div>
      )}
    </div>
  );
}

export default function Historial() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setHistory(await getTechnicianMaintenanceHistory());
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'No fue posible cargar el historial de mantenimientos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getTechnicianMaintenanceHistory()
      .then((result) => { if (active) setHistory(result); })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'No fue posible cargar el historial de mantenimientos.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="space-y-4 rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400"><CalendarClock size={16} /></div>
          <div>
            <h2 className="text-[13px] font-semibold text-white">Historial de mantenimientos realizados</h2>
            <p className="text-[11px] text-gray-400">Revisiones ejecutadas por tu usuario con los datos y respuestas registradas.</p>
          </div>
        </div>
        <button type="button" onClick={refresh} aria-label="Actualizar historial" className="rounded p-2 text-gray-300 hover:bg-white/10"><RefreshCw size={14} /></button>
      </div>

      {error && <p role="alert" className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {loading ? <p className="text-sm text-gray-400">Cargando historial...</p>
        : history.length === 0 ? <p className="rounded-lg border border-[#30485a] p-4 text-sm text-gray-400">Aún no hay revisiones ejecutadas registradas para este técnico.</p>
          : <div className="space-y-2">
            {history.map((item) => (
              <details key={item.id} className="rounded-md border border-[#30485a] bg-[#102a3d]">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-white">{item.equipmentIntervened || item.assetName || 'Activo sin nombre'}</span>
                    <span className="mt-1 block text-[11px] text-gray-400">
                      {item.failureReportId ? `F-${item.failureReportId}` : `Mantenimiento #${item.id}`} · {formatDate(item.executedAt)}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                    <CheckCircle2 size={10} />{display(item.finalEquipmentState || item.status)}
                  </span>
                </summary>
                <HistoryDetails item={item} />
              </details>
            ))}
          </div>}
    </section>
  );
}
