import React, { useState } from "react";
import {
  ShieldCheck,
  Home,
  ClipboardList,
  History,
  SlidersHorizontal,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import MiPanel from "./MiPanel";
import OrdenesAsignadas from "./OrdenesAsignadas";
import Historial from "./Historial";
import InventarioRepuestos from "./InventarioRepuestos";

function SidebarItem({ icon: Icon, children, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
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

export default function TechnicianPanel() {
  const [activeTab, setActiveTab] = useState("Mi Panel");

  const contentMap = {
    "Mi Panel": <MiPanel />,
    "Órdenes Asignadas": <OrdenesAsignadas />,
    Historial: <Historial />,
    "Inventario Repuestos": <InventarioRepuestos />,
  };

  return (
    <div className="min-h-screen bg-[#181818] font-sans text-white antialiased">
      <div className="flex min-h-screen">
        <aside className="hidden w-[177px] shrink-0 border-r border-white/10 bg-[#292929] md:block">
          <div className="flex h-[45px] items-center gap-2 border-b border-white/10 px-4">
            <div className="flex h-[21px] w-[21px] items-center justify-center rounded-md bg-blue-600">
              <ShieldCheck size={13} strokeWidth={2} className="text-white" />
            </div>

            <span className="text-[13px] font-semibold text-blue-400">AgroSentinel</span>
          </div>

          <nav className="space-y-1 px-3 py-3">
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
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-[45px] items-center justify-between border-b border-white/10 bg-[#242424] px-5">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-blue-400">AgroSentinel</span>
              <span className="text-[10px] text-gray-500">|</span>
              <span className="text-[10px] text-gray-300">{activeTab}</span>
            </div>

            <div className="flex items-center gap-3">
              <LogoutButton className="text-gray-300 hover:bg-white/10 hover:text-white" />

              <div className="text-right leading-tight">
                <p className="text-[9px] font-medium text-white">Ing. Marlon</p>
                <p className="text-[7px] font-bold text-blue-400">TÉCNICO SENIOR</p>
              </div>

              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-700 text-[8px] font-bold text-gray-800">
                HO
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1120px] px-5 py-5">{contentMap[activeTab]}</div>
        </main>
      </div>
    </div>
  );
}
