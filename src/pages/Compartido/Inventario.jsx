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
  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    'No se pudo cargar el inventario.'
  );
}

export default function Inventario({ variant = 'dark', groupId, groupName, scoped = false }) {
  const dark = variant === 'dark';
  const [inventory, setInventory] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getInventoryItems(groupId, scoped)
      .then((items) => {
        if (active) setInventory(items);
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey, groupId, scoped]);

  const retryLoading = () => {
    setLoading(true);
    setError('');
    setReloadKey((current) => current + 1);
  };

  const visible = useMemo(
    () =>
      inventory.filter((item) =>
        `${item.item} ${item.category}`.toLowerCase().includes(query.toLowerCase())
      ),
    [inventory, query]
  );

  const panel = dark ? 'border-[#2d4055] bg-[#13293a]' : 'border-[#dfe6ed] bg-white';
  const text = dark ? 'text-white' : 'text-[#182235]';
  const muted = dark ? 'text-slate-400' : 'text-[#718096]';
  const cardBg = dark ? 'border-[#294255] bg-[#0c1e2c]' : 'border-[#e2e8f0] bg-[#f8fafc]';

  return (
    <section className={`rounded-xl border p-4 sm:p-6 shadow-xl min-w-0 ${panel}`}>
      {/* Header Vista */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <h2 className={`text-base sm:text-lg font-semibold ${text}`}>Inventario</h2>
          <p className={`mt-0.5 text-xs ${muted}`}>
            {groupName
              ? `Existencias independientes de ${groupName}.`
              : scoped
              ? 'Bodega central · existencias sin grupo asignado.'
              : 'Las alertas se activan cuando el stock actual queda por debajo del mínimo.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Barra Búsqueda */}
          <div className="relative flex-1 sm:w-64">
            <Search size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar insumo..."
              className={`w-full rounded-lg border px-3.5 pl-10 py-2.5 text-xs sm:text-sm outline-none transition-colors min-h-[44px] ${
                dark
                  ? 'border-[#36556f] bg-[#102a3d] text-white placeholder:text-slate-400 focus:border-cyan-400'
                  : 'border-[#dfe6ed] bg-[#f8fafc] text-[#334155] placeholder:text-slate-400 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Botón Actualizar */}
          <button
            type="button"
            onClick={retryLoading}
            disabled={loading}
            aria-label="Actualizar inventario"
            title="Actualizar inventario"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
              dark
                ? 'border-[#36556f] bg-[#102a3d] text-slate-300 hover:bg-[#1d3d52] hover:text-white'
                : 'border-[#dfe6ed] bg-[#f8fafc] text-[#52627a] hover:bg-[#e2e8f0]'
            }`}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={retryLoading}
            className="font-semibold text-red-300 underline hover:text-white shrink-0 ml-2"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Estado Carga / Vacío / Lista Inventario */}
      {loading ? (
        <p className={`py-12 text-center text-xs ${muted}`}>Cargando inventario...</p>
      ) : !error && visible.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-8 text-center text-xs ${dark ? 'border-white/10 bg-[#0c1e2c]' : 'border-[#dfe6ed] bg-[#f8fafc]'} ${muted}`}>
          <Package size={28} className="mx-auto mb-2 opacity-50" />
          <span>
            {inventory.length
              ? 'No hay resultados que coincidan con la búsqueda.'
              : 'Aún no hay productos registrados. Registra una primera entrada desde la sección Entradas.'}
          </span>
        </div>
      ) : !error && (
        <>
          {/* Vista Tarjetas para Pantallas Pequeñas (Móviles) */}
          <div className="grid min-w-0 grid-cols-2 gap-2 md:hidden">
            {visible.map((item) => {
              const low = Number(item.stock) < Number(item.minimum);
              return (
                <article key={item.id} className={`min-w-0 rounded-xl border p-3 sm:p-4 space-y-3 shadow-md ${cardBg}`}>
                  <div className="flex flex-col items-start gap-2 border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/20 sm:h-9 sm:w-9">
                        <Package size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className={`break-words text-xs sm:text-sm font-semibold ${text}`}>{item.item}</p>
                        <p className={`break-words text-[11px] sm:text-xs ${muted}`}>{item.category || 'Sin categoría'}</p>
                      </div>
                    </div>
                    <span
                      className={`max-w-full break-words rounded-full px-2 py-1 text-[9px] sm:text-[10px] font-semibold ${
                        low
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {low ? 'Bajo stock' : 'Suficiente'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className={`block text-[10px] sm:text-[11px] font-medium uppercase tracking-wide ${muted}`}>Stock actual</span>
                      <span className={`font-bold text-sm ${low ? 'text-red-400' : text}`}>
                        {item.stock} {item.unit}
                      </span>
                    </div>
                    <div>
                      <span className={`block text-[10px] sm:text-[11px] font-medium uppercase tracking-wide ${muted}`}>Stock mínimo</span>
                      <span className={`font-semibold ${text}`}>
                        {item.minimum} {item.unit}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Vista Tabla para Pantallas Medianas / Escritorio */}
          <div className={`hidden md:block overflow-x-auto rounded-lg border ${dark ? 'border-[#2d4055] bg-[#102a3d]' : 'border-[#dfe6ed] bg-white'}`}>
            <table className="w-full min-w-[600px] text-left text-xs sm:text-sm">
              <thead className={`border-b ${dark ? 'border-[#2d4055] bg-[#0b1d2a] text-slate-400' : 'border-[#e8edf2] bg-[#f8fafc] text-[#607086]'} font-semibold uppercase text-[11px] tracking-wider`}>
                <tr>
                  <th className="px-4 py-3.5">Ítem</th>
                  <th className="px-4 py-3.5">Categoría</th>
                  <th className="px-4 py-3.5 text-right">Stock actual</th>
                  <th className="px-4 py-3.5 text-right">Mínimo</th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className={dark ? 'divide-y divide-white/5' : 'divide-y divide-[#e8edf2]'}>
                {visible.map((item) => {
                  const low = Number(item.stock) < Number(item.minimum);
                  return (
                    <tr key={item.id} className={dark ? 'hover:bg-white/[0.03] transition-colors' : 'hover:bg-[#f8fafc] transition-colors'}>
                      <td className={`px-4 py-3.5 font-semibold ${text}`}>
                        <span className="mr-2.5 inline-flex items-center justify-center rounded-lg bg-blue-500/15 p-1.5 text-blue-300 border border-blue-500/20">
                          <Package size={15} />
                        </span>
                        {item.item}
                      </td>
                      <td className={`px-4 py-3.5 ${muted}`}>{item.category || 'Sin categoría'}</td>
                      <td className={`px-4 py-3.5 text-right font-bold ${low ? 'text-red-400' : text}`}>
                        {item.stock} {item.unit}
                      </td>
                      <td className={`px-4 py-3.5 text-right ${muted}`}>
                        {item.minimum} {item.unit}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            low
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {low ? 'Bajo stock' : 'Suficiente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}