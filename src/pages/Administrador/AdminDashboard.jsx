import React from "react";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Tractor,
  Package,
  BarChart3,
  Bell,
  AlertTriangle,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";

const stats = [
  {
    title: "TOTAL USUARIOS",
    value: "28",
    info: "+4 este mes",
    color: "text-cyan-400",
  },
  {
    title: "USUARIOS ACTIVOS",
    value: "24",
    info: "92% actividad",
    color: "text-cyan-400",
  },
  {
    title: "GRUPOS DE TRABAJO",
    value: "6",
    info: "2 nuevos",
    color: "text-orange-400",
  },
  {
    title: "ROLES ASIGNADOS",
    value: "4",
    info: "Balanceado",
    color: "text-cyan-400",
  },
];

const activities = [
  {
    type: "success",
    title: "Inicio de sesión exitoso",
    description: "Carlos Restrepo desde Oficina Principal",
    time: "Hace 5 minutos",
  },
  {
    type: "success",
    title: "Nuevo usuario registrado",
    description: "Juan Pérez fue creado como Técnico",
    time: "Hace 1 hora",
  },
  {
    type: "danger",
    title: "Falla Crítica Reportada",
    description:
      "Tractor John Deere 6J - Fallas en el motor de arranque",
    time: "Hace 2 horas",
  },
  {
    type: "success",
    title: "Grupo de trabajo modificado",
    description: "Héctor Ortiz asignado a Fumigación",
    time: "Hace 4 horas",
  },
];

const roles = [
  {
    name: "Administradores",
    percentage: 15,
    color: "#2563eb",
  },
  {
    name: "Técnicos",
    percentage: 45,
    color: "#60a5fa",
  },
  {
    name: "Operarios de Máquina",
    percentage: 30,
    color: "#1d4ed8",
  },
  {
    name: "Operarios de Inventario",
    percentage: 10,
    color: "#4b5563",
  },
];

function SidebarItem({ icon: Icon, children, active = false }) {
  return (
    <button
      className={`
        flex w-full items-center gap-3 rounded-md px-3 py-2
        text-left text-[11px] transition-all duration-200
        ${
          active
            ? "bg-blue-600 text-white"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }
      `}
    >
      <Icon size={15} strokeWidth={1.8} />
      <span>{children}</span>
    </button>
  );
}

function StatCard({ title, value, info, color }) {
  return (
    <div
      className="
        rounded-xl border border-white/10
        bg-[#292929] px-4 py-4
        shadow-sm
      "
    >
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-wide text-gray-400">
            {title}
          </p>

          <p className="mt-1 text-[23px] font-bold leading-none text-white">
            {value}
          </p>
        </div>

        <span className={`text-[9px] font-medium ${color}`}>
          {info}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ activity }) {
  const danger = activity.type === "danger";

  return (
    <div className="flex gap-3">
      <div
        className={`
          flex h-[23px] w-[23px] shrink-0
          items-center justify-center rounded-full
          ${danger ? "bg-red-600/80" : "bg-blue-600"}
        `}
      >
        {danger ? (
          <AlertTriangle
            size={12}
            className="text-white"
            strokeWidth={2.5}
          />
        ) : (
          <Bell
            size={11}
            className="text-white"
            strokeWidth={2.5}
          />
        )}
      </div>

      <div className="min-w-0">
        <p
          className={`text-[11px] font-medium ${
            danger ? "text-red-400" : "text-white"
          }`}
        >
          {activity.title}
        </p>

        <p className="mt-[2px] text-[9px] text-gray-400">
          {activity.description}
        </p>

        <p className="mt-[2px] text-[8px] text-gray-500">
          {activity.time}
        </p>
      </div>
    </div>
  );
}

function RoleChart() {
  let current = 0;

  const gradientParts = roles.map((role) => {
    const start = current;
    current += role.percentage;

    return `${role.color} ${start}% ${current}%`;
  });

  return (
    <div className="flex flex-col items-center">
      {/* Donut */}
      <div
        className="
          relative mt-6 h-[96px] w-[96px]
          rounded-full
        "
        style={{
          background: `conic-gradient(
            ${gradientParts.join(", ")}
          )`,
        }}
      >
        <div
          className="
            absolute inset-[14px]
            flex flex-col items-center justify-center
            rounded-full bg-[#292929]
          "
        >
          <span className="text-[18px] font-bold text-white">
            28
          </span>

          <span className="text-[8px] text-gray-400">
            Usuarios
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 w-full space-y-2">
        {roles.map((role) => (
          <div
            key={role.name}
            className="
              flex items-center gap-2
              text-[9px] text-gray-300
            "
          >
            <span
              className="h-2 w-2 rounded-sm"
              style={{
                backgroundColor: role.color,
              }}
            />

            <span>
              {role.name} ({role.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AgroSentinelDashboard() {
  return (
    <div className="min-h-screen bg-[#181818] text-white">
      <div className="flex min-h-screen">

        {/* ================= SIDEBAR ================= */}
        <aside
          className="
            hidden w-[174px] shrink-0
            border-r border-white/10
            bg-[#292929]
            md:block
          "
        >
          {/* Logo */}
          <div
            className="
              flex h-[45px] items-center gap-2
              border-b border-white/10 px-3
            "
          >
            <div
              className="
                flex h-[22px] w-[22px]
                items-center justify-center
                rounded-md bg-blue-600
              "
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M12 3L5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />
                <path d="M9.5 12.2L11.2 14l3.5-4" />
              </svg>
            </div>

            <span className="text-[14px] font-semibold text-blue-400">
              AgroSentinel
            </span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 px-3 py-3">
            <SidebarItem
              icon={LayoutDashboard}
              active
            >
              Dashboard
            </SidebarItem>

            <SidebarItem icon={Users}>
              Usuarios
            </SidebarItem>

            <SidebarItem icon={UsersRound}>
              Grupos de Trabajo
            </SidebarItem>

            <SidebarItem icon={Tractor}>
              Activos
            </SidebarItem>

            <SidebarItem icon={Package}>
              Inventario
            </SidebarItem>

            <SidebarItem icon={BarChart3}>
              Reportes
            </SidebarItem>
          </nav>
        </aside>

        {/* ================= MAIN ================= */}
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
            {/* Header left */}
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-blue-400">
                AgroSentinel
              </span>

              <span className="text-[10px] text-gray-500">
                |
              </span>

              <span className="text-[11px] font-semibold text-gray-300">
                Dashboard Administrativo
              </span>
            </div>

            {/* Header right */}
            <div className="flex items-center gap-3">
              <LogoutButton className="text-gray-300 hover:bg-white/10 hover:text-white" />

              <div className="text-right leading-tight">
                <p className="text-[9px] font-medium text-white">
                  Don Carlos Restrepo
                </p>

                <p className="text-[7px] font-bold text-blue-400">
                  ADMINISTRADOR
                </p>
              </div>

              <div
                className="
                  flex h-7 w-7
                  items-center justify-center
                  rounded-full
                  border border-white/20
                  bg-gradient-to-br
                  from-yellow-400
                  via-orange-500
                  to-green-700
                  text-[8px] font-bold
                "
              >
                CR
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="mx-auto max-w-[1120px] px-5 py-5">

            {/* ================= STATS ================= */}
            <section
              className="
                grid grid-cols-1 gap-3
                sm:grid-cols-2
                xl:grid-cols-4
              "
            >
              {stats.map((stat) => (
                <StatCard
                  key={stat.title}
                  {...stat}
                />
              ))}
            </section>

            {/* ================= LOWER CONTENT ================= */}
            <section
              className="
                mt-4 grid grid-cols-1 gap-4
                lg:grid-cols-[1.38fr_0.9fr]
              "
            >

              {/* ACTIVITY */}
              <div
                className="
                  rounded-xl
                  border border-white/10
                  bg-[#292929]
                  p-4
                "
              >
                <h2 className="text-[13px] font-semibold text-white">
                  Registro de Actividad Reciente
                </h2>

                <div className="mt-4 space-y-4">
                  {activities.map((activity, index) => (
                    <ActivityItem
                      key={index}
                      activity={activity}
                    />
                  ))}
                </div>
              </div>

              {/* ROLES */}
              <div
                className="
                  rounded-xl
                  border border-white/10
                  bg-[#292929]
                  p-4
                "
              >
                <h2 className="text-[13px] font-semibold text-white">
                  Distribución de Roles
                </h2>

                <RoleChart />
              </div>

            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
