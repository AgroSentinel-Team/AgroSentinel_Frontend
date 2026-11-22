import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileWarning,
  LayoutDashboard,
  RefreshCw,
  Tractor,
  Wrench,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
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
    <AppShell
      navigation={navigation.filter(
        ({ label }) => label !== "Reportar Falla" || allowedToReport,
      )}
      activeTab={activeTab}
      onNavigate={handleNavClick}
      mobileOpen={mobileMenuOpen}
      onMobileOpenChange={setMobileMenuOpen}
      userName={userName || "Operario"}
      userRole="Operario de maquinaria"
      sidebarFooter={<>AgroSentinel Operativo &copy; 2026</>}
      contentClassName="px-4 pt-4 sm:px-7 sm:pt-7"
    >
      {contentMap[activeTab] || contentMap["Mi Panel"]}
      {activeTab === "Reportar Falla" && allowedToReport && (
        <FailureReportModal onClose={() => setActiveTab("Mi Panel")} />
      )}
    </AppShell>
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
    <div className="space-y-6 text-ink-900 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-sand-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mi Panel</h1>
          <p className="mt-0.5 text-xs text-ink-600">
            Resumen de tu maquinaria asignada y estado de tus reportes de falla.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-sand-200 bg-sand-50 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-sand-100 transition-all duration-200 ease-out self-start sm:self-center"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-ocean-700" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-error/30 bg-error-soft p-3.5 text-xs text-error-text"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-error-text hover:text-ink-900 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-ink-600">
          <RefreshCw className="mx-auto mb-2 animate-spin text-ocean-700" size={24} />
          <span>Cargando datos del operario...</span>
        </div>
      ) : (
        <>
          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3.5 xl:grid-cols-4">
            <MetricCard
              icon={Tractor}
              label="Maquinaria asignada"
              value={assets.length}
              tone="text-ocean-700"
            />
            <MetricCard
              icon={CheckCircle2}
              label="Operativa"
              value={operationalMachines}
              tone="text-forest-700"
            />
            <MetricCard
              icon={Wrench}
              label="En reparación"
              value={machinesInRepair}
              tone="text-forest-900"
            />
            <MetricCard
              icon={AlertTriangle}
              label="Reportes pendientes"
              value={openReports}
              tone="text-forest-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-5">
            {/* Columna Izquierda */}
            <div className="space-y-5">
              {/* Callout Reportar Falla */}
              <div className="rounded-xl border border-ocean-300/30 bg-sand-50 p-5 shadow-xl space-y-4">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-ocean-700 border border-ocean-300/30">
                    <AlertTriangle size={20} />
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-ink-900">
                      ¿Detectaste una falla en tu equipo?
                    </h2>
                    <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                      Regístrala de inmediato para que el equipo de mantenimiento y supervisión pueda gestionarla.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onReportFailure}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-5 text-xs font-bold uppercase tracking-wider text-pine-900 shadow-lg shadow-gold-600/20 transition-all duration-200 ease-out hover:brightness-105"
                >
                  Reportar falla ahora
                </button>
              </div>

              {/* Historial Reciente de Reportes */}
              <section className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-sand-200 pb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-ink-900">
                      Historial reciente de reportes
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-600">
                      Tus reportes registrados y su estado actual.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenReports}
                    className="inline-flex min-h-[36px] items-center text-xs font-semibold text-ocean-700 hover:text-ocean-700 transition-all duration-200 ease-out"
                  >
                    Ver todos
                  </button>
                </div>

                {reports.length === 0 ? (
                  <p className="py-8 text-center text-xs text-ink-600 border border-sand-200 rounded-lg">
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
              <section className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-sand-200 pb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-ink-900">
                      Estado de mi maquinaria
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-600">
                      Condición operativa de tus equipos asignados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenMachinery}
                    className="inline-flex min-h-[36px] items-center text-xs font-semibold text-ocean-700 hover:text-ocean-700 transition-all duration-200 ease-out"
                  >
                    Ver detalle
                  </button>
                </div>

                {assets.length === 0 ? (
                  <p className="py-8 text-center text-xs text-ink-600 border border-sand-200 rounded-lg">
                    No hay maquinaria activa asignada a tu usuario.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {assets.slice(0, 5).map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between gap-3 border-b border-sand-200 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink-900">
                            {asset.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-ink-600">
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
              <section className="rounded-xl border border-sand-200 bg-sand-50 p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-sand-200 pb-3">
                  <Activity size={18} className="text-ocean-700 shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-ink-900">
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
                        <span className="text-[10px] font-bold text-ink-600">
                          {count}
                        </span>
                        <div
                          title={`${count} reportes en ${label}`}
                          className="w-full max-w-[32px] rounded-t-md bg-ocean-500/80 hover:bg-ocean-500 transition-all duration-200 ease-out"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[10px] font-semibold text-ink-600 capitalize">
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
    <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 shadow-lg min-w-0">
      <div className="flex items-center justify-between text-ink-600">
        <span className="text-xs font-semibold uppercase tracking-wider truncate">{label}</span>
        <Icon size={18} className={`${tone} shrink-0 ml-1`} />
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">{value}</p>
    </div>
  );
}

function ReportItem({ report }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-sand-200 bg-sand-50 p-3 shadow-md">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-ink-900">
          {report.assetName || "Activo"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-ink-600">
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
        PENDIENTE: "border-gold-600/30 bg-warning-soft text-forest-900",
        EN_REVISION: "border-ocean-300/30 bg-info-soft text-ocean-700",
        RESUELTO: "border-forest-300/30 bg-success-soft text-forest-700",
      }
    : {
        OPERATIONAL: "border-forest-300/30 bg-success-soft text-forest-700",
        OPERATIONAL_WITH_RESTRICTIONS: "border-gold-600/30 bg-warning-soft text-forest-900",
        IN_REPAIR: "border-gold-600/30 bg-warning-soft text-forest-900",
        OBSOLETE: "border-sand-200/30 bg-sand-50/15 text-ink-600",
      };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
        tones[status] || "border-sand-200/30 bg-sand-50/15 text-ink-600"
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