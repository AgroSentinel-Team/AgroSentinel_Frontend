import { useCallback, useEffect, useState } from 'react';
import { Activity, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  getAssignedFailureReports,
  getFailureAssetResume,
  saveFailureIntervention,
  startFailureReview,
} from '../../services/technicianService';
import { getPreventiveMaintenances } from '../../services/preventiveMaintenanceService';

const equipmentStates = [
  ['OPERATIONAL', '100% operativo'],
  ['OPERATIONAL_WITH_RESTRICTIONS', 'Operando con restricciones'],
  ['INOPERATIVE_WAITING_PART', 'Inoperativo a la espera de repuesto'],
];

const localDateTime = (value) => value ? value.slice(0, 16) : '';

const localDateTimePayload = (value) => value ? `${value}:00` : null;

async function fetchOrders() {
  const [failures, preventive] = await Promise.all([
    getAssignedFailureReports(),
    getPreventiveMaintenances(),
  ]);
  return [
    ...failures.filter((item) => item.estado !== 'RESUELTO').map((item) => ({ ...item, kind: 'failure' })),
    ...preventive.filter((item) => ['SCHEDULED', 'PARTIALLY_COMPLETED', 'URGENT_CORRECTIVE'].includes(item.status))
      .map((item) => ({ ...item, kind: 'preventive' })),
  ].sort((a, b) => new Date(b.fechaReporte || b.scheduledAt || 0) - new Date(a.fechaReporte || a.scheduledAt || 0));
}

function InterventionForm({ report, assetResume, onClose, onSaved }) {
  const currentName = localStorage.getItem('nombre') || report.assignedTechnicianName || '';
  const [form, setForm] = useState({
    equipmentIntervened: [report.assetName, report.assetBrand, report.assetModel, report.assetSerialNumber]
      .filter(Boolean).join(' - '),
    initialReportedSymptom: report.descripcion || '',
    reportedAt: localDateTime(report.fechaReporte),
    inspectionStartedAt: localDateTime(report.fechaInicioRevision || new Date().toISOString()),
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
  const [partDraft, setPartDraft] = useState({ partNumber: '', name: '', brand: '', quantity: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const addPart = () => {
    if (!partDraft.partNumber.trim() || !partDraft.name.trim() || !partDraft.quantity || Number(partDraft.quantity) <= 0) {
      setError('Completa número de parte, nombre y cantidad mayor que cero.');
      return;
    }
    setParts((current) => [...current, { ...partDraft, quantity: Number(partDraft.quantity) }]);
    setPartDraft({ partNumber: '', name: '', brand: '', quantity: '' });
    setError('');
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
      setError(requestError.response?.data?.message || requestError.message || 'No fue posible guardar la intervención.');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'w-full rounded border border-[#30485a] bg-[#0b1d2b] px-3 py-2 text-sm text-white placeholder:text-gray-500';
  const textField = (name, label, { type = 'text', required = true } = {}) => (
    <label className="block space-y-1 text-xs text-gray-300">
      <span>{label}{required ? ' *' : ''}</span>
      <input className={fieldClass} type={type} name={name} value={form[name]} onChange={change} required={required} />
    </label>
  );
  const textArea = (name, label, { required = true } = {}) => (
    <label className="block space-y-1 text-xs text-gray-300">
      <span>{label}{required ? ' *' : ''}</span>
      <textarea className={`${fieldClass} min-h-20`} name={name} value={form[name]} onChange={change} required={required} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="intervention-title">
      <form onSubmit={submit} className="mx-auto max-w-4xl space-y-5 rounded-xl border border-[#30485a] bg-[#13293a] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="intervention-title" className="text-lg font-semibold text-white">Revisión de falla F-{report.id}</h2>
            <p className="text-sm text-gray-400">Completa la intervención; los datos precargados se pueden editar.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-3 py-1 text-gray-300 hover:bg-white/10">Cerrar</button>
        </div>

        <section className="rounded-lg border border-[#30485a] bg-[#102a3d] p-4">
          <h3 className="mb-2 text-sm font-semibold text-cyan-200">Ficha técnica del activo</h3>
          {assetResume?.asset ? (
            <dl className="grid gap-2 text-xs text-gray-300 sm:grid-cols-2">
              <div><dt className="text-gray-500">Activo</dt><dd>{assetResume.asset.name || '—'}</dd></div>
              <div><dt className="text-gray-500">Marca / modelo</dt><dd>{[assetResume.asset.brand, assetResume.asset.model].filter(Boolean).join(' / ') || '—'}</dd></div>
              <div><dt className="text-gray-500">Serie / inventario</dt><dd>{[assetResume.asset.serialNumber, assetResume.asset.inventoryCode].filter(Boolean).join(' / ') || '—'}</dd></div>
              <div><dt className="text-gray-500">Ubicación / estado</dt><dd>{[assetResume.asset.location, assetResume.asset.operationalStatus].filter(Boolean).join(' / ') || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-gray-500">Especificaciones</dt><dd>{assetResume.asset.extraSpecifications || 'Sin especificaciones registradas.'}</dd></div>
            </dl>
          ) : <p className="text-sm text-gray-400">No hay ficha técnica disponible para este activo.</p>}
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold text-gray-200">Hoja de vida ({assetResume?.maintenanceHistory?.length || 0} registros)</h4>
            {assetResume?.maintenanceHistory?.length
              ? assetResume.maintenanceHistory.map((record) => (
                <details key={record.id} className="rounded border border-[#30485a] px-3 py-2">
                  <summary className="cursor-pointer text-xs text-cyan-200">
                    {record.type || 'Mantenimiento'} · {record.executedAt ? new Date(record.executedAt).toLocaleString() : 'Sin fecha de ejecución'}
                  </summary>
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    {[
                      ['Técnico', record.technicianName],
                      ['Estado', record.finalEquipmentState || record.status],
                      ['Síntoma inicial', record.initialReportedSymptom],
                      ['Falla encontrada', record.actualFailure],
                      ['Causa raíz', record.rootCause],
                      ['Trabajo realizado', record.tasksDescription],
                      ['Pruebas', record.testsPerformed],
                      ['Tiempo efectivo', record.workMinutes == null ? null : `${record.workMinutes} min`],
                      ['Recomendaciones', record.recommendations],
                      ['Tareas pendientes', record.pendingTasks],
                      ['Recibido por', record.receivedBy],
                      ['Repuestos', record.replacedParts || record.parts?.map((part) =>
                        `${part.partNumber} - ${part.name} (${part.quantity})`).join('; ')],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="whitespace-pre-wrap text-gray-200">{value || 'No registrado'}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))
              : <p className="text-xs text-gray-400">Aún no hay mantenimientos registrados para este activo.</p>}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-cyan-200">1. Identificación y reporte inicial</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {textField('equipmentIntervened', 'Equipo intervenido')}
            {textField('reportedAt', 'Fecha y hora de reporte', { type: 'datetime-local' })}
            {textField('inspectionStartedAt', 'Inicio de revisión', { type: 'datetime-local' })}
            {textArea('initialReportedSymptom', 'Síntoma o falla reportada')}
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-cyan-200">2. Diagnóstico y causa</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {textArea('actualFailure', 'Falla real encontrada')}
            {textArea('rootCause', 'Causa raíz')}
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-cyan-200">3. Acciones ejecutadas</h3>
          {textArea('tasksPerformed', 'Tareas realizadas')}
          <div className="grid gap-3 sm:grid-cols-2">
            {textField('workMinutes', 'Tiempo efectivo (minutos)', { type: 'number' })}
          </div>
          <div className="space-y-2 rounded-lg border border-[#30485a] p-3">
            <p className="text-xs font-semibold text-gray-200">Repuestos e insumos (opcional)</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {['partNumber', 'name', 'brand', 'quantity'].map((field) => (
                <input key={field} className={fieldClass} aria-label={{ partNumber: 'Número de parte', name: 'Nombre', brand: 'Marca', quantity: 'Cantidad' }[field]}
                  placeholder={{ partNumber: 'Número de parte', name: 'Nombre', brand: 'Marca', quantity: 'Cantidad' }[field]}
                  type={field === 'quantity' ? 'number' : 'text'} min={field === 'quantity' ? '0.001' : undefined}
                  value={partDraft[field]} onChange={(event) => setPartDraft((current) => ({ ...current, [field]: event.target.value }))} />
              ))}
            </div>
            <button type="button" onClick={addPart} className="rounded border border-cyan-700 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-900/30">Agregar repuesto</button>
            {parts.map((part, index) => (
              <div key={`${part.partNumber}-${index}`} className="flex items-center justify-between text-xs text-gray-300">
                <span>{part.partNumber} · {part.name} · {part.quantity} {part.brand && `· ${part.brand}`}</span>
                <button type="button" onClick={() => setParts((current) => current.filter((_, partIndex) => partIndex !== index))} className="text-red-300">Quitar</button>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-cyan-200">4. Pruebas y estado final</h3>
          {textArea('testsPerformed', 'Pruebas realizadas')}
          <label className="block space-y-1 text-xs text-gray-300">
            <span>Estado final del equipo *</span>
            <select className={fieldClass} name="finalEquipmentState" value={form.finalEquipmentState} onChange={change} required>
              <option value="">Selecciona el estado</option>
              {equipmentStates.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </section>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-cyan-200">5. Recomendaciones y cierre</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {textArea('recommendations', 'Recomendaciones')}
            {textArea('pendingTasks', 'Tareas pendientes', { required: false })}
            {textField('technicianName', 'Nombre de quien realizó el trabajo')}
            {textField('receivedBy', 'Nombre de quien recibe el equipo', { required: false })}
          </div>
        </section>
        {error && <p role="alert" className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-gray-300 hover:bg-white/10">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar intervención'}
          </button>
        </div>
      </form>
    </div>
  );
}

function OrderCard({ item, onStart, busy }) {
  const isFailure = item.kind === 'failure';
  return (
    <article className="rounded-md border border-[#30485a] bg-[#102a3d] p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-blue-400">{isFailure ? `F-${item.id}` : `MP-${item.id}`}</span>
            <span className="text-[11px] font-medium text-white">{item.assetName || 'Activo sin nombre'}</span>
            <span className="rounded bg-blue-500/15 px-2 py-1 text-[11px] text-blue-200">{item.estado || item.status}</span>
            {item.groupName && <span className="rounded bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200">Grupo: {item.groupName}</span>}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">{item.descripcion || item.workDescription || 'Mantenimiento preventivo programado'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
            <Clock3 size={11} /> {item.fechaReporte || item.scheduledAt
              ? new Date(item.fechaReporte || item.scheduledAt).toLocaleString()
              : 'Sin fecha'}
          </span>
          {isFailure
            ? <button type="button" onClick={() => onStart(item)} disabled={busy}
              className="rounded bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {item.estado === 'EN_REVISION' || item.estado === 'ESPERA_REPUESTO' ? 'Continuar revisión' : 'Iniciar revisión'}
            </button>
            : <span className="text-[11px] text-cyan-200">Técnico: {item.technicianName || 'Asignado'}</span>}
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
      setError(requestError.response?.data?.message || requestError.message || 'No fue posible cargar las órdenes asignadas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((result) => { if (active) setOrders(result); })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'No fue posible cargar las órdenes asignadas.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openIntervention = async (report) => {
    setBusyId(report.id);
    setError('');
    try {
      const reviewedReport = report.estado !== 'EN_REVISION' && report.estado !== 'ESPERA_REPUESTO'
        ? await startFailureReview(report.id)
        : report;
      const resume = await getFailureAssetResume(report.id);
      setAssetResume(resume);
      setSelected(reviewedReport);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'No fue posible abrir la revisión.');
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
    <>
      <section className="space-y-4 rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400"><ShieldCheck size={16} /></div>
            <div>
              <h2 className="text-[13px] font-semibold text-white">Órdenes de Trabajo Asignadas</h2>
              <p className="text-[11px] text-gray-400">Fallas correctivas y mantenimientos preventivos asignados a tu usuario.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={refresh} aria-label="Actualizar órdenes" className="rounded-md border border-[#30485a] p-2 text-gray-300 hover:bg-white/10"><RefreshCw size={14} /></button>
            <button type="button" onClick={onOpenPreventive} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-500">
              <Activity size={13} /> Abrir preventivos
            </button>
          </div>
        </div>

        {error && <p role="alert" className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        {loading ? <p className="text-sm text-gray-400">Cargando órdenes asignadas...</p>
          : orders.length === 0 ? <p className="rounded-lg border border-[#30485a] p-4 text-sm text-gray-400">No tienes órdenes pendientes asignadas.</p>
            : <div className="space-y-2">
              {orders.map((item) => <OrderCard key={`${item.kind}-${item.id}`} item={item} onStart={openIntervention} busy={busyId === item.id} />)}
            </div>}
      </section>
      {selected && <InterventionForm report={selected} assetResume={assetResume} onClose={() => setSelected(null)} onSaved={saved} />}
    </>
  );
}
