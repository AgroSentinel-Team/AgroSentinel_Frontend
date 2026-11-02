import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, EyeOff, Eye, ShieldCheck, LoaderCircle, Sprout, AlertCircle } from 'lucide-react';
import { API_ROOT } from '../../services/apiClient';
import { establishSession } from '../../services/sessionService';

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
    <div className="flex min-h-screen bg-[#0b1220] font-sans text-white min-w-0">
      {/* Panel Izquierdo Ilustrativo (Escritorio) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[url('https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
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
              Plataforma Agrícola Inteligente
            </span>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Gestión Integral de <br />
              <span className="text-cyan-400">Mantenimiento Agrícola</span>
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              Optimice la disponibilidad de tractores, cosechadoras, fumigadoras e irrigadores mediante mantenimiento preventivo y control en tiempo real.
            </p>
          </div>

          <div className="text-slate-400 text-xs font-medium tracking-wider">
            © 2026 AgroSentinel, Colombia S.A.
          </div>
        </div>
      </div>

      {/* Formulario de Login */}
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
              Ingresar al Sistema
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-cyan-300">
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <div className="flex items-center bg-[#182638] border border-slate-700 rounded-xl px-3.5 py-2.5 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/50 min-h-[44px]">
                <Mail className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@agrosentinel.com"
                  className="w-full bg-transparent text-white outline-none text-xs sm:text-sm placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="flex items-center bg-[#182638] border border-slate-700 rounded-xl px-3.5 py-2.5 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/50 min-h-[44px]">
                <Lock className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <label className="flex min-h-[44px] items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(event) => setRememberSession(event.target.checked)}
                className="h-4 w-4 rounded accent-cyan-500"
              />
              <span>Recordarme en este dispositivo para consultar datos guardados sin conexión</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[46px] bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-[#07101f] font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-cyan-950/50 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
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

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
            ¿No tienes cuenta?{' '}
            <Link
              to="/registro"
              className="font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
            >
              Regístrate aquí
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 text-slate-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Acceso seguro para personal autorizado</span>
          </div>
        </div>
      </div>
    </div>
  );
}