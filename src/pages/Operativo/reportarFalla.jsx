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
    <section className="space-y-5 text-ink-900 min-w-0">
      <header className="border-b border-sand-200 pb-4">
        <div className="flex items-center gap-2 text-error-text">
          <AlertTriangle size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Incidencias y Fallas
          </span>
        </div>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
          Reportar nueva falla
        </h1>
        <p className="mt-0.5 text-xs text-ink-600">
          Documenta la novedad para coordinación y mantenimiento técnico.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-sand-200 pb-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-soft border border-error/20 text-error-text">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink-900">Detalle de la novedad</h2>
              <p className="mt-0.5 text-xs text-ink-600">Completa la información requerida para generar la solicitud.</p>
            </div>
          </div>

          <form onSubmit={submitReport} className="space-y-4">
            <div>
              <label htmlFor="falla-equipment" className="block text-xs font-medium text-ink-600 mb-1.5">
                Equipo / Maquinaria <span className="text-error-text">*</span>
              </label>
              <input
                id="falla-equipment"
                required
                value={form.equipment}
                onChange={(event) => updateField('equipment', event.target.value)}
                className="w-full rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2.5 text-xs sm:text-sm text-ink-900 placeholder:text-ink-600 outline-none transition-all duration-200 ease-out focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25 min-h-[44px]"
                placeholder="Ej. Fumigadora Jacto 3030"
              />
            </div>

            <div>
              <label htmlFor="falla-type" className="block text-xs font-medium text-ink-600 mb-1.5">
                Tipo de falla <span className="text-error-text">*</span>
              </label>
              <input
                id="falla-type"
                required
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
                className="w-full rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2.5 text-xs sm:text-sm text-ink-900 placeholder:text-ink-600 outline-none transition-all duration-200 ease-out focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25 min-h-[44px]"
                placeholder="Ej. Fuga de manguera hidráulica"
              />
            </div>

            <div>
              <label htmlFor="falla-description" className="block text-xs font-medium text-ink-600 mb-1.5">
                Descripción detallada <span className="text-error-text">*</span>
              </label>
              <textarea
                id="falla-description"
                required
                rows={4}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                className="w-full rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2.5 text-xs sm:text-sm text-ink-900 placeholder:text-ink-600 outline-none transition-all duration-200 ease-out focus:border-gold-600 focus:ring-1 focus:ring-gold-500/25"
                placeholder="Describe la falla observada, ruidos extraños, fugas o comportamiento anómalo..."
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-gold-500 px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-pine-900 transition-all duration-200 ease-out hover:bg-gold-600 active:bg-gold-600 shadow-lg shadow-gold-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            >
              Enviar reporte
            </button>

            {submitted && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-forest-300/50 bg-success-soft p-3 text-xs font-semibold text-forest-700"
              >
                <CheckCircle2 size={16} className="text-forest-700 shrink-0" />
                <span>Reporte enviado correctamente para revisión y asignación técnica.</span>
              </div>
            )}
          </form>
        </article>

        <aside className="space-y-4">
          <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-3 border-b border-sand-200 pb-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft border border-warning/30 text-forest-900">
                <Wrench size={18} />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold text-ink-900">Prioridad sugerida</p>
                <p className="text-[11px] text-ink-600">Recomendaciones operativas</p>
              </div>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs text-forest-900 leading-relaxed">
              Se recomienda atención inmediata si existe riesgo de seguridad para el operario o pérdida de operación en campo.
            </div>
          </div>

          <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-3 border-b border-sand-200 pb-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info-soft border border-ocean-300/60 text-ocean-700">
                <PhoneCall size={18} />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold text-ink-900">Contacto rápido</p>
                <p className="text-[11px] text-ink-600">Asistencia técnica directa</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Técnico de turno:</span>
                <span className="font-semibold text-ink-900">Héctor Ortiz</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Teléfono directo:</span>
                <a
                  href="tel:+573004567890"
                  className="font-mono font-semibold text-ocean-700 hover:underline"
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