import Inventario from '../Compartido/Inventario';

export default function InventarioRepuestos() {
  return (
    <section className="space-y-4 text-ink-900 min-w-0">
      <header className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-1">
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-ink-900">
          Inventario de Repuestos
        </h1>
        <p className="text-xs text-ink-600">
          Consulta existencias y niveles críticos de piezas y materiales.
        </p>
      </header>

      <Inventario variant="dark" />
    </section>
  );
}