import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ClipboardPlus, Pencil, Plus, ShieldAlert, Trash2, Wrench } from 'lucide-react';
import { Badge, Button, Modal } from './ui';
import {
	createDiagnosis,
	createNeedOrder,
	deleteDiagnosis,
	getAssetDiagnoses,
	updateDiagnosis,
	updateNeedStatus,
} from '../services/diagnosisService';
import { getFailureReportGroups } from '../services/assetService';
import { getPreventiveTechnicianAvailability } from '../services/preventiveMaintenanceService';
import {
	allowedRecommendations,
	classificationLabel,
	classificationTone,
	CONDITION_LABELS,
	defaultRecommendation,
	diagnosisPayload,
	diagnosisToForm,
	emptyDiagnosisForm,
	emptyNeed,
	INTERVENTION_LABELS,
	isDisposalRecommendation,
	NEED_STATUS_LABELS,
	ORDER_STATUS_LABELS,
	PRIORITY_LABELS,
	RECOMMENDATION_LABELS,
	validateDiagnosisForm,
} from '../services/diagnosis';

const fieldClass =
	'mt-1 w-full rounded-lg border border-sand-200 bg-sand-50 px-3 py-2.5 text-xs sm:text-sm text-ink-900 outline-none placeholder:text-ink-600 focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25 min-h-[44px] transition-all duration-200 ease-out';
const labelClass = 'block text-xs font-medium text-ink-600';
const PRIORITY_VARIANT = { ALTA: 'error', MEDIA: 'warning', BAJA: 'neutral' };
const NEED_STATUS_VARIANT = { PENDING: 'warning', IN_PROGRESS: 'info', DONE: 'success', DISCARDED: 'neutral' };

function describeError(error) {
	return (
		error.response?.data?.message ||
		error.response?.data?.detail ||
		error.message ||
		'No se pudo completar la operación.'
	);
}

function formatDate(value) {
	if (!value) return '';
	const [year, month, day] = value.split('-');
	return `${day}/${month}/${year}`;
}

/**
 * Fichas técnicas de diagnóstico de un activo: historial, registro con clasificación y
 * necesidades, y creación de órdenes de trabajo desde cada necesidad.
 */
export default function AssetDiagnosisModal({ asset, isOpen, onClose, onAssetChanged }) {
	const [diagnoses, setDiagnoses] = useState([]);
	const [loadState, setLoadState] = useState({ assetId: null, error: '' });
	const [view, setView] = useState('list');
	const [editing, setEditing] = useState(null);
	const [form, setForm] = useState(() => emptyDiagnosisForm(asset));
	const [formError, setFormError] = useState('');
	const [saving, setSaving] = useState(false);
	const [orderNeed, setOrderNeed] = useState(null);
	const [notice, setNotice] = useState('');

	const assetId = asset?.id;
	const load = useCallback(async () => {
		try {
			const list = await getAssetDiagnoses(assetId);
			setDiagnoses(list);
			setLoadState({ assetId, error: '' });
		} catch (error) {
			setLoadState({ assetId, error: describeError(error) });
		}
	}, [assetId]);

	useEffect(() => {
		if (!isOpen || !assetId) return;
		Promise.resolve().then(load);
	}, [isOpen, assetId, load]);

	if (!isOpen || !asset) return null;
	const loading = loadState.assetId !== asset.id;

	const openForm = (diagnosis = null) => {
		setEditing(diagnosis);
		setForm(diagnosis ? diagnosisToForm(diagnosis) : emptyDiagnosisForm(asset));
		setFormError('');
		setView('form');
	};

	const changeField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

	const changeCondition = (condition) =>
		setForm((current) => ({
			...current,
			operationalCondition: condition,
			recommendation: allowedRecommendations(condition).includes(current.recommendation)
				? current.recommendation
				: defaultRecommendation(condition),
		}));

	const changeNeed = (key, changes) =>
		setForm((current) => ({
			...current,
			needs: current.needs.map((need) => (need.key === key ? { ...need, ...changes } : need)),
		}));

	const toggleIntervention = (need, type) => {
		const types = need.interventionTypes.includes(type)
			? need.interventionTypes.filter((item) => item !== type)
			: [...need.interventionTypes, type];
		changeNeed(need.key, { interventionTypes: types });
	};

	const save = async (event) => {
		event.preventDefault();
		const errors = validateDiagnosisForm(form);
		if (errors.length) {
			setFormError(errors.join(' '));
			return;
		}
		setSaving(true);
		setFormError('');
		try {
			const payload = diagnosisPayload(asset.id, form);
			if (editing) await updateDiagnosis(editing.id, payload);
			else await createDiagnosis(payload);
			await load();
			setView('list');
			setNotice(editing ? 'Diagnóstico actualizado.' : 'Diagnóstico registrado.');
			if (form.updateAssetStatus) onAssetChanged?.();
		} catch (error) {
			setFormError(describeError(error));
		} finally {
			setSaving(false);
		}
	};

	const remove = async (diagnosis) => {
		if (!window.confirm(`¿Eliminar el diagnóstico del ${formatDate(diagnosis.diagnosedOn)}? Las órdenes ya creadas se conservan.`)) {
			return;
		}
		try {
			await deleteDiagnosis(diagnosis.id);
			await load();
			setNotice('Diagnóstico eliminado.');
		} catch (error) {
			setNotice(`No se pudo eliminar: ${describeError(error)}`);
		}
	};

	const changeStatus = async (need, status) => {
		try {
			await updateNeedStatus(need.id, status);
			await load();
		} catch (error) {
			setNotice(`No se pudo actualizar la necesidad: ${describeError(error)}`);
		}
	};

	const close = () => {
		setView('list');
		setNotice('');
		onClose();
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={close}
			size="xl"
			title={view === 'form' ? (editing ? 'Editar diagnóstico' : 'Nuevo diagnóstico') : 'Fichas de diagnóstico'}
			description={asset.name}
		>
			<div className="space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
				{notice && (
					<p role="status" className="rounded-lg bg-info-soft px-3 py-2 text-xs text-ocean-700">
						{notice}
					</p>
				)}

				{view === 'list' ? (
					<DiagnosisList
						diagnoses={diagnoses}
						loading={loading}
						error={loadState.error}
						onNew={() => openForm()}
						onEdit={openForm}
						onDelete={remove}
						onStatus={changeStatus}
						onOrder={setOrderNeed}
					/>
				) : (
					<DiagnosisForm
						form={form}
						asset={asset}
						error={formError}
						saving={saving}
						onBack={() => setView('list')}
						onSubmit={save}
						onField={changeField}
						onCondition={changeCondition}
						onNeed={changeNeed}
						onToggleIntervention={toggleIntervention}
						onAddNeed={() => changeField('needs', [...form.needs, emptyNeed()])}
						onRemoveNeed={(key) => changeField('needs', form.needs.filter((need) => need.key !== key))}
					/>
				)}
			</div>

			{orderNeed && (
				<NeedOrderDialog
					need={orderNeed}
					onCancel={() => setOrderNeed(null)}
					onCreated={async (result) => {
						setOrderNeed(null);
						setNotice(`Orden ${result.orderLabel} creada y asignada.`);
						await load();
						onAssetChanged?.();
					}}
				/>
			)}
		</Modal>
	);
}

function DiagnosisList({ diagnoses, loading, error, onNew, onEdit, onDelete, onStatus, onOrder }) {
	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-xs text-ink-600">
					El diagnóstico más reciente define la clasificación vigente del equipo.
				</p>
				<Button type="button" onClick={onNew} className="min-h-[44px]">
					<ClipboardPlus size={16} /> Nuevo diagnóstico
				</Button>
			</div>

			{loading && <p className="py-6 text-center text-sm text-ink-600">Cargando diagnósticos...</p>}
			{error && <p className="rounded-lg bg-error-soft p-3 text-xs text-error-text">{error}</p>}
			{!loading && !error && diagnoses.length === 0 && (
				<p className="rounded-lg border border-dashed border-sand-200 p-6 text-center text-sm text-ink-600">
					Este equipo aún no tiene fichas de diagnóstico.
				</p>
			)}

			<ol className="space-y-3">
				{diagnoses.map((diagnosis, index) => (
					<li key={diagnosis.id} className="rounded-xl border border-sand-200 bg-sand-50 p-4">
						<div className="flex flex-wrap items-start justify-between gap-2">
							<div className="min-w-0 space-y-1.5">
								<p className="text-xs text-ink-600">
									{formatDate(diagnosis.diagnosedOn)}
									{diagnosis.inspectorName && ` · Elaboró: ${diagnosis.inspectorName}`}
									{index === 0 && <span className="ml-2 font-semibold text-forest-700">Vigente</span>}
								</p>
								<Badge variant={classificationTone(diagnosis.operationalCondition, diagnosis.recommendation)}>
									{diagnosis.classificationLabel}
								</Badge>
							</div>
							<div className="flex gap-1">
								<button
									type="button"
									onClick={() => onEdit(diagnosis)}
									aria-label="Editar diagnóstico"
									title="Editar"
									className="flex size-10 items-center justify-center rounded-lg text-ink-600 hover:bg-info-soft hover:text-ocean-700"
								>
									<Pencil size={16} />
								</button>
								<button
									type="button"
									onClick={() => onDelete(diagnosis)}
									aria-label="Eliminar diagnóstico"
									title="Eliminar"
									className="flex size-10 items-center justify-center rounded-lg text-ink-600 hover:bg-error-soft hover:text-error-text"
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>

						{(diagnosis.technicalDiagnosis || diagnosis.technicalConcept) && (
							<dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
								{diagnosis.technicalDiagnosis && (
									<div>
										<dt className="font-semibold text-ink-900">Diagnóstico técnico</dt>
										<dd className="whitespace-pre-wrap text-ink-600">{diagnosis.technicalDiagnosis}</dd>
									</div>
								)}
								{diagnosis.technicalConcept && (
									<div>
										<dt className="font-semibold text-ink-900">Concepto técnico</dt>
										<dd className="whitespace-pre-wrap text-ink-600">{diagnosis.technicalConcept}</dd>
									</div>
								)}
							</dl>
						)}

						{diagnosis.needs.length > 0 && (
							<ul className="mt-3 divide-y divide-sand-200 rounded-lg border border-sand-200 bg-surface/60">
								{diagnosis.needs.map((need) => (
									<li key={need.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
										<div className="min-w-0 space-y-1">
											<p className="flex items-start gap-1.5 text-sm font-medium text-ink-900">
												{need.safetyRelated && (
													<ShieldAlert size={15} className="mt-0.5 shrink-0 text-error-text" aria-label="Seguridad del operador" />
												)}
												<span>{need.description}</span>
											</p>
											<div className="flex flex-wrap gap-1.5">
												<Badge size="sm" variant={PRIORITY_VARIANT[need.priority]}>
													Prioridad {PRIORITY_LABELS[need.priority].toLowerCase()}
												</Badge>
												<Badge size="sm">
													{need.interventionTypes.map((type) => INTERVENTION_LABELS[type]).join(' / ')}
												</Badge>
												{need.orderLabel && (
													<Badge size="sm" variant="info">
														{need.orderLabel} · {ORDER_STATUS_LABELS[need.orderStatus] || need.orderStatus}
													</Badge>
												)}
											</div>
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<select
												aria-label={`Estado de ${need.description}`}
												value={need.status}
												onChange={(event) => onStatus(need, event.target.value)}
												className={`rounded-lg border border-sand-200 bg-sand-50 px-2 py-2 text-xs text-ink-900 min-h-[40px] ${
													NEED_STATUS_VARIANT[need.status] === 'success' ? 'text-forest-700' : ''
												}`}
											>
												{Object.entries(NEED_STATUS_LABELS).map(([value, label]) => (
													<option key={value} value={value}>{label}</option>
												))}
											</select>
											{!need.orderLabel && need.status !== 'DONE' && need.status !== 'DISCARDED' && (
												<button
													type="button"
													onClick={() => onOrder(need)}
													className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gold-500 px-3 text-xs font-semibold text-pine-900 hover:bg-gold-600"
												>
													<Wrench size={14} /> Crear orden
												</button>
											)}
										</div>
									</li>
								))}
							</ul>
						)}
					</li>
				))}
			</ol>
		</>
	);
}

function DiagnosisForm({
	form, asset, error, saving, onBack, onSubmit, onField, onCondition, onNeed, onToggleIntervention, onAddNeed, onRemoveNeed,
}) {
	const recommendations = allowedRecommendations(form.operationalCondition);
	const disposal = isDisposalRecommendation(form.recommendation);
	const statusChanges = form.operationalCondition !== asset.operationalStatus;

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<button
				type="button"
				onClick={onBack}
				className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-ocean-700 hover:underline"
			>
				<ArrowLeft size={14} /> Volver al historial
			</button>

			<section className="grid gap-3 sm:grid-cols-3">
				<label className={labelClass}>
					<span>Fecha del diagnóstico</span>
					<input
						type="date"
						value={form.diagnosedOn}
						max={new Date().toLocaleDateString('en-CA')}
						onChange={(event) => onField('diagnosedOn', event.target.value)}
						className={fieldClass}
					/>
				</label>
				<label className={labelClass}>
					<span>Condición del equipo *</span>
					<select value={form.operationalCondition} onChange={(event) => onCondition(event.target.value)} className={fieldClass}>
						{Object.entries(CONDITION_LABELS).map(([value, label]) => (
							<option key={value} value={value}>{label}</option>
						))}
					</select>
				</label>
				<label className={labelClass}>
					<span>Recomendación *</span>
					<select value={form.recommendation} onChange={(event) => onField('recommendation', event.target.value)} className={fieldClass}>
						{recommendations.map((value) => (
							<option key={value} value={value}>{RECOMMENDATION_LABELS[value]}</option>
						))}
					</select>
				</label>
			</section>

			<div className="flex flex-wrap items-center gap-2 rounded-lg border border-sand-200 bg-sand-50 px-3 py-2.5">
				<span className="text-xs text-ink-600">Clasificación:</span>
				<Badge variant={classificationTone(form.operationalCondition, form.recommendation)}>
					{classificationLabel(form.operationalCondition, form.recommendation)}
				</Badge>
			</div>

			<label className={labelClass}>
				<span>Detalle de la recomendación</span>
				<textarea
					rows={2}
					value={form.recommendationDetail}
					onChange={(event) => onField('recommendationDetail', event.target.value)}
					placeholder="Ejecutar el mantenimiento programado y atender con prioridad el cambio de las llantas delanteras."
					maxLength={5000}
					className={`${fieldClass} resize-y`}
				/>
			</label>

			{disposal && (
				<label className={labelClass}>
					<span>
						Soporte de la evaluación técnica y económica
						{form.recommendation === 'RECOMMENDED_DISPOSAL' && ' *'}
					</span>
					<textarea
						rows={3}
						value={form.disposalSupport}
						onChange={(event) => onField('disposalSupport', event.target.value)}
						placeholder="Costo estimado de reparación frente al valor, vida útil y utilidad del equipo..."
						className={`${fieldClass} resize-y`}
					/>
					<span className="mt-1 block text-[11px] leading-relaxed text-ink-600">
						Esta recomendación no da de baja el equipo: la baja definitiva sigue el procedimiento
						administrativo, contable y patrimonial de la institución.
					</span>
				</label>
			)}

			<section className="grid gap-3 sm:grid-cols-2">
				{[
					['currentStateDescription', 'Descripción del estado actual', 'Se encuentra en funcionamiento y presta servicio...'],
					['technicalDiagnosis', 'Diagnóstico técnico', 'Reemplazar llantas delanteras, revisar el escape...'],
					['technicalConcept', 'Concepto técnico', 'Es técnicamente viable continuar en operación...'],
					['conclusion', 'Conclusión', 'Las intervenciones permiten conservar su confiabilidad...'],
				].map(([field, label, placeholder]) => (
					<label key={field} className={labelClass}>
						<span>{label}</span>
						<textarea
							rows={3}
							value={form[field]}
							onChange={(event) => onField(field, event.target.value)}
							placeholder={placeholder}
							maxLength={5000}
							className={`${fieldClass} resize-y`}
						/>
					</label>
				))}
			</section>

			<section className="space-y-2.5">
				<h4 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">Necesidades identificadas</h4>
				{form.needs.length === 0 && (
					<p className="text-xs text-ink-600">Sin necesidades. Agrega las intervenciones que requiere el equipo.</p>
				)}
				{form.needs.map((need, index) => (
					<div key={need.key} className="space-y-2.5 rounded-lg border border-sand-200 bg-sand-50 p-3">
						<div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
							<input
								aria-label={`Necesidad ${index + 1}`}
								placeholder="Necesidad (p. ej. Cambio de llantas delanteras)"
								value={need.description}
								maxLength={255}
								onChange={(event) => onNeed(need.key, { description: event.target.value })}
								className={`${fieldClass} mt-0`}
							/>
							<select
								aria-label="Prioridad"
								value={need.priority}
								onChange={(event) => onNeed(need.key, { priority: event.target.value })}
								className={`${fieldClass} mt-0`}
							>
								{Object.entries(PRIORITY_LABELS).map(([value, label]) => (
									<option key={value} value={value}>Prioridad {label.toLowerCase()}</option>
								))}
							</select>
							<button
								type="button"
								onClick={() => onRemoveNeed(need.key)}
								aria-label={`Quitar necesidad ${index + 1}`}
								className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:bg-error-soft hover:text-error-text"
							>
								<Trash2 size={16} />
							</button>
						</div>
						<div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de intervención">
							{Object.entries(INTERVENTION_LABELS).map(([type, label]) => {
								const active = need.interventionTypes.includes(type);
								return (
									<button
										key={type}
										type="button"
										aria-pressed={active}
										onClick={() => onToggleIntervention(need, type)}
										className={`min-h-[32px] rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
											active
												? 'border-gold-500 bg-gold-500/20 text-ink-900'
												: 'border-sand-200 text-ink-600 hover:bg-sand-100'
										}`}
									>
										{label}
									</button>
								);
							})}
						</div>
						<label className="inline-flex min-h-[36px] items-center gap-2 text-xs text-ink-600">
							<input
								type="checkbox"
								checked={need.safetyRelated}
								onChange={(event) => onNeed(need.key, { safetyRelated: event.target.checked })}
								className="h-4 w-4 accent-gold-500"
							/>
							Compromete la seguridad del operador (llantas, frenos, anclajes, acoples...)
						</label>
						{need.orderLabel && (
							<p className="text-[11px] text-ocean-700">Orden vinculada: {need.orderLabel}</p>
						)}
					</div>
				))}
				<button
					type="button"
					onClick={onAddNeed}
					className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-info-soft px-3 text-xs font-medium text-ocean-700 hover:bg-gold-600/20"
				>
					<Plus size={14} /> Agregar necesidad
				</button>
			</section>

			<label className="flex min-h-[44px] items-start gap-2.5 rounded-lg border border-sand-200 p-3 text-xs text-ink-600">
				<input
					type="checkbox"
					checked={form.updateAssetStatus}
					onChange={(event) => onField('updateAssetStatus', event.target.checked)}
					className="mt-0.5 h-4 w-4 accent-gold-500"
				/>
				<span>
					Actualizar el estado operativo del activo con esta condición
					{statusChanges && (
						<strong className="block text-ink-900">
							Cambiará de «{CONDITION_LABELS[asset.operationalStatus] || asset.operationalStatus}» a «
							{CONDITION_LABELS[form.operationalCondition]}».
						</strong>
					)}
					<span className="block">Solo aplica si este es el diagnóstico más reciente del equipo.</span>
				</span>
			</label>

			{error && (
				<p role="alert" className="rounded-lg border border-error/20 bg-error-soft p-3 text-xs text-error-text">
					{error}
				</p>
			)}

			<div className="flex flex-col-reverse gap-2.5 border-t border-sand-200 pt-4 sm:flex-row sm:justify-end">
				<Button type="button" variant="ghost" onClick={onBack} className="min-h-[44px]">
					Cancelar
				</Button>
				<Button type="submit" disabled={saving} className="min-h-[44px]">
					{saving ? 'Guardando...' : 'Guardar diagnóstico'}
				</Button>
			</div>
		</form>
	);
}

function NeedOrderDialog({ need, onCancel, onCreated }) {
	const [type, setType] = useState(need.interventionTypes.includes('PREVENTIVE') && !need.interventionTypes.includes('CORRECTIVE')
		? 'PREVENTIVE'
		: 'CORRECTIVE');
	const [groups, setGroups] = useState([]);
	const [technicians, setTechnicians] = useState([]);
	const [groupId, setGroupId] = useState('');
	const [technicianId, setTechnicianId] = useState('');
	const [scheduledAt, setScheduledAt] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		Promise.allSettled([getFailureReportGroups(), getPreventiveTechnicianAvailability()]).then(([groupResult, techResult]) => {
			if (cancelled) return;
			if (groupResult.status === 'fulfilled') setGroups(groupResult.value);
			if (techResult.status === 'fulfilled') setTechnicians(techResult.value);
			if (groupResult.status === 'rejected' && techResult.status === 'rejected') {
				setError(describeError(groupResult.reason));
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const submit = async (event) => {
		event.preventDefault();
		setSaving(true);
		setError('');
		try {
			const order = type === 'CORRECTIVE'
				? { type, groupId: Number(groupId) }
				: { type, technicianId: Number(technicianId), scheduledAt: `${scheduledAt}:00` };
			onCreated(await createNeedOrder(need.id, order));
		} catch (requestError) {
			setError(describeError(requestError));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal isOpen onClose={onCancel} size="sm" title="Crear orden de trabajo" description={need.description}>
			<form onSubmit={submit} className="space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
				<fieldset className="grid grid-cols-2 gap-2">
					<legend className="sr-only">Tipo de orden</legend>
					{[
						['CORRECTIVE', 'Correctiva', 'Reporte de falla para un grupo'],
						['PREVENTIVE', 'Preventiva', 'Mantenimiento programado'],
					].map(([value, label, hint]) => (
						<label
							key={value}
							className={`cursor-pointer rounded-lg border p-3 text-xs ${
								type === value ? 'border-gold-500 bg-gold-500/15' : 'border-sand-200'
							}`}
						>
							<input
								type="radio"
								name="order-type"
								value={value}
								checked={type === value}
								onChange={() => setType(value)}
								className="sr-only"
							/>
							<span className="block font-semibold text-ink-900">{label}</span>
							<span className="text-ink-600">{hint}</span>
						</label>
					))}
				</fieldset>

				{type === 'CORRECTIVE' ? (
					<label className={labelClass}>
						<span>Grupo que la atenderá *</span>
						<select required value={groupId} onChange={(event) => setGroupId(event.target.value)} className={fieldClass}>
							<option value="">Selecciona un grupo</option>
							{groups.map((group) => (
								<option key={group.id} value={group.id}>{group.name}</option>
							))}
						</select>
						<span className="mt-1 block text-[11px] text-ink-600">
							Se asigna automáticamente al técnico del grupo con menos carga.
						</span>
					</label>
				) : (
					<>
						<label className={labelClass}>
							<span>Técnico *</span>
							<select required value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} className={fieldClass}>
								<option value="">Selecciona un técnico</option>
								{technicians.map((technician) => (
									<option key={technician.id} value={technician.id} disabled={!technician.available}>
										{technician.nombre} ({technician.activeWorkload}/{technician.workloadCapacity} trabajos)
									</option>
								))}
							</select>
						</label>
						<label className={labelClass}>
							<span>Fecha y hora *</span>
							<input
								type="datetime-local"
								required
								value={scheduledAt}
								onChange={(event) => setScheduledAt(event.target.value)}
								className={fieldClass}
							/>
						</label>
					</>
				)}

				<p className="text-[11px] leading-relaxed text-ink-600">
					Prioridad {PRIORITY_LABELS[need.priority].toLowerCase()}. La orden incluirá la necesidad y el
					diagnóstico técnico para el técnico.
				</p>

				{error && (
					<p role="alert" className="rounded-lg border border-error/20 bg-error-soft p-3 text-xs text-error-text">{error}</p>
				)}

				<div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
					<Button type="button" variant="ghost" onClick={onCancel} className="min-h-[44px]">Cancelar</Button>
					<Button type="submit" disabled={saving} className="min-h-[44px]">
						{saving ? 'Creando...' : 'Crear orden'}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
