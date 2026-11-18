import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, EyeOff, Eye, ShieldCheck, LoaderCircle, AlertCircle } from 'lucide-react';
import { API_ROOT } from '../../services/apiClient';
import { establishSession } from '../../services/sessionService';
import BrandLogo from '../../components/BrandLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberSession, setRememberSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_ROOT}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const responseBody = await response.text();
      let responseData;
      try {
        responseData = responseBody ? JSON.parse(responseBody) : {};
      } catch {
        responseData = responseBody;
      }

      if (!response.ok) {
        throw new Error(
          typeof responseData === 'string'
            ? responseData
            : responseData.message || 'Credenciales incorrectas o error de servidor.',
        );
      }

      const { token, rol, nombre, roles = [] } = responseData;
      if (typeof token !== 'string' || token.split('.').length !== 3) {
        throw new Error('El servidor no devolvió un JWT válido. Reinicia el backend e inténtalo de nuevo.');
      }

      await establishSession({
        token,
        email: email.trim().toLowerCase(),
        role: rol,
        name: nombre || '',
        roles,
      }, rememberSession);

      const effectiveRoles = new Set(
        [...roles, rol].map((item) => (item ?? '').toUpperCase().replace(/^ROLE_/, '')),
      );

      if (effectiveRoles.has('TECNICO')) {
        navigate('/tecnico/dashboard');
      } else {
        switch (rol) {
          case 'ADMIN':
          case 'ADMINISTRADOR':
            navigate('/admin/dashboard');
            break;
          case 'SUPERVISOR':
            navigate('/supervisor/dashboard');
            break;
          case 'TECNICO':
            navigate('/tecnico/dashboard');
            break;
          case 'ALMACENISTA':
            navigate('/almacen/dashboard');
            break;
          case 'OPERARIO_CAMPO':
          case 'OPERATIVO_CAMPO':
            navigate('/operativo/dashboard');
            break;
          default:
            setError('Rol no autorizado.');
        }
      }
    } catch (err) {
      const message =
        typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message || err.message || 'Credenciales incorrectas o error de servidor.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#070d19] font-sans text-white min-w-0">
      {/* Panel Izquierdo Ilustrativo (Escritorio) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[url('https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
        <div className="agro-brand-overlay absolute inset-0" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
          <div className="flex items-center gap-3 text-white">
            <BrandLogo className="h-14 w-14" />
            <span className="text-2xl font-bold tracking-wide">AgroSentinel</span>
          </div>

          <div className="space-y-4 max-w-lg">
            <span className="inline-block rounded-full bg-cyan-400/10 border border-cyan-400/20 px-4 py-1.5 text-sm font-semibold text-cyan-300">
              Plataforma Agrícola Inteligente
            </span>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
              Gestión Integral de <br />
              <span className="text-cyan-400">Mantenimiento Agrícola</span>
            </h1>
            <p className="text-slate-200 text-lg leading-relaxed">
              Optimice la disponibilidad de tractores, cosechadoras, fumigadoras e irrigadores mediante mantenimiento preventivo y control en tiempo real.
            </p>
          </div>

          <div className="text-slate-400 text-xs font-medium tracking-wider">
            © 2026 AgroSentinel, Colombia S.A.
          </div>
        </div>
      </div>

      {/* Formulario de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-10 bg-[#070d19]">
        <div className="login-card my-4 w-full max-w-[600px] space-y-8 rounded-3xl p-6 sm:p-9 lg:p-10">
          {/* Logo Móvil */}
          <div className="flex items-center gap-2.5 lg:hidden mb-2">
            <BrandLogo className="h-12 w-12" />
            <span className="text-xl font-bold tracking-wide text-white">AgroSentinel</span>
          </div>

          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ingresar al Sistema
            </h2>
            <p className="mt-2 text-base text-slate-400">
              Digite sus credenciales para acceder a la plataforma
            </p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
            >
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <span className="min-w-0 flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Correo electrónico
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Mail className="mr-3 h-5 w-5 shrink-0 text-[#38bdf8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@agrosentinel.com"
                  className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Contraseña
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Lock className="mr-3 h-5 w-5 shrink-0 text-[#38bdf8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(event) => setRememberSession(event.target.checked)}
                className="h-5 w-5 rounded accent-blue-500"
              />
              <span>Recordarme en este dispositivo para consultar datos guardados sin conexión</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="login-submit mt-2 flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl text-base font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Iniciar sesión</span>
              )}
            </button>
          </form>

          <div className="border-t border-white/10 pt-5 text-center text-sm text-slate-400">
            ¿No tienes cuenta?{' '}
            <Link
              to="/registro"
              className="font-semibold text-sky-400 underline underline-offset-4 transition-colors hover:text-sky-300"
            >
              Regístrate aquí
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span>Acceso seguro para personal autorizado</span>
          </div>
        </div>
      </div>
    </div>
  );
}