import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Package,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import {
  getInventoryItems,
  getInventoryMovements,
  getInventoryTasks,
} from '../../services/inventoryService';
import { getAssets } from '../../services/assetService';
import AssetReportModal from '../../components/AssetReportModal';

const SECTIONS = [
  { id: 'inventory', label: 'Inventario actual', description: 'Existencias y alertas de stock.', icon: Package },
  { id: 'movements', label: 'Movimientos', description: 'Entradas y salidas en el período.', icon: ScrollText },
  { id: 'tasks', label: 'Tareas del turno', description: 'Tareas creadas durante el período.', icon: Wrench },
];

const fieldClass =
  'mt-1 w-full rounded-lg border border-[#36556f] bg-[#102a3d] px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 min-h-[44px] disabled:opacity-60';

function getErrorMessage(error) {
  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    'No se pudieron cargar los datos del reporte.'
  );
}

function dateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function makeFilenameSuffix(groupName) {
  return (groupName || 'bodega-central')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function downloadCsv(rows, filename) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? '');
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function addPdfTable(pdf, state, title, headers, rows) {
  const margin = 14;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const tableWidth = pageWidth - margin * 2;
  const columnWidth = tableWidth / headers.length;
  const lineHeight = 3.5;

  if (state.y + 16 > pageHeight - margin) {
    pdf.addPage();
    state.y = margin;
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(20, 46, 65);
  pdf.text(title, margin, state.y);
  state.y += 7;

  const drawHeader = () => {
    pdf.setFillColor(14, 67, 88);
    pdf.rect(margin, state.y, tableWidth, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    headers.forEach((header, index) => {
      pdf.text(String(header), margin + index * columnWidth + 2, state.y + 5.3, {
        maxWidth: columnWidth - 4,
      });
    });
    state.y += 8;
  };

  drawHeader();
  rows.forEach((row, rowIndex) => {
    const cells = row.map((value) =>
      pdf.splitTextToSize(String(value ?? '—'), columnWidth - 4),
    );
    const rowHeight = Math.max(7, ...cells.map((cell) => cell.length * lineHeight + 3));
    if (state.y + rowHeight > pageHeight - margin) {
      pdf.addPage();
      state.y = margin;
      drawHeader();
    }
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(240, 246, 249);
      pdf.rect(margin, state.y, tableWidth, rowHeight, 'F');
    }
    pdf.setDrawColor(220, 230, 235);
    pdf.rect(margin, state.y, tableWidth, rowHeight, 'S');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(45, 59, 70);
    cells.forEach((cell, index) => {
      pdf.text(cell, margin + index * columnWidth + 2, state.y + 4, {
        maxWidth: columnWidth - 4,
      });
    });
    state.y += rowHeight;
  });
  state.y += 10;
}

export default function Reportes({ variant = 'dark', groupId, groupName, scoped = false }) {
  const dark = variant === 'dark';
  const scopeKey = scoped ? `group:${groupId ?? 'central'}` : 'all';

  // Tabs: 'warehouse' (Reportes de Almacén) | 'assets' (Hoja de Vida por Activo)
  const [activeTab, setActiveTab] = useState('warehouse');

  // Almacén / Inventario Reportes
  const [reportData, setReportData] = useState(null);
  const [selectedSections, setSelectedSections] = useState(['inventory', 'movements']);
  const [format, setFormat] = useState('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Hoja de Vida y Activos
  const [assetList, setAssetList] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [openAssetModal, setOpenAssetModal] = useState(false);
  const [assetError, setAssetError] = useState('');
  const [assetRefreshKey, setAssetRefreshKey] = useState(0);

  const currentReport = reportData?.scopeKey === scopeKey ? reportData : null;
  const items = currentReport?.items ?? [];
  const movements = currentReport?.movements ?? [];
  const tasks = currentReport?.tasks ?? [];
  const [error, setError] = useState(currentReport?.error ?? '');
  const loading = currentReport === null;
  const invalidDateRange = Boolean(startDate && endDate && startDate > endDate);
  const muted = dark ? 'text-slate-400' : 'text-slate-500';

  // Carga de datos de almacén
  useEffect(() => {
    let active = true;
    Promise.all([
      getInventoryItems(groupId, scoped),
      getInventoryMovements(groupId, scoped),
      getInventoryTasks(),
    ])
      .then(([inventory, history, turnTasks]) => {
        if (active) {
          setReportData({
            scopeKey,
            items: inventory,
            movements: history,
            tasks: turnTasks,
            error: '',
          });
          setError('');
        }
      })
      .catch((loadError) => {
        if (active) {
          const errMsg = getErrorMessage(loadError);
          setReportData({
            scopeKey,
            items: [],
            movements: [],
            tasks: [],
            error: errMsg,
          });
          setError(errMsg);
        }
      });
    return () => {
      active = false;
    };
  }, [groupId, scopeKey, scoped]);

  // Carga de catálogo de activos para Hoja de Vida
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setLoadingAssets(true);
        setAssetError('');
        return getAssets();
      })
      .then((data) => {
        if (!active || data === null) return;
        const list = Array.isArray(data) ? data : [];
        setAssetList(list);
        setSelectedAssetId((current) =>
          list.some((asset) => String(asset.id) === current)
            ? current
            : String(list[0]?.id ?? ''),
        );
      })
      .catch((e) => {
        if (active) {
          setAssetList([]);
          setAssetError(getErrorMessage(e));
        }
      })
      .finally(() => {
        if (active) setLoadingAssets(false);
      });
    return () => {
      active = false;
    };
  }, [assetRefreshKey]);

  const selectedAsset = assetList.find((a) => String(a.id) === String(selectedAssetId));

  const filteredMovements = movements.filter((movement) => {
    const date = dateKey(movement.fecha);
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  });

  const filteredTasks = tasks.filter((task) => {
    const date = dateKey(task.createdAt);
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  });

  const toggleSection = (section) => {
    setSelectedSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
  };

  const exportReport = () => {
    if (selectedSections.length === 0 || invalidDateRange || loading || error) return;
    const filename = `agrosentinel-reporte-${makeFilenameSuffix(groupName)}-${
      startDate || 'inicio'
    }-${endDate || 'hoy'}`;
    const sections = [];

    if (selectedSections.includes('inventory')) {
      sections.push({
        title: `Inventario actual (${items.length} productos)`,
        headers: ['Producto', 'Categoría', 'Stock', 'Unidad', 'Mínimo', 'Estado'],
        rows: items.map((item) => [
          item.item,
          item.category,
          item.stock,
          item.unit,
          item.minimum,
          Number(item.stock) < Number(item.minimum) ? 'Bajo stock' : 'Suficiente',
        ]),
      });
    }

    if (selectedSections.includes('movements')) {
      sections.push({
        title: `Movimientos (${filteredMovements.length})`,
        headers: ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Unidad', 'Responsable', 'Motivo'],
        rows: filteredMovements.map((movement) => [
          new Date(movement.fecha).toLocaleString('es-CO'),
          movement.itemName,
          movement.tipo,
          movement.cantidad,
          movement.itemUnit,
          movement.responsable,
          movement.motivo || '—',
        ]),
      });
    }

    if (selectedSections.includes('tasks')) {
      sections.push({
        title: `Tareas del turno (${filteredTasks.length})`,
        headers: ['Tarea', 'Estado', 'Creada por', 'Fecha'],
        rows: filteredTasks.map((task) => [
          task.description,
          task.completed ? 'Completada' : 'Pendiente',
          task.createdBy || '—',
          task.createdAt ? new Date(task.createdAt).toLocaleString('es-CO') : '—',
        ]),
      });
    }

    if (format === 'csv') {
      const rows = [
        ['Reporte de almacén AgroSentinel'],
        ['Zona', groupName || 'Bodega central'],
        ['Período', `${startDate || 'Sin fecha inicial'} a ${endDate || 'Sin fecha final'}`],
        [],
      ];
      sections.forEach((section) => {
        rows.push([section.title], section.headers, ...section.rows, []);
      });
      downloadCsv(rows, `${filename}.csv`);
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(10, 39, 57);
    pdf.rect(0, 0, pageWidth, 39, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.setTextColor(255, 255, 255);
    pdf.text('AgroSentinel', 14, 17);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(178, 216, 228);
    pdf.text('REPORTE DE ALMACÉN', 14, 25);
    pdf.setFontSize(8);
    pdf.text(
      `${groupName || 'Bodega central'}  ·  Período: ${startDate || 'Inicio'} — ${
        endDate || 'Hoy'
      }  ·  Generado: ${new Date().toLocaleString('es-CO')}`,
      14,
      33,
      { maxWidth: pageWidth - 28 },
    );
    const state = { y: 49 };
    sections.forEach((section) =>
      addPdfTable(pdf, state, section.title, section.headers, section.rows),
    );
    pdf.save(`${filename}.pdf`);
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 text-white min-w-0">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <FileText size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Centro de Reportes y Auditoría
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Informes Oficiales de Operación
          </h1>
          <p className={`mt-0.5 text-xs ${muted}`}>
            Exporta hojas de vida por activo con historial completo o informes consolidados de almacén e inventario.
          </p>
        </div>
        <span className="shrink-0 self-start sm:self-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-200">
          {loading ? 'Cargando datos...' : groupName || 'Bodega central'}
        </span>
      </header>

      {/* Selector de Pestañas / Tipo de Reporte */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('warehouse')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'warehouse'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'bg-[#102a3d] text-slate-300 hover:bg-[#14344d]'
          }`}
        >
          <Package size={16} />
          <span>Reportes de Almacén e Inventario</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'assets'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'bg-[#102a3d] text-slate-300 hover:bg-[#14344d]'
          }`}
        >
          <ClipboardList size={16} />
          <span>Hoja de Vida y Mantenimientos por Activo</span>
        </button>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-300 hover:text-white p-1 shrink-0 -mr-1 -mt-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* TAB 1: Reportes de Almacén */}
      {activeTab === 'warehouse' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
          {/* Selección de Secciones */}
          <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl min-w-0 space-y-4">
            <div className="flex items-start gap-3 border-b border-white/10 pb-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300 border border-cyan-400/30">
                <FileText size={18} />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">Contenido del reporte de almacén</h2>
                <p className={`mt-0.5 text-xs ${muted}`}>Selecciona una o varias secciones para incluir en el reporte.</p>
              </div>
            </div>

            <div className="grid gap-2 grid-cols-2 sm:gap-3.5 lg:grid-cols-3">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const selected = selectedSections.includes(section.id);
                const count =
                  section.id === 'inventory'
                    ? items.length
                    : section.id === 'movements'
                    ? filteredMovements.length
                    : filteredTasks.length;
                const unit =
                  section.id === 'inventory'
                    ? 'productos'
                    : section.id === 'movements'
                    ? 'movimientos'
                    : 'tareas';

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-pressed={selected}
                    className={`flex flex-col justify-between min-h-[140px] rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-cyan-400 bg-[#12394b] shadow-lg ring-1 ring-cyan-400/40'
                        : 'border-[#2d4055] bg-[#102a3d] hover:border-[#45647a] hover:bg-[#143247]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Icon size={20} className={selected ? 'text-cyan-300' : 'text-slate-400'} />
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          selected
                            ? 'border-cyan-400 bg-cyan-500 text-white'
                            : 'border-[#557087] bg-transparent text-transparent'
                        }`}
                      >
                        {selected && <Check size={14} strokeWidth={3} />}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-white">{section.label}</p>
                      <p className={`mt-1 text-[11px] leading-tight ${muted}`}>{section.description}</p>
                    </div>

                    <p className="mt-2 text-xs font-bold text-cyan-200">
                      {loading ? '—' : `${count} ${unit}`}
                    </p>
                  </button>
                );
              })}
            </div>

            <p className={`text-xs ${muted} pt-2 border-t border-white/5`}>
              Las fechas seleccionadas filtrarán únicamente movimientos y tareas. Las existencias de inventario reflejan el estado actual.
            </p>
          </article>

          {/* Panel Configuración Descarga */}
          <aside className="space-y-4">
            {/* Período / Fechas */}
            <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                <CalendarDays size={18} className="text-cyan-300 shrink-0" />
                <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Período de consulta
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                <label className="block text-xs font-medium text-slate-300">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="block text-xs font-medium text-slate-300">
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>

              {invalidDateRange && (
                <p role="alert" className="text-xs text-red-300 font-medium">
                  La fecha inicial debe ser anterior a la fecha final.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="inline-flex min-h-[36px] items-center text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                Limpiar fechas
              </button>
            </article>

            {/* Formato y Botón Exportar */}
            <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                {format === 'pdf' ? (
                  <FileText size={18} className="text-cyan-300 shrink-0" />
                ) : (
                  <FileSpreadsheet size={18} className="text-emerald-300 shrink-0" />
                )}
                <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Formato de descarga
                </h2>
              </div>

              <label className="block text-xs font-medium text-slate-300 space-y-1">
                <span>Tipo de archivo</span>
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  className={fieldClass}
                >
                  <option value="pdf">PDF · Documento listo para imprimir</option>
                  <option value="csv">CSV · Hoja de cálculo</option>
                </select>
              </label>

              <button
                type="button"
                disabled={
                  loading ||
                  Boolean(error) ||
                  selectedSections.length === 0 ||
                  invalidDateRange
                }
                onClick={exportReport}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-950/40 transition-colors hover:bg-cyan-500 active:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                <span>
                  {loading ? 'Cargando datos...' : `Descargar ${format.toUpperCase()}`}
                </span>
              </button>

              {selectedSections.length === 0 && (
                <p className="text-center text-xs text-amber-300 font-medium">
                  Selecciona al menos una sección para descargar el reporte.
                </p>
              )}
            </article>
          </aside>
        </div>
      )}

      {/* TAB 2: Hoja de Vida y Reporte por Activo (Tarea 1) */}
      {activeTab === 'assets' && (
        <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-5 sm:p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList size={20} className="text-cyan-400" />
                <span>Generador de Hoja de Vida y Reporte Integral por Activo</span>
              </h2>
              <p className={`mt-0.5 text-xs ${muted}`}>
                Consulta la ficha técnica oficial y el historial cronológico completo de mantenimientos correctivos, preventivos y predictivos.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Selector de Activo */}
            <div className="space-y-4 lg:col-span-1 rounded-xl bg-[#0d2030] p-4 border border-white/5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Selecciona un activo o maquinaria ({assetList.length}):
              </label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                disabled={loadingAssets || assetList.length === 0}
                className={fieldClass}
              >
                {assetList.length === 0 ? (
                  <option value="">{loadingAssets ? 'Cargando activos...' : 'No hay activos registrados'}</option>
                ) : (
                  assetList.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.inventoryCode || 'S/N'}) · {asset.location || 'Sin ubicación'}
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={() => setOpenAssetModal(true)}
                disabled={!selectedAsset || loadingAssets || Boolean(assetError)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-950/40 transition-colors hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye size={18} />
                <span>Ver Hoja de Vida y Reporte</span>
              </button>
              {assetError && (
                <div role="alert" className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  <p>No se pudo cargar el catálogo de activos: {assetError}</p>
                  <button
                    type="button"
                    onClick={() => setAssetRefreshKey((key) => key + 1)}
                    className="font-semibold text-red-100 underline hover:text-white"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            {/* Ficha Resumen del Activo Seleccionado */}
            <div className="lg:col-span-2 rounded-xl bg-[#0d2030] p-5 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Ficha Técnica Resumida
                </h3>
                {selectedAsset && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 px-3 py-1 text-xs font-semibold text-cyan-200">
                    <ShieldCheck size={14} />
                    <span>{selectedAsset.operationalStatus || 'Sin estado'}</span>
                  </span>
                )}
              </div>

              {selectedAsset ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-[#102a3d] p-3 border border-white/5">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Nombre del Activo</p>
                    <p className="text-sm font-bold text-white mt-0.5">{selectedAsset.name}</p>
                  </div>
                  <div className="rounded-lg bg-[#102a3d] p-3 border border-white/5">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Código / Placa</p>
                    <p className="text-sm font-mono font-bold text-cyan-300 mt-0.5">
                      {selectedAsset.inventoryCode || 'Sin código'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#102a3d] p-3 border border-white/5">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Marca y Modelo</p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {selectedAsset.brand || 'Genérica'} {selectedAsset.model || ''}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#102a3d] p-3 border border-white/5">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Número de Serie</p>
                    <p className="text-sm font-mono text-slate-200 mt-0.5">
                      {selectedAsset.serialNumber || 'Sin número'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#102a3d] p-3 border border-white/5">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Ubicación / Finca</p>
                    <p className="text-sm font-bold text-slate-200 mt-0.5">
                      {selectedAsset.location || 'No asignada'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#102a3d] p-3 border border-white/5">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Monitoreo Predictivo</p>
                    <p className="text-sm font-bold text-emerald-300 mt-0.5">
                      {selectedAsset.hasMotor ? 'Telemetría IoT Activa' : 'No configurado'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  {loadingAssets ? 'Cargando información del activo...' : 'Selecciona un activo para visualizar su ficha.'}
                </p>
              )}

              {selectedAsset?.extraSpecifications && (
                <div className="rounded-lg bg-[#102a3d] p-3 border border-white/5">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Especificaciones Técnicas</p>
                  <p className="text-xs text-slate-200 whitespace-pre-wrap">{selectedAsset.extraSpecifications}</p>
                </div>
              )}
            </div>
          </div>
        </article>
      )}

      {/* Modal Integral de Reporte por Activo */}
      {selectedAsset && (
        <AssetReportModal
          asset={selectedAsset}
          isOpen={openAssetModal}
          onClose={() => setOpenAssetModal(false)}
        />
      )}
    </section>
  );
}
