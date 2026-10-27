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
} from '../../services/assetService';

const OPERATIONAL_STATUS = {
  OPERATIONAL: {
    label: 'Operativa',
    tone: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  },
  OPERATIONAL_WITH_RESTRICTIONS: {
    label: 'Con restricciones',
    tone: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  },
  IN_REPAIR: {
    label: 'En reparación',
    tone: 'border-orange-400/30 bg-orange-500/15 text-orange-300',
  },
  OBSOLETE: {
    label: 'Fuera de servicio',
    tone: 'border-slate-400/30 bg-slate-500/15 text-slate-300',
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
    <section className="space-y-5 text-white min-w-0">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <Gauge size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Flota de equipos
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Maquinaria asignada
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Estado operativo, telemetría de motor, ficha técnica y hoja de vida.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#102a3d] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors shrink-0"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-cyan-400' : ''} />
          <span>Actualizar</span>
        </button>
      </header>

      {/* Alertas */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-300 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {predictiveError && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200"
        >
          <span className="min-w-0 flex-1">
            No se pudo consultar la telemetría del motor: {predictiveError}. El resto de la ficha sigue disponible.
          </span>
          <button
            type="button"
            onClick={() => setPredictiveError('')}
            className="text-amber-300 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <RefreshCw className="mx-auto mb-2 animate-spin text-cyan-400" size={24} />
          <span>Cargando maquinaria asignada...</span>
        </div>
      ) : !error && assets.length === 0 ? (
        <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-8 text-center text-xs text-slate-400 shadow-xl">
          No tienes maquinaria activa asignada a tu usuario.
        </div>
      ) : (
        !error && (
          <div className="grid grid-cols-2 gap-2 sm:gap-5">
            {/* Lista Selección Maquinaria */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Equipos disponibles ({assets.length})
              </h2>

              <div className="grid grid-cols-2 gap-2.5">
                {assets.map((asset) => {
                  const status = OPERATIONAL_STATUS[asset.operationalStatus] || {
                    label: asset.operationalStatus || 'Sin estado',
                    tone: 'border-slate-500/30 bg-slate-500/15 text-slate-300',
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
                          ? 'border-cyan-400 bg-[#153449] shadow-lg ring-1 ring-cyan-400/40'
                          : 'border-[#2d4055] bg-[#13293a] hover:border-[#45647a] hover:bg-[#163044]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              isSelected
                                ? 'bg-cyan-400/20 border-cyan-400/40 text-cyan-200'
                                : 'bg-[#0d2030] border-white/10 text-cyan-400'
                            }`}
                          >
                            <Gauge size={18} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs sm:text-sm font-bold text-white">
                              {asset.name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
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

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 border-t border-white/5 pt-2.5">
                        <MapPin size={13} className="text-cyan-400 shrink-0" />
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
                <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                        Estado operativo & Telemetría
                      </p>
                      <h2 className="mt-1 text-base sm:text-xl font-extrabold text-white">
                        {selectedAsset.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {selectedAsset.categoryName || 'Categoría sin registrar'}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        (OPERATIONAL_STATUS[selectedAsset.operationalStatus] || {}).tone ||
                        'border-slate-500/30 bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {(OPERATIONAL_STATUS[selectedAsset.operationalStatus] || {}).label ||
                        selectedAsset.operationalStatus ||
                        'Sin estado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-amber-100 font-semibold">Componentes señalados:</strong>{' '}
                        {selectedPredictive.affectedComponents}
                      </span>
                    </div>
                  )}
                </section>

                {/* Ficha Técnica */}
                <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <ClipboardList size={18} className="text-cyan-300 shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold text-white">Ficha técnica</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
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
                <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Wrench size={18} className="text-cyan-300 shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Hoja de vida y mantenimiento
                    </h3>
                  </div>

                  {resumeError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200"
                    >
                      {resumeError}
                    </div>
                  )}

                  {resumeLoading ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      <RefreshCw className="mx-auto mb-2 animate-spin text-cyan-400" size={18} />
                      <span>Cargando hoja de vida...</span>
                    </div>
                  ) : resume && resume.maintenanceHistory.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      No hay mantenimientos registrados para este equipo.
                    </p>
                  ) : (
                    resume && (
                      <div className="space-y-3">
                        {resume.maintenanceHistory.map((entry) => (
                          <article
                            key={entry.id}
                            className="rounded-lg border border-white/5 bg-[#0d2030] p-3.5 space-y-2 shadow-md"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                              <span className="text-xs font-bold text-cyan-200">
                                {entry.type === 'PREVENTIVE'
                                  ? 'Mantenimiento preventivo'
                                  : 'Mantenimiento correctivo'}{' '}
                                · <span className="text-white">{entry.status || 'Sin estado'}</span>
                              </span>
                              <span className="text-xs font-mono text-slate-400">
                                {formatDate(
                                  entry.executedAt || entry.scheduledAt || entry.maintenanceDate,
                                )}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap text-xs text-slate-300 leading-relaxed">
                              {entry.tasksDescription || 'Sin descripción'}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 border-t border-white/5">
                              {entry.technicianName && (
                                <span>
                                  Técnico: <strong className="text-slate-200">{entry.technicianName}</strong>
                                </span>
                              )}
                              {entry.finalEquipmentState && (
                                <span>
                                  Estado final: <strong className="text-slate-200">{entry.finalEquipmentState}</strong>
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
    <div className="rounded-lg border border-[#30485a] bg-[#102a3d] p-3 min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {Icon && <Icon size={13} className="text-cyan-400 shrink-0" />}
        <span>{label}</span>
      </p>
      <p className="mt-1 text-xs sm:text-sm font-medium text-slate-200 break-words whitespace-pre-wrap">
        {value || 'No registrado'}
      </p>
    </div>
  );
}