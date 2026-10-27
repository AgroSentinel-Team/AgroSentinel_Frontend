import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw, UserCheck, Calendar, MapPin, User } from 'lucide-react';
import FailureReportModal from '../../components/FailureReportModal';
import { getFailureReports } from '../../services/assetService';

const PRIORITY_LABELS = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', CRITICA: 'Crítica' };
const PRIORITY_TONES = {
    BAJA: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    MEDIA: 'border-orange-400/20 bg-orange-400/10 text-orange-200',
    ALTA: 'border-red-400/20 bg-red-400/10 text-red-200',
    CRITICA: 'border-red-400/20 bg-red-400/10 text-red-200',
};
const STATUS_LABELS = { PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', RESUELTO: 'Resuelto' };

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
        <section className="rounded-xl border border-white/10 bg-[#13293a] p-4 sm:p-6 shadow-xl min-w-0">
            {/* Header Vista */}
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-white">Reporte de Fallas</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Reportes registrados en el sistema.</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={refreshReports}
                        title="Actualizar reportes"
                        aria-label="Actualizar reportes"
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-[#102536] text-slate-300 transition-colors hover:border-cyan-400 hover:text-cyan-300 active:bg-white/5 shrink-0"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="flex-1 sm:flex-initial flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-500 active:bg-cyan-700 shadow-lg shadow-cyan-950/40"
                    >
                        <Plus size={18} />
                        <span>Reportar falla</span>
                    </button>
                </div>
            </div>

            {/* Avisos Feedback y Error */}
            {feedback && (
                <p role="status" className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3.5 text-xs text-emerald-200">
                    {feedback}
                </p>
            )}
            {error && (
                <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3.5 text-xs text-red-200">
                    {error}
                </p>
            )}

            {/* Estado Carga / Vacío / Lista de Reportes */}
            {loading ? (
                <p className="py-12 text-center text-xs text-slate-400">Cargando reportes...</p>
            ) : !error && reports.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-[#0c1e2c] p-8 text-center text-xs text-slate-400">
                    <AlertTriangle size={28} className="mx-auto mb-2 text-slate-500" />
                    <span>Aún no hay reportes de fallas.</span>
                </div>
            ) : !error && (
                <>
                    {/* Vista Tarjetas para Pantallas Pequeñas (Móviles) */}
                    <div className="grid grid-cols-2 gap-2 md:hidden">
                        {reports.map((report) => (
                            <article key={report.id} className="rounded-xl border border-[#294255] bg-[#0c1e2c] p-4 space-y-3 shadow-md">
                                <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white truncate">{report.assetName}</p>
                                        <p className="text-xs font-medium text-cyan-300 mt-0.5">{report.tipoFalla}</p>
                                    </div>
                                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${PRIORITY_TONES[report.prioridad] || 'border-slate-400/20 bg-slate-400/10 text-slate-300'}`}>
                                        <AlertTriangle size={11} />
                                        {PRIORITY_LABELS[report.prioridad] || report.prioridad}
                                    </span>
                                </div>

                                {report.descripcion && (
                                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {report.descripcion}
                                    </p>
                                )}

                                {report.evidenciaUrl && (
                                    <p className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                                        📎 Evidencia adjunta
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-300">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <User size={13} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{report.userName || `ID ${report.userId}`}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <MapPin size={13} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{report.groupName || 'Sin grupo'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-0 col-span-2">
                                        <UserCheck size={13} className="text-slate-400 shrink-0" />
                                        <span className={report.assignedTechnicianName ? 'font-medium text-cyan-200 truncate' : 'text-amber-300 truncate'}>
                                            {report.assignedTechnicianName || 'Sin técnico asignado'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-0 col-span-2 text-slate-400">
                                        <Calendar size={13} className="shrink-0" />
                                        <span className="truncate">{formatDate(report.fechaReporte)}</span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-white/5 flex justify-end">
                                    <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 border border-white/10">
                                        {STATUS_LABELS[report.estado] || report.estado}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* Vista Tabla para Pantallas Medianas / Escritorio */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-white/10">
                        <table className="w-full min-w-[900px] text-left text-xs">
                            <thead className="border-b border-white/10 bg-[#0b1d2a] text-slate-400">
                                <tr>
                                    <th className="px-4 py-3.5 font-semibold">Activo / Falla</th>
                                    <th className="px-4 py-3.5 font-semibold">Reportado por</th>
                                    <th className="px-4 py-3.5 font-semibold">Grupo / Zona</th>
                                    <th className="px-4 py-3.5 font-semibold">Técnico asignado</th>
                                    <th className="px-4 py-3.5 font-semibold">Fecha</th>
                                    <th className="px-4 py-3.5 font-semibold">Prioridad</th>
                                    <th className="px-4 py-3.5 font-semibold">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {reports.map((report) => (
                                    <tr key={report.id} className="align-top hover:bg-white/[0.03] transition-colors">
                                        <td className="max-w-md px-4 py-3.5">
                                            <p className="font-semibold text-white">{report.assetName}</p>
                                            <p className="mt-0.5 font-medium text-cyan-300">{report.tipoFalla}</p>
                                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400 leading-relaxed">{report.descripcion}</p>
                                            {report.evidenciaUrl && <p className="mt-1.5 text-xs text-cyan-400 font-medium">📎 Evidencia adjunta</p>}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-300 font-medium">{report.userName || `ID ${report.userId}`}</td>
                                        <td className="px-4 py-3.5 text-slate-300">{report.groupName || 'Sin grupo'}</td>
                                        <td className="px-4 py-3.5">
                                            <span className={report.assignedTechnicianName ? 'font-medium text-cyan-200' : 'text-amber-300'}>
                                                {report.assignedTechnicianName || 'Sin técnico asignado'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-300">{formatDate(report.fechaReporte)}</td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_TONES[report.prioridad] || 'border-slate-400/20 bg-slate-400/10 text-slate-300'}`}>
                                                <AlertTriangle size={13} />
                                                {PRIORITY_LABELS[report.prioridad] || report.prioridad}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-300 font-medium">{STATUS_LABELS[report.estado] || report.estado}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {showModal && (
                <FailureReportModal
                    onClose={() => setShowModal(false)}
                    onSaved={() => { setFeedback('Reporte de falla registrado.'); refreshReports(); }}
                />
            )}
        </section>
    );
}