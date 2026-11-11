import { useEffect, useState } from 'react';
import {
    AlertCircle,
    Activity,
    CheckCircle2,
    ClipboardList,
    FileText,
    Plus,
    Power,
    RefreshCw,
    Search,
    Trash2,
    TrendingUp,
    Wrench,
    X,
} from 'lucide-react';
import {
    API_ORIGIN,
    deactivateAsset,
    deleteAsset,
    getAssetResume,
    getAssetFailureTrends,
    getAssets,
    getPredictiveHistory,
} from '../../services/assetService';
import { getPreventiveMaintenanceEvidence } from '../../services/preventiveMaintenanceService';
import CreateAssetForm from '../../components/CreateAssetForm';
import AssetReportModal from '../../components/AssetReportModal';

const STATUS_LABELS = {
    OPERATIONAL: 'Operativo',
    IN_REPAIR: 'En reparación',
    OBSOLETE: 'Obsoleto',
};

const MAINTENANCE_STATUS_LABELS = {
    SCHEDULED: 'Programado',
    COMPLETED: 'Completado',
    PARTIALLY_COMPLETED: 'Parcialmente completado',
    URGENT_CORRECTIVE: 'Requiere correctivo urgente',
};

function describeError(error) {
    if (error.response?.status === 403) {
        return 'Acceso denegado. Cierra sesión e inicia sesión de nuevo con una cuenta Administrador.';
    }
    if (error.response?.status === 401) {
        return 'El servidor rechazó el token. La sesión permanece abierta; vuelve a iniciar sesión y reintenta.';
    }
    return (
        error.response?.data?.detail ||
        error.response?.data?.message ||
        (typeof error.response?.data === 'string' ? error.response.data : '') ||
        error.message ||
        'Ocurrió un error al comunicarse con el servidor.'
    );
}

function formatDate(value) {
    return value ? value.split('-').reverse().join('/') : 'Sin registro';
}

function formatDateTime(value) {
    return value
        ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
        : 'Sin registro';
}

function formatCurrency(value) {
    if (value === null || value === undefined) return 'Sin registro';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
}

export default function Activos() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [loadError, setLoadError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [modal, setModal] = useState('');
    const [editingAsset, setEditingAsset] = useState(null);
    const [selectedReportAsset, setSelectedReportAsset] = useState(null);
    const [resume, setResume] = useState(null);
    const [resumeLoading, setResumeLoading] = useState(false);
    const [predictiveHistory, setPredictiveHistory] = useState([]);
    const [predictiveAsset, setPredictiveAsset] = useState(null);
    const [predictiveLoading, setPredictiveLoading] = useState(false);
    const [maintenanceEvidencePreview, setMaintenanceEvidencePreview] = useState('');
    const [failureTrends, setFailureTrends] = useState(null);
    const [failureTrendAsset, setFailureTrendAsset] = useState(null);
    const [failureTrendsLoading, setFailureTrendsLoading] = useState(false);

    useEffect(
        () => () => {
            if (maintenanceEvidencePreview) URL.revokeObjectURL(maintenanceEvidencePreview);
        },
        [maintenanceEvidencePreview]
    );

    useEffect(() => {
        let cancelled = false;
        getAssets()
            .then((data) => {
                if (!cancelled) setAssets(data);
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
    }, [refreshKey]);

    const visibleAssets = assets.filter((asset) => {
        const matchesStatus = statusFilter === 'ALL' || asset.operationalStatus === statusFilter;
        const searchable = `${asset.name} ${asset.brand || ''} ${asset.model || ''} ${asset.serialNumber || ''} ${
            asset.categoryName || ''
        } ${asset.location || ''}`;
        return matchesStatus && searchable.toLowerCase().includes(query.trim().toLowerCase());
    });

    const openCreateForm = () => {
        setEditingAsset(null);
        setModal('form');
    };

    const openEditForm = (asset) => {
        setEditingAsset(asset);
        setModal('form');
    };

    const reloadAssets = () => {
        setLoading(true);
        setLoadError('');
        setRefreshKey((key) => key + 1);
    };

    const handleAssetSaved = (saved) => {
        setAssets((current) =>
            editingAsset ? current.map((asset) => (asset.id === saved.id ? saved : asset)) : [saved, ...current]
        );
        setFeedback(editingAsset ? 'Activo actualizado.' : 'Activo registrado.');
        setModal('');
    };

    const handleDeactivate = async (asset) => {
        try {
            const updated = await deactivateAsset(asset.id);
            setAssets((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setFeedback(`${asset.name} quedó desactivado.`);
        } catch (error) {
            setFeedback(`No se pudo desactivar el activo: ${describeError(error)}`);
        }
    };

    const handleDelete = async (asset) => {
        if (!window.confirm(`¿Eliminar lógicamente el activo "${asset.name}"?`)) return;
        try {
            await deleteAsset(asset.id);
            setAssets((current) => current.filter((item) => item.id !== asset.id));
            setFeedback('Activo eliminado lógicamente.');
        } catch (error) {
            setFeedback(`No se pudo eliminar el activo: ${describeError(error)}`);
        }
    };

    const openResume = (asset) => {
        setSelectedReportAsset(asset);
        setModal('reportModal');
    };

    const openMaintenanceEvidence = async (url) => {
        try {
            const evidence = await getPreventiveMaintenanceEvidence(url);
            setMaintenanceEvidencePreview(URL.createObjectURL(evidence));
        } catch (error) {
            setFeedback(`No se pudo abrir la evidencia: ${describeError(error)}`);
        }
    };

    const openPredictiveHistory = async (asset) => {
        setPredictiveHistory([]);
        setPredictiveAsset(asset);
        setPredictiveLoading(true);
        setModal('predictiveResume');
        try {
            setPredictiveHistory(await getPredictiveHistory(asset.id));
        } catch (error) {
            setFeedback(`No se pudo cargar la hoja de vida predictiva: ${describeError(error)}`);
            setModal('');
        } finally {
            setPredictiveLoading(false);
        }
    };

    const openFailureTrends = async (asset) => {
        setFailureTrendAsset(asset);
        setFailureTrends(null);
        setFailureTrendsLoading(true);
        setModal('failureTrends');
        try {
            setFailureTrends(await getAssetFailureTrends(asset.id));
        } catch (error) {
            setFeedback(`No se pudo analizar el historial de fallas: ${describeError(error)}`);
            setModal('');
        } finally {
            setFailureTrendsLoading(false);
        }
    };

    return (
        <section className="rounded-xl border border-white/10 bg-[#13293a] p-4 sm:p-6 shadow-xl min-w-0">
            {/* Header de la vista */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-white/10 pb-4">
                <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-white">Gestión de Activos</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Ficha técnica, asignación y estado operativo.</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
                    <button
                        type="button"
                        title="Recargar activos"
                        aria-label="Recargar activos"
                        onClick={reloadAssets}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:border-cyan-400 hover:text-cyan-300 active:bg-white/5 transition-colors shrink-0"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        type="button"
                        onClick={openCreateForm}
                        className="flex-1 sm:flex-initial flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 active:bg-cyan-700 transition-colors shadow-lg shadow-cyan-950/40"
                    >
                        <Plus size={18} />
                        <span>Registrar activo</span>
                    </button>
                </div>
            </div>

            {/* Mensajes de Feedback */}
            {feedback && (
                <div
                    className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3.5 text-xs text-cyan-100"
                    role="status"
                >
                    <span className="min-w-0 flex-1">{feedback}</span>
                    <button
                        type="button"
                        onClick={() => setFeedback('')}
                        title="Cerrar aviso"
                        aria-label="Cerrar aviso"
                        className="flex h-8 w-8 items-center justify-center rounded text-cyan-300 hover:bg-cyan-400/20 transition-colors shrink-0 -mr-1 -mt-1"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Búsqueda y Filtros */}
            <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative min-w-0 flex-1">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por nombre, serial o categoría..."
                        className="w-full rounded-lg border border-white/10 bg-[#081723] py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px] transition-colors"
                    />
                </div>
                <label className="flex items-center justify-between sm:justify-start gap-2.5 text-xs font-medium text-slate-300 shrink-0">
                    <span>Estado:</span>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-lg border border-white/10 bg-[#081723] px-3 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px] transition-colors"
                    >
                        <option value="ALL">Todos los estados</option>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* Error de Carga */}
            {loadError && (
                <div
                    className="flex items-center gap-2.5 rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200"
                    role="alert"
                >
                    <AlertCircle size={18} className="shrink-0" />
                    <span>No se pudieron cargar los activos: {loadError}</span>
                </div>
            )}

            {/* Contenido Principal: Tarjetas en móvil/tablet, Tabla en escritorio */}
            {loading ? (
                <p className="py-12 text-center text-xs text-slate-400">Cargando activos...</p>
            ) : (
                !loadError && (
                    <>
                        {/* Vista Móvil / Tablet (Tarjetas) */}
                        <div className="grid min-w-0 grid-cols-2 gap-2 md:gap-3.5 lg:hidden">
                            {visibleAssets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="rounded-xl border border-white/10 bg-[#0b1d2a] p-3 sm:p-4 space-y-3 shadow-md min-w-0"
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5">
                                            {asset.imageUrl ? (
                                                <img
                                                    src={`${API_ORIGIN}${asset.imageUrl}`}
                                                    alt={`Imagen de ${asset.name}`}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <Wrench size={18} className="text-slate-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="break-words font-semibold text-white text-xs sm:text-base">
                                                {asset.name}
                                            </h3>
                                            <p className="break-words text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                                                {[asset.brand, asset.model, asset.serialNumber]
                                                    .filter(Boolean)
                                                    .join(' · ') || 'Sin ficha técnica'}
                                            </p>
                                            <p className="mt-1 text-[10px] text-cyan-200">
                                                Horómetro: {asset.currentHorometer ?? 0} h
                                            </p>
                                            {asset.hasMotor && (
                                                <span className="inline-block mt-1.5 max-w-full break-words text-[10px] sm:text-xs text-cyan-300 font-medium bg-cyan-950/50 px-2 py-1 rounded border border-cyan-800/40">
                                                    ID predictivo: {asset.predictiveId}
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-[10px] sm:text-xs font-medium ${
                                                asset.isActive
                                                    ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                                                    : 'bg-slate-400/10 text-slate-400 border border-slate-400/20'
                                            }`}
                                        >
                                            {asset.isActive ? <CheckCircle2 size={12} /> : <Power size={12} />}
                                            {asset.isActive
                                                ? STATUS_LABELS[asset.operationalStatus] || asset.operationalStatus
                                                : 'Desactivado'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 text-xs border-t border-b border-white/5 py-2.5 text-slate-300">
                                        <div>
                                            <span className="text-slate-500 block text-[11px]">Categoría</span>
                                            <span className="font-medium break-words block">
                                                {asset.categoryName || `ID ${asset.categoryId}`}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-[11px]">Responsable</span>
                                            <span className="font-medium break-words block">
                                                {asset.responsibleName || `ID ${asset.responsibleId}`}
                                            </span>
                                        </div>
                                        <div className="min-[400px]:col-span-2 pt-1">
                                            <span className="text-slate-500 block text-[11px]">Ubicación</span>
                                            <span className="font-medium break-words block">
                                                {asset.location || 'Sin ubicación'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Botones de acción móvil */}
                                    <div className="flex items-center justify-end gap-1.5 pt-1 flex-wrap">
                                        <button
                                            type="button"
                                            title="Hoja de vida"
                                            aria-label={`Hoja de vida de ${asset.name}`}
                                            onClick={() => openResume(asset)}
                                            className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300 active:bg-cyan-500/20 transition-colors"
                                        >
                                            <FileText size={18} />
                                        </button>
                                        {asset.hasMotor && (
                                            <button
                                                type="button"
                                                title="Hoja de vida predictivo"
                                                aria-label={`Hoja de vida predictivo de ${asset.name}`}
                                                onClick={() => openPredictiveHistory(asset)}
                                                className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300 active:bg-emerald-500/20 transition-colors"
                                            >
                                                <Activity size={18} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            title="Tendencia de fallas"
                                            aria-label={`Análisis de tendencia de fallas de ${asset.name}`}
                                            onClick={() => openFailureTrends(asset)}
                                            className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 active:bg-amber-500/20 transition-colors"
                                        >
                                            <TrendingUp size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Editar"
                                            aria-label={`Editar ${asset.name}`}
                                            onClick={() => openEditForm(asset)}
                                            className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300 active:bg-cyan-500/20 transition-colors"
                                        >
                                            <ClipboardList size={18} />
                                        </button>
                                        {asset.isActive && (
                                            <button
                                                type="button"
                                                title="Desactivar"
                                                aria-label={`Desactivar ${asset.name}`}
                                                onClick={() => handleDeactivate(asset)}
                                                className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 active:bg-amber-500/20 transition-colors"
                                            >
                                                <Power size={18} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            title="Eliminar lógicamente"
                                            aria-label={`Eliminar ${asset.name}`}
                                            onClick={() => handleDelete(asset)}
                                            className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-red-500/10 hover:text-red-300 active:bg-red-500/20 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Vista Escritorio (Tabla) */}
                        <div className="hidden lg:block overflow-x-auto rounded-lg border border-white/10">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="border-b border-white/10 bg-[#0b1d2a] text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3.5 font-medium">Activo</th>
                                        <th className="px-4 py-3.5 font-medium">Categoría</th>
                                        <th className="px-4 py-3.5 font-medium">Responsable</th>
                                        <th className="px-4 py-3.5 font-medium">Ubicación</th>
                                        <th className="px-4 py-3.5 font-medium">Estado</th>
                                        <th className="px-4 py-3.5 text-right font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {visibleAssets.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5">
                                                        {asset.imageUrl ? (
                                                            <img
                                                                src={`${API_ORIGIN}${asset.imageUrl}`}
                                                                alt={`Imagen de ${asset.name}`}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <Wrench size={16} className="text-slate-500" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white">{asset.name}</p>
                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            {[asset.brand, asset.model, asset.serialNumber]
                                                                .filter(Boolean)
                                                                .join(' · ') || 'Sin ficha técnica'}
                                                        </p>
                                                        <p className="mt-1 text-[11px] text-cyan-200">
                                                            Horómetro: {asset.currentHorometer ?? 0} h
                                                        </p>
                                                        {asset.hasMotor && (
                                                            <p className="mt-0.5 text-xs text-cyan-300 font-medium">
                                                                ID predictivo: {asset.predictiveId}
                                                            </p>
                                                        )}
                                                        <button
                                                            type="button"
                                                            title="Tendencia de fallas"
                                                            aria-label={`Análisis de tendencia de fallas de ${asset.name}`}
                                                            onClick={() => openFailureTrends(asset)}
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-amber-500/10 hover:text-amber-300 transition-colors"
                                                        >
                                                            <TrendingUp size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-300">
                                                {asset.categoryName || `ID ${asset.categoryId}`}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-300">
                                                {asset.responsibleName || `ID ${asset.responsibleId}`}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-300">
                                                {asset.location || 'Sin ubicación'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        asset.isActive
                                                            ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                                                            : 'bg-slate-400/10 text-slate-400 border border-slate-400/20'
                                                    }`}
                                                >
                                                    {asset.isActive ? <CheckCircle2 size={12} /> : <Power size={12} />}
                                                    {asset.isActive
                                                        ? STATUS_LABELS[asset.operationalStatus] ||
                                                          asset.operationalStatus
                                                        : 'Desactivado'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="inline-flex items-center gap-1 text-slate-400">
                                                    <button
                                                        type="button"
                                                        title="Hoja de vida"
                                                        aria-label={`Hoja de vida de ${asset.name}`}
                                                        onClick={() => openResume(asset)}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 hover:text-cyan-300 transition-colors"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                    {asset.hasMotor && (
                                                        <button
                                                            type="button"
                                                            title="Hoja de vida predictivo"
                                                            aria-label={`Hoja de vida predictivo de ${asset.name}`}
                                                            onClick={() => openPredictiveHistory(asset)}
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 hover:text-emerald-300 transition-colors"
                                                        >
                                                            <Activity size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        aria-label={`Editar ${asset.name}`}
                                                        onClick={() => openEditForm(asset)}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 hover:text-cyan-300 transition-colors"
                                                    >
                                                        <ClipboardList size={16} />
                                                    </button>
                                                    {asset.isActive && (
                                                        <button
                                                            type="button"
                                                            title="Desactivar"
                                                            aria-label={`Desactivar ${asset.name}`}
                                                            onClick={() => handleDeactivate(asset)}
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 hover:text-amber-300 transition-colors"
                                                        >
                                                            <Power size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Eliminar lógicamente"
                                                        aria-label={`Eliminar ${asset.name}`}
                                                        onClick={() => handleDelete(asset)}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 hover:text-red-300 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {!visibleAssets.length && (
                            <p className="py-12 text-center text-xs text-slate-400">
                                No hay activos que coincidan con los filtros.
                            </p>
                        )}
                    </>
                )
            )}

            {/* Modal Formulario Activo */}
            {modal === 'form' && (
                <CreateAssetForm asset={editingAsset} onCancel={() => setModal('')} onSaved={handleAssetSaved} />
            )}

            {/* Generador de Reportes Completos y Hoja de Vida */}
            <AssetReportModal
                asset={selectedReportAsset}
                isOpen={modal === 'reportModal'}
                onClose={() => {
                    setModal('');
                    setSelectedReportAsset(null);
                }}
            />

            {/* Modal Hoja de Vida Predictivo */}
            {modal === 'predictiveResume' && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-y-auto"
                    role="presentation"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="predictive-resume-title"
                        className="relative my-auto max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/10 bg-[#102637] p-4 sm:p-6 shadow-2xl transition-all min-w-0"
                    >
                        <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                            <div className="min-w-0">
                                <h3 id="predictive-resume-title" className="text-base sm:text-lg font-semibold text-white truncate">
                                    Hoja de vida predictivo
                                </h3>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {predictiveAsset?.name} · {predictiveAsset?.predictiveId} · lecturas y resultados históricos.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModal('')}
                                title="Cerrar"
                                aria-label="Cerrar hoja de vida predictiva"
                                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {predictiveLoading ? (
                            <p className="py-12 text-center text-xs text-slate-400">Cargando historial predictivo...</p>
                        ) : predictiveHistory.length ? (
                            <div className="space-y-4">
                                <div className="overflow-x-auto rounded-lg border border-white/10">
                                    <table className="w-full text-left text-xs min-w-[750px]">
                                        <thead className="border-b border-white/10 bg-[#0b1d2a] text-slate-400">
                                            <tr>
                                                <th className="px-3.5 py-3 font-medium">Fecha</th>
                                                <th className="px-3.5 py-3 font-medium">Estado</th>
                                                <th className="px-3.5 py-3 font-medium">Confianza</th>
                                                <th className="px-3.5 py-3 font-medium">Temperatura</th>
                                                <th className="px-3.5 py-3 font-medium">Vibración</th>
                                                <th className="px-3.5 py-3 font-medium">Humedad</th>
                                                <th className="px-3.5 py-3 font-medium">Presión</th>
                                                <th className="px-3.5 py-3 font-medium">Consumo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {predictiveHistory.map((record) => (
                                                <tr key={record.id} className="hover:bg-white/[0.02]">
                                                    <td className="whitespace-nowrap px-3.5 py-3 text-slate-300">
                                                        {formatDateTime(record.timestamp)}
                                                    </td>
                                                    <td
                                                        className={`px-3.5 py-3 font-semibold ${
                                                            record.predictionClass === 1
                                                                ? 'text-red-300'
                                                                : 'text-emerald-300'
                                                        }`}
                                                    >
                                                        {record.motorState}
                                                    </td>
                                                    <td className="px-3.5 py-3 text-slate-300">
                                                        {Math.round(record.confidence * 100)}%
                                                    </td>
                                                    <td className="px-3.5 py-3 text-slate-300">
                                                        {record.temperature} °C
                                                    </td>
                                                    <td className="px-3.5 py-3 text-slate-300">
                                                        {record.vibration} Hz
                                                    </td>
                                                    <td className="px-3.5 py-3 text-slate-300">
                                                        {record.humidity} %
                                                    </td>
                                                    <td className="px-3.5 py-3 text-slate-300">
                                                        {record.pressure} bar
                                                    </td>
                                                    <td className="px-3.5 py-3 text-slate-300">
                                                        {record.energyConsumption} kW
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {predictiveHistory.some((record) => record.affectedComponents) && (
                                    <div className="rounded-lg border border-white/10 bg-[#081723] p-3.5 text-xs text-slate-300 space-y-2">
                                        <p className="font-semibold text-white uppercase tracking-wider text-[11px]">
                                            Diagnósticos
                                        </p>
                                        <div className="space-y-1.5 divide-y divide-white/5">
                                            {predictiveHistory.map(
                                                (record) =>
                                                    record.affectedComponents && (
                                                        <p key={record.id} className="pt-1.5 first:pt-0">
                                                            <span className="text-slate-400">
                                                                {formatDateTime(record.timestamp)}:
                                                            </span>{' '}
                                                            {record.affectedComponents}
                                                        </p>
                                                    )
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="rounded-lg border border-white/10 p-4 text-xs text-slate-400">
                                Este activo aún no tiene lecturas predictivas registradas.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {modal === 'failureTrends' && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="failure-trends-title"
                        className="w-full max-w-xl rounded-xl border border-white/10 bg-[#102637] p-5 text-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 id="failure-trends-title" className="text-lg font-bold">Tendencia histórica de fallas</h2>
                                <p className="mt-1 text-xs text-slate-400">{failureTrendAsset?.name}</p>
                            </div>
                            <button type="button" onClick={() => setModal('')} aria-label="Cerrar análisis" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        {failureTrendsLoading ? (
                            <p className="py-10 text-center text-sm text-slate-300">Analizando historial…</p>
                        ) : failureTrends && (
                            <div className="mt-5 space-y-4">
                                <dl className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="rounded-lg border border-white/10 bg-[#0b1d2a] p-3">
                                        <dt className="text-slate-400">Fallas registradas</dt>
                                        <dd className="mt-1 text-xl font-bold">{failureTrends.failureCount}</dd>
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-[#0b1d2a] p-3">
                                        <dt className="text-slate-400">Horómetro acumulado</dt>
                                        <dd className="mt-1 text-xl font-bold">{failureTrends.currentHorometer ?? 0} h</dd>
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-[#0b1d2a] p-3">
                                        <dt className="text-slate-400">Frecuencia base</dt>
                                        <dd className="mt-1 font-semibold">{failureTrends.baseIntervalDays} días</dd>
                                    </div>
                                    <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-3">
                                        <dt className="text-cyan-200">Intervalo sugerido</dt>
                                        <dd className="mt-1 text-xl font-bold text-cyan-100">{failureTrends.suggestedIntervalDays} días</dd>
                                    </div>
                                </dl>
                                <p className="rounded-lg border border-white/10 bg-[#0b1d2a] p-3 text-xs leading-relaxed text-slate-200">
                                    {failureTrends.summary}
                                </p>
                                {failureTrends.averageDaysBetweenFailures != null && (
                                    <p className="text-xs text-slate-400">
                                        Promedio entre fallas: {failureTrends.averageDaysBetweenFailures.toFixed(1)} días.
                                    </p>
                                )}
                                {failureTrends.recurringFailures?.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-amber-200">Fallas recurrentes</h3>
                                        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-300">
                                            {failureTrends.recurringFailures.map((failure) => <li key={failure}>{failure}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Modal Previsualización de Evidencia */}
            {maintenanceEvidencePreview && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Evidencia del mantenimiento"
                    onClick={() => setMaintenanceEvidencePreview('')}
                >
                    <button
                        type="button"
                        onClick={() => setMaintenanceEvidencePreview('')}
                        aria-label="Cerrar evidencia"
                        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={maintenanceEvidencePreview}
                        alt="Evidencia del mantenimiento preventivo"
                        className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
                    />
                </div>
            )}
        </section>
    );
}