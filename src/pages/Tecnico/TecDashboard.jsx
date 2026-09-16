import React from "react";
import {
  ShieldCheck,
  Home,
  ClipboardList,
  History,
  SlidersHorizontal,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";

const orders = [
  {
    id: "OT-442",
    machine: "Tractor John Deere 6125 J",
    description: "Mantenimiento de 250 horas (Cambio de aceites y filtros)",
    priority: "Alta",
    status: "Pendiente",
    priorityClass: "bg-[#3b3b3b] text-gray-300",
    statusClass: "bg-blue-700 text-white",
  },
  {
    id: "OT-445",
    machine: "Cosechadora New Holland CR 6.80",
    description: "Reajuste de correas de transmisión y cuchillas de corte",
    priority: "Media",
    status: "En Progreso",
    priorityClass: "bg-blue-700 text-white",
    statusClass: "bg-blue-500 text-[#07101f]",
  },
  {
    id: "OT-448",
    machine: "Fumigadora Jacto Advance",
    description: "Calibración de boquillas de aspersión",
    priority: "Baja",
    status: "Completada",
    priorityClass: "bg-[#3b3b3b] text-gray-300",
    statusClass: "bg-blue-400 text-[#07101f]",
  },
];

function SidebarItem({ icon: Icon, children, active = false }) {
  return (
    <button
      type="button"
      className={`
        flex w-full items-center gap-3
        rounded-md px-3 py-2
        text-left text-[10px]
        transition-all duration-200
        ${
          active
            ? "bg-blue-600 text-white"
            : "text-gray-300 hover:bg-white/5 hover:text-white"
        }
      `}
    >
      <Icon size={14} strokeWidth={1.8} />
      <span>{children}</span>
    </button>
  );
}

function StatCard({ title, value, label, labelColor }) {
  return (
    <div
      className="
        h-[76px]
        rounded-xl
        border border-white/10
        bg-[#292929]
        px-4 py-3
      "
    >
      <div className="flex h-full items-end justify-between">
        <div>
          <p className="text-[8px] uppercase text-gray-400">
            {title}
          </p>

          <p className="mt-1 text-[22px] font-bold leading-none text-white">
            {value}
          </p>
        </div>

        <span
          className={`mb-[2px] text-[8px] font-medium ${labelColor}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function OrderRow({ order }) {
  return (
    <div
      className="
        flex min-h-[47px]
        items-center
        rounded-md
        border border-white/[0.07]
        bg-[#2c2c2c]
        px-2.5
        py-1.5
      "
    >
      {/* Información */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-blue-400">
            {order.id}
          </span>

          <span className="text-[10px] font-medium text-gray-200">
            - {order.machine}
          </span>
        </div>

        <p className="mt-[2px] truncate text-[8px] text-gray-500">
          {order.description}
        </p>
      </div>

      {/* Acciones */}
      <div className="ml-3 flex shrink-0 items-center gap-2">
        <span
          className={`
            rounded px-2 py-1
            text-[7px] font-medium
            ${order.priorityClass}
          `}
        >
          Prioridad: {order.priority}
        </span>

        <span
          className={`
            rounded px-2 py-1
            text-[7px] font-medium
            ${order.statusClass}
          `}
        >
          {order.status}
        </span>

        <button
          type="button"
          className="
            rounded
            bg-blue-600
            px-3 py-[5px]
            text-[8px]
            font-medium
            text-white
            transition
            hover:bg-blue-500
          "
        >
          Iniciar
        </button>
      </div>
    </div>
  );
}

export default function TechnicianPanel() {
  return (
    <div className="min-h-screen bg-[#181818] font-sans text-white antialiased">
      <div className="flex min-h-screen">

        {/* ================================================= */}
        {/* SIDEBAR */}
        {/* ================================================= */}

        <aside
          className="
            hidden
            w-[177px]
            shrink-0
            border-r
            border-white/10
            bg-[#292929]
            md:block
          "
        >
          {/* Logo */}
          <div
            className="
              flex h-[45px]
              items-center gap-2
              border-b border-white/10
              px-4
            "
          >
            <div
              className="
                flex h-[21px] w-[21px]
                items-center justify-center
                rounded-md
                bg-blue-600
              "
            >
              <ShieldCheck
                size={13}
                strokeWidth={2}
                className="text-white"
              />
            </div>

            <span className="text-[13px] font-semibold text-blue-400">
              AgroSentinel
            </span>
          </div>

          {/* Menu */}
          <nav className="space-y-1 px-3 py-3">
            <SidebarItem
              icon={Home}
              active
            >
              Mi Panel
            </SidebarItem>

            <SidebarItem icon={ClipboardList}>
              Órdenes Asignadas
            </SidebarItem>

            <SidebarItem icon={History}>
              Historial
            </SidebarItem>

            <SidebarItem icon={SlidersHorizontal}>
              Inventario Repuestos
            </SidebarItem>
          </nav>
        </aside>

        {/* ================================================= */}
        {/* MAIN */}
        {/* ================================================= */}

        <main className="min-w-0 flex-1">

          {/* HEADER */}
          <header
            className="
              flex h-[45px]
              items-center justify-between
              border-b border-white/10
              bg-[#242424]
              px-5
            "
          >
            {/* Left */}
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-blue-400">
                AgroSentinel
              </span>

              <span className="text-[10px] text-gray-500">
                |
              </span>

              <span className="text-[10px] text-gray-300">
                Mi Panel de Trabajo
              </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <LogoutButton className="text-gray-300 hover:bg-white/10 hover:text-white" />

              <div className="text-right leading-tight">
                <p className="text-[9px] font-medium text-white">
                  Ing. Marlon
                </p>

                <p className="text-[7px] font-bold text-blue-400">
                  TÉCNICO SENIOR
                </p>
              </div>

              {/* Avatar */}
              <div
                className="
                  flex h-7 w-7
                  items-center justify-center
                  rounded-full
                  border border-white/20
                  bg-gradient-to-br
                  from-gray-200
                  via-gray-400
                  to-gray-700
                  text-[8px]
                  font-bold
                  text-gray-800
                "
              >
                HO
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="mx-auto max-w-[1120px] px-5 py-5">

            {/* ================================================= */}
            {/* WELCOME */}
            {/* ================================================= */}

            <section
              className="
                rounded-xl
                border border-white/[0.06]
                bg-[#292929]
                px-4 py-4
              "
            >
              <h1 className="text-[16px] font-semibold text-white">
                Bienvenido de nuevo, Héctor Fabio
              </h1>

              <p className="mt-1 text-[9px] text-gray-400">
                Usted tiene 4 órdenes de trabajo pendientes para hoy.
                El estado del clima en Cali Valle es propicio para
                labores mecánicas de campo.
              </p>
            </section>

            {/* ================================================= */}
            {/* STATS */}
            {/* ================================================= */}

            <section
              className="
                mt-4
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-3
              "
            >
              <StatCard
                title="ÓRDENES PENDIENTES"
                value="4"
                label="Requiere atención"
                labelColor="text-orange-400"
              />

              <StatCard
                title="EN PROGRESO"
                value="2"
                label="En ejecución"
                labelColor="text-cyan-400"
              />

              <StatCard
                title="COMPLETADAS HOY"
                value="3"
                label="Buen ritmo"
                labelColor="text-cyan-400"
              />
            </section>

            {/* ================================================= */}
            {/* ORDERS */}
            {/* ================================================= */}

            <section
              className="
                mt-4
                rounded-xl
                border border-white/[0.06]
                bg-[#292929]
                p-4
              "
            >
              <h2 className="text-[13px] font-semibold text-white">
                Órdenes de Trabajo Asignadas
              </h2>

              <div className="mt-2 space-y-2">
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                  />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
