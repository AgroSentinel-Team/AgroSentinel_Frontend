import { useEffect, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowUpRight, BarChart3, Bell, ClipboardCheck, FileWarning, LayoutDashboard, Package, Tractor, Users, UsersRound } from 'lucide-react';
import LogoutButton from '../../components/LogoutButton';
import Usuarios from './Usuarios';
import GruposTrabajo from './GruposTrabajo';
import Activos from './Activos';
import Inventario from '../Compartido/Inventario';
import Entradas from '../Compartido/Entradas';
import Salidas from '../Compartido/Salidas';
import Reportes from '../Compartido/Reportes';
import MantenimientoPredictivo from '../Compartido/MantenimientoPredictivo';
import PreventiveMaintenance from '../Compartido/PreventiveMaintenance';
import ReporteFallas from './ReporteFallas';
import { OPEN_PREVENTIVE_SCHEDULE_EVENT } from '../../services/preventiveMaintenanceNavigation';

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Usuarios', icon: Users },
  { label: 'Grupos de Trabajo', icon: UsersRound },
  { label: 'Activos', icon: Tractor },
  { label: 'Reporte de Fallas', icon: FileWarning },
  { label: 'Inventario', icon: Package },
  { label: 'Entradas', icon: ArrowDownLeft },
  { label: 'Salidas', icon: ArrowUpRight },
  { label: 'Reportes', icon: BarChart3 },
  { label: 'Mantenimiento', icon: Activity },
  { label: 'Mantenimiento Preventivo', icon: ClipboardCheck },
];

const stats = [
  { title: 'REPORTES NUEVOS', value: '5' },
  { title: 'EN EVALUACIÓN', value: '3' },
  { title: 'EN TALLER', value: '4' },
  { title: 'RESULTADOS ESTE MES', value: '12' },
];

const reports = [
  {
    id: 'RF-001',
    category: 'Hidráulica',
    title: 'Fumigadora Jacto 3030',
    summary: 'Se detectó fuga de aceite en la manga de retorno de presión del sistema hidráulico.',
    time: 'Hoy, 09:30 AM',
    accent: 'border border-cyan-400/40 bg-[#173d4f] text-cyan-300',
    button: 'bg-[#0d7ca3] text-cyan-100',
  },
  {
    id: 'RF-002',
    category: 'Eléctrica',
    title: 'Tractor John Deere 6125J',
    summary: 'Falla en la batería y conexión de arranque, se observa desgaste en los terminales.',
    time: 'Ayer, 04:15 PM',
    accent: 'border border-amber-400/30 bg-[#3e3625] text-amber-300',
    button: 'bg-[#836e20] text-amber-100',
  },
  {
    id: 'RF-003',
    category: 'Mecánica',
    title: 'Cosechadora New Holland',
    summary: 'Se observa vibración en la banda de transporte y desgaste en el sistema de presión.',
    time: '26 Ago 2025, 02:00 PM',
    accent: 'border border-emerald-400/30 bg-[#1a382d] text-emerald-300',
    button: 'bg-[#1f654a] text-emerald-100',
  },
];

function DashboardHome() {
  const [selectedReport, setSelectedReport] = useState(reports[0]);
  const [assignment, setAssignment] = useState('');

  const assignReport = () => {
    setAssignment(`OT generada para ${selectedReport.id}`);
  };

  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl border border-[#2d4055] bg-[#172c3d] px-4 py-4"
          >
            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">
              {stat.title}
            </p>
            <p className="mt-3 text-[28px] font-bold leading-none text-white">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[1.38fr_0.95fr]">
        <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4">
          <h2 className="text-[14px] font-semibold text-white">
            Reportes Pendientes de Revisión (3)
          </h2>

          <div className="mt-4 space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`rounded-lg p-3 ${report.accent}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.1em]">
                      <span>{report.id}</span>
                      <span className="text-slate-400">• {report.category}</span>
                    </div>
                    <p className="mt-2 text-[14px] font-semibold text-white">{report.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{report.summary}</p>
                    <p className="mt-2 text-[10px] text-slate-400">{report.time}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${report.button}`}
                  >
                    Revisar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-[#2d4055] bg-[#102a3d] p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[14px] font-semibold text-white">Detalle del reporte {selectedReport.id}</h2>
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em] text-cyan-300">
              Urgencia: Media
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] text-slate-300">
            <div>
              <p className="text-slate-400">Equipo</p>
              <p className="mt-1 font-medium text-white">{selectedReport.title}</p>
            </div>
            <div>
              <p className="text-slate-400">Tipo falla</p>
              <p className="mt-1 font-medium text-white">{selectedReport.category}</p>
            </div>
            <div>
              <p className="text-slate-400">Ubicación</p>
              <p className="mt-1 font-medium text-white">Lote 4 - Sector Norte</p>
            </div>
            <div>
              <p className="text-slate-400">Fecha evento</p>
              <p className="mt-1 font-medium text-white">2025-08-27 / 09:30 AM</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
              Descripción del operador
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              {selectedReport.summary}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-[#304d5e] bg-[#1d3242] p-3">
            <p className="text-[10px] text-slate-400">Esteban Restrepo</p>
            <p className="mt-1 text-[11px] font-medium text-white">Responsable del área</p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">
                Técnico responsable
              </label>
              <select className="mt-2 w-full rounded-xl border border-[#36556f] bg-[#1a2c3d] px-3 py-2.5 text-[11px] text-white outline-none focus:border-cyan-400">
                <option>Ing. Héctor Fabián Ortiz</option>
                <option>Ing. Mariana López</option>
                <option>Ing. Daniel Rojas</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  Prioridad de atención
                </label>
                <select className="mt-2 w-full rounded-xl border border-[#36556f] bg-[#1a2c3d] px-3 py-2.5 text-[11px] text-white outline-none focus:border-cyan-400">
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  Tiempo estimado
                </label>
                <select className="mt-2 w-full rounded-xl border border-[#36556f] bg-[#1a2c3d] px-3 py-2.5 text-[11px] text-white outline-none focus:border-cyan-400">
                  <option>3 Horas</option>
                  <option>6 Horas</option>
                  <option>1 Día</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">
                Notas administrativas
              </label>
              <textarea
                rows="3"
                className="mt-2 w-full resize-none rounded-xl border border-[#36556f] bg-[#1a2c3d] px-3 py-2.5 text-[11px] text-white outline-none focus:border-cyan-400"
                defaultValue="Llevar manguera de alta presión y juego de acoples rápidos de repuesto."
              />
            </div>
          </div>

          <button
            type="button"
            onClick={assignReport}
            className="mt-5 w-full rounded-xl border border-emerald-300/60 bg-gradient-to-r from-[#4ade80] to-[#a3e635] px-4 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-950 shadow-[0_8px_18px_rgba(74,222,128,0.2)]"
          >
            Asignar Técnico y Generar OT
          </button>
          {assignment && <p className="mt-3 text-center text-[10px] font-semibold text-emerald-300">{assignment}</p>}
        </aside>
      </section>
    </>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [predictivePrefill, setPredictivePrefill] = useState(null);

  useEffect(() => {
    const openPreventiveSchedule = (event) => {
      setPredictivePrefill(event.detail);
      setActiveTab('Mantenimiento Preventivo');
    };
    window.addEventListener(OPEN_PREVENTIVE_SCHEDULE_EVENT, openPreventiveSchedule);
    return () => window.removeEventListener(OPEN_PREVENTIVE_SCHEDULE_EVENT, openPreventiveSchedule);
  }, []);

  const content = {
    Dashboard: <DashboardHome />,
    Usuarios: <Usuarios />,
    'Grupos de Trabajo': <GruposTrabajo />,
    Activos: <Activos />,
    'Reporte de Fallas': <ReporteFallas />,
    Inventario: <Inventario />,
    Entradas: <Entradas />,
    Salidas: <Salidas />,
    Reportes: <Reportes />,
    Mantenimiento: <MantenimientoPredictivo />,
    'Mantenimiento Preventivo': (
      <PreventiveMaintenance
        predictivePrefill={predictivePrefill}
        onPredictivePrefillConsumed={() => setPredictivePrefill(null)}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-[#020d16]">
      <div className="flex min-h-screen w-full overflow-hidden bg-[#020d16]">
        <aside className="hidden w-[190px] shrink-0 border-r border-[#1b2f3f] bg-[#0d1f2d] md:block">
          <div className="flex h-[58px] items-center gap-2 border-b border-[#1b2f3f] px-4">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#0f9ec7] text-[11px] font-bold text-white">
              A
            </div>
            <span className="text-[14px] font-semibold text-cyan-300">AgroSentinel</span>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(label)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[11px] transition ${
                  activeTab === label
                    ? 'bg-[#143c50] text-cyan-200 shadow-[inset_0_1px_0_rgba(125,211,252,0.1)]'
                    : 'text-slate-300 hover:bg-[#143c50] hover:text-white'
                }`}
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
              </button>
            ))}
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((current) => !current)}
                  aria-label="Ver notificaciones"
                  className="rounded-md p-1.5 text-slate-300 transition hover:bg-[#1d3d52] hover:text-white"
                >
                  <Bell size={15} />
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-9 z-10 w-56 rounded-xl border border-[#36556f] bg-[#13293a] p-3 shadow-xl">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">Notificaciones</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-300">Hay 3 reportes pendientes de revisión.</p>
                    <button type="button" onClick={() => { setNotificationsOpen(false); setActiveTab('Reportes'); }} className="mt-3 text-[10px] font-semibold text-emerald-300 hover:text-emerald-200">Ver reportes</button>
                  </div>
                )}
              </div>
              <LogoutButton className="text-slate-300 hover:bg-[#1d3d52] hover:text-white" />
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[9px] font-medium text-white">Don Carlos Restrepo</p>
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                  Administrador
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/40 bg-gradient-to-br from-yellow-400 via-orange-500 to-emerald-600 text-[8px] font-bold text-slate-900">
                CR
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {content[activeTab]}
          </div>
        </main>
      </div>
    </div>
  );
}
