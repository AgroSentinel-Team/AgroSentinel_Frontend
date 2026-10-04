import { useEffect, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { getInventoryItems, getInventoryMovements } from '../../services/inventoryService';

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getErrorMessage(error) {
  return error.response?.data?.detail
    || error.response?.data?.message
    || error.message
    || 'No se pudieron cargar los datos del reporte.';
}

export default function Reportes({ variant = 'dark' }) {
  const dark = variant === 'dark';
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getInventoryItems(), getInventoryMovements()])
      .then(([inventory, history]) => {
        if (!active) return;
        setItems(inventory);
        setMovements(history);
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const exportInventory = () => {
    downloadCsv(
      'agrosentinel-inventario.csv',
      ['ID', 'Producto', 'Categoría', 'Stock actual', 'Unidad', 'Stock mínimo', 'Estado'],
      items.map((item) => [
        item.id,
        item.item,
        item.category,
        item.stock,
        item.unit,
        item.minimum,
        Number(item.stock) < Number(item.minimum) ? 'Bajo stock' : 'Suficiente',
      ]),
    );
  };

  const exportMovements = () => {
    downloadCsv(
      'agrosentinel-movimientos.csv',
      ['ID movimiento', 'ID producto', 'Producto', 'Tipo', 'Cantidad', 'Unidad', 'Responsable', 'Rol', 'Motivo', 'Fecha'],
      movements.map((movement) => [
        movement.id,
        movement.itemId,
        movement.itemName,
        movement.tipo,
        movement.cantidad,
        movement.itemUnit,
        movement.responsable,
        movement.rol,
        movement.motivo,
        new Date(movement.fecha).toLocaleString(),
      ]),
    );
  };

  const titleClass = dark ? 'text-white' : 'text-[#182235]';
  const muted = dark ? 'text-gray-400' : 'text-[#718096]';
  const reports = [
    {
      title: 'Inventario actual',
      description: `${items.length} productos · existencias, unidades y alertas de stock.`,
      action: exportInventory,
    },
    {
      title: 'Historial de movimientos',
      description: `${movements.length} entradas y salidas registradas con responsable y fecha.`,
      action: exportMovements,
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className={`text-[14px] font-semibold ${titleClass}`}>Reportes de almacén</h2>
        <p className={`mt-1 text-[10px] ${muted}`}>Descarga reportes con datos actuales del inventario y sus movimientos.</p>
      </div>
      {error && <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reports.map((report) => (
          <article key={report.title} className={`rounded-xl border p-5 shadow-sm ${dark ? 'border-[#2d4055] bg-[#13293a]' : 'border-[#dfe6ed] bg-white'}`}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/15 text-blue-300"><BarChart3 size={24} /></div>
            <h3 className={`text-[12px] font-medium ${titleClass}`}>{report.title}</h3>
            <p className={`mb-4 mt-1 text-[9px] ${muted}`}>{loading ? 'Cargando datos...' : report.description}</p>
            <button
              type="button"
              disabled={loading || Boolean(error)}
              onClick={report.action}
              className="flex w-full items-center justify-center gap-1 rounded bg-black/5 py-2 text-[10px] text-gray-500 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={12} /> Descargar CSV para Excel
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
