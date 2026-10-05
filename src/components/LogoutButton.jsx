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
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[8px] font-semibold transition-colors ${className}`}
    >
      <LogOut size={12} strokeWidth={2.2} />
      <span>Cerrar sesión</span>
    </button>
  );
}
