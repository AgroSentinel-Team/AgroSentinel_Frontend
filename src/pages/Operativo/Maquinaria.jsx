import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Gauge,
  MapPin,
  RefreshCw,
  Thermometer,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  getAssignedAssetResume,
  getAssignedAssets,
  getPredictiveAssets,
  getPredictiveHistory,
} from '../../services/assetService';
import { isNetworkAvailable, subscribeToNetworkChanges } from '../../services/offlineNetwork';

const TELEMETRY_POLL_INTERVAL = 30_000;

const OPERATIONAL_STATUS = {
  OPERATIONAL: {
    label: 'Operativa',
    tone: 'border-forest-300/50 bg-success-soft text-forest-700',
  },
  OPERATIONAL_WITH_RESTRICTIONS: {
    label: 'Con restricciones',
    tone: 'border-warning/30 bg-warning-soft text-forest-900',
  },
  IN_REPAIR: {
    label: 'En reparación',
    tone: 'border-warning/30 bg-warning-soft text-forest-900',
  },
  OBSOLETE: {
    label: 'Fuera de servicio',
    tone: 'border-sand-200/30 bg-sand-100 text-ink-600',
  },
};

function formatDate(value) {
  if (!value) return 'No registrada';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value));
}

function describeError(error) {
  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    'No se pudo cargar la información.'
  );
}

export default function Maquinaria() {
  const [assets, setAssets] = useState([]);
  const [predictiveAssets, setPredictiveAssets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [predictiveError, setPredictiveError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getAssignedAssets(), getPredictiveAssets()])
      .then(([assetsResult, predictiveResult]) => {
        if (cancelled) return;

        if (assetsResult.status === 'rejected') {
          setError(describeError(assetsResult.reason));
          return;
        }

        const assignedAssets = assetsResult.value;
        setAssets(assignedAssets);
        const nextSelectedId = assignedAssets[0]?.id ?? null;
        setSelectedId(nextSelectedId);
        setResumeLoading(nextSelectedId != null);
        setResumeError('');
        if (nextSelectedId == null) setResume(null);

        if (predictiveResult.status === 'fulfilled') {
          setPredictiveAssets(predictiveResult.value);
          setPredictiveError('');
        } else {
          setPredictiveAssets([]);
          setPredictiveError(describeError(predictiveResult.reason));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;
    let interval;
    let unsubscribe;
    let refreshing = false;

    const refreshOverview = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        if (!(await isNetworkAvailable())) return;
        const [assetsResult, predictiveResult] = await Promise.allSettled([
          getAssignedAssets(),
          getPredictiveAssets(),
        ]);
        if (!active) return;

        if (assetsResult.status === 'fulfilled') {
          setAssets(assetsResult.value);
          setError('');
          setSelectedId((current) =>
            assetsResult.value.some((asset) => asset.id === current)
              ? current
              : assetsResult.value[0]?.id ?? null,
          );
        } else {
          setError(describeError(assetsResult.reason));
        }

        if (predictiveResult.status === 'fulfilled') {
          setPredictiveAssets(predictiveResult.value);
          setPredictiveError('');
        } else {
          setPredictiveError(describeError(predictiveResult.reason));
        }
      } catch (requestError) {
        if (active) setPredictiveError(describeError(requestError));
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
          void refreshOverview();
        }, TELEMETRY_POLL_INTERVAL);
      }
    };

    void isNetworkAvailable()
      .then(setPolling)
      .catch((networkError) => {
        if (active) setPredictiveError(describeError(networkError));
      });
    void subscribeToNetworkChanges((connected) => {
      setPolling(connected);
      if (connected) void refreshOverview();
    })
      .then((stop) => {
        if (active) unsubscribe = stop;
        else void stop();
      })
      .catch((networkError) => {
        if (active) setPredictiveError(describeError(networkError));
      });

    return () => {
      active = false;
      window.clearInterval(interval);
      void unsubscribe?.();
    };
  }, []);

  const selectedHasMotor = assets.some(
    (asset) => asset.id === selectedId && asset.hasMotor,
  );

  useEffect(() => {
    if (selectedId == null || !selectedHasMotor) return undefined;
    let active = true;
    let interval;
    let unsubscribe;
    let refreshing = false;

    const refreshHistory = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        if (!(await isNetworkAvailable())) return;
        const history = await getPredictiveHistory(selectedId);
        if (!active || !Array.isArray(history) || history.length === 0) return;
        const latestRecord = history[0];
        setPredictiveAssets((current) =>
          current.map((asset) =>
            asset.assetId === selectedId ? { ...asset, latestRecord } : asset,
          ),
        );
        setPredictiveError('');
      } catch (requestError) {
        if (active) setPredictiveError(describeError(requestError));
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
      .catch((networkError) => {
        if (active) setPredictiveError(describeError(networkError));
      });
    void subscribeToNetworkChanges((connected) => {
      setPolling(connected);
      if (connected) void refreshHistory();
    })
      .then((stop) => {
        if (active) unsubscribe = stop;
        else void stop();
      })
      .catch((networkError) => {
        if (active) setPredictiveError(describeError(networkError));
      });

    return () => {
      active = false;
      window.clearInterval(interval);
      void unsubscribe?.();
    };
  }, [selectedId, selectedHasMotor]);

  useEffect(() => {
    if (selectedId == null) return undefined;
    let cancelled = false;

    getAssignedAssetResume(selectedId)
      .then((data) => {
        if (!cancelled) setResume(data);
      })
      .catch((requestError) => {
        if (!cancelled) setResumeError(describeError(requestError));
      })
      .finally(() => {
        if (!cancelled) setResumeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, refreshKey]);

  const selectedAsset = assets.find((asset) => asset.id === selectedId);
  const selectedPredictive = useMemo(
    () => predictiveAssets.find((asset) => asset.assetId === selectedId)?.latestRecord,
    [predictiveAssets, selectedId],
  );

  const handleRefresh = () => {
    setLoading(true);
    setResumeLoading(true);
    setError('');
    setPredictiveError('');
    setRefreshKey((key) => key + 1);
  };

  return (
    <section className="space-y-5 text-ink-900 min-w-0">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-sand-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-ocean-700">
            <Gauge size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Flota de equipos
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Maquinaria asignada
          </h1>
          <p className="mt-0.5 text-xs text-ink-600">
            Estado operativo, telemetría de motor, ficha técnica y hoja de vida.
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

      {/* Alertas */}
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

      {predictiveError && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-warning/30 bg-warning-soft p-3.5 text-xs text-forest-900"
        >
          <span className="min-w-0 flex-1">
            No se pudo consultar la telemetría del motor: {predictiveError}. El resto de la ficha sigue disponible.
          </span>
          <button
            type="button"
            onClick={() => setPredictiveError('')}
            className="text-forest-900 hover:text-ink-900 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      {loading ? (
        <div className="py-16 text-center text-xs text-ink-600">
          <RefreshCw className="mx-auto mb-2 animate-spin text-ocean-700" size={24} />
          <span>Cargando maquinaria asignada...</span>
        </div>
      ) : !error && assets.length === 0 ? (
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-8 text-center text-xs text-ink-600 shadow-xl">
          No tienes maquinaria activa asignada a tu usuario.
        </div>
      ) : (
        !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-5">
            {/* Lista Selección Maquinaria */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-600 px-1">
                Equipos disponibles ({assets.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {assets.map((asset) => {
                  const status = OPERATIONAL_STATUS[asset.operationalStatus] || {
                    label: asset.operationalStatus || 'Sin estado',
                    tone: 'border-sand-200/30 bg-sand-100 text-ink-600',
                  };
                  const isSelected = selectedId === asset.id;

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        if (asset.id !== selectedId) {
                          setResume(null);
                          setResumeLoading(true);
                          setSelectedId(asset.id);
                        }
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-ocean-300/60 bg-info-soft shadow-lg ring-1 ring-ocean-500/30'
                          : 'border-sand-200 bg-sand-50 hover:border-sand-200 hover:bg-sand-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ease-out ${
                              isSelected
                                ? 'bg-info-soft border-ocean-300/60 text-ocean-700'
                                : 'bg-sand-50 border-sand-200 text-ocean-700'
                            }`}
                          >
                            <Gauge size={18} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs sm:text-sm font-bold text-ink-900">
                              {asset.name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-ink-600">
                              {[asset.brand, asset.model].filter(Boolean).join(' ') ||
                                'Sin marca/modelo'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${status.tone}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-600 border-t border-sand-200/70 pt-2.5">
                        <MapPin size={13} className="text-ocean-700 shrink-0" />
                        <span className="truncate">{asset.location || 'Ubicación no registrada'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detalle Maquinaria Seleccionada */}
            {selectedAsset && (
              <div className="space-y-4 min-w-0">
                {/* Estado del Equipo & Telemetría */}
                <section className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand-200 pb-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ocean-700">
                        Estado operativo & Telemetría
                      </p>
                      <h2 className="mt-1 text-base sm:text-xl font-extrabold text-ink-900">
                        {selectedAsset.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-600">
                        {selectedAsset.categoryName || 'Categoría sin registrar'}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        (OPERATIONAL_STATUS[selectedAsset.operationalStatus] || {}).tone ||
                        'border-sand-200/30 bg-sand-100 text-ink-600'
                      }`}
                    >
                      {(OPERATIONAL_STATUS[selectedAsset.operationalStatus] || {}).label ||
                        selectedAsset.operationalStatus ||
                        'Sin estado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <Info
                      label="Estado del Motor"
                      value={
                        selectedAsset.hasMotor
                          ? selectedPredictive?.motorState ||
                            (selectedPredictive
                              ? selectedPredictive.predictionClass === 1
                                ? 'Alerta predictiva'
                                : 'Sin alerta predictiva'
                              : 'Sin lecturas registradas')
                          : 'Este equipo no tiene motor'
                      }
                      icon={Activity}
                    />

                    {selectedAsset.hasMotor && selectedPredictive && (
                      <Info
                        label="Última lectura"
                        value={formatDate(selectedPredictive.timestamp)}
                        icon={CalendarDays}
                      />
                    )}

                    {selectedAsset.hasMotor && selectedPredictive && (
                      <Info
                        label="Temperatura"
                        value={`${selectedPredictive.temperature} °C`}
                        icon={Thermometer}
                      />
                    )}

                    {selectedAsset.hasMotor && selectedPredictive && (
                      <Info
                        label="Vibración"
                        value={String(selectedPredictive.vibration)}
                        icon={Zap}
                      />
                    )}
                  </div>

                  {selectedAsset.hasMotor && selectedPredictive?.affectedComponents && (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs text-forest-900">
                      <AlertTriangle size={16} className="text-forest-900 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-forest-900 font-semibold">Componentes señalados:</strong>{' '}
                        {selectedPredictive.affectedComponents}
                      </span>
                    </div>
                  )}
                </section>

                {/* Ficha Técnica */}
                <section className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-sand-200 pb-3">
                    <ClipboardList size={18} className="text-ocean-700 shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold text-ink-900">Ficha técnica</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
                    <Info label="Marca" value={selectedAsset.brand} />
                    <Info label="Modelo" value={selectedAsset.model} />
                    <Info label="Serial" value={selectedAsset.serialNumber} />
                    <Info label="Código inventario" value={selectedAsset.inventoryCode} />
                    <Info label="Ubicación" value={selectedAsset.location} />
                    <Info label="Responsable" value={selectedAsset.responsibleName} />
                    <Info label="Fecha adquisición" value={formatDate(selectedAsset.acquisitionDate)} />
                    <Info label="Proveedor" value={selectedAsset.provider} />
                    <Info label="Garantía hasta" value={formatDate(selectedAsset.warrantyExpirationDate)} />
                    <Info label="Especificaciones" value={selectedAsset.extraSpecifications} />
                  </div>
                </section>

                {/* Hoja de Vida y Mantenimiento */}
                <section className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-sand-200 pb-3">
                    <Wrench size={18} className="text-ocean-700 shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold text-ink-900">
                      Hoja de vida y mantenimiento
                    </h3>
                  </div>

                  {resumeError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-error/20 bg-error-soft p-3 text-xs text-error-text"
                    >
                      {resumeError}
                    </div>
                  )}

                  {resumeLoading ? (
                    <div className="py-6 text-center text-xs text-ink-600">
                      <RefreshCw className="mx-auto mb-2 animate-spin text-ocean-700" size={18} />
                      <span>Cargando hoja de vida...</span>
                    </div>
                  ) : resume && resume.maintenanceHistory.length === 0 ? (
                    <p className="py-4 text-center text-xs text-ink-600">
                      No hay mantenimientos registrados para este equipo.
                    </p>
                  ) : (
                    resume && (
                      <div className="space-y-3">
                        {resume.maintenanceHistory.map((entry) => (
                          <article
                            key={entry.id}
                            className="rounded-lg border border-sand-200/70 bg-sand-50 p-3.5 space-y-2 shadow-md"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200/70 pb-2">
                              <span className="text-xs font-bold text-ocean-700">
                                {entry.type === 'PREVENTIVE'
                                  ? 'Mantenimiento preventivo'
                                  : 'Mantenimiento correctivo'}{' '}
                                · <span className="text-ink-900">{entry.status || 'Sin estado'}</span>
                              </span>
                              <span className="text-xs font-mono text-ink-600">
                                {formatDate(
                                  entry.executedAt || entry.scheduledAt || entry.maintenanceDate,
                                )}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap text-xs text-ink-600 leading-relaxed">
                              {entry.tasksDescription || 'Sin descripción'}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-600 pt-1 border-t border-sand-200/70">
                              {entry.technicianName && (
                                <span>
                                  Técnico: <strong className="text-ink-900">{entry.technicianName}</strong>
                                </span>
                              )}
                              {entry.finalEquipmentState && (
                                <span>
                                  Estado final: <strong className="text-ink-900">{entry.finalEquipmentState}</strong>
                                </span>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )
                  )}
                </section>
              </div>
            )}
          </div>
        )
      )}
    </section>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-sand-200 bg-sand-50 p-3 min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-600">
        {Icon && <Icon size={13} className="text-ocean-700 shrink-0" />}
        <span>{label}</span>
      </p>
      <p className="mt-1 text-xs sm:text-sm font-medium text-ink-900 break-words whitespace-pre-wrap">
        {value || 'No registrado'}
      </p>
    </div>
  );
}