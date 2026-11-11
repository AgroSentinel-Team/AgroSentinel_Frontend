import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function AccesoDenegado() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#081723] p-4 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-red-400/20 bg-[#102637] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-400/10 text-red-300">
          <ShieldAlert size={32} />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-red-300">Error 403</p>
        <h1 className="mt-2 text-2xl font-bold">Acceso denegado</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Tu cuenta no tiene permisos para consultar este recurso. Si crees que es un error, solicita acceso al administrador.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-semibold hover:bg-cyan-500"
        >
          <ArrowLeft size={16} /> Volver
        </button>
      </section>
    </main>
  );
}
