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
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from 'lucide-react';
import BrandLogo from '../../components/BrandLogo';

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
    <div className="flex min-h-screen bg-[#070d19] font-sans text-white min-w-0">
      {/* Panel Izquierdo Ilustrativo (Escritorio) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[url('https://images.unsplash.com/photo-1586771107445-d3ca888129ff?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
        <div className="agro-brand-overlay absolute inset-0" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
          <div className="flex items-center gap-3 text-white">
            <BrandLogo className="h-14 w-14" />
            <span className="text-2xl font-bold tracking-wide">AgroSentinel</span>
          </div>

          <div className="space-y-4 max-w-lg">
            <span className="inline-block rounded-full bg-cyan-400/10 border border-cyan-400/20 px-4 py-1.5 text-sm font-semibold text-cyan-300">
              Transformación Digital Agrícola
            </span>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
              Únete a la <br />
              <span className="text-cyan-400">Plataforma Inteligente</span>
            </h1>
            <p className="text-slate-200 text-lg leading-relaxed">
              Registra a tu personal operativo, técnico y de almacén para digitalizar el mantenimiento y maximizar la productividad en campo.
            </p>
          </div>

          <div className="text-slate-400 text-xs font-medium tracking-wider">
            © 2026 AgroSentinel, Colombia S.A.
          </div>
        </div>
      </div>

      {/* Formulario de Registro */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-10 bg-[#070d19]">
        <div className="login-card my-4 w-full max-w-[640px] space-y-7 rounded-3xl p-6 sm:p-9 lg:p-10">
          {/* Logo Móvil */}
          <div className="flex items-center gap-2.5 lg:hidden mb-2">
            <BrandLogo className="h-12 w-12" />
            <span className="text-xl font-bold tracking-wide text-white">AgroSentinel</span>
          </div>

          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Crear nueva cuenta
            </h2>
            <p className="mt-2 text-base text-slate-400">
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

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label htmlFor="reg-nombre" className="mb-2 block text-sm font-semibold text-slate-200">
                Nombre Completo
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <User className="mr-3 h-5 w-5 shrink-0 text-[#38bdf8]" />
                <input
                  id="reg-nombre"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej. Juan Carlos Pérez"
                  className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="mb-2 block text-sm font-semibold text-slate-200">
                Correo electrónico
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Mail className="mr-3 h-5 w-5 shrink-0 text-[#38bdf8]" />
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="correo@agrosentinel.com"
                  className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="mb-2 block text-sm font-semibold text-slate-200">
                Contraseña
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Lock className="mr-3 h-5 w-5 shrink-0 text-[#38bdf8]" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent text-base text-white outline-none tracking-widest placeholder:text-slate-500 placeholder:tracking-normal"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-surface-hover hover:text-white"
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-rol" className="mb-2 block text-sm font-semibold text-slate-200">
                Rol en el sistema
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Briefcase className="mr-3 h-5 w-5 shrink-0 text-[#38bdf8]" />
                <select
                  id="reg-rol"
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className="w-full cursor-pointer bg-transparent text-base text-white outline-none"
                  required
                >
                  <option value="" disabled className="bg-[#0d172a] text-slate-300">
                    Seleccione un rol...
                  </option>
                  <option value="TECNICO" className="bg-[#0d172a] text-white">
                    Técnico de Mantenimiento
                  </option>
                  <option value="SUPERVISOR" className="bg-[#0d172a] text-white">
                    Supervisor
                  </option>
                  <option value="ALMACENISTA" className="bg-[#0d172a] text-white">
                    Almacenista
                  </option>
                  <option value="OPERATIVO_CAMPO" className="bg-[#0d172a] text-white">
                    Usuario Operativo de Campo
                  </option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit mt-2 flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl text-base font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="border-t border-white/10 pt-5 text-center text-sm text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-semibold text-sky-400 underline underline-offset-4 transition-colors hover:text-sky-300"
            >
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}