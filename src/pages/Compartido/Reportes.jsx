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
import { Badge, Button, Card, Select } from '../../components/ui';

const SECTIONS = [
  { id: 'inventory', label: 'Inventario actual', description: 'Existencias y alertas de stock.', icon: Package },
  { id: 'movements', label: 'Movimientos', description: 'Entradas y salidas en el período.', icon: ScrollText },
  { id: 'tasks', label: 'Tareas del turno', description: 'Tareas creadas durante el período.', icon: Wrench },
];

const fieldClass =
  'mt-1 min-h-11 w-full rounded-xl border border-sand-200 bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-all duration-200 placeholder:text-ink-600 focus-visible:border-gold-600 focus-visible:ring-2 focus-visible:ring-gold-500/25 disabled:opacity-60';

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
  const muted = 'text-ink-600';

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
    <section
      data-variant={variant}
      className="mx-auto w-full max-w-6xl min-w-0 space-y-5 text-ink-900"
    >
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-3 border-b border-sand-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-ocean-700">
            <FileText size={18} aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Centro de Reportes y Auditoría
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Informes Oficiales de Operación
          </h1>
          <p className={`mt-1.5 text-sm ${muted}`}>
            Exporta hojas de vida por activo con historial completo o informes consolidados de almacén e inventario.
          </p>
        </div>
        <Badge
          variant={loading ? 'neutral' : 'info'}
          className="shrink-0 self-start sm:self-center"
        >
          {loading ? 'Cargando datos...' : groupName || 'Bodega central'}
        </Badge>
      </header>

      {/* Selector de Pestañas / Tipo de Reporte */}
      <div className="flex flex-wrap gap-2 border-b border-sand-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('warehouse')}
          className={`min-h-11 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 ${
            activeTab === 'warehouse'
              ? 'bg-gold-500 text-pine-900 shadow-sm shadow-gold-600/20'
              : 'border border-sand-200 bg-surface text-ink-600 hover:bg-sand-100'
          }`}
        >
          <Package size={16} />
          <span>Reportes de Almacén e Inventario</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`min-h-11 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 ${
            activeTab === 'assets'
              ? 'bg-gold-500 text-pine-900 shadow-sm shadow-gold-600/20'
              : 'border border-sand-200 bg-surface text-ink-600 hover:bg-sand-100'
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
          className="flex items-start justify-between gap-3 rounded-xl border border-error/20 bg-error-soft p-3.5 text-sm text-error-text"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setError('')}
            aria-label="Cerrar aviso"
            className="shrink-0"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {/* TAB 1: Reportes de Almacén */}
      {activeTab === 'warehouse' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
          {/* Selección de Secciones */}
          <Card as="article" className="min-w-0 space-y-4 p-4 sm:p-5">
            <div className="flex items-start gap-3 border-b border-sand-200 pb-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-ocean-700">
                <FileText size={18} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink-900">Contenido del reporte de almacén</h2>
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
                    className={`flex min-h-[140px] flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 ${
                      selected
                        ? 'border-gold-500 bg-gold-100 shadow-sm ring-1 ring-gold-500/30'
                        : 'border-sand-200 bg-surface hover:bg-sand-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Icon size={20} className={selected ? 'text-forest-700' : 'text-ink-600'} />
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          selected
                            ? 'border-gold-600 bg-gold-500 text-pine-900'
                            : 'border-sand-400 bg-transparent text-transparent'
                        }`}
                      >
                        {selected && <Check size={14} strokeWidth={3} />}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink-900">{section.label}</p>
                      <p className={`mt-1 text-[11px] leading-tight ${muted}`}>{section.description}</p>
                    </div>

                    <p className="mt-2 text-xs font-bold text-forest-700">
                      {loading ? '—' : `${count} ${unit}`}
                    </p>
                  </button>
                );
              })}
            </div>

            <p className={`border-t border-sand-200 pt-2 text-xs ${muted}`}>
              Las fechas seleccionadas filtrarán únicamente movimientos y tareas. Las existencias de inventario reflejan el estado actual.
            </p>
          </Card>

          {/* Panel Configuración Descarga */}
          <aside className="space-y-4">
            {/* Período / Fechas */}
            <Card as="article" className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center gap-2 border-b border-sand-200 pb-2.5">
                <CalendarDays size={18} className="shrink-0 text-ocean-700" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink-900">
                  Período de consulta
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="block text-[13px] font-semibold text-ink-600">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink-600">
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
                <p role="alert" className="text-xs font-medium text-error-text">
                  La fecha inicial debe ser anterior a la fecha final.
                </p>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Limpiar fechas
              </Button>
            </Card>

            {/* Formato y Botón Exportar */}
            <Card as="article" className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-2 border-b border-sand-200 pb-2.5">
                {format === 'pdf' ? (
                  <FileText size={18} className="shrink-0 text-ocean-700" />
                ) : (
                  <FileSpreadsheet size={18} className="shrink-0 text-forest-700" />
                )}
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink-900">
                  Formato de descarga
                </h2>
              </div>

              <Select
                label="Tipo de archivo"
                wrapperClassName="text-[13px] font-semibold text-ink-600"
                className="mt-1"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <option value="pdf">PDF · Documento listo para imprimir</option>
                <option value="csv">CSV · Hoja de cálculo</option>
              </Select>

              <Button
                loading={loading}
                disabled={
                  Boolean(error) ||
                  selectedSections.length === 0 ||
                  invalidDateRange
                }
                onClick={exportReport}
                leftIcon={<Download size={18} />}
                className="w-full uppercase tracking-wider"
              >
                <span>
                  {loading ? 'Cargando datos...' : `Descargar ${format.toUpperCase()}`}
                </span>
              </Button>

              {selectedSections.length === 0 && (
                <p className="text-center text-xs font-medium text-ink-600">
                  Selecciona al menos una sección para descargar el reporte.
                </p>
              )}
            </Card>
          </aside>
        </div>
      )}

      {/* TAB 2: Hoja de Vida y Reporte por Activo (Tarea 1) */}
      {activeTab === 'assets' && (
        <Card as="article" className="space-y-6 p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-sand-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-ink-900 sm:text-lg">
                <ClipboardList size={20} className="text-ocean-700" />
                <span>Generador de Hoja de Vida y Reporte Integral por Activo</span>
              </h2>
              <p className={`mt-1.5 text-sm ${muted}`}>
                Consulta la ficha técnica oficial y el historial cronológico completo de mantenimientos correctivos, preventivos y predictivos.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Selector de Activo */}
            <div className="space-y-4 rounded-2xl border border-sand-200 bg-sand-50 p-4 lg:col-span-1">
              <Select
                label={`Selecciona un activo o maquinaria (${assetList.length}):`}
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                disabled={loadingAssets || assetList.length === 0}
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
              </Select>

              <Button
                onClick={() => setOpenAssetModal(true)}
                disabled={!selectedAsset || loadingAssets || Boolean(assetError)}
                leftIcon={<Eye size={18} />}
                className="w-full uppercase tracking-wider"
              >
                Ver Hoja de Vida y Reporte
              </Button>
              {assetError && (
                <div role="alert" className="space-y-2 rounded-xl border border-error/20 bg-error-soft p-3 text-sm text-error-text">
                  <p>No se pudo cargar el catálogo de activos: {assetError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssetRefreshKey((key) => key + 1)}
                    className="text-error-text underline"
                  >
                    Reintentar
                  </Button>
                </div>
              )}
            </div>

            {/* Ficha Resumen del Activo Seleccionado */}
            <div className="space-y-4 rounded-2xl border border-sand-200 bg-sand-50 p-5 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-sand-200 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ocean-700">
                  Ficha Técnica Resumida
                </h3>
                {selectedAsset && (
                  <Badge variant="info">
                    <ShieldCheck size={14} />
                    <span>{selectedAsset.operationalStatus || 'Sin estado'}</span>
                  </Badge>
                )}
              </div>

              {selectedAsset ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl border border-sand-200 bg-surface p-3">
                    <p className="text-[11px] font-semibold uppercase text-ink-600">Nombre del Activo</p>
                    <p className="mt-0.5 text-sm font-bold text-ink-900">{selectedAsset.name}</p>
                  </div>
                  <div className="rounded-xl border border-sand-200 bg-surface p-3">
                    <p className="text-[11px] font-semibold uppercase text-ink-600">Código / Placa</p>
                    <p className="mt-0.5 text-sm font-mono font-bold text-ocean-700">
                      {selectedAsset.inventoryCode || 'Sin código'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sand-200 bg-surface p-3">
                    <p className="text-[11px] font-semibold uppercase text-ink-600">Marca y Modelo</p>
                    <p className="mt-0.5 text-sm font-bold text-ink-900">
                      {selectedAsset.brand || 'Genérica'} {selectedAsset.model || ''}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sand-200 bg-surface p-3">
                    <p className="text-[11px] font-semibold uppercase text-ink-600">Número de Serie</p>
                    <p className="mt-0.5 text-sm font-mono text-ink-900">
                      {selectedAsset.serialNumber || 'Sin número'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sand-200 bg-surface p-3">
                    <p className="text-[11px] font-semibold uppercase text-ink-600">Ubicación / Finca</p>
                    <p className="mt-0.5 text-sm font-bold text-ink-900">
                      {selectedAsset.location || 'No asignada'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sand-200 bg-surface p-3">
                    <p className="text-[11px] font-semibold uppercase text-ink-600">Monitoreo Predictivo</p>
                    <p className="mt-0.5 text-sm font-bold text-forest-700">
                      {selectedAsset.hasMotor ? 'Telemetría IoT Activa' : 'No configurado'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="py-6 text-center text-sm italic text-ink-600">
                  {loadingAssets ? 'Cargando información del activo...' : 'Selecciona un activo para visualizar su ficha.'}
                </p>
              )}

              {selectedAsset?.extraSpecifications && (
                <div className="rounded-xl border border-sand-200 bg-surface p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase text-ink-600">Especificaciones Técnicas</p>
                  <p className="whitespace-pre-wrap text-sm text-ink-900">{selectedAsset.extraSpecifications}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
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
