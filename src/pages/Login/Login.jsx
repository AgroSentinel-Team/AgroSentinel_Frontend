import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, EyeOff, Eye, ShieldCheck, LoaderCircle, AlertCircle } from 'lucide-react';
import { API_ROOT } from '../../services/apiClient';
import { establishSession } from '../../services/sessionService';
import { isNetworkAvailable } from '../../services/offlineNetwork';
import BrandLogo from '../../components/BrandLogo';
import ThemeToggle from '../../components/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberSession, setRememberSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const offlineLoginMessage =
      'Sin conexión. Para iniciar sesión necesitas internet una vez; si marcas "Mantener sesión iniciada", después podrás abrir la app y trabajar sin conexión.';

    try {
      if (!(await isNetworkAvailable())) {
        throw new Error(offlineLoginMessage);
      }
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

      const { token, rol, nombre, roles = [], refreshToken, refreshTokenExpiresAt } = responseData;
      if (typeof token !== 'string' || token.split('.').length !== 3) {
        throw new Error('El servidor no devolvió un JWT válido. Reinicia el backend e inténtalo de nuevo.');
      }

      await establishSession({
        token,
        email: email.trim().toLowerCase(),
        role: rol,
        name: nombre || '',
        roles,
        refreshToken,
        refreshTokenExpiresAt,
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
      const message = err instanceof TypeError
        ? offlineLoginMessage
        : typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message || err.message || 'Credenciales incorrectas o error de servidor.';
      setError(message);
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
              Plataforma Agrícola Inteligente
            </span>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-white xl:text-4xl">
              Gestión Integral de <br />
              <span className="text-gold-300">Mantenimiento Agrícola</span>
            </h1>
            <p className="text-base leading-relaxed text-white/80 xl:text-lg">
              Optimice la disponibilidad de tractores, cosechadoras, fumigadoras e irrigadores mediante mantenimiento preventivo y control en tiempo real.
            </p>
          </div>

          <div className="text-xs font-medium tracking-wider text-white/60">
            © 2026 AgroSentinel, Colombia S.A.
          </div>
        </div>
      </div>

      {/* Formulario de Login */}
      <div className="flex min-h-dvh w-full flex-1 items-center justify-center px-4 py-[calc(1rem+var(--agro-safe-top))] pb-[calc(1rem+var(--agro-safe-bottom))] lg:w-1/2 lg:bg-sand-50 lg:px-8 lg:py-10">
        <div className="login-card my-auto w-full max-w-[600px] space-y-7 p-5 sm:space-y-8 sm:p-8 lg:p-10">
          {/* Logo Móvil */}
          <div className="mb-2 flex items-center gap-2.5 lg:hidden">
            <BrandLogo className="h-12 w-12" />
            <span className="font-display text-xl font-bold tracking-wide text-forest-900">AgroSentinel</span>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-[30px]">
              Ingresar al Sistema
            </h2>
            <p className="mt-2 text-[15px] text-ink-600">
              Digite sus credenciales para acceder a la plataforma
            </p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-error/20 bg-error-soft p-3.5 text-xs text-error-text"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-ink-600">
                Correo electrónico
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Mail className="mr-3 h-5 w-5 shrink-0 text-forest-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@agrosentinel.com"
                  className="w-full bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-ink-600">
                Contraseña
              </label>
              <div className="login-field flex items-center rounded-xl px-4 py-3 transition">
                <Lock className="mr-3 h-5 w-5 shrink-0 text-forest-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(event) => setRememberSession(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded accent-gold-500"
              />
              <span>
                <span className="font-semibold text-ink-900">Mantener sesión iniciada</span>
                <span className="block text-xs text-ink-600">
                  Necesario para trabajar sin internet en campo. Desmárcalo en equipos compartidos.
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="login-submit mt-2 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-bold tracking-wide transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="border-t border-sand-200 pt-5 text-center text-sm text-ink-600">
            ¿No tienes cuenta?{' '}
            <Link
              to="/registro"
              className="font-semibold text-forest-700 underline underline-offset-4 transition-colors hover:text-forest-900"
            >
              Regístrate aquí
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-ink-600">
            <ShieldCheck className="h-5 w-5 text-forest-500" />
            <span>Acceso seguro para personal autorizado</span>
          </div>
        </div>
      </div>
    </div>
  );
}