import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileDown, LoaderCircle, Settings2, ShieldAlert, Table2 } from 'lucide-react';
import { Badge, Button, Card } from './ui';
import { API_ORIGIN, getAssets, isFailureReportAdministrator } from '../services/assetService';
import { getLatestDiagnoses } from '../services/diagnosisService';
import { classificationTone } from '../services/diagnosis';
import { INVENTORY_CODE_STATUS_LABELS } from '../services/assetSpecs';
import { getReportSettings, loadPhotoForPdf, withDefaults } from '../services/reportSettings';
import {
	buildAssetSheetPdf,
	buildFullReportPdf,
	buildMatrixPdf,
	buildOpenNeedsPdf,
	matrixClassification,
	openNeeds,
	reportFileName,
} from '../services/technicalReportPdf';
import ReportSettingsModal from './ReportSettingsModal';

function describeError(error) {
	return error.response?.data?.message || error.response?.data?.detail || error.message || 'No se pudieron cargar los datos.';
}

const slug = (text) => String(text || 'equipo')
	.normalize('NFD').replace(/\p{M}/gu, '')
	.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50);

/** Descarga fotos de a pocas para no saturar la red del celular. */
async function loadPhotos(entries, onProgress) {
	const photos = new Map();
	const pending = entries.filter(({ asset }) => asset.imageUrl);
	let done = 0;
	const worker = async () => {
		while (pending.length) {
			const { asset } = pending.shift();
			photos.set(asset.id, await loadPhotoForPdf(`${API_ORIGIN}${asset.imageUrl}`));
			done += 1;
			onProgress(done);
		}
	};
	await Promise.all([worker(), worker(), worker()]);
	return photos;
}

/**
 * Informe técnico de maquinaria: ficha de diagnóstico por equipo, matriz consolidada,
 * necesidades pendientes e informe completo en PDF.
 */
export default function TechnicalReportPanel() {
	const [assets, setAssets] = useState([]);
	const [diagnoses, setDiagnoses] = useState([]);
	const [settings, setSettings] = useState(() => withDefaults({}));
	const [state, setState] = useState({ loading: true, error: '' });
	const [includeInactive, setIncludeInactive] = useState(false);
	const [onlyDiagnosed, setOnlyDiagnosed] = useState(false);
	const [busy, setBusy] = useState('');
	const [notice, setNotice] = useState('');
	const [showSettings, setShowSettings] = useState(false);
	const canConfigure = isFailureReportAdministrator();

	useEffect(() => {
		let active = true;
		Promise.allSettled([getAssets(), getLatestDiagnoses(), getReportSettings()]).then(([assetResult, diagnosisResult, settingsResult]) => {
			if (!active) return;
			if (assetResult.status === 'fulfilled') setAssets(assetResult.value);
			if (diagnosisResult.status === 'fulfilled') setDiagnoses(diagnosisResult.value);
			if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value);
			const failed = [assetResult, diagnosisResult].find((result) => result.status === 'rejected');
			setState({ loading: false, error: failed ? describeError(failed.reason) : '' });
		});
		return () => {
			active = false;
		};
	}, []);

	const entries = useMemo(() => {
		const byAsset = new Map(diagnoses.map((diagnosis) => [diagnosis.assetId, diagnosis]));
		return assets
			.filter((asset) => includeInactive || asset.isActive)
			.map((asset) => ({ asset, diagnosis: byAsset.get(asset.id) || null }))
			.filter((entry) => !onlyDiagnosed || entry.diagnosis)
			.sort((left, right) =>
				String(left.asset.categoryName || '').localeCompare(String(right.asset.categoryName || ''), 'es')
				|| left.asset.name.localeCompare(right.asset.name, 'es'));
	}, [assets, diagnoses, includeInactive, onlyDiagnosed]);

	const stats = useMemo(() => {
		const disposal = entries.filter(({ diagnosis }) =>
			diagnosis && ['EVALUATE_DISPOSAL', 'RECOMMENDED_DISPOSAL'].includes(diagnosis.recommendation)).length;
		const needs = openNeeds(entries);
		return {
			total: entries.length,
			diagnosed: entries.filter((entry) => entry.diagnosis).length,
			disposal,
			highNeeds: needs.filter(({ need }) => need.priority === 'ALTA').length,
			safety: needs.filter(({ need }) => need.safetyRelated).length,
		};
	}, [entries]);

	const run = async (key, task) => {
		setBusy(key);
		setNotice('');
		try {
			await task();
		} catch (error) {
			setNotice(`No se pudo generar el PDF: ${describeError(error)}`);
		} finally {
			setBusy('');
		}
	};

	const downloadSheet = (entry, index) => run(`sheet-${entry.asset.id}`, async () => {
		const photo = entry.asset.imageUrl ? await loadPhotoForPdf(`${API_ORIGIN}${entry.asset.imageUrl}`) : null;
		buildAssetSheetPdf({ ...entry, photo }, settings, index + 1)
			.save(reportFileName(`Ficha_${String(index + 1).padStart(2, '0')}_${slug(entry.asset.name)}`));
	});

	const downloadFull = () => run('full', async () => {
		const withPhotos = entries.filter(({ asset }) => asset.imageUrl).length;
		const photos = await loadPhotos(entries, (done) => setBusy(`full:${done}/${withPhotos}`));
		setBusy('full:pdf');
		await new Promise((resolve) => window.setTimeout(resolve, 30));
		buildFullReportPdf(entries.map((entry) => ({ ...entry, photo: photos.get(entry.asset.id) || null })), settings)
			.save(reportFileName('Informe_tecnico_maquinaria'));
		const missingPhotos = withPhotos - [...photos.values()].filter(Boolean).length;
		if (missingPhotos > 0) setNotice(`Informe generado. ${missingPhotos} foto(s) no se pudieron descargar y se omitieron.`);
	});

	const busyLabel = busy.startsWith('full:')
		? (busy === 'full:pdf' ? 'Armando el PDF...' : `Descargando fotos ${busy.slice(5)}...`)
		: 'Generando...';

	return (
		<Card as="article" className="space-y-5 p-5 sm:p-6">
			<div className="flex flex-col gap-3 border-b border-sand-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="flex items-center gap-2 text-base font-bold text-ink-900 sm:text-lg">
						<ClipboardList size={20} className="text-ocean-700" />
						<span>Informe técnico de maquinaria</span>
					</h2>
					<p className="mt-1.5 text-sm text-ink-600">
						Fichas de diagnóstico por equipo, matriz consolidada y necesidades pendientes, con el formato institucional.
					</p>
				</div>
				{canConfigure && (
					<Button type="button" variant="ghost" onClick={() => setShowSettings(true)} className="min-h-[44px] shrink-0">
						<Settings2 size={16} /> Configurar informe
					</Button>
				)}
			</div>

			{state.error && <p role="alert" className="rounded-lg bg-error-soft p-3 text-sm text-error-text">{state.error}</p>}
			{notice && <p role="status" className="rounded-lg bg-info-soft p-3 text-sm text-ocean-700">{notice}</p>}

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
				{[
					['Equipos', stats.total],
					['Con diagnóstico', stats.diagnosed],
					['Para evaluar baja', stats.disposal],
					['Necesidades altas', stats.highNeeds],
					['De seguridad', stats.safety],
				].map(([label, value]) => (
					<div key={label} className="rounded-xl border border-sand-200 bg-sand-50 p-3">
						<p className="text-[11px] font-semibold uppercase tracking-wider text-ink-600">{label}</p>
						<p className="mt-1 text-xl font-bold text-ink-900">{state.loading ? '…' : value}</p>
					</div>
				))}
			</div>

			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-wrap gap-x-5 gap-y-1">
					<label className="inline-flex min-h-[40px] items-center gap-2 text-sm text-ink-600">
						<input type="checkbox" checked={onlyDiagnosed} onChange={(event) => setOnlyDiagnosed(event.target.checked)} className="h-4 w-4 accent-gold-500" />
						Solo equipos con diagnóstico
					</label>
					<label className="inline-flex min-h-[40px] items-center gap-2 text-sm text-ink-600">
						<input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} className="h-4 w-4 accent-gold-500" />
						Incluir equipos inactivos
					</label>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Button type="button" onClick={downloadFull} disabled={Boolean(busy) || state.loading || !entries.length} className="min-h-[44px] whitespace-nowrap">
						{busy.startsWith('full') ? <LoaderCircle size={16} className="animate-spin" /> : <FileDown size={16} />}
						{busy.startsWith('full') ? busyLabel : 'Informe completo'}
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={Boolean(busy) || state.loading || !entries.length}
						onClick={() => run('matrix', async () => buildMatrixPdf(entries, settings).save(reportFileName('Matriz_estado_equipos')))}
						className="min-h-[44px] whitespace-nowrap"
					>
						<Table2 size={16} /> Matriz consolidada
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={Boolean(busy) || state.loading || !entries.length}
						onClick={() => run('needs', async () => buildOpenNeedsPdf(entries, settings).save(reportFileName('Necesidades_pendientes')))}
						className="min-h-[44px] whitespace-nowrap"
					>
						<ShieldAlert size={16} /> Necesidades pendientes
					</Button>
				</div>
			</div>

			{state.loading ? (
				<p className="py-8 text-center text-sm text-ink-600">Cargando equipos y diagnósticos...</p>
			) : entries.length === 0 ? (
				<p className="rounded-lg border border-dashed border-sand-200 p-6 text-center text-sm text-ink-600">
					No hay equipos para el informe con los filtros elegidos.
				</p>
			) : (
				<ol className="divide-y divide-sand-200 rounded-xl border border-sand-200">
					{entries.map((entry, index) => (
						<li key={entry.asset.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="min-w-0">
								<p className="text-sm font-semibold text-ink-900">
									<span className="mr-2 text-ink-600">{index + 1}.</span>
									{entry.asset.name}
								</p>
								<div className="mt-1 flex flex-wrap items-center gap-1.5">
									<Badge size="sm" variant={entry.diagnosis ? classificationTone(entry.diagnosis.operationalCondition, entry.diagnosis.recommendation) : 'neutral'}>
										{matrixClassification(entry.asset, entry.diagnosis)}
									</Badge>
									<span className="text-xs text-ink-600">{entry.asset.inventoryCode || INVENTORY_CODE_STATUS_LABELS[entry.asset.inventoryCodeStatus] || 'Sin código'}</span>
								</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => downloadSheet(entry, index)}
								disabled={Boolean(busy)}
								aria-label={`Descargar ficha de ${entry.asset.name}`}
								className="shrink-0 self-start sm:self-auto"
							>
								{busy === `sheet-${entry.asset.id}` ? <LoaderCircle size={15} className="animate-spin" /> : <FileDown size={15} />}
								Ficha PDF
							</Button>
						</li>
					))}
				</ol>
			)}

			{showSettings && (
				<ReportSettingsModal
					settings={settings}
					onClose={() => setShowSettings(false)}
					onSaved={(saved) => {
						setSettings(saved);
						setShowSettings(false);
						setNotice('Configuración del informe guardada.');
					}}
				/>
			)}
		</Card>
	);
}
