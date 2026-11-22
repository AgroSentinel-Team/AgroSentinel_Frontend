import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw, UserCheck, Calendar, MapPin, User } from 'lucide-react';
import FailureReportModal from '../../components/FailureReportModal';
import FailureClosureModal from '../../components/FailureClosureModal';
import { getFailureReports } from '../../services/assetService';
import PaginationControls from '../../components/PaginationControls';
import FailureReportDetailsModal from '../../components/FailureReportDetailsModal';
import usePagination from '../../hooks/usePagination';
import { Badge, Button, EmptyState, PageHeader, ResponsiveTable, Skeleton, StatCard } from '../../components/ui';

const PRIORITY_LABELS = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', CRITICA: 'Crítica' };
const PRIORITY_VARIANTS = {
    BAJA: 'success',
    MEDIA: 'warning',
    ALTA: 'error',
    CRITICA: 'error',
};
const STATUS_LABELS = {
    PENDIENTE: 'Pendiente',
    ASIGNADA: 'Asignada',
    EN_EJECUCION: 'En ejecución',
    EN_CIERRE: 'Pendiente de cierre',
    EN_REVISION: 'En revisión',
    ESPERA_REPUESTO: 'Espera repuesto',
    RESUELTO: 'Cerrada',
};

function describeError(error) {
    if (error.response?.status === 401) return 'El servidor no aceptó la sesión para cargar los reportes. La sesión sigue activa.';
    return error.response?.data?.detail || error.message || 'No se pudieron cargar los reportes.';
}

function formatDate(value) {
    return value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin fecha';
}

export default function ReporteFallas() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [reportToReview, setReportToReview] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const pagination = usePagination(reports);
    const openReportCount = reports.filter((report) => report.estado !== 'RESUELTO').length;
    const criticalReportCount = reports.filter((report) => report.prioridad === 'CRITICA').length;

    useEffect(() => {
        let cancelled = false;
        getFailureReports()
            .then((data) => { if (!cancelled) { setReports(data); setError(''); } })
            .catch((requestError) => { if (!cancelled) setError(describeError(requestError)); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [refreshKey]);

    const refreshReports = () => {
        setLoading(true);
        setRefreshKey((key) => key + 1);
    };

    return (
        <section className="min-w-0 space-y-5">
            <PageHeader
                title="Reporte de Fallas"
                description="Reportes registrados en el sistema."
                actions={
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={refreshReports}
                        title="Actualizar reportes"
                        aria-label="Actualizar reportes"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => setShowModal(true)}
                        className="flex-1 sm:flex-initial"
                    >
                        <Plus size={18} /> Reportar falla
                    </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Reportes registrados" value={reports.length} icon={<AlertTriangle size={20} />} accent="forest" />
                <StatCard label="Reportes abiertos" value={openReportCount} icon={<AlertTriangle size={20} />} accent="ocean" />
                <StatCard label="Prioridad crítica" value={criticalReportCount} icon={<AlertTriangle size={20} />} accent="gold" />
            </div>

            {/* Avisos Feedback y Error */}
            {feedback && (
                <p role="status" className="rounded-xl border border-success/20 bg-success-soft p-3.5 text-sm text-forest-700">
                    {feedback}
                </p>
            )}
            {error && (
                <p role="alert" className="rounded-xl border border-error/20 bg-error-soft p-3.5 text-sm text-error-text">
                    {error}
                </p>
            )}

            {/* Estado Carga / Vacío / Lista de Reportes */}
            {loading ? (
                <Skeleton variant="rect" className="h-52 rounded-2xl" label="Cargando reportes" />
            ) : !error && reports.length === 0 ? (
                <EmptyState icon={<AlertTriangle size={24} />} title="Aún no hay reportes de fallas." />
            ) : !error && (
                <>
                    <ResponsiveTable
                        caption="Reportes de fallas"
                        data={pagination.pageItems}
                        getRowKey={(report) => report.id}
                        emptyState={<EmptyState title="No hay reportes en esta página." />}
                        columns={[
                            {
                                key: 'asset',
                                header: 'Activo / Falla',
                                render: (report) => (
                                    <div className="min-w-0 text-left">
                                        <p className="font-semibold text-ink-900">{report.assetName}</p>
                                        <p className="mt-0.5 font-medium text-forest-700">{report.tipoFalla}</p>
                                        {report.descripcion && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink-600">{report.descripcion}</p>}
                                        {report.evidenciaUrl && <p className="mt-1.5 text-xs font-medium text-ocean-700">📎 Evidencia adjunta</p>}
                                    </div>
                                ),
                            },
                            {
                                key: 'reporter',
                                header: 'Reportado por',
                                render: (report) => <span className="inline-flex items-center gap-1.5"><User size={14} className="shrink-0 text-ink-600" />{report.userName || `ID ${report.userId}`}</span>,
                            },
                            {
                                key: 'group',
                                header: 'Grupo / Zona',
                                render: (report) => <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="shrink-0 text-ink-600" />{report.groupName || 'Sin grupo'}</span>,
                            },
                            {
                                key: 'technician',
                                header: 'Técnico asignado',
                                render: (report) => (
                                    <span className={`inline-flex items-center gap-1.5 ${report.assignedTechnicianName ? 'font-medium text-forest-700' : 'text-forest-900'}`}>
                                        <UserCheck size={14} className="shrink-0" />
                                        {report.assignedTechnicianName || 'Sin técnico asignado'}
                                    </span>
                                ),
                            },
                            {
                                key: 'date',
                                header: 'Fecha',
                                render: (report) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Calendar size={14} className="shrink-0 text-ink-600" />{formatDate(report.fechaReporte)}</span>,
                            },
                            {
                                key: 'priority',
                                header: 'Prioridad',
                                render: (report) => (
                                    <Badge variant={PRIORITY_VARIANTS[report.prioridad] || 'neutral'}>
                                        <AlertTriangle size={13} />
                                        {PRIORITY_LABELS[report.prioridad] || report.prioridad}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'status',
                                header: 'Estado / acción',
                                render: (report) => (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={report.estado === 'RESUELTO' ? 'success' : 'neutral'}>
                                            {STATUS_LABELS[report.estado] || report.estado}
                                        </Badge>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedReport(report)}>
                                            Ver Detalle / Hoja de Vida
                                        </Button>
                                        {report.estado === 'EN_CIERRE' && (
                                            <Button type="button" variant="secondary" size="sm" onClick={() => setReportToReview(report)}>
                                                <span className="md:hidden">Revisar cierre</span>
                                                <span className="hidden md:inline">Revisar y cerrar</span>
                                            </Button>
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                    />
                    <PaginationControls
                        {...pagination}
                        totalItems={reports.length}
                        onPageChange={pagination.setPage}
                        onPageSizeChange={pagination.changePageSize}
                    />
                </>
            )}

            {showModal && (
                <FailureReportModal
                    onClose={() => setShowModal(false)}
                    onSaved={() => { setFeedback('Reporte de falla registrado.'); refreshReports(); }}
                />
            )}
            {reportToReview && (
                <FailureClosureModal
                    report={reportToReview}
                    onClose={() => setReportToReview(null)}
                    onClosed={() => {
                        setReportToReview(null);
                        setFeedback('La orden fue revisada y cerrada definitivamente.');
                        refreshReports();
                    }}
                />
            )}
            {selectedReport && (
                <FailureReportDetailsModal
                    report={selectedReport}
                    onClose={() => setSelectedReport(null)}
                />
            )}
        </section>
    );
}