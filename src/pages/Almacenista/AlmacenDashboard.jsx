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
        rounded-md px-3 py-[8px]
        text-left text-[10px]
        transition-colors
        ${
          active
            ? "bg-[#1c283d] text-white"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
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
            bg-orange-500
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
        flex h-[74px]
        w-full
        flex-col justify-between
        rounded-lg
        border border-[#dfe6ed]
        bg-white
        px-3.5 py-3
        text-left
        shadow-[0_1px_3px_rgba(15,23,42,0.04)]
        ${onClick ? "cursor-pointer transition hover:border-orange-300 hover:shadow-md" : "cursor-default"}
      `}
    >
      <div className="flex items-center justify-between">
        <span
          className="
            text-[8px]
            font-medium
            uppercase
            tracking-wide
            text-[#52627a]
          "
        >
          {title}
        </span>

        <span
          className={`
            rounded px-1.5 py-[2px]
            text-[7px] font-semibold
            ${badgeColor}
          `}
        >
          {badge}
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-[23px] font-bold leading-none text-[#111827]">
          {value}
        </span>

        <span className="text-[8px] text-[#718096]">
          {suffix}
        </span>
      </div>
    </button>
  );
}

function StatusBadge({ status, type }) {
  const styles = {
    success: "bg-[#d7f7e4] text-[#159447]",
    progress: "bg-[#e4efff] text-[#2563eb]",
    danger: "bg-[#ffe0e0] text-[#e34b4b]",
  };

  return (
    <span
      className={`
        inline-flex rounded
        px-2 py-[3px]
        text-[7px] font-semibold
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
          className="text-green-500"
        />
      ) : (
        <ArrowUpRight
          size={11}
          strokeWidth={2.5}
          className="text-blue-500"
        />
      )}

      <span className="text-[8px] text-[#344054]">
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
        border-b border-[#e8edf2]
        px-2.5
        py-[6px]
        last:border-b-0
      "
    >
      {/* Producto */}
      <div className="min-w-0">
        <p className="truncate text-[9px] font-semibold text-[#182235]">
          {movement.itemName}
        </p>

        <p className="mt-[1px] text-[7px] text-[#8190a5]">
          ID: {movement.itemId}
        </p>
      </div>

      {/* Tipo */}
      <MovementType type={movement.tipo} />

      {/* Cantidad */}
      <div className="text-[8px] font-medium text-[#182235]">
        {Number(movement.cantidad).toLocaleString()}{" "}
        <span className="font-normal text-[#607086]">
          {movement.itemUnit || ""}
        </span>
      </div>

      {/* Fecha */}
      <div className="font-mono text-[7px] text-[#53657b]">
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
        text-[#182235]
      "
    >
      <div className="flex min-h-screen">

        {/* ================================================= */}
        {/* SIDEBAR */}
        {/* ================================================= */}

        <aside
          className="
            hidden w-[181px]
            shrink-0
            border-r border-[#1b2f3f]
            bg-[#0d1f2d]
            md:block
          "
        >
          {/* Logo */}
          <div
            className="
              flex h-[59px]
              items-center gap-2.5
              px-4
            "
          >
            <div
              className="
                flex h-[27px] w-[27px]
                items-center justify-center
                rounded-md
                bg-orange-500
              "
            >
              <Package
                size={15}
                strokeWidth={2}
                className="text-white"
              />
            </div>

            <div>
              <p className="text-[13px] font-bold leading-none text-white">
                SGA CONTROL
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-wide text-slate-400">
                ALMACÉN CENTRAL
              </p>
            </div>
          </div>

          {/* Menu */}
          <nav className="px-4 py-2">
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
          <div className="mx-4 mt-8 border-t border-white/10 pt-4">
            <div className="flex justify-between">
              <span className="text-[7px] uppercase text-slate-400">
                OCUPACIÓN TOTAL
              </span>

              <span className="text-[7px] font-semibold text-white">
                78%
              </span>
            </div>

            <div className="mt-2 h-[4px] overflow-hidden rounded-full bg-[#344158]">
              <div className="h-full w-[78%] bg-orange-500" />
            </div>

            <p className="mt-2 text-[7px] text-slate-400">
              Ubicaciones libres: 342
            </p>
          </div>
        </aside>

        {/* ================================================= */}
        {/* MAIN */}
        {/* ================================================= */}

        <main className="min-w-0 flex-1">

          {/* HEADER */}
          <header
            className="
              flex h-[59px]
              items-center justify-between
              border-b border-[#1f3446]
              bg-[#0d2437]
              px-5
            "
          >
            {/* Search */}
            <div
              className="
                flex h-[29px]
                w-[215px]
                items-center gap-2
                rounded-md
                bg-[#102a3d]
                px-2.5
              "
            >
              <Search
                size={13}
                className="text-[#64748b]"
              />

              <input
                type="text"
                placeholder="Buscar producto, SKU o lote..."
                className="
                  w-full
                  bg-transparent
                  text-[8px]
                  text-[#334155]
                  outline-none
                  placeholder:text-[#8190a5]
                "
              />
            </div>

            {/* Header right */}
            <div className="flex items-center gap-3">
              <LogoutButton className="text-[#52627a] hover:bg-[#f1f4f7] hover:text-[#182235]" />

              {/* Register */}
              <button
                type="button"
                onClick={() => setActiveTab("Entradas")}
                className="
                  flex h-[27px]
                  items-center gap-1.5
                  rounded-md
                  bg-[#0f9ec7]
                  px-3
                  text-[9px]
                  font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-orange-600
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
                  relative flex h-[28px] w-[28px]
                  items-center justify-center
                  rounded-full
                  border border-[#e3e8ee]
                  bg-white
                  "
                >
                  <Bell size={13} className="text-[#344054]" />
                  {lowStockCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[7px] font-bold text-white">
                      {lowStockCount}
                    </span>
                  )}
                </button>
                {alertsOpen && (
                  <div className="absolute right-0 top-9 z-50 w-72 rounded-lg border border-[#dfe6ed] bg-white p-3 shadow-xl">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[11px] font-semibold text-[#182235]">Alertas de inventario</h3>
                        <p className="mt-1 text-[8px] text-[#718096]">Se activa si el stock está por debajo del mínimo configurado.</p>
                      </div>
                      <button type="button" onClick={() => setAlertsOpen(false)} aria-label="Cerrar alertas" className="text-[9px] text-[#718096] hover:text-[#182235]">Cerrar</button>
                    </div>
                    {lowStockItems.length === 0 ? (
                      <p className="rounded bg-green-50 px-2.5 py-2 text-[9px] text-green-700">
                        {dashboardDataLoaded ? "No hay productos bajo el mínimo." : "Cargando inventario..."}
                      </p>
                    ) : (
                      <ul className="max-h-52 space-y-1.5 overflow-y-auto">
                        {lowStockItems.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => { setAlertsOpen(false); setActiveTab("Inventario"); }}
                              className="w-full rounded border border-red-100 bg-red-50 px-2.5 py-2 text-left hover:bg-red-100"
                            >
                              <span className="block truncate text-[9px] font-semibold text-[#182235]">{item.item}</span>
                              <span className="mt-0.5 block text-[8px] text-red-700">
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
                    bg-gradient-to-br
                    from-slate-400
                    to-slate-700
                    text-[8px]
                    font-bold
                    text-white
                  "
                >
                  MG
                </div>

                <div className="hidden leading-tight sm:block">
                  <p className="text-[8px] font-semibold text-[#182235]">
                    Martín Gómez
                  </p>

                  <p className="text-[7px] text-[#7b8798]">
                    Almacenista Turno A
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="mx-auto max-w-[1120px] px-5 py-5">
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
                badgeColor="bg-[#d9f7e5] text-[#18a957]"
              />

              <StatCard
                title="ENTRADAS DE HOY"
                value={dashboardDataLoaded ? todaysEntries.toLocaleString() : "—"}
                suffix="movimientos"
                badge="Hoy"
                badgeColor="bg-[#edf4ff] text-[#3677df]"
              />

              <StatCard
                title="SALIDAS DE HOY"
                value={dashboardDataLoaded ? todaysExits.toLocaleString() : "—"}
                suffix="movimientos"
                badge="Hoy"
                badgeColor="bg-[#eaf1ff] text-[#2563eb]"
              />

              <StatCard
                title="ALERTAS STOCK BAJO"
                value={dashboardDataLoaded ? lowStockCount.toLocaleString() : "—"}
                suffix="productos"
                badge={dashboardDataLoaded ? (lowStockCount > 0 ? "Revisar" : "Todo bien") : "Cargando"}
                badgeColor="bg-[#fff0dc] text-[#f07817]"
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
                  rounded-lg
                  border border-[#dfe6ed]
                  bg-white
                  shadow-[0_1px_3px_rgba(15,23,42,0.04)]
                "
              >
                {/* Title */}
                <div
                  className="
                    flex h-[55px]
                    items-center justify-between
                    border-b border-[#e5eaf0]
                    px-3
                  "
                >
                  <div>
                    <h2 className="text-[12px] font-bold text-[#182235]">
                      Últimos Movimientos
                    </h2>

                    <p className="mt-1 text-[7px] text-[#8190a5]">
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
                      border border-[#e0e6ec]
                      bg-white
                      px-2 py-1.5
                      text-[7px]
                      font-medium
                      text-[#44546a]
                    "
                  >
                    <SlidersHorizontal size={9} />
                    {movementFilter === "todos" ? "Todos" : movementFilter === "entrada" ? "Entradas" : "Salidas"}
                  </button>
                </div>

                {/* Table Header */}
                <div
                  className="
                    grid
                    grid-cols-[1.8fr_.65fr_.55fr_.65fr_.6fr]
                    bg-[#f8fafc]
                    px-2.5
                    py-[7px]
                    text-[7px]
                    font-medium
                    uppercase
                    text-[#607086]
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
                    <p role="alert" className="px-3 py-4 text-center text-[9px] text-red-600">
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
                    <p className="px-3 py-6 text-center text-[9px] text-[#8190a5]">
                      No hay movimientos registrados.
                    </p>
                  )}
                </div>
              </div>

              {/* ================================================= */}
              {/* TASKS */}

              <InventoryTasks variant="light" />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}