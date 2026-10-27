import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  Wrench,
  RefreshCcw,
  X,
} from 'lucide-react';
import {
  getAssignedAssets,
  getPredictiveAssets,
  savePredictiveFeedback,
} from '../../services/assetService';
import { requestPreventiveSchedule } from '../../services/preventiveMaintenanceNavigation';

const FAILURE_TYPES = [
  'Normal',
  'Vibration Issue',
  'Overheating',
  'Pressure Drop',
  'Electrical Fault',
];

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
  Alto: 'border-red-400/30 bg-red-500/15 text-red-300',
  Medio: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  Bajo: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  'Sin datos': 'border-slate-400/30 bg-slate-500/15 text-slate-300',
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

    // 2. Estado de salud del motor para la barra visual
    let healthValue;
    if (!record) {
      healthValue = 0;
    } else if (isAlert) {
      healthValue = Math.max(5, 100 - confidencePct);
    } else {
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
  return mapPredictiveAssets(
    predictiveAssets.filter((asset) => assignedAssetIds.has(asset.assetId)),
  );
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

function Metric({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 shadow-lg min-w-0">
      <div className={`flex items-center gap-2 ${tone}`}>
        <Icon size={16} className="shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-[#30485a] bg-[#13293a] p-3 min-w-0">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <p className="mt-1 text-xs sm:text-sm font-semibold text-white break-words">{value}</p>
    </div>
  );
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
      setSelectedId((current) =>
        mappedData.some((item) => item.id === current) ? current : mappedData[0]?.id ?? null,
      );
    } catch (error) {
      setLoadError(
        error.response?.data?.message ||
          error.message ||
          'No fue posible consultar el historial predictivo.',
      );
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
        setSelectedId((current) =>
          mappedData.some((item) => item.id === current) ? current : mappedData[0]?.id ?? null,
        );
      })
      .catch((error) => {
        if (!cancelled)
          setLoadError(
            error.response?.data?.message ||
              error.message ||
              'No fue posible consultar el historial predictivo.',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignedOnly]);

  const selected = equipment.find((item) => item.id === selectedId) || equipment[0];
  const feedbackValue =
    feedbackDraft?.recordId != null && feedbackDraft.recordId === selected?.record?.id
      ? feedbackDraft.value
      : selected?.record?.fallaRealConfirmada || selected?.record?.tipoFallaPredicha || '';

  const visibleEquipment = useMemo(
    () => (filter === 'Todos' ? equipment : equipment.filter((item) => item.risk === filter)),
    [equipment, filter],
  );

  const scheduleMaintenance = () => {
    if (!selected) return;
    const record = selected.record;
    const tipoFallaPredicha = record.tipoFallaPredicha;
    const tendenciaLstm = record.tendenciaLstm ?? record.tendencia_lstm;
    const esAlertaTemprana =
      tipoFallaPredicha === 'Normal' && tendenciaLstm && tendenciaLstm !== 'Normal';
    const predictiveRisk =
      record.predictionClass === 1 ? 'Alto' : esAlertaTemprana ? 'Medio' : 'Bajo';
    const razonConfianza = record.razonConfianza ?? record.razon_confianza;
    const confianzaLstm = record.confianzaLstm ?? record.confianza_lstm;
    const measurements = [
      `Riesgo predictivo: ${predictiveRisk}`,
      `Falla o señal detectada: ${traducirDiagnostico(record.affectedComponents || 'Sin detalle')}`,
      `Recomendación MLOps: ${getMlopsRecommendation(record)}`,
      ...(razonConfianza ? [`¿Por qué este porcentaje?: ${traducirDiagnostico(razonConfianza)}`] : []),
      ...(tendenciaLstm ? [`Tendencia LSTM: ${traducirDiagnostico(tendenciaLstm)}`] : []),
      ...(confianzaLstm != null && Number.isFinite(Number(confianzaLstm))
        ? [`Confianza de clase LSTM: ${Math.round(Number(confianzaLstm) * 100)}%`]
        : []),
      `Respaldo del diagnóstico: ${selected.confidence}% (acuerdo entre modelos o regla física, no probabilidad calibrada)`,
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
      setEquipment((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, record: updatedRecord } : item,
        ),
      );
      setFeedbackDraft({
        recordId: updatedRecord.id,
        value: updatedRecord.fallaRealConfirmada,
      });
      setMessage('La falla real quedó guardada para futuras evaluaciones del modelo.');
    } catch (error) {
      setLoadError(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message ||
          'No fue posible guardar la validación de la predicción.',
      );
    } finally {
      setFeedbackSaving(false);
    }
  };

  if (loading && equipment.length === 0) {
    return (
      <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-12 text-center text-emerald-300 font-bold shadow-xl">
        <RefreshCcw size={28} className="mx-auto mb-3 animate-spin text-emerald-400" />
        <p className="text-sm">Cargando telemetría de sensores y modelo predictivo...</p>
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-12 text-center text-slate-400 shadow-xl text-sm">
        {loadError ||
          (assignedOnly
            ? 'No tienes activos asignados con motor y telemetría predictiva.'
            : 'No hay activos marcados con motor.')}
      </div>
    );
  }

  return (
    <section className="space-y-5 text-white min-w-0">
      {/* Header Principal */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300">
            <Activity size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Centro de mantenimiento
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Mantenimiento predictivo y alertas
          </h1>
          <p className="mt-0.5 text-xs text-slate-400 max-w-2xl">
            Anticipa fallas con lecturas de sensores y señales de operación en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          <button
            type="button"
            onClick={cargarEquipos}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-[#102a3d] border border-[#2d4055] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#1d3d52] hover:text-white"
          >
            <RefreshCcw size={16} />
            <span>Actualizar Modelo</span>
          </button>
          <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-200">
            <Gauge size={16} />
            <span>Sistema en vivo</span>
          </div>
        </div>
      </header>

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
        <Metric
          label="Equipos monitoreados"
          value={equipment.length}
          icon={Gauge}
          tone="text-emerald-300"
        />
        <Metric
          label="Alertas activas"
          value={equipment.filter((item) => item.risk === 'Alto' || item.risk === 'Medio').length}
          icon={AlertTriangle}
          tone="text-amber-300"
        />
        <Metric
          label="Confianza media IA"
          value={
            equipment.some((item) => item.record)
              ? `${Math.round(
                  equipment
                    .filter((item) => item.record)
                    .reduce((total, item) => total + item.confidence, 0) /
                    equipment.filter((item) => item.record).length,
                )}%`
              : 'Sin lecturas'
          }
          icon={Activity}
          tone="text-cyan-300"
        />
      </div>

      {/* Avisos de Estado y Alertas */}
      {loadError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
        >
          <span className="min-w-0 flex-1">{loadError}</span>
          <button
            type="button"
            onClick={() => setLoadError('')}
            className="text-red-300 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-emerald-300 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Disposición Principal: Lista y Panel de Detalle */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {/* Lista de Equipos */}
        <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white">Alertas por equipo</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Selecciona un equipo para consultar la telemetría y recomendación del modelo.
              </p>
            </div>

            {/* Filtros de Riesgo */}
            <div className="flex flex-wrap gap-1 rounded-lg bg-[#0d1f2d] p-1 border border-[#2d4055]">
              {['Todos', 'Alto', 'Medio', 'Bajo', 'Sin datos'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    filter === option
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {visibleEquipment.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setMessage('');
                }}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selected?.id === item.id
                    ? 'border-emerald-400/80 bg-[#1a382d] shadow-lg ring-1 ring-emerald-400/40'
                    : 'border-[#30485a] bg-[#102a3d] hover:border-emerald-400/50 hover:bg-[#143247]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <Wrench size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs sm:text-sm font-semibold text-white">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Activo #{item.assetId} · {item.id} · {item.location}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      riskStyles[item.risk]
                    }`}
                  >
                    {item.risk}
                  </span>
                </div>

                {/* Barra de Estado de Salud del Motor */}
                <div className="mt-3.5 space-y-1.5 border-t border-white/5 pt-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium">Estado de salud del motor</span>
                    <span className="font-semibold text-slate-200">
                      {item.record ? `${item.confidence}% respaldo IA` : 'Sin lecturas'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        healthStyles[item.risk]
                      }`}
                      style={{ width: `${item.health}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Aside Detalle de Equipo Seleccionado */}
        {selected && (
          <aside className="rounded-xl border border-[#2d4055] bg-[#102a3d] p-4 sm:p-5 shadow-xl min-w-0 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Equipo seleccionado
                </p>
                <h2 className="mt-0.5 text-base sm:text-lg font-bold text-white leading-tight">
                  {selected.name}
                </h2>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  riskStyles[selected.risk]
                }`}
              >
                {selected.risk}
              </span>
            </div>

            {/* Grid de Métricas Telemetría */}
            <div className="grid grid-cols-2 gap-2.5">
              <Info
                label="Temperatura"
                value={selected.record ? `${selected.record.temperature} °C` : 'Sin lectura'}
              />
              <Info
                label="Vibración"
                value={selected.record ? `${selected.record.vibration} Hz` : 'Sin lectura'}
              />
              <Info
                label="Presión"
                value={selected.record ? `${selected.record.pressure} bar` : 'Sin lectura'}
              />
              <Info
                label="Consumo"
                value={
                  selected.record ? `${selected.record.energyConsumption} kW` : 'Sin lectura'
                }
              />
              <Info label="Próximo servicio" value={selected.nextService} />
              <Info label="Ubicación" value={selected.location} />
              <div className="col-span-2">
                <Info label="Señal detectada" value={selected.signal} />
              </div>
            </div>

            {/* Recomendación MLOps */}
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-300">
                <Clock3 size={16} className="shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Recomendación MLOps
                </span>
              </div>
              <p className="text-xs leading-relaxed text-amber-100 font-medium">
                {getMlopsRecommendation(selected.record)}
              </p>

              {selected.record && (
                <div className="border-t border-amber-300/20 pt-2.5 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200">
                    ¿Por qué este porcentaje?
                  </p>
                  <p className="text-xs leading-relaxed text-amber-100/90">
                    {traducirDiagnostico(
                      selected.record.razonConfianza ||
                        selected.record.razon_confianza ||
                        'No se guardó el desglose de votos para esta lectura. Las nuevas predicciones incluirán la explicación.',
                    )}
                  </p>
                  {selected.record.confianzaLstm != null && (
                    <p className="text-xs text-slate-300 pt-1">
                      Tendencia LSTM:{' '}
                      <strong className="text-white font-semibold">
                        {traducirDiagnostico(selected.record.tendenciaLstm || 'No disponible')}
                      </strong>{' '}
                      · Confianza {Math.round(Number(selected.record.confianzaLstm) * 100)}%
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Validación Técnica Feedback */}
            {selected.record && (
              <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3.5 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                    Validación del técnico
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Predicción IA:{' '}
                    <strong className="text-white font-semibold">
                      {traducirDiagnostico(selected.record.tipoFallaPredicha || 'No disponible')}
                    </strong>
                  </p>
                  {selected.record.fallaRealConfirmada && (
                    <p className="mt-0.5 text-xs text-emerald-300 font-medium">
                      Falla confirmada: {traducirDiagnostico(selected.record.fallaRealConfirmada)}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-slate-300"
                    htmlFor="confirmed-failure"
                  >
                    Si la inspección indica otra falla, selecciónala:
                  </label>
                  <select
                    id="confirmed-failure"
                    value={feedbackValue}
                    onChange={(event) =>
                      setFeedbackDraft({
                        recordId: selected.record.id,
                        value: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#30485a] bg-[#0d1f2d] px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-cyan-400 min-h-[44px]"
                  >
                    <option value="">Selecciona la falla real</option>
                    {[
                      ...new Set(
                        [...FAILURE_TYPES, selected.record.tipoFallaPredicha].filter(Boolean),
                      ),
                    ].map((failureType) => (
                      <option key={failureType} value={failureType}>
                        {traducirDiagnostico(failureType)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={feedbackSaving || !selected.record.tipoFallaPredicha}
                    onClick={() => saveFeedback(selected.record.tipoFallaPredicha)}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {feedbackSaving ? 'Guardando...' : 'Confirmar predicción IA'}
                  </button>
                  <button
                    type="button"
                    disabled={feedbackSaving || !feedbackValue}
                    onClick={() => saveFeedback(feedbackValue)}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {feedbackSaving ? 'Guardando...' : 'Guardar falla real'}
                  </button>
                </div>
              </div>
            )}

            {/* Acción Programar Mantenimiento */}
            {canSchedule && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!selected.record}
                  onClick={scheduleMaintenance}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-950/40"
                >
                  Programar mantenimiento
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}