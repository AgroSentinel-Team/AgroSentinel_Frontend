import Inventario from '../Compartido/Inventario';

export default function InventarioRepuestos() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#2d4055] bg-[#13293a] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-white">Inventario de Repuestos</h2>
        <p className="mt-1 text-[11px] text-gray-400">Consulta existencias y niveles críticos de piezas y materiales.</p>
      </div>
      <Inventario variant="dark" />
    </div>
  );
}
