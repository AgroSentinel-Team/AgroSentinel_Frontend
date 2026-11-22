import { useEffect, useState } from "react";
import {
  Home,
  ClipboardList,
  History,
  SlidersHorizontal,
  Activity,
  ClipboardCheck,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import MiPanel from "./MiPanel";
import OrdenesAsignadas from "./OrdenesAsignadas";
import Historial from "./Historial";
import InventarioRepuestos from "./InventarioRepuestos";
import MantenimientoPredictivo from "../Compartido/MantenimientoPredictivo";
import PreventiveMaintenance from "../Compartido/PreventiveMaintenance";
import { OPEN_PREVENTIVE_SCHEDULE_EVENT } from "../../services/preventiveMaintenanceNavigation";
import { getCurrentUser } from "../../services/technicianService";
import { isOfflineError } from "../../services/offlineApi";
import { subscribeToNetworkChanges } from "../../services/offlineNetwork";
import { downloadWorkPackage, downloadWorkPackageIfStale } from "../../services/workPackageService";
import { OFFLINE_SYNC_COMPLETED_EVENT } from "../../services/offlineSync";

const navigation = [
  { id: "Mi Panel", label: "Mi Panel", icon: Home },
  { id: "Órdenes Asignadas", label: "Órdenes Asignadas", icon: ClipboardList },
  { id: "Historial", label: "Historial", icon: History },
  { id: "Inventario Repuestos", label: "Inventario Repuestos", icon: SlidersHorizontal },
  { id: "Mantenimiento", label: "Mantenimiento", icon: Activity },
  { id: "Mantenimiento Preventivo", label: "Mantenimiento Preventivo", icon: ClipboardCheck },
];

export default function TechnicianPanel() {
  const [activeTab, setActiveTab] = useState("Mi Panel");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [predictivePrefill, setPredictivePrefill] = useState(null);
  const [technicianName, setTechnicianName] = useState(
    localStorage.getItem("nombre") || ""
  );
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setTechnicianName(user.nombre || user.email);
        localStorage.setItem("nombre", user.nombre || user.email);
        localStorage.setItem("roles", JSON.stringify(user.roles || []));
        localStorage.setItem(
          "rol",
          user.rol || localStorage.getItem("rol") || ""
        );
        setProfileError("");
      })
      .catch((error) => {
        // Sin conexión se usa el nombre guardado en el dispositivo: no es un error.
        if (isOfflineError(error)) return;
        setProfileError(
          error.response?.data?.message ||
            "No fue posible cargar el perfil autenticado."
        );
      });

    const openPreventiveSchedule = (event) => {
      setPredictivePrefill(event.detail);
      setActiveTab("Mantenimiento Preventivo");
    };

    window.addEventListener(
      OPEN_PREVENTIVE_SCHEDULE_EVENT,
      openPreventiveSchedule
    );
    return () =>
      window.removeEventListener(
        OPEN_PREVENTIVE_SCHEDULE_EVENT,
        openPreventiveSchedule
      );
  }, []);

  // Descarga automática del trabajo para offline: al entrar y cada vez que vuelve la red.
  useEffect(() => {
    let active = true;
    let unsubscribe;
    void downloadWorkPackageIfStale();
    void subscribeToNetworkChanges((connected) => {
      if (active && connected) void downloadWorkPackageIfStale();
    })
      .then((stop) => {
        if (active) unsubscribe = stop;
        else void stop();
      })
      .catch((error) => {
        console.error("No se pudo escuchar la conectividad:", error);
      });
    // Tras enviar trabajo hecho offline, se descarga de nuevo para ver el estado real del servidor.
    const handleSynced = (event) => {
      if (active && event.detail?.successful > 0) {
        downloadWorkPackage().catch((error) => {
          console.error("No se pudo actualizar la descarga tras sincronizar:", error);
        });
      }
    };
    globalThis.addEventListener(OFFLINE_SYNC_COMPLETED_EVENT, handleSynced);
    return () => {
      active = false;
      void unsubscribe?.();
      globalThis.removeEventListener(OFFLINE_SYNC_COMPLETED_EVENT, handleSynced);
    };
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const contentMap = {
    "Mi Panel": (
      <MiPanel onOpenOrders={() => handleTabChange("Órdenes Asignadas")} />
    ),
    "Órdenes Asignadas": (
      <OrdenesAsignadas
        onOpenPreventive={() => handleTabChange("Mantenimiento Preventivo")}
      />
    ),
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

  const userInitials =
    technicianName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "—";

  return (
    <AppShell
      navigation={navigation}
      activeTab={activeTab}
      onNavigate={handleTabChange}
      mobileOpen={mobileMenuOpen}
      onMobileOpenChange={setMobileMenuOpen}
      userName={technicianName || "Cargando perfil…"}
      userRole="Técnico"
      userInitials={userInitials}
      brandSubtitle="Módulo Técnico"
      contentClassName="px-4 pt-4 sm:px-7 sm:pt-7"
    >
      {profileError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-error/20 bg-error-soft p-3.5 text-xs text-error-text"
        >
          {profileError}
        </p>
      )}
      {contentMap[activeTab]}
    </AppShell>
  );
}