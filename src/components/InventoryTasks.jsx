import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  createInventoryTask,
  deleteInventoryTask,
  getInventoryTasks,
  setInventoryTaskCompleted,
} from '../services/inventoryService';

function errorMessage(error) {
  if (error.response?.status === 401) {
    return 'La API rechazó el token de la sesión. Vuelve a iniciar sesión e intenta actualizar las tareas.';
  }
  if (error.response?.status === 403) {
    return 'Tu usuario no tiene permiso para gestionar las tareas.';
  }
  return error.response?.data?.detail
    || error.response?.data?.message
    || error.message
    || 'No se pudo completar la operación.';
}

export default function InventoryTasks({ variant = 'dark' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('pendientes');
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState(null);
  const dark = variant === 'dark';

  const loadTasks = async () => {
    setLoading(true);
    try {
      setTasks(await getInventoryTasks());
      setError('');
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getInventoryTasks()
      .then((data) => {
        if (active) setTasks(data);
      })
      .catch((loadError) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const pendingCount = tasks.filter((task) => !task.completed).length;
  const visibleTasks = useMemo(() => tasks.filter((task) => (
    filter === 'todas' || (filter === 'pendientes' ? !task.completed : task.completed)
  )), [tasks, filter]);

  const createTask = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createInventoryTask(draft.trim());
      setDraft('');
      await loadTasks();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task) => {
    setBusyTaskId(task.id);
    setError('');
    try {
      await setInventoryTaskCompleted(task.id, !task.completed);
      await loadTasks();
    } catch (updateError) {
      setError(errorMessage(updateError));
    } finally {
      setBusyTaskId(null);
    }
  };

  const removeTask = async (task) => {
    setBusyTaskId(task.id);
    setError('');
    try {
      await deleteInventoryTask(task.id);
      await loadTasks();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <section className={`overflow-hidden rounded-xl border shadow-sm ${dark ? 'border-[#2d4055] bg-[#13293a]' : 'border-[#dfe6ed] bg-white'}`}>
      <header className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${dark ? 'border-[#2d4055]' : 'border-[#e5eaf0]'}`}>
        <div>
          <h2 className={`text-[14px] font-semibold ${dark ? 'text-white' : 'text-[#182235]'}`}>Tareas del turno</h2>
          <p className={`mt-1 text-[10px] ${dark ? 'text-slate-300' : 'text-[#64748b]'}`}>Crea tareas y marca su progreso. Se comparten entre administrador y almacén.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded bg-orange-100 px-2 py-1 text-[9px] font-semibold text-orange-800">{pendingCount} pendientes</span>
          <button type="button" onClick={loadTasks} disabled={loading} title="Actualizar tareas" aria-label="Actualizar tareas" className={`flex h-7 w-7 items-center justify-center rounded disabled:opacity-50 ${dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}>
            <RefreshCw size={13} />
          </button>
        </div>
      </header>

      <form onSubmit={createTask} className={`flex gap-2 border-b p-3 ${dark ? 'border-[#2d4055]' : 'border-[#e5eaf0]'}`}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={240}
          placeholder="Nueva tarea del turno..."
          aria-label="Nueva tarea del turno"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
        <button type="submit" disabled={saving || !draft.trim()} aria-label="Agregar tarea" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          <Plus size={15} />
        </button>
      </form>

      <div className={`flex gap-1 border-b px-3 py-2 ${dark ? 'border-[#2d4055]' : 'border-[#e5eaf0]'}`}>
        {['pendientes', 'completadas', 'todas'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded px-2.5 py-1.5 text-[10px] capitalize ${filter === value ? 'bg-cyan-100 font-semibold text-cyan-900' : dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {value}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mx-3 mt-3 flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-800">
          <span>{error}</span>
          <button type="button" onClick={loadTasks} className="shrink-0 font-semibold underline">Reintentar</button>
        </div>
      )}

      <div className="max-h-64 space-y-2 overflow-y-auto p-3">
        {loading && tasks.length === 0 && <p className="py-5 text-center text-[11px] text-slate-500">Cargando tareas...</p>}
        {visibleTasks.map((task) => (
          <div key={task.id} className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-2">
            <button
              type="button"
              disabled={busyTaskId === task.id}
              onClick={() => toggleTask(task)}
              aria-pressed={task.completed}
              className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left disabled:opacity-60"
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${task.completed ? 'border-green-600 bg-green-50' : 'border-slate-400 bg-white'}`}>
                {task.completed && <Check size={11} strokeWidth={3} className="text-green-700" />}
              </span>
              <span className={`truncate text-[11px] ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.description}</span>
            </button>
            <button
              type="button"
              disabled={busyTaskId === task.id}
              onClick={() => removeTask(task)}
              aria-label={`Eliminar tarea: ${task.description}`}
              title="Eliminar tarea"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {!loading && visibleTasks.length === 0 && !error && (
          <p className={`py-5 text-center text-[11px] ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
            {tasks.length === 0 ? 'Agrega las tareas que se deben atender en el turno.' : 'No hay tareas en este filtro.'}
          </p>
        )}
      </div>
    </section>
  );
}
