import React, { useState } from 'react';
import App from '../../App.jsx';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, EyeOff, Eye, ShieldCheck, XCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Petición real al backend
      const response = await axios.post('http://localhost:8080/api/auth/login', { email, password });
      
      const { token, rol } = response.data;

      // Guardamos credenciales reales en el navegador
      localStorage.setItem('token', token);
      localStorage.setItem('rol', rol);

      // Redirección estricta según el rol de la base de datos
      switch (rol) {
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
        case 'OPERATIVO_CAMPO':
          navigate('/operativo/dashboard');
          break;
        default:
          setError('Rol no autorizado.');
      }
    } catch (err) {
      setError(err.response?.data || 'Credenciales incorrectas o error de servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b1220] font-sans">
      <div className="hidden lg:flex lg:w-1/2 relative bg-[url('https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[#0e1729]/85"></div> 
        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
           <div className="flex items-center gap-3 text-white">
              <div className="bg-[#08b6d4] p-1.5 rounded-md flex items-center justify-center">
                 <XCircle size={22} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-wide">AgroSentinel</span>
           </div>
           <div>
              <h1 className="text-4xl font-bold text-white mb-4 leading-tight">Gestión Integral de<br/>Mantenimiento Agrícola</h1>
              <p className="text-[#22d3ee] max-w-md text-base leading-relaxed">Mantenga sus tractores, cosechadoras, fumigadoras e irrigadores en óptimo estado.</p>
           </div>
           <div className="text-[#D4AF37] text-xs font-medium tracking-wide">© 2026 AgroSentinel, Colombia S.A.</div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0b1220]">
        <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-2">Ingresar al Sistema</h2>
            <p className="text-[#22d3ee] text-sm mb-8">Digite sus credenciales para acceder a la plataforma</p>

            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-3 rounded-md mb-4">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-white text-sm font-medium mb-2">Correo electrónico</label>
                    <div className="flex items-center bg-[#1b2739] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-cyan-400 focus-within:ring-1">
                        <Mail className="text-slate-400 w-5 h-5 mr-3" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@agrosentinel.com" className="w-full bg-transparent text-white outline-none text-sm" required />
                    </div>
                </div>
                <div>
                    <label className="block text-white text-sm font-medium mb-2">Contraseña</label>
                    <div className="flex items-center bg-[#1b2739] border border-cyan-500 rounded-lg px-3 py-2.5 focus-within:border-cyan-400 focus-within:ring-1">
                        <Lock className="text-slate-400 w-5 h-5 mr-3" />
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className="w-full bg-transparent text-white outline-none text-sm tracking-widest" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <Eye className="text-slate-400 w-5 h-5 ml-3" /> : <EyeOff className="text-slate-400 w-5 h-5 ml-3" />}
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#08b6d4] hover:bg-[#0891b2] text-[#07101f] font-semibold py-2.5 rounded-lg mt-8 flex justify-center items-center">
                    {loading ? 'Verificando...' : 'Iniciar sesión'}
                </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-slate-400">
                ¿No tienes cuenta? <Link to="/registro" className="text-cyan-400 hover:text-cyan-300">Regístrate aquí</Link>
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-8 text-slate-500 text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Acceso seguro para personal autorizado</span>
            </div>
        </div>
      </div>
    </div>
  );
}