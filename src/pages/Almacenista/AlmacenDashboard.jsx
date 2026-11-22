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
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
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
        <h1 className="text-lg sm:text-xl font-bold text-ink-900 tracking-tight">Actividad del turno</h1>
        <p className="mt-0.5 text-xs text-ink-600">Consulta los movimientos y gestiona las tareas del almacén.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-2 sm:gap-4">
        <section className="min-w-0 overflow-hidden rounded-xl border border-sand-200 bg-sand-50 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand-200 p-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-ink-900">Historial de movimientos</h2>
              <p className="mt-0.5 text-xs text-ink-600">{movements.length} movimientos en la bodega seleccionada</p>
            </div>
            <button
              type="button"
              onClick={onToggleFilter}
              aria-label={`Filtro actual: ${movementFilter}. Cambiar filtro`}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2 text-xs font-semibold text-ink-900 transition-all duration-200 ease-out hover:bg-sand-50 hover:text-ink-900 min-h-[40px]"
            >
              <SlidersHorizontal size={14} />
              <span>{movementFilter === 'todos' ? 'Todos' : movementFilter === 'entrada' ? 'Entradas' : 'Salidas'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[1.6fr_.6fr_.6fr_.8fr_.6fr] border-b border-sand-200 bg-sand-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
                <span>Producto</span>
                <span>Tipo</span>
                <span>Cantidad</span>
                <span>Fecha / hora</span>
                <span>Estado</span>
              </div>
              {movementError && <p role="alert" className="p-4 text-center text-xs text-error-text">{movementError}</p>}
              {!movementError && visibleMovements.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
              {!movementError && visibleMovements.length === 0 && (
                <p className="p-8 text-center text-xs text-ink-600">No hay movimientos registrados para esta bodega.</p>
              )}
            </div>
          </div>

          {!movementError && movements.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-sand-200 p-4">
              <span className="text-xs text-ink-600">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex-1 sm:flex-none flex min-h-[40px] items-center justify-center rounded-lg border border-sand-200 px-4 py-1.5 text-xs font-semibold text-ink-900 transition-all duration-200 ease-out hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex-1 sm:flex-none flex min-h-[40px] items-center justify-center rounded-lg border border-sand-200 px-4 py-1.5 text-xs font-semibold text-ink-900 transition-all duration-200 ease-out hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-40"
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
        border border-sand-200
        bg-sand-50
        p-4
        text-left shadow-md
        ${onClick ? "cursor-pointer transition-all duration-200 ease-out hover:border-ocean-300/60 hover:bg-sand-50 active:bg-sand-50" : "cursor-default"}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="
            text-[10px] sm:text-xs
            font-semibold
            uppercase
            tracking-wider
            text-ink-600 truncate
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
        <span className="text-2xl sm:text-3xl font-bold leading-none text-ink-900 tracking-tight">
          {value}
        </span>

        <span className="text-xs text-ink-600">
          {suffix}
        </span>
      </div>
    </button>
  );
}

function StatusBadge({ status, type }) {
  const styles = {
    success: "border border-forest-300/30 bg-sand-50 text-forest-700",
    progress: "border border-ocean-300/30 bg-sand-50 text-ocean-700",
    danger: "border border-error/30 bg-sand-50 text-error-text",
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
          className="text-forest-700 shrink-0"
        />
      ) : (
        <ArrowUpRight
          size={14}
          strokeWidth={2.5}
          className="text-ocean-700 shrink-0"
        />
      )}

      <span className="text-xs font-medium capitalize text-ink-900">
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
        border-b border-sand-200
        px-4
        py-3
        text-xs
        last:border-b-0
        hover:bg-surface/[0.02]
        transition-all duration-200 ease-out
      "
    >
      {/* Producto */}
      <div className="min-w-0 pr-2">
        <p className="truncate font-semibold text-ink-900">
          {movement.itemName}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-600">
          ID: {movement.itemId}
        </p>
      </div>

      {/* Tipo */}
      <MovementType type={movement.tipo} />

      {/* Cantidad */}
      <div className="font-semibold text-ink-900">
        {Number(movement.cantidad).toLocaleString()}{" "}
        <span className="font-normal text-ink-600">
          {movement.itemUnit || ""}
        </span>
      </div>

      {/* Fecha */}
      <div className="font-mono text-ink-600">
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
    <AppShell
      navigation={navigationItems}
      activeTab={activeTab}
      onNavigate={setActiveTab}
      mobileOpen={mobileNavOpen}
      onMobileOpenChange={setMobileNavOpen}
      userName={currentUserName}
      userRole="Almacenista"
      userInitials={currentUserInitials || "A"}
      brandTitle="SGA CONTROL"
      brandSubtitle="Almacén central"
      contentClassName="px-3 pt-3 sm:px-4 md:px-6"
      headerActions={
        <>
          <label className="flex min-w-0 items-center gap-2">
            <MapPin size={18} aria-hidden="true" className="hidden shrink-0 text-forest-700 sm:block" />
            <span className="sr-only">Zona activa</span>
            <select
              value={selectedGroupId ?? "central"}
              onChange={(event) => {
                setActivityPage(1);
                setMovementError("");
                setSelectedGroupId(event.target.value === "central" ? null : Number(event.target.value));
              }}
              aria-label="Seleccionar bodega o grupo"
              className="min-h-11 max-w-[120px] truncate rounded-xl border border-sand-200 bg-surface px-2.5 text-xs font-semibold text-ink-900 outline-none focus-visible:border-gold-600 focus-visible:ring-2 focus-visible:ring-gold-500/25 sm:max-w-[200px]"
            >
              <option value="central">Bodega central</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setActiveTab("Entradas")}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-3 text-xs font-semibold text-pine-900 shadow-sm shadow-gold-600/20 transition-all duration-200 hover:brightness-105 sm:px-4"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Registrar entrada</span>
            <span className="sm:hidden">Entrada</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAlertsOpen((open) => !open)}
              aria-label={`Alertas de stock bajo: ${lowStockCount}`}
              aria-expanded={alertsOpen}
              className="relative inline-flex size-11 items-center justify-center rounded-xl border border-sand-200 bg-surface text-forest-700 transition-all duration-200 hover:bg-sand-100"
            >
              <Bell size={18} />
              {lowStockCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-ink-900 ring-2 ring-surface">
                  {lowStockCount}
                </span>
              )}
            </button>
            {alertsOpen && (
              <>
                <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setAlertsOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-sand-200 bg-sand-100 p-4 text-ink-900 shadow-[var(--agro-shadow-card)] backdrop-blur-xl max-sm:fixed max-sm:bottom-auto max-sm:right-[calc(0.75rem+var(--agro-safe-right))] max-sm:top-[calc(6rem+var(--agro-safe-top))]">
                  <div className="mb-2.5 flex items-center justify-between border-b border-sand-200 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900">
                      Alertas de inventario
                    </h3>
                    <button
                      type="button"
                      onClick={() => setAlertsOpen(false)}
                      aria-label="Cerrar alertas de inventario"
                      className="inline-flex size-10 items-center justify-center rounded-xl text-ink-600 hover:bg-sand-100 hover:text-ink-900"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {lowStockItems.length === 0 ? (
                    <p className="rounded-xl border border-success/20 bg-success-soft p-3 text-xs text-forest-700">
                      {isSelectedScopeLoaded ? "No hay productos bajo el mínimo configurado." : "Cargando inventario de la zona..."}
                    </p>
                  ) : (
                    <ul className="max-h-56 space-y-1.5 overflow-y-auto scrollbar-none">
                      {lowStockItems.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => { setAlertsOpen(false); setActiveTab("Inventario"); }}
                            className="w-full rounded-xl border border-error/20 bg-error-soft p-2.5 text-left transition-all duration-200 hover:brightness-95"
                          >
                            <span className="block truncate text-xs font-semibold text-ink-900">{item.item}</span>
                            <span className="mt-0.5 block text-xs text-error-text">
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
        </>
      }
    >
      <div className="min-w-0">
            {groupsError && (
              <p role="alert" className="mb-3 rounded-lg border border-error/20 bg-error-soft p-3 text-xs text-error-text">
                {groupsError} Puedes seguir usando la bodega central.
              </p>
            )}

            {activeTab !== "Inicio" && content[activeTab]}

            {activeTab === "Inicio" && (
              <div className="space-y-4 sm:space-y-6 min-w-0">
                {/* TARJETAS DE MÉTRICAS */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                  <StatCard
                    title="PRODUCTOS EN INVENTARIO"
                    value={isSelectedScopeLoaded ? scopedInventoryItems.length.toLocaleString() : "—"}
                    suffix="productos"
                    badge="Actual"
                    badgeColor="border border-forest-300/30 bg-sand-50 text-forest-700"
                  />

                  <StatCard
                    title="ENTRADAS DE HOY"
                    value={isSelectedScopeLoaded ? todaysEntries.toLocaleString() : "—"}
                    suffix="movimientos"
                    badge="Hoy"
                    badgeColor="border border-ocean-300/30 bg-sand-50 text-ocean-700"
                  />

                  <StatCard
                    title="SALIDAS DE HOY"
                    value={isSelectedScopeLoaded ? todaysExits.toLocaleString() : "—"}
                    suffix="movimientos"
                    badge="Hoy"
                    badgeColor="border border-ocean-300/30 bg-sand-50 text-ocean-700"
                  />

                  <StatCard
                    title="ALERTAS STOCK BAJO"
                    value={isSelectedScopeLoaded ? lowStockCount.toLocaleString() : "—"}
                    suffix="productos"
                    badge={isSelectedScopeLoaded ? (lowStockCount > 0 ? "Revisar" : "Normal") : "Cargando"}
                    badgeColor={lowStockCount > 0 ? "border border-error/30 bg-sand-50 text-error-text" : "border border-forest-300/30 bg-sand-50 text-forest-700"}
                    onClick={() => setAlertsOpen(true)}
                  />
                </section>

                {/* GRÁFICAS DE RESUMEN DE FLUJO Y CATEGORÍAS */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-lg">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-ink-900">Flujo de almacén</h2>
                        <p className="mt-0.5 text-xs text-ink-600">Entradas y salidas · últimos 7 días</p>
                      </div>
                      <Activity size={18} className="text-ocean-700 shrink-0" />
                    </div>

                    {weeklyActivity.every((day) => day.entries === 0 && day.exits === 0) ? (
                      <p className="py-8 text-center text-xs text-ink-600">Aún no hay movimientos en este período.</p>
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
                                  className="w-1/2 rounded-t bg-forest-500 transition-all duration-300"
                                  style={{ height: `${Math.max(day.entries ? 10 : 3, entryHeight)}%` }}
                                />
                                <div
                                  title={`${day.exits} salidas`}
                                  className="w-1/2 rounded-t bg-ocean-500 transition-all duration-300"
                                  style={{ height: `${Math.max(day.exits ? 10 : 3, exitHeight)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-ink-600 uppercase">{day.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-4 flex gap-4 border-t border-sand-200 pt-3 text-xs text-ink-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="h-2.5 w-2.5 rounded-sm bg-forest-500" />
                        Entradas
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="h-2.5 w-2.5 rounded-sm bg-ocean-500" />
                        Salidas
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-lg">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-ink-900">Productos por categoría</h2>
                        <p className="mt-0.5 text-xs text-ink-600">Distribución del inventario seleccionado</p>
                      </div>
                      <Package size={18} className="text-ocean-700 shrink-0" />
                    </div>

                    {Object.keys(categorySummary).length === 0 ? (
                      <p className="py-8 text-center text-xs text-ink-600">No hay productos para mostrar.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {Object.entries(categorySummary).slice(0, 5).map(([category, count]) => {
                          const totalItems = scopedInventoryItems.length || 1;
                          const percentage = Math.round((count / totalItems) * 100);

                          return (
                            <div key={category} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="truncate text-ink-600 pr-2">{category}</span>
                                <span className="text-ink-900 font-semibold shrink-0">{count} item(s)</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-sand-50">
                                <div
                                  className="h-full rounded-full bg-ocean-500 transition-all duration-500"
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-lg">
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-ink-900">Actividad y tareas del turno</h2>
                    <p className="mt-0.5 text-xs text-ink-600">Consulta todos los movimientos y administra las tareas asignadas.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("Actividad del turno")}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-ocean-300/30 bg-info-soft px-4 py-2 text-xs font-semibold text-ocean-700 transition-all duration-200 ease-out hover:bg-info-soft active:bg-info-soft w-full sm:w-auto shrink-0"
                  >
                    Abrir actividad
                  </button>
                </div>

                {/* TABLA DE ÚLTIMOS MOVIMIENTOS Y TAREAS */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div className="overflow-hidden rounded-xl border border-sand-200 bg-sand-50 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand-200 p-4">
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-ink-900">Últimos Movimientos</h2>
                        <p className="mt-0.5 text-xs text-ink-600">Historial de recepciones y despachos recientes en planta</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMovementFilter((filter) => (
                          filter === "todos" ? "entrada" : filter === "entrada" ? "salida" : "todos"
                        ))}
                        aria-label={`Filtro actual: ${movementFilter}. Cambiar filtro`}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2 text-xs font-semibold text-ink-900 transition-all duration-200 ease-out hover:bg-sand-50 hover:text-ink-900 min-h-[40px]"
                      >
                        <SlidersHorizontal size={14} />
                        <span>{movementFilter === "todos" ? "Todos" : movementFilter === "entrada" ? "Entradas" : "Salidas"}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[600px]">
                        <div className="grid grid-cols-[1.6fr_.6fr_.6fr_.8fr_.6fr] border-b border-sand-200 bg-sand-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
                          <span>Producto</span>
                          <span>Tipo</span>
                          <span>Cantidad</span>
                          <span>Fecha / Hora</span>
                          <span>Estado</span>
                        </div>

                        <div>
                          {movementError && (
                            <p role="alert" className="p-4 text-center text-xs text-error-text">
                              {movementError}
                            </p>
                          )}
                          {!movementError && visibleMovements.map((movement) => (
                            <MovementRow key={movement.id} movement={movement} />
                          ))}
                          {!movementError && visibleMovements.length === 0 && (
                            <p className="p-8 text-center text-xs text-ink-600">
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
    </AppShell>
  );
}