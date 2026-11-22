import { useEffect, useState } from 'react';
import { CalendarClock, Image, MapPin, UserRound, Wrench, X } from 'lucide-react';
import { getFailureEvidence, getFailureIntervention } from '../services/assetService';

const PRIORITY_LABELS = {
    BAJA: 'Baja',
    MEDIA: 'Media',
    ALTA: 'Alta',
    CRITICA: 'Crítica',
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

function formatDate(value) {
    if (!value) return 'Sin registro';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Sin registro'
        : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function Detail({ label, value }) {
    return (
        <div className="min-w-0 rounded-lg border border-sand-200 bg-sand-100 p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-600">{label}</dt>
            <dd className="mt-1 break-words whitespace-pre-wrap text-xs text-ink-900">{value || 'Sin registro'}</dd>
        </div>
    );
}

function Section({ title, icon: Icon, children }) {
    return (
        <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest-700">
                <Icon size={15} />
                {title}
            </h3>
            {children}
        </section>
    );
}

export default function FailureReportDetailsModal({ report, onClose }) {
    const [intervention, setIntervention] = useState(null);
    const [interventionError, setInterventionError] = useState('');
    const [loadingIntervention, setLoadingIntervention] = useState(true);
    const [evidenceResult, setEvidenceResult] = useState({ key: '', images: [] });

    useEffect(() => {
        let current = true;
        getFailureIntervention(report.id)
            .then((data) => {
                if (current) setIntervention(data);
            })
            .catch((error) => {
                if (!current) return;
                if (error.response?.status !== 404) {
                    setInterventionError(
                        error.response?.data?.message ||
                        error.response?.data?.detail ||
                        error.message ||
                        'No se pudo cargar la intervención técnica.',
                    );
                }
            })
            .finally(() => {
                if (current) setLoadingIntervention(false);
            });

        return () => {
            current = false;
        };
    }, [report.id]);

    const evidencePaths = [...new Set([
        report.evidenciaUrl,
        ...(Array.isArray(intervention?.evidences) ? intervention.evidences : []),
    ].filter(Boolean))];
    const evidenceKey = JSON.stringify(evidencePaths);
    const evidenceImages = evidenceResult.key === evidenceKey ? evidenceResult.images : [];

    useEffect(() => {
        let current = true;
        const createdUrls = [];

        Promise.all(JSON.parse(evidenceKey).map(async (path) => {
            try {
                const blob = await getFailureEvidence(path);
                const url = URL.createObjectURL(blob);
                if (!current) {
                    URL.revokeObjectURL(url);
                    return { path, url: '' };
                }
                createdUrls.push(url);
                return { path, url };
            } catch {
                return { path, url: '' };
            }
        })).then((images) => {
            if (current) setEvidenceResult({ key: evidenceKey, images: images.filter((image) => image.url) });
        });

        return () => {
            current = false;
            createdUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [evidenceKey]);

    const timeline = [
        ['Reporte creado', report.fechaReporte],
        ['Asignación', report.fechaAsignacion],
        ['Inicio de revisión', report.fechaInicioRevision],
        ['Intervención reportada', intervention?.interventionReportedAt],
        ['Inspección iniciada', intervention?.inspectionStartedAt],
        ['Envío a cierre', report.fechaEnvioCierre],
        ['Intervención firmada', intervention?.signedAt],
        ['Cierre', report.fechaCierre],
        ['Revisión de cierre', intervention?.reviewedAt],
    ].filter(([, value]) => value);

    return (
        <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-pine-900/35 px-0 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:items-center sm:p-6"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="failure-life-title"
                className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-t-3xl border border-surface/40 bg-surface/70 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink-900 shadow-2xl shadow-pine-900/10 backdrop-blur-xl sm:rounded-2xl sm:p-6"
            >
                <header className="mb-5 flex items-start justify-between gap-3 border-b border-sand-200 pb-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="rounded-xl bg-success-soft p-2.5 text-forest-700">
                            <Wrench size={20} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-forest-700">
                                Hoja de vida · Reporte #{report.id}
                            </p>
                            <h2 id="failure-life-title" className="mt-1 truncate text-lg font-bold sm:text-xl">
                                {report.assetName || 'Activo sin nombre'}
                            </h2>
                            <p className="mt-1 text-xs text-ink-900/75">
                                {report.tipoFalla || 'Falla no especificada'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar hoja de vida"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sand-200 text-ink-600 transition-all duration-200 ease-out hover:bg-sand-100 hover:text-ink-900"
                    >
                        <X size={19} />
                    </button>
                </header>

                <div className="mb-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-forest-300/50 bg-success-soft px-3 py-1 text-xs font-semibold text-forest-700">
                        {STATUS_LABELS[report.estado] || report.estado || 'Sin estado'}
                    </span>
                    <span className="rounded-full border border-sand-200 bg-sand-100 px-3 py-1 text-xs font-semibold text-ink-900">
                        Prioridad {PRIORITY_LABELS[report.prioridad] || report.prioridad || 'Sin prioridad'}
                    </span>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="space-y-5">
                        <Section title="Activo / maquinaria" icon={MapPin}>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Detail label="Nombre" value={report.assetName} />
                                <Detail label="Código" value={report.assetInventoryCode} />
                                <Detail label="Marca y modelo" value={[report.assetBrand, report.assetModel].filter(Boolean).join(' ')} />
                                <Detail label="Serial" value={report.assetSerialNumber} />
                                <div className="col-span-2">
                                    <Detail label="Ubicación / zona" value={report.assetLocation || report.groupName} />
                                </div>
                            </dl>
                        </Section>

                        <Section title="Datos del reporte" icon={CalendarClock}>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Detail label="ID" value={`#${report.id}`} />
                                <Detail label="Tipo de falla" value={report.tipoFalla} />
                                <Detail label="Creado" value={formatDate(report.fechaReporte)} />
                                <Detail label="Grupo asignado" value={report.groupName} />
                                <div className="col-span-2">
                                    <Detail label="Descripción detallada" value={report.descripcion} />
                                </div>
                            </dl>
                        </Section>

                        <Section title="Personas involucradas" icon={UserRound}>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Detail label="Reportado por" value={report.userName || (report.userId ? `ID ${report.userId}` : '')} />
                                <Detail label="Técnico asignado" value={report.assignedTechnicianName || 'Pendiente de asignación'} />
                                <Detail label="Técnico que intervino" value={intervention?.technicianName} />
                                <Detail label="Recibido por" value={intervention?.receivedBy} />
                                <Detail label="Revisado por" value={intervention?.reviewedBy} />
                            </dl>
                        </Section>
                    </div>

                    <div className="space-y-5">
                        <Section title="Tiempos e hitos" icon={CalendarClock}>
                            {timeline.length ? (
                                <ol className="space-y-2 border-l border-forest-300/50 pl-4">
                                    {timeline.map(([label, date]) => (
                                        <li key={label} className="relative text-xs">
                                            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-success-soft" />
                                            <span className="font-semibold text-ink-900">{label}</span>
                                            <span className="mt-0.5 block text-ink-600">{formatDate(date)}</span>
                                        </li>
                                    ))}
                                    {report.repairDurationMinutes != null && (
                                        <li className="text-xs text-ink-600">
                                            Duración de reparación: {report.repairDurationMinutes} minutos
                                        </li>
                                    )}
                                </ol>
                            ) : (
                                <p className="text-xs text-ink-600">Aún no hay hitos de tiempo registrados.</p>
                            )}
                        </Section>

                        <Section title="Diagnóstico y cierre técnico" icon={Wrench}>
                            {loadingIntervention ? (
                                <p className="text-xs text-ink-600">Cargando intervención...</p>
                            ) : interventionError ? (
                                <p role="alert" className="rounded-lg border border-error/20 bg-error-soft p-3 text-xs text-error-text">
                                    {interventionError}
                                </p>
                            ) : intervention ? (
                                <dl className="grid gap-2 sm:grid-cols-2">
                                    <Detail label="Falla confirmada" value={intervention.actualFailure} />
                                    <Detail label="Causa raíz" value={intervention.rootCause} />
                                    <div className="sm:col-span-2">
                                        <Detail label="Trabajo realizado" value={intervention.tasksDescription} />
                                    </div>
                                    <Detail label="Pruebas realizadas" value={intervention.testsPerformed} />
                                    <Detail label="Estado final" value={intervention.finalEquipmentState} />
                                    <Detail label="Recomendaciones" value={intervention.recommendations} />
                                    <Detail label="Tareas pendientes" value={intervention.pendingTasks} />
                                    <Detail label="Notas de revisión / cierre" value={intervention.reviewObservations} />
                                </dl>
                            ) : (
                                <p className="text-xs text-ink-600">No hay una intervención técnica registrada todavía.</p>
                            )}
                        </Section>

                        {intervention?.parts?.length > 0 && (
                            <Section title="Repuestos asociados" icon={Wrench}>
                                <ul className="space-y-2">
                                    {intervention.parts.map((part, index) => (
                                        <li key={`${part.partNumber}-${index}`} className="rounded-lg border border-sand-200 bg-sand-100 p-3 text-xs">
                                            <span className="font-semibold text-ink-900">{part.name || 'Repuesto'}</span>
                                            <span className="ml-2 text-ink-600">{part.partNumber}</span>
                                            <span className="mt-1 block text-ink-600">
                                                Cantidad: {part.quantity ?? 1}{part.brand ? ` · ${part.brand}` : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {(evidencePaths.length > 0) && (
                            <Section title="Evidencias fotográficas" icon={Image}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {evidencePaths.map((path) => {
                                        const image = evidenceImages.find((item) => item.path === path);
                                        return image ? (
                                            <a key={path} href={image.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-sand-200">
                                                <img src={image.url} alt="Evidencia del reporte" className="h-36 w-full object-cover" />
                                            </a>
                                        ) : (
                                            <p key={path} className="break-all rounded-lg border border-sand-200 bg-sand-100 p-3 text-[10px] text-ink-600">
                                                Evidencia adjunta disponible al conectar: {path}
                                            </p>
                                        );
                                    })}
                                </div>
                            </Section>
                        )}
                    </div>
                </div>

                <footer className="mt-6 flex justify-end border-t border-sand-200 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-11 rounded-xl bg-info-soft px-5 text-xs font-bold text-ink-900 transition-all duration-200 ease-out hover:bg-ocean-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                    >
                        Cerrar hoja de vida
                    </button>
                </footer>
            </section>
        </div>
    );
}
