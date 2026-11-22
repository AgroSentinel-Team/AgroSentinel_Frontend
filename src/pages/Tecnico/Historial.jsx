import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, ChevronDown, Download, LoaderCircle, RefreshCw, Wrench } from 'lucide-react';
import { getTechnicianMaintenanceHistory } from '../../services/technicianService';
import { getPreventiveMaintenanceEvidence } from '../../services/preventiveMaintenanceService';

function display(value, fallback = 'No registrado') {
  return value === null || value === undefined || value === '' ? fallback : value;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('es-CO') : 'No registrada';
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-sand-200 bg-sand-50 p-3 min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-xs sm:text-sm font-medium text-ink-900">
        {display(value)}
      </dd>
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
      setError(
        !requestError.response
          ? 'Las evidencias se descargan cuando hay conexión.'
          : requestError.response?.data?.message ||
              requestError.message ||
              'No fue posible descargar la evidencia.',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-ocean-300/60 bg-info-soft px-3 py-1.5 text-xs font-semibold text-ocean-700 hover:bg-ocean-300/30 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {downloading ? (
          <>
            <LoaderCircle size={14} className="animate-spin text-ocean-700" />
            <span>Descargando…</span>
          </>
        ) : (
          <>
            <Download size={14} className="text-ocean-700 shrink-0" />
            <span>Evidencia {index + 1}</span>
          </>
        )}
      </button>
      {error && (
        <span role="alert" className="text-[11px] font-medium text-error-text">
          {error}
        </span>
      )}
    </div>
  );
}

function HistoryDetails({ item }) {
  return (
    /* DOS COLUMNAS (y tres en pantallas grandes) para aprovechar el espacio */
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-sand-200 bg-sand-50 p-3 sm:gap-3 sm:p-5 lg:grid-cols-3">
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

      <div className="rounded-lg border border-sand-200 bg-sand-50 p-3 sm:col-span-2 lg:col-span-3">
        <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
          Repuestos e insumos
        </dt>
        <dd className="mt-1.5 text-xs sm:text-sm text-ink-900">
          {item.parts?.length ? (
            <ul className="space-y-1.5 divide-y divide-sand-200/70">
              {item.parts.map((part, index) => (
                <li key={`${part.partNumber}-${index}`} className="pt-1.5 first:pt-0 font-mono text-xs text-ink-600">
                  <strong className="text-ink-900 font-sans font-semibold">{display(part.name)}</strong> · Parte: {display(part.partNumber)} · Marca: {display(part.brand)} · Cantidad: <span className="text-ocean-700 font-bold">{display(part.quantity)}</span>
                </li>
              ))}
            </ul>
          ) : (
            display(item.replacedParts)
          )}
        </dd>
      </div>

      {item.evidences?.length > 0 && (
        <div className="rounded-lg border border-sand-200 bg-sand-50 p-3 sm:col-span-2 lg:col-span-3">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
            Evidencias registradas
          </dt>
          <dd className="mt-2 flex flex-wrap gap-2.5">
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
    <section className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-5 text-ink-900 min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-sand-200 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-forest-300/50 bg-success-soft text-forest-700">
            <CalendarClock size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink-900">
              Historial de mantenimientos realizados
            </h2>
            <p className="mt-0.5 text-xs text-ink-600">
              Revisiones ejecutadas por tu usuario con los datos y respuestas registradas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          aria-label="Actualizar historial"
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-sand-200 bg-sand-50 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-sand-100 transition-all duration-200 ease-out shrink-0"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-ocean-700' : ''} />
          <span>Actualizar</span>
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-error/20 bg-error-soft p-3.5 text-xs text-error-text">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-xs text-ink-600">
          <LoaderCircle className="mx-auto mb-2 animate-spin text-ocean-700" size={24} />
          <span>Cargando historial...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-8 text-center text-xs text-ink-600 space-y-2">
          <Wrench size={24} className="mx-auto text-ink-600" />
          <p className="font-semibold text-ink-600">Aún no hay revisiones ejecutadas registradas para este técnico.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {history.map((item) => (
            <details key={item.id} className="group rounded-xl border border-sand-200 bg-sand-50 shadow-md overflow-hidden transition-all">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 hover:bg-sand-100 transition-all duration-200 ease-out">
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs sm:text-sm font-bold text-ink-900">
                    {item.equipmentIntervened || item.assetName || 'Activo sin nombre'}
                  </span>
                  <span className="mt-1 block text-xs font-mono text-ink-600">
                    {item.failureReportId ? `F-${item.failureReportId}` : `Mantenimiento #${item.id}`} · {formatDate(item.executedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-forest-300/50 bg-success-soft px-3 py-1 text-xs font-semibold text-forest-700">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{display(item.finalEquipmentState || item.status)}</span>
                  </span>
                  <ChevronDown size={18} className="text-ink-600 transition-transform duration-200 group-open:rotate-180 shrink-0" />
                </div>
              </summary>
              <HistoryDetails item={item} />
            </details>
          ))}
        </div>
      )}
    </section>
  );
}