import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  ClipboardCheck,
  BarChart3,
  FileText,
  Bell,
  Search,
  AlertTriangle,
  Boxes,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import Inventario from "../Compartido/Inventario";
import Entradas from "../Compartido/Entradas";
import Salidas from "../Compartido/Salidas";
import Reportes from "../Compartido/Reportes";
import Equipo from "./Equipo";
import Aprobaciones from "./Aprobaciones";
import Analisis from "./Analisis";

/* =========================================================
   DATA
========================================================= */

const kpis = [
  {
    title: "EFICIENCIA OPERATIVA",
    value: "94.2%",
    badge: "Excelente",
    badgeClass: "bg-green-100 text-green-700",
  },
  {
    title: "ÓRDENES COMPLETADAS",
    value: "187",
    suffix: "órdenes",
    badge: "Meta 90%",
    badgeClass: "bg-orange-50 text-orange-600",
  },
  {
    title: "TIEMPO PROM. DESPACHO",
    value: "23",
    suffix: "minutos",
    badge: "−4 min",
    badgeClass: "bg-green-100 text-green-700",
  },
  {
    title: "INCIDENCIAS DEL MES",
    value: "3",
    suffix: "casos",
    badge: "Bajo",
    badgeClass: "bg-blue-50 text-blue-600",
  },
];

const weeklyData = [
  { day: "Lun", value: 85 },
  { day: "Mar", value: 91 },
  { day: "Mié", value: 94 },
  { day: "Jue", value: 89 },
  { day: "Vie", value: 96 },
];

const teamActivity = [
  {
    name: "Carlos R.",
    role: "Almacenista Turno A",
    action: "Registró entrada de 50 unidades de Pintura Acrílica",
    time: "09:30",
    color: "from-gray-500 to-gray-800",
  },
  {
    name: "María L.",
    role: "Preparador de Despacho",
    action: "Completó el inventario general de la Zona B",
    time: "08:45",
    color: "from-orange-300 to-gray-700",
  },
  {
    name: "Martín G.",
    role: "Almacenista Turno B",
    action: "Reportó daño de 5 disolventes en traslado",
    time: "Ayer",
    color: "from-yellow-700 to-gray-900",
  },
  {
    name: "Laura G.",
    role: "Despachador",
    action: "Solicitó autorización para ajuste de stock",
    time: "Ayer",
    color: "from-gray-400 to-gray-800",
  },
];

const inventory = [
  {
    name: "Pinturas e Insumos",
    value: 82,
    color: "bg-orange-500",
  },
  {
    name: "Herramientas",
    value: 65,
    color: "bg-blue-600",
  },
  {
    name: "Solventes Químicos",
    value: 45,
    color: "bg-red-500",
  },
  {
    name: "Material de Embalaje",
    value: 90,
    color: "bg-green-600",
  },
];

const approvals = [
  {
    title: "Ajuste de Stock: +50 Pinturas",
    sku: "SKU-3829-AZ",
    description:
      "Entrada de excedente de obra sin SKU original en Sector B.",
    person: "Carlos R.",
    time: "10m",
  },
  {
    title: "Transferencia: Sector A → C",
    sku: "SKU-9182-RD",
    description:
      "Movimiento de 15 lotes de Rodillos de Fibra por espacio crítico.",
    person: "María L.",
    time: "25m",
  },
  {
    title: "Descarte por Merma",
    sku: "SKU-9922-DT",
    description:
      "Desecho de 5 unidades de Disolventes con envase roto en Sector Químicos.",
    person: "Martín G.",
    time: "1h",
  },
];

/* =========================================================
   SIDEBAR
========================================================= */

function SidebarItem({
  icon: Icon,
  children,
  active = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex w-full items-center gap-3
        rounded-md px-3 py-2.5
        text-left text-[11px]
        transition-all
        ${
          active
            ? "bg-[#1d2a3f] text-white"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        }
      `}
    >
      {active && (
        <span className="absolute right-0 top-1/2 h-3 w-[3px] -translate-y-1/2 rounded-l bg-orange-500" />
      )}

      <Icon size={15} strokeWidth={1.7} />

      <span>{children}</span>
    </button>
  );
}

function Sidebar({ activeSection, onSelect }) {
  return (
    <aside
      className="
        hidden w-[172px] shrink-0
        bg-[#0e1729]
        md:block
      "
    >
      {/* Logo */}
      <div
        className="
          flex h-[62px]
          items-center gap-2.5
          border-b border-white/5
          px-4
        "
      >
        <div
          className="
            flex h-7 w-7
            items-center justify-center
            rounded-md
            bg-orange-500
          "
        >
          <Boxes
            size={17}
            strokeWidth={2}
            className="text-white"
          />
        </div>

        <div className="leading-tight">
          <p className="text-[13px] font-bold text-white">
            SGA CONTROL
          </p>

          <p className="text-[6px] uppercase text-gray-400">
            Supervisor Central
          </p>
        </div>
      </div>

      {/* Menu */}
      <nav className="px-3 py-4">
        <div className="space-y-1">
          <SidebarItem
            icon={LayoutDashboard}
            active={activeSection === "Inicio"}
            onClick={() => onSelect("Inicio")}
          >
            Inicio
          </SidebarItem>

          <SidebarItem icon={Package} active={activeSection === "Inventario"} onClick={() => onSelect("Inventario")}>
            Inventario
          </SidebarItem>

          <SidebarItem icon={ArrowDownToLine} active={activeSection === "Entradas"} onClick={() => onSelect("Entradas")}>
            Entradas
          </SidebarItem>

          <SidebarItem icon={ArrowUpFromLine} active={activeSection === "Salidas"} onClick={() => onSelect("Salidas")}>
            Salidas
          </SidebarItem>

          <SidebarItem icon={Users} active={activeSection === "Equipo"} onClick={() => onSelect("Equipo")}>
            Equipo
          </SidebarItem>

          <SidebarItem icon={ClipboardCheck} active={activeSection === "Aprobaciones"} onClick={() => onSelect("Aprobaciones")}>
            Aprobaciones
          </SidebarItem>

          <SidebarItem icon={BarChart3} active={activeSection === "Análisis"} onClick={() => onSelect("Análisis")}>
            Análisis
          </SidebarItem>

          <SidebarItem icon={FileText} active={activeSection === "Reportes"} onClick={() => onSelect("Reportes")}>
            Reportes
          </SidebarItem>
        </div>

        {/* Divider */}
        <div className="my-5 h-px bg-white/10" />

        {/* Occupation */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[7px] uppercase text-gray-400">
              Ocupación total
            </span>

            <span className="text-[8px] font-semibold text-white">
              78%
            </span>
          </div>

          <div className="h-1 rounded-full bg-slate-700">
            <div
              className="h-1 w-[78%] bg-orange-500"
            />
          </div>

          <p className="mt-2 text-[7px] text-gray-500">
            Ubicaciones libres: 342
          </p>
        </div>
      </nav>
    </aside>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header({ notificationsRead, onNotifications }) {
  return (
    <header
      className="
        flex h-[62px]
        items-center justify-between
        border-b border-[#d7dce4]
        bg-[#1c293d]
        px-5
      "
    >
      {/* Search */}
      <div
        className="
          flex h-8 w-[225px]
          items-center gap-2
          rounded-md
          bg-[#101b2d]
          px-3
        "
      >
        <Search
          size={13}
          className="text-gray-400"
        />

        <span className="text-[9px] text-gray-400">
          Buscar aprobaciones, SKU o equipo...
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <LogoutButton className="text-gray-300 hover:bg-white/10 hover:text-white" />

        <button
          type="button"
          onClick={onNotifications}
          aria-label="Marcar notificaciones como leídas"
          className="
            relative flex h-7 w-7
            items-center justify-center
            rounded-full
            border border-white/10
          "
        >
          <Bell
            size={13}
            className="text-white"
          />

          <span
            className={`
              absolute right-0 top-0
              h-1.5 w-1.5
              rounded-full bg-orange-500
              ${notificationsRead ? "opacity-0" : ""}
            `}
          />
        </button>

        <div className="flex items-center gap-2">
          <div
            className="
              flex h-7 w-7
              items-center justify-center
              rounded-full
              bg-gradient-to-br
              from-gray-300
              to-gray-700
              text-[7px]
              font-bold
              text-gray-800
            "
          >
            SP
          </div>

          <div className="leading-tight">
            <p className="text-[8px] font-semibold text-white">
              Juan Jimenez
            </p>

            <div className="flex items-center gap-1">
              <span className="text-[6px] text-gray-400">
                Supervisor General
              </span>

              <span
                className="
                  rounded-sm
                  bg-orange-500
                  px-1
                  py-[1px]
                  text-[5px]
                  font-bold
                  text-white
                "
              >
                SUPERVISOR
              </span>
            </div>

            <p className="text-[6px] text-gray-500">
              Supervisor General Turno A
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   KPI
========================================================= */

function KpiCard({
  title,
  value,
  suffix,
  badge,
  badgeClass,
}) {
  return (
    <div
      className="
        rounded-lg
        border border-white/10
        bg-[#292929]
        px-3 py-3
        shadow-[0_1px_3px_rgba(15,23,42,0.03)]
      "
    >
      <div className="flex items-start justify-between">
        <p
          className="
            text-[8px]
            font-medium
            uppercase
            text-slate-500
          "
        >
          {title}
        </p>

        <span
          className={`
            rounded
            px-1.5 py-1
            text-[6px]
            font-semibold
            ${badgeClass}
          `}
        >
          {badge}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-[22px] font-bold leading-none text-white">
          {value}
        </span>

        {suffix && (
          <span className="text-[8px] text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   WEEKLY CHART
========================================================= */

function WeeklyChart() {
  return (
    <div
      className="
        rounded-lg
        border border-white/10
        bg-[#292929]
        p-4
      "
    >
      <h2 className="text-[11px] font-bold text-white">
        Rendimiento Semanal (% de Eficiencia)
      </h2>

      <p className="mt-0.5 text-[7px] text-slate-400">
        Eficiencia global medida de Lunes a Viernes en despacho de cargas
      </p>

      <div
        className="
          mt-5
          flex h-[105px]
          items-end justify-center
          gap-7
        "
      >
        {weeklyData.map((item) => (
          <div
            key={item.day}
            className="
              flex h-full
              w-9
              flex-col
              items-center
              justify-end
            "
          >
            <span className="mb-1 text-[7px] font-medium text-gray-400">
              {item.value}%
            </span>

            <div
              className="
                relative w-8
                rounded-t-[5px]
                bg-orange-600
              "
              style={{
                height: `${item.value - 55}%`,
              }}
            />

            <span className="mt-2 text-[7px] text-slate-500">
              {item.day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   APPROVALS
========================================================= */

function ApprovalCard({ approval }) {
  const [decision, setDecision] = useState("");

  return (
    <div
      className="
        rounded-md
        border border-white/10
        bg-[#292929]
        p-2.5
      "
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[9px] font-bold text-white">
            {approval.title}
          </h3>

          <p className="mt-0.5 text-[7px] text-slate-500">
            {approval.sku}
          </p>
        </div>
      </div>

      <p className="mt-2 text-[7px] leading-relaxed text-slate-500">
        {approval.description}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[6px] text-slate-500">
          Por: {approval.person}
        </span>

        <span className="text-[6px] text-slate-400">
          Hace&nbsp; {approval.time}
        </span>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setDecision("Aprobada")}
          aria-pressed={decision === "Aprobada"}
          className="
            flex-1
            rounded
            bg-green-600
            py-1.5
            text-[7px]
            font-semibold
            text-white
            transition
            hover:bg-green-700
          "
        >
          {decision === "Aprobada" ? "Aprobada" : "Aprobar"}
        </button>

        <button
          type="button"
          onClick={() => setDecision("Rechazada")}
          aria-pressed={decision === "Rechazada"}
          className="
            flex-1
            rounded
            border border-white/10
            bg-[#202020]
            py-1.5
            text-[7px]
            font-medium
            text-gray-300
            transition
            hover:bg-slate-50
          "
        >
          {decision === "Rechazada" ? "Rechazada" : "Rechazar"}
        </button>
      </div>
    </div>
  );
}

function Approvals() {
  return (
    <div
      className="
        rounded-lg
        border border-white/10
        bg-[#292929]
        p-3
      "
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-bold text-white">
            Aprobaciones Pendientes
          </h2>

          <p className="text-[7px] text-slate-400">
            Validación necesaria para movimientos y mermas
          </p>
        </div>

        <span
          className="
            rounded
            bg-orange-100
            px-2 py-1
            text-[6px]
            font-semibold
            text-orange-600
          "
        >
          3 pend.
        </span>
      </div>

      <div className="mt-2 space-y-2">
        {approvals.map((approval) => (
          <ApprovalCard
            key={approval.title}
            approval={approval}
          />
        ))}
      </div>

      <div
        className="
          mt-2
          flex gap-2
          rounded-md
          bg-orange-100
          p-2
        "
      >
        <AlertTriangle
          size={13}
          className="shrink-0 text-orange-500"
        />

        <p className="text-[7px] leading-relaxed text-orange-600">
          Revisar temperaturas del Sector Químicos de
          inmediato. Máx superado en 1.5°C.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   TEAM ACTIVITY
========================================================= */

function Avatar({ color, initials }) {
  return (
    <div
      className={`
        flex h-7 w-7
        shrink-0
        items-center justify-center
        rounded-full
        bg-gradient-to-br
        ${color}
        text-[7px]
        font-bold
        text-white
      `}
    >
      {initials}
    </div>
  );
}

function TeamActivity() {
  return (
    <div
      className="
        rounded-lg
        border border-white/10
        bg-[#292929]
        p-4
      "
    >
      <h2 className="text-[11px] font-bold text-white">
        Actividad del Equipo
      </h2>

      <div className="mt-3">
        {teamActivity.map((person, index) => (
          <div
            key={person.name}
            className={`
              flex gap-2
              py-2
              ${
                index !== teamActivity.length - 1
                  ? "border-b border-white/10"
                  : ""
              }
            `}
          >
            <Avatar
              color={person.color}
              initials={person.name
                .split(" ")
                .map((x) => x[0])
                .join("")}
            />

            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-[8px] font-bold text-white">
                    {person.name}
                  </p>

                  <p className="text-[6px] text-slate-400">
                    {person.role}
                  </p>
                </div>

                <span className="text-[6px] text-slate-400">
                  {person.time}
                </span>
              </div>

              <p className="mt-1 text-[7px] text-slate-500">
                {person.action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   INVENTORY
========================================================= */

function Inventory() {
  return (
    <div
      className="
        rounded-lg
        border border-white/10
        bg-[#292929]
        p-4
      "
    >
      <h2 className="text-[11px] font-bold text-white">
        Inventario por Categoría
      </h2>

      <div className="mt-4 space-y-3">
        {inventory.map((item) => (
          <div key={item.name}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[7px] font-medium text-gray-400">
                {item.name}
              </span>

              <span className="text-[7px] font-bold text-gray-300">
                {item.value}%
              </span>
            </div>

            <div className="h-[5px] rounded-full bg-[#3a3a3a]">
              <div
                className={`h-[5px] rounded-full ${item.color}`}
                style={{
                  width: `${item.value}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function SupervisorDashboard() {
  const [activeSection, setActiveSection] = useState("Inicio");
  const [notificationsRead, setNotificationsRead] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case "Inventario":
        return <Inventario variant="dark" />;
      case "Entradas":
        return <Entradas variant="dark" />;
      case "Salidas":
        return <Salidas variant="dark" />;
      case "Equipo":
        return <Equipo />;
      case "Aprobaciones":
        return <Aprobaciones />;
      case "Análisis":
        return <Analisis />;
      case "Reportes":
        return <Reportes variant="dark" />;
      case "Inicio":
      default:
        return (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi) => (
                <KpiCard key={kpi.title} {...kpi} />
              ))}
            </section>

            <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_240px]">
              <WeeklyChart />
              <Approvals />
            </section>

            <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px]">
              <TeamActivity />
              <Inventory />
            </section>
          </>
        );
    }
  };

  return (
    <div
      className="
        min-h-screen
        bg-[#181818]
        font-sans
        text-white
        antialiased
      "
    >
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSelect={setActiveSection}
        />

        {/* Main */}
        <main className="min-w-0 flex-1">

          {/* Header */}
          <Header
            notificationsRead={notificationsRead}
            onNotifications={() => setNotificationsRead(true)}
          />

          {/* Content */}
          <div className="mx-auto max-w-[1180px] px-5 py-5">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}