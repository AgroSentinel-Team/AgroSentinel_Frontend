import Inventario from '../Compartido/Inventario';

export default function InventarioRepuestos() {
  return (
    <section className="space-y-4 text-white min-w-0">
      <header className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-1">
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
          Inventario de Repuestos
        </h1>
        <p className="text-xs text-slate-400">
          Consulta existencias y niveles críticos de piezas y materiales.
        </p>
      </header>

      <Inventario variant="dark" />
    </section>
  );
}