import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileWarning,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Tractor,
  User,
  Wrench,
  X,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import Maquinaria from "./Maquinaria";
import MisReportes from "./MisReportes";
import MantenimientoPredictivo from "../Compartido/MantenimientoPredictivo";
import FailureReportModal from "../../components/FailureReportModal";
import {
  canReportFailure,
  getAssignedAssets,
  getFailureReports,
} from "../../services/assetService";
import { getCurrentUser } from "../../services/technicianService";

const navigation = [
  { label: "Mi Panel", icon: LayoutDashboard },
  { label: "Reportar Falla", icon: FileWarning },
  { label: "Mis Reportes", icon: FileText },
  { label: "Maquinaria", icon: Tractor },
  { label: "Mantenimiento", icon: Activity },
];

export default function OperDashboard() {
  const [activeTab, setActiveTab] = useState("Mi Panel");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const allowedToReport = canReportFailure();
  const userName = localStorage.getItem("nombre") || "";

  const contentMap = {
    "Mi Panel": (
      <DashboardHome
        onReportFailure={() => setActiveTab("Reportar Falla")}
        onOpenReports={() => setActiveTab("Mis Reportes")}
        onOpenMachinery={() => setActiveTab("Maquinaria")}
      />
    ),
    "Mis Reportes": <MisReportes />,
    Maquinaria: <Maquinaria />,
    Mantenimiento: <MantenimientoPredictivo assignedOnly />,
  };

  const handleNavClick = (label) => {
    setActiveTab(label);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#020d16] font-sans text-white min-w-0">
      {/* Overlay Móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navegación */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[#1f3446] bg-[#0d1f2d] transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[70px] items-center justify-between border-b border-[#1f3446] px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 shadow-md shadow-cyan-950/40 text-[#020d16]">
              <Tractor size={18} />
            </div>
            <span className="text-base font-bold text-cyan-400 tracking-wide">
              AgroSentinel
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
            className="text-slate-400 hover:text-white lg:hidden p-1"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navigation
            .filter(({ label }) => label !== "Reportar Falla" || allowedToReport)
            .map(({ label, icon: Icon }) => {
              const isActive = activeTab === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleNavClick(label)}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-cyan-300" : "text-slate-400"} />
                  <span>{label}</span>
                </button>
              );
            })}
        </nav>

        <div className="border-t border-[#1f3446] p-4 text-[11px] text-slate-400 text-center">
          AgroSentinel Operativo &copy; 2026
        </div>
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
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#102a3d] text-slate-200 hover:bg-white/10 lg:hidden"
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

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white truncate max-w-[150px]">
                {userName || "Operario"}
              </p>
              <p className="text-[10px] font-semibold text-cyan-300 tracking-wider">
                OPERARIO DE MAQUINARIA
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <User size={18} />
            </div>

            <LogoutButton className="text-slate-300 hover:bg-white/10 hover:text-white" />
          </div>
        </header>

        {/* Contenido Dinámico */}
        <main className="flex-1 p-4 sm:p-7 min-w-0">
          {contentMap[activeTab] || contentMap["Mi Panel"]}
          {activeTab === "Reportar Falla" && allowedToReport && (
            <FailureReportModal onClose={() => setActiveTab("Mi Panel")} />
          )}
        </main>
      </div>
    </div>
  );
}

function DashboardHome({ onReportFailure, onOpenReports, onOpenMachinery }) {
  const [reports, setReports] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [reportCountByMonth, setReportCountByMonth] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCurrentUser(), getFailureReports(), getAssignedAssets()])
      .then(([user, userReports, assignedAssets]) => {
        if (cancelled) return;
        const myReports = userReports.filter((report) => report.userId === user.id);
        setReports(myReports);
        setAssets(assignedAssets);
        setReportCountByMonth(buildMonthlyReportCounts(myReports));
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError.response?.data?.detail ||
              requestError.message ||
              "No se pudo cargar la información del panel.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const openReports = reports.filter((report) => report.estado !== "RESUELTO").length;
  const machinesInRepair = assets.filter(
    (asset) => asset.operationalStatus === "IN_REPAIR",
  ).length;
  const operationalMachines = assets.filter(
    (asset) => asset.operationalStatus === "OPERATIONAL",
  ).length;

  const handleRefresh = () => {
    setLoading(true);
    setError("");
    setRefreshKey((key) => key + 1);
  };

  return (
    <div className="space-y-6 text-white min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mi Panel</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Resumen de tu maquinaria asignada y estado de tus reportes de falla.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#102a3d] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors self-start sm:self-center"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-cyan-400" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-300 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <RefreshCw className="mx-auto mb-2 animate-spin text-cyan-400" size={24} />
          <span>Cargando datos del operario...</span>
        </div>
      ) : (
        <>
          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3.5 xl:grid-cols-4">
            <MetricCard
              icon={Tractor}
              label="Maquinaria asignada"
              value={assets.length}
              tone="text-cyan-300"
            />
            <MetricCard
              icon={CheckCircle2}
              label="Operativa"
              value={operationalMachines}
              tone="text-emerald-300"
            />
            <MetricCard
              icon={Wrench}
              label="En reparación"
              value={machinesInRepair}
              tone="text-amber-300"
            />
            <MetricCard
              icon={AlertTriangle}
              label="Reportes pendientes"
              value={openReports}
              tone="text-orange-300"
            />
          </div>

          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 sm:gap-5">
            {/* Columna Izquierda */}
            <div className="space-y-5">
              {/* Callout Reportar Falla */}
              <div className="rounded-xl border border-cyan-400/30 bg-[#102637] p-5 shadow-xl space-y-4">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    <AlertTriangle size={20} />
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      ¿Detectaste una falla en tu equipo?
                    </h2>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                      Regístrala de inmediato para que el equipo de mantenimiento y supervisión pueda gestionarla.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onReportFailure}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cyan-600 px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-950/40"
                >
                  Reportar falla ahora
                </button>
              </div>

              {/* Historial Reciente de Reportes */}
              <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      Historial reciente de reportes
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Tus reportes registrados y su estado actual.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenReports}
                    className="inline-flex min-h-[36px] items-center text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    Ver todos
                  </button>
                </div>

                {reports.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400 border border-white/5 rounded-lg">
                    Aún no tienes reportes registrados.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {reports.slice(0, 4).map((report) => (
                      <ReportItem key={report.id} report={report} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-5">
              {/* Estado de Maquinaria */}
              <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      Estado de mi maquinaria
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Condición operativa de tus equipos asignados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenMachinery}
                    className="inline-flex min-h-[36px] items-center text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    Ver detalle
                  </button>
                </div>

                {assets.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400 border border-white/5 rounded-lg">
                    No hay maquinaria activa asignada a tu usuario.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {assets.slice(0, 5).map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {asset.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {[asset.brand, asset.model].filter(Boolean).join(" ") ||
                              "Sin marca/modelo"}
                          </p>
                        </div>
                        <StatusBadge status={asset.operationalStatus} />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Gráfico de Actividad Mensual */}
              <section className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Activity size={18} className="text-cyan-300 shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    Actividad de reportes (Últimos 6 meses)
                  </h2>
                </div>

                <div className="flex h-32 min-w-0 items-end gap-1 px-1 pt-4 min-[400px]:gap-2 min-[400px]:px-2">
                  {reportCountByMonth.map(({ label, count }) => {
                    const max = Math.max(
                      1,
                      ...reportCountByMonth.map((item) => item.count),
                    );
                    const heightPercent =
                      max > 0 ? Math.max(count ? 15 : 6, Math.round((count / max) * 100)) : 6;

                    return (
                      <div
                        key={label}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                      >
                        <span className="text-[10px] font-bold text-slate-300">
                          {count}
                        </span>
                        <div
                          title={`${count} reportes en ${label}`}
                          className="w-full max-w-[32px] rounded-t-md bg-cyan-500/80 hover:bg-cyan-400 transition-colors"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[10px] font-semibold text-slate-400 capitalize">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function buildMonthlyReportCounts(reports) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    return {
      label: new Intl.DateTimeFormat("es-CO", { month: "short" }).format(date),
      count: reports.filter((report) => {
        if (!report.fechaReporte) return false;
        const reportDate = new Date(report.fechaReporte);
        return `${reportDate.getFullYear()}-${reportDate.getMonth()}` === key;
      }).length,
    };
  });
}

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 shadow-lg min-w-0">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs font-semibold uppercase tracking-wider truncate">{label}</span>
        <Icon size={18} className={`${tone} shrink-0 ml-1`} />
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}

function ReportItem({ report }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#0d2030] p-3 shadow-md">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-white">
          {report.assetName || "Activo"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">
          {report.tipoFalla} · {formatDate(report.fechaReporte)}
        </p>
      </div>
      <StatusBadge status={report.estado} report />
    </div>
  );
}

function StatusBadge({ status, report = false }) {
  const labels = report
    ? { PENDIENTE: "Pendiente", EN_REVISION: "En revisión", RESUELTO: "Resuelto" }
    : {
        OPERATIONAL: "Operativa",
        OPERATIONAL_WITH_RESTRICTIONS: "Con restricciones",
        IN_REPAIR: "En reparación",
        OBSOLETE: "Fuera de servicio",
      };

  const tones = report
    ? {
        PENDIENTE: "border-amber-400/30 bg-amber-500/15 text-amber-300",
        EN_REVISION: "border-cyan-400/30 bg-cyan-500/15 text-cyan-300",
        RESUELTO: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
      }
    : {
        OPERATIONAL: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
        OPERATIONAL_WITH_RESTRICTIONS: "border-amber-400/30 bg-amber-500/15 text-amber-300",
        IN_REPAIR: "border-orange-400/30 bg-orange-500/15 text-orange-300",
        OBSOLETE: "border-slate-400/30 bg-slate-500/15 text-slate-300",
      };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
        tones[status] || "border-slate-500/30 bg-slate-500/15 text-slate-300"
      }`}
    >
      {labels[status] || status || "Sin estado"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}