import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../services/sessionService";

export default function LogoutButton({ className = "" }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await clearSession();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("No se pudo borrar la sesion local:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/50 active:scale-[0.98] ${className}`}
    >
      <LogOut size={16} strokeWidth={2} className="shrink-0" />
      <span className="whitespace-nowrap">Cerrar sesión</span>
    </button>
  );
}
