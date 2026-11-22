import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { getCategorySpecTemplate, getSpecPresets, saveCategorySpecTemplate } from '../services/assetService';
import { editableFieldsToPayload, newCustomKey, SPEC_TYPE_LABELS, toEditableFields } from '../services/assetSpecs';

const fieldClass =
    'w-full rounded-lg border border-sand-200 bg-surface px-3 py-2 text-xs sm:text-sm text-ink-900 outline-none placeholder:text-ink-600 focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25 min-h-[40px] transition-all duration-200 ease-out';

function describeError(error) {
    return (
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'No se pudo guardar la plantilla.'
    );
}

/**
 * Define qué datos técnicos se piden para los activos de una categoría (potencia, cilindrada,
 * número de discos...). Se puede partir de una plantilla sugerida y ajustarla.
 */
export default function CategorySpecTemplateEditor({ category, onCancel, onSaved }) {
    const [fields, setFields] = useState([]);
    const [presets, setPresets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        Promise.all([getCategorySpecTemplate(category.id), getSpecPresets()])
            .then(([template, presetList]) => {
                if (cancelled) return;
                setFields(toEditableFields(template));
                setPresets(presetList);
            })
            .catch((requestError) => {
                if (!cancelled) setError(describeError(requestError));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [category.id]);

    const applyPreset = (presetKey) => {
        const preset = presets.find((item) => item.key === presetKey);
        if (!preset) return;
        if (fields.length && !window.confirm(`¿Reemplazar los campos actuales por la plantilla "${preset.name}"?`)) {
            return;
        }
        setFields(toEditableFields(preset.fields));
    };

    const updateField = (id, changes) =>
        setFields((current) => current.map((field) => (field.id === id ? { ...field, ...changes } : field)));

    const moveField = (index, direction) =>
        setFields((current) => {
            const target = index + direction;
            if (target < 0 || target >= current.length) return current;
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });

    const removeField = (id) => setFields((current) => current.filter((field) => field.id !== id));

    const addField = () =>
        setFields((current) => [
            ...current,
            { id: newCustomKey(), specKey: '', label: '', dataType: 'TEXT', unit: '', optionsText: '', required: false, helpText: '' },
        ]);

    const save = async () => {
        const incompleteOption = fields.find(
            (field) => field.label.trim() && field.dataType === 'OPTION' && !field.optionsText.trim(),
        );
        if (incompleteOption) {
            setError(`"${incompleteOption.label}" es de selección: escribe sus opciones separadas por coma.`);
            return;
        }
        setSaving(true);
        setError('');
        try {
            const saved = await saveCategorySpecTemplate(category.id, editableFieldsToPayload(fields));
            onSaved?.(saved);
        } catch (requestError) {
            setError(describeError(requestError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[85] flex items-end justify-center bg-pine-900/35 backdrop-blur-xl px-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4 overflow-y-auto"
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="spec-template-title"
                className="relative my-auto max-h-[92dvh] w-full max-w-3xl min-w-0 overflow-y-auto rounded-t-3xl border border-surface/40 bg-surface/80 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl sm:rounded-2xl sm:p-6"
            >
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-sand-200 pb-3.5">
                    <div className="min-w-0">
                        <h3 id="spec-template-title" className="text-base sm:text-lg font-semibold text-ink-900">
                            Datos técnicos de «{category.name}»
                        </h3>
                        <p className="mt-0.5 text-xs text-ink-600">
                            Estos campos aparecerán al registrar activos de esta categoría y en su ficha técnica.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Cerrar plantilla"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-600 hover:bg-sand-100 hover:text-ink-900"
                    >
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <p className="py-8 text-center text-sm text-ink-600">Cargando plantilla...</p>
                ) : (
                    <div className="space-y-4">
                        <label className="block text-xs font-medium text-ink-600">
                            <span>Partir de una plantilla sugerida</span>
                            <select
                                value=""
                                onChange={(event) => applyPreset(event.target.value)}
                                className={`${fieldClass} mt-1`}
                            >
                                <option value="">Elegir familia de equipo...</option>
                                {presets.map((preset) => (
                                    <option key={preset.key} value={preset.key}>
                                        {preset.name} — {preset.description}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {fields.length === 0 && (
                            <p className="rounded-lg border border-dashed border-sand-200 p-4 text-center text-xs text-ink-600">
                                Sin campos todavía. Elige una plantilla sugerida o agrega campos.
                            </p>
                        )}

                        <ol className="space-y-2.5">
                            {fields.map((field, index) => (
                                <li key={field.id} className="rounded-lg border border-sand-200 bg-sand-50 p-3">
                                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_8rem_6rem]">
                                        <input
                                            aria-label="Nombre del campo"
                                            placeholder="Nombre del campo (p. ej. Potencia)"
                                            value={field.label}
                                            onChange={(event) => updateField(field.id, { label: event.target.value })}
                                            maxLength={120}
                                            className={fieldClass}
                                        />
                                        <select
                                            aria-label="Tipo de dato"
                                            value={field.dataType}
                                            onChange={(event) => updateField(field.id, { dataType: event.target.value })}
                                            className={fieldClass}
                                        >
                                            {Object.entries(SPEC_TYPE_LABELS).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                        <input
                                            aria-label="Unidad"
                                            placeholder="Unidad"
                                            value={field.unit}
                                            onChange={(event) => updateField(field.id, { unit: event.target.value })}
                                            maxLength={20}
                                            disabled={field.dataType === 'OPTION'}
                                            className={`${fieldClass} disabled:opacity-50`}
                                        />
                                    </div>
                                    {field.dataType === 'OPTION' && (
                                        <input
                                            aria-label="Opciones separadas por coma"
                                            placeholder="Opciones separadas por coma: Tres puntos, Barra de tiro"
                                            value={field.optionsText}
                                            onChange={(event) => updateField(field.id, { optionsText: event.target.value })}
                                            className={`${fieldClass} mt-2`}
                                        />
                                    )}
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                        <label className="inline-flex min-h-[40px] items-center gap-2 text-xs text-ink-600">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(event) => updateField(field.id, { required: event.target.checked })}
                                                className="h-4 w-4 accent-gold-500"
                                            />
                                            Dato clave (cuenta para la ficha completa)
                                        </label>
                                        <div className="flex gap-1">
                                            <IconButton label="Subir" onClick={() => moveField(index, -1)} disabled={index === 0}>
                                                <ArrowUp size={15} />
                                            </IconButton>
                                            <IconButton label="Bajar" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1}>
                                                <ArrowDown size={15} />
                                            </IconButton>
                                            <IconButton label="Quitar campo" onClick={() => removeField(field.id)}>
                                                <Trash2 size={15} />
                                            </IconButton>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>

                        <button
                            type="button"
                            onClick={addField}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-info-soft px-3 text-xs font-medium text-ocean-700 hover:bg-gold-600/20"
                        >
                            <Plus size={14} /> Agregar campo
                        </button>

                        <p className="text-[11px] leading-relaxed text-ink-600">
                            Quitar un campo no borra lo ya registrado en los activos: esos datos se conservan como
                            datos adicionales.
                        </p>
                    </div>
                )}

                {error && (
                    <p role="alert" className="mt-4 rounded-lg border border-error/20 bg-error-soft p-3 text-xs text-error-text">
                        {error}
                    </p>
                )}

                <div className="mt-5 flex flex-col-reverse gap-2.5 border-t border-sand-200 pt-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-sand-200 px-4 text-xs font-medium text-ink-600 hover:bg-sand-100"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving || loading}
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-gold-500 px-5 text-xs font-medium text-pine-900 hover:bg-gold-600 disabled:opacity-60"
                    >
                        {saving ? 'Guardando...' : 'Guardar plantilla'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function IconButton({ label, onClick, disabled = false, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 hover:bg-sand-100 hover:text-ink-900 disabled:opacity-30"
        >
            {children}
        </button>
    );
}
