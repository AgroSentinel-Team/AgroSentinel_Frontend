import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createAsset, getCategories, getUsers, updateAsset } from '../services/assetService';
import CreateCategoryForm from './CreateCategoryForm';

const EMPTY_FORM = {
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    extraSpecifications: '',
    categoryId: '',
    responsibleId: '',
    acquisitionDate: '',
    acquisitionCost: '',
    provider: '',
    warrantyExpirationDate: '',
    location: '',
    operationalStatus: 'OPERATIONAL',
    isActive: true,
    hasMotor: false,
};

const STATUS_LABELS = {
    OPERATIONAL: 'Operativo',
    IN_REPAIR: 'En reparación',
    OBSOLETE: 'Obsoleto',
};

const fieldClass =
    'mt-1 w-full rounded-lg border border-white/10 bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function describeError(error) {
    if (error.response?.status === 403) {
        return 'Acceso denegado. Cierra sesión e inicia sesión de nuevo con una cuenta Administrador.';
    }
    if (error.response?.status === 401) {
        return 'El servidor rechazó el token. La sesión permanece abierta; vuelve a iniciar sesión y reintenta.';
    }
    return (
        error.response?.data?.detail ||
        error.response?.data?.message ||
        (typeof error.response?.data === 'string' ? error.response.data : '') ||
        error.message ||
        'Ocurrió un error al comunicarse con el servidor.'
    );
}

function getInitialForm(asset) {
    if (!asset) return EMPTY_FORM;
    return {
        ...EMPTY_FORM,
        ...asset,
        categoryId: String(asset.categoryId),
        responsibleId: String(asset.responsibleId),
        acquisitionDate: asset.acquisitionDate || '',
        acquisitionCost: asset.acquisitionCost ?? '',
        warrantyExpirationDate: asset.warrantyExpirationDate || '',
    };
}

function InputField({ label, name, value, onChange, type = 'text', required = false, min, step }) {
    return (
        <label className="block text-xs font-medium text-slate-300">
            <span>
                {label} {required && <span className="text-cyan-400">*</span>}
            </span>
            <input
                className={fieldClass}
                name={name}
                type={type}
                value={value ?? ''}
                onChange={onChange}
                required={required}
                min={min}
                step={step}
            />
        </label>
    );
}

export default function CreateAssetForm({ asset = null, onCancel, onSaved }) {
    const [form, setForm] = useState(() => getInitialForm(asset));
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [optionsError, setOptionsError] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);

    useEffect(() => {
        let cancelled = false;
        Promise.all([getCategories(), getUsers()])
            .then(([categoryOptions, userOptions]) => {
                if (cancelled) return;
                setCategories(categoryOptions);
                setUsers(userOptions);
            })
            .catch((error) => {
                if (!cancelled) setOptionsError(describeError(error));
            })
            .finally(() => {
                if (!cancelled) setLoadingOptions(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const changeForm = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCategoryCreated = (category) => {
        setCategories((current) => [...current, category].sort((left, right) => left.name.localeCompare(right.name)));
        setForm((current) => ({ ...current, categoryId: String(category.id) }));
        setShowCategoryForm(false);
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setFormError('');
        const payload = {
            ...form,
            categoryId: Number(form.categoryId),
            responsibleId: Number(form.responsibleId),
            acquisitionCost: form.acquisitionCost === '' ? null : Number(form.acquisitionCost),
        };
        try {
            const saved = asset ? await updateAsset(asset.id, payload) : await createAsset(payload);
            onSaved(saved);
        } catch (error) {
            setFormError(describeError(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-y-auto"
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="asset-form-title"
                className="relative my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-[#102637] p-4 sm:p-6 shadow-2xl transition-all min-w-0"
            >
                {/* Header Modal */}
                <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                    <div className="min-w-0">
                        <h3 id="asset-form-title" className="text-base sm:text-lg font-semibold text-white truncate">
                            {asset ? 'Editar activo' : 'Registrar activo'}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                            Completa la ficha técnica, compra, asignación y estado.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        title="Cerrar"
                        aria-label="Cerrar formulario de activo"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {optionsError && (
                    <p
                        role="alert"
                        className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3.5 text-xs text-red-200"
                    >
                        No se pudieron cargar categorías y usuarios: {optionsError}
                    </p>
                )}

                <form onSubmit={submit} className="space-y-5 sm:space-y-6">
                    {/* Ficha técnica */}
                    <div className="rounded-lg bg-[#0a1b28]/60 p-3.5 sm:p-4 border border-white/5 space-y-3.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                            Ficha técnica
                        </h4>
                        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            <InputField label="Nombre" name="name" value={form.name} onChange={changeForm} required />
                            <InputField label="Marca" name="brand" value={form.brand} onChange={changeForm} />
                            <InputField label="Modelo" name="model" value={form.model} onChange={changeForm} />
                            <InputField label="Número de serie" name="serialNumber" value={form.serialNumber} onChange={changeForm} />

                            <label className="block text-xs font-medium text-slate-300">
                                <span>Tiene motor</span>
                                <select
                                    name="hasMotor"
                                    value={String(Boolean(form.hasMotor))}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            hasMotor: event.target.value === 'true',
                                        }))
                                    }
                                    className={fieldClass}
                                >
                                    <option value="false">No</option>
                                    <option value="true">Sí</option>
                                </select>
                                {form.hasMotor && (
                                    <span className="mt-1 block text-[11px] text-cyan-300 font-normal leading-tight">
                                        {asset?.predictiveId
                                            ? `ID predictivo: ${asset.predictiveId}`
                                            : 'El ID predictivo se asignará al guardar el activo.'}
                                    </span>
                                )}
                            </label>

                            <label className="block text-xs font-medium text-slate-300">
                                <span>Categoría <span className="text-cyan-400">*</span></span>
                                <select
                                    name="categoryId"
                                    value={form.categoryId}
                                    onChange={changeForm}
                                    required
                                    disabled={loadingOptions || !categories.length}
                                    className={fieldClass}
                                >
                                    <option value="">
                                        {loadingOptions ? 'Cargando categorías...' : 'Selecciona una categoría'}
                                    </option>
                                    {asset &&
                                        !categories.some(
                                            (category) => String(category.id) === String(asset.categoryId)
                                        ) && (
                                            <option value={String(asset.categoryId)}>
                                                {asset.categoryName} (inactiva)
                                            </option>
                                        )}
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowCategoryForm(true)}
                                    className="mt-2 inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/30 transition-colors"
                                >
                                    <Plus size={14} /> Crear categoría
                                </button>
                            </label>

                            <label className="block text-xs font-medium text-slate-300">
                                <span>Responsable <span className="text-cyan-400">*</span></span>
                                <select
                                    name="responsibleId"
                                    value={form.responsibleId}
                                    onChange={changeForm}
                                    required
                                    disabled={loadingOptions || !users.length}
                                    className={fieldClass}
                                >
                                    <option value="">
                                        {loadingOptions ? 'Cargando usuarios...' : 'Selecciona un responsable'}
                                    </option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.nombre}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label className="block text-xs font-medium text-slate-300 pt-1">
                            <span>Especificaciones adicionales (texto o JSON)</span>
                            <textarea
                                name="extraSpecifications"
                                value={form.extraSpecifications}
                                onChange={changeForm}
                                rows="3"
                                className={`${fieldClass} min-h-[80px] resize-y`}
                            />
                        </label>
                    </div>

                    {/* Adquisición y garantía */}
                    <div className="rounded-lg bg-[#0a1b28]/60 p-3.5 sm:p-4 border border-white/5 space-y-3.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                            Adquisición y garantía
                        </h4>
                        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            <InputField
                                label="Fecha de adquisición"
                                name="acquisitionDate"
                                value={form.acquisitionDate}
                                onChange={changeForm}
                                type="date"
                            />
                            <InputField
                                label="Costo de adquisición"
                                name="acquisitionCost"
                                value={form.acquisitionCost}
                                onChange={changeForm}
                                type="number"
                                min="0"
                                step="0.01"
                            />
                            <InputField label="Proveedor" name="provider" value={form.provider} onChange={changeForm} />
                            <InputField
                                label="Vencimiento de garantía"
                                name="warrantyExpirationDate"
                                value={form.warrantyExpirationDate}
                                onChange={changeForm}
                                type="date"
                            />
                            <InputField label="Ubicación" name="location" value={form.location} onChange={changeForm} />
                            
                            <label className="block text-xs font-medium text-slate-300">
                                <span>Estado operativo</span>
                                <select
                                    name="operationalStatus"
                                    value={form.operationalStatus}
                                    onChange={changeForm}
                                    className={fieldClass}
                                >
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    {/* Activo / Inactivo */}
                    <div className="pt-1">
                        <label className="inline-flex min-h-[44px] items-center gap-3 text-xs font-medium text-slate-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={Boolean(form.isActive)}
                                onChange={changeForm}
                                className="h-5 w-5 rounded border-white/20 bg-[#081723] text-cyan-500 focus:ring-cyan-400 focus:ring-offset-[#102637] accent-cyan-500 cursor-pointer"
                            />
                            <span>Activo</span>
                        </label>
                    </div>

                    {formError && (
                        <p
                            role="alert"
                            className="rounded-lg border border-red-400/20 bg-red-400/10 p-3.5 text-xs text-red-200"
                        >
                            {formError}
                        </p>
                    )}

                    {/* Acciones del formulario */}
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
                            disabled={
                                saving ||
                                loadingOptions ||
                                Boolean(optionsError) ||
                                !categories.length ||
                                !users.length
                            }
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-cyan-600 px-5 text-xs font-medium text-white hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-cyan-950/40"
                        >
                            {saving ? 'Guardando...' : 'Guardar activo'}
                        </button>
                    </div>
                </form>
            </div>

            {showCategoryForm && (
                <CreateCategoryForm
                    onCancel={() => setShowCategoryForm(false)}
                    onCreated={handleCategoryCreated}
                />
            )}
        </div>
    );
}