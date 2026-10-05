import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Home,
  ClipboardList,
  History,
  SlidersHorizontal,
  Activity,
  ClipboardCheck,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
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
        flex w-full items-center gap-3
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
      <Icon size={14} strokeWidth={1.8} />
      <span>{children}</span>
    </button>
  );
}

export default function TechnicianPanel() {
  const [activeTab, setActiveTab] = useState("Mi Panel");
  const [predictivePrefill, setPredictivePrefill] = useState(null);
  const [technicianName, setTechnicianName] = useState(localStorage.getItem("nombre") || "");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setTechnicianName(user.nombre || user.email);
        localStorage.setItem("nombre", user.nombre || user.email);
        localStorage.setItem("roles", JSON.stringify(user.roles || []));
        localStorage.setItem("rol", user.rol || localStorage.getItem("rol") || "");
        setProfileError("");
      })
      .catch((error) => setProfileError(error.response?.data?.message || "No fue posible cargar el perfil autenticado."));
    const openPreventiveSchedule = (event) => {
      setPredictivePrefill(event.detail);
      setActiveTab("Mantenimiento Preventivo");
    };
    window.addEventListener(OPEN_PREVENTIVE_SCHEDULE_EVENT, openPreventiveSchedule);
    return () => window.removeEventListener(OPEN_PREVENTIVE_SCHEDULE_EVENT, openPreventiveSchedule);
  }, []);

  const contentMap = {
    "Mi Panel": <MiPanel onOpenOrders={() => setActiveTab("Órdenes Asignadas")} />,
    "Órdenes Asignadas": <OrdenesAsignadas onOpenPreventive={() => setActiveTab("Mantenimiento Preventivo")} />,
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

  return (
    <div className="min-h-screen bg-[#020d16] font-sans text-white antialiased">
      <div className="flex min-h-screen w-full overflow-hidden bg-[#020d16]">
        <aside className="hidden w-[190px] shrink-0 border-r border-[#1b2f3f] bg-[#0d1f2d] md:block">
          <div className="flex h-[58px] items-center gap-2 border-b border-[#1b2f3f] px-4">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#0f9ec7]">
              <ShieldCheck size={15} strokeWidth={2} className="text-white" />
            </div>

            <span className="text-[14px] font-semibold text-cyan-300">AgroSentinel</span>
          </div>

          <nav className="space-y-1 px-3 py-4">
            <SidebarItem icon={Home} active={activeTab === "Mi Panel"} onClick={() => setActiveTab("Mi Panel")}>
              Mi Panel
            </SidebarItem>

            <SidebarItem icon={ClipboardList} active={activeTab === "Órdenes Asignadas"} onClick={() => setActiveTab("Órdenes Asignadas")}>
              Órdenes Asignadas
            </SidebarItem>

            <SidebarItem icon={History} active={activeTab === "Historial"} onClick={() => setActiveTab("Historial")}>
              Historial
            </SidebarItem>

            <SidebarItem icon={SlidersHorizontal} active={activeTab === "Inventario Repuestos"} onClick={() => setActiveTab("Inventario Repuestos")}>
              Inventario Repuestos
            </SidebarItem>

            <SidebarItem icon={Activity} active={activeTab === "Mantenimiento"} onClick={() => setActiveTab("Mantenimiento")}>
              Mantenimiento
            </SidebarItem>
            <SidebarItem icon={ClipboardCheck} active={activeTab === "Mantenimiento Preventivo"} onClick={() => setActiveTab("Mantenimiento Preventivo")}>
              Mantenimiento Preventivo
            </SidebarItem>
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[#020d16]">
          <header className="flex min-h-[58px] items-center justify-between gap-3 border-b border-[#1f3446] bg-[#0d2437] px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-[14px] font-semibold text-cyan-300">AgroSentinel</span>
              <span className="text-slate-500">|</span>
              <span className="truncate text-[11px] font-semibold text-slate-300">{activeTab}</span>
            </div>

            <div className="flex items-center gap-3">
              <LogoutButton className="text-slate-300 hover:bg-[#1d3d52] hover:text-white" />

              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[11px] font-medium text-white">{technicianName || "Cargando perfil…"}</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-300">TÉCNICO</p>
              </div>

              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/60 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 text-[11px] font-bold text-white">
                {technicianName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "—"}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {profileError && <p role="alert" className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">{profileError}</p>}
            {contentMap[activeTab]}
          </div>
        </main>
      </div>
    </div>
  );
}
