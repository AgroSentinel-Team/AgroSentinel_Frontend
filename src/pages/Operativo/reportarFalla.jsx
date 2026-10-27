import { useState } from 'react';
import { AlertTriangle, CheckCircle2, PhoneCall, Wrench } from 'lucide-react';

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
    <section className="space-y-5 text-white min-w-0">
      <header className="border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Incidencias y Fallas
          </span>
        </div>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
          Reportar nueva falla
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Documenta la novedad para coordinación y mantenimiento técnico.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Detalle de la novedad</h2>
              <p className="mt-0.5 text-xs text-slate-400">Completa la información requerida para generar la solicitud.</p>
            </div>
          </div>

          <form onSubmit={submitReport} className="space-y-4">
            <div>
              <label htmlFor="falla-equipment" className="block text-xs font-medium text-slate-300 mb-1.5">
                Equipo / Maquinaria <span className="text-red-400">*</span>
              </label>
              <input
                id="falla-equipment"
                required
                value={form.equipment}
                onChange={(event) => updateField('equipment', event.target.value)}
                className="w-full rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px]"
                placeholder="Ej. Fumigadora Jacto 3030"
              />
            </div>

            <div>
              <label htmlFor="falla-type" className="block text-xs font-medium text-slate-300 mb-1.5">
                Tipo de falla <span className="text-red-400">*</span>
              </label>
              <input
                id="falla-type"
                required
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
                className="w-full rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px]"
                placeholder="Ej. Fuga de manguera hidráulica"
              />
            </div>

            <div>
              <label htmlFor="falla-description" className="block text-xs font-medium text-slate-300 mb-1.5">
                Descripción detallada <span className="text-red-400">*</span>
              </label>
              <textarea
                id="falla-description"
                required
                rows={4}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                className="w-full rounded-lg border border-[#36556f] bg-[#081723] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
                placeholder="Describe la falla observada, ruidos extraños, fugas o comportamiento anómalo..."
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-lg bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-950/40"
            >
              Enviar reporte
            </button>

            {submitted && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-200"
              >
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Reporte enviado correctamente para revisión y asignación técnica.</span>
              </div>
            )}
          </form>
        </article>

        <aside className="space-y-4">
          <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-3 border-b border-white/10 pb-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <Wrench size={18} />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">Prioridad sugerida</p>
                <p className="text-[11px] text-slate-400">Recomendaciones operativas</p>
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
              Se recomienda atención inmediata si existe riesgo de seguridad para el operario o pérdida de operación en campo.
            </div>
          </div>

          <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-3 border-b border-white/10 pb-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                <PhoneCall size={18} />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">Contacto rápido</p>
                <p className="text-[11px] text-slate-400">Asistencia técnica directa</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Técnico de turno:</span>
                <span className="font-semibold text-white">Héctor Ortiz</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Teléfono directo:</span>
                <a
                  href="tel:+573004567890"
                  className="font-mono font-semibold text-cyan-300 hover:underline"
                >
                  +57 300 456 7890
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}