import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  CalendarDays,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  RefreshCw,
  ScrollText,
  Wrench,
} from 'lucide-react';
import { getInventoryItems, getInventoryMovements, getInventoryTasks } from '../../services/inventoryService';

const SECTIONS = [
  { id: 'inventory', label: 'Inventario actual', description: 'Existencias y alertas de stock.', icon: Package },
  { id: 'movements', label: 'Movimientos', description: 'Entradas y salidas en el período.', icon: ScrollText },
  { id: 'tasks', label: 'Tareas del turno', description: 'Tareas creadas durante el período.', icon: Wrench },
];

const fieldClass = 'mt-1 w-full rounded-lg border border-[#36556f] bg-[#102a3d] px-3 py-2.5 text-[12px] text-white outline-none transition focus:border-cyan-400';

function getErrorMessage(error) {
  return error.response?.data?.detail
    || error.response?.data?.message
    || error.message
    || 'No se pudieron cargar los datos del reporte.';
}

function dateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const csv = rows.map((row) => row.map((value) => {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
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
    const cells = row.map((value) => pdf.splitTextToSize(
      String(value ?? '—'),
      columnWidth - 4,
    ));
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
  const [reportData, setReportData] = useState(null);
  const [selectedSections, setSelectedSections] = useState(['inventory', 'movements']);
  const [format, setFormat] = useState('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const currentReport = reportData?.scopeKey === scopeKey ? reportData : null;
  const items = currentReport?.items ?? [];
  const movements = currentReport?.movements ?? [];
  const tasks = currentReport?.tasks ?? [];
  const error = currentReport?.error ?? '';
  const loading = currentReport === null;
  const invalidDateRange = Boolean(startDate && endDate && startDate > endDate);
  const muted = dark ? 'text-slate-400' : 'text-slate-500';

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
        }
      })
      .catch((loadError) => {
        if (active) {
          setReportData({
            scopeKey,
            items: [],
            movements: [],
            tasks: [],
            error: getErrorMessage(loadError),
          });
        }
      });
    return () => { active = false; };
  }, [groupId, scopeKey, scoped]);

  const filteredMovements = movements.filter((movement) => {
    const date = dateKey(movement.fecha);
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  });
  const filteredTasks = tasks.filter((task) => {
    const date = dateKey(task.createdAt);
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  });

  const toggleSection = (section) => {
    setSelectedSections((current) => current.includes(section)
      ? current.filter((item) => item !== section)
      : [...current, section]);
  };

  const exportReport = () => {
    if (selectedSections.length === 0 || invalidDateRange || loading || error) return;
    const filename = `agrosentinel-reporte-${makeFilenameSuffix(groupName)}-${startDate || 'inicio'}-${endDate || 'hoy'}`;
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
      `${groupName || 'Bodega central'}  ·  Período: ${startDate || 'Inicio'} — ${endDate || 'Hoy'}  ·  Generado: ${new Date().toLocaleString('es-CO')}`,
      14,
      33,
      { maxWidth: pageWidth - 28 },
    );
    const state = { y: 49 };
    sections.forEach((section) => addPdfTable(pdf, state, section.title, section.headers, section.rows));
    pdf.save(`${filename}.pdf`);
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Centro de exportación</p>
          <h1 className="mt-1 text-xl font-semibold text-white">Reportes de almacén</h1>
          <p className={`mt-1 text-[12px] ${muted}`}>Configura el período, el contenido y el formato para {groupName || 'Bodega central'}.</p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-medium text-cyan-100">
          {loading ? 'Cargando datos...' : groupName || 'Bodega central'}
        </span>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-[12px] text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-5 shadow-lg shadow-black/10">
          <div className="mb-4 flex items-start gap-3">
            <span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><FileText size={18} /></span>
            <div>
              <h2 className="text-[14px] font-semibold text-white">Contenido del reporte</h2>
              <p className={`mt-1 text-[11px] ${muted}`}>Selecciona una o varias secciones.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const selected = selectedSections.includes(section.id);
              const count = section.id === 'inventory' ? items.length
                : section.id === 'movements' ? filteredMovements.length
                  : filteredTasks.length;
              const unit = section.id === 'inventory' ? 'productos'
                : section.id === 'movements' ? 'movimientos'
                  : 'tareas';
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  aria-pressed={selected}
                  className={`min-h-36 rounded-lg border p-4 text-left transition ${selected ? 'border-cyan-400/60 bg-[#12394b] ring-1 ring-cyan-400/20' : 'border-[#2d4055] bg-[#102a3d] hover:border-[#45647a]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Icon size={17} className={selected ? 'text-cyan-300' : 'text-slate-400'} />
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? 'border-cyan-400 bg-cyan-500 text-white' : 'border-[#557087] text-transparent'}`}>
                      {selected && <Check size={13} />}
                    </span>
                  </div>
                  <p className="mt-4 text-[12px] font-semibold text-white">{section.label}</p>
                  <p className={`mt-1 min-h-8 text-[10px] leading-4 ${muted}`}>{section.description}</p>
                  <p className="mt-2 text-[10px] font-medium text-cyan-200">{loading ? '—' : `${count} ${unit}`}</p>
                </button>
              );
            })}
          </div>
          <p className={`mt-3 text-[10px] ${muted}`}>La fecha filtra movimientos y tareas. El inventario corresponde a las existencias actuales.</p>
        </article>

        <aside className="space-y-4">
          <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays size={17} className="text-cyan-300" />
              <h2 className="text-[14px] font-semibold text-white">Período</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block text-[11px] text-slate-300">
                Desde
                <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className={fieldClass} />
              </label>
              <label className="block text-[11px] text-slate-300">
                Hasta
                <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className={fieldClass} />
              </label>
            </div>
            {invalidDateRange && <p role="alert" className="mt-2 text-[10px] text-red-300">La fecha inicial debe ser anterior a la fecha final.</p>}
            <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }} className="mt-3 text-[10px] font-medium text-cyan-300 hover:text-cyan-200">
              Limpiar fechas
            </button>
          </article>

          <article className="rounded-xl border border-[#2d4055] bg-[#13293a] p-5">
            <div className="mb-4 flex items-center gap-2">
              {format === 'pdf' ? <FileText size={17} className="text-cyan-300" /> : <FileSpreadsheet size={17} className="text-emerald-300" />}
              <h2 className="text-[14px] font-semibold text-white">Formato de descarga</h2>
            </div>
            <label className="block text-[11px] text-slate-300">
              Formato
              <select value={format} onChange={(event) => setFormat(event.target.value)} className={fieldClass}>
                <option value="pdf">PDF · Documento listo para imprimir</option>
                <option value="csv">CSV · Hoja de cálculo</option>
              </select>
            </label>
            <button
              type="button"
              disabled={loading || Boolean(error) || selectedSections.length === 0 || invalidDateRange}
              onClick={exportReport}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-[12px] font-semibold text-white shadow-md shadow-cyan-950/30 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
              {loading ? 'Cargando datos...' : `Descargar ${format.toUpperCase()}`}
            </button>
            {selectedSections.length === 0 && <p className="mt-2 text-center text-[10px] text-amber-200">Selecciona al menos una sección.</p>}
          </article>
        </aside>
      </div>
    </section>
  );
}
