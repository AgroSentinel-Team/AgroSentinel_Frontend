import { useEffect, useState } from 'react';
import { AlertTriangle, ImagePlus, LoaderCircle, Search, X } from 'lucide-react';
import { createFailureReport, getFailureReportAssets, getFailureReportGroups } from '../services/assetService';

const PRIORITIES = [
	{ value: 'BAJA', label: 'Baja' },
	{ value: 'MEDIA', label: 'Media' },
	{ value: 'ALTA', label: 'Alta' },
	{ value: 'CRITICA', label: 'Crítica' },
];

const inputClass = 'w-full rounded-md border border-white/10 bg-[#081723] px-3 py-2 text-[11px] text-white outline-none focus:border-cyan-400';

function describeError(error) {
	if (error.response?.status === 403) return 'Tu perfil no tiene permiso para registrar reportes de falla.';
	if (error.response?.status === 401) return 'La sesión ya no es válida. Inicia sesión de nuevo para continuar.';
	return error.response?.data?.detail
		|| error.response?.data?.message
		|| (typeof error.response?.data === 'string' ? error.response.data : '')
		|| error.message
		|| 'No se pudo registrar el reporte.';
}

export default function FailureReportModal({ onClose, onSaved }) {
	const [assets, setAssets] = useState([]);
	const [assetsLoading, setAssetsLoading] = useState(true);
	const [assetError, setAssetError] = useState('');
	const [groups, setGroups] = useState([]);
	const [groupsLoading, setGroupsLoading] = useState(true);
	const [groupError, setGroupError] = useState('');
	const [query, setQuery] = useState('');
	const [form, setForm] = useState({ assetId: '', groupId: '', tipoFalla: '', prioridad: 'MEDIA', descripcion: '' });
	const [evidence, setEvidence] = useState(null);
	const [submitError, setSubmitError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const isAdministrator = (() => {
		const role = (localStorage.getItem('rol') ?? '').toUpperCase().replace(/^ROLE_/, '');
		try {
			const roles = JSON.parse(localStorage.getItem('roles') ?? '[]');
			return ['ADMIN', 'ADMINISTRADOR'].includes(role)
				|| (Array.isArray(roles) && roles.some((item) =>
					['ADMIN', 'ADMINISTRADOR'].includes((item ?? '').toUpperCase().replace(/^ROLE_/, '')),
				));
		} catch {
			return ['ADMIN', 'ADMINISTRADOR'].includes(role);
		}
	})();

	useEffect(() => {
		let cancelled = false;
		getFailureReportAssets()
			.then((data) => { if (!cancelled) setAssets(data); })
			.catch((error) => { if (!cancelled) setAssetError(describeError(error)); })
			.finally(() => { if (!cancelled) setAssetsLoading(false); });
		getFailureReportGroups()
			.then((data) => {
				if (cancelled) return;
				const activeGroups = data.filter((group) => group.active);
				setGroups(activeGroups);
				if (activeGroups.length === 1) {
					setForm((current) => ({ ...current, groupId: String(activeGroups[0].id) }));
				}
			})
			.catch((error) => { if (!cancelled) setGroupError(describeError(error)); })
			.finally(() => { if (!cancelled) setGroupsLoading(false); });
		return () => { cancelled = true; };
	}, []);

	const filteredAssets = assets
		.filter((asset) => `${asset.name} ${asset.brand || ''} ${asset.model || ''} ${asset.serialNumber || ''} ${asset.location || ''} ${asset.responsibleName || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
		.sort((first, second) => Number(second.assignedToCurrentUser) - Number(first.assignedToCurrentUser));

	const updateField = (event) => {
		setSubmitError('');
		setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
	};

	const handleEvidenceChange = (event) => {
		const file = event.target.files?.[0] ?? null;
		setSubmitError('');
		if (file && file.size > 10 * 1024 * 1024) {
			setSubmitError('La evidencia no puede superar 10 MB.');
			setEvidence(null);
			return;
		}
		setEvidence(file);
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (groupsLoading) {
			setSubmitError('Espera a que carguen los grupos de trabajo.');
			return;
		}
		if (groupError) {
			setSubmitError(`No se pudieron cargar los grupos: ${groupError}`);
			return;
		}
		if ((isAdministrator || groups.length > 1) && !form.groupId) {
			setSubmitError('Selecciona el grupo o zona al que corresponde la falla.');
			return;
		}
		if (groups.length === 0) {
			setSubmitError('No hay un grupo de trabajo activo disponible para asignar la falla.');
			return;
		}
		setSubmitting(true);
		setSubmitError('');
		const payload = new FormData();
		payload.append('data', new Blob([JSON.stringify({
			assetId: Number(form.assetId),
			groupId: form.groupId ? Number(form.groupId) : null,
			tipoFalla: form.tipoFalla.trim(),
			prioridad: form.prioridad,
			descripcion: form.descripcion.trim(),
		})], { type: 'application/json' }));
		if (evidence) payload.append('evidencia', evidence);

		try {
			const savedReport = await createFailureReport(payload);
			window.alert('Reporte de falla registrado correctamente.');
			onSaved?.(savedReport);
			onClose();
		} catch (error) {
			setSubmitError(describeError(error));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
			<div role="dialog" aria-modal="true" aria-labelledby="failure-report-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-[#102637] p-5 shadow-2xl">
				<div className="mb-5 flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-400/10 text-red-300"><AlertTriangle size={17} /></span>
						<div>
							<h2 id="failure-report-title" className="text-[15px] font-semibold text-white">Reportar Falla</h2>
							<p className="mt-1 text-[10px] text-slate-400">Registra el activo y los detalles observados.</p>
						</div>
					</div>
					<button type="button" onClick={onClose} disabled={submitting} title="Cerrar" aria-label="Cerrar reporte de falla" className="text-slate-400 hover:text-white disabled:opacity-50"><X size={18} /></button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="failure-asset-search" className="mb-1 block text-[10px] font-medium text-slate-300">Buscar activo</label>
						<div className="relative mb-2">
							<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
							<input id="failure-asset-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, serial, ubicación o responsable" className={`${inputClass} pl-8`} />
						</div>
						<label htmlFor="failure-asset" className="sr-only">Activo para el reporte</label>
						<select id="failure-asset" name="assetId" required value={form.assetId} onChange={updateField} disabled={assetsLoading || Boolean(assetError)} className={inputClass}>
							<option value="">{assetsLoading ? 'Cargando activos...' : 'Selecciona un activo'}</option>
							{filteredAssets.map((asset) => (
								<option key={asset.id} value={asset.id}>
									{asset.name}{asset.serialNumber ? ` · ${asset.serialNumber}` : ''}{asset.assignedToCurrentUser ? ' · Asignado a ti' : ` · ${asset.responsibleName}`}
								</option>
							))}
						</select>
						{assetError && <p className="mt-2 text-[10px] text-red-200" role="alert">No se pudieron cargar los activos: {assetError}</p>}
						{!assetsLoading && !assetError && filteredAssets.length === 0 && <p className="mt-2 text-[10px] text-slate-400">No hay activos que coincidan con la búsqueda.</p>}
					</div>

					{(isAdministrator || groups.length !== 1 || groupsLoading || groupError) && (
						<div>
							<label htmlFor="failure-group" className="mb-1 block text-[10px] font-medium text-slate-300">
								Grupo o zona de atención{isAdministrator || groups.length > 1 ? ' *' : ''}
							</label>
							<select
								id="failure-group"
								name="groupId"
								required={isAdministrator || groups.length > 1}
								value={form.groupId}
								onChange={updateField}
								disabled={groupsLoading || Boolean(groupError) || groups.length === 0}
								className={inputClass}
							>
								<option value="">
									{groupsLoading ? 'Cargando grupos...' : groups.length ? 'Selecciona un grupo' : 'No hay grupos activos'}
								</option>
								{groups.map((group) => (
									<option key={group.id} value={group.id}>{group.name}</option>
								))}
							</select>
							{groupError && <p className="mt-2 text-[10px] text-red-200" role="alert">No se pudieron cargar los grupos: {groupError}</p>}
							{!groupsLoading && !groupError && groups.length === 0 && (
								<p className="mt-2 text-[10px] text-red-200" role="alert">No hay un grupo activo disponible para asignar esta falla.</p>
							)}
						</div>
					)}

					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label htmlFor="failure-type" className="mb-1 block text-[10px] font-medium text-slate-300">Tipo de falla</label>
							<input id="failure-type" name="tipoFalla" required maxLength={120} value={form.tipoFalla} onChange={updateField} placeholder="Ej. Falla hidráulica" className={inputClass} />
						</div>
						<div>
							<label htmlFor="failure-priority" className="mb-1 block text-[10px] font-medium text-slate-300">Prioridad</label>
							<select id="failure-priority" name="prioridad" value={form.prioridad} onChange={updateField} className={inputClass}>
								{PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
							</select>
						</div>
					</div>

					<div>
						<label htmlFor="failure-description" className="mb-1 block text-[10px] font-medium text-slate-300">Descripción</label>
						<textarea id="failure-description" name="descripcion" required maxLength={5000} rows={4} value={form.descripcion} onChange={updateField} placeholder="Describe la falla observada y sus efectos..." className={`${inputClass} resize-y`} />
					</div>

					<div>
						<label htmlFor="failure-evidence" className="mb-1 block text-[10px] font-medium text-slate-300">Evidencia fotográfica <span className="font-normal text-slate-500">(opcional)</span></label>
						<div className="flex items-center gap-3 rounded-md border border-white/10 bg-[#081723] px-3 py-2">
							<ImagePlus size={16} className="shrink-0 text-cyan-300" />
							<input id="failure-evidence" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEvidenceChange} className="min-w-0 flex-1 text-[10px] text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-cyan-500/15 file:px-2 file:py-1 file:text-[10px] file:font-medium file:text-cyan-200" />
						</div>
						{evidence && <p className="mt-1 text-[10px] text-slate-400">{evidence.name} · {(evidence.size / (1024 * 1024)).toFixed(1)} MB</p>}
						<p className="mt-1 text-[9px] text-slate-500">JPG, PNG o WEBP. Máximo 10 MB.</p>
					</div>

					{submitError && <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[10px] text-red-200">{submitError}</p>}
					<div className="flex justify-end gap-2 border-t border-white/10 pt-4">
						<button type="button" disabled={submitting} onClick={onClose} className="rounded-md border border-white/10 px-3 py-2 text-[10px] font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50">Cancelar</button>
						<button type="submit" disabled={submitting || assetsLoading || Boolean(assetError) || !assets.length || groupsLoading || Boolean(groupError) || groups.length === 0} className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50">
							{submitting && <LoaderCircle size={13} className="animate-spin" />}{submitting ? 'Enviando...' : 'Enviar reporte'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
