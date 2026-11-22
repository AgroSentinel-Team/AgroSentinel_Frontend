import { useState } from "react";
import { AlertTriangle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../services/sessionService";
import { isNetworkAvailable } from "../services/offlineNetwork";
import { getQueueSummary } from "../services/offlineSync";
import { Button, Modal } from "./ui";

export default function LogoutButton({ className = "" }) {
  const navigate = useNavigate();
  const [warning, setWarning] = useState(null);
  const [checking, setChecking] = useState(false);

  const logout = async () => {
    try {
      await clearSession();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("No se pudo borrar la sesion local:", error);
    }
  };

  const handleLogout = async () => {
    setChecking(true);
    try {
      const [online, summary] = await Promise.all([
        isNetworkAvailable(),
        getQueueSummary().catch(() => ({ pending: 0, conflicts: 0 })),
      ]);
      const pending = summary.pending + summary.conflicts;
      if (online && pending === 0) {
        await logout();
        return;
      }
      setWarning({ online, pending });
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={checking}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-forest-700 transition-all duration-200 ease-out hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 active:scale-[0.98] disabled:opacity-60 sm:text-sm ${className}`}
      >
        <LogOut size={16} strokeWidth={2} className="shrink-0" />
        <span className="whitespace-nowrap">Cerrar sesión</span>
      </button>

      <Modal
        isOpen={Boolean(warning)}
        onClose={() => setWarning(null)}
        title="¿Cerrar sesión?"
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setWarning(null)}>
              Seguir trabajando
            </Button>
            <Button variant="danger" leftIcon={<LogOut size={16} />} onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        }
      >
        <div className="flex gap-3 text-sm text-ink-600">
          <AlertTriangle aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-gold-600" />
          <div className="space-y-2">
            {warning?.pending > 0 && (
              <p>
                Tienes <strong className="text-ink-900">{warning.pending} operación(es) sin sincronizar</strong>.
                Se conservan en este dispositivo y se enviarán cuando vuelvas a iniciar sesión con esta misma cuenta.
              </p>
            )}
            {!warning?.online && (
              <p>
                <strong className="text-ink-900">No hay conexión.</strong> Si cierras sesión no podrás volver a
                entrar hasta tener internet.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
