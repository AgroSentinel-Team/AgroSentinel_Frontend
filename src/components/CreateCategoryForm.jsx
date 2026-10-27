import { useState } from 'react';
import { X } from 'lucide-react';
import { createCategory } from '../services/assetService';

const fieldClass =
    'mt-1 w-full rounded-lg border border-white/10 bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

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
            onCreated(category);
        } catch (requestError) {
            setError(describeError(requestError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-y-auto"
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="category-form-title"
                className="relative my-auto max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-[#102637] p-4 sm:p-6 shadow-2xl transition-all min-w-0"
            >
                {/* Header Modal */}
                <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                    <div className="min-w-0">
                        <h3 id="category-form-title" className="text-base sm:text-lg font-semibold text-white truncate">
                            Nueva categoría
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                            La categoría quedará activa para seleccionarla en los formularios.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        title="Cerrar"
                        aria-label="Cerrar formulario de categoría"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <label className="block text-xs font-medium text-slate-300">
                        <span>
                            Nombre <span className="text-cyan-400">*</span>
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

                    <label className="block text-xs font-medium text-slate-300">
                        <span>Descripción</span>
                        <textarea
                            rows="3"
                            maxLength="500"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            className={`${fieldClass} min-h-[80px] resize-y`}
                        />
                    </label>

                    <label className="block text-xs font-medium text-slate-300">
                        <span>
                            Frecuencia de mantenimiento preventivo (días) <span className="text-cyan-400">*</span>
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

                    {error && (
                        <p
                            role="alert"
                            className="rounded-lg border border-red-400/20 bg-red-400/10 p-3.5 text-xs text-red-200"
                        >
                            {error}
                        </p>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-medium text-slate-300 hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-cyan-600 px-5 text-xs font-medium text-white hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-cyan-950/40"
                        >
                            {saving ? 'Guardando...' : 'Guardar categoría'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}