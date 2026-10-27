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
  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    'No se pudo completar la operación.'
  );
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
    return () => {
      active = false;
    };
  }, []);

  const pendingCount = tasks.filter((task) => !task.completed).length;
  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (task) => filter === 'todas' || (filter === 'pendientes' ? !task.completed : task.completed)
      ),
    [tasks, filter]
  );

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
    <section
      className={`overflow-hidden rounded-xl border shadow-sm transition-all min-w-0 ${
        dark ? 'border-[#2d4055] bg-[#13293a]' : 'border-[#dfe6ed] bg-white'
      }`}
    >
      <header
        className={`flex flex-wrap items-center justify-between gap-3 border-b p-3.5 sm:p-4 ${
          dark ? 'border-[#2d4055]' : 'border-[#e5eaf0]'
        }`}
      >
        <div className="min-w-0 flex-1">
          <h2 className={`text-sm sm:text-base font-semibold truncate ${dark ? 'text-white' : 'text-[#182235]'}`}>
            Tareas del turno
          </h2>
          <p className={`mt-0.5 text-xs ${dark ? 'text-slate-300' : 'text-[#64748b]'}`}>
            Crea tareas y marca su progreso. Se comparten entre administrador y almacén.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
              dark
                ? 'border border-amber-400/30 bg-amber-400/10 text-amber-200'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            {pendingCount} pendientes
          </span>
          <button
            type="button"
            onClick={loadTasks}
            disabled={loading}
            title="Actualizar tareas"
            aria-label="Actualizar tareas"
            className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
              dark ? 'text-slate-300 hover:bg-white/10 active:bg-white/20' : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
            }`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <form
        onSubmit={createTask}
        className={`flex items-center gap-2 border-b p-3 sm:p-3.5 ${
          dark ? 'border-[#2d4055]' : 'border-[#e5eaf0]'
        }`}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={240}
          placeholder="Nueva tarea del turno..."
          aria-label="Nueva tarea del turno"
          className={`min-w-0 flex-1 rounded-lg border px-3.5 py-2.5 text-xs sm:text-sm outline-none transition min-h-[44px] focus:ring-2 ${
            dark
              ? 'border-[#36556f] bg-[#102a3d] text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20'
              : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-100'
          }`}
        />
        <button
          type="submit"
          disabled={saving || !draft.trim()}
          aria-label="Agregar tarea"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white transition-colors disabled:opacity-50 ${
            dark ? 'bg-[#0f9ec7] hover:bg-[#0d7ca3] active:bg-[#0b6a8c]' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          <Plus size={18} />
        </button>
      </form>

      <div
        className={`flex items-center gap-1.5 overflow-x-auto border-b p-2.5 sm:p-3 scrollbar-none ${
          dark ? 'border-[#2d4055]' : 'border-[#e5eaf0]'
        }`}
      >
        {['pendientes', 'completadas', 'todas'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
              filter === value
                ? dark
                  ? 'bg-[#143c50] font-semibold text-cyan-200 border border-cyan-500/30'
                  : 'bg-cyan-100 font-semibold text-cyan-900'
                : dark
                ? 'text-slate-300 hover:bg-white/10 hover:text-white active:bg-white/15'
                : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className={`mx-3 mt-3 flex items-start justify-between gap-3 rounded-lg border p-3 text-xs leading-5 ${
            dark ? 'border-red-400/30 bg-[#40272d] text-red-200' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={loadTasks}
            className="shrink-0 font-semibold underline hover:no-underline min-h-[32px] inline-flex items-center"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto p-3 sm:p-3.5">
        {loading && tasks.length === 0 && (
          <p className={`py-6 text-center text-xs ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
            Cargando tareas...
          </p>
        )}
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            className={`flex min-h-[48px] items-center gap-2 rounded-lg border px-2.5 transition-colors ${
              dark ? 'border-[#36556f] bg-[#172c3d] hover:bg-[#1c354a]' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <button
              type="button"
              disabled={busyTaskId === task.id}
              onClick={() => toggleTask(task)}
              aria-pressed={task.completed}
              className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 text-left disabled:opacity-60 min-h-[44px]"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  task.completed
                    ? dark
                      ? 'border-emerald-400 bg-emerald-400/10'
                      : 'border-green-600 bg-green-50'
                    : dark
                    ? 'border-slate-500 bg-[#102a3d]'
                    : 'border-slate-400 bg-white'
                }`}
              >
                {task.completed && (
                  <Check
                    size={13}
                    strokeWidth={3}
                    className={dark ? 'text-emerald-300' : 'text-green-700'}
                  />
                )}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-xs sm:text-sm ${
                  task.completed
                    ? dark
                      ? 'text-slate-400 line-through'
                      : 'text-slate-500 line-through'
                    : dark
                    ? 'text-white'
                    : 'text-slate-800'
                }`}
              >
                {task.description}
              </span>
            </button>
            <button
              type="button"
              disabled={busyTaskId === task.id}
              onClick={() => removeTask(task)}
              aria-label={`Eliminar tarea: ${task.description}`}
              title="Eliminar tarea"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
                dark
                  ? 'text-slate-400 hover:bg-red-400/10 hover:text-red-300 active:bg-red-400/20'
                  : 'text-slate-500 hover:bg-red-50 hover:text-red-700 active:bg-red-100'
              }`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!loading && visibleTasks.length === 0 && !error && (
          <p className={`py-6 text-center text-xs ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
            {tasks.length === 0
              ? 'Agrega las tareas que se deben atender en el turno.'
              : 'No hay tareas en este filtro.'}
          </p>
        )}
      </div>
    </section>
  );
}