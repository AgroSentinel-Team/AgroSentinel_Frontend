import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Plus, Settings2, Trash2, X } from 'lucide-react';
import {
    createAsset,
    findAssetDuplicates,
    getCategories,
    getCategorySpecTemplate,
    getUsers,
    updateAsset,
    uploadAssetImage,
} from '../services/assetService';
import AssetImage from './AssetImage';
import {
    buildSpecificationsPayload,
    computeCompleteness,
    customEntries,
    INVENTORY_CODE_STATUS_LABELS,
    newCustomKey,
    serialLooksLikeYear,
    specsFromAsset,
    validateSpecs,
} from '../services/assetSpecs';
import CategorySpecTemplateEditor from './CategorySpecTemplateEditor';
import CreateCategoryForm from './CreateCategoryForm';

const EMPTY_FORM = {
    name: '',
    equipmentType: '',
    brand: '',
    model: '',
    serialNumber: '',
    manufactureYear: '',
    inventoryCode: '',
    inventoryCodeStatus: 'PENDING',
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
    OPERATIONAL_WITH_RESTRICTIONS: 'Operativo con restricciones',
    IN_REPAIR: 'En reparación',
    OUT_OF_SERVICE: 'Fuera de servicio',
    OBSOLETE: 'Obsoleto',
};

// Campos de la respuesta del servidor que no se envían de vuelta.
const RESPONSE_ONLY_FIELDS = [
    'specifications', 'completeness', 'missingFields', 'categoryName', 'responsibleName',
    'predictiveId', 'imageUrl', 'currentHorometer', 'id',
];

const MAX_YEAR = new Date().getFullYear() + 1;

const fieldClass =
    'mt-1 w-full rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2.5 text-xs sm:text-sm text-ink-900 outline-none placeholder:text-ink-600 focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25 min-h-[44px] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed';

const sectionClass = 'rounded-lg bg-sand-50 p-3.5 sm:p-4 border border-sand-200/70 space-y-3.5';
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wider text-ocean-700';

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
    const form = {
        ...EMPTY_FORM,
        ...asset,
        equipmentType: asset.equipmentType || '',
        manufactureYear: asset.manufactureYear ?? '',
        inventoryCodeStatus: asset.inventoryCodeStatus === 'NOT_PROVIDED' ? 'NOT_PROVIDED' : 'PENDING',
        categoryId: String(asset.categoryId),
        responsibleId: String(asset.responsibleId),
        acquisitionDate: asset.acquisitionDate || '',
        acquisitionCost: asset.acquisitionCost ?? '',
        warrantyExpirationDate: asset.warrantyExpirationDate || '',
    };
    RESPONSE_ONLY_FIELDS.forEach((field) => delete form[field]);
    // Los textos vacíos llegan como null desde el servidor; los inputs necesitan cadenas.
    Object.entries(EMPTY_FORM).forEach(([field, emptyValue]) => {
        if (typeof emptyValue === 'string' && form[field] == null) form[field] = '';
    });
    return form;
}

function InputField({ label, name, value, onChange, type = 'text', required = false, min, max, step, maxLength, hint, placeholder, inputMode }) {
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
                max={max}
                step={step}
                maxLength={maxLength}
                placeholder={placeholder}
                inputMode={inputMode}
            />
            {hint && <span className="mt-1 block text-[11px] leading-relaxed text-ink-600">{hint}</span>}
        </label>
    );
}

function Warning({ children }) {
    return (
        <span className="mt-1 flex items-start gap-1.5 rounded-md bg-warning-soft px-2 py-1.5 text-[11px] leading-snug text-forest-900">
            <AlertTriangle size={13} className="mt-px shrink-0 text-gold-600" aria-hidden="true" />
            <span>{children}</span>
        </span>
    );
}

function duplicateText(matches) {
    const names = matches.slice(0, 3).map((match) => match.name).join(', ');
    return matches.length > 3 ? `${names} y ${matches.length - 3} más` : names;
}

/** Campo de la plantilla: número con unidad, selección (con opción libre) o texto. */
function SpecInput({ field, value, onChange }) {
    const [customOption, setCustomOption] = useState(
        () => field.dataType === 'OPTION' && Boolean(value) && !field.options.includes(value),
    );
    const label = (
        <span>
            {field.label} {field.required && <span className="text-ocean-700" title="Dato clave">*</span>}
        </span>
    );

    if (field.dataType === 'OPTION' && !customOption) {
        return (
            <label className="block text-xs font-medium text-ink-600">
                {label}
                <select
                    className={fieldClass}
                    value={value}
                    onChange={(event) => {
                        if (event.target.value === '__other__') {
                            setCustomOption(true);
                            onChange('');
                        } else {
                            onChange(event.target.value);
                        }
                    }}
                >
                    <option value="">Sin dato</option>
                    {field.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                    <option value="__other__">Otro...</option>
                </select>
                {field.helpText && <span className="mt-1 block text-[11px] text-ink-600">{field.helpText}</span>}
            </label>
        );
    }

    return (
        <label className="block text-xs font-medium text-ink-600">
            {label}
            <span className="relative block">
                <input
                    className={`${fieldClass} ${field.unit ? 'pr-14' : ''}`}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    inputMode={field.dataType === 'NUMBER' ? 'decimal' : undefined}
                    placeholder={field.dataType === 'NUMBER' ? 'Número' : field.dataType === 'OPTION' ? 'Escribe el valor' : ''}
                    maxLength={500}
                />
                {field.unit && (
                    <span className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs text-ink-600">
                        {field.unit}
                    </span>
                )}
            </span>
            {field.dataType === 'OPTION' && (
                <button
                    type="button"
                    onClick={() => {
                        setCustomOption(false);
                        onChange('');
                    }}
                    className="mt-1 text-[11px] font-medium text-ocean-700 underline-offset-2 hover:underline"
                >
                    Elegir de la lista
                </button>
            )}
            {field.helpText && <span className="mt-1 block text-[11px] text-ink-600">{field.helpText}</span>}
        </label>
    );
}

export default function CreateAssetForm({ asset = null, onCancel, onSaved }) {
    const [form, setForm] = useState(() => getInitialForm(asset));
    const [specs, setSpecs] = useState(() => specsFromAsset(asset));
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [optionsError, setOptionsError] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [templateState, setTemplateState] = useState({ categoryId: '', fields: [], error: '' });
    const [templateVersion, setTemplateVersion] = useState(0);
    const [duplicates, setDuplicates] = useState({ serialNumber: '', inventoryCode: '', result: null });
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

    // Plantilla de datos técnicos de la categoría elegida.
    useEffect(() => {
        if (!form.categoryId) return undefined;
        let cancelled = false;
        getCategorySpecTemplate(form.categoryId)
            .then((fields) => {
                if (!cancelled) setTemplateState({ categoryId: form.categoryId, fields, error: '' });
            })
            .catch((error) => {
                if (!cancelled) {
                    setTemplateState({ categoryId: form.categoryId, fields: [], error: describeError(error) });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [form.categoryId, templateVersion]);

    const templateLoading = Boolean(form.categoryId) && templateState.categoryId !== form.categoryId;
    const template = useMemo(
        () => (templateState.categoryId === form.categoryId ? templateState.fields : []),
        [templateState, form.categoryId],
    );

    // Aviso de serial o código ya usados por otro activo (no bloquea el guardado).
    const serialQuery = form.serialNumber.trim();
    const codeQuery = form.inventoryCode.trim();
    useEffect(() => {
        if (!serialQuery && !codeQuery) return undefined;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            findAssetDuplicates({ serialNumber: serialQuery, inventoryCode: codeQuery, excludeId: savedAssetId })
                .then((result) => {
                    if (!cancelled) setDuplicates({ serialNumber: serialQuery, inventoryCode: codeQuery, result });
                })
                .catch(() => {
                    // Sin conexión o sin permiso: simplemente no se muestra el aviso.
                });
        }, 600);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [serialQuery, codeQuery, savedAssetId]);

    const duplicateResult =
        duplicates.result && duplicates.serialNumber === serialQuery && duplicates.inventoryCode === codeQuery
            ? duplicates.result
            : null;
    const serialMatches = serialQuery ? duplicateResult?.serialNumberMatches ?? [] : [];
    const codeMatches = codeQuery ? duplicateResult?.inventoryCodeMatches ?? [] : [];

    const hasImage = Boolean(imagePreview || asset?.imageUrl);
    const completeness = computeCompleteness(form, specs, template, hasImage);
    const extraSpecs = customEntries(specs, template);
    const selectedCategory = categories.find((category) => String(category.id) === String(form.categoryId))
        || (asset && String(asset.categoryId) === String(form.categoryId)
            ? { id: asset.categoryId, name: asset.categoryName }
            : null);

    const changeForm = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    };

    const setSpecValue = (key, value, label) =>
        setSpecs((current) => ({
            ...current,
            [key]: { ...(current[key] || { label: label || '', unit: '' }), value },
        }));

    const setSpecLabel = (key, label) =>
        setSpecs((current) => ({ ...current, [key]: { ...current[key], label } }));

    const addExtraSpec = () =>
        setSpecs((current) => ({ ...current, [newCustomKey()]: { label: '', value: '', unit: '' } }));

    const removeSpec = (key) =>
        setSpecs((current) => {
            const next = { ...current };
            delete next[key];
            return next;
        });

    const handleCategoryCreated = (category) => {
        setCategories((current) => [...current, category].sort((left, right) => left.name.localeCompare(right.name)));
        setForm((current) => ({ ...current, categoryId: String(category.id) }));
        setShowCategoryForm(false);
    };

    const handleTemplateSaved = () => {
        setShowTemplateEditor(false);
        setTemplateVersion((version) => version + 1);
    };

    const submit = async (event) => {
        event.preventDefault();
        const specErrors = validateSpecs(specs, template);
        if (specErrors.length) {
            setFormError(specErrors.join(' '));
            return;
        }
        const year = String(form.manufactureYear).trim();
        if (year && (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > MAX_YEAR)) {
            setFormError(`El año de fabricación debe estar entre 1900 y ${MAX_YEAR}.`);
            return;
        }

        setSaving(true);
        setFormError('');
        const payload = {
            ...form,
            categoryId: Number(form.categoryId),
            responsibleId: Number(form.responsibleId),
            acquisitionCost: form.acquisitionCost === '' ? null : Number(form.acquisitionCost),
            manufactureYear: year ? Number(year) : null,
            inventoryCodeStatus: form.inventoryCode.trim() ? 'ASSIGNED' : form.inventoryCodeStatus,
            specifications: buildSpecificationsPayload(specs, template),
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

    const completenessTone = completeness.percent >= 90
        ? 'bg-forest-700'
        : completeness.percent >= 60
            ? 'bg-gold-500'
            : 'bg-error';

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
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-sand-200 pb-3.5">
                    <div className="min-w-0">
                        <h3 id="asset-form-title" className="text-base sm:text-lg font-semibold text-ink-900 truncate">
                            {asset ? 'Editar activo' : 'Registrar activo'}
                        </h3>
                        <p className="mt-0.5 text-xs text-ink-600">
                            Identificación, datos técnicos, compra, asignación y estado.
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

                {/* Completitud de la ficha */}
                <div className="mb-4 sm:mb-5" aria-live="polite">
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-ink-900">Ficha {completeness.percent}% completa</span>
                        {completeness.missing.length > 0 && (
                            <span className="min-w-0 truncate text-ink-600" title={completeness.missing.join(', ')}>
                                Falta: {completeness.missing.join(', ')}
                            </span>
                        )}
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand-200">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${completenessTone}`}
                            style={{ width: `${completeness.percent}%` }}
                        />
                    </div>
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
                    {/* Identificación */}
                    <div className={sectionClass}>
                        <h4 className={sectionTitleClass}>Identificación del equipo</h4>
                        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            <InputField
                                label="Nombre"
                                name="name"
                                value={form.name}
                                onChange={changeForm}
                                required
                                placeholder="Tractor Massey Ferguson 290"
                            />
                            <InputField
                                label="Tipo de equipo"
                                name="equipmentType"
                                value={form.equipmentType}
                                onChange={changeForm}
                                maxLength={120}
                                placeholder="Tractor agrícola, guadaña..."
                            />

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

                            <InputField label="Marca" name="brand" value={form.brand} onChange={changeForm} />
                            <InputField label="Modelo o referencia" name="model" value={form.model} onChange={changeForm} />
                            <InputField
                                label="Año de fabricación"
                                name="manufactureYear"
                                value={form.manufactureYear}
                                onChange={changeForm}
                                type="number"
                                min="1900"
                                max={MAX_YEAR}
                                step="1"
                                inputMode="numeric"
                            />

                            <label className="block text-xs font-medium text-ink-600">
                                <span>Número de serie</span>
                                <input
                                    className={fieldClass}
                                    name="serialNumber"
                                    value={form.serialNumber ?? ''}
                                    onChange={changeForm}
                                />
                                {serialMatches.length > 0 && (
                                    <Warning>Este serial ya está registrado en: {duplicateText(serialMatches)}. Verifica que no sea un error de digitación.</Warning>
                                )}
                                {serialLooksLikeYear(form.serialNumber) && (
                                    <Warning>Parece un año, no un serial. Si es el año, regístralo en «Año de fabricación».</Warning>
                                )}
                            </label>

                            <label className="block text-xs font-medium text-ink-600">
                                <span>Código de inventario / placa</span>
                                <input
                                    className={fieldClass}
                                    name="inventoryCode"
                                    value={form.inventoryCode ?? ''}
                                    onChange={changeForm}
                                    maxLength={80}
                                />
                                {codeMatches.length > 0 && (
                                    <Warning>Este código ya lo usa: {duplicateText(codeMatches)}.</Warning>
                                )}
                            </label>

                            {!form.inventoryCode.trim() && (
                                <label className="block text-xs font-medium text-ink-600">
                                    <span>Sin código porque...</span>
                                    <select
                                        name="inventoryCodeStatus"
                                        value={form.inventoryCodeStatus}
                                        onChange={changeForm}
                                        className={fieldClass}
                                    >
                                        <option value="PENDING">{INVENTORY_CODE_STATUS_LABELS.PENDING}</option>
                                        <option value="NOT_PROVIDED">{INVENTORY_CODE_STATUS_LABELS.NOT_PROVIDED}</option>
                                    </select>
                                </label>
                            )}

                            <InputField label="Ubicación" name="location" value={form.location} onChange={changeForm} />

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
                        </div>
                    </div>

                    {/* Datos técnicos */}
                    <div className={sectionClass}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className={sectionTitleClass}>Datos técnicos</h4>
                            {selectedCategory && (
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateEditor(true)}
                                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ocean-700 hover:bg-info-soft"
                                >
                                    <Settings2 size={14} />
                                    {template.length ? 'Editar campos de la categoría' : 'Configurar campos de la categoría'}
                                </button>
                            )}
                        </div>

                        {!form.categoryId && (
                            <p className="text-xs text-ink-600">Elige la categoría para ver los datos técnicos que se piden.</p>
                        )}
                        {templateLoading && <p className="text-xs text-ink-600">Cargando campos de la categoría...</p>}
                        {templateState.error && templateState.categoryId === form.categoryId && (
                            <p className="text-xs text-error-text">No se pudieron cargar los campos: {templateState.error}</p>
                        )}
                        {form.categoryId && !templateLoading && !template.length && !templateState.error && (
                            <p className="rounded-lg border border-dashed border-sand-200 p-3 text-xs text-ink-600">
                                Esta categoría aún no tiene campos técnicos. Configúralos con una plantilla sugerida
                                (tractores, labranza, siembra...) o agrega abajo los datos sueltos.
                            </p>
                        )}

                        {template.length > 0 && (
                            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                {template.map((field) => (
                                    <SpecInput
                                        key={`${form.categoryId}-${field.specKey}`}
                                        field={field}
                                        value={specs[field.specKey]?.value ?? ''}
                                        onChange={(value) => setSpecValue(field.specKey, value, field.label)}
                                    />
                                ))}
                            </div>
                        )}

                        {extraSpecs.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-600">Datos adicionales</p>
                                {extraSpecs.map(([key, spec]) => (
                                    <div key={key} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                                        <input
                                            aria-label="Nombre del dato"
                                            placeholder="Dato (p. ej. Presostato)"
                                            value={spec.label}
                                            onChange={(event) => setSpecLabel(key, event.target.value)}
                                            maxLength={120}
                                            className={`${fieldClass} mt-0`}
                                        />
                                        <input
                                            aria-label={`Valor de ${spec.label || 'dato adicional'}`}
                                            placeholder="Valor (p. ej. 60–80 psi)"
                                            value={spec.value}
                                            onChange={(event) => setSpecValue(key, event.target.value)}
                                            maxLength={500}
                                            className={`${fieldClass} mt-0`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSpec(key)}
                                            aria-label={`Quitar ${spec.label || 'dato adicional'}`}
                                            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:bg-sand-100 hover:text-error-text"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={addExtraSpec}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-info-soft px-2.5 text-xs font-medium text-ocean-700 hover:bg-gold-600/20"
                        >
                            <Plus size={14} /> Agregar dato adicional
                        </button>

                        <label className="block text-xs font-medium text-ink-600 pt-1">
                            <span>Observaciones</span>
                            <textarea
                                name="extraSpecifications"
                                value={form.extraSpecifications ?? ''}
                                onChange={changeForm}
                                rows="3"
                                placeholder="Notas generales del equipo."
                                className={`${fieldClass} min-h-[80px] resize-y`}
                            />
                        </label>
                    </div>

                    <div className={sectionClass}>
                        <h4 className={sectionTitleClass}>Registro fotográfico</h4>
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
                            <AssetImage
                                imageUrl={imagePreview || asset.imageUrl}
                                alt={`Vista previa de ${asset?.name || form.name || 'activo'}`}
                                className="h-28 w-36 rounded-lg border border-sand-200 object-cover"
                            />
                        )}
                    </div>

                    {/* Adquisición, garantía y estado */}
                    <div className={sectionClass}>
                        <h4 className={sectionTitleClass}>Adquisición, garantía y estado</h4>
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
                                templateLoading ||
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

            {showTemplateEditor && selectedCategory && (
                <CategorySpecTemplateEditor
                    category={selectedCategory}
                    onCancel={() => setShowTemplateEditor(false)}
                    onSaved={handleTemplateSaved}
                />
            )}
        </div>
    );
}
