import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, ClipboardList, Gauge, MapPin, RefreshCw, Wrench } from 'lucide-react';
import { getAssignedAssetResume, getAssignedAssets, getPredictiveAssets } from '../../services/assetService';

const OPERATIONAL_STATUS = {
  OPERATIONAL: { label: 'Operativa', tone: 'bg-emerald-400/10 text-emerald-200' },
  OPERATIONAL_WITH_RESTRICTIONS: { label: 'Con restricciones', tone: 'bg-amber-400/10 text-amber-200' },
  IN_REPAIR: { label: 'En reparación', tone: 'bg-orange-400/10 text-orange-200' },
  OBSOLETE: { label: 'Fuera de servicio', tone: 'bg-slate-400/10 text-slate-300' },
};

function formatDate(value) {
  if (!value) return 'No registrada';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value));
}

function describeError(error) {
  return error.response?.data?.detail || error.response?.data?.message || error.message || 'No se pudo cargar la información.';
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
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    if (selectedId == null) return undefined;
    let cancelled = false;
    getAssignedAssetResume(selectedId)
      .then((data) => { if (!cancelled) setResume(data); })
      .catch((requestError) => { if (!cancelled) setResumeError(describeError(requestError)); })
      .finally(() => { if (!cancelled) setResumeLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId, refreshKey]);

  const selectedAsset = assets.find((asset) => asset.id === selectedId);
  const selectedPredictive = useMemo(
    () => predictiveAssets.find((asset) => asset.assetId === selectedId)?.latestRecord,
    [predictiveAssets, selectedId],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-white">Maquinaria asignada</h1>
          <p className="mt-1 text-[12px] text-gray-400">Estado, ficha técnica y hoja de vida de tus equipos.</p>
        </div>
        <button type="button" title="Actualizar maquinaria" aria-label="Actualizar maquinaria" onClick={() => { setLoading(true); setResumeLoading(true); setError(''); setPredictiveError(''); setRefreshKey((key) => key + 1); }} className="rounded-md border border-white/10 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-300"><RefreshCw size={15} /></button>
      </div>

      {error && <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[11px] text-red-200">{error}</p>}
      {predictiveError && <p role="status" className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-[11px] text-amber-100">No se pudo consultar la telemetría del motor: {predictiveError}. El resto de la ficha sigue disponible.</p>}
      {loading ? <p className="py-10 text-center text-[11px] text-slate-400">Cargando maquinaria asignada...</p> : !error && assets.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#102637] p-8 text-center text-[11px] text-slate-400">No tienes maquinaria activa asignada a tu usuario.</div>
      ) : !error && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.6fr)]">
          <div className="space-y-3">
            {assets.map((asset) => {
              const status = OPERATIONAL_STATUS[asset.operationalStatus] || { label: asset.operationalStatus || 'Sin estado', tone: 'bg-slate-400/10 text-slate-300' };
              return <button key={asset.id} type="button" onClick={() => { if (asset.id !== selectedId) { setResume(null); setResumeLoading(true); setSelectedId(asset.id); } }} className={`w-full rounded-xl border p-4 text-left transition ${selectedId === asset.id ? 'border-cyan-400/50 bg-[#153449]' : 'border-white/10 bg-[#102637] hover:border-white/20'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300"><Gauge size={17} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-white">{asset.name}</p>
                      <p className="mt-1 truncate text-[10px] text-slate-400">{[asset.brand, asset.model].filter(Boolean).join(' ') || 'Sin marca o modelo'}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${status.tone}`}>{status.label}</span>
                </div>
                <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-500"><MapPin size={12} />{asset.location || 'Ubicación no registrada'}</p>
              </button>;
            })}
          </div>

          {selectedAsset && <div className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-[#102637] p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-cyan-300">Estado del equipo</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{selectedAsset.name}</h2>
                  <p className="mt-1 text-[11px] text-slate-400">{selectedAsset.categoryName || 'Categoría sin registrar'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${(OPERATIONAL_STATUS[selectedAsset.operationalStatus] || {}).tone || 'bg-slate-400/10 text-slate-300'}`}>
                  {(OPERATIONAL_STATUS[selectedAsset.operationalStatus] || {}).label || selectedAsset.operationalStatus || 'Sin estado'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Info label="Motor" value={selectedAsset.hasMotor ? (selectedPredictive?.motorState || (selectedPredictive ? (selectedPredictive.predictionClass === 1 ? 'Alerta predictiva' : 'Sin alerta predictiva') : 'Sin lecturas registradas')) : 'Este equipo no tiene motor'} icon={Activity} />
                {selectedAsset.hasMotor && selectedPredictive && <Info label="Última lectura" value={formatDate(selectedPredictive.timestamp)} icon={CalendarDays} />}
                {selectedAsset.hasMotor && selectedPredictive && <Info label="Temperatura" value={`${selectedPredictive.temperature} °C`} icon={Gauge} />}
                {selectedAsset.hasMotor && selectedPredictive && <Info label="Vibración" value={String(selectedPredictive.vibration)} icon={Activity} />}
              </div>
              {selectedAsset.hasMotor && selectedPredictive?.affectedComponents && <p className="mt-3 rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] text-amber-100">Componentes señalados: {selectedPredictive.affectedComponents}</p>}
            </section>

            <section className="rounded-xl border border-white/10 bg-[#102637] p-5">
              <div className="mb-4 flex items-center gap-2"><ClipboardList size={15} className="text-cyan-300" /><h3 className="text-sm font-semibold text-white">Ficha técnica</h3></div>
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Marca" value={selectedAsset.brand} />
                <Info label="Modelo" value={selectedAsset.model} />
                <Info label="Serial" value={selectedAsset.serialNumber} />
                <Info label="Código de inventario" value={selectedAsset.inventoryCode} />
                <Info label="Ubicación" value={selectedAsset.location} />
                <Info label="Responsable" value={selectedAsset.responsibleName} />
                <Info label="Fecha de adquisición" value={formatDate(selectedAsset.acquisitionDate)} />
                <Info label="Proveedor" value={selectedAsset.provider} />
                <Info label="Vencimiento de garantía" value={formatDate(selectedAsset.warrantyExpirationDate)} />
                <Info label="Especificaciones" value={selectedAsset.extraSpecifications} />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-[#102637] p-5">
              <div className="mb-4 flex items-center gap-2"><Wrench size={15} className="text-cyan-300" /><h3 className="text-sm font-semibold text-white">Hoja de vida y mantenimiento</h3></div>
              {resumeError && <p role="alert" className="mb-3 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[10px] text-red-200">{resumeError}</p>}
              {resumeLoading ? <p className="text-[11px] text-slate-400">Cargando hoja de vida...</p> : resume && resume.maintenanceHistory.length === 0 ? <p className="text-[11px] text-slate-400">No hay mantenimientos registrados para este equipo.</p> : resume && (
                <div className="space-y-3">
                  {resume.maintenanceHistory.map((entry) => <article key={entry.id} className="rounded-md border border-white/5 bg-[#0b1d2a] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-white">{entry.type === 'PREVENTIVE' ? 'Mantenimiento preventivo' : 'Mantenimiento correctivo'} · {entry.status || 'Sin estado'}</p>
                      <span className="text-[10px] text-slate-400">{formatDate(entry.executedAt || entry.scheduledAt || entry.maintenanceDate)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[10px] text-slate-300">{entry.tasksDescription || 'Sin descripción'}</p>
                    {entry.technicianName && <p className="mt-2 text-[10px] text-slate-500">Técnico: {entry.technicianName}</p>}
                    {entry.finalEquipmentState && <p className="mt-1 text-[10px] text-slate-500">Estado final: {entry.finalEquipmentState}</p>}
                  </article>)}
                </div>
              )}
            </section>
          </div>}
        </div>
      )}
    </div>
  );
}

function Info({ label, value, icon: Icon }) {
  return <div className="min-w-0">
    <p className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-slate-500">{Icon && <Icon size={11} />}{label}</p>
    <p className="mt-1 break-words text-[11px] text-slate-200">{value || 'No registrado'}</p>
  </div>;
}
