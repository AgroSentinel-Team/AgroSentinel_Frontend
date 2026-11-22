import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function AccesoDenegado() {
  const navigate = useNavigate();

  return (
    <main className="agro-auth-background flex min-h-dvh items-center justify-center px-4 py-[calc(1rem+var(--agro-safe-top))] pb-[calc(1rem+var(--agro-safe-bottom))] text-ink-900">
      <ThemeToggle className="fixed right-[calc(1rem+var(--agro-safe-right))] top-[calc(1rem+var(--agro-safe-top))] z-50" />
      <section className="w-full max-w-lg rounded-3xl border border-sand-200 bg-sand-50 p-6 text-center shadow-[var(--agro-shadow-card)] sm:p-8">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-error-soft text-error-text">
          <ShieldAlert size={32} />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-error-text">Error 403</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink-900">Acceso denegado</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          Tu cuenta no tiene permisos para consultar este recurso. Si crees que es un error, solicita acceso al administrador.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-pine-700 px-4 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-pine-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600"
        >
          <ArrowLeft size={16} /> Volver
        </button>
      </section>
    </main>
  );
}
