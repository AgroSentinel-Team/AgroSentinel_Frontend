import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw } from 'lucide-react';
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
		<section className="rounded-lg border border-white/10 bg-[#13293a] p-5">
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-[14px] font-semibold text-white">Reporte de Fallas</h2>
					<p className="mt-1 text-[11px] text-slate-400">Reportes registrados en el sistema.</p>
				</div>
				<div className="flex items-center gap-2">
					<button type="button" onClick={refreshReports} title="Actualizar reportes" aria-label="Actualizar reportes" className="rounded-md border border-white/10 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-300"><RefreshCw size={15} /></button>
					<button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-[11px] font-medium text-white hover:bg-cyan-500"><Plus size={14} /> Reportar falla</button>
				</div>
			</div>

			{feedback && <p role="status" className="mb-4 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-200">{feedback}</p>}
			{error && <p role="alert" className="mb-4 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-200">{error}</p>}

			{loading ? <p className="py-10 text-center text-[11px] text-slate-400">Cargando reportes...</p> : !error && reports.length === 0 ? (
				<div className="rounded-md border border-white/10 p-8 text-center text-[11px] text-slate-400"><AlertTriangle size={20} className="mx-auto mb-2 text-slate-500" />Aún no hay reportes de fallas.</div>
			) : !error && (
				<div className="overflow-x-auto rounded-md border border-white/10">
					<table className="w-full min-w-[980px] text-left text-[11px]">
						<thead className="border-b border-white/10 bg-[#0b1d2a] text-slate-400"><tr><th className="px-3 py-3 font-medium">Activo / Falla</th><th className="px-3 py-3 font-medium">Reportado por</th><th className="px-3 py-3 font-medium">Grupo / Zona</th><th className="px-3 py-3 font-medium">Técnico asignado</th><th className="px-3 py-3 font-medium">Fecha</th><th className="px-3 py-3 font-medium">Prioridad</th><th className="px-3 py-3 font-medium">Estado</th></tr></thead>
						<tbody className="divide-y divide-white/5">
							{reports.map((report) => (
								<tr key={report.id} className="align-top hover:bg-white/[0.03]">
									<td className="max-w-lg px-3 py-3"><p className="font-medium text-white">{report.assetName}</p><p className="mt-1 text-cyan-200">{report.tipoFalla}</p><p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-400">{report.descripcion}</p>{report.evidenciaUrl && <p className="mt-1 text-[11px] text-slate-500">Evidencia adjunta</p>}</td>
									<td className="px-3 py-3 text-slate-300">{report.userName || `ID ${report.userId}`}</td>
									<td className="px-3 py-3 text-slate-300">{report.groupName || 'Sin grupo'}</td>
									<td className="px-3 py-3">
										<span className={report.assignedTechnicianName ? 'font-medium text-cyan-200' : 'text-amber-300'}>
											{report.assignedTechnicianName || 'Sin técnico asignado'}
										</span>
									</td>
									<td className="whitespace-nowrap px-3 py-3 text-slate-300">{formatDate(report.fechaReporte)}</td>
									<td className="px-3 py-3">
										<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_TONES[report.prioridad] || 'border-slate-400/20 bg-slate-400/10 text-slate-300'}`}>
											<AlertTriangle size={13} />
											{PRIORITY_LABELS[report.prioridad] || report.prioridad}
										</span>
									</td>
									<td className="px-3 py-3 text-slate-300">{STATUS_LABELS[report.estado] || report.estado}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{showModal && <FailureReportModal onClose={() => setShowModal(false)} onSaved={() => { setFeedback('Reporte de falla registrado.'); refreshReports(); }} />}
		</section>
	);
}
