import { useEffect, useState } from 'react';
import {
    AlertCircle,
    Activity,
    CheckCircle2,
    ClipboardList,
    FileSpreadsheet,
    FileText,
    Plus,
    Power,
    RefreshCw,
    Search,
    Stethoscope,
    Trash2,
    TrendingUp,
    Wrench,
    X,
} from 'lucide-react';
import {
    API_ORIGIN,
    deactivateAsset,
    deleteAsset,
    getAssetFailureTrends,
    getAssets,
    getPredictiveHistory,
} from '../../services/assetService';
import CreateAssetForm from '../../components/CreateAssetForm';
import AssetReportModal from '../../components/AssetReportModal';
import AssetDiagnosisModal from '../../components/AssetDiagnosisModal';
import AssetImportModal from '../../components/AssetImportModal';
import PaginationControls from '../../components/PaginationControls';
import usePagination from '../../hooks/usePagination';
import { Badge, Button, EmptyState, Input, PageHeader, Select, Skeleton, StatCard } from '../../components/ui';

const STATUS_LABELS = {
    OPERATIONAL: 'Operativo',
    OPERATIONAL_WITH_RESTRICTIONS: 'Operativo con restricciones',
    IN_REPAIR: 'En reparación',
    OUT_OF_SERVICE: 'Fuera de servicio',
    OBSOLETE: 'Obsoleto',
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

function formatDateTime(value) {
    return value
        ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
        : 'Sin registro';
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
    const [diagnosisAsset, setDiagnosisAsset] = useState(null);
    const [editingAsset, setEditingAsset] = useState(null);
    const [selectedReportAsset, setSelectedReportAsset] = useState(null);
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
    const pagination = usePagination(visibleAssets);

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

    const openDiagnosis = (asset) => {
        setDiagnosisAsset(asset);
        setModal('diagnosis');
    };

    const openResume = (asset) => {
        setSelectedReportAsset(asset);
        setModal('reportModal');
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
        <section className="min-w-0 space-y-5">
            <PageHeader
                title="Gestión de Activos"
                description="Ficha técnica, asignación y estado operativo."
                actions={
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Recargar activos"
                        aria-label="Recargar activos"
                        onClick={reloadAssets}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setModal('import')}
                        title="Importar equipos desde Excel"
                        className="flex-1 sm:flex-initial"
                    >
                        <FileSpreadsheet size={18} /> Importar
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={openCreateForm}
                        className="flex-1 sm:flex-initial"
                    >
                        <Plus size={18} /> Registrar activo
                    </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Activos registrados" value={assets.length} icon={<Wrench size={20} />} accent="forest" />
                <StatCard label="En operación" value={assets.filter((asset) => asset.isActive).length} icon={<CheckCircle2 size={20} />} accent="ocean" />
                <StatCard label="En reparación" value={assets.filter((asset) => asset.isActive && asset.operationalStatus === 'IN_REPAIR').length} icon={<Power size={20} />} accent="gold" />
            </div>

            {/* Mensajes de Feedback */}
            {feedback && (
                <div
                    className="flex items-start justify-between gap-3 rounded-xl border border-info/20 bg-info-soft p-3.5 text-sm text-ocean-700"
                    role="status"
                >
                    <span className="min-w-0 flex-1">{feedback}</span>
                    <button
                        type="button"
                        onClick={() => setFeedback('')}
                        title="Cerrar aviso"
                        aria-label="Cerrar aviso"
                        className="flex size-9 shrink-0 -mr-1 -mt-1 items-center justify-center rounded-lg text-ocean-700 transition-all duration-200 hover:bg-info/10 focus-visible:outline-2 focus-visible:outline-gold-600"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Búsqueda y Filtros */}
            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                    <Search
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600"
                    />
                    <Input
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            pagination.setPage(1);
                        }}
                        placeholder="Buscar por nombre, serial o categoría..."
                        aria-label="Buscar activos"
                        wrapperClassName="relative"
                        className="pl-10"
                    />
                </div>
                <label className="flex shrink-0 items-center justify-between gap-2.5 text-[13px] font-medium text-ink-600 sm:justify-start">
                    <span>Estado:</span>
                    <Select
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            pagination.setPage(1);
                        }}
                        className="w-auto"
                    >
                        <option value="ALL">Todos los estados</option>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </label>
            </div>

            {/* Error de Carga */}
            {loadError && (
                <div
                    className="flex items-center gap-2.5 rounded-xl border border-error/20 bg-error-soft p-4 text-sm text-error-text"
                    role="alert"
                >
                    <AlertCircle size={18} className="shrink-0" />
                    <span>No se pudieron cargar los activos: {loadError}</span>
                </div>
            )}

            {/* Contenido Principal: Tarjetas en móvil/tablet, Tabla en escritorio */}
            {loading ? (
                <Skeleton variant="rect" className="h-52 rounded-2xl" label="Cargando activos" />
            ) : (
                !loadError && (
                    <>
                        {/* Vista Móvil / Tablet (Tarjetas) */}
                        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3.5 lg:hidden">
                            {pagination.pageItems.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="min-w-0 space-y-3 rounded-2xl border border-sand-200 bg-surface p-3 shadow-sm sm:p-4"
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sand-200 bg-sand-50">
                                            {asset.imageUrl ? (
                                                <img
                                                    src={`${API_ORIGIN}${asset.imageUrl}`}
                                                    alt={`Imagen de ${asset.name}`}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <Wrench size={18} className="text-ink-600" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="break-words text-xs font-semibold text-ink-900 sm:text-base">
                                                {asset.name}
                                            </h3>
                                            <p className="mt-0.5 break-words text-[11px] leading-relaxed text-ink-600 sm:text-xs">
                                                {[asset.brand, asset.model, asset.serialNumber]
                                                    .filter(Boolean)
                                                    .join(' · ') || 'Sin ficha técnica'}
                                            </p>
                                            <p className="mt-1 text-[10px] tabular-nums text-forest-700">
                                                Horómetro: {asset.currentHorometer ?? 0} h
                                            </p>
                                            {asset.hasMotor && (
                                                <span className="mt-1.5 inline-block max-w-full break-words rounded-lg border border-ocean-300/40 bg-info-soft px-2 py-1 text-[10px] font-medium text-ocean-700 sm:text-xs">
                                                    ID predictivo: {asset.predictiveId}
                                                </span>
                                            )}
                                        </div>
                                        <Badge variant={asset.isActive ? 'success' : 'neutral'} size="sm" className="max-w-full">
                                            {asset.isActive ? <CheckCircle2 size={12} /> : <Power size={12} />}
                                            {asset.isActive
                                                ? STATUS_LABELS[asset.operationalStatus] || asset.operationalStatus
                                                : 'Desactivado'}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 border-y border-sand-200 py-2.5 text-xs text-ink-900 min-[400px]:grid-cols-2">
                                        <div>
                                            <span className="mb-1 block text-[11px] text-ink-600">Categoría</span>
                                            <span className="font-medium break-words block">
                                                {asset.categoryName || `ID ${asset.categoryId}`}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="mb-1 block text-[11px] text-ink-600">Responsable</span>
                                            <span className="font-medium break-words block">
                                                {asset.responsibleName || `ID ${asset.responsibleId}`}
                                            </span>
                                        </div>
                                        <div className="min-[400px]:col-span-2 pt-1">
                                            <span className="mb-1 block text-[11px] text-ink-600">Ubicación</span>
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
                                            className="flex size-11 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-info-soft hover:text-ocean-700 focus-visible:outline-2 focus-visible:outline-gold-600"
                                        >
                                            <FileText size={18} />
                                        </button>
                                        {asset.hasMotor && (
                                            <button
                                                type="button"
                                                title="Hoja de vida predictivo"
                                                aria-label={`Hoja de vida predictivo de ${asset.name}`}
                                                onClick={() => openPredictiveHistory(asset)}
                                                className="flex size-11 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-success-soft hover:text-forest-700 focus-visible:outline-2 focus-visible:outline-gold-600"
                                            >
                                                <Activity size={18} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            title="Tendencia de fallas"
                                            aria-label={`Análisis de tendencia de fallas de ${asset.name}`}
                                            onClick={() => openFailureTrends(asset)}
                                            className="flex size-11 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-gold-100 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-gold-600"
                                        >
                                            <TrendingUp size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Diagnóstico"
                                            aria-label={`Fichas de diagnóstico de ${asset.name}`}
                                            onClick={() => openDiagnosis(asset)}
                                            className="flex size-11 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-gold-100 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-gold-600"
                                        >
                                            <Stethoscope size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Editar"
                                            aria-label={`Editar ${asset.name}`}
                                            onClick={() => openEditForm(asset)}
                                            className="flex size-11 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-info-soft hover:text-ocean-700 focus-visible:outline-2 focus-visible:outline-gold-600"
                                        >
                                            <ClipboardList size={18} />
                                        </button>
                                        {asset.isActive && (
                                            <button
                                                type="button"
                                                title="Desactivar"
                                                aria-label={`Desactivar ${asset.name}`}
                                                onClick={() => handleDeactivate(asset)}
                                                className="flex size-11 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-gold-100 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-gold-600"
                                            >
                                                <Power size={18} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            title="Eliminar lógicamente"
                                            aria-label={`Eliminar ${asset.name}`}
                                            onClick={() => handleDelete(asset)}
                                            className="flex size-11 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-error-soft hover:text-error-text focus-visible:outline-2 focus-visible:outline-gold-600"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Vista Escritorio (Tabla) */}
                        <div className="hidden overflow-x-auto rounded-2xl border border-sand-200 bg-surface lg:block">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="sticky top-0 border-b border-sand-200 bg-sand-100 text-ink-600">
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
                                    {pagination.pageItems.map((asset) => (
                                        <tr key={asset.id} className="transition-colors hover:bg-sand-100/70">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sand-200 bg-sand-50">
                                                        {asset.imageUrl ? (
                                                            <img
                                                                src={`${API_ORIGIN}${asset.imageUrl}`}
                                                                alt={`Imagen de ${asset.name}`}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <Wrench size={16} className="text-ink-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-ink-900">{asset.name}</p>
                                                        <p className="mt-0.5 text-xs text-ink-600">
                                                            {[asset.brand, asset.model, asset.serialNumber]
                                                                .filter(Boolean)
                                                                .join(' · ') || 'Sin ficha técnica'}
                                                        </p>
                                                        <p className="mt-1 text-[11px] tabular-nums text-forest-700">
                                                            Horómetro: {asset.currentHorometer ?? 0} h
                                                        </p>
                                                        {asset.hasMotor && (
                                                            <p className="mt-0.5 text-xs font-medium text-ocean-700">
                                                                ID predictivo: {asset.predictiveId}
                                                            </p>
                                                        )}
                                                        <button
                                                            type="button"
                                                            title="Tendencia de fallas"
                                                            aria-label={`Análisis de tendencia de fallas de ${asset.name}`}
                                                            onClick={() => openFailureTrends(asset)}
                                                            className="flex size-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-gold-100 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-gold-600"
                                                        >
                                                            <TrendingUp size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-ink-600">
                                                {asset.categoryName || `ID ${asset.categoryId}`}
                                            </td>
                                            <td className="px-4 py-3.5 text-ink-600">
                                                {asset.responsibleName || `ID ${asset.responsibleId}`}
                                            </td>
                                            <td className="px-4 py-3.5 text-ink-600">
                                                {asset.location || 'Sin ubicación'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <Badge variant={asset.isActive ? 'success' : 'neutral'}>
                                                    {asset.isActive ? <CheckCircle2 size={12} /> : <Power size={12} />}
                                                    {asset.isActive
                                                        ? STATUS_LABELS[asset.operationalStatus] ||
                                                          asset.operationalStatus
                                                        : 'Desactivado'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="inline-flex items-center gap-1 text-ink-600">
                                                    <button
                                                        type="button"
                                                        title="Hoja de vida"
                                                        aria-label={`Hoja de vida de ${asset.name}`}
                                                        onClick={() => openResume(asset)}
                                                        className="flex size-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-info-soft hover:text-ocean-700 focus-visible:outline-2 focus-visible:outline-gold-600"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                    {asset.hasMotor && (
                                                        <button
                                                            type="button"
                                                            title="Hoja de vida predictivo"
                                                            aria-label={`Hoja de vida predictivo de ${asset.name}`}
                                                            onClick={() => openPredictiveHistory(asset)}
                                                            className="flex size-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-success-soft hover:text-forest-700 focus-visible:outline-2 focus-visible:outline-gold-600"
                                                        >
                                                            <Activity size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Diagnóstico"
                                                        aria-label={`Fichas de diagnóstico de ${asset.name}`}
                                                        onClick={() => openDiagnosis(asset)}
                                                        className="flex size-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-gold-100 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-gold-600"
                                                    >
                                                        <Stethoscope size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        aria-label={`Editar ${asset.name}`}
                                                        onClick={() => openEditForm(asset)}
                                                        className="flex size-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-info-soft hover:text-ocean-700 focus-visible:outline-2 focus-visible:outline-gold-600"
                                                    >
                                                        <ClipboardList size={16} />
                                                    </button>
                                                    {asset.isActive && (
                                                        <button
                                                            type="button"
                                                            title="Desactivar"
                                                            aria-label={`Desactivar ${asset.name}`}
                                                            onClick={() => handleDeactivate(asset)}
                                                            className="flex size-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-gold-100 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-gold-600"
                                                        >
                                                            <Power size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Eliminar lógicamente"
                                                        aria-label={`Eliminar ${asset.name}`}
                                                        onClick={() => handleDelete(asset)}
                                                        className="flex size-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-error-soft hover:text-error-text focus-visible:outline-2 focus-visible:outline-gold-600"
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
                            <EmptyState title="No hay activos que coincidan con los filtros." className="py-2" />
                        )}
                        <PaginationControls
                            {...pagination}
                            totalItems={visibleAssets.length}
                            onPageChange={pagination.setPage}
                            onPageSizeChange={pagination.changePageSize}
                        />
                    </>
                )
            )}

            {/* Modal Formulario Activo */}
            {modal === 'form' && (
                <CreateAssetForm asset={editingAsset} onCancel={() => setModal('')} onSaved={handleAssetSaved} />
            )}

            <AssetImportModal
                isOpen={modal === 'import'}
                onClose={() => setModal('')}
                onImported={reloadAssets}
            />

            <AssetDiagnosisModal
                asset={assets.find((item) => item.id === diagnosisAsset?.id) || diagnosisAsset}
                isOpen={modal === 'diagnosis'}
                onClose={() => {
                    setModal('');
                    setDiagnosisAsset(null);
                }}
                onAssetChanged={reloadAssets}
            />

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
                    className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-pine-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 md:p-6"
                    role="presentation"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="predictive-resume-title"
                        className="relative my-auto max-h-[92dvh] w-full min-w-0 max-w-4xl overflow-y-auto rounded-t-3xl border border-surface/40 bg-surface/90 p-4 shadow-2xl backdrop-blur-xl sm:rounded-3xl sm:p-6"
                    >
                        <div className="mb-4 flex items-start justify-between gap-3 border-b border-sand-200 pb-3.5 sm:mb-5">
                            <div className="min-w-0">
                                <h3 id="predictive-resume-title" className="truncate text-base font-semibold text-ink-900 sm:text-lg">
                                    Hoja de vida predictivo
                                </h3>
                                <p className="mt-0.5 text-xs text-ink-600">
                                    {predictiveAsset?.name} · {predictiveAsset?.predictiveId} · lecturas y resultados históricos.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModal('')}
                                title="Cerrar"
                                aria-label="Cerrar hoja de vida predictiva"
                                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-sand-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-gold-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {predictiveLoading ? (
                            <Skeleton variant="rect" className="h-52" label="Cargando historial predictivo" />
                        ) : predictiveHistory.length ? (
                            <div className="space-y-4">
                                <div className="overflow-x-auto rounded-2xl border border-sand-200">
                                    <table className="w-full text-left text-xs min-w-[750px]">
                                        <thead className="border-b border-sand-200 bg-sand-100 text-ink-600">
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
                                                <tr key={record.id} className="odd:bg-sand-50/70 hover:bg-sand-100/70">
                                                    <td className="whitespace-nowrap px-3.5 py-3 text-ink-600">
                                                        {formatDateTime(record.timestamp)}
                                                    </td>
                                                    <td
                                                        className={`px-3.5 py-3 font-semibold ${
                                                            record.predictionClass === 1
                                                                ? 'text-error-text'
                                                                : 'text-forest-700'
                                                        }`}
                                                    >
                                                        {record.motorState}
                                                    </td>
                                                    <td className="px-3.5 py-3 text-ink-600">
                                                        {Math.round(record.confidence * 100)}%
                                                    </td>
                                                    <td className="px-3.5 py-3 text-ink-600">
                                                        {record.temperature} °C
                                                    </td>
                                                    <td className="px-3.5 py-3 text-ink-600">
                                                        {record.vibration} Hz
                                                    </td>
                                                    <td className="px-3.5 py-3 text-ink-600">
                                                        {record.humidity} %
                                                    </td>
                                                    <td className="px-3.5 py-3 text-ink-600">
                                                        {record.pressure} bar
                                                    </td>
                                                    <td className="px-3.5 py-3 text-ink-600">
                                                        {record.energyConsumption} kW
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {predictiveHistory.some((record) => record.affectedComponents) && (
                                    <div className="space-y-2 rounded-xl border border-sand-200 bg-sand-50 p-3.5 text-xs text-ink-600">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-900">
                                            Diagnósticos
                                        </p>
                                        <div className="space-y-1.5 divide-y divide-white/5">
                                            {predictiveHistory.map(
                                                (record) =>
                                                    record.affectedComponents && (
                                                        <p key={record.id} className="pt-1.5 first:pt-0">
                                                            <span className="text-ink-600">
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
                            <p className="rounded-xl border border-sand-200 bg-sand-50 p-4 text-sm text-ink-600">
                                Este activo aún no tiene lecturas predictivas registradas.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {modal === 'failureTrends' && (
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-pine-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="failure-trends-title"
                        className="w-full max-w-xl rounded-t-3xl border border-surface/40 bg-surface/90 p-5 text-ink-900 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 id="failure-trends-title" className="text-lg font-bold">Tendencia histórica de fallas</h2>
                                <p className="mt-1 text-xs text-ink-600">{failureTrendAsset?.name}</p>
                            </div>
                            <button type="button" onClick={() => setModal('')} aria-label="Cerrar análisis" className="flex size-11 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 hover:bg-sand-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-gold-600">
                                <X size={18} />
                            </button>
                        </div>
                        {failureTrendsLoading ? (
                            <Skeleton variant="rect" className="mt-5 h-40" label="Analizando historial" />
                        ) : failureTrends && (
                            <div className="mt-5 space-y-4">
                                <dl className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="rounded-xl border border-sand-200 bg-sand-50 p-3">
                                        <dt className="text-ink-600">Fallas registradas</dt>
                                        <dd className="mt-1 text-xl font-bold tabular-nums">{failureTrends.failureCount}</dd>
                                    </div>
                                    <div className="rounded-xl border border-sand-200 bg-sand-50 p-3">
                                        <dt className="text-ink-600">Horómetro acumulado</dt>
                                        <dd className="mt-1 text-xl font-bold tabular-nums">{failureTrends.currentHorometer ?? 0} h</dd>
                                    </div>
                                    <div className="rounded-xl border border-sand-200 bg-sand-50 p-3">
                                        <dt className="text-ink-600">Frecuencia base</dt>
                                        <dd className="mt-1 font-semibold">{failureTrends.baseIntervalDays} días</dd>
                                    </div>
                                    <div className="rounded-xl border border-info/20 bg-info-soft p-3">
                                        <dt className="text-ocean-700">Intervalo sugerido</dt>
                                        <dd className="mt-1 text-xl font-bold tabular-nums text-ocean-900">{failureTrends.suggestedIntervalDays} días</dd>
                                    </div>
                                </dl>
                                <p className="rounded-xl border border-sand-200 bg-sand-50 p-3 text-xs leading-relaxed text-ink-600">
                                    {failureTrends.summary}
                                </p>
                                {failureTrends.averageDaysBetweenFailures != null && (
                                    <p className="text-xs text-ink-600">
                                        Promedio entre fallas: {failureTrends.averageDaysBetweenFailures.toFixed(1)} días.
                                    </p>
                                )}
                                {failureTrends.recurringFailures?.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-forest-900">Fallas recurrentes</h3>
                                        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-ink-600">
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
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-pine-900/70 p-4 backdrop-blur-md"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Evidencia del mantenimiento"
                    onClick={() => setMaintenanceEvidencePreview('')}
                >
                    <button
                        type="button"
                        onClick={() => setMaintenanceEvidencePreview('')}
                        aria-label="Cerrar evidencia"
                        className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-white/20 text-white transition-all duration-200 hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-gold-300"
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