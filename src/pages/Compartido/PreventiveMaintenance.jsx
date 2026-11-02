import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  FileImage,
  List,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { getPreventiveMaintenanceEvidence } from '../../services/preventiveMaintenanceService';
import { getAssets, getCategories, getUsers } from '../../services/assetService';
import {
  executePreventiveMaintenance,
  getPreventiveMaintenances,
  schedulePreventiveMaintenance,
} from '../../services/preventiveMaintenanceService';

const fieldClass =
  'mt-1 w-full rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px] disabled:opacity-60';

const statusLabels = {
  SCHEDULED: 'Programado',
  COMPLETED: 'Completado',
  PARTIALLY_COMPLETED: 'Parcialmente completado',
  URGENT_CORRECTIVE: 'Requiere correctivo urgente',
};

const outcomeLabels = {
  COMPLETED: 'Completado',
  PARTIALLY_COMPLETED: 'Parcialmente Completado',
  URGENT_CORRECTIVE: 'Requiere Correctivo Urgente',
};

const attentionLabels = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' };

function localDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + Number(days || 90));
  return localDate(result);
}

function formatDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', options).format(new Date(value));
}

function describeError(error) {
  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    (typeof error.response?.data === 'string' ? error.response.data : '') ||
    error.message ||
    'No se pudo completar la solicitud.'
  );
}

function roleName() {
  return (localStorage.getItem('rol') ?? '').toUpperCase().replace(/^ROLE_/, '');
}

function StatusBadge({ status }) {
  const colors =
    status === 'COMPLETED'
      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
      : status === 'URGENT_CORRECTIVE'
      ? 'border-red-400/30 bg-red-500/15 text-red-300'
      : status === 'PARTIALLY_COMPLETED'
      ? 'border-amber-400/30 bg-amber-500/15 text-amber-300'
      : 'border-cyan-400/30 bg-cyan-500/15 text-cyan-300';
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-lg">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-cyan-300">{title}</h3>
      {children}
    </section>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 shadow-lg min-w-0">
      <div className="flex items-center justify-between text-slate-400">
        <p className="text-xs font-semibold uppercase tracking-wider truncate">{label}</p>
        <Icon size={16} className="text-cyan-300 shrink-0 ml-1" />
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-[#30485a] bg-[#13293a] p-3 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xs sm:text-sm font-medium text-slate-200 break-words whitespace-pre-wrap">
        {value || 'Sin registro'}
      </p>
    </div>
  );
}

export default function PreventiveMaintenance({ predictivePrefill, onPredictivePrefillConsumed }) {
  const [maintenances, setMaintenances] = useState([]);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState('');
  const [panel, setPanel] = useState(null);
  const [schedule, setSchedule] = useState({
    assetId: '',
    technicianId: '',
    scheduledAt: '',
    attentionIndex: 'LOW',
    predictiveContext: '',
    predictiveAssetId: '',
  });
  const [execution, setExecution] = useState({
    tasks: [
      { description: 'Inspección general del activo', completed: false },
      { description: 'Verificación de niveles y lubricación', completed: false },
    ],
    replacedParts: '',
    workDescription: '',
    technicianNotes: '',
    outcome: 'COMPLETED',
    nextMaintenanceDate: '',
    confirmed: false,
  });
  const [evidences, setEvidences] = useState([]);
  const [previewEvidence, setPreviewEvidence] = useState('');

  const isAdmin = ['ADMIN', 'ADMINISTRADOR'].includes(roleName());
  const isTechnician = roleName() === 'TECNICO';
  const selectedAsset = assets.find((asset) => String(asset.id) === schedule.assetId);
  const selectedCategory = categories.find(
    (category) => String(category.id) === String(selectedAsset?.categoryId),
  );

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [maintenanceData, assetData, categoryData, userData] = await Promise.all([
        getPreventiveMaintenances(),
        getAssets(),
        getCategories(),
        getUsers(),
      ]);
      setMaintenances(maintenanceData);
      setAssets(assetData.filter((asset) => asset.isActive));
      setCategories(categoryData);
      setTechnicians(
        userData.filter((user) => (user.rol || '').toUpperCase().replace(/^ROLE_/, '') === 'TECNICO'),
      );
    } catch (error) {
      setLoadError(describeError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPreventiveMaintenances(), getAssets(), getCategories(), getUsers()])
      .then(([maintenanceData, assetData, categoryData, userData]) => {
        if (cancelled) return;
        setMaintenances(maintenanceData);
        setAssets(assetData.filter((asset) => asset.isActive));
        setCategories(categoryData);
        setTechnicians(
          userData.filter((user) => (user.rol || '').toUpperCase().replace(/^ROLE_/, '') === 'TECNICO'),
        );
      })
      .catch((error) => {
        if (!cancelled) setLoadError(describeError(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!predictivePrefill || loading) return;
    const timeout = window.setTimeout(() => {
      const assetId = String(predictivePrefill.assetId);
      if (!assets.some((asset) => String(asset.id) === assetId)) {
        setFeedback('No se encontró el activo asociado a la alerta predictiva.');
        onPredictivePrefillConsumed?.();
        return;
      }
      const attentionIndex =
        predictivePrefill.risk === 'Alto'
          ? 'HIGH'
          : predictivePrefill.risk === 'Medio'
          ? 'MEDIUM'
          : 'LOW';
      setSchedule({
        assetId,
        technicianId: '',
        scheduledAt: '',
        attentionIndex,
        predictiveContext: predictivePrefill.predictiveContext || '',
        predictiveAssetId: assetId,
      });
      setView('list');
      setFeedback('');
      setPanel({ mode: 'schedule' });
      onPredictivePrefillConsumed?.();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [assets, loading, onPredictivePrefillConsumed, predictivePrefill]);

  useEffect(() => () => {
    if (previewEvidence) URL.revokeObjectURL(previewEvidence);
  }, [previewEvidence]);

  const visibleMaintenances = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return maintenances.filter((item) =>
      `${item.assetName} ${item.technicianName} ${item.categoryName}`.toLowerCase().includes(normalized),
    );
  }, [maintenances, query]);

  const openSchedule = () => {
    setFeedback('');
    setSchedule({
      assetId: '',
      technicianId: '',
      scheduledAt: '',
      attentionIndex: 'LOW',
      predictiveContext: '',
      predictiveAssetId: '',
    });
    setPanel({ mode: 'schedule' });
  };

  const openDetails = (maintenance) => {
    setFeedback('');
    if (isTechnician && maintenance.status === 'SCHEDULED') {
      const suggestedDate = addDays(localDate(), maintenance.maintenanceFrequencyDays);
      setExecution({
        tasks: maintenance.tasks?.length
          ? maintenance.tasks.map(({ description, completed }) => ({ description, completed }))
          : [{ description: 'Inspección general del activo', completed: false }],
        replacedParts: maintenance.replacedParts || '',
        workDescription: maintenance.workDescription || '',
        technicianNotes: maintenance.technicianNotes || '',
        outcome: 'COMPLETED',
        nextMaintenanceDate: suggestedDate,
        confirmed: false,
      });
      setEvidences([]);
      setPanel({ mode: 'execute', maintenance });
    } else {
      setPanel({ mode: 'details', maintenance });
    }
  };

  const saveSchedule = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      const result = await schedulePreventiveMaintenance({
        assetId: Number(schedule.assetId),
        technicianId: Number(schedule.technicianId),
        scheduledAt: schedule.scheduledAt,
        attentionIndex: schedule.attentionIndex,
        predictiveContext: schedule.predictiveContext || null,
      });
      setPanel(null);
      setFeedback(result?.queued
        ? 'Mantenimiento guardado en este dispositivo. Se sincronizara al recuperar internet.'
        : 'Mantenimiento preventivo programado correctamente.');
      await loadData();
    } catch (error) {
      setFeedback(`No se pudo programar: ${describeError(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const saveExecution = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      const result = await executePreventiveMaintenance(
        panel.maintenance.id,
        execution,
        evidences,
      );
      setPanel(null);
      setFeedback(result?.queued
        ? 'Ejecucion y evidencia guardadas localmente. Se sincronizaran al recuperar internet.'
        : 'Ejecución y evidencia guardadas. La hoja de vida del activo fue actualizada.');
      await loadData();
    } catch (error) {
      setFeedback(`No se pudo guardar la ejecución: ${describeError(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const addEvidenceFiles = (files) => {
    const validFiles = Array.from(files || []);
    if (evidences.length + validFiles.length > 10) {
      setFeedback('Puedes adjuntar un máximo de 10 imágenes.');
      return;
    }
    const invalid = validFiles.find(
      (file) =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024,
    );
    if (invalid) {
      setFeedback('Solo se aceptan imágenes JPG, PNG o WEBP de hasta 10 MB cada una.');
      return;
    }
    setEvidences((current) => [...current, ...validFiles]);
  };

  const openEvidence = async (url) => {
    try {
      const image = await getPreventiveMaintenanceEvidence(url);
      setPreviewEvidence(URL.createObjectURL(image));
    } catch (error) {
      setFeedback(`No se pudo abrir la evidencia: ${describeError(error)}`);
    }
  };

  const updateExecution = (key, value) => {
    setExecution((current) => ({ ...current, [key]: value }));
  };

  const updateTask = (index, key, value) => {
    setExecution((current) => ({
      ...current,
      tasks: current.tasks.map((task, taskIndex) =>
        taskIndex === index ? { ...task, [key]: value } : task,
      ),
    }));
  };

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const calendarDays = [];
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const numberOfDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let index = 0; index < firstWeekday; index += 1) calendarDays.push(null);
  for (let day = 1; day <= numberOfDays; day += 1) {
    calendarDays.push(
      `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(
        day,
      ).padStart(2, '0')}`,
    );
  }
  const scheduledForDay = visibleMaintenances.filter(
    (item) => item.scheduledAt?.slice(0, 10) === selectedDay,
  );
  const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(month);
  const countFor = (status) => maintenances.filter((item) => item.status === status).length;

  return (
    <section className="space-y-5 text-white min-w-0">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300">
            <Activity size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Gestión de mantenimiento
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Mantenimiento preventivo
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Programa inspecciones, distribuye la carga de trabajo y registra ejecuciones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          <button
            type="button"
            onClick={loadData}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-[#102a3d] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={16} />
            <span>Actualizar</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={openSchedule}
              className="flex min-h-[44px] items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-950/40"
            >
              <Plus size={18} />
              <span>Programar mantenimiento</span>
            </button>
          )}
        </div>
      </header>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total programados" value={maintenances.length} icon={CalendarDays} />
        <Metric label="Pendientes" value={countFor('SCHEDULED')} icon={Clock3} />
        <Metric label="Completados" value={countFor('COMPLETED')} icon={CheckCircle2} />
        <Metric label="Atención urgente" value={countFor('URGENT_CORRECTIVE')} icon={AlertTriangle} />
      </div>

      {/* Avisos de Estado y Alertas */}
      {feedback && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200"
        >
          <span className="min-w-0 flex-1">{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            className="text-emerald-300 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

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

      {/* Panel Vista de Mantenimientos */}
      <div className="rounded-xl border border-[#2d4055] bg-[#13293a] shadow-xl">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5 rounded-lg bg-[#081723] p-1 border border-[#2d4055]">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`flex min-h-[38px] items-center gap-2 rounded-md px-3.5 text-xs font-semibold transition-colors ${
                view === 'list'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List size={16} />
              <span>Listado</span>
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`flex min-h-[38px] items-center gap-2 rounded-md px-3.5 text-xs font-semibold transition-colors ${
                view === 'calendar'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays size={16} />
              <span>Calendario</span>
            </button>
          </div>

          {view === 'list' && (
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por activo o técnico..."
              className="w-full rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2 text-xs sm:text-sm text-white outline-none focus:border-cyan-400 transition min-h-[44px] sm:max-w-xs"
            />
          )}
        </div>

        {/* Vista Listado */}
        {view === 'list' ? (
          <>
            {/* Móvil (Tarjetas) */}
            <div className="grid grid-cols-2 gap-2 p-3 md:hidden">
              {loading && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <LoaderCircle className="mx-auto mb-2 animate-spin text-cyan-400" size={24} />
                  <span>Cargando mantenimientos...</span>
                </div>
              )}
              {!loading &&
                visibleMaintenances.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-[#294255] bg-[#0c1e2c] p-4 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{item.assetName}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{item.categoryName}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Técnico asignado:</span>
                        <span className="font-semibold text-white truncate max-w-[180px]">{item.technicianName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Fecha programada:</span>
                        <span className="font-mono text-slate-300">
                          {formatDate(item.scheduledAt, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Atención:</span>
                        <span className="font-semibold text-cyan-200">
                          {attentionLabels[item.attentionIndex] || attentionLabels.LOW}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => openDetails(item)}
                        className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                      >
                        {isTechnician && item.status === 'SCHEDULED' ? (
                          <>
                            <Wrench size={14} /> Ejecutar
                          </>
                        ) : (
                          <>
                            <Eye size={14} /> Ver detalles
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              {!loading && visibleMaintenances.length === 0 && (
                <p className="py-12 text-center text-xs text-slate-400">
                  No hay mantenimientos para mostrar.
                </p>
              )}
            </div>

            {/* Escritorio (Tabla) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
                <thead className="bg-[#0b1d2a] text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-[#2d4055]">
                  <tr>
                    <th className="px-4 py-3.5">Activo / Categoría</th>
                    <th className="px-4 py-3.5">Técnico</th>
                    <th className="px-4 py-3.5">Fecha programada</th>
                    <th className="px-4 py-3.5">Atención</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading && (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-slate-400 text-xs">
                        <LoaderCircle className="mx-auto mb-2 animate-spin text-cyan-400" size={24} />
                        Cargando mantenimientos...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    visibleMaintenances.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-white">
                          <p className="truncate">{item.assetName}</p>
                          <p className="mt-0.5 text-xs font-normal text-slate-400">{item.categoryName}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 font-medium">{item.technicianName}</td>
                        <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">
                          {formatDate(item.scheduledAt, { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 font-medium">
                          {attentionLabels[item.attentionIndex] || attentionLabels.LOW}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => openDetails(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 transition-colors"
                          >
                            {isTechnician && item.status === 'SCHEDULED' ? (
                              <>
                                <Wrench size={14} /> Ejecutar
                              </>
                            ) : (
                              <>
                                <Eye size={14} /> Ver detalles
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  {!loading && visibleMaintenances.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-slate-400 text-xs">
                        No hay mantenimientos para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Vista Calendario */
          <div className="grid gap-4 p-4 xl:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  aria-label="Mes anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#081723] text-sm font-bold text-white hover:bg-white/10 transition-colors"
                >
                  ‹
                </button>
                <h2 className="text-sm sm:text-base font-bold text-white capitalize">{monthLabel}</h2>
                <button
                  type="button"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  aria-label="Mes siguiente"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#081723] text-sm font-bold text-white hover:bg-white/10 transition-colors"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="py-1.5 text-xs font-bold uppercase text-slate-400">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, index) => {
                  const count = day
                    ? visibleMaintenances.filter((item) => item.scheduledAt?.slice(0, 10) === day).length
                    : 0;
                  return (
                    <button
                      key={day || `empty-${index}`}
                      type="button"
                      disabled={!day}
                      onClick={() => setSelectedDay(day)}
                      className={`min-h-[56px] sm:min-h-[64px] rounded-lg border p-1.5 text-xs font-semibold transition-all ${
                        !day
                          ? 'border-transparent pointer-events-none'
                          : selectedDay === day
                          ? 'border-cyan-400 bg-cyan-500/20 text-white ring-1 ring-cyan-400/50 shadow-md'
                          : 'border-white/10 bg-[#0c1e2c] text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {day ? (
                        <div className="flex flex-col items-center justify-between h-full">
                          <span>{Number(day.slice(-2))}</span>
                          {count > 0 && (
                            <span className="w-full rounded-full bg-cyan-400/20 border border-cyan-400/40 px-1 py-0.5 text-[10px] font-bold text-cyan-200 truncate">
                              {count} plan.
                            </span>
                          )}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel Lateral Día Seleccionado */}
            <aside className="rounded-xl border border-white/10 bg-[#0d2030] p-4 shadow-lg space-y-3">
              <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider border-b border-white/10 pb-2">
                {selectedDay ? formatDate(`${selectedDay}T12:00:00`) : 'Selecciona un día'}
              </h3>
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                {scheduledForDay.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openDetails(item)}
                    className="w-full rounded-lg border border-white/10 bg-[#102a3d] p-3 text-left hover:border-cyan-400/60 transition-colors shadow-sm"
                  >
                    <p className="text-xs font-semibold text-white truncate">{item.assetName}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDate(item.scheduledAt, { timeStyle: 'short' })} · {item.technicianName}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={item.status} />
                    </div>
                  </button>
                ))}
                {selectedDay && scheduledForDay.length === 0 && (
                  <p className="p-4 text-center text-xs text-slate-400">
                    Sin mantenimientos programados para este día.
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Modal / Diálogo Flotante */}
      {panel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setPanel(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-panel-title"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#36556f] bg-[#102637] p-5 sm:p-6 shadow-2xl min-w-0"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <h2 id="maintenance-panel-title" className="text-base sm:text-lg font-bold text-white">
                  {panel.mode === 'schedule'
                    ? 'Programar mantenimiento'
                    : panel.mode === 'execute'
                    ? 'Ejecutar mantenimiento'
                    : 'Detalle del mantenimiento'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {panel.mode === 'schedule'
                    ? 'Asigna el activo, el técnico y la fecha de la inspección.'
                    : `${panel.maintenance.assetName} · ${panel.maintenance.categoryName}`}
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPanel(null)}
                aria-label="Cerrar modal"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Formulario Programar */}
            {panel.mode === 'schedule' && (
              <form onSubmit={saveSchedule} className="space-y-4">
                <Section title="Programación">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-slate-300">
                      <span>Activo <span className="text-cyan-400">*</span></span>
                      <select
                        required
                        value={schedule.assetId}
                        onChange={(event) => {
                          const assetId = event.target.value;
                          setSchedule((current) => ({
                            ...current,
                            assetId,
                            predictiveContext:
                              current.predictiveAssetId && assetId !== current.predictiveAssetId
                                ? ''
                                : current.predictiveContext,
                            predictiveAssetId:
                              current.predictiveAssetId && assetId !== current.predictiveAssetId
                                ? ''
                                : current.predictiveAssetId,
                          }));
                          if (schedule.predictiveContext && assetId !== schedule.predictiveAssetId) {
                            setFeedback('Se quitó el contexto predictivo porque cambiaste el activo.');
                          }
                        }}
                        className={fieldClass}
                      >
                        <option value="">Selecciona un activo</option>
                        {assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-medium text-slate-300">
                      <span>Técnico asignado <span className="text-cyan-400">*</span></span>
                      <select
                        required
                        value={schedule.technicianId}
                        onChange={(event) =>
                          setSchedule((current) => ({ ...current, technicianId: event.target.value }))
                        }
                        className={fieldClass}
                      >
                        <option value="">Selecciona un técnico</option>
                        {technicians.map((technician) => (
                          <option key={technician.id} value={technician.id}>
                            {technician.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-medium text-slate-300">
                      <span>Categoría del activo</span>
                      <input
                        readOnly
                        value={selectedAsset?.categoryName || 'Se completa al seleccionar un activo'}
                        className={`${fieldClass} text-slate-400`}
                      />
                    </label>

                    <label className="block text-xs font-medium text-slate-300">
                      <span>Fecha y hora de ejecución <span className="text-cyan-400">*</span></span>
                      <input
                        required
                        type="datetime-local"
                        min={localDate()}
                        value={schedule.scheduledAt}
                        onChange={(event) =>
                          setSchedule((current) => ({ ...current, scheduledAt: event.target.value }))
                        }
                        className={fieldClass}
                      />
                    </label>

                    <label className="block text-xs font-medium text-slate-300 sm:col-span-2">
                      <span>Índice de atención <span className="text-cyan-400">*</span></span>
                      <select
                        required
                        value={schedule.attentionIndex}
                        onChange={(event) =>
                          setSchedule((current) => ({ ...current, attentionIndex: event.target.value }))
                        }
                        className={fieldClass}
                      >
                        <option value="LOW">Baja</option>
                        <option value="MEDIUM">Media</option>
                        <option value="HIGH">Alta</option>
                      </select>
                    </label>
                  </div>

                  {selectedCategory && (
                    <p className="mt-3 text-xs text-slate-400">
                      Frecuencia sugerida para esta categoría: cada{' '}
                      <strong className="text-white font-semibold">
                        {selectedCategory.maintenanceFrequencyDays || 90} días
                      </strong>
                      .
                    </p>
                  )}
                </Section>

                {schedule.predictiveContext && (
                  <Section title="Falla y datos del mantenimiento predictivo">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                      {schedule.predictiveContext}
                    </p>
                  </Section>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !assets.length || !technicians.length}
                    className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-cyan-600 px-5 text-xs font-bold text-white hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-950/40"
                  >
                    {saving ? 'Guardando...' : 'Confirmar programación'}
                  </button>
                </div>
              </form>
            )}

            {/* Modal Ver Detalles */}
            {panel.mode === 'details' && (
              <div className="space-y-4">
                <Section title="Programación">
                  <div className="grid gap-3 text-xs sm:grid-cols-2">
                    <Info label="Activo" value={panel.maintenance.assetName} />
                    <Info label="Categoría" value={panel.maintenance.categoryName} />
                    <Info label="Técnico asignado" value={panel.maintenance.technicianName} />
                    <Info
                      label="Fecha programada"
                      value={formatDate(panel.maintenance.scheduledAt, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    />
                    <Info
                      label="Índice de atención"
                      value={
                        attentionLabels[panel.maintenance.attentionIndex] || attentionLabels.LOW
                      }
                    />
                    <Info label="Estado" value={statusLabels[panel.maintenance.status]} />
                  </div>
                </Section>

                {panel.maintenance.predictiveContext && (
                  <Section title="Falla y datos del mantenimiento predictivo">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                      {panel.maintenance.predictiveContext}
                    </p>
                  </Section>
                )}

                {panel.maintenance.status !== 'SCHEDULED' && (
                  <>
                    <Section title="Registro de ejecución">
                      <div className="grid gap-3 text-xs sm:grid-cols-2">
                        <Info
                          label="Fecha de ejecución"
                          value={formatDate(panel.maintenance.executedAt, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        />
                        <Info
                          label="Próximo mantenimiento"
                          value={formatDate(panel.maintenance.nextMaintenanceDate)}
                        />
                        <Info label="Repuestos" value={panel.maintenance.replacedParts} />
                        <Info label="Trabajo realizado" value={panel.maintenance.workDescription} />
                        <Info label="Observaciones" value={panel.maintenance.technicianNotes} />
                      </div>

                      {panel.maintenance.tasks?.length > 0 && (
                        <ul className="mt-3 space-y-2 border-t border-white/5 pt-3">
                          {panel.maintenance.tasks.map((task) => (
                            <li key={task.id} className="flex items-center gap-2 text-xs text-slate-300">
                              <Check
                                size={15}
                                className={task.completed ? 'text-emerald-400' : 'text-slate-600'}
                              />
                              <span>{task.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {panel.maintenance.evidences?.length > 0 && (
                        <div className="mt-3.5 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                          {panel.maintenance.evidences.map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => openEvidence(url)}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#0d2030] px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-white/10 transition-colors"
                            >
                              <FileImage size={15} /> Ver evidencia
                            </button>
                          ))}
                        </div>
                      )}
                    </Section>
                    <p className="text-xs text-slate-400 italic">
                      Firma digital confirmada:{' '}
                      {formatDate(panel.maintenance.confirmedAt, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Modal Formulario Ejecutar (Técnico) */}
            {panel.mode === 'execute' && (
              <form onSubmit={saveExecution} className="space-y-4">
                <Section title="Tareas de inspección">
                  <div className="space-y-2">
                    {execution.tasks.map((task, index) => (
                      <div
                        key={`${index}-${task.description}`}
                        className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-[#0d2030] p-2.5"
                      >
                        <input
                          aria-label={`Completar tarea ${index + 1}`}
                          type="checkbox"
                          checked={task.completed}
                          onChange={(event) => updateTask(index, 'completed', event.target.checked)}
                          className="h-4 w-4 rounded accent-cyan-500 shrink-0"
                        />
                        <input
                          required
                          maxLength="200"
                          value={task.description}
                          onChange={(event) => updateTask(index, 'description', event.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-white outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          aria-label="Eliminar tarea"
                          onClick={() =>
                            updateExecution(
                              'tasks',
                              execution.tasks.filter((_, taskIndex) => taskIndex !== index),
                            )
                          }
                          className="text-slate-400 hover:text-red-400 p-1 shrink-0 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateExecution('tasks', [
                        ...execution.tasks,
                        { description: '', completed: false },
                      ])
                    }
                    className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    <Plus size={16} /> Agregar tarea
                  </button>
                </Section>

                <Section title="Informe de ejecución">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-slate-300">
                      <span>Piezas reemplazadas / repuestos</span>
                      <textarea
                        rows="3"
                        maxLength="5000"
                        value={execution.replacedParts}
                        onChange={(event) => updateExecution('replacedParts', event.target.value)}
                        placeholder="Lista de piezas y repuestos utilizados..."
                        className={fieldClass}
                      />
                    </label>

                    <label className="block text-xs font-medium text-slate-300">
                      <span>Descripción de lo realizado <span className="text-cyan-400">*</span></span>
                      <textarea
                        required
                        rows="3"
                        maxLength="10000"
                        value={execution.workDescription}
                        onChange={(event) => updateExecution('workDescription', event.target.value)}
                        placeholder="Describe detalladamente el trabajo efectuado..."
                        className={fieldClass}
                      />
                    </label>

                    <label className="block text-xs font-medium text-slate-300 sm:col-span-2">
                      <span>Observaciones / notas del técnico</span>
                      <textarea
                        rows="3"
                        maxLength="10000"
                        value={execution.technicianNotes}
                        onChange={(event) => updateExecution('technicianNotes', event.target.value)}
                        placeholder="Anomalías detectadas o recomendaciones para el próximo ciclo..."
                        className={fieldClass}
                      />
                    </label>

                    <label className="block text-xs font-medium text-slate-300">
                      <span>Estado final <span className="text-cyan-400">*</span></span>
                      <select
                        value={execution.outcome}
                        onChange={(event) => updateExecution('outcome', event.target.value)}
                        className={fieldClass}
                      >
                        {Object.entries(outcomeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-medium text-slate-300">
                      <span>Próxima fecha de mantenimiento <span className="text-cyan-400">*</span></span>
                      <input
                        required
                        type="date"
                        min={localDate()}
                        value={execution.nextMaintenanceDate}
                        onChange={(event) =>
                          updateExecution('nextMaintenanceDate', event.target.value)
                        }
                        className={fieldClass}
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Sugerida automáticamente cada{' '}
                        {panel.maintenance.maintenanceFrequencyDays || 90} días.
                      </span>
                    </label>
                  </div>
                </Section>

                <Section title="Evidencia antes y después">
                  <label
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      addEvidenceFiles(event.dataTransfer.files);
                    }}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-cyan-400/40 bg-[#0d2030] p-6 text-center hover:border-cyan-400 transition-colors"
                  >
                    <FileImage size={24} className="text-cyan-300" />
                    <span className="mt-2 text-xs font-bold text-white">
                      Arrastra imágenes o selecciona archivos
                    </span>
                    <span className="mt-1 text-[11px] text-slate-400">
                      JPG, PNG o WEBP · máximo 10 imágenes de 10 MB cada una
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => addEvidenceFiles(event.target.files)}
                      className="sr-only"
                    />
                  </label>

                  {evidences.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {evidences.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-[#081723] p-2.5 text-xs text-slate-300"
                        >
                          <span className="truncate pr-2 font-medium">
                            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEvidences((current) =>
                                current.filter((_, fileIndex) => fileIndex !== index),
                              )
                            }
                            aria-label={`Quitar ${file.name}`}
                            className="text-slate-400 hover:text-red-400 transition-colors p-1"
                          >
                            <X size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#0d2030] p-3.5 text-xs text-slate-300">
                  <input
                    required
                    type="checkbox"
                    checked={execution.confirmed}
                    onChange={(event) => updateExecution('confirmed', event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-cyan-500 shrink-0"
                  />
                  <span>
                    <strong className="text-white font-semibold">Confirmar veracidad de datos.</strong> Esta
                    confirmación registra mi identidad y fecha como firma digital de esta ejecución.
                  </span>
                </label>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || execution.tasks.length === 0}
                    className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-950/40"
                  >
                    {saving ? (
                      'Guardando...'
                    ) : (
                      <>
                        <ClipboardCheck size={16} /> Guardar ejecución
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Visor de Imagen Evidencia */}
      {previewEvidence && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Evidencia del mantenimiento"
          onClick={() => setPreviewEvidence('')}
        >
          <button
            type="button"
            onClick={() => setPreviewEvidence('')}
            aria-label="Cerrar evidencia"
            className="absolute right-5 top-5 text-white hover:text-cyan-300 transition-colors p-2"
          >
            <X size={28} />
          </button>
          <img
            src={previewEvidence}
            alt="Evidencia del mantenimiento preventivo"
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </section>
  );
}