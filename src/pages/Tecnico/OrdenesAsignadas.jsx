import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  Layers,
  Package,
  Clock3,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import {
  getAssignedFailureReports,
  getFailureAssetResume,
  saveFailureIntervention,
  startFailureReview,
} from '../../services/technicianService';
import { getPreventiveMaintenances } from '../../services/preventiveMaintenanceService';
import {
  getInventoryItems,
  getInventoryGroups,
  getAllWorkGroups,
} from '../../services/inventoryService';

const equipmentStates = [
  ['OPERATIONAL', '100% operativo'],
  ['OPERATIONAL_WITH_RESTRICTIONS', 'Operando con restricciones'],
  ['INOPERATIVE_WAITING_PART', 'Inoperativo a la espera de repuesto'],
];

const localDateTime = (value) => (value ? value.slice(0, 16) : '');

const localDateTimePayload = (value) => (value ? `${value}:00` : null);

async function fetchOrders() {
  const [failures, preventive] = await Promise.all([
    getAssignedFailureReports(),
    getPreventiveMaintenances(),
  ]);
  return [
    ...failures
      .filter((item) => item.estado !== 'RESUELTO')
      .map((item) => ({ ...item, kind: 'failure' })),
    ...preventive
      .filter((item) =>
        ['SCHEDULED', 'PARTIALLY_COMPLETED', 'URGENT_CORRECTIVE'].includes(item.status),
      )
      .map((item) => ({ ...item, kind: 'preventive' })),
  ].sort(
    (a, b) =>
      new Date(b.fechaReporte || b.scheduledAt || 0) -
      new Date(a.fechaReporte || a.scheduledAt || 0),
  );
}

function InterventionForm({ report, assetResume, onClose, onSaved }) {
  const currentName =
    localStorage.getItem('nombre') || report.assignedTechnicianName || '';
  const [form, setForm] = useState({
    equipmentIntervened: [
      report.assetName,
      report.assetBrand,
      report.assetModel,
      report.assetSerialNumber,
    ]
      .filter(Boolean)
      .join(' - '),
    initialReportedSymptom: report.descripcion || '',
    reportedAt: localDateTime(report.fechaReporte),
    inspectionStartedAt: localDateTime(
      report.fechaInicioRevision || new Date().toISOString(),
    ),
    actualFailure: '',
    rootCause: '',
    tasksPerformed: '',
    workMinutes: '',
    testsPerformed: '',
    finalEquipmentState: '',
    recommendations: '',
    pendingTasks: '',
    technicianName: currentName,
    receivedBy: '',
  });
  const [parts, setParts] = useState([]);
  const [technicianGroups, setTechnicianGroups] = useState([]);
  const [allZones, setAllZones] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupError, setGroupError] = useState('');
  const [isExternalZone, setIsExternalZone] = useState(false);
  const [selectedExternalZoneId, setSelectedExternalZoneId] = useState('CENTRAL');
  const [availableItems, setAvailableItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [partQuantity, setPartQuantity] = useState('');
  const [partSelectionError, setPartSelectionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const change = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

  const primaryGroup = useMemo(
    () =>
      technicianGroups.find((group) => String(group.id) === String(report.workGroupId)) ||
      (report.workGroupId
        ? { id: report.workGroupId, name: report.workGroupName || 'Mi Grupo' }
        : technicianGroups[0] || null),
    [technicianGroups, report.workGroupId, report.workGroupName],
  );

  useEffect(() => {
    let active = true;
    Promise.allSettled([getInventoryGroups(), getAllWorkGroups()]).then((results) => {
      if (!active) return;
      const [myGroupsResult, allGroupsResult] = results;
      setTechnicianGroups(
        myGroupsResult.status === 'fulfilled' && Array.isArray(myGroupsResult.value)
          ? myGroupsResult.value
          : [],
      );
      setAllZones(
        allGroupsResult.status === 'fulfilled' && Array.isArray(allGroupsResult.value)
          ? allGroupsResult.value
          : [],
      );
      const failedResult = results.find((result) => result.status === 'rejected');
      if (failedResult) {
        const requestError = failedResult.reason;
        setGroupError(
          requestError.response?.data?.message ||
            requestError.response?.data?.detail ||
            requestError.message ||
            'No fue posible cargar los grupos de trabajo.',
        );
      }
    }).finally(() => {
      if (active) setLoadingGroups(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (loadingGroups) return () => {
      active = false;
    };

    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setLoadingItems(true);
        setPartSelectionError('');
        setSelectedItemId('');
        setPartQuantity('');

        if (!isExternalZone && !primaryGroup) {
          setAvailableItems([]);
          setPartSelectionError('La falla no tiene un grupo asignado para consultar su inventario.');
          return [];
        }

        const targetGroupId = isExternalZone
          ? (selectedExternalZoneId === 'CENTRAL' ? null : Number(selectedExternalZoneId))
          : primaryGroup.id;
        const isCentral = isExternalZone && selectedExternalZoneId === 'CENTRAL';
        return getInventoryItems(targetGroupId, isCentral ? true : targetGroupId != null);
      })
      .then((items) => {
        if (!active || items === null) return;
        setAvailableItems(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        if (!active) return;
        setAvailableItems([]);
        setPartSelectionError(
          err.response?.data?.message ||
            err.response?.data?.detail ||
            err.message ||
            'No fue posible cargar el inventario de esta bodega.',
        );
      })
      .finally(() => {
        if (active) setLoadingItems(false);
      });

    return () => {
      active = false;
    };
  }, [isExternalZone, selectedExternalZoneId, primaryGroup, loadingGroups]);

  const selectedItem = availableItems.find((itm) => String(itm.id) === String(selectedItemId)) || null;
  const alreadyUsedQuantity = parts
    .filter((p) => p.itemId === selectedItem?.id)
    .reduce((sum, p) => sum + Number(p.quantity || 0), 0);
  const currentAvailableStock = selectedItem
    ? Math.max(0, Number(selectedItem.stock || 0) - alreadyUsedQuantity)
    : 0;

  const addPart = () => {
    setPartSelectionError('');
    if (!selectedItem) {
      setPartSelectionError('Selecciona una pieza o repuesto del inventario.');
      return;
    }
    const qty = Number(partQuantity);
    if (!qty || qty <= 0) {
      setPartSelectionError('Ingresa una cantidad mayor que cero.');
      return;
    }
    if (qty > currentAvailableStock) {
      setPartSelectionError(
        'La cantidad ingresada (' + qty + ') supera el stock disponible (' + currentAvailableStock + ' ' + selectedItem.unit + ').',
      );
      return;
    }

    const currentZoneName = isExternalZone
      ? (selectedExternalZoneId === 'CENTRAL'
          ? 'Bodega Central'
          : allZones.find((z) => String(z.id) === String(selectedExternalZoneId))?.name || 'Zona Externa')
      : (primaryGroup?.name || 'Grupo de Trabajo Propio');

    const newPart = {
      itemId: selectedItem.id,
      sourceGroupId: isExternalZone && selectedExternalZoneId !== 'CENTRAL' ? Number(selectedExternalZoneId) : (isExternalZone ? null : primaryGroup?.id || null),
      sourceZoneName: currentZoneName,
      isExternal: isExternalZone,
      partNumber: selectedItem.category || ('REP-' + selectedItem.id),
      name: selectedItem.name || selectedItem.item || 'Repuesto',
      brand: null,
      unit: selectedItem.unit || 'und',
      quantity: qty,
    };

    setParts((current) => [...current, newPart]);
    setSelectedItemId('');
    setPartQuantity('');
  };
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await saveFailureIntervention(report.id, {
        ...form,
        reportedAt: localDateTimePayload(form.reportedAt),
        inspectionStartedAt: localDateTimePayload(form.inspectionStartedAt),
        workMinutes: Number(form.workMinutes),
        replacedParts: parts,
        pendingTasks: form.pendingTasks || null,
        receivedBy: form.receivedBy || null,
      });
      onSaved();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'No fue posible guardar la intervención.',
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    'w-full min-h-[44px] rounded-lg border border-[#30485a] bg-[#0b1d2b] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50';

  const textField = (
    name,
    label,
    { type = 'text', required = true } = {},
  ) => (
    <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
      <span>
        {label}
        {required && <span className="text-cyan-400 ml-0.5">*</span>}
      </span>
      <input
        className={fieldClass}
        type={type}
        name={name}
        value={form[name]}
        onChange={change}
        required={required}
      />
    </label>
  );

  const textArea = (name, label, { required = true } = {}) => (
    <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
      <span>
        {label}
        {required && <span className="text-cyan-400 ml-0.5">*</span>}
      </span>
      <textarea
        className={`${fieldClass} min-h-[90px] leading-relaxed`}
        name={name}
        value={form[name]}
        onChange={change}
        required={required}
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intervention-title"
    >
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#30485a] bg-[#13293a] p-4 sm:p-6 shadow-2xl space-y-6 text-white min-w-0"
      >
        {/* Encabezado Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-300">
              <Wrench size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">
                Intervención Técnica
              </span>
            </div>
            <h2
              id="intervention-title"
              className="mt-1 text-base sm:text-xl font-bold text-white"
            >
              Revisión de falla F-{report.id}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Completa la intervención; los datos precargados se pueden editar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Ficha Técnica e Historial */}
        <section className="rounded-xl border border-[#2d4055] bg-[#0d2030] p-4 sm:p-5 shadow-inner space-y-4">
          <div className="flex items-center gap-2 text-cyan-300 border-b border-white/5 pb-2">
            <FileText size={16} />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
              Ficha Técnica del Activo
            </h3>
          </div>

          {assetResume?.asset ? (
            <dl className="grid grid-cols-2 gap-2 text-[10px] sm:gap-3 sm:text-xs">
              <div className="rounded-lg bg-[#102a3d] p-2.5 border border-white/5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Activo
                </dt>
                <dd className="mt-0.5 font-bold text-white">
                  {assetResume.asset.name || '—'}
                </dd>
              </div>

              <div className="rounded-lg bg-[#102a3d] p-2.5 border border-white/5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Marca / Modelo
                </dt>
                <dd className="mt-0.5 font-medium text-slate-200">
                  {[assetResume.asset.brand, assetResume.asset.model]
                    .filter(Boolean)
                    .join(' / ') || '—'}
                </dd>
              </div>

              <div className="rounded-lg bg-[#102a3d] p-2.5 border border-white/5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Serie / Inventario
                </dt>
                <dd className="mt-0.5 font-mono text-slate-200">
                  {[assetResume.asset.serialNumber, assetResume.asset.inventoryCode]
                    .filter(Boolean)
                    .join(' / ') || '—'}
                </dd>
              </div>

              <div className="rounded-lg bg-[#102a3d] p-2.5 border border-white/5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Ubicación / Estado
                </dt>
                <dd className="mt-0.5 font-medium text-slate-200">
                  {[assetResume.asset.location, assetResume.asset.operationalStatus]
                    .filter(Boolean)
                    .join(' / ') || '—'}
                </dd>
              </div>

              <div className="rounded-lg bg-[#102a3d] p-2.5 border border-white/5 sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Especificaciones
                </dt>
                <dd className="mt-0.5 text-slate-300 leading-relaxed">
                  {assetResume.asset.extraSpecifications ||
                    'Sin especificaciones registradas.'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-slate-400">
              No hay ficha técnica disponible para este activo.
            </p>
          )}

          <div className="space-y-2 pt-2 border-t border-white/5">
            <h4 className="text-xs font-bold text-slate-300">
              Hoja de vida ({assetResume?.maintenanceHistory?.length || 0}{' '}
              registros)
            </h4>
            {assetResume?.maintenanceHistory?.length ? (
              <div className="space-y-2">
                {assetResume.maintenanceHistory.map((record) => (
                  <details
                    key={record.id}
                    className="group rounded-lg border border-[#30485a] bg-[#102a3d] p-3 text-xs"
                  >
                    <summary className="cursor-pointer font-bold text-cyan-300 hover:text-cyan-200 transition-colors list-none flex items-center justify-between">
                      <span>
                        {record.type || 'Mantenimiento'} ·{' '}
                        {record.executedAt
                          ? new Date(record.executedAt).toLocaleString('es-CO')
                          : 'Sin fecha de ejecución'}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </summary>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:text-xs pt-2 border-t border-white/5">
                      {[
                        ['Técnico', record.technicianName],
                        [
                          'Estado',
                          record.finalEquipmentState || record.status,
                        ],
                        ['Síntoma inicial', record.initialReportedSymptom],
                        ['Falla encontrada', record.actualFailure],
                        ['Causa raíz', record.rootCause],
                        ['Trabajo realizado', record.tasksDescription],
                        ['Pruebas', record.testsPerformed],
                        [
                          'Tiempo efectivo',
                          record.workMinutes == null
                            ? null
                            : `${record.workMinutes} min`,
                        ],
                        ['Recomendaciones', record.recommendations],
                        ['Tareas pendientes', record.pendingTasks],
                        ['Recibido por', record.receivedBy],
                        [
                          'Repuestos',
                          record.replacedParts ||
                            record.parts
                              ?.map(
                                (part) =>
                                  `${part.partNumber} - ${part.name} (${part.quantity})`,
                              )
                              .join('; '),
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded bg-[#0d2030] p-2 border border-white/5"
                        >
                          <dt className="text-[10px] font-bold uppercase text-slate-400">
                            {label}
                          </dt>
                          <dd className="mt-0.5 whitespace-pre-wrap text-slate-200 font-medium">
                            {value || 'No registrado'}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Aún no hay mantenimientos registrados para este activo.
              </p>
            )}
          </div>
        </section>

        {/* Sección 1 */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 border-b border-white/10 pb-1.5">
            1. Identificación y reporte inicial
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {textField('equipmentIntervened', 'Equipo intervenido')}
            {textField('reportedAt', 'Fecha y hora de reporte', {
              type: 'datetime-local',
            })}
            {textField('inspectionStartedAt', 'Inicio de revisión', {
              type: 'datetime-local',
            })}
            {textArea('initialReportedSymptom', 'Síntoma o falla reportada')}
          </div>
        </section>

        {/* Sección 2 */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 border-b border-white/10 pb-1.5">
            2. Diagnóstico y causa
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {textArea('actualFailure', 'Falla real encontrada')}
            {textArea('rootCause', 'Causa raíz')}
          </div>
        </section>

        {/* Sección 3 */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 border-b border-white/10 pb-1.5">
            3. Acciones ejecutadas
          </h3>
          {textArea('tasksPerformed', 'Tareas realizadas')}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {textField('workMinutes', 'Tiempo efectivo (minutos)', {
              type: 'number',
            })}
          </div>

          {/* Selector Controlado de Repuestos e Insumos */}
          <div className="space-y-4 rounded-xl border border-[#30485a] bg-[#0d2030] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <Package size={16} />
                  <span>Repuestos e Insumos Utilizados</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Selecciona piezas de tu inventario o solicita insumos a otra zona/bodega externa.
                </p>
              </div>

              {/* Interruptor Repuesto de Otra Zona */}
              <label className="inline-flex items-center gap-2.5 cursor-pointer bg-[#102a3d] px-3 py-1.5 rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors">
                <input
                  type="checkbox"
                  checked={isExternalZone}
                  onChange={(e) => setIsExternalZone(e.target.checked)}
                  className="h-4 w-4 rounded accent-cyan-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-200">
                  Repuesto de otra zona o bodega externa
                </span>
              </label>
            </div>

            {loadingGroups && (
              <p className="text-xs text-slate-400">Cargando tus grupos y bodegas disponibles…</p>
            )}
            {groupError && (
              <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                No se pudo consultar toda la lista de zonas: {groupError}
              </p>
            )}

            {/* Zona seleccionada / Desplegable de Bodega Externa */}
            {isExternalZone ? (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <Layers size={14} />
                  <span>Bodega o Zona Externa de Origen:</span>
                </div>
                <select
                  value={selectedExternalZoneId}
                  onChange={(e) => setSelectedExternalZoneId(e.target.value)}
                  className={fieldClass}
                >
                  <option value="CENTRAL">Bodega Central (Existencias generales)</option>
                  {allZones
                    .filter((z) => !primaryGroup || String(z.id) !== String(primaryGroup.id))
                    .map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                </select>
                {!loadingGroups && allZones.length === 0 && (
                  <p className="text-[11px] text-amber-200">
                    No hay otras zonas disponibles además de la bodega central.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#102a3d] p-2.5 rounded-lg border border-white/5">
                <Check size={14} className="text-cyan-400 shrink-0" />
                <span>
                  Consultando catálogo de tu grupo asignado: <strong className="text-cyan-300">{primaryGroup?.name || "Mi Grupo de Trabajo"}</strong>
                </span>
              </div>
            )}

            {/* Desplegable de Repuestos del Inventario */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Pieza / Repuesto disponible ({availableItems.length} insumos)
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setPartSelectionError("");
                    }}
                    disabled={loadingItems}
                    className={fieldClass}
                  >
                    <option value="">-- Seleccionar repuesto del catálogo --</option>
                    {availableItems.map((itm) => {
                      const isOutOfStock = Number(itm.stock || 0) <= 0;
                      return (
                        <option
                          key={itm.id}
                          value={itm.id}
                          disabled={isOutOfStock}
                        >
                          {itm.name || itm.item} [{itm.category || "General"}] · Stock: {itm.stock} {itm.unit} {isOutOfStock ? "(Agotado)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Cantidad a usar {selectedItem ? "(" + selectedItem.unit + ")" : ""}
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    max={currentAvailableStock || undefined}
                    placeholder="Ej. 1"
                    value={partQuantity}
                    onChange={(e) => {
                      setPartQuantity(e.target.value);
                      setPartSelectionError("");
                    }}
                    disabled={!selectedItem}
                    className={fieldClass}
                  />
                </div>
              </div>

              {/* Información de Stock y Alertas */}
              {selectedItem && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#102a3d] p-2.5 text-xs border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Stock total: <strong>{selectedItem.stock} {selectedItem.unit}</strong></span>
                    <span className="text-slate-500">·</span>
                    <span className="text-cyan-300 font-bold">Disponible para esta orden: {currentAvailableStock} {selectedItem.unit}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">Categoría: {selectedItem.category || "General"}</span>
                </div>
              )}

              {partSelectionError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-200">
                  <AlertTriangle size={14} className="shrink-0 text-red-400" />
                  <span>{partSelectionError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={addPart}
                disabled={!selectedItem || !partQuantity || Number(partQuantity) <= 0}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3.5 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                <span>Agregar repuesto a la intervención</span>
              </button>
            </div>

            {/* Lista de Repuestos Utilizados en esta Intervención */}
            {parts.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-white/10">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Repuestos registrados en esta intervención ({parts.length}):
                </p>
                <div className="space-y-2">
                  {parts.map((part, index) => (
                    <div
                      key={"part-" + part.itemId + "-" + index}
                      className="flex items-center justify-between rounded-lg bg-[#102a3d] p-3 border border-white/5 text-xs text-slate-200"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-white font-medium">{part.name}</strong>
                          <span className="font-mono text-[11px] text-slate-400">({part.partNumber})</span>
                          <span
                            className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + (
                              part.isExternal
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                            )}
                          >
                            {part.isExternal ? ("Origen: " + part.sourceZoneName) : "Grupo Propio"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Cantidad a descontar: <strong className="text-cyan-300 font-mono">{part.quantity} {part.unit}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setParts((current) =>
                            current.filter((_, partIndex) => partIndex !== index),
                          )
                        }
                        title="Quitar repuesto"
                        className="text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded p-1.5 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sección 4 */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 border-b border-white/10 pb-1.5">
            4. Pruebas y estado final
          </h3>
          {textArea('testsPerformed', 'Pruebas realizadas')}
          <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
            <span>
              Estado final del equipo <span className="text-cyan-400">*</span>
            </span>
            <select
              className={fieldClass}
              name="finalEquipmentState"
              value={form.finalEquipmentState}
              onChange={change}
              required
            >
              <option value="">Selecciona el estado</option>
              {equipmentStates.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {/* Sección 5 */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 border-b border-white/10 pb-1.5">
            5. Recomendaciones y cierre
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {textArea('recommendations', 'Recomendaciones')}
            {textArea('pendingTasks', 'Tareas pendientes', {
              required: false,
            })}
            {textField('technicianName', 'Nombre de quien realizó el trabajo')}
            {textField('receivedBy', 'Nombre de quien recibe el equipo', {
              required: false,
            })}
          </div>
        </section>

        {/* Alerta de Error */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
          >
            {error}
          </div>
        )}

        {/* Acciones Modal */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-lg border border-white/10 bg-[#163044] px-5 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 transition-colors disabled:opacity-50 shadow-lg shadow-cyan-950/40"
          >
            {saving ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                <span>Guardando…</span>
              </>
            ) : (
              <span>Guardar intervención</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function OrderCard({ item, onStart, busy }) {
  const isFailure = item.kind === 'failure';
  return (
    <article className="rounded-xl border border-[#30485a] bg-[#102a3d] p-4 shadow-md transition-all hover:border-[#42617a] space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-cyan-300">
              {isFailure ? `F-${item.id}` : `MP-${item.id}`}
            </span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {item.assetName || 'Activo sin nombre'}
            </span>
            <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
              {item.estado || item.status}
            </span>
            {item.groupName && (
              <span className="inline-flex rounded-full border border-slate-500/30 bg-slate-500/15 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                Grupo: {item.groupName}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
            {item.descripcion ||
              item.workDescription ||
              'Mantenimiento preventivo programado'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Clock3 size={14} className="text-slate-500 shrink-0" />
            <span>
              {item.fechaReporte || item.scheduledAt
                ? new Date(
                    item.fechaReporte || item.scheduledAt,
                  ).toLocaleString('es-CO')
                : 'Sin fecha'}
            </span>
          </span>

          {isFailure ? (
            <button
              type="button"
              onClick={() => onStart(item)}
              disabled={busy}
              className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 transition-colors disabled:opacity-50 shadow-md shadow-cyan-950/40"
            >
              {busy ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Wrench size={14} />
              )}
              <span>
                {item.estado === 'EN_REVISION' ||
                item.estado === 'ESPERA_REPUESTO'
                  ? 'Continuar revisión'
                  : 'Iniciar revisión'}
              </span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-400/20">
              Técnico: {item.technicianName || 'Asignado'}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function OrdenesAsignadas({ onOpenPreventive }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [assetResume, setAssetResume] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await fetchOrders());
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'No fue posible cargar las órdenes asignadas.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((result) => {
        if (active) setOrders(result);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              'No fue posible cargar las órdenes asignadas.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openIntervention = async (report) => {
    setBusyId(report.id);
    setError('');
    try {
      const reviewedReport =
        report.estado !== 'EN_REVISION' && report.estado !== 'ESPERA_REPUESTO'
          ? await startFailureReview(report.id)
          : report;
      const resume = await getFailureAssetResume(report.id);
      setAssetResume(resume);
      setSelected(reviewedReport);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'No fue posible abrir la revisión.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const saved = async () => {
    setSelected(null);
    setAssetResume(null);
    await refresh();
  };

  return (
    <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-5 text-white min-w-0">
      {/* Encabezado */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-300">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Órdenes de Trabajo Asignadas
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Fallas correctivas y mantenimientos preventivos asignados a tu usuario.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label="Actualizar órdenes"
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-white/10 bg-[#102a3d] px-3.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors shrink-0"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin text-cyan-400' : ''}
            />
          </button>
          <button
            type="button"
            onClick={onOpenPreventive}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-cyan-600 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-950/40"
          >
            <Activity size={16} />
            <span>Abrir preventivos</span>
          </button>
        </div>
      </header>

      {/* Alerta de Error */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
        >
          {error}
        </div>
      )}

      {/* Lista de Órdenes */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <LoaderCircle
            className="mx-auto mb-2 animate-spin text-cyan-400"
            size={24}
          />
          <span>Cargando órdenes asignadas...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-[#2d4055] bg-[#0d2030] p-8 text-center text-xs text-slate-400">
          No tienes órdenes pendientes asignadas.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((item) => (
            <OrderCard
              key={`${item.kind}-${item.id}`}
              item={item}
              onStart={openIntervention}
              busy={busyId === item.id}
            />
          ))}
        </div>
      )}

      {/* Modal de Formulario */}
      {selected && (
        <InterventionForm
          report={selected}
          assetResume={assetResume}
          onClose={() => setSelected(null)}
          onSaved={saved}
        />
      )}
    </section>
  );
}
