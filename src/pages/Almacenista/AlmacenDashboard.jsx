import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Bell,
  LayoutGrid,
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  SlidersHorizontal,
  Package,
  ClipboardList,
  Activity,
  MapPin,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import Inventario from "../Compartido/Inventario";
import Reportes from "../Compartido/Reportes";
import Entradas from "../Compartido/Entradas";
import Salidas from "../Compartido/Salidas";
import InventoryTasks from "../../components/InventoryTasks";
import {
  getInventoryGroups,
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
        rounded-lg px-3 py-2.5
        text-left text-[12px]
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

function ActivityPanel({
  movements,
  movementError,
  movementFilter,
  visibleMovements,
  currentPage,
  totalPages,
  onToggleFilter,
  onPageChange,
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold text-white">Actividad del turno</h1>
        <p className="mt-1 text-[11px] text-slate-400">Consulta los movimientos y gestiona las tareas del almacén.</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-[#2d4055] bg-[#13293a]">
          <div className="flex min-h-[60px] items-center justify-between gap-3 border-b border-[#2d4055] px-4">
            <div>
              <h2 className="text-[14px] font-semibold text-white">Historial de movimientos</h2>
              <p className="mt-1 text-[10px] text-slate-400">{movements.length} movimientos en la bodega seleccionada</p>
            </div>
            <button type="button" onClick={onToggleFilter} aria-label={`Filtro actual: ${movementFilter}. Cambiar filtro`} className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#36556f] bg-[#102a3d] px-3 py-2 text-[10px] font-medium text-slate-300 transition hover:bg-[#1d3d52] hover:text-white">
              <SlidersHorizontal size={12} />{movementFilter === 'todos' ? 'Todos' : movementFilter === 'entrada' ? 'Entradas' : 'Salidas'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[1.6fr_.6fr_.6fr_.8fr_.6fr] border-b border-[#2d4055] bg-[#102a3d] px-3 py-2.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
                <span>Producto</span><span>Tipo</span><span>Cantidad</span><span>Fecha / hora</span><span>Estado</span>
              </div>
              {movementError && <p role="alert" className="px-3 py-4 text-center text-[11px] text-red-300">{movementError}</p>}
              {!movementError && visibleMovements.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
              {!movementError && visibleMovements.length === 0 && <p className="px-3 py-8 text-center text-[11px] text-slate-400">No hay movimientos registrados para esta bodega.</p>}
            </div>
          </div>
          {!movementError && movements.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-[#2d4055] px-4 py-3">
              <span className="text-[10px] text-slate-400">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="rounded-md border border-[#36556f] px-3 py-1.5 text-[10px] text-slate-200 transition hover:bg-[#1d3d52] disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
                <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="rounded-md border border-[#36556f] px-3 py-1.5 text-[10px] text-slate-200 transition hover:bg-[#1d3d52] disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </section>
        <InventoryTasks variant="dark" />
      </div>
    </div>
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
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupsError, setGroupsError] = useState("");
  const [movements, setMovements] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadedInventoryScope, setLoadedInventoryScope] = useState(null);
  const [movementFilter, setMovementFilter] = useState("todos");
  const [activityPage, setActivityPage] = useState(1);
  const [movementError, setMovementError] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const currentUserName = localStorage.getItem("nombre") || "Almacenista";
  const currentUserInitials = currentUserName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    let active = true;
    getInventoryGroups()
      .then((availableGroups) => {
        if (active) {
          setGroups(availableGroups.filter((group) => group.active));
          setGroupsError("");
        }
      })
      .catch((error) => {
        if (active) setGroupsError(error.response?.data?.detail || error.message || "No se pudieron cargar los grupos.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getInventoryMovements(selectedGroupId, true), getInventoryItems(selectedGroupId, true)])
      .then(([history, items]) => {
        if (active) {
          setMovements(history);
          setInventoryItems(items);
          setLoadedInventoryScope(selectedGroupId == null ? "central" : String(selectedGroupId));
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
  }, [activeTab, selectedGroupId]);

  const selectedScopeKey = selectedGroupId == null ? "central" : String(selectedGroupId);
  const isSelectedScopeLoaded = loadedInventoryScope === selectedScopeKey;
  const scopedMovements = useMemo(
    () => (isSelectedScopeLoaded ? movements : []),
    [isSelectedScopeLoaded, movements],
  );
  const scopedInventoryItems = useMemo(
    () => (isSelectedScopeLoaded ? inventoryItems : []),
    [isSelectedScopeLoaded, inventoryItems],
  );
  const today = new Date().toLocaleDateString();
  const todaysEntries = scopedMovements.filter((movement) => (
    movement.tipo === "entrada" && new Date(movement.fecha).toLocaleDateString() === today
  )).length;
  const todaysExits = scopedMovements.filter((movement) => (
    movement.tipo === "salida" && new Date(movement.fecha).toLocaleDateString() === today
  )).length;
  const lowStockCount = scopedInventoryItems.filter((item) => (
    Number(item.stock) < Number(item.minimum)
  )).length;
  const lowStockItems = scopedInventoryItems.filter((item) => (
    Number(item.stock) < Number(item.minimum)
  ));
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const key = day.toLocaleDateString();
    const dayMovements = scopedMovements.filter((movement) => new Date(movement.fecha).toLocaleDateString() === key);
    return {
      label: day.toLocaleDateString("es-CO", { weekday: "short" }),
      entries: dayMovements.filter((movement) => movement.tipo === "entrada").length,
      exits: dayMovements.filter((movement) => movement.tipo === "salida").length,
    };
  });
  const categorySummary = scopedInventoryItems.reduce((summary, item) => {
    summary[item.category] = (summary[item.category] || 0) + 1;
    return summary;
  }, {});
  const visibleMovements = useMemo(
    () => scopedMovements
      .filter((movement) => movementFilter === "todos" || movement.tipo === movementFilter)
      .slice(0, 6),
    [scopedMovements, movementFilter],
  );
  const filteredActivityMovements = useMemo(
    () => scopedMovements.filter((movement) => movementFilter === "todos" || movement.tipo === movementFilter),
    [scopedMovements, movementFilter],
  );
  const activityPageSize = 10;
  const activityPageCount = Math.max(1, Math.ceil(filteredActivityMovements.length / activityPageSize));
  const currentActivityPage = Math.min(activityPage, activityPageCount);
  const paginatedActivityMovements = filteredActivityMovements.slice(
    (currentActivityPage - 1) * activityPageSize,
    currentActivityPage * activityPageSize,
  );
  const toggleMovementFilter = () => {
    setActivityPage(1);
    setMovementFilter((filter) => filter === "todos" ? "entrada" : filter === "entrada" ? "salida" : "todos");
  };

  const selectedGroupName = groups.find((group) => group.id === selectedGroupId)?.name;
  const scopedProps = {
    groupId: selectedGroupId,
    groupName: selectedGroupName,
    groups,
    onScopeChange: setSelectedGroupId,
    scoped: true,
  };
  const selectedScopeComponentKey = selectedGroupId == null ? "central" : String(selectedGroupId);
  const content = {
    Inventario: <Inventario key={selectedScopeComponentKey} {...scopedProps} />,
    Entradas: <Entradas key={selectedScopeComponentKey} {...scopedProps} />,
    Salidas: <Salidas key={selectedScopeComponentKey} {...scopedProps} />,
    Reportes: <Reportes key={selectedScopeComponentKey} {...scopedProps} />,
    "Actividad del turno": <ActivityPanel
      movements={filteredActivityMovements}
      movementError={movementError}
      movementFilter={movementFilter}
      visibleMovements={paginatedActivityMovements}
      currentPage={currentActivityPage}
      totalPages={activityPageCount}
      onToggleFilter={toggleMovementFilter}
      onPageChange={setActivityPage}
    />,
  };
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
            hidden w-[220px]
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

            <SidebarItem icon={ClipboardList} active={activeTab === "Actividad del turno"} onClick={() => setActiveTab("Actividad del turno")}>
              Actividad del turno
            </SidebarItem>
          </nav>
        </aside>

        {/* ================================================= */}
        {/* MAIN */}
        {/* ================================================= */}

        <main className="flex min-w-0 flex-1 flex-col bg-[#020d16]">

          {/* HEADER */}
          <header className="sticky top-0 z-40 flex min-h-[68px] flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#1f3446] bg-[#0d2437]/95 px-4 py-3 backdrop-blur-md sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
                <MapPin size={17} />
              </span>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Zona activa</span>
                <select
                  value={selectedGroupId ?? "central"}
                  onChange={(event) => {
                    setActivityPage(1);
                    setMovementError("");
                    setSelectedGroupId(event.target.value === "central" ? null : Number(event.target.value));
                  }}
                  aria-label="Seleccionar bodega o grupo"
                  className="max-w-[min(52vw,280px)] rounded-md border border-[#36556f] bg-[#102a3d] px-3 py-2 text-[12px] font-medium text-white outline-none transition hover:border-cyan-400/60 focus:border-cyan-400"
                >
                  <option value="central">Bodega central</option>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("Entradas")}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-600 px-3 text-[11px] font-semibold text-white shadow-sm shadow-cyan-950/30 transition hover:bg-cyan-500 sm:px-4 sm:text-[12px]"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">Registrar entrada</span>
                <span className="sm:hidden">Entrada</span>
              </button>

              {/* Notification */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAlertsOpen((open) => !open)}
                  aria-label={`Alertas de stock bajo: ${lowStockCount}`}
                  aria-expanded={alertsOpen}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#36556f] bg-[#102a3d] text-slate-300 transition hover:border-cyan-400/40 hover:bg-[#1d3d52] hover:text-white"
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
                        {isSelectedScopeLoaded ? "No hay productos bajo el mínimo." : "Cargando inventario de la zona..."}
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

              <div className="flex items-center gap-2 border-l border-[#36556f] pl-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 text-[11px] font-bold text-white"
                >
                  {currentUserInitials || "A"}
                </div>

                <div className="hidden max-w-40 leading-tight sm:block">
                  <p className="truncate text-[11px] font-semibold text-white">{currentUserName}</p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300">Almacenista</p>
                </div>
              </div>
              <LogoutButton className="!rounded-lg !border !border-[#36556f] !px-3 !py-2 !text-[11px] !text-slate-300 hover:!bg-[#1d3d52] hover:!text-white" />
            </div>
          </header>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {groupsError && <p role="alert" className="mb-3 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-[10px] text-red-200">{groupsError} Puedes seguir usando la bodega central.</p>}
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
                value={isSelectedScopeLoaded ? scopedInventoryItems.length.toLocaleString() : "—"}
                suffix="productos"
                badge="Actual"
                badgeColor="border border-emerald-400/30 bg-[#1a382d] text-emerald-300"
              />

              <StatCard
                title="ENTRADAS DE HOY"
                value={isSelectedScopeLoaded ? todaysEntries.toLocaleString() : "—"}
                suffix="movimientos"
                badge="Hoy"
                badgeColor="border border-cyan-400/30 bg-[#173d4f] text-cyan-300"
              />

              <StatCard
                title="SALIDAS DE HOY"
                value={isSelectedScopeLoaded ? todaysExits.toLocaleString() : "—"}
                suffix="movimientos"
                badge="Hoy"
                badgeColor="border border-cyan-400/30 bg-[#173d4f] text-cyan-300"
              />

              <StatCard
                title="ALERTAS STOCK BAJO"
                value={isSelectedScopeLoaded ? lowStockCount.toLocaleString() : "—"}
                suffix="productos"
                badge={isSelectedScopeLoaded ? (lowStockCount > 0 ? "Revisar" : "Todo bien") : "Cargando"}
                badgeColor="border border-amber-400/30 bg-[#3e3625] text-amber-300"
                onClick={() => setAlertsOpen(true)}
              />
            </section>

            <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div><h2 className="text-[13px] font-semibold text-white">Flujo de almacén</h2><p className="mt-1 text-[10px] text-slate-400">Entradas y salidas · últimos 7 días</p></div>
                  <Activity size={15} className="text-cyan-300" />
                </div>
                {weeklyActivity.every((day) => day.entries === 0 && day.exits === 0) ? <p className="py-5 text-center text-[10px] text-slate-400">Aún no hay movimientos en este período.</p> : (
                  <div className="flex h-28 items-end gap-2">
                    {weeklyActivity.map((day, index) => {
                      const max = Math.max(1, ...weeklyActivity.map((value) => value.entries + value.exits));
                      return <div key={`${day.label}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                        <div className="flex h-[78%] w-full max-w-8 items-end gap-0.5">
                          <div title={`${day.entries} entradas`} className="w-1/2 rounded-t bg-emerald-400" style={{ height: `${Math.max(day.entries ? 8 : 2, day.entries / max * 100)}%` }} />
                          <div title={`${day.exits} salidas`} className="w-1/2 rounded-t bg-cyan-400" style={{ height: `${Math.max(day.exits ? 8 : 2, day.exits / max * 100)}%` }} />
                        </div>
                        <span className="text-[9px] text-slate-500">{day.label}</span>
                      </div>;
                    })}
                  </div>
                )}
                <div className="mt-3 flex gap-4 text-[9px] text-slate-400"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-emerald-400" />Entradas</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-cyan-400" />Salidas</span></div>
              </div>
              <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div><h2 className="text-[13px] font-semibold text-white">Productos por categoría</h2><p className="mt-1 text-[10px] text-slate-400">Distribución del inventario seleccionado</p></div>
                  <Package size={15} className="text-cyan-300" />
                </div>
                {Object.keys(categorySummary).length === 0 ? <p className="py-5 text-center text-[10px] text-slate-400">No hay productos para mostrar.</p> : (
                  <div className="space-y-2">
                    {Object.entries(categorySummary).slice(0, 5).map(([category, count]) => (
                      <div key={category} className="grid grid-cols-[1fr_auto] gap-2">
                        <div><div className="mb-1 flex justify-between text-[9px] text-slate-400"><span className="truncate">{category}</span><span>{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#344158]"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${count / scopedInventoryItems.length * 100}%` }} /></div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
              <div><h2 className="text-[13px] font-semibold text-white">Actividad y tareas del turno</h2><p className="mt-1 text-[10px] text-slate-400">Consulta todos los movimientos y administra las tareas en su apartado.</p></div>
              <button type="button" onClick={() => setActiveTab("Actividad del turno")} className="rounded-md border border-cyan-300/20 px-3 py-2 text-[10px] font-medium text-cyan-200 hover:bg-cyan-300/5">Abrir actividad</button>
            </div>
            </>}

            {/* ================================================= */}
            {/* BODY */}
            {/* ================================================= */}

            {activeTab === "Inicio" && <>
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
            </>}
          </div>
        </main>
      </div>
    </div>
  );
}