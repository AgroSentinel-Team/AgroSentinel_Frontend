import { useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button, Modal } from './ui';
import { imageFileToDataUrl, saveReportSettings } from '../services/reportSettings';

const fieldClass =
	'mt-1 w-full rounded-lg border border-sand-200 bg-sand-50 px-3 py-2.5 text-xs sm:text-sm text-ink-900 outline-none placeholder:text-ink-600 focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25 min-h-[44px]';
const labelClass = 'block text-xs font-medium text-ink-600';

function describeError(error) {
	return error.response?.data?.message || error.response?.data?.detail || error.message || 'No se pudo guardar.';
}

function TextField({ label, value, onChange, placeholder, hint }) {
	return (
		<label className={labelClass}>
			<span>{label}</span>
			<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={fieldClass} />
			{hint && <span className="mt-1 block text-[11px] text-ink-600">{hint}</span>}
		</label>
	);
}

function TextArea({ label, value, onChange, rows = 4, hint }) {
	return (
		<label className={labelClass}>
			<span>{label}</span>
			<textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} resize-y`} />
			{hint && <span className="mt-1 block text-[11px] text-ink-600">{hint}</span>}
		</label>
	);
}

function LogoField({ label, value, onChange, onError }) {
	const choose = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		try {
			onChange(await imageFileToDataUrl(file));
		} catch (error) {
			onError(error.message);
		}
	};
	return (
		<div className={labelClass}>
			<span>{label}</span>
			<div className="mt-1 flex min-h-[64px] items-center gap-3 rounded-lg border border-sand-200 bg-sand-50 p-2">
				{value ? (
					<img src={value} alt={label} className="h-12 max-w-[140px] rounded bg-white object-contain p-1" />
				) : (
					<span className="text-[11px] text-ink-600">Sin logo</span>
				)}
				<label className="ml-auto inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-md bg-info-soft px-3 text-xs font-medium text-ocean-700 hover:bg-gold-600/20">
					<ImagePlus size={14} /> {value ? 'Cambiar' : 'Subir'}
					<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choose} className="sr-only" />
				</label>
				{value && (
					<button
						type="button"
						onClick={() => onChange(null)}
						aria-label={`Quitar ${label}`}
						className="flex size-10 items-center justify-center rounded-lg text-ink-600 hover:bg-error-soft hover:text-error-text"
					>
						<Trash2 size={15} />
					</button>
				)}
			</div>
		</div>
	);
}

/** Datos institucionales y textos del informe técnico, compartidos por todos los administradores. */
export default function ReportSettingsModal({ settings, onClose, onSaved }) {
	const [form, setForm] = useState(settings);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

	const save = async () => {
		setSaving(true);
		setError('');
		try {
			onSaved(await saveReportSettings(form));
		} catch (requestError) {
			setError(describeError(requestError));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal
			isOpen
			onClose={onClose}
			size="xl"
			title="Configurar informe técnico"
			description="Encabezado, textos y firma de los PDF. Se comparte con todos los administradores."
			footer={(
				<div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
					<Button type="button" variant="ghost" onClick={onClose} className="min-h-[44px]">Cancelar</Button>
					<Button type="button" onClick={save} disabled={saving} className="min-h-[44px]">
						{saving ? 'Guardando...' : 'Guardar configuración'}
					</Button>
				</div>
			)}
		>
			<div className="space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
				<section className="space-y-3">
					<h4 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">Encabezado y pie de página</h4>
					<div className="grid gap-3 sm:grid-cols-2">
						<LogoField label="Logo principal" value={form.logoPrimary} onChange={set('logoPrimary')} onError={setError} />
						<LogoField label="Logo secundario (acreditación, aliado...)" value={form.logoSecondary} onChange={set('logoSecondary')} onError={setError} />
						<TextField label="Institución" value={form.institutionName} onChange={set('institutionName')} placeholder="Universidad, empresa o finca" />
						<TextField label="Dependencia" value={form.unitName} onChange={set('unitName')} placeholder="Facultad, área o departamento" />
						<TextField label="Unidad productiva" value={form.farmName} onChange={set('farmName')} placeholder="Granja, finca o sede" />
						<TextField label="Pie de foto" value={form.photoCaption} onChange={set('photoCaption')} />
					</div>
					<TextArea
						label="Pie de página"
						value={form.footerText}
						onChange={set('footerText')}
						rows={3}
						hint="Hasta 4 líneas: dirección, sede, NIT, sitio web..."
					/>
				</section>

				<section className="space-y-3">
					<h4 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">Contenido del informe completo</h4>
					<TextField label="Título del informe" value={form.reportTitle} onChange={set('reportTitle')} />
					<TextArea label="Introducción" value={form.introduction} onChange={set('introduction')} />
					<TextArea label="Objetivo general" value={form.generalObjective} onChange={set('generalObjective')} rows={3} />
					<TextArea label="Objetivos específicos" value={form.specificObjectives} onChange={set('specificObjectives')} hint="Uno por línea." />
					<TextArea label="Metodología" value={form.methodology} onChange={set('methodology')} rows={5} />
					<TextArea label="Observación final sobre los equipos para baja" value={form.finalObservation} onChange={set('finalObservation')} />
					<TextArea label="Recomendaciones generales" value={form.generalRecommendations} onChange={set('generalRecommendations')} rows={5} hint="Una por línea." />
				</section>

				<section className="space-y-3">
					<h4 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">Firma</h4>
					<div className="grid gap-3 sm:grid-cols-2">
						<TextField label="Elaboró" value={form.preparedBy} onChange={set('preparedBy')} placeholder="Nombre de quien firma" />
						<TextField label="Cargo" value={form.preparedByRole} onChange={set('preparedByRole')} placeholder="Coordinador de la granja" />
					</div>
				</section>

				{error && <p role="alert" className="rounded-lg border border-error/20 bg-error-soft p-3 text-xs text-error-text">{error}</p>}
			</div>
		</Modal>
	);
}
