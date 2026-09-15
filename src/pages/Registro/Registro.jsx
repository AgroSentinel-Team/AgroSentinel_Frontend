import React, { useState } from 'react';
import App from '../../App.jsx';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, EyeOff, Eye, Briefcase, ShieldCheck, XCircle } from 'lucide-react';

export default function Registro() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: '' 
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
      await axios.post('http://localhost:8080/api/auth/registro', formData);
      setSuccess('Usuario creado correctamente. Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0F172A] font-sans">
      <div className="hidden lg:flex lg:w-1/2 relative bg-[url('https://images.unsplash.com/photo-1586771107445-d3ca888129ff?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-slate-900/80"></div> 
        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
           <div className="flex items-center gap-3 text-white">
              <div className="bg-blue-600 p-1.5 rounded-md flex items-center justify-center">
                 <XCircle size={22} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-wide">AgroSentinel</span>
           </div>
           <div>
              <h1 className="text-4xl font-bold text-white mb-4 leading-tight">Únete a la plataforma</h1>
              <p className="text-[#00B4D8] max-w-md text-base leading-relaxed">Registra a tu personal para digitalizar el mantenimiento de tu maquinaria.</p>
           </div>
           <div className="text-[#D4AF37] text-xs font-medium tracking-wide">© 2026 AgroSentinel, Colombia S.A.</div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0F172A]">
        <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-2">Crear nueva cuenta</h2>
            
            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-3 rounded-md mb-4">{error}</div>}
            {success && <div className="bg-blue-500/10 border border-blue-500 text-blue-400 text-sm p-3 rounded-md mb-4">{success}</div>}

            <form onSubmit={handleRegister} className="space-y-4">
                <div>
                    <label className="block text-white text-sm font-medium mb-1">Nombre Completo</label>
                    <div className="flex items-center bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-1">
                        <User className="text-slate-400 w-5 h-5 mr-3" />
                        <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full bg-transparent text-white outline-none text-sm" required />
                    </div>
                </div>

                <div>
                    <label className="block text-white text-sm font-medium mb-1">Correo electrónico</label>
                    <div className="flex items-center bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-1">
                        <Mail className="text-slate-400 w-5 h-5 mr-3" />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-transparent text-white outline-none text-sm" required />
                    </div>
                </div>

                <div>
                    <label className="block text-white text-sm font-medium mb-1">Contraseña</label>
                    <div className="flex items-center bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-1">
                        <Lock className="text-slate-400 w-5 h-5 mr-3" />
                        <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full bg-transparent text-white outline-none text-sm" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <Eye className="text-slate-400 w-5 h-5 ml-3" /> : <EyeOff className="text-slate-400 w-5 h-5 ml-3" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-white text-sm font-medium mb-1">Rol en el sistema</label>
                    <div className="flex items-center bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-1">
                        <Briefcase className="text-slate-400 w-5 h-5 mr-3" />
                        <select name="rol" value={formData.rol} onChange={handleChange} className="w-full bg-transparent text-white outline-none text-sm cursor-pointer" required>
                            <option value="" disabled className="bg-slate-800">Seleccione un rol...</option>
                            <option value="TECNICO" className="bg-slate-800">Técnico de Mantenimiento</option>
                            <option value="SUPERVISOR" className="bg-slate-800">Supervisor</option>
                            <option value="ALMACENISTA" className="bg-slate-800">Almacenista</option>
                            <option value="ADMINISTRADOR" className="bg-slate-800">Administrador</option>
                            <option value="OPERATIVO_CAMPO" className="bg-slate-800">Usuario Operativo de Campo</option>
                        </select>
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-6 flex justify-center items-center">
                    {loading ? 'Registrando...' : 'Registrar usuario'}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
                ¿Ya tienes cuenta? <Link to="/login" className="text-blue-500 hover:text-blue-400">Inicia sesión</Link>
            </div>
        </div>
      </div>
    </div>
  );
}