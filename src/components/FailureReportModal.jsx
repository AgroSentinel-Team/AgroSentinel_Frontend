import { useEffect, useState } from 'react';
import { AlertTriangle, ImagePlus, LoaderCircle, Search, X } from 'lucide-react';
import {
    canAssignFailureTechnician,
    canReportFailure,
    createFailureReport,
    getFailureReportAssets,
    getFailureReportGroups,
    isFailureReportAdministrator,
} from '../services/assetService';

const PRIORITIES = [
    { value: 'BAJA', label: 'Baja' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'CRITICA', label: 'Crítica' },
];

const inputClass =
    'w-full rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2.5 text-xs sm:text-sm text-ink-900 outline-none placeholder:text-ink-600 focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25 min-h-[44px] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed';

function describeError(error) {
    if (error.response?.status === 403) return 'Tu perfil no tiene permiso para registrar reportes de falla.';
    if (error.response?.status === 401) return 'La sesión ya no es válida. Inicia sesión de nuevo para continuar.';
    return (
        error.response?.data?.detail ||
        error.response?.data?.message ||
        (typeof error.response?.data === 'string' ? error.response.data : '') ||
        error.message ||
        'No se pudo registrar el reporte.'
    );
}

export default function FailureReportModal({ onClose, onSaved }) {
    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(true);
    const [assetError, setAssetError] = useState('');
    const [groups, setGroups] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [groupError, setGroupError] = useState('');
    const [query, setQuery] = useState('');
    const [form, setForm] = useState({
        assetId: '',
        groupId: '',
        assignedTechnicianId: '',
        tipoFalla: '',
        prioridad: 'MEDIA',
        descripcion: '',
    });
    const [evidence, setEvidence] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isAdministrator = isFailureReportAdministrator();
    const canChooseTechnician = canAssignFailureTechnician();

    useEffect(() => {
        let cancelled = false;
        getFailureReportAssets()
            .then((data) => {
                if (!cancelled) setAssets(data);
            })
            .catch((error) => {
                if (!cancelled) setAssetError(describeError(error));
            })
            .finally(() => {
                if (!cancelled) setAssetsLoading(false);
            });

        getFailureReportGroups()
            .then((data) => {
                if (cancelled) return;
                const activeGroups = data.filter((group) => group.active);
                setGroups(activeGroups);
                if (activeGroups.length === 1) {
                    setForm((current) => ({ ...current, groupId: String(activeGroups[0].id) }));
                }
            })
            .catch((error) => {
                if (!cancelled) setGroupError(describeError(error));
            })
            .finally(() => {
                if (!cancelled) setGroupsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredAssets = assets
        .filter((asset) =>
            `${asset.name} ${asset.brand || ''} ${asset.model || ''} ${asset.serialNumber || ''} ${asset.location || ''} ${asset.responsibleName || ''}`
                .toLowerCase()
                .includes(query.trim().toLowerCase())
        )
        .sort((first, second) => Number(second.assignedToCurrentUser) - Number(first.assignedToCurrentUser));
    const selectedGroup = groups.find((group) => String(group.id) === String(form.groupId));
    const availableTechnicians = (selectedGroup?.members || []).filter((member) => {
        const effectiveRoles = Array.isArray(member.roles) ? member.roles : [member.rol];
        return effectiveRoles.some(
            (role) => String(role ?? '').toUpperCase().replace(/^ROLE_/, '') === 'TECNICO',
        );
    });
    const selectableTechnicians = availableTechnicians.filter(
        (technician) => technician.active === true || (technician.active == null && technician.available !== false),
    );
    const selectedTechnician = selectableTechnicians.find(
        (technician) => String(technician.id) === String(form.assignedTechnicianId),
    );

    const updateField = (event) => {
        setSubmitError('');
        const { name, value } = event.target;
        setForm((current) => ({
            ...current,
            [name]: value,
            ...(name === 'groupId' ? { assignedTechnicianId: '' } : {}),
        }));
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
        if (!canReportFailure()) {
            setSubmitError('Tu perfil no tiene permiso para registrar reportes de falla.');
            return;
        }
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
        if (canChooseTechnician && selectedGroup && selectableTechnicians.length === 0) {
            setSubmitError('No hay técnicos activos en este grupo para asignar la falla.');
            return;
        }
        setSubmitting(true);
        setSubmitError('');
        const payload = new FormData();
        payload.append(
            'data',
            new Blob(
                [
                    JSON.stringify({
                        assetId: Number(form.assetId),
                        groupId: form.groupId ? Number(form.groupId) : null,
                        assignedTechnicianId: form.assignedTechnicianId
                            ? Number(form.assignedTechnicianId)
                            : null,
                        tipoFalla: form.tipoFalla.trim(),
                        prioridad: form.prioridad,
                        descripcion: form.descripcion.trim(),
                    }),
                ],
                { type: 'application/json' }
            )
        );
        if (evidence) payload.append('evidencia', evidence);

        try {
            const savedReport = await createFailureReport(payload);
            window.alert(
                savedReport?.queued
                    ? 'Reporte guardado en este dispositivo. Se sincronizara al recuperar internet.'
                    : 'Reporte de falla registrado correctamente.',
            );
            onSaved?.(savedReport);
            onClose();
        } catch (error) {
            setSubmitError(describeError(error));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-pine-900/35 backdrop-blur-xl px-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4 md:p-6 overflow-y-auto"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="failure-report-title"
                className="relative my-auto max-h-[92dvh] w-full max-w-2xl min-w-0 overflow-y-auto rounded-t-3xl border border-surface/40 bg-surface/70 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl transition-all sm:rounded-2xl sm:p-6"
            >
                {/* Header Modal */}
                <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3 border-b border-sand-200 pb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error-soft text-error-text border border-error/20">
                            <AlertTriangle size={20} />
                        </span>
                        <div className="min-w-0">
                            <h2 id="failure-report-title" className="text-base sm:text-lg font-semibold text-ink-900 truncate">
                                Reportar Falla
                            </h2>
                            <p className="mt-0.5 text-xs text-ink-600">
                                Registra el activo y los detalles observados.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        title="Cerrar"
                        aria-label="Cerrar reporte de falla"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:bg-sand-100 hover:text-ink-900 transition-all duration-200 ease-out shrink-0 disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    {/* Sección Selección de Activo */}
                    <div className="space-y-2">
                        <label htmlFor="failure-asset-search" className="block text-xs font-medium text-ink-600">
                            Buscar activo
                        </label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none" />
                            <input
                                id="failure-asset-search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Nombre, serial, ubicación o responsable"
                                className={`${inputClass} pl-10`}
                            />
                        </div>
                        <label htmlFor="failure-asset" className="sr-only">
                            Activo para el reporte
                        </label>
                        <select
                            id="failure-asset"
                            name="assetId"
                            required
                            value={form.assetId}
                            onChange={updateField}
                            disabled={assetsLoading || Boolean(assetError)}
                            className={inputClass}
                        >
                            <option value="">
                                {assetsLoading ? 'Cargando activos...' : 'Selecciona un activo *'}
                            </option>
                            {filteredAssets.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                    {asset.name}
                                    {asset.serialNumber ? ` · ${asset.serialNumber}` : ''}
                                    {asset.assignedToCurrentUser ? ' · Asignado a ti' : ` · ${asset.responsibleName}`}
                                </option>
                            ))}
                        </select>
                        {assetError && (
                            <p className="text-xs text-error-text" role="alert">
                                No se pudieron cargar los activos: {assetError}
                            </p>
                        )}
                        {!assetsLoading && !assetError && filteredAssets.length === 0 && (
                            <p className="text-xs text-ink-600">
                                No hay activos que coincidan con la búsqueda.
                            </p>
                        )}
                    </div>

                    {/* Grupo o zona de atención */}
                    {(isAdministrator || groups.length !== 1 || groupsLoading || groupError) && (
                        <div>
                            <label htmlFor="failure-group" className="mb-1 block text-xs font-medium text-ink-600">
                                Grupo o zona de atención
                                {(isAdministrator || groups.length > 1) && <span className="text-ocean-700"> *</span>}
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
                                    {groupsLoading
                                        ? 'Cargando grupos...'
                                        : groups.length
                                        ? 'Selecciona un grupo'
                                        : 'No hay grupos activos'}
                                </option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                            {groupError && (
                                <p className="mt-1 text-xs text-error-text" role="alert">
                                    No se pudieron cargar los grupos: {groupError}
                                </p>
                            )}
                            {!groupsLoading && !groupError && groups.length === 0 && (
                                <p className="mt-1 text-xs text-error-text" role="alert">
                                    No hay un grupo activo disponible para asignar esta falla.
                                </p>
                            )}
                        </div>
                    )}

                    {canChooseTechnician && (
                        <div>
                            <label htmlFor="failure-technician" className="mb-1 block text-xs font-medium text-ink-600">
                                Asignar técnico
                                <span className="ml-1 font-normal text-ink-600">(opcional)</span>
                            </label>
                            <select
                                id="failure-technician"
                                name="assignedTechnicianId"
                                value={form.assignedTechnicianId}
                                onChange={updateField}
                                disabled={!selectedGroup || selectableTechnicians.length === 0}
                                className={inputClass}
                            >
                                <option value="">
                                    {!selectedGroup
                                        ? 'Selecciona primero un grupo'
                                        : selectableTechnicians.length
                                        ? 'Asignación automática al técnico con menor carga'
                                        : 'No hay técnicos activos en este grupo'}
                                </option>
                                {selectableTechnicians.map((technician) => {
                                    const workload = technician.activeWorkload ?? 0;
                                    const capacity = technician.workloadCapacity ?? 3;
                                    const highWorkload = workload >= capacity;
                                    return (
                                    <option
                                        key={technician.id}
                                        value={technician.id}
                                    >
                                        {technician.nombre}{technician.lider ? ' · Líder' : ''} ·{' '}
                                        {highWorkload
                                            ? `Carga alta: ${workload} activas`
                                            : `Carga: ${workload}/${capacity}`}
                                    </option>
                                    );
                                })}
                            </select>
                            {selectedTechnician && selectedTechnician.activeWorkload >= selectedTechnician.workloadCapacity && (
                                <span className="mt-2 inline-flex rounded-full border border-ocean-300/60 bg-info-soft px-2.5 py-1 text-[10px] font-semibold text-ocean-700">
                                    Carga alta: {selectedTechnician.activeWorkload} activas
                                </span>
                            )}
                            <p className="mt-1 text-[11px] leading-relaxed text-ink-600">
                                La asignación automática sigue priorizando la menor carga disponible. Administradores y supervisores pueden asignar manualmente a cualquier técnico activo, sin bloqueo por carga.
                            </p>
                        </div>
                    )}

                    {/* Tipo de Falla y Prioridad */}
                    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2">
                        <div>
                            <label htmlFor="failure-type" className="mb-1 block text-xs font-medium text-ink-600">
                                Tipo de falla <span className="text-ocean-700">*</span>
                            </label>
                            <input
                                id="failure-type"
                                name="tipoFalla"
                                required
                                maxLength={120}
                                value={form.tipoFalla}
                                onChange={updateField}
                                placeholder="Ej. Falla hidráulica"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="failure-priority" className="mb-1 block text-xs font-medium text-ink-600">
                                Prioridad
                            </label>
                            <select
                                id="failure-priority"
                                name="prioridad"
                                value={form.prioridad}
                                onChange={updateField}
                                className={inputClass}
                            >
                                {PRIORITIES.map((priority) => (
                                    <option key={priority.value} value={priority.value}>
                                        {priority.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label htmlFor="failure-description" className="mb-1 block text-xs font-medium text-ink-600">
                            Descripción <span className="text-ocean-700">*</span>
                        </label>
                        <textarea
                            id="failure-description"
                            name="descripcion"
                            required
                            maxLength={5000}
                            rows={4}
                            value={form.descripcion}
                            onChange={updateField}
                            placeholder="Describe la falla observada y sus efectos..."
                            className={`${inputClass} min-h-[100px] resize-y`}
                        />
                    </div>

                    {/* Evidencia Fotográfica */}
                    <div>
                        <label htmlFor="failure-evidence" className="mb-1 block text-xs font-medium text-ink-600">
                            Evidencia fotográfica <span className="font-normal text-ink-600">(opcional)</span>
                        </label>
                        <div className="flex items-center gap-3 rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2.5 min-h-[44px]">
                            <ImagePlus size={18} className="shrink-0 text-ocean-700" />
                            <input
                                id="failure-evidence"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleEvidenceChange}
                                className="min-w-0 flex-1 text-xs text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-info-soft file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-ocean-700 hover:file:bg-ocean-300/30 transition-all duration-200 ease-out cursor-pointer"
                            />
                        </div>
                        {evidence && (
                            <p className="mt-1.5 text-xs text-ink-600 truncate">
                                {evidence.name} · {(evidence.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                        )}
                        <p className="mt-1 text-[11px] text-ink-600">JPG, PNG o WEBP. Máximo 10 MB.</p>
                    </div>

                    {submitError && (
                        <p
                            role="alert"
                            className="rounded-lg border border-error/20 bg-error-soft p-3.5 text-xs text-error-text"
                        >
                            {submitError}
                        </p>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-sand-200 pt-4">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={onClose}
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-sand-200 px-4 text-xs font-medium text-ink-600 hover:bg-sand-100 active:bg-sand-100 disabled:opacity-50 transition-all duration-200 ease-out"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={
                                submitting ||
                                assetsLoading ||
                                Boolean(assetError) ||
                                !assets.length ||
                                groupsLoading ||
                                Boolean(groupError) ||
                                groups.length === 0
                            }
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 text-xs font-semibold text-pine-900 hover:bg-gold-600 active:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ease-out shadow-lg shadow-gold-600/20"
                        >
                            {submitting && <LoaderCircle size={15} className="animate-spin shrink-0" />}
                            {submitting ? 'Enviando...' : 'Enviar reporte'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}