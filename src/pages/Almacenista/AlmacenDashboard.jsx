import { useState } from "react";
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
  Check,
  Package,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import Inventario from "../Compartido/Inventario";
import Reportes from "../Compartido/Reportes";
import Entradas from "../Compartido/Entradas";
import Salidas from "../Compartido/Salidas";

const movements = [
  {
    product: "Pintura Acrílica Mate Azul",
    sku: "SKU-3829-IA",
    type: "Entrada",
    quantity: "450",
    unit: "uds",
    date: "24/10 09:30",
    status: "Completado",
    statusType: "success",
  },
  {
    product: 'Rodillo Profesional Fibra 9"',
    sku: "SKU-9182-RD",
    type: "Salida",
    quantity: "120",
    unit: "uds",
    date: "24/10 09:12",
    status: "En Proceso",
    statusType: "progress",
  },
  {
    product: "Cinta Adhesiva Alta Tracción",
    sku: "SKU-4412-CA",
    type: "Entrada",
    quantity: "1,200",
    unit: "uds",
    date: "24/10 08:45",
    status: "Completado",
    statusType: "success",
  },
  {
    product: "Disolvente Industrial Standard",
    sku: "SKU-0922-DI",
    type: "Salida",
    quantity: "30",
    unit: "uds",
    date: "23/10 17:10",
    status: "Demorado",
    statusType: "danger",
  },
  {
    product: 'Brocha Cerdas Naturales 3"',
    sku: "SKU-8841-BR",
    type: "Entrada",
    quantity: "500",
    unit: "uds",
    date: "23/10 15:30",
    status: "Completado",
    statusType: "success",
  },
  {
    product: "Plástico de Burbujas Embalaje",
    sku: "SKU-2091-PL",
    type: "Salida",
    quantity: "15",
    unit: "rollos",
    date: "23/10 14:15",
    status: "Completado",
    statusType: "success",
  },
];

const tasks = [
  {
    text: "Verificar palet de entrada #ENT-841",
    checked: false,
  },
  {
    text: "Auditar estantería B-14 (Químicos)",
    checked: false,
  },
  {
    text: "Preparar lote de despacho #SAL-339",
    checked: true,
  },
  {
    text: "Reponer stock crítico de brochas",
    checked: false,
  },
  {
    text: "Revisar precintos de seguridad sector C",
    checked: true,
  },
];

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
}) {
  return (
    <div
      className="
        flex h-[74px]
        flex-col justify-between
        rounded-lg
        border border-[#dfe6ed]
        bg-white
        px-3.5 py-3
        shadow-[0_1px_3px_rgba(15,23,42,0.04)]
      "
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
    </div>
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
  const isEntry = type === "Entrada";

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
          {movement.product}
        </p>

        <p className="mt-[1px] text-[7px] text-[#8190a5]">
          {movement.sku}
        </p>
      </div>

      {/* Tipo */}
      <MovementType type={movement.type} />

      {/* Cantidad */}
      <div className="text-[8px] font-medium text-[#182235]">
        {movement.quantity}{" "}
        <span className="font-normal text-[#607086]">
          {movement.unit}
        </span>
      </div>

      {/* Fecha */}
      <div className="font-mono text-[7px] text-[#53657b]">
        {movement.date}
      </div>

      {/* Estado */}
      <div>
        <StatusBadge
          status={movement.status}
          type={movement.statusType}
        />
      </div>
    </div>
  );
}

function TaskItem({ task }) {
  return (
    <div
      className="
        flex min-h-[30px]
        items-center gap-2
        rounded-md
        border border-[#e1e7ed]
        bg-white
        px-2
      "
    >
      <div
        className={`
          flex h-[13px] w-[13px]
          shrink-0 items-center justify-center
          rounded-[2px]
          border
          ${
            task.checked
              ? "border-green-500 bg-green-50"
              : "border-[#91a0b2] bg-white"
          }
        `}
      >
        {task.checked && (
          <Check
            size={9}
            strokeWidth={3}
            className="text-green-600"
          />
        )}
      </div>

      <span
        className={`
          truncate text-[8px]
          ${
            task.checked
              ? "text-[#8190a5] line-through"
              : "text-[#293548]"
          }
        `}
      >
        {task.text}
      </span>
    </div>
  );
}

export default function SgaControlDashboard() {
  const [activeTab, setActiveTab] = useState("Inicio");
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
                {activeTab === "Inicio" ? "Registrar Entrada" : activeTab}
              </button>

              {/* Notification */}
              <button
                type="button"
                className="
                  relative flex h-[28px] w-[28px]
                  items-center justify-center
                  rounded-full
                  border border-[#e3e8ee]
                  bg-white
                "
              >
                <Bell
                  size={13}
                  className="text-[#344054]"
                />

                <span
                  className="
                    absolute right-[6px] top-[5px]
                    h-[4px] w-[4px]
                    rounded-full
                    bg-orange-500
                  "
                />
              </button>

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
                title="PRODUCTOS EN STOCK"
                value="2,847"
                suffix="unidades"
                badge="Estable"
                badgeColor="bg-[#d9f7e5] text-[#18a957]"
              />

              <StatCard
                title="ENTRADAS PENDIENTES"
                value="12"
                suffix="recepciones"
                badge="Hoy"
                badgeColor="bg-[#edf4ff] text-[#3677df]"
              />

              <StatCard
                title="SALIDAS DEL DÍA"
                value="34"
                suffix="lotes"
                badge="92% Listo"
                badgeColor="bg-[#eaf1ff] text-[#2563eb]"
              />

              <StatCard
                title="ALERTAS STOCK BAJO"
                value="5"
                suffix="productos"
                badge="Revisar"
                badgeColor="bg-[#fff0dc] text-[#f07817]"
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
                    Filtros
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
                  {movements.map((movement) => (
                    <MovementRow
                      key={movement.sku}
                      movement={movement}
                    />
                  ))}
                </div>
              </div>

              {/* ================================================= */}
              {/* TASKS */}

              <div
                className="
                  overflow-hidden
                  rounded-lg
                  border border-[#dfe6ed]
                  bg-white
                  shadow-[0_1px_3px_rgba(15,23,42,0.04)]
                "
              >
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
                      Tareas del turno
                    </h2>
                    <p className="mt-1 text-[7px] text-[#8190a5]">
                      Actividades pendientes del almacén
                    </p>
                  </div>

                  <span className="rounded bg-[#fff0dc] px-1.5 py-1 text-[7px] font-semibold text-[#f07817]">
                    {tasks.filter((task) => !task.checked).length} pendientes
                  </span>
                </div>

                <div className="space-y-2 p-3">
                  {tasks.map((task) => (
                    <TaskItem key={task.text} task={task} />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}