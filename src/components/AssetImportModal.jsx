import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileDown, FileSpreadsheet, LoaderCircle, Upload, XCircle } from 'lucide-react';
import { Badge, Button, Modal } from './ui';
import {
	createAsset,
	createCategory,
	getAssets,
	getCategories,
	getCategorySpecTemplate,
	getSpecPresets,
	getUsers,
	saveCategorySpecTemplate,
} from '../services/assetService';
import { createDiagnosis } from '../services/diagnosisService';
import { classificationTone } from '../services/diagnosis';
import {
	analyzeImport,
	buildImportWorkbook,
	buildIssuesWorkbook,
	parseImportFile,
	toAssetPayload,
	toDiagnosisPayload,
} from '../services/assetImport';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const fieldClass =
	'mt-1 w-full rounded-lg border border-sand-200 bg-sand-50 px-3 py-2.5 text-xs sm:text-sm text-ink-900 outline-none focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25 min-h-[44px]';

function describeError(error) {
	return error.response?.data?.message || error.response?.data?.detail || error.message || 'Error desconocido.';
}

function downloadBytes(bytes, filename) {
	const url = URL.createObjectURL(new Blob([bytes], { type: XLSX_TYPE }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const ISSUE_STYLE = {
	error: { icon: XCircle, className: 'text-error-text' },
	warning: { icon: AlertTriangle, className: 'text-gold-600' },
	info: { icon: CheckCircle2, className: 'text-ocean-700' },
};

/**
 * Importación masiva de equipos (y sus diagnósticos y necesidades) desde Excel:
 * plantilla → vista previa con inconsistencias → importación con progreso.
 */
export default function AssetImportModal({ isOpen, onClose, onImported }) {
	const [context, setContext] = useState(null);
	const [contextError, setContextError] = useState('');
	const [defaultResponsibleId, setDefaultResponsibleId] = useState('');
	const [skipExisting, setSkipExisting] = useState(true);
	const [parsed, setParsed] = useState(null);
	const [fileName, setFileName] = useState('');
	const [fileError, setFileError] = useState('');
	const [progress, setProgress] = useState(null);
	const [results, setResults] = useState(null);

	useEffect(() => {
		if (!isOpen) return undefined;
		let active = true;
		Promise.all([getCategories(), getUsers(), getAssets(), getSpecPresets()])
			.then(([categories, users, assets, presets]) => {
				if (active) setContext({ categories, users, assets, presets });
			})
			.catch((error) => {
				if (active) setContextError(describeError(error));
			});
		return () => {
			active = false;
		};
	}, [isOpen]);

	const analysis = useMemo(() => {
		if (!parsed || !context) return null;
		return analyzeImport(parsed, { ...context, defaultResponsibleId: Number(defaultResponsibleId) || null });
	}, [parsed, context, defaultResponsibleId]);

	const importable = useMemo(
		() => (analysis?.items || []).filter((item) => !item.hasErrors && !(skipExisting && item.resolution.existingAsset)),
		[analysis, skipExisting],
	);

	if (!isOpen) return null;

	const stats = analysis && {
		total: analysis.items.length,
		errors: analysis.items.filter((item) => item.hasErrors).length + analysis.generalIssues.filter((entry) => entry.level === 'error').length,
		warnings: analysis.items.filter((item) => item.issues.some((entry) => entry.level === 'warning')).length,
		existing: analysis.items.filter((item) => item.resolution.existingAsset).length,
		diagnoses: importable.filter((item) => item.diagnosis).length,
		needs: importable.reduce((total, item) => total + (item.diagnosis ? item.needs.length : 0), 0),
	};

	const chooseFile = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		setFileError('');
		setResults(null);
		try {
			setParsed(parseImportFile(await file.arrayBuffer()));
			setFileName(file.name);
		} catch (error) {
			setParsed(null);
			setFileError(error.message);
		}
	};

	const runImport = async () => {
		const outcome = [];
		const categoryIds = new Map();
		const templates = new Map();
		const templateFor = async (categoryId) => {
			if (!templates.has(categoryId)) {
				templates.set(categoryId, await getCategorySpecTemplate(categoryId).catch(() => []));
			}
			return templates.get(categoryId);
		};

		setProgress({ done: 0, total: importable.length, step: 'Creando categorías...' });
		const neededCategories = analysis.newCategories.filter((category) =>
			importable.some((item) => item.resolution.newCategoryKey === category.key));
		for (const category of neededCategories) {
			try {
				const created = await createCategory({ name: category.name, description: 'Creada por importación desde Excel.', maintenanceFrequencyDays: 90 });
				const preset = context.presets.find((item) => item.key === category.presetKey);
				if (preset) await saveCategorySpecTemplate(created.id, preset.fields);
				categoryIds.set(category.key, created.id);
			} catch (error) {
				categoryIds.set(category.key, { error: describeError(error) });
			}
		}

		for (const [index, item] of importable.entries()) {
			setProgress({ done: index, total: importable.length, step: `Importando ${item.fields.name}...` });
			try {
				let categoryId = item.resolution.categoryId;
				if (!categoryId) {
					const created = categoryIds.get(item.resolution.newCategoryKey);
					if (!created || created.error) throw new Error(`No se pudo crear la categoría: ${created?.error || 'desconocido'}`);
					categoryId = created;
				}
				const { payload, warnings } = toAssetPayload(item, {
					categoryId,
					responsibleId: item.resolution.responsibleId,
					template: await templateFor(categoryId),
				});
				const asset = await createAsset(payload);
				let diagnosisError = '';
				if (item.diagnosis) {
					try {
						await createDiagnosis(toDiagnosisPayload(item, asset.id));
					} catch (error) {
						diagnosisError = describeError(error);
					}
				}
				outcome.push({ item, ok: true, warnings, diagnosisError });
			} catch (error) {
				outcome.push({ item, ok: false, error: describeError(error) });
			}
		}
		setProgress(null);
		setResults(outcome);
		if (outcome.some((entry) => entry.ok)) onImported?.();
	};

	const downloadTemplate = () => downloadBytes(
		buildImportWorkbook({ presets: context?.presets || [] }),
		'Plantilla_importacion_equipos.xlsx',
	);

	const close = () => {
		if (progress) return;
		setParsed(null);
		setResults(null);
		setFileName('');
		onClose();
	};

	return (
		<Modal isOpen onClose={close} size="xl" title="Importar equipos desde Excel" description="Equipos, datos técnicos, diagnósticos y necesidades en un solo archivo.">
			<div className="space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
				{contextError && <p role="alert" className="rounded-lg bg-error-soft p-3 text-sm text-error-text">No se pudo preparar la importación: {contextError}</p>}

				{results ? (
					<ImportResults results={results} onClose={close} />
				) : (
					<>
						<section className="grid gap-3 sm:grid-cols-2">
							<div className="rounded-xl border border-sand-200 bg-sand-50 p-4">
								<p className="text-sm font-semibold text-ink-900">1. Prepara el archivo</p>
								<p className="mt-1 text-xs text-ink-600">
									La plantilla trae las instrucciones, las columnas y los valores válidos (clasificaciones, tipos de intervención...).
								</p>
								<Button type="button" variant="ghost" onClick={downloadTemplate} disabled={!context} className="mt-3 min-h-[44px]">
									<FileDown size={16} /> Descargar plantilla
								</Button>
							</div>
							<div className="rounded-xl border border-sand-200 bg-sand-50 p-4">
								<p className="text-sm font-semibold text-ink-900">2. Carga el archivo lleno</p>
								<label className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-gold-500 px-4 text-sm font-semibold text-pine-900 hover:bg-gold-600">
									<Upload size={16} /> {fileName ? 'Cambiar archivo' : 'Elegir archivo .xlsx'}
									<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={chooseFile} className="sr-only" disabled={!context} />
								</label>
								{fileName && <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-600"><FileSpreadsheet size={14} /> {fileName}</p>}
								{fileError && <p role="alert" className="mt-2 text-xs text-error-text">{fileError}</p>}
							</div>
						</section>

						<section className="grid gap-3 sm:grid-cols-2">
							<label className="block text-xs font-medium text-ink-600">
								<span>Responsable por defecto *</span>
								<select value={defaultResponsibleId} onChange={(event) => setDefaultResponsibleId(event.target.value)} className={fieldClass}>
									<option value="">Selecciona un responsable</option>
									{(context?.users || []).map((user) => (
										<option key={user.id} value={user.id}>{user.nombre}</option>
									))}
								</select>
								<span className="mt-1 block text-[11px]">Se usa en las filas sin responsable o con uno que no existe.</span>
							</label>
							<label className="inline-flex min-h-[44px] items-center gap-2 self-center text-sm text-ink-600">
								<input type="checkbox" checked={skipExisting} onChange={(event) => setSkipExisting(event.target.checked)} className="h-4 w-4 accent-gold-500" />
								Omitir equipos que ya existen (mismo código de inventario)
							</label>
						</section>

						{analysis && (
							<>
								<div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
									{[
										['En el archivo', stats.total],
										['A importar', importable.length],
										['Con errores', stats.errors],
										['Con advertencias', stats.warnings],
										['Diagnósticos', stats.diagnoses],
										['Necesidades', stats.needs],
									].map(([label, value]) => (
										<div key={label} className="rounded-lg border border-sand-200 bg-sand-50 p-2.5">
											<p className="text-[10px] font-semibold uppercase tracking-wider text-ink-600">{label}</p>
											<p className="text-lg font-bold text-ink-900">{value}</p>
										</div>
									))}
								</div>

								{analysis.newCategories.length > 0 && (
									<p className="rounded-lg bg-info-soft px-3 py-2 text-xs text-ocean-700">
										Categorías nuevas: {analysis.newCategories.map((category) => category.name).join(', ')}.
									</p>
								)}
								{analysis.generalIssues.map((entry) => (
									<p key={entry.message} className="rounded-lg bg-error-soft px-3 py-2 text-xs text-error-text">{entry.message}</p>
								))}

								<ol className="max-h-[42dvh] divide-y divide-sand-200 overflow-y-auto rounded-xl border border-sand-200">
									{analysis.items.map((item) => {
										const skipped = skipExisting && item.resolution.existingAsset;
										const visibleIssues = item.issues.filter((entry) => entry.level !== 'info');
										return (
											<li key={item.rowNumber} className={`p-3 ${item.hasErrors || skipped ? 'opacity-70' : ''}`}>
												<div className="flex flex-wrap items-center justify-between gap-2">
													<p className="min-w-0 text-sm font-semibold text-ink-900">
														<span className="mr-1.5 text-ink-600">{item.no}.</span>{item.fields.name || '(sin nombre)'}
														<span className="ml-2 text-xs font-normal text-ink-600">{item.fields.category}</span>
													</p>
													<div className="flex flex-wrap gap-1.5">
														{item.diagnosis && (
															<Badge size="sm" variant={classificationTone(item.diagnosis.condition, item.diagnosis.recommendation)}>
																{item.diagnosis.label}
															</Badge>
														)}
														{item.needs.length > 0 && <Badge size="sm">{item.needs.length} necesidad(es)</Badge>}
														{item.hasErrors && <Badge size="sm" variant="error">No se importará</Badge>}
														{skipped && <Badge size="sm" variant="neutral">Ya existe</Badge>}
													</div>
												</div>
												{visibleIssues.length > 0 && (
													<ul className="mt-2 space-y-1">
														{visibleIssues.map((entry) => {
															const { icon: Icon, className } = ISSUE_STYLE[entry.level];
															return (
																<li key={entry.message} className="flex items-start gap-1.5 text-xs text-ink-600">
																	<Icon size={13} className={`mt-0.5 shrink-0 ${className}`} aria-hidden="true" />
																	<span>{entry.message}</span>
																</li>
															);
														})}
													</ul>
												)}
											</li>
										);
									})}
								</ol>
							</>
						)}

						{progress && (
							<div className="space-y-1.5" aria-live="polite">
								<p className="flex items-center gap-2 text-xs text-ink-600">
									<LoaderCircle size={14} className="animate-spin" /> {progress.step} ({progress.done}/{progress.total})
								</p>
								<div className="h-1.5 overflow-hidden rounded-full bg-sand-200">
									<div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${(100 * progress.done) / Math.max(1, progress.total)}%` }} />
								</div>
							</div>
						)}

						<div className="flex flex-col-reverse gap-2.5 border-t border-sand-200 pt-4 sm:flex-row sm:justify-end">
							{analysis && (
								<Button
									type="button"
									variant="ghost"
									onClick={() => downloadBytes(buildIssuesWorkbook(analysis), 'Inconsistencias_importacion.xlsx')}
									disabled={Boolean(progress)}
									className="min-h-[44px]"
								>
									<FileDown size={16} /> Descargar inconsistencias
								</Button>
							)}
							<Button
								type="button"
								onClick={runImport}
								disabled={!analysis || !importable.length || Boolean(progress) || !defaultResponsibleId}
								className="min-h-[44px]"
							>
								{progress ? 'Importando...' : `Importar ${importable.length} equipo(s)`}
							</Button>
						</div>
						{analysis && !defaultResponsibleId && (
							<p className="text-right text-xs text-ink-600">Elige el responsable por defecto para continuar.</p>
						)}
					</>
				)}
			</div>
		</Modal>
	);
}

function ImportResults({ results, onClose }) {
	const ok = results.filter((entry) => entry.ok);
	const failed = results.filter((entry) => !entry.ok);
	const withDiagnosisError = ok.filter((entry) => entry.diagnosisError);
	const notes = ok.flatMap((entry) => entry.warnings.map((warning) => `${entry.item.fields.name}: ${warning}`));
	return (
		<div className="space-y-4">
			<p className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-sm text-forest-700">
				<CheckCircle2 size={18} /> {ok.length} equipo(s) importado(s){failed.length ? `, ${failed.length} con error` : ''}.
			</p>
			{[...failed.map((entry) => `${entry.item.no}. ${entry.item.fields.name}: ${entry.error}`),
				...withDiagnosisError.map((entry) => `${entry.item.no}. ${entry.item.fields.name}: el equipo se creó, pero no su diagnóstico (${entry.diagnosisError}).`),
				...notes,
			].map((line) => (
				<p key={line} className="flex items-start gap-1.5 text-xs text-ink-600">
					<AlertTriangle size={13} className="mt-0.5 shrink-0 text-gold-600" aria-hidden="true" /> {line}
				</p>
			))}
			<p className="text-xs text-ink-600">
				Las fotos no se importan: agrégalas desde «Editar» en cada equipo para que aparezcan en las fichas.
			</p>
			<div className="flex justify-end">
				<Button type="button" onClick={onClose} className="min-h-[44px]">Listo</Button>
			</div>
		</div>
	);
}
