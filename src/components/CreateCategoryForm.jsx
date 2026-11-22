import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createCategory, getSpecPresets, saveCategorySpecTemplate } from '../services/assetService';

const fieldClass =
    'mt-1 w-full rounded-lg border border-sand-200 bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink-900 outline-none placeholder:text-ink-600 focus-visible:border-gold-600 focus:ring-1 focus-visible:ring-gold-500/25 min-h-[44px] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed';

function describeError(error) {
    return (
        error.response?.data?.detail ||
        error.response?.data?.message ||
        (typeof error.response?.data === 'string' ? error.response.data : '') ||
        error.message ||
        'No se pudo guardar la categoría.'
    );
}

export default function CreateCategoryForm({ onCreated, onCancel }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [maintenanceFrequencyDays, setMaintenanceFrequencyDays] = useState('90');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [presets, setPresets] = useState([]);
    const [presetKey, setPresetKey] = useState('');

    useEffect(() => {
        let cancelled = false;
        getSpecPresets()
            .then((list) => {
                if (!cancelled) setPresets(list);
            })
            .catch(() => {
                // Sin plantillas sugeridas: la categoría se crea igual y se configura después.
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
            const category = await createCategory({
                name: name.trim(),
                description: description.trim(),
                maintenanceFrequencyDays: Number(maintenanceFrequencyDays),
            });
            const preset = presets.find((item) => item.key === presetKey);
            if (preset) {
                try {
                    await saveCategorySpecTemplate(category.id, preset.fields);
                } catch {
                    // La categoría ya existe; la plantilla se puede aplicar luego desde "Datos técnicos".
                }
            }
            onCreated(category);
        } catch (requestError) {
            setError(describeError(requestError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-pine-900/35 backdrop-blur-xl px-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4 md:p-6 overflow-y-auto"
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="category-form-title"
                className="relative my-auto max-h-[92dvh] w-full max-w-md min-w-0 overflow-y-auto rounded-t-3xl border border-surface/40 bg-surface/70 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl transition-all sm:rounded-2xl sm:p-6"
            >
                {/* Header Modal */}
                <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3 border-b border-sand-200 pb-3.5">
                    <div className="min-w-0">
                        <h3 id="category-form-title" className="text-base sm:text-lg font-semibold text-ink-900 truncate">
                            Nueva categoría
                        </h3>
                        <p className="mt-0.5 text-xs text-ink-600">
                            La categoría quedará activa para seleccionarla en los formularios.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        title="Cerrar"
                        aria-label="Cerrar formulario de categoría"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-600 transition-all duration-200 ease-out hover:bg-sand-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <label className="block text-xs font-medium text-ink-600">
                        <span>
                            Nombre <span className="text-forest-900">*</span>
                        </span>
                        <input
                            autoFocus
                            required
                            maxLength="120"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className={fieldClass}
                        />
                    </label>

                    <label className="block text-xs font-medium text-ink-600">
                        <span>Descripción</span>
                        <textarea
                            rows="3"
                            maxLength="500"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            className={`${fieldClass} min-h-[80px] resize-y`}
                        />
                    </label>

                    <label className="block text-xs font-medium text-ink-600">
                        <span>
                            Frecuencia de mantenimiento preventivo (días) <span className="text-forest-900">*</span>
                        </span>
                        <input
                            type="number"
                            min="1"
                            max="3650"
                            required
                            value={maintenanceFrequencyDays}
                            onChange={(event) => setMaintenanceFrequencyDays(event.target.value)}
                            className={fieldClass}
                        />
                    </label>

                    {presets.length > 0 && (
                        <label className="block text-xs font-medium text-ink-600">
                            <span>Datos técnicos que se pedirán</span>
                            <select
                                value={presetKey}
                                onChange={(event) => setPresetKey(event.target.value)}
                                className={fieldClass}
                            >
                                <option value="">Sin plantilla (configurar después)</option>
                                {presets.map((preset) => (
                                    <option key={preset.key} value={preset.key}>
                                        {preset.name}
                                    </option>
                                ))}
                            </select>
                            <span className="mt-1 block text-[11px] leading-relaxed text-ink-600">
                                {presets.find((item) => item.key === presetKey)?.description ||
                                    'Por ejemplo, para tractores se pide potencia, motor, transmisión y llantas.'}
                            </span>
                        </label>
                    )}

                    {error && (
                        <p
                            role="alert"
                            className="rounded-lg border border-error/20 bg-error-soft p-3.5 text-xs text-error-text"
                        >
                            {error}
                        </p>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-sand-200 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-sand-200 px-4 text-xs font-medium text-ink-600 hover:bg-sand-100 active:bg-sand-100 transition-all duration-200 ease-out"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-gold-500 px-5 text-xs font-medium text-pine-900 hover:bg-gold-600 active:bg-gold-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-out shadow-lg shadow-gold-600/20"
                        >
                            {saving ? 'Guardando...' : 'Guardar categoría'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}