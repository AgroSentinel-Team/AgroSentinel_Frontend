import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Gauge, Wrench, RefreshCcw } from 'lucide-react';
import { getAssignedAssets, getPredictiveAssets, savePredictiveFeedback } from '../../services/assetService';
import { requestPreventiveSchedule } from '../../services/preventiveMaintenanceNavigation';

const FAILURE_TYPES = ['Normal', 'Vibration Issue', 'Overheating', 'Pressure Drop', 'Electrical Fault'];
const FAILURE_TYPE_LABELS = {
  Normal: 'Normal',
  'Vibration Issue': 'Problema de vibración',
  Overheating: 'Sobrecalentamiento',
  'Pressure Drop': 'Caída de presión',
  'Electrical Fault': 'Falla eléctrica',
};

function traducirDiagnostico(texto) {
  if (typeof texto !== 'string') return texto;
  return Object.entries(FAILURE_TYPE_LABELS).reduce(
    (resultado, [original, traducido]) => resultado.replaceAll(original, traducido),
    texto,
  );
}

const riskStyles = {
  Alto: 'border-red-400/30 bg-red-500/10 text-red-300',
  Medio: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  Bajo: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  'Sin datos': 'border-slate-400/30 bg-slate-500/10 text-slate-300',
};

const healthStyles = {
  Alto: 'bg-red-400',
  Medio: 'bg-amber-400',
  Bajo: 'bg-emerald-400',
  'Sin datos': 'bg-slate-500',
};

function mapPredictiveAssets(data) {
  return data.map((asset) => {
    const record = asset.latestRecord;
    const isAlert = record?.predictionClass === 1;

    // 1. Confianza real que entrega el modelo (qué tan seguro está de la predicción)
    const rawValue = record?.confidence != null ? Number(record.confidence) : 0;
    const confidencePct = rawValue > 1 ? Math.round(rawValue) : Math.round(rawValue * 100);

    // 2. Estado de salud del motor para la barra visual:
    // Si hay alerta de falla, la salud física del motor se reduce drásticamente de forma proporcional a la confianza.
    // Si opera con normalidad, la salud es el inverso de la confianza de falla (o un porcentaje alto de estabilidad).
    let healthValue;
    if (!record) {
      healthValue = 0;
    } else if (isAlert) {
      // Si va a fallar, la barra de salud refleja el margen restante (ej. 100% confianza de falla = 0% a 15% de salud)
      healthValue = Math.max(5, 100 - confidencePct);
    } else {
      // Si está normal, la salud es óptima
      healthValue = 100;
    }

    return {
      id: asset.machineId,
      assetId: asset.assetId,
      name: [asset.name, asset.brand, asset.model].filter(Boolean).join(' '),
      location: asset.location || 'Sin ubicación',
      confidence: confidencePct,
      health: healthValue,
      risk: !record ? 'Sin datos' : isAlert ? 'Alto' : 'Bajo',
      nextService: !record ? 'Sin lecturas' : isAlert ? 'Inmediato' : 'Según plan preventivo',
      signal: traducirDiagnostico(record?.affectedComponents || 'Sin lecturas registradas'),
      record,
    };
  });
}

async function loadPredictiveEquipment(assignedOnly) {
  if (!assignedOnly) return mapPredictiveAssets(await getPredictiveAssets());

  const [predictiveAssets, assignedAssets] = await Promise.all([
    getPredictiveAssets(),
    getAssignedAssets(),
  ]);
  const assignedAssetIds = new Set(assignedAssets.map((asset) => asset.id));
  return mapPredictiveAssets(predictiveAssets.filter((asset) => assignedAssetIds.has(asset.assetId)));
}

function getMlopsRecommendation(record) {
  if (!record) {
    return 'Este motor todavía no tiene lecturas predictivas registradas.';
  }

  const tipoFallaPredicha = record.tipoFallaPredicha;
  const tendenciaLstm = record.tendencia_lstm ?? record.tendenciaLstm;
  const confianzaLstm = record.confianza_lstm ?? record.confianzaLstm;
  const confianzaValida = confianzaLstm != null && Number.isFinite(Number(confianzaLstm));

  if (typeof tipoFallaPredicha !== 'string' || typeof tendenciaLstm !== 'string' || !confianzaValida) {
    return 'La recomendación de contexto temporal no está disponible para esta lectura.';
  }

  const confianzaPct = Math.round(Number(confianzaLstm) * 100);
  const fallaPredichaEs = traducirDiagnostico(tipoFallaPredicha);
  const tendenciaLstmEs = traducirDiagnostico(tendenciaLstm);

  if (tipoFallaPredicha === 'Normal' && tendenciaLstm !== 'Normal') {
    return `⚠️ Alerta Temprana de Degradación: Los parámetros instantáneos están estables, pero la red neuronal histórica advierte con un ${confianzaPct}% de seguridad que el motor se dirige hacia un ${tendenciaLstmEs}. Se sugiere revisión preventiva temprana.`;
  }

  if (tipoFallaPredicha !== 'Normal' && tendenciaLstm === tipoFallaPredicha) {
    return `🚨 Falla Crítica Confirmada: Anomalía de ${fallaPredichaEs} detectada en tiempo real y respaldada por el desgaste histórico (${confianzaPct}%). Detener equipo inmediatamente.`;
  }

  if (tipoFallaPredicha === 'Normal' && tendenciaLstm === 'Normal') {
    return `✅ Operación Óptima: El ensamble instantáneo y el análisis temporal (${confianzaPct}%) coinciden en que el motor opera con normalidad. Continuar ciclos regulares.`;
  }

  return `⚠️ Precaución: El modelo instantáneo detecta ${fallaPredichaEs} pero la tendencia histórica marca ${tendenciaLstmEs}. Requiere inspección manual para confirmar.`;
}

export default function MantenimientoPredictivo({ assignedOnly = false }) {
  const [equipment, setEquipment] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('Todos');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const canSchedule = ['ADMIN', 'ADMINISTRADOR'].includes(
    (localStorage.getItem('rol') ?? '').toUpperCase().replace(/^ROLE_/, ''),
  );
  const [feedbackDraft, setFeedbackDraft] = useState(null);
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  const cargarEquipos = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const mappedData = await loadPredictiveEquipment(assignedOnly);
      setEquipment(mappedData);
      setSelectedId((current) => mappedData.some((item) => item.id === current) ? current : mappedData[0]?.id ?? null);
    } catch (error) {
      setLoadError(error.response?.data?.message || error.message || 'No fue posible consultar el historial predictivo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadPredictiveEquipment(assignedOnly)
      .then((mappedData) => {
        if (cancelled) return;
        setEquipment(mappedData);
        setSelectedId((current) => mappedData.some((item) => item.id === current) ? current : mappedData[0]?.id ?? null);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.response?.data?.message || error.message || 'No fue posible consultar el historial predictivo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [assignedOnly]);

  const selected = equipment.find((item) => item.id === selectedId) || equipment[0];
  const feedbackValue = feedbackDraft?.recordId != null
    && feedbackDraft.recordId === selected?.record?.id
    ? feedbackDraft.value
    : selected?.record?.fallaRealConfirmada || selected?.record?.tipoFallaPredicha || '';
  
  const visibleEquipment = useMemo(
    () => filter === 'Todos' ? equipment : equipment.filter((item) => item.risk === filter),
    [equipment, filter],
  );

  const acknowledgeAlert = () => {
    if (!selected) return;
    setEquipment((current) => current.map((item) => item.id === selected.id ? { ...item, risk: 'Medio' } : item));
    setMessage(`Alerta de ${selected.name} marcada para seguimiento.`);
  };

  const scheduleMaintenance = () => {
    if (!selected) return;
    const record = selected.record;
    const predictiveRisk = record.predictionClass === 1 ? 'Alto' : 'Bajo';
    const measurements = [
      `Riesgo predictivo: ${predictiveRisk}`,
      `Falla o señal detectada: ${traducirDiagnostico(record.affectedComponents || 'Sin detalle')}`,
      `Confianza del modelo: ${selected.confidence}%`,
      `Temperatura: ${record.temperature} °C`,
      `Vibración: ${record.vibration} Hz`,
      `Presión: ${record.pressure} bar`,
      `Consumo: ${record.energyConsumption} kW`,
      `Ubicación: ${selected.location}`,
    ];
    requestPreventiveSchedule({
      assetId: selected.assetId,
      assetName: selected.name,
      risk: predictiveRisk,
      confidence: selected.confidence,
      predictiveContext: measurements.join('\n'),
    });
  };

  const saveFeedback = async (fallaRealConfirmada) => {
    if (!selected?.record?.id || !fallaRealConfirmada || feedbackSaving) return;
    setFeedbackSaving(true);
    setMessage('');
    setLoadError('');
    try {
      const updatedRecord = await savePredictiveFeedback(selected.record.id, fallaRealConfirmada);
      setEquipment((current) => current.map((item) => item.id === selected.id
        ? { ...item, record: updatedRecord }
        : item));
      setFeedbackDraft({ recordId: updatedRecord.id, value: updatedRecord.fallaRealConfirmada });
      setMessage('La falla real quedó guardada para futuras evaluaciones del modelo.');
    } catch (error) {
      setLoadError(
        error.response?.data?.message
        || error.response?.data?.detail
        || error.message
        || 'No fue posible guardar la validación de la predicción.',
      );
    } finally {
      setFeedbackSaving(false);
    }
  };

  if (loading && equipment.length === 0) {
    return <div className="p-10 text-center text-emerald-300 font-bold">Cargando telemetría de sensores...</div>;
  }

  if (equipment.length === 0) {
    return <div className="p-10 text-center text-slate-400">{loadError || (assignedOnly ? 'No tienes activos asignados con motor y telemetría predictiva.' : 'No hay activos marcados con motor.')}</div>;
  }

  return (
    <section className="space-y-5 text-white">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-300">
            <Activity size={17} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Centro de mantenimiento</span>
          </div>
          <h1 className="mt-2 text-[22px] font-bold">Mantenimiento predictivo y alertas</h1>
          <p className="mt-1 max-w-2xl text-[11px] text-slate-400">Anticipa fallas con lecturas de sensores y señales de operación.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={cargarEquipos} className="flex items-center gap-2 rounded-lg bg-[#102a3d] border border-[#2d4055] px-3 py-2 text-[10px] text-slate-300 hover:text-white transition">
            <RefreshCcw size={14} /> Actualizar Modelo
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[10px] text-emerald-200">
            <Gauge size={14} /> Sistema en vivo
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Equipos monitoreados" value={equipment.length} icon={Gauge} tone="text-emerald-300" />
        <Metric label="Alertas activas" value={equipment.filter((item) => item.risk === 'Alto' || item.risk === 'Medio').length} icon={AlertTriangle} tone="text-amber-300" />
        <Metric label="Confianza media IA" value={equipment.some((item) => item.record) ? `${Math.round(equipment.filter((item) => item.record).reduce((total, item) => total + item.confidence, 0) / equipment.filter((item) => item.record).length)}%` : 'Sin lecturas'} icon={Activity} tone="text-cyan-300" />
      </div>

      {loadError && <div role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-200">{loadError}</div>}
      {message && <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"><CheckCircle2 size={14} /> {message}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.85fr]">
        <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold">Alertas por equipo</h2>
              <p className="mt-1 text-[10px] text-slate-400">Selecciona un equipo para ver su recomendación.</p>
            </div>
            <div className="flex gap-1 rounded-lg bg-[#0d1f2d] p-1">
              {['Todos', 'Alto', 'Medio', 'Bajo', 'Sin datos'].map((option) => (
                <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-md px-2.5 py-1.5 text-[9px] font-semibold transition ${filter === option ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {visibleEquipment.map((item) => (
              <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setMessage(''); }} className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === item.id ? 'border-emerald-400/60 bg-[#1a382d]' : 'border-[#30485a] bg-[#102a3d] hover:border-emerald-400/40'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300"><Wrench size={15} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold">{item.name}</p>
                      <p className="mt-1 text-[10px] text-slate-400">Activo #{item.assetId} · {item.id} · {item.location}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${riskStyles[item.risk]}`}>{item.risk}</span>
                </div>

                {/* SEPARACIÓN VISUAL: Barra de Estado de Salud del Motor vs Confianza de Falla de la IA */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>Estado de salud del motor</span>
                    <span className="font-semibold text-slate-300">{item.record ? `${item.confidence}% respaldo del diagnóstico` : 'Sin lecturas'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
                      <div className={`h-full rounded-full ${healthStyles[item.risk]}`} style={{ width: `${item.health}%` }} />
                    </div>
                  </div>
                </div>

              </button>
            ))}
          </div>
        </div>

        {selected && (
          <aside className="rounded-xl border border-[#2d4055] bg-[#102a3d] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Equipo seleccionado</p>
                <h2 className="mt-1 text-[15px] font-semibold">{selected.name}</h2>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${riskStyles[selected.risk]}`}>{selected.risk}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
              <Info label="Temperatura" value={selected.record ? `${selected.record.temperature} °C` : 'Sin lectura'} />
              <Info label="Vibración" value={selected.record ? `${selected.record.vibration} Hz` : 'Sin lectura'} />
              <Info label="Presión" value={selected.record ? `${selected.record.pressure} bar` : 'Sin lectura'} />
              <Info label="Consumo" value={selected.record ? `${selected.record.energyConsumption} kW` : 'Sin lectura'} />
              <Info label="Próximo servicio" value={selected.nextService} />
              <Info label="Ubicación" value={selected.location} />
              <Info label="Señal detectada" value={selected.signal} />
            </div>

            <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-amber-300"><Clock3 size5={14} /><span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Recomendación MLOps</span></div>
              <p className="mt-2 text-[11px] leading-relaxed text-amber-100">
                {getMlopsRecommendation(selected.record)}
              </p>
              {selected.record && (
                <div className="mt-3 border-t border-amber-300/15 pt-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-200">¿Por qué este porcentaje?</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-amber-100/80">
                    {traducirDiagnostico(selected.record.razonConfianza
                      || selected.record.razon_confianza
                      || 'No se guardó el desglose de votos para esta lectura. Las nuevas predicciones incluirán la explicación.')}
                  </p>
                  {selected.record.confianzaLstm != null && (
                    <p className="mt-2 text-[10px] text-slate-300">
                      Tendencia LSTM: {traducirDiagnostico(selected.record.tendenciaLstm || 'No disponible')} · confianza de clase {Math.round(Number(selected.record.confianzaLstm) * 100)}%.
                    </p>
                  )}
                </div>
              )}
            </div>

            {selected.record && (
              <div className="mt-4 space-y-3 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200">Validación del técnico</p>
                  <p className="mt-1 text-[10px] text-slate-300">
                    Predicción IA: {traducirDiagnostico(selected.record.tipoFallaPredicha || 'No disponible')}
                  </p>
                  {selected.record.fallaRealConfirmada && (
                    <p className="mt-1 text-[10px] text-emerald-300">
                      Falla confirmada: {traducirDiagnostico(selected.record.fallaRealConfirmada)}
                    </p>
                  )}
                </div>
                <label className="block text-[10px] text-slate-300" htmlFor="confirmed-failure">
                  Si la inspección indica otra falla, selecciónala:
                </label>
                <select
                  id="confirmed-failure"
                  value={feedbackValue}
                  onChange={(event) => setFeedbackDraft({
                    recordId: selected.record.id,
                    value: event.target.value,
                  })}
                  className="w-full rounded-lg border border-[#30485a] bg-[#0d1f2d] px-3 py-2 text-[11px] text-white"
                >
                  <option value="">Selecciona la falla real</option>
                  {[...new Set([...FAILURE_TYPES, selected.record.tipoFallaPredicha].filter(Boolean))].map((failureType) => (
                    <option key={failureType} value={failureType}>{traducirDiagnostico(failureType)}</option>
                  ))}
                </select>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={feedbackSaving || !selected.record.tipoFallaPredicha}
                    onClick={() => saveFeedback(selected.record.tipoFallaPredicha)}
                    className="rounded-lg border border-cyan-400/40 bg-cyan-700 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {feedbackSaving ? 'Guardando...' : 'Confirmar predicción IA'}
                  </button>
                  <button
                    type="button"
                    disabled={feedbackSaving || !feedbackValue}
                    onClick={() => saveFeedback(feedbackValue)}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {feedbackSaving ? 'Guardando...' : 'Guardar falla real'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <button type="button" disabled={!selected.record} onClick={acknowledgeAlert} className="rounded-lg border border-amber-400/40 bg-amber-50 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-950 transition hover:bg-amber-400 disabled:opacity-50">Reconocer alerta</button>
              {canSchedule && <button type="button" disabled={!selected.record} onClick={scheduleMaintenance} className="rounded-lg border border-emerald-400/40 bg-emerald-600 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emerald-500 disabled:opacity-50">Programar mantenimiento</button>}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, icon: Icon, tone }) {
  return <div className="rounded-xl border border-[#2d4055] bg-[#172c3d] px-4 py-3"><div className={`flex items-center gap-2 ${tone}`}><Icon size={14} /><span className="text-[9px] font-semibold uppercase tracking-[0.14em]">{label}</span></div><p className="mt-2 text-[24px] font-bold text-white">{value}</p></div>;
}

function Info({ label, value }) {
  return <div className="rounded-lg border border-[#30485a] bg-[#13293a] p-2.5"><p className="text-[9px] text-slate-400">{label}</p><p className="mt-1 text-[10px] font-medium text-white">{value}</p></div>;
}