import { useEffect, useMemo, useState } from 'react';
import { Package, RefreshCw, Search } from 'lucide-react';
import { getInventoryItems } from '../../services/inventoryService';

function getErrorMessage(error) {
  if (error.response?.status === 401) {
    return 'El backend rechazó el token de acceso. Reinicia el backend con los permisos actualizados y vuelve a iniciar sesión.';
  }
  if (error.response?.status === 403) {
    return 'Tu usuario no tiene permiso para consultar el inventario.';
  }
  return error.response?.data?.detail
    || error.response?.data?.message
    || error.message
    || 'No se pudo cargar el inventario.';
}

export default function Inventario({ variant = 'dark' }) {
  const dark = variant === 'dark';
  const [inventory, setInventory] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getInventoryItems()
      .then((items) => {
        if (active) setInventory(items);
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  const retryLoading = () => {
    setLoading(true);
    setError('');
    setReloadKey((current) => current + 1);
  };

  const visible = useMemo(
    () => inventory.filter((item) => `${item.item} ${item.category}`.toLowerCase().includes(query.toLowerCase())),
    [inventory, query],
  );
  const panel = dark ? 'border-[#2d4055] bg-[#13293a]' : 'border-[#dfe6ed] bg-white';
  const text = dark ? 'text-white' : 'text-[#182235]';
  const muted = dark ? 'text-gray-400' : 'text-[#718096]';

  return (
    <section className={`rounded-xl border p-5 shadow-sm ${panel}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-[14px] font-semibold ${text}`}>Inventario</h2>
          <p className={`mt-1 text-[10px] ${muted}`}>Las alertas se activan cuando el stock actual queda por debajo del mínimo.</p>
        </div>
        <label className={`relative rounded-md ${dark ? 'bg-[#102a3d]' : 'bg-[#f5f7f9]'}`}>
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar insumo..."
            className={`w-full rounded-md border px-3 py-2 pl-8 text-[11px] outline-none ${dark ? 'border-[#36556f] bg-[#102a3d] text-white focus:border-cyan-400' : 'border-transparent bg-transparent text-[#334155]'}`}
          />
        </label>
        <button
          type="button"
          onClick={retryLoading}
          disabled={loading}
          aria-label="Actualizar inventario"
          title="Actualizar inventario"
          className={`flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-50 ${dark ? 'border-[#36556f] text-slate-300 hover:bg-[#1d3d52]' : 'border-[#dfe6ed] text-[#52627a] hover:bg-[#f5f7f9]'}`}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          <span>{error}</span>
          <button type="button" onClick={retryLoading} className="font-semibold underline">Reintentar</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-[11px]">
          <thead className={`border-b text-gray-400 ${dark ? 'border-[#2d4055] bg-[#102a3d]' : 'border-[#e8edf2]'}`}>
            <tr>
              <th className="pb-3 font-medium">Ítem</th>
              <th className="pb-3 font-medium">Categoría</th>
              <th className="pb-3 text-right font-medium">Stock actual</th>
              <th className="pb-3 text-right font-medium">Mínimo</th>
              <th className="pb-3 text-center font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className={dark ? 'divide-y divide-[#2d4055]' : 'divide-y divide-[#e8edf2]'}>
            {visible.map((item) => {
              const low = Number(item.stock) < Number(item.minimum);
              return (
                <tr key={item.id} className={dark ? 'hover:bg-white/5' : 'hover:bg-[#f8fafc]'}>
                  <td className={`py-3 font-medium ${text}`}><span className="mr-2 inline-flex rounded bg-blue-500/15 p-1 text-blue-300"><Package size={12} /></span>{item.item}</td>
                  <td className={`py-3 ${muted}`}>{item.category}</td>
                  <td className={`py-3 text-right ${text}`}>{item.stock} {item.unit}</td>
                  <td className={`py-3 text-right ${muted}`}>{item.minimum} {item.unit}</td>
                  <td className="py-3 text-center"><span className={`rounded px-2 py-0.5 text-[9px] ${low ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>{low ? 'Bajo stock' : 'Suficiente'}</span></td>
                </tr>
              );
            })}
            {!loading && !error && visible.length === 0 && (
              <tr><td colSpan="5" className={`py-8 text-center ${muted}`}>{inventory.length ? 'No hay resultados para la búsqueda.' : 'Aún no hay productos. Registra una primera entrada desde Entradas.'}</td></tr>
            )}
            {loading && <tr><td colSpan="5" className={`py-8 text-center ${muted}`}>Cargando inventario...</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
