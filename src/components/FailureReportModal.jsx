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
    'w-full rounded-lg border border-white/10 bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

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
    const selectableTechnicians = availableTechnicians.filter((technician) => technician.available !== false);

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
        if (
            canChooseTechnician &&
            selectedGroup &&
            selectableTechnicians.length === 0
        ) {
            setSubmitError('No hay técnicos disponibles en este grupo. Cada técnico puede tener hasta 3 trabajos activos.');
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
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-y-auto"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="failure-report-title"
                className="relative my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-[#102637] p-4 sm:p-6 shadow-2xl transition-all min-w-0"
            >
                {/* Header Modal */}
                <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-red-400 border border-red-400/20">
                            <AlertTriangle size={20} />
                        </span>
                        <div className="min-w-0">
                            <h2 id="failure-report-title" className="text-base sm:text-lg font-semibold text-white truncate">
                                Reportar Falla
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-400">
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
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0 disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    {/* Sección Selección de Activo */}
                    <div className="space-y-2">
                        <label htmlFor="failure-asset-search" className="block text-xs font-medium text-slate-300">
                            Buscar activo
                        </label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                            <p className="text-xs text-red-200" role="alert">
                                No se pudieron cargar los activos: {assetError}
                            </p>
                        )}
                        {!assetsLoading && !assetError && filteredAssets.length === 0 && (
                            <p className="text-xs text-slate-400">
                                No hay activos que coincidan con la búsqueda.
                            </p>
                        )}
                    </div>

                    {/* Grupo o zona de atención */}
                    {(isAdministrator || groups.length !== 1 || groupsLoading || groupError) && (
                        <div>
                            <label htmlFor="failure-group" className="mb-1 block text-xs font-medium text-slate-300">
                                Grupo o zona de atención
                                {(isAdministrator || groups.length > 1) && <span className="text-cyan-400"> *</span>}
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
                                <p className="mt-1 text-xs text-red-200" role="alert">
                                    No se pudieron cargar los grupos: {groupError}
                                </p>
                            )}
                            {!groupsLoading && !groupError && groups.length === 0 && (
                                <p className="mt-1 text-xs text-red-200" role="alert">
                                    No hay un grupo activo disponible para asignar esta falla.
                                </p>
                            )}
                        </div>
                    )}

                    {canChooseTechnician && (
                        <div>
                            <label htmlFor="failure-technician" className="mb-1 block text-xs font-medium text-slate-300">
                                Asignar técnico
                                <span className="ml-1 font-normal text-slate-400">(opcional)</span>
                            </label>
                            <select
                                id="failure-technician"
                                name="assignedTechnicianId"
                                value={form.assignedTechnicianId}
                                onChange={updateField}
                                disabled={!selectedGroup || availableTechnicians.length === 0}
                                className={inputClass}
                            >
                                <option value="">
                                    {!selectedGroup
                                        ? 'Selecciona primero un grupo'
                                        : selectableTechnicians.length
                                        ? 'Asignación automática al técnico con menor carga'
                                        : 'No hay técnicos disponibles'}
                                </option>
                                {availableTechnicians.map((technician) => (
                                    <option
                                        key={technician.id}
                                        value={technician.id}
                                        disabled={technician.available === false}
                                    >
                                        {technician.nombre}{technician.lider ? ' · Líder' : ''} · Carga:{' '}
                                        {technician.activeWorkload ?? 0}/{technician.workloadCapacity ?? 3}
                                        {technician.available === false ? ' · No disponible' : ' · Disponible'}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                                La carga cuenta trabajos activos. El sistema asigna automáticamente al técnico disponible con menor carga; el límite es de 3.
                            </p>
                        </div>
                    )}

                    {/* Tipo de Falla y Prioridad */}
                    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2">
                        <div>
                            <label htmlFor="failure-type" className="mb-1 block text-xs font-medium text-slate-300">
                                Tipo de falla <span className="text-cyan-400">*</span>
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
                            <label htmlFor="failure-priority" className="mb-1 block text-xs font-medium text-slate-300">
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
                        <label htmlFor="failure-description" className="mb-1 block text-xs font-medium text-slate-300">
                            Descripción <span className="text-cyan-400">*</span>
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
                        <label htmlFor="failure-evidence" className="mb-1 block text-xs font-medium text-slate-300">
                            Evidencia fotográfica <span className="font-normal text-slate-500">(opcional)</span>
                        </label>
                        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#081723] px-3.5 py-2.5 min-h-[44px]">
                            <ImagePlus size={18} className="shrink-0 text-cyan-300" />
                            <input
                                id="failure-evidence"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleEvidenceChange}
                                className="min-w-0 flex-1 text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/15 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-cyan-200 hover:file:bg-cyan-500/25 transition-colors cursor-pointer"
                            />
                        </div>
                        {evidence && (
                            <p className="mt-1.5 text-xs text-slate-400 truncate">
                                {evidence.name} · {(evidence.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-500">JPG, PNG o WEBP. Máximo 10 MB.</p>
                    </div>

                    {submitError && (
                        <p
                            role="alert"
                            className="rounded-lg border border-red-400/20 bg-red-400/10 p-3.5 text-xs text-red-200"
                        >
                            {submitError}
                        </p>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={onClose}
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-medium text-slate-300 hover:bg-white/5 active:bg-white/10 disabled:opacity-50 transition-colors"
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
                            className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 text-xs font-semibold text-white hover:bg-cyan-500 active:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-lg shadow-cyan-950/40"
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