import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_ROOT } from '../../services/apiClient';
import {
  User,
  Mail,
  Lock,
  EyeOff,
  Eye,
  Briefcase,
  Sprout,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from 'lucide-react';

export default function Registro() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.rol) {
      setError('Por favor, selecciona un rol válido.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(`${API_ROOT}/auth/registro`, formData);
      setSuccess('Usuario creado correctamente. Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(
        typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message || 'Error de conexión con el servidor.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b1220] font-sans text-white min-w-0">
      {/* Panel Izquierdo Ilustrativo (Escritorio) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[url('https://images.unsplash.com/photo-1586771107445-d3ca888129ff?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0e1729]/85 to-[#0e1729]/70" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-cyan-500 p-2 rounded-xl shadow-lg shadow-cyan-950/50 flex items-center justify-center">
              <Sprout size={24} className="text-[#07101f]" />
            </div>
            <span className="text-2xl font-bold tracking-wide">AgroSentinel</span>
          </div>

          <div className="space-y-4 max-w-lg">
            <span className="inline-block rounded-full bg-cyan-400/10 border border-cyan-400/20 px-3.5 py-1 text-xs font-semibold text-cyan-300">
              Transformación Digital Agrícola
            </span>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Únete a la <br />
              <span className="text-cyan-400">Plataforma Inteligente</span>
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              Registra a tu personal operativo, técnico y de almacén para digitalizar el mantenimiento y maximizar la productividad en campo.
            </p>
          </div>

          <div className="text-slate-400 text-xs font-medium tracking-wider">
            © 2026 AgroSentinel, Colombia S.A.
          </div>
        </div>
      </div>

      {/* Formulario de Registro */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[#0b1220]">
        <div className="w-full max-w-md space-y-6">
          {/* Logo Móvil */}
          <div className="flex items-center gap-2.5 lg:hidden mb-2">
            <div className="bg-cyan-500 p-2 rounded-xl flex items-center justify-center">
              <Sprout size={20} className="text-[#07101f]" />
            </div>
            <span className="text-xl font-bold tracking-wide text-white">AgroSentinel</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Crear nueva cuenta
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-cyan-300">
              Completa los datos para registrar un usuario en el sistema
            </p>
          </div>

          {/* Mensajes de Alerta */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
            >
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <span className="min-w-0 flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200"
            >
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <span className="min-w-0 flex-1 leading-relaxed">{success}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="reg-nombre" className="block text-xs font-medium text-slate-300 mb-1.5">
                Nombre Completo
              </label>
              <div className="flex items-center bg-[#182638] border border-slate-700 rounded-xl px-3.5 py-2.5 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/50 min-h-[44px]">
                <User className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <input
                  id="reg-nombre"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej. Juan Carlos Pérez"
                  className="w-full bg-transparent text-white outline-none text-xs sm:text-sm placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <div className="flex items-center bg-[#182638] border border-slate-700 rounded-xl px-3.5 py-2.5 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/50 min-h-[44px]">
                <Mail className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="correo@agrosentinel.com"
                  className="w-full bg-transparent text-white outline-none text-xs sm:text-sm placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="flex items-center bg-[#182638] border border-slate-700 rounded-xl px-3.5 py-2.5 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/50 min-h-[44px]">
                <Lock className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent text-white outline-none text-xs sm:text-sm tracking-widest placeholder:text-slate-500 placeholder:tracking-normal"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-rol" className="block text-xs font-medium text-slate-300 mb-1.5">
                Rol en el sistema
              </label>
              <div className="flex items-center bg-[#182638] border border-slate-700 rounded-xl px-3.5 py-2.5 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/50 min-h-[44px]">
                <Briefcase className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <select
                  id="reg-rol"
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className="w-full bg-transparent text-white outline-none text-xs sm:text-sm cursor-pointer"
                  required
                >
                  <option value="" disabled className="bg-[#102637] text-slate-300">
                    Seleccione un rol...
                  </option>
                  <option value="TECNICO" className="bg-[#102637] text-white">
                    Técnico de Mantenimiento
                  </option>
                  <option value="SUPERVISOR" className="bg-[#102637] text-white">
                    Supervisor
                  </option>
                  <option value="ALMACENISTA" className="bg-[#102637] text-white">
                    Almacenista
                  </option>
                  <option value="OPERATIVO_CAMPO" className="bg-[#102637] text-white">
                    Usuario Operativo de Campo
                  </option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[46px] bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-[#07101f] font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-cyan-950/50 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <>
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Registrar usuario</span>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
            >
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}