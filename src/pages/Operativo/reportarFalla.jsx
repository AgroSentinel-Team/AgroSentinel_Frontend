import { useState } from 'react';
import { AlertTriangle, Wrench, PhoneCall } from 'lucide-react';

export default function ReportarFalla() {
  const [form, setForm] = useState({ equipment: '', type: '', description: '' });
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field, value) => {
    setSubmitted(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitReport = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-white">Reportar nueva falla</h1>
        <p className="mt-1 text-[12px] text-gray-400">Documenta la novedad para coordinación y mantenimiento.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-[#202a36] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
              <AlertTriangle size={18} />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-white">Detalle de la novedad</p>
              <p className="text-[10px] text-gray-400">Completa la información para generar la solicitud.</p>
            </div>
          </div>

          <form onSubmit={submitReport} className="space-y-4">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-gray-400">Equipo</label>
              <input required value={form.equipment} onChange={(event) => updateField('equipment', event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#141b24] px-3 py-2 text-[12px] text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Ej. Fumigadora Jacto 3030" />
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-gray-400">Tipo de falla</label>
              <input required value={form.type} onChange={(event) => updateField('type', event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#141b24] px-3 py-2 text-[12px] text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Ej. Fuga de manguera" />
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-gray-400">Descripción</label>
              <textarea required rows="4" value={form.description} onChange={(event) => updateField('description', event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#141b24] px-3 py-2 text-[12px] text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Describe la falla observada..." />
            </div>

            <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-emerald-500">Enviar reporte</button>
            {submitted && <p className="text-center text-[10px] font-semibold text-emerald-300">Reporte enviado para revisión y asignación técnica.</p>}
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#202a36] p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><Wrench size={16} /></span>
              <div>
                <p className="text-[13px] font-semibold text-white">Prioridad sugerida</p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-500/15 p-3 text-[11px] text-amber-200">Se recomienda atención inmediata si hay riesgo de seguridad o pérdida de operación.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#202a36] p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300"><PhoneCall size={16} /></span>
              <div>
                <p className="text-[13px] font-semibold text-white">Contacto rápido</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400">Técnico de turno: <span className="font-semibold text-white">Héctor Ortiz</span></p>
            <p className="mt-2 text-[11px] text-gray-400">Teléfono: <span className="font-semibold text-white">+57 300 456 7890</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
