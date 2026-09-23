import { useState } from "react";
import {
  LayoutDashboard,
  FileWarning,
  FileText,
  Tractor,
  ClipboardList,
  AlertTriangle,
  Activity,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import OrdenesTrabajo from "./OrdenesTrabajo";
import Maquinaria from "./Maquinaria";
import MisReportes from "./MisReportes";
import ReportarFalla from "./reportarFalla";
import MantenimientoPredictivo from "../Compartido/MantenimientoPredictivo";

const navigation = [
  { label: "Mi Panel", icon: LayoutDashboard },
  { label: "Reportar Falla", icon: FileWarning },
  { label: "Mis Reportes", icon: FileText },
  { label: "Maquinaria", icon: Tractor },
  { label: "Órdenes de Trabajo", icon: ClipboardList },
  { label: "Mantenimiento", icon: Activity },
];

export default function OperDashboard() {
  const [activeTab, setActiveTab] = useState("Mi Panel");

  const contentMap = {
    "Mi Panel": <DashboardHome />,
    "Reportar Falla": <ReportarFalla />,
    "Mis Reportes": <MisReportes />,
    Maquinaria: <Maquinaria />,
    "Órdenes de Trabajo": <OrdenesTrabajo />,
    Mantenimiento: <MantenimientoPredictivo />,
  };

  return (
    <div className="flex min-h-screen bg-[#020d16] text-white font-sans">
      <aside className="w-[180px] min-h-screen border-r border-[#1b2f3f] bg-[#0d1f2d]">
        <div className="flex h-[70px] items-center px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0f9ec7]">
              <Tractor size={15} />
            </div>
            <span className="text-sm font-semibold text-blue-400">AgroSentinel</span>
          </div>
        </div>

        <nav className="space-y-2 px-3">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveTab(label)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition ${
                activeTab === label
                  ? "bg-[#143c50] text-cyan-200"
                  : "text-slate-300 hover:bg-[#143c50] hover:text-white"
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1">
        <header className="flex h-[70px] items-center justify-between border-b border-[#1f3446] bg-[#0d2437] px-7">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-cyan-300">AgroSentinel</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">{activeTab}</span>
          </div>

          <div className="flex items-center gap-3">
            <LogoutButton className="text-gray-300 hover:bg-white/10 hover:text-white" />

            <div className="text-right">
              <p className="text-[11px] font-semibold">Esteban Bertrano</p>
              <p className="text-[8px] text-gray-400">OPERARIO DE MAQUINARIA</p>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600">
              👨🏻‍🌾
            </div>
          </div>
        </header>

        <section className="p-7">{contentMap[activeTab]}</section>
      </main>
    </div>
  );
}

function DashboardHome() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold">¡Hola, Esteban!</h1>
        <p className="mt-1 text-xs text-gray-400">
          Reporte novedades de los equipos agrícolas asignados hoy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-600 bg-[#202020] p-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20">
                <AlertTriangle size={18} className="text-blue-500" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-blue-400">¿Algún equipo fallando?</h2>
                <p className="mt-1 text-[10px] text-gray-400">
                  Reporta rápidamente cualquier novedad que estés observando en tus equipos.
                </p>
              </div>
            </div>

            <button className="mt-4 w-full rounded-md bg-blue-600 py-2 text-[10px] font-semibold transition hover:bg-blue-700">
              Reportar Nueva Falla
            </button>
          </div>

          <div className="rounded-xl bg-[#242424] p-4">
            <h2 className="mb-4 text-sm font-semibold">Mis Reportes Recientes</h2>

            <div className="space-y-2">
              <ReportItem
                machine="Fumigadora Jacto 3030"
                description="Fuga de manguera de retorno de presión"
                date="Hoy, 8:30 AM"
                status="Evaluando"
              />

              <ReportItem
                machine="Tractor John Deere 6125J"
                description="Testigo de baja tensión en el tablero"
                date="Ayer, 4:15 PM"
                status="En Taller"
              />
            </div>
          </div>
        </div>

        <div className="h-fit rounded-xl bg-[#292929] p-4">
          <h2 className="mb-5 text-sm font-semibold">Disponibilidad de Maquinaria</h2>

          <Availability name="Tractor John Deere 613" value={95} description="Totalmente operativo" />
          <Availability name="Cosechadora New Holland" value={80} description="Operacional, requiere revisión" />
          <Availability name="Fumigadora Jacto 3030" value={40} description="Fuera de servicio por falla reportada" />
          <Availability name="Sistema de Riego Lote A" value={100} description="Presión óptima" />
        </div>
      </div>
    </>
  );
}

function ReportItem({ machine, description, date, status }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[#333] bg-[#292929] p-3">
      <div>
        <p className="text-[11px] font-semibold">{machine}</p>
        <p className="mt-1 text-[9px] text-gray-400">{description}</p>
        <p className="mt-1 text-[8px] text-gray-500">{date}</p>
      </div>

      <span className="rounded-sm bg-blue-600 px-2 py-1 text-[8px]">{status}</span>
    </div>
  );
}

function Availability({ name, value, description }) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between">
        <span className="text-[10px] text-gray-300">{name}</span>
        <span className={`text-[9px] font-semibold ${value < 50 ? "text-orange-400" : "text-blue-400"}`}>
          {value}%
        </span>
      </div>

      <div className="h-[5px] overflow-hidden rounded-full bg-[#3a3a3a]">
        <div
          className={`h-full rounded-full ${value < 50 ? "bg-orange-400" : "bg-blue-500"}`}
          style={{ width: `${value}%` }}
        />
      </div>

      <p className="mt-1 text-[7px] text-gray-500">{description}</p>
    </div>
  );
}