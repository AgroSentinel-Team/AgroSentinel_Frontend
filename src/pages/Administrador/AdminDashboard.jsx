import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  ClipboardCheck,
  FileWarning,
  LayoutDashboard,
  Package,
  Tractor,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import AppShell from '../../components/AppShell';
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
    <AppShell
      navigation={navigation}
      activeTab={activeTab}
      onNavigate={setActiveTab}
      mobileOpen={mobileNavOpen}
      onMobileOpenChange={setMobileNavOpen}
      userName={userName}
      userRole={roleLabel}
      headerActions={
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            aria-label="Ver reportes abiertos"
            aria-expanded={notificationsOpen}
            className="relative inline-flex size-11 items-center justify-center rounded-xl border border-sand-200 bg-surface text-forest-700 transition-all duration-200 hover:bg-sand-100"
          >
            <Bell size={18} />
            {openReportsCount > 0 && (
              <span className="absolute right-2 top-2 size-2.5 rounded-full bg-gold-500 ring-2 ring-surface" />
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-surface/40 bg-surface/90 p-4 text-ink-900 shadow-[var(--agro-shadow-card)] backdrop-blur-xl max-sm:fixed max-sm:bottom-auto max-sm:right-[calc(0.75rem+var(--agro-safe-right))] max-sm:top-[calc(6rem+var(--agro-safe-top))]">
              <div className="flex items-center justify-between border-b border-sand-200 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-forest-900">
                  Reportes abiertos
                </p>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  aria-label="Cerrar reportes abiertos"
                  className="inline-flex size-10 items-center justify-center rounded-xl text-ink-600 hover:bg-sand-100 hover:text-ink-900"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-ink-600">
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
                className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900"
              >
                Ver reportes de fallas →
              </button>
            </div>
          )}
        </div>
      }
      contentClassName="px-3 pt-3 sm:px-4 md:px-6"
    >
      {content[activeTab]}
    </AppShell>
  );
}