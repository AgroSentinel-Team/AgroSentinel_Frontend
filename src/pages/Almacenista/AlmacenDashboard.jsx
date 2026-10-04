import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Bell,
  LayoutGrid,
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  SlidersHorizontal,
  Package,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import Inventario from "../Compartido/Inventario";
import Reportes from "../Compartido/Reportes";
import Entradas from "../Compartido/Entradas";
import Salidas from "../Compartido/Salidas";
import InventoryTasks from "../../components/InventoryTasks";
import {
  getInventoryItems,
  getInventoryMovements,
} from "../../services/inventoryService";

function SidebarItem({ icon: Icon, children, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex w-full items-center gap-3
        rounded-md px-3 py-2.5
        text-left text-[11px]
        transition
        ${
          active
            ? "bg-[#143c50] text-cyan-200 shadow-[inset_0_1px_0_rgba(125,211,252,0.1)]"
            : "text-slate-300 hover:bg-[#143c50] hover:text-white"
        }
      `}
    >
      <Icon size={14} strokeWidth={1.7} />

      <span>{children}</span>

      {active && (
        <span
          className="
            absolute right-3
            h-3 w-[3px]
            rounded-full
            bg-cyan-400
          "
        />
      )}
    </button>
  );
}

function StatCard({
  title,
  value,
  suffix,
  badge,
  badgeColor,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        flex h-[82px]
        w-full
        flex-col justify-between
        rounded-xl
        border border-[#2d4055]
        bg-[#172c3d]
        px-4 py-4
        text-left
        ${onClick ? "cursor-pointer transition hover:border-cyan-400/50 hover:bg-[#1a3245]" : "cursor-default"}
      `}
    >
      <div className="flex items-center justify-between">
        <span
          className="
            text-[11px]
            font-medium
            uppercase
            tracking-wide
            text-slate-400
          "
        >
          {title}
        </span>

        <span
          className={`
            rounded-md px-2 py-1
            text-[12px] font-semibold
            ${badgeColor}
          `}
        >
          {badge}
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-[28px] font-bold leading-none text-white">
          {value}
        </span>

        <span className="text-[11px] text-slate-400">
          {suffix}
        </span>
      </div>
    </button>
  );
}

function StatusBadge({ status, type }) {
  const styles = {
    success: "border border-emerald-400/30 bg-[#1a382d] text-emerald-300",
    progress: "border border-cyan-400/30 bg-[#173d4f] text-cyan-300",
    danger: "border border-red-400/30 bg-[#40272d] text-red-300",
  };

  return (
    <span
      className={`
        inline-flex rounded-md
        px-2 py-[3px]
        text-[11px] font-semibold
        ${styles[type]}
      `}
    >
      {status}
    </span>
  );
}

function MovementType({ type }) {
  const isEntry = type === "entrada";

  return (
    <div className="flex items-center gap-1.5">
      {isEntry ? (
        <ArrowDownLeft
          size={11}
          strokeWidth={2.5}
          className="text-emerald-400"
        />
      ) : (
        <ArrowUpRight
          size={11}
          strokeWidth={2.5}
          className="text-cyan-400"
        />
      )}

      <span className="text-[12px] text-slate-300">
        {type}
      </span>
    </div>
  );
}

function MovementRow({ movement }) {
  const date = new Date(movement.fecha);

  return (
    <div
      className="
        grid
        grid-cols-[1.8fr_.65fr_.55fr_.65fr_.6fr]
        items-center
        border-b border-[#2d4055]
        px-3
        py-2.5
        last:border-b-0
      "
    >
      {/* Producto */}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-white">
          {movement.itemName}
        </p>

        <p className="mt-1 text-[12px] text-slate-400">
          ID: {movement.itemId}
        </p>
      </div>

      {/* Tipo */}
      <MovementType type={movement.tipo} />

      {/* Cantidad */}
      <div className="text-[12px] font-medium text-slate-200">
        {Number(movement.cantidad).toLocaleString()}{" "}
        <span className="font-normal text-slate-400">
          {movement.itemUnit || ""}
        </span>
      </div>

      {/* Fecha */}
      <div className="font-mono text-[12px] text-slate-400">
        {Number.isNaN(date.getTime()) ? "—" : date.toLocaleString()}
      </div>

      {/* Estado */}
      <div>
        <StatusBadge
          status="Completado"
          type="success"
        />
      </div>
    </div>
  );
}

export default function SgaControlDashboard() {
  const [activeTab, setActiveTab] = useState("Inicio");
  const [movements, setMovements] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [dashboardDataLoaded, setDashboardDataLoaded] = useState(false);
  const [movementFilter, setMovementFilter] = useState("todos");
  const [movementError, setMovementError] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getInventoryMovements(), getInventoryItems()])
      .then(([history, items]) => {
        if (active) {
          setMovements(history);
          setInventoryItems(items);
          setDashboardDataLoaded(true);
          setMovementError("");
        }
      })
      .catch((error) => {
        if (active) {
          setMovementError(
            error.response?.data?.detail
              || error.response?.data?.message
              || error.message
              || "No se pudo cargar el historial.",
          );
        }
      });
    return () => { active = false; };
  }, [activeTab]);

  const today = new Date().toLocaleDateString();
  const todaysEntries = movements.filter((movement) => (
    movement.tipo === "entrada" && new Date(movement.fecha).toLocaleDateString() === today
  )).length;
  const todaysExits = movements.filter((movement) => (
    movement.tipo === "salida" && new Date(movement.fecha).toLocaleDateString() === today
  )).length;
  const lowStockCount = inventoryItems.filter((item) => (
    Number(item.stock) < Number(item.minimum)
  )).length;
  const lowStockItems = inventoryItems.filter((item) => (
    Number(item.stock) < Number(item.minimum)
  ));
  const visibleMovements = useMemo(
    () => movements
      .filter((movement) => movementFilter === "todos" || movement.tipo === movementFilter)
      .slice(0, 6),
    [movements, movementFilter],
  );

  const content = { Inventario: <Inventario />, Entradas: <Entradas />, Salidas: <Salidas />, Reportes: <Reportes /> };
  return (
    <div
      className="
        min-h-screen
        bg-[#020d16]
        font-sans
        text-white
      "
    >
      <div className="flex min-h-screen w-full overflow-hidden bg-[#020d16]">

        {/* ================================================= */}
        {/* SIDEBAR */}
        {/* ================================================= */}

        <aside
          className="
            hidden w-[190px]
            shrink-0
            border-r border-[#1b2f3f]
            bg-[#0d1f2d]
            md:block
          "
        >
          {/* Logo */}
          <div
            className="
              flex h-[58px]
              items-center gap-2
              border-b border-[#1b2f3f]
              px-4
            "
          >
            <div
              className="
                flex h-[26px] w-[26px]
                items-center justify-center
                rounded-md
                bg-[#0f9ec7]
              "
            >
              <Package
                size={15}
                strokeWidth={2}
                className="text-white"
              />
            </div>

            <div>
              <p className="text-[14px] font-semibold leading-none text-cyan-300">
                SGA CONTROL
              </p>

              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                ALMACÉN CENTRAL
              </p>
            </div>
          </div>

          {/* Menu */}
          <nav className="space-y-1 px-3 py-4">
            <SidebarItem
              icon={LayoutGrid}
              active={activeTab === "Inicio"}
              onClick={() => setActiveTab("Inicio")}
            >
              Inicio
            </SidebarItem>

            <div className="mt-1">
              <SidebarItem icon={Archive} active={activeTab === "Inventario"} onClick={() => setActiveTab("Inventario")}>
                Inventario
              </SidebarItem>
            </div>

            <SidebarItem icon={ArrowDownLeft} active={activeTab === "Entradas"} onClick={() => setActiveTab("Entradas")}>
              Entradas
            </SidebarItem>

            <SidebarItem icon={ArrowUpRight} active={activeTab === "Salidas"} onClick={() => setActiveTab("Salidas")}>
              Salidas
            </SidebarItem>

            <SidebarItem icon={BarChart3} active={activeTab === "Reportes"} onClick={() => setActiveTab("Reportes")}>
              Reportes
            </SidebarItem>
          </nav>

          {/* Occupancy */}
          <div className="mx-4 mt-8 border-t border-[#1b2f3f] pt-4">
            <div className="flex justify-between">
              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                OCUPACIÓN TOTAL
              </span>

              <span className="text-[11px] font-semibold text-white">
                78%
              </span>
            </div>

            <div className="mt-2 h-[4px] overflow-hidden rounded-full bg-[#344158]">
              <div className="h-full w-[78%] bg-cyan-400" />
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Ubicaciones libres: 342
            </p>
          </div>
        </aside>

        {/* ================================================= */}
        {/* MAIN */}
        {/* ================================================= */}

        <main className="flex min-w-0 flex-1 flex-col bg-[#020d16]">

          {/* HEADER */}
          <header
            className="
              flex min-h-[58px]
              items-center justify-between
              gap-3
              border-b border-[#1f3446]
              bg-[#0d2437]
              px-5
            "
          >
            {/* Search */}
            <div
              className="
                flex h-[32px]
                w-[215px]
                items-center gap-2
                rounded-md
                border border-[#36556f]
                bg-[#102a3d]
                px-2.5
                transition
                focus-within:border-cyan-400
              "
            >
              <Search
                size={13}
                className="text-slate-400"
              />

              <input
                type="text"
                placeholder="Buscar producto, SKU o lote..."
                className="
                  w-full
                  bg-transparent
                  text-[11px]
                  text-white
                  outline-none
                  placeholder:text-slate-400
                "
              />
            </div>

            {/* Header right */}
            <div className="flex items-center gap-3">
              <LogoutButton className="text-slate-300 hover:bg-[#1d3d52] hover:text-white" />

              {/* Register */}
              <button
                type="button"
                onClick={() => setActiveTab("Entradas")}
                className="
                  flex h-[30px]
                  items-center gap-1.5
                  rounded-md
                  bg-blue-600
                  px-3
                  text-[11px]
                  font-semibold
                  text-white
                  transition
                  hover:bg-blue-500
                "
              >
                <Plus size={12} strokeWidth={2.5} />
                Registrar Entrada
              </button>

              {/* Notification */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAlertsOpen((open) => !open)}
                  aria-label={`Alertas de stock bajo: ${lowStockCount}`}
                  aria-expanded={alertsOpen}
                  className="
                  relative flex h-8 w-8
                  items-center justify-center
                  rounded-md
                  border border-[#36556f]
                  bg-[#102a3d]
                  text-slate-300 transition hover:bg-[#1d3d52] hover:text-white
                  "
                >
                  <Bell size={15} />
                  {lowStockCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[11px] font-bold text-white">
                      {lowStockCount}
                    </span>
                  )}
                </button>
                {alertsOpen && (
                  <div className="absolute right-0 top-9 z-50 w-72 rounded-xl border border-[#36556f] bg-[#13293a] p-4 shadow-xl">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[14px] font-semibold text-white">Alertas de inventario</h3>
                        <p className="mt-1 text-[11px] text-slate-300">Se activa si el stock está por debajo del mínimo configurado.</p>
                      </div>
                      <button type="button" onClick={() => setAlertsOpen(false)} aria-label="Cerrar alertas" className="text-[11px] text-slate-400 hover:text-white">Cerrar</button>
                    </div>
                    {lowStockItems.length === 0 ? (
                      <p className="rounded-lg border border-emerald-400/30 bg-[#1a382d] px-3 py-2 text-[11px] text-emerald-300">
                        {dashboardDataLoaded ? "No hay productos bajo el mínimo." : "Cargando inventario..."}
                      </p>
                    ) : (
                      <ul className="max-h-52 space-y-1.5 overflow-y-auto">
                        {lowStockItems.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => { setAlertsOpen(false); setActiveTab("Inventario"); }}
                              className="w-full rounded-lg border border-red-400/30 bg-[#40272d] px-3 py-2 text-left transition hover:bg-[#503039]"
                            >
                              <span className="block truncate text-[11px] font-semibold text-white">{item.item}</span>
                              <span className="mt-0.5 block text-[11px] text-red-300">
                                Stock {item.stock} {item.unit} · mínimo {item.minimum} {item.unit}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-2">
                <div
                  className="
                    flex h-[27px] w-[27px]
                    items-center justify-center
                    rounded-full
                    border border-cyan-300/60
                    bg-gradient-to-br
                    from-cyan-400
                    via-blue-500
                    to-indigo-700
                    text-[11px]
                    font-bold
                    text-white
                  "
                >
                  MG
                </div>

                <div className="hidden leading-tight sm:block">
                  <p className="text-[11px] font-medium text-white">
                    Martín Gómez
                  </p>

                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                    Almacenista Turno A
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {activeTab !== "Inicio" && content[activeTab]}
            {activeTab === "Inicio" && <>

            {/* ================================================= */}
            {/* STATS */}
            {/* ================================================= */}

            <section
              className="
                grid grid-cols-1
                gap-3
                sm:grid-cols-2
                xl:grid-cols-4
              "
            >
              <StatCard
                title="PRODUCTOS EN INVENTARIO"
                value={dashboardDataLoaded ? inventoryItems.length.toLocaleString() : "—"}
                suffix="productos"
                badge="Actual"
                badgeColor="border border-emerald-400/30 bg-[#1a382d] text-emerald-300"
              />

              <StatCard
                title="ENTRADAS DE HOY"
                value={dashboardDataLoaded ? todaysEntries.toLocaleString() : "—"}
                suffix="movimientos"
                badge="Hoy"
                badgeColor="border border-cyan-400/30 bg-[#173d4f] text-cyan-300"
              />

              <StatCard
                title="SALIDAS DE HOY"
                value={dashboardDataLoaded ? todaysExits.toLocaleString() : "—"}
                suffix="movimientos"
                badge="Hoy"
                badgeColor="border border-cyan-400/30 bg-[#173d4f] text-cyan-300"
              />

              <StatCard
                title="ALERTAS STOCK BAJO"
                value={dashboardDataLoaded ? lowStockCount.toLocaleString() : "—"}
                suffix="productos"
                badge={dashboardDataLoaded ? (lowStockCount > 0 ? "Revisar" : "Todo bien") : "Cargando"}
                badgeColor="border border-amber-400/30 bg-[#3e3625] text-amber-300"
                onClick={() => setAlertsOpen(true)}
              />
            </section>
            </>}

            {/* ================================================= */}
            {/* BODY */}
            {/* ================================================= */}

            <section
              className="
                mt-4
                grid
                grid-cols-1
                gap-4
                lg:grid-cols-[1.75fr_.72fr]
              "
            >

              {/* ================================================= */}
              {/* MOVEMENTS */}
              {/* ================================================= */}

              <div
                className="
                  overflow-hidden
                  rounded-xl
                  border border-[#2d4055]
                  bg-[#13293a]
                "
              >
                {/* Title */}
                <div
                  className="
                    flex min-h-[60px]
                    items-center justify-between
                    border-b border-[#2d4055]
                    px-4
                  "
                >
                  <div>
                    <h2 className="text-[16px] font-semibold text-white">
                      Últimos Movimientos
                    </h2>

                    <p className="mt-1 text-[12px] text-slate-400">
                      Historial de recepciones y despachos recientes en planta
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMovementFilter((filter) => (
                      filter === "todos" ? "entrada" : filter === "entrada" ? "salida" : "todos"
                    ))}
                    aria-label={`Filtro actual: ${movementFilter}. Cambiar filtro`}
                    className="
                      flex items-center gap-1.5
                      rounded-md
                      border border-[#36556f]
                      bg-[#102a3d]
                      px-3 py-2
                      text-[12px]
                      font-medium
                      text-slate-300 transition hover:bg-[#1d3d52] hover:text-white
                    "
                  >
                    <SlidersHorizontal size={12} />
                    {movementFilter === "todos" ? "Todos" : movementFilter === "entrada" ? "Entradas" : "Salidas"}
                  </button>
                </div>

                {/* Table Header */}
                <div
                  className="
                    grid
                    grid-cols-[1.8fr_.65fr_.55fr_.65fr_.6fr]
                    border-b border-[#2d4055]
                    bg-[#102a3d]
                    px-3
                    py-2.5
                    text-[12px]
                    font-medium
                    uppercase
                    tracking-[0.08em]
                    text-slate-400
                  "
                >
                  <span>Producto</span>
                  <span>Tipo</span>
                  <span>Cantidad</span>
                  <span>Fecha / Hora</span>
                  <span>Estado</span>
                </div>

                {/* Rows */}
                <div>
                  {movementError && (
                    <p role="alert" className="px-3 py-4 text-center text-[12px] text-red-300">
                      {movementError}
                    </p>
                  )}
                  {!movementError && visibleMovements.map((movement) => (
                    <MovementRow
                      key={movement.id}
                      movement={movement}
                    />
                  ))}
                  {!movementError && visibleMovements.length === 0 && (
                    <p className="px-3 py-6 text-center text-[12px] text-slate-400">
                      No hay movimientos registrados.
                    </p>
                  )}
                </div>
              </div>

              {/* ================================================= */}
              {/* TASKS */}

              <InventoryTasks variant="dark" />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}