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
  ChevronDown,
  X,
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

const navigationItems = [
  { id: "Inicio", label: "Inicio", icon: LayoutGrid },
  { id: "Inventario", label: "Inventario", icon: Archive },
  { id: "Entradas", label: "Entradas", icon: ArrowDownLeft },
  { id: "Salidas", label: "Salidas", icon: ArrowUpRight },
  { id: "Reportes", label: "Reportes", icon: BarChart3 },
  { id: "Actividad del turno", label: "Actividad del turno", icon: ClipboardList },
];

function SidebarItem({ icon: Icon, children, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex w-full items-center gap-3
        rounded-lg px-3 py-2.5
        text-left text-xs font-medium
        transition-colors min-h-[44px]
        ${
          active
            ? "bg-[#143c50] text-cyan-200 shadow-[inset_0_1px_0_rgba(125,211,252,0.1)] border border-cyan-500/20"
            : "text-slate-300 hover:bg-[#143c50]/60 hover:text-white"
        }
      `}
    >
      <Icon size={18} strokeWidth={1.8} className="shrink-0" />
      <span className="truncate">{children}</span>
      {active && (
        <span
          className="
            absolute right-3
            h-3.5 w-[3px]
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
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Actividad del turno</h1>
        <p className="mt-0.5 text-xs text-slate-400">Consulta los movimientos y gestiona las tareas del almacén.</p>
      </div>
      <div className="grid grid-cols-2 items-start gap-2 sm:gap-4">
        <section className="min-w-0 overflow-hidden rounded-xl border border-[#2d4055] bg-[#13293a] shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2d4055] p-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white">Historial de movimientos</h2>
              <p className="mt-0.5 text-xs text-slate-400">{movements.length} movimientos en la bodega seleccionada</p>
            </div>
            <button
              type="button"
              onClick={onToggleFilter}
              aria-label={`Filtro actual: ${movementFilter}. Cambiar filtro`}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#36556f] bg-[#102a3d] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#1d3d52] hover:text-white min-h-[40px]"
            >
              <SlidersHorizontal size={14} />
              <span>{movementFilter === 'todos' ? 'Todos' : movementFilter === 'entrada' ? 'Entradas' : 'Salidas'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[1.6fr_.6fr_.6fr_.8fr_.6fr] border-b border-[#2d4055] bg-[#102a3d] px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Producto</span>
                <span>Tipo</span>
                <span>Cantidad</span>
                <span>Fecha / hora</span>
                <span>Estado</span>
              </div>
              {movementError && <p role="alert" className="p-4 text-center text-xs text-red-300">{movementError}</p>}
              {!movementError && visibleMovements.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
              {!movementError && visibleMovements.length === 0 && (
                <p className="p-8 text-center text-xs text-slate-400">No hay movimientos registrados para esta bodega.</p>
              )}
            </div>
          </div>

          {!movementError && movements.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#2d4055] p-4">
              <span className="text-xs text-slate-400">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex-1 sm:flex-none flex min-h-[40px] items-center justify-center rounded-lg border border-[#36556f] px-4 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#1d3d52] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex-1 sm:flex-none flex min-h-[40px] items-center justify-center rounded-lg border border-[#36556f] px-4 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#1d3d52] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
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
        flex min-h-[90px]
        w-full
        flex-col justify-between
        rounded-xl
        border border-[#2d4055]
        bg-[#13293a]
        p-4
        text-left shadow-md
        ${onClick ? "cursor-pointer transition-colors hover:border-cyan-400/60 hover:bg-[#173247] active:bg-[#102434]" : "cursor-default"}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="
            text-[10px] sm:text-xs
            font-semibold
            uppercase
            tracking-wider
            text-slate-400 truncate
          "
        >
          {title}
        </span>

        <span
          className={`
            shrink-0 rounded-md px-2 py-0.5
            text-[11px] font-semibold
            ${badgeColor}
          `}
        >
          {badge}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 mt-2">
        <span className="text-2xl sm:text-3xl font-bold leading-none text-white tracking-tight">
          {value}
        </span>

        <span className="text-xs text-slate-400">
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
        inline-flex rounded-full
        px-2.5 py-0.5
        text-[10px] font-semibold
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
          size={14}
          strokeWidth={2.5}
          className="text-emerald-400 shrink-0"
        />
      ) : (
        <ArrowUpRight
          size={14}
          strokeWidth={2.5}
          className="text-cyan-400 shrink-0"
        />
      )}

      <span className="text-xs font-medium capitalize text-slate-200">
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
        grid-cols-[1.6fr_.6fr_.6fr_.8fr_.6fr]
        items-center
        border-b border-[#2d4055]
        px-4
        py-3
        text-xs
        last:border-b-0
        hover:bg-white/[0.02]
        transition-colors
      "
    >
      {/* Producto */}
      <div className="min-w-0 pr-2">
        <p className="truncate font-semibold text-white">
          {movement.itemName}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          ID: {movement.itemId}
        </p>
      </div>

      {/* Tipo */}
      <MovementType type={movement.tipo} />

      {/* Cantidad */}
      <div className="font-semibold text-slate-200">
        {Number(movement.cantidad).toLocaleString()}{" "}
        <span className="font-normal text-slate-400">
          {movement.itemUnit || ""}
        </span>
      </div>

      {/* Fecha */}
      <div className="font-mono text-slate-400">
        {Number.isNaN(date.getTime()) ? "—" : date.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
              || "No se pudo cargar el historial."
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
    const category = item.category || 'Sin categoría';
    summary[category] = (summary[category] || 0) + 1;
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
    <div className="min-h-screen bg-[#020d16] font-sans text-white overflow-x-hidden">
      <div className="flex min-h-screen w-full overflow-hidden bg-[#020d16]">

        {/* SIDEBAR ESCRITORIO */}
        <aside className="hidden w-[220px] lg:w-[240px] shrink-0 border-r border-[#1b2f3f] bg-[#0d1f2d] md:block min-h-screen">
          <div className="flex h-[60px] items-center gap-2.5 border-b border-[#1b2f3f] px-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f9ec7] text-white shadow-md shadow-cyan-950/40">
              <Package size={16} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-cyan-300 tracking-wide">
                SGA CONTROL
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                ALMACÉN CENTRAL
              </p>
            </div>
          </div>

          <nav className="space-y-1 p-3 overflow-y-auto max-h-[calc(100vh-60px)]">
            {navigationItems.map(({ id, label, icon: Icon }) => (
              <SidebarItem
                key={id}
                icon={Icon}
                active={activeTab === id}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </SidebarItem>
            ))}
          </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex min-w-0 flex-1 flex-col bg-[#020d16]">

          {/* HEADER SUPERIOR */}
          <header className="sticky top-0 z-40 flex min-h-[60px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#1f3446] bg-[#0d2437]/95 px-3 sm:px-5 py-2.5 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-400/10 text-cyan-300">
                <MapPin size={18} />
              </span>
              <label className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Zona activa</span>
                <select
                  value={selectedGroupId ?? "central"}
                  onChange={(event) => {
                    setActivityPage(1);
                    setMovementError("");
                    setSelectedGroupId(event.target.value === "central" ? null : Number(event.target.value));
                  }}
                  aria-label="Seleccionar bodega o grupo"
                  className="max-w-[180px] sm:max-w-[260px] truncate rounded-lg border border-[#36556f] bg-[#102a3d] px-2.5 py-1.5 text-xs font-semibold text-white outline-none transition-colors hover:border-cyan-400 focus:border-cyan-400 min-h-[36px]"
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
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-cyan-600 px-3 sm:px-4 text-xs font-semibold text-white shadow-lg shadow-cyan-950/40 transition-colors hover:bg-cyan-500 active:bg-cyan-700"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">Registrar entrada</span>
                <span className="sm:hidden">Entrada</span>
              </button>

              {/* Alertas Notificaciones */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAlertsOpen((open) => !open)}
                  aria-label={`Alertas de stock bajo: ${lowStockCount}`}
                  aria-expanded={alertsOpen}
                  className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#36556f] bg-[#102a3d] text-slate-300 transition-colors hover:border-cyan-400/50 hover:bg-[#1d3d52] hover:text-white"
                >
                  <Bell size={18} />
                  {lowStockCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#0d2437]">
                      {lowStockCount}
                    </span>
                  )}
                </button>

                {alertsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 sm:hidden"
                      onClick={() => setAlertsOpen(false)}
                    />
                    <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-xs rounded-xl border border-[#36556f] bg-[#13293a] p-4 shadow-2xl transition-all">
                      <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Alertas de inventario
                        </h3>
                        <button
                          type="button"
                          onClick={() => setAlertsOpen(false)}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {lowStockItems.length === 0 ? (
                        <p className="rounded-lg border border-emerald-400/30 bg-[#1a382d] p-3 text-xs text-emerald-300">
                          {isSelectedScopeLoaded ? "No hay productos bajo el mínimo configurado." : "Cargando inventario de la zona..."}
                        </p>
                      ) : (
                        <ul className="max-h-56 space-y-1.5 overflow-y-auto scrollbar-none">
                          {lowStockItems.map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => { setAlertsOpen(false); setActiveTab("Inventario"); }}
                                className="w-full rounded-lg border border-red-400/30 bg-[#40272d] p-2.5 text-left transition-colors hover:bg-[#503039]"
                              >
                                <span className="block truncate text-xs font-semibold text-white">{item.item}</span>
                                <span className="mt-0.5 block text-xs text-red-300">
                                  Stock {item.stock} {item.unit} · Mínimo {item.minimum} {item.unit}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Perfil */}
              <div className="flex items-center gap-2 border-l border-[#36556f] pl-2.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 text-xs font-bold text-white shadow-md"
                >
                  {currentUserInitials || "A"}
                </div>

                <div className="hidden max-w-[140px] leading-tight sm:block">
                  <p className="truncate text-xs font-semibold text-white">{currentUserName}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">Almacenista</p>
                </div>
              </div>

              <LogoutButton className="bg-[#102536] border border-[#294255] text-slate-200 hover:bg-[#1d3d52] hover:text-white" />
            </div>
          </header>

          {/* NAVEGACIÓN MÓVIL SELECTOR */}
          <nav
            className="relative border-b border-[#1f3446] bg-[#0d1f2d] px-3 py-2.5 md:hidden z-30"
            aria-label="Navegación de almacén móvil"
          >
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-expanded={mobileNavOpen}
              className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-[#294255] bg-[#102536] px-3.5 text-left text-xs font-semibold text-cyan-100 active:bg-[#143c50] transition-colors"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {(() => {
                  const ActiveIcon = navigationItems.find(({ id }) => id === activeTab)?.icon || LayoutGrid;
                  return <ActiveIcon size={18} className="shrink-0 text-cyan-300" />;
                })()}
                <span className="truncate">{activeTab}</span>
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-cyan-300 transition-transform duration-200 ${
                  mobileNavOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Navegación Móvil */}
            {mobileNavOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
                  onClick={() => setMobileNavOpen(false)}
                />
                <div
                  className="absolute inset-x-3 top-full z-50 mt-2 grid grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-[#36556f] bg-[#102536] p-2.5 shadow-2xl max-h-[min(70vh,28rem)]"
                >
                  {navigationItems.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setActiveTab(id);
                        setMobileNavOpen(false);
                      }}
                      className={`flex min-h-[44px] min-w-0 items-center gap-3 rounded-lg px-3 text-left text-xs font-medium transition-colors ${
                        activeTab === id
                          ? 'bg-[#143c50] text-cyan-200 font-semibold border border-cyan-500/30'
                          : 'text-slate-300 hover:bg-[#143c50]/60 hover:text-white active:bg-[#143c50]'
                      }`}
                    >
                      <Icon size={18} className="shrink-0 text-cyan-300" />
                      <span className="min-w-0 truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* ÁREA DE CONTENIDO */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 min-w-0">
            {groupsError && (
              <p role="alert" className="mb-3 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">
                {groupsError} Puedes seguir usando la bodega central.
              </p>
            )}

            {activeTab !== "Inicio" && content[activeTab]}

            {activeTab === "Inicio" && (
              <div className="space-y-4 sm:space-y-6 min-w-0">
                {/* TARJETAS DE MÉTRICAS */}
                <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
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
                    badge={isSelectedScopeLoaded ? (lowStockCount > 0 ? "Revisar" : "Normal") : "Cargando"}
                    badgeColor={lowStockCount > 0 ? "border border-red-400/30 bg-[#40272d] text-red-300" : "border border-emerald-400/30 bg-[#1a382d] text-emerald-300"}
                    onClick={() => setAlertsOpen(true)}
                  />
                </section>

                {/* GRÁFICAS DE RESUMEN DE FLUJO Y CATEGORÍAS */}
                <section className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-lg">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-white">Flujo de almacén</h2>
                        <p className="mt-0.5 text-xs text-slate-400">Entradas y salidas · últimos 7 días</p>
                      </div>
                      <Activity size={18} className="text-cyan-300 shrink-0" />
                    </div>

                    {weeklyActivity.every((day) => day.entries === 0 && day.exits === 0) ? (
                      <p className="py-8 text-center text-xs text-slate-400">Aún no hay movimientos en este período.</p>
                    ) : (
                      <div className="flex h-32 items-end gap-2 pt-2">
                        {weeklyActivity.map((day, index) => {
                          const max = Math.max(1, ...weeklyActivity.map((v) => v.entries + v.exits));
                          const entryHeight = (day.entries / max) * 100;
                          const exitHeight = (day.exits / max) * 100;

                          return (
                            <div key={`${day.label}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                              <div className="flex h-[80%] w-full max-w-[32px] items-end gap-1">
                                <div
                                  title={`${day.entries} entradas`}
                                  className="w-1/2 rounded-t bg-emerald-400 transition-all duration-300"
                                  style={{ height: `${Math.max(day.entries ? 10 : 3, entryHeight)}%` }}
                                />
                                <div
                                  title={`${day.exits} salidas`}
                                  className="w-1/2 rounded-t bg-cyan-400 transition-all duration-300"
                                  style={{ height: `${Math.max(day.exits ? 10 : 3, exitHeight)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-slate-400 uppercase">{day.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-4 flex gap-4 border-t border-white/5 pt-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                        Entradas
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
                        Salidas
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-lg">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-white">Productos por categoría</h2>
                        <p className="mt-0.5 text-xs text-slate-400">Distribución del inventario seleccionado</p>
                      </div>
                      <Package size={18} className="text-cyan-300 shrink-0" />
                    </div>

                    {Object.keys(categorySummary).length === 0 ? (
                      <p className="py-8 text-center text-xs text-slate-400">No hay productos para mostrar.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {Object.entries(categorySummary).slice(0, 5).map(([category, count]) => {
                          const totalItems = scopedInventoryItems.length || 1;
                          const percentage = Math.round((count / totalItems) * 100);

                          return (
                            <div key={category} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="truncate text-slate-300 pr-2">{category}</span>
                                <span className="text-white font-semibold shrink-0">{count} item(s)</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[#102a3d]">
                                <div
                                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                {/* ACCESO RÁPIDO A ACTIVIDAD */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-lg">
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-white">Actividad y tareas del turno</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Consulta todos los movimientos y administra las tareas asignadas.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("Actividad del turno")}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/20 active:bg-cyan-400/30 w-full sm:w-auto shrink-0"
                  >
                    Abrir actividad
                  </button>
                </div>

                {/* TABLA DE ÚLTIMOS MOVIMIENTOS Y TAREAS */}
                <section className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="overflow-hidden rounded-xl border border-[#2d4055] bg-[#13293a] shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2d4055] p-4">
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-white">Últimos Movimientos</h2>
                        <p className="mt-0.5 text-xs text-slate-400">Historial de recepciones y despachos recientes en planta</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMovementFilter((filter) => (
                          filter === "todos" ? "entrada" : filter === "entrada" ? "salida" : "todos"
                        ))}
                        aria-label={`Filtro actual: ${movementFilter}. Cambiar filtro`}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#36556f] bg-[#102a3d] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#1d3d52] hover:text-white min-h-[40px]"
                      >
                        <SlidersHorizontal size={14} />
                        <span>{movementFilter === "todos" ? "Todos" : movementFilter === "entrada" ? "Entradas" : "Salidas"}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[600px]">
                        <div className="grid grid-cols-[1.6fr_.6fr_.6fr_.8fr_.6fr] border-b border-[#2d4055] bg-[#102a3d] px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          <span>Producto</span>
                          <span>Tipo</span>
                          <span>Cantidad</span>
                          <span>Fecha / Hora</span>
                          <span>Estado</span>
                        </div>

                        <div>
                          {movementError && (
                            <p role="alert" className="p-4 text-center text-xs text-red-300">
                              {movementError}
                            </p>
                          )}
                          {!movementError && visibleMovements.map((movement) => (
                            <MovementRow key={movement.id} movement={movement} />
                          ))}
                          {!movementError && visibleMovements.length === 0 && (
                            <p className="p-8 text-center text-xs text-slate-400">
                              No hay movimientos registrados.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN DE TAREAS */}
                  <InventoryTasks variant="dark" />
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}