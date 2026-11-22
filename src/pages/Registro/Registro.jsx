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
import ThemeToggle from '../../components/ThemeToggle';

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
    <div className="agro-auth-background flex min-h-dvh min-w-0 flex-col font-sans text-ink-900 lg:flex-row">
      <ThemeToggle className="fixed right-[calc(1rem+var(--agro-safe-right))] top-[calc(1rem+var(--agro-safe-top))] z-50" />
      {/* Panel Izquierdo Ilustrativo (Escritorio) */}
      <div className="agro-auth-panel relative hidden min-h-dvh overflow-hidden lg:flex lg:w-1/2">
        <div className="agro-brand-overlay absolute inset-0" />
        <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 text-white xl:p-12">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14" />
            <span className="font-display text-2xl font-bold tracking-wide">AgroSentinel</span>
          </div>

          <div className="space-y-4 max-w-lg">
            <span className="inline-block rounded-full border border-gold-300/40 bg-gold-100/10 px-4 py-1.5 text-sm font-semibold text-gold-300">
              Transformación Digital Agrícola
            </span>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-white xl:text-4xl">
              Únete a la <br />
              <span className="text-gold-300">Plataforma Inteligente</span>
            </h1>
            <p className="text-base leading-relaxed text-white/80 xl:text-lg">
              Registra a tu personal operativo, técnico y de almacén para digitalizar el mantenimiento y maximizar la productividad en campo.
            </p>
          </div>

          <div className="text-xs font-medium tracking-wider text-white/60">
            © 2026 AgroSentinel, Colombia S.A.
          </div>
        </div>
      </div>

      {/* Formulario de Registro */}
      <div className="flex min-h-dvh w-full flex-1 items-center justify-center px-4 py-[calc(1rem+var(--agro-safe-top))] pb-[calc(1rem+var(--agro-safe-bottom))] lg:w-1/2 lg:bg-sand-50 lg:px-8 lg:py-10">
        <div className="login-card my-auto w-full max-w-[640px] space-y-6 p-5 sm:space-y-7 sm:p-8 lg:p-10">
          {/* Logo Móvil */}
          <div className="mb-2 flex items-center gap-2.5 lg:hidden">
            <BrandLogo className="h-12 w-12" />
            <span className="font-display text-xl font-bold tracking-wide text-forest-900">AgroSentinel</span>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-[30px]">
              Crear nueva cuenta
            </h2>
            <p className="mt-2 text-[15px] text-ink-600">
              Completa los datos para registrar un usuario en el sistema
            </p>
          </div>

          {/* Mensajes de Alerta */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-error/20 bg-error-soft p-3.5 text-xs text-error-text"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-success/20 bg-success-soft p-3.5 text-xs text-forest-700"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1 leading-relaxed">{success}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="reg-nombre" className="mb-2 block text-[13px] font-semibold text-ink-600">
                Nombre Completo
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <User className="mr-3 h-5 w-5 shrink-0 text-forest-500" />
                <input
                  id="reg-nombre"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej. Juan Carlos Pérez"
                  className="w-full bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-600"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="mb-2 block text-[13px] font-semibold text-ink-600">
                Correo electrónico
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Mail className="mr-3 h-5 w-5 shrink-0 text-forest-500" />
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="correo@agrosentinel.com"
                  className="w-full bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-600"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="mb-2 block text-[13px] font-semibold text-ink-600">
                Contraseña
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Lock className="mr-3 h-5 w-5 shrink-0 text-forest-500" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent text-base tracking-widest text-ink-900 outline-none placeholder:tracking-normal placeholder:text-ink-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="rounded-lg p-2 text-ink-600 transition-colors hover:bg-sand-100 hover:text-forest-700"
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-rol" className="mb-2 block text-[13px] font-semibold text-ink-600">
                Rol en el sistema
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Briefcase className="mr-3 h-5 w-5 shrink-0 text-forest-500" />
                <select
                  id="reg-rol"
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className="w-full cursor-pointer bg-transparent text-base text-ink-900 outline-none"
                  required
                >
                  <option value="" disabled className="bg-sand-50 text-ink-600">
                    Seleccione un rol...
                  </option>
                  <option value="TECNICO" className="bg-sand-50 text-ink-900">
                    Técnico de Mantenimiento
                  </option>
                  <option value="SUPERVISOR" className="bg-sand-50 text-ink-900">
                    Supervisor
                  </option>
                  <option value="ALMACENISTA" className="bg-sand-50 text-ink-900">
                    Almacenista
                  </option>
                  <option value="OPERATIVO_CAMPO" className="bg-sand-50 text-ink-900">
                    Usuario Operativo de Campo
                  </option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit mt-2 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-bold tracking-wide transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="border-t border-sand-200 pt-5 text-center text-sm text-ink-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-semibold text-forest-700 underline underline-offset-4 transition-colors hover:text-forest-900"
            >
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}