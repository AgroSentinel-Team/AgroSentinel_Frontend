import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Home,
  ClipboardList,
  History,
  SlidersHorizontal,
  Activity,
  ClipboardCheck,
  Menu,
  X,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import DashboardRoleSwitcher from "../../components/DashboardRoleSwitcher";
import MiPanel from "./MiPanel";
import OrdenesAsignadas from "./OrdenesAsignadas";
import Historial from "./Historial";
import InventarioRepuestos from "./InventarioRepuestos";
import MantenimientoPredictivo from "../Compartido/MantenimientoPredictivo";
import PreventiveMaintenance from "../Compartido/PreventiveMaintenance";
import { OPEN_PREVENTIVE_SCHEDULE_EVENT } from "../../services/preventiveMaintenanceNavigation";
import { getCurrentUser } from "../../services/technicianService";

function SidebarItem({ icon: Icon, children, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex min-h-[44px] w-full items-center gap-3
        rounded-xl px-3.5 py-2.5
        text-left text-xs font-semibold
        transition-all
        ${
          active
            ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }
      `}
    >
      <Icon size={18} className={active ? "text-cyan-300" : "text-slate-400"} />
      <span>{children}</span>
    </button>
  );
}

export default function TechnicianPanel() {
  const [activeTab, setActiveTab] = useState("Mi Panel");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [predictivePrefill, setPredictivePrefill] = useState(null);
  const [technicianName, setTechnicianName] = useState(
    localStorage.getItem("nombre") || ""
  );
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setTechnicianName(user.nombre || user.email);
        localStorage.setItem("nombre", user.nombre || user.email);
        localStorage.setItem("roles", JSON.stringify(user.roles || []));
        localStorage.setItem(
          "rol",
          user.rol || localStorage.getItem("rol") || ""
        );
        setProfileError("");
      })
      .catch((error) =>
        setProfileError(
          error.response?.data?.message ||
            "No fue posible cargar el perfil autenticado."
        )
      );

    const openPreventiveSchedule = (event) => {
      setPredictivePrefill(event.detail);
      setActiveTab("Mantenimiento Preventivo");
    };

    window.addEventListener(
      OPEN_PREVENTIVE_SCHEDULE_EVENT,
      openPreventiveSchedule
    );
    return () =>
      window.removeEventListener(
        OPEN_PREVENTIVE_SCHEDULE_EVENT,
        openPreventiveSchedule
      );
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const contentMap = {
    "Mi Panel": (
      <MiPanel onOpenOrders={() => handleTabChange("Órdenes Asignadas")} />
    ),
    "Órdenes Asignadas": (
      <OrdenesAsignadas
        onOpenPreventive={() => handleTabChange("Mantenimiento Preventivo")}
      />
    ),
    Historial: <Historial />,
    "Inventario Repuestos": <InventarioRepuestos />,
    Mantenimiento: <MantenimientoPredictivo />,
    "Mantenimiento Preventivo": (
      <PreventiveMaintenance
        predictivePrefill={predictivePrefill}
        onPredictivePrefillConsumed={() => setPredictivePrefill(null)}
      />
    ),
  };

  const userInitials =
    technicianName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "—";

  return (
    <div className="flex min-h-screen bg-[#020d16] font-sans text-white antialiased min-w-0">
      {/* Backdrop Móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[#1f3446] bg-[#0d1f2d] transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[70px] items-center justify-between border-b border-[#1f3446] px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-[#020d16] shadow-md shadow-cyan-950/40">
              <ShieldCheck size={18} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-cyan-400 tracking-wide">
                AgroSentinel
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Módulo Técnico
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
            className="text-slate-400 hover:text-white md:hidden p-1"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto" aria-label="Navegación del técnico">
          <SidebarItem
            icon={Home}
            active={activeTab === "Mi Panel"}
            onClick={() => handleTabChange("Mi Panel")}
          >
            Mi Panel
          </SidebarItem>

          <SidebarItem
            icon={ClipboardList}
            active={activeTab === "Órdenes Asignadas"}
            onClick={() => handleTabChange("Órdenes Asignadas")}
          >
            Órdenes Asignadas
          </SidebarItem>

          <SidebarItem
            icon={History}
            active={activeTab === "Historial"}
            onClick={() => handleTabChange("Historial")}
          >
            Historial
          </SidebarItem>

          <SidebarItem
            icon={SlidersHorizontal}
            active={activeTab === "Inventario Repuestos"}
            onClick={() => handleTabChange("Inventario Repuestos")}
          >
            Inventario Repuestos
          </SidebarItem>

          <SidebarItem
            icon={Activity}
            active={activeTab === "Mantenimiento"}
            onClick={() => handleTabChange("Mantenimiento")}
          >
            Mantenimiento
          </SidebarItem>

          <SidebarItem
            icon={ClipboardCheck}
            active={activeTab === "Mantenimiento Preventivo"}
            onClick={() => handleTabChange("Mantenimiento Preventivo")}
          >
            Mantenimiento Preventivo
          </SidebarItem>
        </nav>
      </aside>

      {/* Ámbito Principal */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Encabezado Superior */}
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#1f3446] bg-[#0d2437]/90 px-4 sm:px-7 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#102a3d] text-slate-200 hover:bg-white/10 md:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium min-w-0">
              <span className="hidden sm:inline font-bold text-cyan-300 truncate">
                AgroSentinel
              </span>
              <span className="hidden sm:inline text-slate-500">|</span>
              <span className="text-slate-200 truncate">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <DashboardRoleSwitcher />
            <LogoutButton className="text-slate-300 hover:bg-white/10 hover:text-white" />

            <div className="hidden text-right leading-tight sm:block">
              <p className="max-w-[140px] truncate text-xs font-bold text-white">
                {technicianName || "Cargando perfil…"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                TÉCNICO
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 text-xs font-bold text-white shadow-md">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Contenido Dinámico */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 min-w-0">
          {profileError && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
            >
              {profileError}
            </p>
          )}
          {contentMap[activeTab]}
        </main>
      </div>
    </div>
  );
}