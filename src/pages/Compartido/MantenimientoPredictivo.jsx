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
  getPredictiveHistory,
  savePredictiveFeedback,
} from '../../services/assetService';
import { isNetworkAvailable, subscribeToNetworkChanges } from '../../services/offlineNetwork';
import { requestPreventiveSchedule } from '../../services/preventiveMaintenanceNavigation';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Select,
  Skeleton,
  StatCard,
} from '../../components/ui';

const TELEMETRY_POLL_INTERVAL = 30_000;

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

function formatRecordTimestamp(timestamp) {
  if (typeof timestamp !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(timestamp);
  if (!match) return timestamp;
  return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}:${match[6]} UTC`;
}

const riskStyles = {
  Alto: 'border-error/20 bg-error-soft text-error-text',
  Medio: 'border-gold-300 bg-gold-100 text-ink-900',
  Bajo: 'border-forest-300/50 bg-success-soft text-forest-700',
  'Sin datos': 'border-sand-200 bg-sand-100 text-ink-600',
};

const healthStyles = {
  Alto: 'bg-error',
  Medio: 'bg-gold-500',
  Bajo: 'bg-forest-500',
  'Sin datos': 'bg-sand-400',
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

function mergeLatestRecord(item, latestRecord) {
  const refreshed = mapPredictiveAssets([{
    assetId: item.assetId,
    machineId: item.id,
    name: item.name,
    location: item.location,
    latestRecord,
  }])[0];
  return { ...item, ...refreshed };
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

function Metric({ label, value, icon: Icon, accent }) {
  return (
    <StatCard
      label={label}
      value={value}
      icon={<Icon size={19} />}
      accent={accent}
    />
  );
}

function Info({ label, value }) {
  return (
    <Card variant="muted" className="min-w-0 rounded-xl p-3 shadow-none">
      <p className="truncate text-xs font-semibold uppercase tracking-wider text-ink-600">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink-900">{value}</p>
    </Card>
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
  const [refreshing, setRefreshing] = useState(false);

  const cargarEquipos = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setLoadError('');
    setMessage('');
    try {
      let mappedData = await loadPredictiveEquipment(assignedOnly);
      const selectedEquipment =
        mappedData.find((item) => item.id === selectedId) || mappedData[0];
      const connected = await isNetworkAvailable();
      if (selectedEquipment?.assetId != null && connected) {
        const history = await getPredictiveHistory(selectedEquipment.assetId);
        if (Array.isArray(history) && history.length > 0) {
          mappedData = mappedData.map((item) =>
            item.assetId === selectedEquipment.assetId
              ? mergeLatestRecord(item, history[0])
              : item,
          );
        }
      }
      setEquipment(mappedData);
      setSelectedId((current) =>
        mappedData.some((item) => item.id === current) ? current : mappedData[0]?.id ?? null,
      );
      setMessage(
        connected
          ? 'Telemetría e historial actualizados desde Spring Boot.'
          : 'Sin conexión: se muestran los últimos datos guardados en este dispositivo.',
      );
    } catch (error) {
      setLoadError(
        error.response?.data?.message ||
          error.message ||
          'No fue posible consultar el historial predictivo.',
      );
    } finally {
      setRefreshing(false);
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
  const selectedAssetId = selected?.assetId;

  useEffect(() => {
    let active = true;
    let interval;
    let unsubscribe;
    let refreshing = false;

    const refreshEquipment = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        if (!(await isNetworkAvailable())) return;
        const mappedData = await loadPredictiveEquipment(assignedOnly);
        if (!active) return;
        setEquipment(mappedData);
        setSelectedId((current) =>
          mappedData.some((item) => item.id === current) ? current : mappedData[0]?.id ?? null,
        );
        setLoadError('');
      } catch (error) {
        if (active) {
          setLoadError(
            error.response?.data?.message ||
              error.message ||
              'No fue posible actualizar la telemetría predictiva.',
          );
        }
      } finally {
        refreshing = false;
      }
    };

    const setPolling = (connected) => {
      if (!active) return;
      window.clearInterval(interval);
      interval = undefined;
      if (connected) {
        interval = window.setInterval(() => {
          void refreshEquipment();
        }, TELEMETRY_POLL_INTERVAL);
      }
    };

    void isNetworkAvailable()
      .then(setPolling)
      .catch((error) => {
        if (active) setLoadError(error.message || 'No se pudo consultar la conectividad.');
      });
    void subscribeToNetworkChanges((connected) => {
      setPolling(connected);
      if (connected) void refreshEquipment();
    })
      .then((stop) => {
        if (active) unsubscribe = stop;
        else void stop();
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'No se pudo iniciar el listener de red.');
      });

    return () => {
      active = false;
      window.clearInterval(interval);
      void unsubscribe?.();
    };
  }, [assignedOnly]);

  useEffect(() => {
    if (selectedAssetId == null) return undefined;
    let active = true;
    let interval;
    let unsubscribe;
    let refreshing = false;

    const refreshHistory = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        if (!(await isNetworkAvailable())) return;
        const history = await getPredictiveHistory(selectedAssetId);
        if (!active || !Array.isArray(history) || history.length === 0) return;
        const latestRecord = history[0];
        setEquipment((current) =>
          current.map((item) => {
            if (item.assetId !== selectedAssetId) return item;
            return mergeLatestRecord(item, latestRecord);
          }),
        );
      } catch (error) {
        if (active) {
          setLoadError(
            error.response?.data?.message ||
              error.message ||
              'No fue posible actualizar el historial predictivo.',
          );
        }
      } finally {
        refreshing = false;
      }
    };

    const setPolling = (connected) => {
      if (!active) return;
      window.clearInterval(interval);
      interval = undefined;
      if (connected) {
        interval = window.setInterval(() => {
          void refreshHistory();
        }, TELEMETRY_POLL_INTERVAL);
      }
    };

    void isNetworkAvailable()
      .then((connected) => {
        setPolling(connected);
        if (connected) void refreshHistory();
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'No se pudo consultar la conectividad.');
      });
    void subscribeToNetworkChanges((connected) => {
      setPolling(connected);
      if (connected) void refreshHistory();
    })
      .then((stop) => {
        if (active) unsubscribe = stop;
        else void stop();
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'No se pudo iniciar el listener de red.');
      });

    return () => {
      active = false;
      window.clearInterval(interval);
      void unsubscribe?.();
    };
  }, [selectedAssetId]);

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
      const result = await savePredictiveFeedback(
        selected.record.id,
        fallaRealConfirmada,
        true,
        selected.assetId,
      );
      const updatedRecord = result.queued
        ? {
            ...selected.record,
            fallaRealConfirmada,
            guardarParaReentrenamiento: true,
            localSyncPending: true,
          }
        : result;
      setEquipment((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, record: updatedRecord } : item,
        ),
      );
      setFeedbackDraft({
        recordId: selected.record.id,
        value: updatedRecord.fallaRealConfirmada,
      });
      setMessage(
        result.queued
          ? 'Confirmación guardada en este dispositivo; se sincronizará al recuperar la conexión.'
          : 'La falla real quedó guardada para futuras evaluaciones del modelo.',
      );
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
      <Card className="grid gap-3 p-5 sm:p-8">
        <Skeleton variant="rect" label="Cargando telemetría de sensores y modelo predictivo" />
        <Skeleton label="Cargando telemetría de sensores y modelo predictivo" className="max-w-sm" />
      </Card>
    );
  }

  if (equipment.length === 0) {
    return (
      <EmptyState
        icon={<Gauge size={22} />}
        title={assignedOnly ? 'Sin activos predictivos asignados' : 'Sin activos con motor'}
        description={
          loadError ||
          (assignedOnly
            ? 'No tienes activos asignados con motor y telemetría predictiva.'
            : 'No hay activos marcados con motor.')
        }
      />
    );
  }

  return (
    <section className="min-w-0 space-y-5 text-ink-900">
      {/* Header Principal */}
      <header className="flex flex-col gap-4 border-b border-sand-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-forest-700">
            <Activity size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Centro de mantenimiento
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Mantenimiento predictivo y alertas
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-600">
            Anticipa fallas con lecturas de sensores y señales de operación en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          <Button
            variant="ghost"
            onClick={cargarEquipos}
            disabled={refreshing}
            aria-label="Actualizar telemetría"
            title="Actualizar telemetría"
            leftIcon={<RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />}
          >
            <span>{refreshing ? 'Actualizando…' : 'Actualizar'}</span>
          </Button>
          <Badge variant="success" className="min-h-11 px-3.5">
            <Gauge size={16} />
            <span>Sistema en vivo</span>
          </Badge>
        </div>
      </header>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="Equipos monitoreados"
          value={equipment.length}
          icon={Gauge}
          accent="forest"
        />
        <Metric
          label="Alertas activas"
          value={equipment.filter((item) => item.risk === 'Alto' || item.risk === 'Medio').length}
          icon={AlertTriangle}
          accent="gold"
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
          accent="ocean"
        />
      </div>

      {/* Avisos de Estado y Alertas */}
      {loadError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-error/20 bg-error-soft p-3.5 text-sm text-error-text"
        >
          <span className="min-w-0 flex-1">{loadError}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLoadError('')}
            aria-label="Cerrar aviso"
            className="size-8 min-h-8 shrink-0"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {message && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-forest-300/50 bg-success-soft p-3.5 text-sm text-forest-700">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="shrink-0 text-forest-700" />
            <span>{message}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMessage('')}
            aria-label="Cerrar aviso"
            className="size-8 min-h-8 shrink-0"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {/* Disposición Principal: Lista y Panel de Detalle */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Lista de Equipos */}
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-sand-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Alertas por equipo</h2>
              <p className="mt-1 text-sm text-ink-600">
                Selecciona un equipo para consultar la telemetría y recomendación del modelo.
              </p>
            </div>

            {/* Filtros de Riesgo */}
            <div className="flex flex-wrap gap-1 rounded-xl border border-sand-200 bg-sand-100 p-1">
              {['Todos', 'Alto', 'Medio', 'Bajo', 'Sin datos'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  aria-pressed={filter === option}
                  className={`min-h-9 rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 ${
                    filter === option
                      ? 'bg-gold-500 text-pine-900 shadow-sm'
                      : 'text-ink-600 hover:bg-surface hover:text-ink-900'
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
                className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 hover:-translate-y-0.5 hover:shadow-md ${
                  selected?.id === item.id
                    ? 'border-forest-500 bg-success-soft shadow-sm ring-1 ring-forest-500/30'
                    : 'border-sand-200 bg-surface hover:border-forest-300 hover:bg-sand-50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-forest-700">
                      <Wrench size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-600">
                        Activo #{item.assetId} · {item.id} · {item.location}
                      </p>
                    </div>
                  </div>
                  <Badge className={`shrink-0 border ${riskStyles[item.risk]}`}>
                    {item.risk}
                  </Badge>
                </div>

                {/* Barra de Estado de Salud del Motor */}
                <div className="mt-3.5 space-y-1.5 border-t border-sand-200 pt-2.5">
                  <div className="flex items-center justify-between text-xs text-ink-600">
                    <span className="font-medium">Estado de salud del motor</span>
                    <span className="font-semibold text-ink-900">
                      {item.record ? `${item.confidence}% respaldo IA` : 'Sin lecturas'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
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
        </Card>

        {/* Aside Detalle de Equipo Seleccionado */}
        {selected && (
          <Card as="aside" className="min-w-0 space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-sand-200 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                  Equipo seleccionado
                </p>
                <h2 className="mt-0.5 text-base font-bold leading-tight text-ink-900 sm:text-lg">
                  {selected.name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-600">
                  <Clock3 size={13} className="shrink-0" />
                  {selected.record?.timestamp
                    ? `Última lectura: ${formatRecordTimestamp(selected.record.timestamp)}`
                    : selected.record
                      ? 'Hora de lectura no disponible'
                      : 'Sin lecturas registradas'}
                </p>
              </div>
              <Badge className={`shrink-0 border ${riskStyles[selected.risk]}`}>
                {selected.risk}
              </Badge>
            </div>

            {/* Grid de Métricas Telemetría */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
            <div className="space-y-2 rounded-2xl border border-gold-300 bg-gold-100 p-3.5">
              <div className="flex items-center gap-2 text-ink-900">
                <Clock3 size={16} className="shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Recomendación MLOps
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-ink-900">
                {getMlopsRecommendation(selected.record)}
              </p>

              {selected.record && (
                <div className="space-y-1.5 border-t border-gold-300 pt-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-900">
                    ¿Por qué este porcentaje?
                  </p>
                  <p className="text-sm leading-relaxed text-ink-900">
                    {traducirDiagnostico(
                      selected.record.razonConfianza ||
                        selected.record.razon_confianza ||
                        'No se guardó el desglose de votos para esta lectura. Las nuevas predicciones incluirán la explicación.',
                    )}
                  </p>
                  {selected.record.confianzaLstm != null && (
                    <p className="pt-1 text-xs text-ink-600">
                      Tendencia LSTM:{' '}
                      <strong className="font-semibold text-ink-900">
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
              <div className="space-y-3 rounded-2xl border border-ocean-300/60 bg-info-soft p-3.5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ocean-700">
                    Validación del técnico
                  </p>
                  <p className="mt-1 text-sm text-ink-600">
                    Predicción IA:{' '}
                    <strong className="font-semibold text-ink-900">
                      {traducirDiagnostico(selected.record.tipoFallaPredicha || 'No disponible')}
                    </strong>
                  </p>
                  {selected.record.fallaRealConfirmada && (
                    <p className="mt-0.5 text-xs font-medium text-forest-700">
                      Falla confirmada: {traducirDiagnostico(selected.record.fallaRealConfirmada)}
                    </p>
                  )}
                  {selected.record.localSyncPending && (
                    <p className="mt-0.5 text-xs font-medium text-ink-900">
                      Confirmación pendiente de sincronización
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Select
                    id="confirmed-failure"
                    label="Si la inspección indica otra falla, selecciónala:"
                    value={feedbackValue}
                    onChange={(event) =>
                      setFeedbackDraft({
                        recordId: selected.record.id,
                        value: event.target.value,
                      })
                    }
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
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="secondary"
                    loading={feedbackSaving}
                    disabled={feedbackSaving || !selected.record.tipoFallaPredicha}
                    onClick={() => saveFeedback(selected.record.tipoFallaPredicha)}
                    className="min-h-11"
                  >
                    Confirmar diagnóstico / Guardar para reentrenamiento
                  </Button>
                  <Button
                    loading={feedbackSaving}
                    disabled={feedbackSaving || !feedbackValue}
                    onClick={() => saveFeedback(feedbackValue)}
                  >
                    Guardar falla real
                  </Button>
                </div>
              </div>
            )}

            {/* Acción Programar Mantenimiento */}
            {canSchedule && (
              <div className="pt-2">
                <Button
                  disabled={!selected.record}
                  onClick={scheduleMaintenance}
                  className="w-full uppercase tracking-wider"
                >
                  Programar mantenimiento
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </section>
  );
}