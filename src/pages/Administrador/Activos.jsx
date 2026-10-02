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
	Wrench,
	X,
} from 'lucide-react';
import {
	deactivateAsset,
	deleteAsset,
	getAssetResume,
	getAssets,
	getPredictiveHistory,
} from '../../services/assetService';
import { getPreventiveMaintenanceEvidence } from '../../services/preventiveMaintenanceService';
import CreateAssetForm from '../../components/CreateAssetForm';

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
	return error.response?.data?.detail
		|| error.response?.data?.message
		|| (typeof error.response?.data === 'string' ? error.response.data : '')
		|| error.message
		|| 'Ocurrió un error al comunicarse con el servidor.';
}

function formatDate(value) {
	return value ? value.split('-').reverse().join('/') : 'Sin registro';
}

function formatDateTime(value) {
	return value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value)) : 'Sin registro';
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
	const [resume, setResume] = useState(null);
	const [resumeLoading, setResumeLoading] = useState(false);
	const [predictiveHistory, setPredictiveHistory] = useState([]);
	const [predictiveAsset, setPredictiveAsset] = useState(null);
	const [predictiveLoading, setPredictiveLoading] = useState(false);
	const [maintenanceEvidencePreview, setMaintenanceEvidencePreview] = useState('');

	useEffect(() => () => {
		if (maintenanceEvidencePreview) URL.revokeObjectURL(maintenanceEvidencePreview);
	}, [maintenanceEvidencePreview]);

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
		return () => { cancelled = true; };
	}, [refreshKey]);

	const visibleAssets = assets.filter((asset) => {
		const matchesStatus = statusFilter === 'ALL' || asset.operationalStatus === statusFilter;
		const searchable = `${asset.name} ${asset.brand || ''} ${asset.model || ''} ${asset.serialNumber || ''} ${asset.categoryName || ''} ${asset.location || ''}`;
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
		setAssets((current) => editingAsset
			? current.map((asset) => asset.id === saved.id ? saved : asset)
			: [saved, ...current]);
		setFeedback(editingAsset ? 'Activo actualizado.' : 'Activo registrado.');
		setModal('');
	};

	const handleDeactivate = async (asset) => {
		try {
			const updated = await deactivateAsset(asset.id);
			setAssets((current) => current.map((item) => item.id === updated.id ? updated : item));
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

	const openResume = async (asset) => {
		setResume(null);
		setResumeLoading(true);
		setModal('resume');
		try {
			setResume(await getAssetResume(asset.id));
		} catch (error) {
			setFeedback(`No se pudo cargar la hoja de vida: ${describeError(error)}`);
			setModal('');
		} finally {
			setResumeLoading(false);
		}
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

	return (
		<section className="rounded-xl border border-white/10 bg-[#13293a] p-5">
			<div className="mb-5 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 className="text-[14px] font-semibold text-white">Gestión de Activos</h2>
					<p className="mt-1 text-[10px] text-slate-400">Ficha técnica, asignación y estado operativo.</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button type="button" title="Recargar activos" aria-label="Recargar activos" onClick={reloadAssets} className="rounded-md border border-white/10 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-300">
						<RefreshCw size={15} />
					</button>
					<button type="button" onClick={openCreateForm} className="flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-[11px] font-medium text-white hover:bg-cyan-500">
						<Plus size={14} /> Registrar activo
					</button>
				</div>
			</div>

			{feedback && (
				<div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-[11px] text-cyan-100" role="status">
					<span>{feedback}</span>
					<button type="button" onClick={() => setFeedback('')} title="Cerrar aviso" aria-label="Cerrar aviso"><X size={14} /></button>
				</div>
			)}

			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div className="relative min-w-[220px] flex-1 sm:max-w-sm">
					<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
					<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, serial o categoría" className="w-full rounded-md border border-white/10 bg-[#081723] py-2 pl-8 pr-3 text-[11px] text-white outline-none focus:border-cyan-400" />
				</div>
				<label className="flex items-center gap-2 text-[11px] text-slate-300">
					Estado
					<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-white/10 bg-[#081723] px-2 py-2 text-[11px] text-white outline-none focus:border-cyan-400">
						<option value="ALL">Todos</option>
						{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
					</select>
				</label>
			</div>

			{loadError && (
				<div className="flex items-center gap-2 rounded-md border border-red-400/20 bg-red-400/10 p-4 text-[11px] text-red-200" role="alert">
					<AlertCircle size={16} />
					<span>No se pudieron cargar los activos: {loadError}</span>
				</div>
			)}

			{loading ? (
				<p className="py-10 text-center text-[11px] text-slate-400">Cargando activos...</p>
			) : !loadError && (
				<div className="overflow-x-auto rounded-md border border-white/10">
					<table className="w-full min-w-[900px] text-left text-[11px]">
						<thead className="border-b border-white/10 bg-[#0b1d2a] text-slate-400">
							<tr>
								<th className="px-3 py-3 font-medium">Activo</th>
								<th className="px-3 py-3 font-medium">Categoría</th>
								<th className="px-3 py-3 font-medium">Responsable</th>
								<th className="px-3 py-3 font-medium">Ubicación</th>
								<th className="px-3 py-3 font-medium">Estado</th>
								<th className="px-3 py-3 text-right font-medium">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{visibleAssets.map((asset) => (
								<tr key={asset.id} className="hover:bg-white/[0.03]">
									<td className="px-3 py-3">
										<p className="font-medium text-white">{asset.name}</p>
										<p className="mt-1 text-[10px] text-slate-400">{[asset.brand, asset.model, asset.serialNumber].filter(Boolean).join(' · ') || 'Sin ficha técnica'}</p>
										{asset.hasMotor && <p className="mt-1 text-[10px] text-cyan-300">ID predictivo: {asset.predictiveId}</p>}
									</td>
									<td className="px-3 py-3 text-slate-300">{asset.categoryName || `ID ${asset.categoryId}`}</td>
									<td className="px-3 py-3 text-slate-300">{asset.responsibleName || `ID ${asset.responsibleId}`}</td>
									<td className="px-3 py-3 text-slate-300">{asset.location || 'Sin ubicación'}</td>
									<td className="px-3 py-3">
										<span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] ${asset.isActive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-400/10 text-slate-400'}`}>
											{asset.isActive ? <CheckCircle2 size={11} /> : <Power size={11} />}
											{asset.isActive ? STATUS_LABELS[asset.operationalStatus] || asset.operationalStatus : 'Desactivado'}
										</span>
									</td>
									<td className="px-3 py-3 text-right">
										<div className="inline-flex items-center gap-3 text-slate-400">
											<button type="button" title="Hoja de vida" aria-label={`Hoja de vida de ${asset.name}`} onClick={() => openResume(asset)} className="hover:text-cyan-300"><FileText size={15} /></button>
											{asset.hasMotor && <button type="button" title="Hoja de vida predictivo" aria-label={`Hoja de vida predictivo de ${asset.name}`} onClick={() => openPredictiveHistory(asset)} className="hover:text-emerald-300"><Activity size={15} /></button>}
											<button type="button" title="Editar" aria-label={`Editar ${asset.name}`} onClick={() => openEditForm(asset)} className="hover:text-cyan-300"><ClipboardList size={15} /></button>
											{asset.isActive && <button type="button" title="Desactivar" aria-label={`Desactivar ${asset.name}`} onClick={() => handleDeactivate(asset)} className="hover:text-amber-300"><Power size={15} /></button>}
											<button type="button" title="Eliminar lógicamente" aria-label={`Eliminar ${asset.name}`} onClick={() => handleDelete(asset)} className="hover:text-red-300"><Trash2 size={15} /></button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{!visibleAssets.length && <p className="py-10 text-center text-[11px] text-slate-400">No hay activos que coincidan con los filtros.</p>}
				</div>
			)}

			{modal === 'form' && <CreateAssetForm asset={editingAsset} onCancel={() => setModal('')} onSaved={handleAssetSaved} />}

			{modal === 'resume' && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" role="presentation">
					<div role="dialog" aria-modal="true" aria-labelledby="asset-resume-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-[#102637] p-5 shadow-2xl">
						<div className="mb-5 flex items-start justify-between gap-3">
							<div><h3 id="asset-resume-title" className="text-[15px] font-semibold text-white">Hoja de vida del activo</h3><p className="mt-1 text-[10px] text-slate-400">Ficha, responsable e historial de mantenimiento.</p></div>
							<button type="button" onClick={() => setModal('')} title="Cerrar" aria-label="Cerrar hoja de vida" className="text-slate-400 hover:text-white"><X size={18} /></button>
						</div>
						{resumeLoading ? <p className="py-10 text-center text-[11px] text-slate-400">Cargando hoja de vida...</p> : resume && (
							<>
								<div className="grid gap-x-6 gap-y-4 border-b border-white/10 pb-5 sm:grid-cols-2">
									<div><p className="text-[10px] text-slate-400">Activo</p><p className="mt-1 text-[13px] font-medium text-white">{resume.asset.name}</p><p className="mt-1 text-[10px] text-slate-300">{[resume.asset.brand, resume.asset.model, resume.asset.serialNumber].filter(Boolean).join(' · ')}</p></div>
									<div><p className="text-[10px] text-slate-400">Categoría / responsable</p><p className="mt-1 text-[11px] text-white">{resume.asset.categoryName} / {resume.asset.responsibleName}</p></div>
									<div><p className="text-[10px] text-slate-400">Ubicación / estado</p><p className="mt-1 text-[11px] text-white">{resume.asset.location || 'Sin ubicación'} / {STATUS_LABELS[resume.asset.operationalStatus] || resume.asset.operationalStatus} / {resume.asset.isActive ? 'Activo' : 'Desactivado'}</p></div>
									<div><p className="text-[10px] text-slate-400">Adquisición / costo</p><p className="mt-1 text-[11px] text-white">{formatDate(resume.asset.acquisitionDate)} / {formatCurrency(resume.asset.acquisitionCost)}</p></div>
									<div><p className="text-[10px] text-slate-400">Proveedor</p><p className="mt-1 text-[11px] text-white">{resume.asset.provider || 'Sin registro'}</p></div>
									<div><p className="text-[10px] text-slate-400">Vencimiento de garantía</p><p className="mt-1 text-[11px] text-white">{formatDate(resume.asset.warrantyExpirationDate)}</p></div>
									<div className="sm:col-span-2"><p className="text-[10px] text-slate-400">Especificaciones adicionales</p><pre className="mt-1 whitespace-pre-wrap break-words font-sans text-[11px] text-white">{resume.asset.extraSpecifications || 'Sin registro'}</pre></div>
								</div>
								<div className="pt-5">
									<h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-white"><Wrench size={14} className="text-cyan-300" />Historial de mantenimiento</h4>
									{resume.maintenanceHistory.length ? (
										<div className="space-y-2">
											{resume.maintenanceHistory.map((item) => {
												const statusClass = item.status === 'COMPLETED'
													? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
													: item.status === 'URGENT_CORRECTIVE'
														? 'border-red-400/30 bg-red-500/10 text-red-300'
														: item.status === 'PARTIALLY_COMPLETED'
															? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
															: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300';
												return (
													<article key={item.id} className="rounded-md border border-white/10 bg-[#0b1d2a] p-3">
														<div className="flex flex-wrap items-start justify-between gap-3">
															<div>
																<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{item.type === 'PREVENTIVE' ? 'Mantenimiento preventivo' : 'Mantenimiento correctivo'}</p>
																<p className="mt-1 text-[11px] font-medium text-white">{item.status === 'SCHEDULED' ? 'Trabajo planificado' : 'Trabajo realizado'}</p>
															</div>
															<span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${statusClass}`}>{MAINTENANCE_STATUS_LABELS[item.status] || 'Completado'}</span>
														</div>
														<dl className="mt-3 grid gap-x-5 gap-y-2 border-t border-white/5 pt-3 text-[10px] sm:grid-cols-2 lg:grid-cols-3">
															<div><dt className="text-slate-500">Fecha programada</dt><dd className="mt-0.5 text-slate-200">{formatDateTime(item.scheduledAt || item.maintenanceDate)}</dd></div>
															<div><dt className="text-slate-500">Fecha de ejecución</dt><dd className="mt-0.5 text-slate-200">{item.executedAt ? formatDateTime(item.executedAt) : 'Pendiente'}</dd></div>
															<div><dt className="text-slate-500">Técnico responsable</dt><dd className="mt-0.5 text-slate-200">{item.technicianName || 'Sin asignar'}</dd></div>
														</dl>
														<div className="mt-3 rounded-md border border-white/5 bg-[#102637] p-3">
															<p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{item.status === 'SCHEDULED' ? 'Plan de trabajo' : 'Detalle del trabajo y observaciones'}</p>
															<p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-200">{item.tasksDescription || 'Sin descripción de tareas'}</p>
															{item.replacedParts && <p className="mt-2 text-[10px] text-slate-300"><span className="text-slate-500">Repuestos: </span>{item.replacedParts}</p>}
														</div>
														<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] text-slate-400">
															{item.nextRecommendedDate && <span>Próximo mantenimiento: {formatDate(item.nextRecommendedDate)}</span>}
															{item.provider && <span>Proveedor: {item.provider}</span>}
															{item.cost !== null && item.cost !== undefined && <span>Costo: {formatCurrency(item.cost)}</span>}
															{item.signedAt && <span>Firma digital: {formatDateTime(item.signedAt)}</span>}
														</div>
														{item.evidences?.length > 0 && <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">{item.evidences.map((url) => <button key={url} type="button" onClick={() => openMaintenanceEvidence(url)} className="rounded-md border border-cyan-400/20 px-2 py-1 text-[9px] text-cyan-200 hover:bg-cyan-400/10">Ver evidencia</button>)}</div>}
													</article>
												);
											})}
										</div>
									) : <p className="rounded-md border border-white/10 p-4 text-[11px] text-slate-400">Este activo aún no tiene mantenimientos registrados.</p>}
								</div>
							</>
						)}
					</div>
				</div>
			)}

			{modal === 'predictiveResume' && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" role="presentation">
					<div role="dialog" aria-modal="true" aria-labelledby="predictive-resume-title" className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-white/10 bg-[#102637] p-5 shadow-2xl">
						<div className="mb-5 flex items-start justify-between gap-3">
							<div><h3 id="predictive-resume-title" className="text-[15px] font-semibold text-white">Hoja de vida predictivo</h3><p className="mt-1 text-[10px] text-slate-400">{predictiveAsset?.name} · {predictiveAsset?.predictiveId} · lecturas y resultados históricos.</p></div>
							<button type="button" onClick={() => setModal('')} title="Cerrar" aria-label="Cerrar hoja de vida predictiva" className="text-slate-400 hover:text-white"><X size={18} /></button>
						</div>
						{predictiveLoading ? <p className="py-10 text-center text-[11px] text-slate-400">Cargando historial predictivo...</p> : predictiveHistory.length ? (
							<div className="overflow-x-auto rounded-md border border-white/10">
								<table className="w-full min-w-[920px] text-left text-[10px]">
									<thead className="border-b border-white/10 bg-[#0b1d2a] text-slate-400"><tr><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Confianza</th><th className="px-3 py-3">Temperatura</th><th className="px-3 py-3">Vibración</th><th className="px-3 py-3">Humedad</th><th className="px-3 py-3">Presión</th><th className="px-3 py-3">Consumo</th></tr></thead>
										<tbody className="divide-y divide-white/5">{predictiveHistory.map((record) => <tr key={record.id}><td className="whitespace-nowrap px-3 py-3 text-slate-300">{formatDateTime(record.timestamp)}</td><td className={`px-3 py-3 font-medium ${record.predictionClass === 1 ? 'text-red-300' : 'text-emerald-300'}`}>{record.motorState}</td><td className="px-3 py-3 text-slate-300">{Math.round(record.confidence * 100)}%</td><td className="px-3 py-3 text-slate-300">{record.temperature} °C</td><td className="px-3 py-3 text-slate-300">{record.vibration} Hz</td><td className="px-3 py-3 text-slate-300">{record.humidity} %</td><td className="px-3 py-3 text-slate-300">{record.pressure} bar</td><td className="px-3 py-3 text-slate-300">{record.energyConsumption} kW</td></tr>)}</tbody>
								</table>
								{predictiveHistory.some((record) => record.affectedComponents) && <div className="border-t border-white/10 p-3 text-[10px] text-slate-300"><p className="mb-2 font-semibold text-white">Diagnósticos</p>{predictiveHistory.map((record) => <p key={record.id} className="mb-1"><span className="text-slate-400">{formatDateTime(record.timestamp)}:</span> {record.affectedComponents}</p>)}</div>}
							</div>
						) : <p className="rounded-md border border-white/10 p-4 text-[11px] text-slate-400">Este activo aún no tiene lecturas predictivas registradas.</p>}
					</div>
				</div>
			)}

			{maintenanceEvidencePreview && (
				<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Evidencia del mantenimiento" onClick={() => setMaintenanceEvidencePreview('')}>
					<button type="button" onClick={() => setMaintenanceEvidencePreview('')} aria-label="Cerrar evidencia" className="absolute right-5 top-5 text-white"><X size={22} /></button>
					<img src={maintenanceEvidencePreview} alt="Evidencia del mantenimiento preventivo" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
				</div>
			)}
		</section>
	);
}