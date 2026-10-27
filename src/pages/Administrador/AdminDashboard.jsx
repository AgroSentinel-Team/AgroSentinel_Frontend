import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardCheck,
  FileWarning,
  LayoutDashboard,
  Package,
  Tractor,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import LogoutButton from '../../components/LogoutButton';
import { getAssets, getFailureReports, getPredictiveAssets } from '../../services/assetService';
import { getCurrentUser } from '../../services/technicianService';
import { getPreventiveMaintenances } from '../../services/preventiveMaintenanceService';
import { OPEN_PREVENTIVE_SCHEDULE_EVENT } from '../../services/preventiveMaintenanceNavigation';
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
import AdminDashboardHome from './AdminDashboardHome';

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

const EMPTY_DASHBOARD_DATA = {
  assets: null,
  reports: null,
  predictiveAssets: null,
  maintenances: null,
};

function displayError(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    error.message ||
    'Error de conexión'
  );
}

function initials(name) {
  return (name || 'A')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [predictivePrefill, setPredictivePrefill] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardData, setDashboardData] = useState(EMPTY_DASHBOARD_DATA);
  const [dashboardErrors, setDashboardErrors] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let active = true;
    const sources = [
      { key: 'assets', label: 'Activos', request: getAssets },
      { key: 'reports', label: 'Reportes de fallas', request: getFailureReports },
      { key: 'predictiveAssets', label: 'Telemetría predictiva', request: getPredictiveAssets },
      { key: 'maintenances', label: 'Mantenimiento preventivo', request: getPreventiveMaintenances },
    ];

    Promise.allSettled([
      ...sources.map((source) => source.request()),
      getCurrentUser(),
    ]).then((results) => {
      if (!active) return;
      const nextData = { ...EMPTY_DASHBOARD_DATA };
      const nextErrors = [];

      sources.forEach((source, index) => {
        const result = results[index];
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          nextData[source.key] = result.value;
        } else {
          nextErrors.push(
            `${source.label}: ${
              result.status === 'rejected'
                ? displayError(result.reason)
                : 'respuesta inesperada del servidor'
            }`
          );
        }
      });

      const userResult = results[sources.length];
      if (userResult.status === 'fulfilled') {
        setCurrentUser(userResult.value);
      } else {
        setCurrentUser(null);
        nextErrors.push(`Perfil: ${displayError(userResult.reason)}`);
      }

      setDashboardData(nextData);
      setDashboardErrors(nextErrors);
      setRefreshedAt(new Date());
      setDashboardLoading(false);
    });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const openPreventiveSchedule = (event) => {
      setPredictivePrefill(event.detail);
      setActiveTab('Mantenimiento Preventivo');
    };
    window.addEventListener(OPEN_PREVENTIVE_SCHEDULE_EVENT, openPreventiveSchedule);
    return () => window.removeEventListener(OPEN_PREVENTIVE_SCHEDULE_EVENT, openPreventiveSchedule);
  }, []);

  const openReportsCount = useMemo(
    () => dashboardData.reports?.filter((report) => report.estado !== 'RESUELTO').length ?? null,
    [dashboardData.reports]
  );
  const userName = currentUser?.nombre || 'Cuenta administradora';
  const userRole = currentUser?.rol || currentUser?.roles?.[0] || 'ADMINISTRADOR';
  const roleLabel = String(userRole).replace(/^ROLE_/, '').replaceAll('_', ' ');

  const refreshDashboard = () => {
    setDashboardLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const content = {
    Dashboard: (
      <AdminDashboardHome
        data={dashboardData}
        loading={dashboardLoading}
        errors={dashboardErrors}
        refreshedAt={refreshedAt}
        onRefresh={refreshDashboard}
      />
    ),
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
    <div className="min-h-screen bg-[#020d16] text-white overflow-x-hidden">
      <div className="flex min-h-screen w-full overflow-hidden bg-[#020d16]">
        {/* Sidebar Escritorio */}
        <aside className="hidden w-[220px] lg:w-[240px] shrink-0 border-r border-[#1b2f3f] bg-[#0d1f2d] md:block min-h-screen">
          <div className="flex h-[60px] items-center gap-2.5 border-b border-[#1b2f3f] px-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f9ec7] text-xs font-bold text-white shadow-md shadow-cyan-950/40">
              A
            </div>
            <span className="text-base font-bold text-cyan-300 tracking-wide">AgroSentinel</span>
          </div>

          <nav className="space-y-1 p-3 overflow-y-auto max-h-[calc(100vh-60px)]" aria-label="Navegación administrativa">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(label)}
                aria-current={activeTab === label ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all min-h-[44px] ${
                  activeTab === label
                    ? 'bg-[#143c50] text-cyan-200 shadow-[inset_0_1px_0_rgba(125,211,252,0.15)] border border-cyan-500/20'
                    : 'text-slate-300 hover:bg-[#143c50]/60 hover:text-white'
                }`}
              >
                <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Layout Principal */}
        <main className="flex min-w-0 flex-1 flex-col bg-[#020d16]">
          {/* Header Superior */}
          <header className="sticky top-0 z-40 flex min-h-[60px] items-center justify-between gap-2 border-b border-[#1f3446] bg-[#0d2437]/95 backdrop-blur-md px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="text-sm sm:text-base font-bold text-cyan-300 tracking-wide truncate">
                AgroSentinel
              </span>
              <span className="text-slate-600 select-none">|</span>
              <span className="truncate text-xs sm:text-sm font-semibold text-slate-200">{activeTab}</span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              {/* Notificaciones */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((current) => !current)}
                  aria-label="Ver notificaciones"
                  aria-expanded={notificationsOpen}
                  className="relative flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-[#1d3d52] hover:text-white active:bg-[#1d3d52]/80"
                >
                  <Bell size={18} />
                  {openReportsCount > 0 && (
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#0d2437]" />
                  )}
                </button>

                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 sm:hidden"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-xs rounded-xl border border-[#36556f] bg-[#13293a] p-4 shadow-2xl transition-all">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                          Reportes abiertos
                        </p>
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                        {openReportsCount == null
                          ? 'No fue posible consultar los reportes.'
                          : openReportsCount === 0
                          ? 'No hay reportes abiertos.'
                          : `${openReportsCount} reporte(s) de falla requiere(n) atención.`}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          setActiveTab('Reporte de Fallas');
                        }}
                        className="mt-3.5 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200 min-h-[36px]"
                      >
                        Ver reportes de fallas →
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Botón Cerrar Sesión */}
              <LogoutButton className="bg-[#102536] border border-[#294255] text-slate-200 hover:bg-[#1d3d52] hover:text-white" />

              {/* Perfil de Usuario */}
              <div className="hidden md:flex flex-col text-right leading-tight">
                <p className="max-w-[150px] lg:max-w-[180px] truncate text-xs font-medium text-white">
                  {userName}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">{roleLabel}</p>
              </div>

              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/60 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 text-xs font-bold text-white shadow-md"
                aria-label={userName}
                title={userName}
              >
                {initials(userName)}
              </div>
            </div>
          </header>

          {/* Navegación Móvil Selector */}
          <nav
            className="relative border-b border-[#1f3446] bg-[#0d1f2d] px-3 py-2.5 md:hidden z-30"
            aria-label="Navegación administrativa móvil"
          >
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-expanded={mobileNavOpen}
              aria-controls="admin-mobile-navigation"
              className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-[#294255] bg-[#102536] px-3.5 text-left text-xs font-semibold text-cyan-100 active:bg-[#143c50] transition-colors"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {(() => {
                  const ActiveIcon = navigation.find(({ label }) => label === activeTab)?.icon || LayoutDashboard;
                  return <ActiveIcon size={18} className="shrink-0 text-cyan-300" />;
                })()}
                <span className="truncate">{activeTab}</span>
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-cyan-300 transition-transform duration-200 ${
                  mobileNavOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown / Drawer Navegación Móvil */}
            {mobileNavOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
                  onClick={() => setMobileNavOpen(false)}
                />
                <div
                  id="admin-mobile-navigation"
                  className="absolute inset-x-3 top-full z-50 mt-2 grid max-h-[min(70vh,30rem)] grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-[#36556f] bg-[#102536] p-2.5 shadow-2xl"
                >
                  {navigation.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setActiveTab(label);
                        setMobileNavOpen(false);
                      }}
                      aria-current={activeTab === label ? 'page' : undefined}
                      className={`flex min-h-[44px] min-w-0 items-center gap-3 rounded-lg px-3 text-left text-xs font-medium transition-colors ${
                        activeTab === label
                          ? 'bg-[#143c50] text-cyan-200 font-semibold border border-cyan-500/30'
                          : 'text-slate-300 hover:bg-[#143c50]/60 hover:text-white active:bg-[#143c50]'
                      }`}
                    >
                      <Icon size={18} className="shrink-0 text-cyan-300" />
                      <span className="min-w-0 truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* Contenido Principal de las Pestañas */}
          <div className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            {content[activeTab]}
          </div>
        </main>
      </div>
    </div>
  );
}