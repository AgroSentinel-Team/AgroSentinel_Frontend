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
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { getPreventiveMaintenanceEvidence } from '../../services/preventiveMaintenanceService';
import { getAssets, getCategories } from '../../services/assetService';
import useFormDraft from '../../hooks/useFormDraft';
import {
  executePreventiveMaintenance,
  getPreventiveMaintenances,
  getPreventiveTechnicianAvailability,
  schedulePreventiveMaintenance,
} from '../../services/preventiveMaintenanceService';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Skeleton,
  StatCard,
} from '../../components/ui';

const fieldClass =
  'mt-1 min-h-11 w-full rounded-xl border border-sand-200 bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-all duration-200 placeholder:text-ink-600 focus-visible:border-gold-600 focus-visible:ring-2 focus-visible:ring-gold-500/25 disabled:opacity-60';

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

// Los mantenimientos son obligatorios; activos, categorías y técnicos son de apoyo:
// si alguno no está disponible sin conexión, la vista se muestra igual.
async function fetchPreventiveData() {
  const [maintenanceData, ...support] = await Promise.allSettled([
    getPreventiveMaintenances(),
    getAssets(),
    getCategories(),
    loadTechnicianAvailability(),
  ]);
  if (maintenanceData.status === 'rejected') throw maintenanceData.reason;
  const [assetData, categoryData, technicianData] = support.map((result) =>
    result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [],
  );
  return {
    maintenances: Array.isArray(maintenanceData.value) ? maintenanceData.value : [],
    assets: assetData.filter((asset) => asset.isActive),
    categories: categoryData,
    technicians: technicianData,
  };
}

// La disponibilidad de técnicos es exclusiva del administrador (el backend responde 403 a los demás).
function loadTechnicianAvailability() {
  return ['ADMIN', 'ADMINISTRADOR'].includes(roleName())
    ? getPreventiveTechnicianAvailability()
    : Promise.resolve([]);
}

function StatusBadge({ status }) {
  const variant =
    status === 'COMPLETED'
      ? 'success'
      : status === 'URGENT_CORRECTIVE'
      ? 'error'
      : status === 'PARTIALLY_COMPLETED'
      ? 'warning'
      : 'info';
  return (
    <Badge variant={variant} className="border border-current/10">
      {statusLabels[status] || status}
    </Badge>
  );
}

function Section({ title, children }) {
  return (
    <Card as="section" className="p-4 sm:p-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-forest-700">{title}</h3>
      {children}
    </Card>
  );
}

function Metric({ label, value, icon: Icon, accent = 'forest' }) {
  return (
    <StatCard label={label} value={value} icon={<Icon size={18} />} accent={accent} />
  );
}

function Info({ label, value }) {
  return (
    <Card variant="muted" className="min-w-0 rounded-xl p-3 shadow-none">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">{label}</p>
      <p className="mt-1 break-words whitespace-pre-wrap text-sm font-medium text-ink-900">
        {value || 'Sin registro'}
      </p>
    </Card>
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
    horometerReading: '',
  });
  const [evidences, setEvidences] = useState([]);
  const [previewEvidence, setPreviewEvidence] = useState('');

  const isAdmin = ['ADMIN', 'ADMINISTRADOR'].includes(roleName());
  const isTechnician = roleName() === 'TECNICO';

  // Borrador automático de la ejecución (incluye fotos) por si la app se cierra en campo.
  const executionDraftKey =
    panel?.mode === 'execute' ? `preventive-execution:${panel.maintenance.id}` : null;
  const executionDraftValue = useMemo(() => ({ execution, evidences }), [execution, evidences]);
  const executionDraft = useFormDraft(executionDraftKey, executionDraftValue, (saved) => {
    if (saved?.execution) setExecution((current) => ({ ...current, ...saved.execution }));
    if (Array.isArray(saved?.evidences)) setEvidences(saved.evidences);
  });
  const selectedAsset = assets.find((asset) => String(asset.id) === schedule.assetId);
  const selectedCategory = categories.find(
    (category) => String(category.id) === String(selectedAsset?.categoryId),
  );

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchPreventiveData();
      setMaintenances(data.maintenances);
      setAssets(data.assets);
      setCategories(data.categories);
      setTechnicians(data.technicians);
    } catch (error) {
      setLoadError(describeError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchPreventiveData()
      .then((data) => {
        if (cancelled) return;
        setMaintenances(data.maintenances);
        setAssets(data.assets);
        setCategories(data.categories);
        setTechnicians(data.technicians);
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
        horometerReading: maintenance.currentHorometer ?? '',
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
        {
          ...execution,
          horometerReading: execution.horometerReading === ''
            ? null
            : Number(execution.horometerReading),
          executedAt: new Date().toISOString(),
        },
        evidences,
      );
      await executionDraft.clear();
      setPanel(null);
      setFeedback(result?.queued
        ? 'Ejecución y evidencias guardadas en el dispositivo. Se enviarán automáticamente al recuperar internet.'
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
    <section className="min-w-0 space-y-5 text-ink-900">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-4 border-b border-sand-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-forest-700">
            <Activity size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Gestión de mantenimiento
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[30px]">
            Mantenimiento preventivo
          </h1>
          <p className="mt-1.5 text-sm text-ink-600">
            Programa inspecciones, distribuye la carga de trabajo y registra ejecuciones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          <Button
            variant="ghost"
            onClick={loadData}
            leftIcon={<RefreshCw size={16} />}
          >
            Actualizar
          </Button>
          {isAdmin && (
            <Button
              onClick={openSchedule}
              leftIcon={<Plus size={18} />}
            >
              Programar mantenimiento
            </Button>
          )}
        </div>
      </header>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total programados" value={maintenances.length} icon={CalendarDays} accent="forest" />
        <Metric label="Pendientes" value={countFor('SCHEDULED')} icon={Clock3} accent="ocean" />
        <Metric label="Completados" value={countFor('COMPLETED')} icon={CheckCircle2} accent="forest" />
        <Metric label="Atención urgente" value={countFor('URGENT_CORRECTIVE')} icon={AlertTriangle} accent="gold" />
      </div>

      {/* Avisos de Estado y Alertas */}
      {feedback && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-forest-300/50 bg-success-soft p-3.5 text-sm text-forest-700"
        >
          <span className="min-w-0 flex-1">{feedback}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFeedback('')}
            aria-label="Cerrar aviso"
            className="size-8 min-h-8 shrink-0"
          >
            <X size={16} />
          </Button>
        </div>
      )}

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

      {/* Panel Vista de Mantenimientos */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-sand-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5 rounded-xl border border-sand-200 bg-sand-100 p-1">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 ${
                view === 'list'
                  ? 'bg-gold-500 text-pine-900 shadow-sm'
                  : 'text-ink-600 hover:bg-surface hover:text-ink-900'
              }`}
            >
              <List size={16} />
              <span>Listado</span>
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 ${
                view === 'calendar'
                  ? 'bg-gold-500 text-pine-900 shadow-sm'
                  : 'text-ink-600 hover:bg-surface hover:text-ink-900'
              }`}
            >
              <CalendarDays size={16} />
              <span>Calendario</span>
            </button>
          </div>

          {view === 'list' && (
            <Input
              aria-label="Buscar por activo o técnico"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por activo o técnico..."
              className="sm:max-w-xs"
            />
          )}
        </div>

        {/* Vista Listado */}
        {view === 'list' ? (
          <>
            {/* Móvil (Tarjetas) */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:hidden">
              {loading && (
                <Skeleton variant="rect" label="Cargando mantenimientos" className="min-h-36" />
              )}
              {!loading &&
                visibleMaintenances.map((item) => (
                  <article
                    key={item.id}
                    className="space-y-3 rounded-2xl border border-sand-200 bg-surface p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-sand-200/70 pb-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-900 truncate">{item.assetName}</p>
                        <p className="text-xs text-ink-600 truncate mt-0.5">{item.categoryName}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-600">Técnico asignado:</span>
                        <span className="font-semibold text-ink-900 truncate max-w-[180px]">{item.technicianName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-600">Fecha programada:</span>
                        <span className="font-mono text-ink-600">
                          {formatDate(item.scheduledAt, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-600">Atención:</span>
                        <span className="font-semibold text-ocean-700">
                          {attentionLabels[item.attentionIndex] || attentionLabels.LOW}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-sand-200/70 flex justify-end">
                      <button
                        type="button"
                        onClick={() => openDetails(item)}
                        className="flex min-h-10 items-center gap-1.5 rounded-xl border border-ocean-300/60 bg-info-soft px-3 py-1.5 text-xs font-semibold text-ocean-700 transition-all duration-200 hover:bg-ocean-300/20"
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
                <EmptyState
                  title="No hay mantenimientos para mostrar."
                  className="col-span-full"
                />
              )}
            </div>

            {/* Escritorio (Tabla) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 border-b border-sand-200 bg-sand-100 text-xs font-semibold uppercase tracking-wider text-ink-600">
                  <tr>
                    <th className="px-4 py-3.5">Activo / Categoría</th>
                    <th className="px-4 py-3.5">Técnico</th>
                    <th className="px-4 py-3.5">Fecha programada</th>
                    <th className="px-4 py-3.5">Atención</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200/70">
                  {loading && (
                    <tr>
                      <td colSpan="6" className="px-4 py-5">
                        <Skeleton variant="rect" label="Cargando mantenimientos" />
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    visibleMaintenances.map((item) => (
                      <tr key={item.id} className="hover:bg-sand-50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-ink-900">
                          <p className="truncate">{item.assetName}</p>
                          <p className="mt-0.5 text-xs font-normal text-ink-600">{item.categoryName}</p>
                        </td>
                        <td className="px-4 py-3.5 text-ink-600 font-medium">{item.technicianName}</td>
                        <td className="px-4 py-3.5 text-ink-600 font-mono text-xs">
                          {formatDate(item.scheduledAt, { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3.5 text-ink-600 font-medium">
                          {attentionLabels[item.attentionIndex] || attentionLabels.LOW}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => openDetails(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-ocean-300/60 bg-info-soft px-3 py-1.5 text-xs font-semibold text-ocean-700 hover:bg-info-soft transition-colors"
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
                      <td colSpan="6" className="px-4 py-4">
                        <EmptyState title="No hay mantenimientos para mostrar." />
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
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-sand-200 pb-3">
                <button
                  type="button"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  aria-label="Mes anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-sand-200 bg-sand-100 text-sm font-bold text-ink-900 hover:bg-sand-100 transition-colors"
                >
                  ‹
                </button>
                <h2 className="text-sm sm:text-base font-bold text-ink-900 capitalize">{monthLabel}</h2>
                <button
                  type="button"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  aria-label="Mes siguiente"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-sand-200 bg-sand-100 text-sm font-bold text-ink-900 hover:bg-sand-100 transition-colors"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="py-1.5 text-xs font-bold uppercase text-ink-600">
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
                          ? 'border-ocean-500 bg-info-soft text-ink-900 ring-1 ring-ocean-500/30 shadow-md'
                          : 'border-sand-200 bg-sand-50 text-ink-600 hover:border-sand-400'
                      }`}
                    >
                      {day ? (
                        <div className="flex flex-col items-center justify-between h-full">
                          <span>{Number(day.slice(-2))}</span>
                          {count > 0 && (
                            <span className="w-full rounded-full bg-info-soft border border-ocean-300/60 px-1 py-0.5 text-[10px] font-bold text-ocean-700 truncate">
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
            <aside className="rounded-xl border border-sand-200 bg-sand-50 p-4 shadow-lg space-y-3">
              <h3 className="text-xs font-bold text-ocean-700 uppercase tracking-wider border-b border-sand-200 pb-2">
                {selectedDay ? formatDate(`${selectedDay}T12:00:00`) : 'Selecciona un día'}
              </h3>
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                {scheduledForDay.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openDetails(item)}
                    className="w-full rounded-lg border border-sand-200 bg-sand-50 p-3 text-left hover:border-ocean-500 transition-colors shadow-sm"
                  >
                    <p className="text-xs font-semibold text-ink-900 truncate">{item.assetName}</p>
                    <p className="mt-1 text-[11px] text-ink-600">
                      {formatDate(item.scheduledAt, { timeStyle: 'short' })} · {item.technicianName}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={item.status} />
                    </div>
                  </button>
                ))}
                {selectedDay && scheduledForDay.length === 0 && (
                  <p className="p-4 text-center text-xs text-ink-600">
                    Sin mantenimientos programados para este día.
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </Card>

      {/* Modal / Diálogo Flotante */}
      {panel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-pine-900/35 p-0 backdrop-blur-xl sm:items-center sm:p-6"
          role="presentation"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setPanel(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-panel-title"
            className="max-h-[92vh] w-full max-w-3xl min-w-0 overflow-y-auto rounded-t-3xl border border-surface/40 bg-surface/85 p-5 shadow-2xl backdrop-blur-xl sm:rounded-2xl sm:p-6"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-sand-200 pb-3">
              <div>
                <h2 id="maintenance-panel-title" className="text-base sm:text-lg font-bold text-ink-900">
                  {panel.mode === 'schedule'
                    ? 'Programar mantenimiento'
                    : panel.mode === 'execute'
                    ? 'Ejecutar mantenimiento'
                    : 'Detalle del mantenimiento'}
                </h2>
                <p className="mt-0.5 text-xs text-ink-600">
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
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-sand-100 hover:text-ink-900 transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Formulario Programar */}
            {panel.mode === 'schedule' && (
              <form onSubmit={saveSchedule} className="space-y-4">
                <Section title="Programación">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-ink-600">
                      <span>Activo <span className="text-forest-900">*</span></span>
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

                    <label className="block text-xs font-medium text-ink-600">
                      <span>Técnico asignado <span className="text-forest-900">*</span></span>
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
                          <option key={technician.id} value={technician.id} disabled={!technician.available}>
                            {technician.nombre} · {technician.activeWorkload}/{technician.workloadCapacity} trabajos ·{' '}
                            {technician.available ? 'Disponible' : 'No disponible'}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-medium text-ink-600">
                      <span>Categoría del activo</span>
                      <input
                        readOnly
                        value={selectedAsset?.categoryName || 'Se completa al seleccionar un activo'}
                        className={`${fieldClass} text-ink-600`}
                      />
                    </label>

                    <label className="block text-xs font-medium text-ink-600">
                      <span>Fecha y hora de ejecución <span className="text-forest-900">*</span></span>
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

                    <label className="block text-xs font-medium text-ink-600 sm:col-span-2">
                      <span>Índice de atención <span className="text-forest-900">*</span></span>
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
                    <p className="mt-3 text-xs text-ink-600">
                      Frecuencia sugerida para esta categoría: cada{' '}
                      <strong className="text-ink-900 font-semibold">
                        {selectedCategory.maintenanceFrequencyDays || 90} días
                      </strong>
                      .
                    </p>
                  )}
                </Section>

                {schedule.predictiveContext && (
                  <Section title="Falla y datos del mantenimiento predictivo">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-900">
                      {schedule.predictiveContext}
                    </p>
                  </Section>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-sand-200">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPanel(null)}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    loading={saving}
                    disabled={saving || !assets.length || !technicians.length}
                    className="w-full sm:w-auto"
                  >
                    {saving ? 'Guardando...' : 'Confirmar programación'}
                  </Button>
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
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-900">
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
                        <ul className="mt-3 space-y-2 border-t border-sand-200/70 pt-3">
                          {panel.maintenance.tasks.map((task) => (
                            <li key={task.id} className="flex items-center gap-2 text-xs text-ink-600">
                              <Check
                                size={15}
                                className={task.completed ? 'text-forest-700' : 'text-ink-600'}
                              />
                              <span>{task.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {panel.maintenance.evidences?.length > 0 && (
                        <div className="mt-3.5 flex flex-wrap gap-2 border-t border-sand-200/70 pt-3">
                          {panel.maintenance.evidences.map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => openEvidence(url)}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-sand-200 bg-sand-50 px-3 py-1.5 text-xs font-semibold text-ocean-700 hover:bg-sand-100 transition-colors"
                            >
                              <FileImage size={15} /> Ver evidencia
                            </button>
                          ))}
                        </div>
                      )}
                    </Section>
                    <p className="text-xs text-ink-600 italic">
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
                {executionDraft.restoredAt && (
                  <p
                    role="status"
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-success/20 bg-success-soft px-3 py-2 text-xs text-forest-700"
                  >
                    <span>
                      Se recuperó tu avance guardado el{' '}
                      {new Date(executionDraft.restoredAt).toLocaleString('es-CO')}.
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const maintenance = panel.maintenance;
                        await executionDraft.discard();
                        openDetails(maintenance);
                      }}
                      className="font-semibold underline underline-offset-2"
                    >
                      Empezar de cero
                    </button>
                  </p>
                )}
                <Section title="Tareas de inspección">
                  <div className="space-y-2">
                    {execution.tasks.map((task, index) => (
                      <div
                        key={`${index}-${task.description}`}
                        className="flex items-center gap-2.5 rounded-lg border border-sand-200 bg-sand-50 p-2.5"
                      >
                        <input
                          aria-label={`Completar tarea ${index + 1}`}
                          type="checkbox"
                          checked={task.completed}
                          onChange={(event) => updateTask(index, 'completed', event.target.checked)}
                          className="h-4 w-4 rounded accent-gold-500 shrink-0"
                        />
                        <input
                          required
                          maxLength="200"
                          value={task.description}
                          onChange={(event) => updateTask(index, 'description', event.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-ink-900 outline-none focus-visible:border-gold-600"
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
                          className="text-ink-600 hover:text-error-text p-1 shrink-0 transition-colors"
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
                    className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 text-xs font-bold text-ocean-700 hover:text-ocean-900 transition-colors"
                  >
                    <Plus size={16} /> Agregar tarea
                  </button>
                </Section>

                <Section title="Informe de ejecución">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-ink-600">
                      <span>Lectura actual del horómetro (h)</span>
                      <input
                        type="number"
                        min={panel.maintenance.currentHorometer ?? 0}
                        step="0.01"
                        value={execution.horometerReading}
                        onChange={(event) => updateExecution('horometerReading', event.target.value)}
                        className={fieldClass}
                      />
                      <span className="mt-1 block text-[11px] text-ink-600">
                        Última lectura: {panel.maintenance.currentHorometer ?? 0} h. No se admiten valores menores.
                      </span>
                    </label>
                    <label className="block text-xs font-medium text-ink-600">
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

                    <label className="block text-xs font-medium text-ink-600">
                      <span>Descripción de lo realizado <span className="text-forest-900">*</span></span>
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

                    <label className="block text-xs font-medium text-ink-600 sm:col-span-2">
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

                    <label className="block text-xs font-medium text-ink-600">
                      <span>Estado final <span className="text-forest-900">*</span></span>
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

                    <label className="block text-xs font-medium text-ink-600">
                      <span>Próxima fecha de mantenimiento <span className="text-forest-900">*</span></span>
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
                      <span className="mt-1 block text-[11px] text-ink-600">
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
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-ocean-300/60 bg-sand-50 p-6 text-center transition-colors hover:border-ocean-500"
                  >
                    <FileImage size={24} className="text-ocean-700" />
                    <span className="mt-2 text-xs font-bold text-ink-900">
                      Arrastra imágenes o selecciona archivos
                    </span>
                    <span className="mt-1 text-[11px] text-ink-600">
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
                          className="flex items-center justify-between rounded-lg border border-sand-200/70 bg-sand-100 p-2.5 text-xs text-ink-600"
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
                            className="text-ink-600 hover:text-error-text transition-colors p-1"
                          >
                            <X size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <label className="flex items-start gap-3 rounded-xl border border-sand-200 bg-sand-50 p-3.5 text-xs text-ink-600">
                  <input
                    required
                    type="checkbox"
                    checked={execution.confirmed}
                    onChange={(event) => updateExecution('confirmed', event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-gold-500 shrink-0"
                  />
                  <span>
                    <strong className="text-ink-900 font-semibold">Confirmar veracidad de datos.</strong> Esta
                    confirmación registra mi identidad y fecha como firma digital de esta ejecución.
                  </span>
                </label>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-sand-200">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPanel(null)}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    loading={saving}
                    disabled={saving || execution.tasks.length === 0}
                    className="w-full sm:w-auto"
                  >
                    {saving ? (
                      'Guardando...'
                    ) : (
                      <>
                        <ClipboardCheck size={16} /> Guardar ejecución
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Visor de Imagen Evidencia */}
      {previewEvidence && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-pine-900/80 p-4 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Evidencia del mantenimiento"
          onClick={() => setPreviewEvidence('')}
        >
          <button
            type="button"
            onClick={() => setPreviewEvidence('')}
            aria-label="Cerrar evidencia"
            className="absolute right-5 top-5 rounded-xl p-2 text-white transition-colors hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
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