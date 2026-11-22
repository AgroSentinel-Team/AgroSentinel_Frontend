import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { API_ORIGIN, createAsset, getCategories, getUsers, updateAsset, uploadAssetImage } from '../services/assetService';
import CreateCategoryForm from './CreateCategoryForm';

const EMPTY_FORM = {
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    inventoryCode: '',
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
    'mt-1 w-full rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2.5 text-xs sm:text-sm text-ink-900 outline-none placeholder:text-ink-600 focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25 min-h-[44px] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed';

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

function InputField({ label, name, value, onChange, type = 'text', required = false, min, step, maxLength, hint }) {
    return (
        <label className="block text-xs font-medium text-ink-600">
            <span>
                {label} {required && <span className="text-ocean-700">*</span>}
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
                maxLength={maxLength}
            />
            {hint && <span className="mt-1 block text-[11px] leading-relaxed text-ink-600">{hint}</span>}
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
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [savedAssetId, setSavedAssetId] = useState(asset?.id ?? null);
    const previewUrlRef = useRef('');

    useEffect(() => () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    }, []);

    const selectImage = (event) => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const selectedFile = event.target.files?.[0] ?? null;
        setImageFile(selectedFile);
        const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : '';
        previewUrlRef.current = previewUrl;
        setImagePreview(previewUrl);
    };

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
        let assetSaved = false;
        try {
            const saved = savedAssetId
                ? await updateAsset(savedAssetId, payload)
                : await createAsset(payload);
            assetSaved = true;
            setSavedAssetId(saved.id);
            const result = imageFile ? await uploadAssetImage(saved.id, imageFile) : saved;
            onSaved(result);
        } catch (error) {
            const message = describeError(error);
            setFormError(assetSaved
                ? `El activo se guardó, pero no se pudo cargar la imagen: ${message}`
                : message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-pine-900/35 backdrop-blur-xl px-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4 md:p-6 overflow-y-auto"
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="asset-form-title"
                className="relative my-auto max-h-[92dvh] w-full max-w-3xl min-w-0 overflow-y-auto rounded-t-3xl border border-surface/40 bg-surface/70 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl transition-all sm:rounded-2xl sm:p-6"
            >
                {/* Header Modal */}
                <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3 border-b border-sand-200 pb-3.5">
                    <div className="min-w-0">
                        <h3 id="asset-form-title" className="text-base sm:text-lg font-semibold text-ink-900 truncate">
                            {asset ? 'Editar activo' : 'Registrar activo'}
                        </h3>
                        <p className="mt-0.5 text-xs text-ink-600">
                            Completa la ficha técnica, compra, asignación y estado.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        title="Cerrar"
                        aria-label="Cerrar formulario de activo"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:bg-sand-100 hover:text-ink-900 transition-all duration-200 ease-out shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {optionsError && (
                    <p
                        role="alert"
                        className="mb-4 rounded-lg border border-error/20 bg-error-soft p-3.5 text-xs text-error-text"
                    >
                        No se pudieron cargar categorías y usuarios: {optionsError}
                    </p>
                )}

                <form onSubmit={submit} className="space-y-5 sm:space-y-6">
                    {/* Ficha técnica */}
                    <div className="rounded-lg bg-sand-50 p-3.5 sm:p-4 border border-sand-200/70 space-y-3.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">
                            Ficha técnica
                        </h4>
                        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            <InputField label="Nombre" name="name" value={form.name} onChange={changeForm} required />
                            <InputField label="Marca" name="brand" value={form.brand} onChange={changeForm} />
                            <InputField label="Modelo" name="model" value={form.model} onChange={changeForm} />
                            <InputField label="Número de serie" name="serialNumber" value={form.serialNumber} onChange={changeForm} />
                            <InputField
                                label="Código de inventario / placa"
                                name="inventoryCode"
                                value={form.inventoryCode}
                                onChange={changeForm}
                                maxLength={80}
                                hint="Identificador interno o placa física del activo."
                            />

                            <label className="block text-xs font-medium text-ink-600">
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
                                    <span className="mt-1 block text-[11px] text-ocean-700 font-normal leading-tight">
                                        {asset?.predictiveId
                                            ? `ID predictivo: ${asset.predictiveId}`
                                            : 'El ID predictivo se asignará al guardar el activo.'}
                                    </span>
                                )}
                            </label>

                            <label className="block text-xs font-medium text-ink-600">
                                <span>Categoría <span className="text-ocean-700">*</span></span>
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
                                    className="mt-2 inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium text-ocean-700 bg-info-soft hover:bg-gold-600/20 active:bg-ocean-300/30 transition-all duration-200 ease-out"
                                >
                                    <Plus size={14} /> Crear categoría
                                </button>
                            </label>

                            <label className="block text-xs font-medium text-ink-600">
                                <span>Responsable <span className="text-ocean-700">*</span></span>
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

                        <label className="block text-xs font-medium text-ink-600 pt-1">
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

                    <div className="rounded-lg bg-sand-50 p-3.5 sm:p-4 border border-sand-200/70 space-y-3.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">Imagen del activo</h4>
                        <label className="block text-xs font-medium text-ink-600">
                            <span>Foto (JPG, PNG o WEBP, máximo 10 MB)</span>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={selectImage}
                                className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-info-soft file:px-3 file:py-1 file:text-ocean-700`}
                            />
                        </label>
                        {(imagePreview || asset?.imageUrl) && (
                            <img
                                src={imagePreview || `${API_ORIGIN}${asset.imageUrl}`}
                                alt={`Vista previa de ${asset?.name || form.name || 'activo'}`}
                                className="h-28 w-36 rounded-lg border border-sand-200 object-cover"
                            />
                        )}
                    </div>

                    {/* Adquisición y garantía */}
                    <div className="rounded-lg bg-sand-50 p-3.5 sm:p-4 border border-sand-200/70 space-y-3.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-ocean-700">
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
                            
                            <label className="block text-xs font-medium text-ink-600">
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
                        <label className="inline-flex min-h-[44px] items-center gap-3 text-xs font-medium text-ink-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={Boolean(form.isActive)}
                                onChange={changeForm}
                                className="h-5 w-5 cursor-pointer rounded border-sand-200 bg-surface text-forest-700 accent-gold-500 focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-sand-50"
                            />
                            <span>Activo</span>
                        </label>
                    </div>

                    {formError && (
                        <p
                            role="alert"
                            className="rounded-lg border border-error/20 bg-error-soft p-3.5 text-xs text-error-text"
                        >
                            {formError}
                        </p>
                    )}

                    {/* Acciones del formulario */}
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
                            disabled={
                                saving ||
                                loadingOptions ||
                                Boolean(optionsError) ||
                                !categories.length ||
                                !users.length
                            }
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-gold-500 px-5 text-xs font-medium text-pine-900 hover:bg-gold-600 active:bg-gold-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-out shadow-lg shadow-gold-600/20"
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