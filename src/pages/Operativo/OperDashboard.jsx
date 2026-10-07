import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileWarning,
  FileText,
  Tractor,
  AlertTriangle,
  Activity,
  CheckCircle2,
  RefreshCw,
  Wrench,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import Maquinaria from "./Maquinaria";
import MisReportes from "./MisReportes";
import MantenimientoPredictivo from "../Compartido/MantenimientoPredictivo";
import FailureReportModal from "../../components/FailureReportModal";
import { canReportFailure, getAssignedAssets, getFailureReports } from "../../services/assetService";
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
  const allowedToReport = canReportFailure();
  const userName = localStorage.getItem("nombre") || "";

  const contentMap = {
    "Mi Panel": <DashboardHome onReportFailure={() => setActiveTab("Reportar Falla")} onOpenReports={() => setActiveTab("Mis Reportes")} onOpenMachinery={() => setActiveTab("Maquinaria")} />,
    "Mis Reportes": <MisReportes />,
    Maquinaria: <Maquinaria />,
    Mantenimiento: <MantenimientoPredictivo assignedOnly />,
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
          {navigation.filter(({ label }) => label !== "Reportar Falla" || allowedToReport).map(({ label, icon: Icon }) => (
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
              <p className="text-[11px] font-semibold">{userName || "Operario"}</p>
              <p className="text-[8px] text-gray-400">OPERARIO DE MAQUINARIA</p>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600">
              👨🏻‍🌾
            </div>
          </div>
        </header>

        <section className="p-7">
          {contentMap[activeTab] || contentMap["Mi Panel"]}
          {activeTab === "Reportar Falla" && allowedToReport && <FailureReportModal onClose={() => setActiveTab("Mi Panel")} />}
        </section>
      </main>
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
        setReports(userReports.filter((report) => report.userId === user.id));
        setAssets(assignedAssets);
        setReportCountByMonth(buildMonthlyReportCounts(userReports.filter((report) => report.userId === user.id)));
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.response?.data?.detail || requestError.message || "No se pudo cargar la información del panel.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const openReports = reports.filter((report) => report.estado !== "RESUELTO").length;
  const machinesInRepair = assets.filter((asset) => asset.operationalStatus === "IN_REPAIR").length;
  const operationalMachines = assets.filter((asset) => asset.operationalStatus === "OPERATIONAL").length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Mi Panel</h1>
          <p className="mt-1 text-xs text-gray-400">Resumen de tu maquinaria asignada y los reportes que has realizado.</p>
        </div>
        <button type="button" title="Actualizar panel" aria-label="Actualizar panel" onClick={() => { setLoading(true); setError(""); setRefreshKey((key) => key + 1); }} className="rounded-md border border-white/10 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-300"><RefreshCw size={15} /></button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[11px] text-red-200">{error}</p>}
      {loading ? <p className="py-10 text-center text-[11px] text-slate-400">Cargando datos del operario...</p> : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Tractor} label="Maquinaria asignada" value={assets.length} tone="text-cyan-300" />
            <MetricCard icon={CheckCircle2} label="Operativa" value={operationalMachines} tone="text-emerald-300" />
            <MetricCard icon={Wrench} label="En reparación" value={machinesInRepair} tone="text-amber-300" />
            <MetricCard icon={AlertTriangle} label="Reportes pendientes" value={openReports} tone="text-orange-300" />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="space-y-5">
              <div className="rounded-xl border border-cyan-400/20 bg-[#102637] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300"><AlertTriangle size={18} /></span>
                  <div>
                    <h2 className="text-sm font-semibold text-white">¿Detectaste una falla?</h2>
                    <p className="mt-1 text-[11px] text-slate-400">Regístrala para que el equipo de mantenimiento pueda atenderla.</p>
                  </div>
                </div>
                <button type="button" onClick={onReportFailure} className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-[11px] font-semibold transition hover:bg-cyan-500">Reportar falla</button>
              </div>

              <section className="rounded-xl border border-white/10 bg-[#102637] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Historial reciente de reportes</h2>
                    <p className="mt-1 text-[10px] text-slate-400">Tus reportes registrados, con su estado actual.</p>
                  </div>
                  <button type="button" onClick={onOpenReports} className="text-[10px] font-medium text-cyan-300 hover:text-cyan-200">Ver todos</button>
                </div>
                {reports.length === 0 ? <p className="rounded-md border border-white/5 p-4 text-center text-[11px] text-slate-400">Aún no tienes reportes registrados.</p> : (
                  <div className="space-y-2">
                    {reports.slice(0, 4).map((report) => <ReportItem key={report.id} report={report} />)}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-xl border border-white/10 bg-[#102637] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Estado de mi maquinaria</h2>
                    <p className="mt-1 text-[10px] text-slate-400">Estado operativo de tus equipos asignados.</p>
                  </div>
                  <button type="button" onClick={onOpenMachinery} className="text-[10px] font-medium text-cyan-300 hover:text-cyan-200">Ver maquinaria</button>
                </div>
                {assets.length === 0 ? <p className="rounded-md border border-white/5 p-4 text-center text-[11px] text-slate-400">No hay maquinaria activa asignada a tu usuario.</p> : (
                  <div className="space-y-3">
                    {assets.slice(0, 5).map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-white">{asset.name}</p>
                          <p className="mt-1 truncate text-[10px] text-slate-400">{[asset.brand, asset.model].filter(Boolean).join(" ") || "Sin marca o modelo"}</p>
                        </div>
                        <StatusBadge status={asset.operationalStatus} />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-[#102637] p-5">
                <div className="mb-4 flex items-center gap-2"><Activity size={15} className="text-cyan-300" /><h2 className="text-sm font-semibold">Actividad de reportes</h2></div>
                <div className="flex h-28 items-end gap-2">
                  {reportCountByMonth.map(({ label, count }) => {
                    const max = Math.max(1, ...reportCountByMonth.map((item) => item.count));
                    return <div key={label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[9px] text-slate-400">{count}</span>
                      <div title={`${count} reportes`} className="w-full max-w-8 rounded-t bg-cyan-500/80" style={{ height: `${Math.max(count ? 12 : 4, count / max * 72)}%` }} />
                      <span className="text-[9px] text-slate-500">{label}</span>
                    </div>;
                  })}
                </div>
                <p className="mt-3 text-[9px] text-slate-500">Cantidad de reportes por mes · últimos 6 meses</p>
              </section>
            </div>
          </div>
        </>
      )}
    </>
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
        const reportDate = new Date(report.fechaReporte);
        return `${reportDate.getFullYear()}-${reportDate.getMonth()}` === key;
      }).length,
    };
  });
}

function MetricCard({ icon: Icon, label, value, tone }) {
  return <div className="rounded-xl border border-white/10 bg-[#102637] p-4">
    <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400">{label}</span><Icon size={16} className={tone} /></div>
    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
  </div>;
}

function ReportItem({ report }) {
  return <div className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-[#0b1d2a] p-3">
    <div className="min-w-0">
      <p className="truncate text-[11px] font-medium text-white">{report.assetName || "Activo"}</p>
      <p className="mt-1 truncate text-[10px] text-slate-400">{report.tipoFalla} · {formatDate(report.fechaReporte)}</p>
    </div>
    <StatusBadge status={report.estado} report />
  </div>;
}

function StatusBadge({ status, report = false }) {
  const labels = report
    ? { PENDIENTE: "Pendiente", EN_REVISION: "En revisión", RESUELTO: "Resuelto" }
    : { OPERATIONAL: "Operativa", OPERATIONAL_WITH_RESTRICTIONS: "Con restricciones", IN_REPAIR: "En reparación", OBSOLETE: "Fuera de servicio" };
  const tones = report
    ? { PENDIENTE: "bg-amber-400/10 text-amber-200", EN_REVISION: "bg-cyan-400/10 text-cyan-200", RESUELTO: "bg-emerald-400/10 text-emerald-200" }
    : { OPERATIONAL: "bg-emerald-400/10 text-emerald-200", OPERATIONAL_WITH_RESTRICTIONS: "bg-amber-400/10 text-amber-200", IN_REPAIR: "bg-orange-400/10 text-orange-200", OBSOLETE: "bg-slate-400/10 text-slate-300" };
  return <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${tones[status] || "bg-slate-400/10 text-slate-300"}`}>{labels[status] || status || "Sin estado"}</span>;
}

function formatDate(value) {
  if (!value) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}