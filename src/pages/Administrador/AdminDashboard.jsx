import { useState } from 'react';
import { Activity, BarChart3, Bell, LayoutDashboard, Package, Tractor, Users, UsersRound } from 'lucide-react';
import LogoutButton from '../../components/LogoutButton';
import Usuarios from './Usuarios';
import GruposTrabajo from './GruposTrabajo';
import Activos from './Activos';
import Inventario from '../Compartido/Inventario';
import Reportes from '../Compartido/Reportes';

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Usuarios', icon: Users },
  { label: 'Grupos de Trabajo', icon: UsersRound },
  { label: 'Activos', icon: Tractor },
  { label: 'Inventario', icon: Package },
  { label: 'Reportes', icon: BarChart3 },
];

const stats = [
  { title: 'TOTAL USUARIOS', value: '28', info: '+4 este mes', color: 'text-cyan-400' },
  { title: 'USUARIOS ACTIVOS', value: '24', info: '92% actividad', color: 'text-cyan-400' },
  { title: 'GRUPOS DE TRABAJO', value: '6', info: '2 nuevos', color: 'text-orange-400' },
  { title: 'ROLES ASIGNADOS', value: '4', info: 'Balanceado', color: 'text-cyan-400' },
];

const activities = [
  ['Inicio de sesión exitoso', 'Carlos Restrepo desde Oficina Principal', 'Hace 5 minutos', false],
  ['Nuevo usuario registrado', 'Juan Pérez fue creado como Técnico', 'Hace 1 hora', false],
  ['Falla Crítica Reportada', 'Tractor John Deere 6J - Fallas en el motor de arranque', 'Hace 2 horas', true],
  ['Grupo de trabajo modificado', 'Héctor Ortiz asignado a Fumigación', 'Hace 4 horas', false],
];

function DashboardHome() {
  return <><section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.title} className="rounded-xl border border-white/10 bg-[#292929] px-4 py-4"><div className="flex items-end justify-between"><div><p className="text-[9px] uppercase tracking-wide text-gray-400">{stat.title}</p><p className="mt-1 text-[23px] font-bold leading-none text-white">{stat.value}</p></div><span className={`text-[9px] font-medium ${stat.color}`}>{stat.info}</span></div></div>)}</section><section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.38fr_0.9fr]"><div className="rounded-xl border border-white/10 bg-[#292929] p-4"><h2 className="text-[13px] font-semibold text-white">Registro de Actividad Reciente</h2><div className="mt-4 space-y-4">{activities.map(([title, description, time, danger]) => <div key={title} className="flex gap-3"><div className={`flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-600/80' : 'bg-blue-600'}`}><Activity size={11} className="text-white" /></div><div><p className={`text-[11px] font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{title}</p><p className="mt-[2px] text-[9px] text-gray-400">{description}</p><p className="mt-[2px] text-[8px] text-gray-500">{time}</p></div></div>)}</div></div><div className="rounded-xl border border-white/10 bg-[#292929] p-4"><h2 className="text-[13px] font-semibold text-white">Distribución de Roles</h2><div className="flex flex-col items-center"><div className="relative mt-6 h-24 w-24 rounded-full" style={{ background: 'conic-gradient(#2563eb 0 15%, #60a5fa 15% 60%, #1d4ed8 60% 90%, #4b5563 90% 100%)' }}><div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-[#292929]"><span className="text-[18px] font-bold text-white">28</span><span className="text-[8px] text-gray-400">Usuarios</span></div></div><div className="mt-5 w-full space-y-2 text-[9px] text-gray-300"><p><span className="mr-2 inline-block h-2 w-2 rounded-sm bg-blue-600" />Administradores (15%)</p><p><span className="mr-2 inline-block h-2 w-2 rounded-sm bg-blue-400" />Técnicos (45%)</p><p><span className="mr-2 inline-block h-2 w-2 rounded-sm bg-blue-700" />Operarios de Máquina (30%)</p><p><span className="mr-2 inline-block h-2 w-2 rounded-sm bg-gray-600" />Operarios de Inventario (10%)</p></div></div></div></section></>;
}
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const content = { Dashboard: <DashboardHome />, Usuarios: <Usuarios />, 'Grupos de Trabajo': <GruposTrabajo />, Activos: <Activos />, Inventario: <Inventario />, Reportes: <Reportes /> };
  return <div className="min-h-screen bg-[#181818] text-white"><div className="flex min-h-screen"><aside className="hidden w-[190px] shrink-0 border-r border-white/10 bg-[#292929] md:block"><div className="flex h-[55px] items-center gap-2 border-b border-white/10 px-4"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600"><span className="text-xs font-bold">A</span></div><span className="text-[14px] font-semibold text-blue-400">AgroSentinel</span></div><nav className="space-y-1 px-3 py-4">{navigation.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => setActiveTab(label)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[11px] transition ${activeTab === label ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><Icon size={15} strokeWidth={1.8} />{label}</button>)}</nav></aside><main className="flex min-w-0 flex-1 flex-col"><header className="flex min-h-[55px] items-center justify-between gap-3 border-b border-white/10 bg-[#242424] px-5"><div className="flex min-w-0 items-center gap-2"><span className="text-[14px] font-semibold text-blue-400">AgroSentinel</span><span className="text-gray-500">/</span><span className="truncate text-[11px] font-semibold text-gray-300">{activeTab}</span></div><div className="flex items-center gap-3"><Bell size={15} className="text-gray-400" /><LogoutButton className="text-gray-300 hover:bg-white/10 hover:text-white" /><div className="hidden text-right leading-tight sm:block"><p className="text-[9px] font-medium text-white">Don Carlos Restrepo</p><p className="text-[7px] font-bold text-blue-400">ADMINISTRADOR</p></div><div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-yellow-400 via-orange-500 to-green-700 text-[8px] font-bold">CR</div></div></header><div className="flex-1 overflow-y-auto"><div className="mx-auto max-w-[1120px] px-5 py-5">{content[activeTab]}</div></div></main></div></div>;
}
