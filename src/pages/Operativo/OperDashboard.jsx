import React from "react";
import {
  LayoutDashboard,
  FileWarning,
  FileText,
  Settings,
  AlertTriangle,
  Tractor,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";

export default function OperDashboard() {
  return (
    <div className="min-h-screen bg-[#181818] text-white flex font-sans">

      {/* SIDEBAR */}
      <aside className="w-[180px] bg-[#292929] min-h-screen">

        {/* Logo */}
        <div className="h-[70px] flex items-center px-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <Tractor size={15} />
            </div>

            <span className="text-blue-400 font-semibold text-sm">
              AgroSentinel
            </span>
          </div>
        </div>

        {/* MENÚ */}
        <nav className="px-3 space-y-2">

          <MenuItem
            icon={<LayoutDashboard size={15} />}
            text="Mi Panel"
            active
          />

          <MenuItem
            icon={<FileWarning size={15} />}
            text="Reportar Falla"
          />

          <MenuItem
            icon={<FileText size={15} />}
            text="Mis Reportes"
          />

          <MenuItem
            icon={<Settings size={15} />}
            text="Maquinaria"
          />

        </nav>
      </aside>


      {/* CONTENIDO */}
      <main className="flex-1">

        {/* HEADER */}
        <header className="h-[70px] bg-[#252525] border-b border-[#333] flex items-center justify-between px-7">

          <div className="flex items-center gap-2 text-sm">

            <span className="text-blue-500 font-semibold">
              AgroSentinel
            </span>

            <span className="text-gray-600">
              |
            </span>

            <span className="text-gray-400">
              Mi Panel de Control
            </span>

          </div>


          {/* USUARIO */}
          <div className="flex items-center gap-3">
            <LogoutButton className="text-gray-300 hover:bg-white/10 hover:text-white" />

            <div className="text-right">

              <p className="text-[11px] font-semibold">
                Esteban Bertrano
              </p>

              <p className="text-[8px] text-gray-400">
                OPERARIO DE MAQUINARIA
              </p>

            </div>

            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              👨🏻‍🌾
            </div>

          </div>

        </header>


        {/* BODY */}
        <section className="p-7">

          {/* SALUDO */}
          <div className="mb-6">

            <h1 className="text-xl font-bold">
              ¡Hola, Esteban!
            </h1>

            <p className="text-xs text-gray-400 mt-1">
              Reporte novedades de los equipos agrícolas asignados hoy.
            </p>

          </div>


          {/* GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">

            {/* IZQUIERDA */}
            <div className="space-y-5">

              {/* ALERTA */}
              <div className="border border-blue-600 rounded-xl bg-[#202020] p-4">

                <div className="flex gap-3">

                  <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <AlertTriangle
                      size={18}
                      className="text-blue-500"
                    />
                  </div>

                  <div>

                    <h2 className="text-sm font-semibold text-blue-400">
                      ¿Algún equipo fallando?
                    </h2>

                    <p className="text-[10px] text-gray-400 mt-1">
                      Reporta rápidamente cualquier novedad que
                      estés observando en tus equipos.
                    </p>

                  </div>

                </div>


                <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 transition rounded-md py-2 text-[10px] font-semibold">
                  Reportar Nueva Falla
                </button>

              </div>


              {/* REPORTES */}
              <div className="bg-[#242424] rounded-xl p-4">

                <h2 className="text-sm font-semibold mb-4">
                  Mis Reportes Recientes
                </h2>


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


            {/* DERECHA */}
            <div className="bg-[#292929] rounded-xl p-4 h-fit">

              <h2 className="text-sm font-semibold mb-5">
                Disponibilidad de Maquinaria
              </h2>


              <Availability
                name="Tractor John Deere 613"
                value={95}
                description="Totalmente operativo"
              />

              <Availability
                name="Cosechadora New Holland"
                value={80}
                description="Operacional, requiere revisión"
              />

              <Availability
                name="Fumigadora Jacto 3030"
                value={40}
                description="Fuera de servicio por falla reportada"
              />

              <Availability
                name="Sistema de Riego Lote A"
                value={100}
                description="Presión óptima"
              />

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}


/* ================= MENU ================= */

function MenuItem({ icon, text, active }) {

  return (
    <div
      className={`
        flex items-center gap-2
        px-3 py-2 rounded-md
        text-xs cursor-pointer
        transition

        ${
          active
            ? "bg-blue-600 text-white"
            : "text-gray-400 hover:bg-[#333] hover:text-white"
        }
      `}
    >

      {icon}

      <span>
        {text}
      </span>

    </div>
  );
}


/* ================= REPORTES ================= */

function ReportItem({
  machine,
  description,
  date,
  status,
}) {

  return (

    <div className="bg-[#292929] border border-[#333] rounded-md p-3 flex items-center justify-between">

      <div>

        <p className="text-[11px] font-semibold">
          {machine}
        </p>

        <p className="text-[9px] text-gray-400 mt-1">
          {description}
        </p>

        <p className="text-[8px] text-gray-500 mt-1">
          {date}
        </p>

      </div>


      <span className="bg-blue-600 text-[8px] px-2 py-1 rounded-sm">
        {status}
      </span>

    </div>

  );
}


/* ================= DISPONIBILIDAD ================= */

function Availability({
  name,
  value,
  description,
}) {

  return (

    <div className="mb-4">

      <div className="flex justify-between mb-1">

        <span className="text-[10px] text-gray-300">
          {name}
        </span>

        <span
          className={`text-[9px] font-semibold ${
            value < 50
              ? "text-orange-400"
              : "text-blue-400"
          }`}
        >
          {value}%
        </span>

      </div>


      {/* Barra */}
      <div className="h-[5px] bg-[#3a3a3a] rounded-full overflow-hidden">

        <div
          className={`h-full rounded-full ${
            value < 50
              ? "bg-orange-400"
              : "bg-blue-500"
          }`}
          style={{
            width: `${value}%`,
          }}
        />

      </div>


      <p className="text-[7px] text-gray-500 mt-1">
        {description}
      </p>

    </div>

  );
}