import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LogoutButton({ className = "" }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("roles");
    localStorage.removeItem("nombre");
    navigate("/login", { replace: true });
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
