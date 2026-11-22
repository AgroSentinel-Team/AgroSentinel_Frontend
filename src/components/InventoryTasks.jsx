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
        dark ? 'border-sand-200 bg-sand-50' : 'border-sand-200 bg-surface'
      }`}
    >
      <header
        className={`flex flex-wrap items-center justify-between gap-3 border-b p-3.5 sm:p-4 ${
          dark ? 'border-sand-200' : 'border-sand-200'
        }`}
      >
        <div className="min-w-0 flex-1">
          <h2 className={`text-sm sm:text-base font-semibold truncate ${dark ? 'text-ink-900' : 'text-ink-900'}`}>
            Tareas del turno
          </h2>
          <p className={`mt-0.5 text-xs ${dark ? 'text-ink-600' : 'text-ink-600'}`}>
            Crea tareas y marca su progreso. Se comparten entre administrador y almacén.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
              dark
                ? 'border border-warning/30 bg-warning-soft text-forest-900'
                : 'bg-warning-soft text-forest-900'
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
            className={`flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-200 ease-out disabled:opacity-50 ${
              dark ? 'text-ink-600 hover:bg-sand-100 active:bg-sand-200' : 'text-ink-600 hover:bg-sand-100 active:bg-sand-100'
            }`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <form
        onSubmit={createTask}
        className={`flex items-center gap-2 border-b p-3 sm:p-3.5 ${
          dark ? 'border-sand-200' : 'border-sand-200'
        }`}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={240}
          placeholder="Nueva tarea del turno..."
          aria-label="Nueva tarea del turno"
          className={`min-w-0 flex-1 rounded-lg border px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-all duration-200 ease-out min-h-[44px] focus:ring-2 ${
            dark
              ? 'border-sand-200 bg-sand-50 text-ink-900 placeholder:text-ink-600 focus:border-gold-600 focus:ring-gold-500/25'
              : 'border-sand-200 bg-surface text-ink-900 placeholder:text-ink-600 focus:border-gold-600 focus:ring-gold-100'
          }`}
        />
        <button
          type="submit"
          disabled={saving || !draft.trim()}
          aria-label="Agregar tarea"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-pine-900 transition-all duration-200 ease-out hover:bg-gold-600 active:bg-gold-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          <Plus size={18} />
        </button>
      </form>

      <div
        className={`flex items-center gap-1.5 overflow-x-auto border-b p-2.5 sm:p-3 scrollbar-none ${
          dark ? 'border-sand-200' : 'border-sand-200'
        }`}
      >
        {['pendientes', 'completadas', 'todas'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200 ease-out whitespace-nowrap ${
              filter === value
                ? dark
                  ? 'bg-sand-50 font-semibold text-ocean-700 border border-ocean-300/60'
                  : 'bg-info-soft font-semibold text-ocean-700'
                : dark
                ? 'text-ink-600 hover:bg-sand-100 hover:text-ink-900 active:bg-sand-200'
                : 'text-ink-600 hover:bg-sand-100 active:bg-sand-100'
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
            dark ? 'border-error/20 bg-error-soft text-error-text' : 'border-error/20 bg-error-soft text-error-text'
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

      <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2 sm:p-3.5">
        {loading && tasks.length === 0 && (
          <p className="col-span-full py-6 text-center text-xs text-ink-600">
            Cargando tareas...
          </p>
        )}
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            className={`flex min-h-[48px] items-center gap-2 rounded-lg border px-2.5 transition-all duration-200 ease-out ${
              dark ? 'border-sand-200 bg-sand-50 hover:bg-sand-50' : 'border-sand-200 bg-surface hover:bg-sand-50'
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
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all duration-200 ease-out ${
                  task.completed
                    ? dark
                      ? 'border-forest-300/50 bg-success-soft'
                      : 'border-forest-300/50 bg-success-soft'
                    : dark
                    ? 'border-sand-200 bg-sand-50'
                    : 'border-sand-200 bg-surface'
                }`}
              >
                {task.completed && (
                  <Check
                    size={13}
                    strokeWidth={3}
                    className="text-forest-700"
                  />
                )}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-xs sm:text-sm ${
                  task.completed
                    ? dark
                      ? 'text-ink-600 line-through'
                      : 'text-ink-600 line-through'
                    : dark
                    ? 'text-ink-900'
                    : 'text-ink-900'
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
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ease-out disabled:opacity-50 ${
                dark
                  ? 'text-ink-600 hover:bg-error-soft hover:text-error-text active:bg-error-soft'
                  : 'text-ink-600 hover:bg-error-soft hover:text-error-text active:bg-error-soft'
              }`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!loading && visibleTasks.length === 0 && !error && (
          <p className="col-span-full py-6 text-center text-xs text-ink-600">
            {tasks.length === 0
              ? 'Agrega las tareas que se deben atender en el turno.'
              : 'No hay tareas en este filtro.'}
          </p>
        )}
      </div>
    </section>
  );
}