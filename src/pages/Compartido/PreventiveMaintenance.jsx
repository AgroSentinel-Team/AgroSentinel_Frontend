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

const fieldClass = 'mt-1 w-full rounded-md border border-white/10 bg-[#081723] px-3 py-2 text-[12px] text-white outline-none focus:border-cyan-400 disabled:opacity-60';
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
	return error.response?.data?.detail
		|| error.response?.data?.message
		|| (typeof error.response?.data === 'string' ? error.response.data : '')
		|| error.message
		|| 'No se pudo completar la solicitud.';
}

function roleName() {
	return (localStorage.getItem('rol') ?? '').toUpperCase().replace(/^ROLE_/, '');
}

function StatusBadge({ status }) {
	const colors = status === 'COMPLETED'
		? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
		: status === 'URGENT_CORRECTIVE'
			? 'border-red-400/30 bg-red-500/10 text-red-300'
			: status === 'PARTIALLY_COMPLETED'
				? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
				: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300';
	return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold ${colors}`}>{statusLabels[status] || status}</span>;
}

function Section({ title, children }) {
	return (
		<section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
			<h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-300">{title}</h3>
			{children}
		</section>
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
	const selectedCategory = categories.find((category) => String(category.id) === String(selectedAsset?.categoryId));

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
			setTechnicians(userData.filter((user) => (user.rol || '').toUpperCase().replace(/^ROLE_/, '') === 'TECNICO'));
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
				setTechnicians(userData.filter((user) => (user.rol || '').toUpperCase().replace(/^ROLE_/, '') === 'TECNICO'));
			})
			.catch((error) => {
				if (!cancelled) setLoadError(describeError(error));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => { cancelled = true; };
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
			const attentionIndex = predictivePrefill.risk === 'Alto'
				? 'HIGH'
				: predictivePrefill.risk === 'Medio' ? 'MEDIUM' : 'LOW';
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
			await schedulePreventiveMaintenance({
				assetId: Number(schedule.assetId),
				technicianId: Number(schedule.technicianId),
				scheduledAt: schedule.scheduledAt,
				attentionIndex: schedule.attentionIndex,
				predictiveContext: schedule.predictiveContext || null,
			});
			setPanel(null);
			setFeedback('Mantenimiento preventivo programado correctamente.');
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
			await executePreventiveMaintenance(panel.maintenance.id, execution, evidences);
			setPanel(null);
			setFeedback('Ejecución y evidencia guardadas. La hoja de vida del activo fue actualizada.');
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
		const invalid = validFiles.find((file) =>
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
			tasks: current.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, [key]: value } : task),
		}));
	};

	const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
	const calendarDays = [];
	const firstWeekday = (monthStart.getDay() + 6) % 7;
	const numberOfDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
	for (let index = 0; index < firstWeekday; index += 1) calendarDays.push(null);
	for (let day = 1; day <= numberOfDays; day += 1) {
		calendarDays.push(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
	}
	const scheduledForDay = visibleMaintenances.filter((item) => item.scheduledAt?.slice(0, 10) === selectedDay);
	const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(month);
	const countFor = (status) => maintenances.filter((item) => item.status === status).length;

	return (
		<section className="space-y-5 text-white">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<div className="flex items-center gap-2 text-emerald-300"><Activity size={16} /><span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Gestión de mantenimiento</span></div>
					<h1 className="mt-2 text-xl font-bold">Mantenimiento preventivo</h1>
					<p className="mt-1 text-[11px] text-slate-400">Programa inspecciones, distribuye la carga y registra las ejecuciones.</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<button type="button" onClick={loadData} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-[11px] text-slate-300 hover:bg-white/5"><RefreshCw size={13} /> Actualizar</button>
					{isAdmin && <button type="button" onClick={openSchedule} className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-cyan-500"><Plus size={14} /> Programar mantenimiento</button>}
				</div>
			</header>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Metric label="Total programados" value={maintenances.length} icon={CalendarDays} />
				<Metric label="Pendientes" value={countFor('SCHEDULED')} icon={Clock3} />
				<Metric label="Completados" value={countFor('COMPLETED')} icon={CheckCircle2} />
				<Metric label="Atención urgente" value={countFor('URGENT_CORRECTIVE')} icon={AlertTriangle} />
			</div>

			{feedback && <p role="status" className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-200">{feedback}</p>}
			{loadError && <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-200">{loadError}</p>}

			<div className="rounded-xl border border-[#2d4055] bg-[#13293a]">
				<div className="flex flex-col gap-3 border-b border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex gap-1 rounded-md bg-[#081723] p-1">
						<button type="button" onClick={() => setView('list')} className={`inline-flex items-center gap-1.5 rounded px-3 py-2 text-[10px] ${view === 'list' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}><List size={13} /> Listado</button>
						<button type="button" onClick={() => setView('calendar')} className={`inline-flex items-center gap-1.5 rounded px-3 py-2 text-[10px] ${view === 'calendar' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}><CalendarDays size={13} /> Calendario</button>
					</div>
					{view === 'list' && <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por activo o técnico" className="w-full rounded-md border border-white/10 bg-[#081723] px-3 py-2 text-[11px] outline-none focus:border-cyan-400 sm:max-w-xs" />}
				</div>

				{view === 'list' ? (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[760px] text-left text-[11px]">
							<thead className="bg-[#0e2130] text-[9px] uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-4 py-3">Activo / categoría</th><th className="px-4 py-3">Técnico</th><th className="px-4 py-3">Fecha programada</th><th className="px-4 py-3">Atención</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acción</th></tr></thead>
							<tbody className="divide-y divide-white/5">
								{loading && <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" size={18} />Cargando mantenimientos…</td></tr>}
								{!loading && visibleMaintenances.map((item) => (
									<tr key={item.id} className="hover:bg-white/[0.02]">
										<td className="px-4 py-3"><p className="font-semibold">{item.assetName}</p><p className="mt-1 text-[9px] text-slate-500">{item.categoryName}</p></td>
										<td className="px-4 py-3 text-slate-300">{item.technicianName}</td>
										<td className="px-4 py-3 text-slate-300">{formatDate(item.scheduledAt, { dateStyle: 'medium', timeStyle: 'short' })}</td>
										<td className="px-4 py-3 text-slate-300">{attentionLabels[item.attentionIndex] || attentionLabels.LOW}</td>
										<td className="px-4 py-3"><StatusBadge status={item.status} /></td>
										<td className="px-4 py-3 text-right"><button type="button" onClick={() => openDetails(item)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] text-cyan-200 hover:bg-white/5">{isTechnician && item.status === 'SCHEDULED' ? <><Wrench size={12} /> Ejecutar</> : <><Eye size={12} /> Ver detalles</>}</button></td>
									</tr>
								))}
								{!loading && visibleMaintenances.length === 0 && <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-400">No hay mantenimientos para mostrar.</td></tr>}
							</tbody>
						</table>
					</div>
				) : (
					<div className="grid gap-4 p-4 xl:grid-cols-[1fr_300px]">
						<div>
							<div className="mb-3 flex items-center justify-between gap-2">
								<button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mes anterior" className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] hover:bg-white/5">‹</button>
								<h2 className="text-sm font-semibold capitalize">{monthLabel}</h2>
								<button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Mes siguiente" className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] hover:bg-white/5">›</button>
							</div>
							<div className="grid grid-cols-7 gap-1 text-center">
								{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <div key={day} className="py-2 text-[9px] font-semibold uppercase text-slate-500">{day}</div>)}
								{calendarDays.map((day, index) => {
									const count = day ? visibleMaintenances.filter((item) => item.scheduledAt?.slice(0, 10) === day).length : 0;
									return <button key={day || `empty-${index}`} type="button" disabled={!day} onClick={() => setSelectedDay(day)} className={`min-h-[54px] rounded-md border p-1 text-[10px] ${!day ? 'border-transparent' : selectedDay === day ? 'border-cyan-400/70 bg-cyan-500/10 text-white' : 'border-white/5 text-slate-300 hover:border-white/20'}`}>{day ? <><span>{Number(day.slice(-2))}</span>{count > 0 && <span className="mt-1 block rounded-full bg-cyan-400/15 px-1 text-[8px] text-cyan-200">{count} plan.</span>}</> : null}</button>;
								})}
							</div>
						</div>
						<aside className="rounded-lg border border-white/10 bg-[#0d2030] p-3">
							<h3 className="text-[11px] font-semibold">{selectedDay ? formatDate(`${selectedDay}T12:00:00`) : 'Selecciona un día'}</h3>
							<div className="mt-3 space-y-2">
								{scheduledForDay.map((item) => <button key={item.id} type="button" onClick={() => openDetails(item)} className="w-full rounded-md border border-white/10 p-2 text-left hover:border-cyan-400/40"><p className="text-[10px] font-semibold">{item.assetName}</p><p className="mt-1 text-[9px] text-slate-400">{formatDate(item.scheduledAt, { timeStyle: 'short' })} · {item.technicianName}</p><div className="mt-2"><StatusBadge status={item.status} /></div></button>)}
								{selectedDay && scheduledForDay.length === 0 && <p className="text-[10px] text-slate-500">Sin mantenimientos programados.</p>}
							</div>
						</aside>
					</div>
				)}
			</div>

			{panel && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setPanel(null); }}>
				<div role="dialog" aria-modal="true" aria-labelledby="maintenance-panel-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-[#102637] p-5 shadow-2xl">
					<div className="mb-5 flex items-start justify-between gap-3">
						<div><h2 id="maintenance-panel-title" className="text-base font-semibold">{panel.mode === 'schedule' ? 'Programar mantenimiento' : panel.mode === 'execute' ? 'Ejecutar mantenimiento' : 'Detalle del mantenimiento'}</h2><p className="mt-1 text-[10px] text-slate-400">{panel.mode === 'schedule' ? 'Asigna el activo, el técnico y la fecha de la inspección.' : `${panel.maintenance.assetName} · ${panel.maintenance.categoryName}`}</p></div>
						<button type="button" disabled={saving} onClick={() => setPanel(null)} aria-label="Cerrar" className="text-slate-400 hover:text-white"><X size={18} /></button>
					</div>

					{panel.mode === 'schedule' && <form onSubmit={saveSchedule} className="space-y-4">
						<Section title="Programación">
							<div className="grid gap-3 sm:grid-cols-2">
								<label className="text-[11px] text-slate-300">Activo *
									<select required value={schedule.assetId} onChange={(event) => {
										const assetId = event.target.value;
										setSchedule((current) => ({
											...current,
											assetId,
											predictiveContext: current.predictiveAssetId && assetId !== current.predictiveAssetId ? '' : current.predictiveContext,
											predictiveAssetId: current.predictiveAssetId && assetId !== current.predictiveAssetId ? '' : current.predictiveAssetId,
										}));
										if (schedule.predictiveContext && assetId !== schedule.predictiveAssetId) {
											setFeedback('Se quitó el contexto predictivo porque cambiaste el activo.');
										}
									}} className={fieldClass}><option value="">Selecciona un activo</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select>
								</label>
								<label className="text-[11px] text-slate-300">Técnico asignado *
									<select required value={schedule.technicianId} onChange={(event) => setSchedule((current) => ({ ...current, technicianId: event.target.value }))} className={fieldClass}><option value="">Selecciona un técnico</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.nombre}</option>)}</select>
								</label>
								<label className="text-[11px] text-slate-300">Categoría del activo
									<input readOnly value={selectedAsset?.categoryName || 'Se completa al seleccionar un activo'} className={`${fieldClass} text-slate-400`} />
								</label>
								<label className="text-[11px] text-slate-300">Fecha y hora de ejecución *
									<input required type="datetime-local" min={localDate()} value={schedule.scheduledAt} onChange={(event) => setSchedule((current) => ({ ...current, scheduledAt: event.target.value }))} className={fieldClass} />
								</label>
								<label className="text-[11px] text-slate-300">Índice de atención *
									<select required value={schedule.attentionIndex} onChange={(event) => setSchedule((current) => ({ ...current, attentionIndex: event.target.value }))} className={fieldClass}>
										<option value="LOW">Baja</option>
										<option value="MEDIUM">Media</option>
										<option value="HIGH">Alta</option>
									</select>
								</label>
							</div>
							{selectedCategory && <p className="mt-3 text-[10px] text-slate-400">Frecuencia sugerida para esta categoría: cada {selectedCategory.maintenanceFrequencyDays || 90} días.</p>}
						</Section>
						{schedule.predictiveContext && <Section title="Falla y datos del mantenimiento predictivo">
							<p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-200">{schedule.predictiveContext}</p>
						</Section>}
						<div className="flex justify-end gap-2"><button type="button" onClick={() => setPanel(null)} className="rounded-md border border-white/10 px-3 py-2 text-[11px]">Cancelar</button><button type="submit" disabled={saving || !assets.length || !technicians.length} className="rounded-md bg-cyan-600 px-4 py-2 text-[11px] font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Confirmar programación'}</button></div>
					</form>}

					{panel.mode === 'details' && <div className="space-y-4">
						<Section title="Programación"><div className="grid gap-3 text-[11px] sm:grid-cols-2"><Info label="Activo" value={panel.maintenance.assetName} /><Info label="Categoría" value={panel.maintenance.categoryName} /><Info label="Técnico asignado" value={panel.maintenance.technicianName} /><Info label="Fecha programada" value={formatDate(panel.maintenance.scheduledAt, { dateStyle: 'medium', timeStyle: 'short' })} /><Info label="Índice de atención" value={attentionLabels[panel.maintenance.attentionIndex] || attentionLabels.LOW} /><Info label="Estado" value={statusLabels[panel.maintenance.status]} /></div></Section>
						{panel.maintenance.predictiveContext && <Section title="Falla y datos del mantenimiento predictivo"><p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-200">{panel.maintenance.predictiveContext}</p></Section>}
						{panel.maintenance.status !== 'SCHEDULED' && <><Section title="Registro de ejecución"><div className="grid gap-3 text-[11px] sm:grid-cols-2"><Info label="Fecha de ejecución" value={formatDate(panel.maintenance.executedAt, { dateStyle: 'medium', timeStyle: 'short' })} /><Info label="Próximo mantenimiento" value={formatDate(panel.maintenance.nextMaintenanceDate)} /><Info label="Repuestos" value={panel.maintenance.replacedParts} /><Info label="Trabajo realizado" value={panel.maintenance.workDescription} /><Info label="Observaciones" value={panel.maintenance.technicianNotes} /></div>{panel.maintenance.tasks?.length > 0 && <ul className="mt-3 space-y-2">{panel.maintenance.tasks.map((task) => <li key={task.id} className="flex items-center gap-2 text-[10px] text-slate-300"><Check size={13} className={task.completed ? 'text-emerald-300' : 'text-slate-600'} />{task.description}</li>)}</ul>}{panel.maintenance.evidences?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{panel.maintenance.evidences.map((url) => <button key={url} type="button" onClick={() => openEvidence(url)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[9px] text-cyan-200"><FileImage size={12} /> Ver evidencia</button>)}</div>}</Section><p className="text-[9px] text-slate-500">Firma digital confirmada: {formatDate(panel.maintenance.confirmedAt, { dateStyle: 'medium', timeStyle: 'short' })}</p></>}
					</div>}

					{panel.mode === 'execute' && <form onSubmit={saveExecution} className="space-y-4">
						<Section title="Tareas de inspección">
							<div className="space-y-2">{execution.tasks.map((task, index) => <div key={`${index}-${task.description}`} className="flex items-center gap-2 rounded-md border border-white/5 bg-[#0d2030] px-3 py-2"><input aria-label={`Completar tarea ${index + 1}`} type="checkbox" checked={task.completed} onChange={(event) => updateTask(index, 'completed', event.target.checked)} className="accent-cyan-500" /><input required maxLength="200" value={task.description} onChange={(event) => updateTask(index, 'description', event.target.value)} className="min-w-0 flex-1 bg-transparent text-[11px] outline-none" /><button type="button" aria-label="Eliminar tarea" onClick={() => updateExecution('tasks', execution.tasks.filter((_, taskIndex) => taskIndex !== index))} className="text-slate-500 hover:text-red-300"><Trash2 size={13} /></button></div>)}</div>
							<button type="button" onClick={() => updateExecution('tasks', [...execution.tasks, { description: '', completed: false }])} className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:text-cyan-200"><Plus size={13} /> Agregar tarea</button>
						</Section>
						<Section title="Informe de ejecución">
							<div className="grid gap-3 sm:grid-cols-2">
								<label className="text-[11px] text-slate-300">Piezas reemplazadas / repuestos
									<textarea rows="3" maxLength="5000" value={execution.replacedParts} onChange={(event) => updateExecution('replacedParts', event.target.value)} placeholder="Lista de piezas y repuestos utilizados" className={fieldClass} />
								</label>
								<label className="text-[11px] text-slate-300">Descripción de lo realizado *
									<textarea required rows="3" maxLength="10000" value={execution.workDescription} onChange={(event) => updateExecution('workDescription', event.target.value)} placeholder="Describe el trabajo efectuado" className={fieldClass} />
								</label>
								<label className="text-[11px] text-slate-300 sm:col-span-2">Observaciones / notas del técnico
									<textarea rows="4" maxLength="10000" value={execution.technicianNotes} onChange={(event) => updateExecution('technicianNotes', event.target.value)} placeholder="Anomalías detectadas o recomendaciones para el próximo ciclo" className={fieldClass} />
								</label>
								<label className="text-[11px] text-slate-300">Estado final *
									<select value={execution.outcome} onChange={(event) => updateExecution('outcome', event.target.value)} className={fieldClass}>{Object.entries(outcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
								</label>
								<label className="text-[11px] text-slate-300">Próxima fecha de mantenimiento *
									<input required type="date" min={localDate()} value={execution.nextMaintenanceDate} onChange={(event) => updateExecution('nextMaintenanceDate', event.target.value)} className={fieldClass} />
									<span className="mt-1 block text-[9px] text-slate-500">Sugerida automáticamente cada {panel.maintenance.maintenanceFrequencyDays || 90} días según la categoría.</span>
								</label>
							</div>
						</Section>
						<Section title="Evidencia antes y después">
							<label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addEvidenceFiles(event.dataTransfer.files); }} className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-400/30 bg-[#0d2030] p-6 text-center hover:border-cyan-400/60"><FileImage size={20} className="text-cyan-300" /><span className="mt-2 text-[10px] font-semibold">Arrastra imágenes o selecciona archivos</span><span className="mt-1 text-[9px] text-slate-500">JPG, PNG o WEBP · máximo 10 imágenes de 10 MB</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => addEvidenceFiles(event.target.files)} className="sr-only" /></label>
							{evidences.length > 0 && <ul className="mt-2 space-y-1">{evidences.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center justify-between text-[10px] text-slate-300"><span>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => setEvidences((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Quitar ${file.name}`} className="text-slate-500 hover:text-red-300"><X size={13} /></button></li>)}</ul>}
						</Section>
						<label className="flex items-start gap-2 rounded-md border border-white/10 p-3 text-[10px] text-slate-300"><input required type="checkbox" checked={execution.confirmed} onChange={(event) => updateExecution('confirmed', event.target.checked)} className="mt-0.5 accent-cyan-500" /><span><strong className="text-white">Confirmar veracidad de datos.</strong> Esta confirmación registra mi identidad y fecha como firma digital de esta ejecución.</span></label>
						<div className="flex justify-end gap-2"><button type="button" onClick={() => setPanel(null)} className="rounded-md border border-white/10 px-3 py-2 text-[11px]">Cancelar</button><button type="submit" disabled={saving || execution.tasks.length === 0} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-[11px] font-semibold disabled:opacity-50">{saving ? 'Guardando…' : <><ClipboardCheck size={13} /> Guardar ejecución</>}</button></div>
					</form>}
				</div>
			</div>}
			{previewEvidence && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Evidencia del mantenimiento" onClick={() => setPreviewEvidence('')}><button type="button" onClick={() => setPreviewEvidence('')} aria-label="Cerrar evidencia" className="absolute right-5 top-5 text-white"><X size={22} /></button><img src={previewEvidence} alt="Evidencia del mantenimiento preventivo" className="max-h-[90vh] max-w-full rounded-lg object-contain" /></div>}
		</section>
	);
}

function Metric({ label, value, icon: Icon }) {
	return <div className="rounded-xl border border-[#2d4055] bg-[#172c3d] px-4 py-3"><div className="flex items-center justify-between text-slate-400"><p className="text-[9px] uppercase tracking-[0.12em]">{label}</p><Icon size={14} className="text-cyan-300" /></div><p className="mt-2 text-xl font-bold">{value}</p></div>;
}

function Info({ label, value }) {
	return <div><p className="text-[9px] uppercase tracking-[0.1em] text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap text-slate-200">{value || 'Sin registro'}</p></div>;
}
