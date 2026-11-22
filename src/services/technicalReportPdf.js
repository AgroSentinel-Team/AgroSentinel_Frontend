// Informe técnico de maquinaria en PDF (formato de fichas de diagnóstico).
// Solo depende de jsPDF: las fotos y logos llegan ya como dataURL.
import { jsPDF } from 'jspdf';
import { INVENTORY_CODE_STATUS_LABELS } from './assetSpecs';
import {
	classificationLabel,
	INTERVENTION_LABELS,
	isDisposalRecommendation,
	ORDER_STATUS_LABELS,
	PRIORITY_LABELS,
	RECOMMENDATION_LABELS,
} from './diagnosis';

const STATUS_LABELS = {
	OPERATIONAL: 'Operativo',
	OPERATIONAL_WITH_RESTRICTIONS: 'Operativo con restricciones',
	IN_REPAIR: 'En reparación',
	OUT_OF_SERVICE: 'Fuera de servicio',
	OBSOLETE: 'Obsoleto',
};

const COLORS = {
	title: [47, 84, 150],
	text: [25, 25, 25],
	muted: [90, 90, 90],
	labelFill: [226, 239, 218],
	border: [60, 60, 60],
	rule: [180, 180, 180],
};

const PAGE = { margin: 20, headerHeight: 24, footerHeight: 18 };
const NOT_REGISTERED = 'No registrado';

const assetCode = (asset) =>
	asset.inventoryCode || INVENTORY_CODE_STATUS_LABELS[asset.inventoryCodeStatus] || NOT_REGISTERED;

// ---------- Datos ----------

/** Filas de "Identificación del equipo": datos base, datos técnicos y estado. */
export function identificationRows(asset, diagnosis) {
	const rows = [];
	const push = (label, value, always = false) => {
		const text = value === null || value === undefined ? '' : String(value).trim();
		if (text || always) rows.push([label, text || NOT_REGISTERED]);
	};
	push('Equipo', asset.equipmentType || asset.categoryName, true);
	push('Marca', asset.brand, true);
	push('Modelo / Referencia', asset.model, true);
	push('Año', asset.manufactureYear);
	push('Serial', asset.serialNumber, true);
	(asset.specifications || []).forEach((spec) => push(spec.label, spec.displayValue ?? spec.value));
	push('Código de inventario', asset.inventoryCode || INVENTORY_CODE_STATUS_LABELS[asset.inventoryCodeStatus] || '', true);
	push('Ubicación', asset.location);
	push('Estado actual', diagnosis
		? classificationLabel(diagnosis.operationalCondition, diagnosis.recommendation)
		: STATUS_LABELS[asset.operationalStatus] || asset.operationalStatus, true);
	return rows;
}

export function recommendationText(diagnosis) {
	const detail = String(diagnosis.recommendationDetail || '').trim();
	const base = detail || `${RECOMMENDATION_LABELS[diagnosis.recommendation] || diagnosis.recommendation}.`;
	const sentence = /[.!?]$/.test(base) ? base : `${base}.`;
	const mentionsDisposal = /baja/i.test(sentence);
	return isDisposalRecommendation(diagnosis.recommendation) || mentionsDisposal
		? sentence
		: `${sentence} No se recomienda la baja.`;
}

/** Etiqueta para la matriz: clasificación vigente o, sin diagnóstico, el estado operativo. */
export function matrixClassification(asset, diagnosis) {
	if (diagnosis) return classificationLabel(diagnosis.operationalCondition, diagnosis.recommendation);
	return `${(STATUS_LABELS[asset.operationalStatus] || 'Sin estado').toUpperCase()} – SIN DIAGNÓSTICO`;
}

/** Resumen por clasificación para el informe y la pantalla. */
export function classificationSummary(entries) {
	const counts = new Map();
	entries.forEach(({ asset, diagnosis }) => {
		const label = matrixClassification(asset, diagnosis);
		counts.set(label, (counts.get(label) || 0) + 1);
	});
	return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

/** Necesidades abiertas de los diagnósticos vigentes, por prioridad y seguridad. */
export function openNeeds(entries) {
	const rank = { ALTA: 0, MEDIA: 1, BAJA: 2 };
	const rows = [];
	entries.forEach(({ asset, diagnosis }) => {
		(diagnosis?.needs || [])
			.filter((need) => need.status === 'PENDING' || need.status === 'IN_PROGRESS')
			.forEach((need) => rows.push({ asset, need }));
	});
	return rows.sort((left, right) =>
		rank[left.need.priority] - rank[right.need.priority]
		|| Number(right.need.safetyRelated) - Number(left.need.safetyRelated)
		|| left.asset.name.localeCompare(right.asset.name, 'es'));
}

const splitLines = (text) => String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);

function formatDate(value) {
	if (!value) return '';
	const [year, month, day] = String(value).slice(0, 10).split('-');
	return `${day}/${month}/${year}`;
}

export function reportFileName(prefix, date = new Date()) {
	const stamp = date.toLocaleDateString('en-CA');
	return `${prefix}_${stamp}.pdf`;
}

// ---------- Motor de páginas ----------

function imageFormat(dataUrl) {
	const match = /^data:image\/(png|jpe?g)/i.exec(dataUrl || '');
	if (!match) return null;
	return match[1].toLowerCase() === 'png' ? 'PNG' : 'JPEG';
}

class ReportWriter {
	constructor(settings, orientation = 'portrait') {
		this.settings = settings;
		this.doc = new jsPDF({ unit: 'mm', format: 'a4', orientation });
		this.width = this.doc.internal.pageSize.getWidth();
		this.height = this.doc.internal.pageSize.getHeight();
		this.contentWidth = this.width - PAGE.margin * 2;
		this.y = PAGE.margin;
		this.started = false;
	}

	newPage() {
		if (this.started) this.doc.addPage();
		this.started = true;
		this.drawHeader();
		this.y = PAGE.headerHeight + 8;
	}

	get bottom() {
		return this.height - PAGE.footerHeight - 4;
	}

	ensure(space) {
		if (!this.started || this.y + space > this.bottom) this.newPage();
	}

	drawLogo(dataUrl, x, y, maxWidth, maxHeight) {
		const format = imageFormat(dataUrl);
		if (!format) return 0;
		try {
			const { width, height } = this.doc.getImageProperties(dataUrl);
			const scale = Math.min(maxWidth / width, maxHeight / height);
			this.doc.addImage(dataUrl, format, x, y, width * scale, height * scale);
			return width * scale;
		} catch {
			return 0;
		}
	}

	drawHeader() {
		const { logoPrimary, logoSecondary, institutionName, unitName } = this.settings;
		const logoWidth = this.drawLogo(logoPrimary, PAGE.margin, 8, 55, 14);
		const secondX = logoWidth ? PAGE.margin + logoWidth + 5 : PAGE.margin;
		const secondWidth = this.drawLogo(logoSecondary, secondX, 8, 45, 14);
		if (!logoWidth && !secondWidth && (institutionName || unitName)) {
			this.doc.setFont('helvetica', 'bold');
			this.doc.setFontSize(10);
			this.doc.setTextColor(...COLORS.text);
			if (institutionName) this.doc.text(institutionName, PAGE.margin, 13);
			this.doc.setFont('helvetica', 'normal');
			this.doc.setFontSize(8);
			this.doc.setTextColor(...COLORS.muted);
			if (unitName) this.doc.text(unitName, PAGE.margin, 18);
		}
		this.doc.setDrawColor(...COLORS.rule);
		this.doc.setLineWidth(0.3);
		this.doc.line(PAGE.margin, PAGE.headerHeight, this.width - PAGE.margin, PAGE.headerHeight);
	}

	/** Pie con el texto institucional y la numeración (se dibuja al final). */
	drawFooters() {
		const total = this.doc.getNumberOfPages();
		const footerLines = splitLines(this.settings.footerText).slice(0, 4);
		for (let page = 1; page <= total; page += 1) {
			this.doc.setPage(page);
			const top = this.height - PAGE.footerHeight;
			this.doc.setDrawColor(...COLORS.rule);
			this.doc.line(PAGE.margin, top, this.width - PAGE.margin, top);
			this.doc.setFont('helvetica', 'normal');
			this.doc.setFontSize(7);
			this.doc.setTextColor(...COLORS.muted);
			footerLines.forEach((line, index) => this.doc.text(line, PAGE.margin, top + 4 + index * 3));
			this.doc.text(`Página ${page} de ${total}`, this.width - PAGE.margin, top + 4, { align: 'right' });
		}
	}

	sectionTitle(text, size = 13) {
		this.ensure(16);
		// Aire antes del título, salvo al comienzo de la página.
		if (this.y > PAGE.headerHeight + 10) this.y += 3;
		this.doc.setFont('helvetica', 'bold');
		this.doc.setFontSize(size);
		this.doc.setTextColor(...COLORS.title);
		this.doc.text(text, PAGE.margin, this.y);
		this.y += size * 0.45 + 1.5;
	}

	paragraph(text, { size = 10, style = 'normal', align = 'justify', indent = 0 } = {}) {
		if (!text) return;
		this.doc.setFont('helvetica', style);
		this.doc.setFontSize(size);
		this.doc.setTextColor(...COLORS.text);
		const lineHeight = size * 0.45;
		String(text).split('\n').filter((block) => block.trim()).forEach((block) => {
			const lines = this.doc.splitTextToSize(block.trim(), this.contentWidth - indent);
			lines.forEach((line, index) => {
				this.ensure(lineHeight + 1);
				const last = index === lines.length - 1;
				this.doc.text(line, PAGE.margin + indent, this.y, {
					align: align === 'justify' && !last ? 'justify' : 'left',
					maxWidth: this.contentWidth - indent,
				});
				this.y += lineHeight;
			});
			this.y += 1.5;
		});
		this.y += 1;
	}

	labeledLine(label, value) {
		this.ensure(8);
		this.doc.setFontSize(10);
		this.doc.setFont('helvetica', 'bold');
		this.doc.setTextColor(...COLORS.text);
		const labelText = `${label}: `;
		const labelWidth = this.doc.getTextWidth(labelText);
		this.doc.text(labelText, PAGE.margin, this.y);
		this.doc.setFont('helvetica', 'normal');
		const lines = this.doc.splitTextToSize(String(value), this.contentWidth - labelWidth);
		this.doc.text(lines[0], PAGE.margin + labelWidth, this.y);
		this.y += 4.5;
		if (lines.length > 1) {
			this.paragraph(lines.slice(1).join(' '), { align: 'left' });
		} else {
			this.y += 1.5;
		}
	}

	bullets(items) {
		items.forEach((item) => {
			this.doc.setFont('helvetica', 'normal');
			this.doc.setFontSize(10);
			const lines = this.doc.splitTextToSize(item, this.contentWidth - 7);
			this.ensure(lines.length * 4.5 + 1);
			this.doc.setTextColor(...COLORS.text);
			this.doc.text('•', PAGE.margin + 2, this.y);
			this.doc.text(lines, PAGE.margin + 7, this.y);
			this.y += lines.length * 4.5 + 1;
		});
		this.y += 2;
	}

	/**
	 * Tabla con bordes. columns: [{ header, width (fracción), fill? }]. Las filas se parten
	 * entre páginas repitiendo el encabezado.
	 */
	table(columns, rows, { headerFill = COLORS.labelFill, fontSize = 9, header = true, firstColumnFill = false } = {}) {
		const widths = columns.map((column) => column.width * this.contentWidth);
		const padding = 1.8;
		const lineHeight = fontSize * 0.42;
		const drawRow = (cells, { bold = false, fill = null } = {}) => {
			this.doc.setFontSize(fontSize);
			const wrapped = cells.map((cell, index) => {
				this.doc.setFont('helvetica', bold || (firstColumnFill && index === 0) ? 'bold' : 'normal');
				return this.doc.splitTextToSize(String(cell ?? ''), widths[index] - padding * 2);
			});
			const rowHeight = Math.max(7, Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + padding * 2 + 0.5);
			return { wrapped, rowHeight, bold, fill };
		};
		const paint = ({ wrapped, rowHeight, bold, fill }) => {
			let x = PAGE.margin;
			wrapped.forEach((lines, index) => {
				const cellFill = fill || (firstColumnFill && index === 0 ? COLORS.labelFill : null);
				if (cellFill) {
					this.doc.setFillColor(...cellFill);
					this.doc.rect(x, this.y, widths[index], rowHeight, 'F');
				}
				this.doc.setDrawColor(...COLORS.border);
				this.doc.setLineWidth(0.2);
				this.doc.rect(x, this.y, widths[index], rowHeight, 'S');
				this.doc.setFont('helvetica', bold || (firstColumnFill && index === 0) ? 'bold' : 'normal');
				this.doc.setFontSize(fontSize);
				this.doc.setTextColor(...COLORS.text);
				this.doc.text(lines, x + padding, this.y + padding + lineHeight * 0.8);
				x += widths[index];
			});
			this.y += rowHeight;
		};
		const headerRow = header ? drawRow(columns.map((column) => column.header), { bold: true, fill: headerFill }) : null;
		if (headerRow) {
			this.ensure(headerRow.rowHeight + 8);
			paint(headerRow);
		}
		rows.forEach((cells) => {
			const row = drawRow(cells);
			if (this.y + row.rowHeight > this.bottom) {
				this.newPage();
				if (headerRow) paint(headerRow);
			}
			paint(row);
		});
		this.y += 4;
	}

	photoHeight(photo) {
		return photo.height * Math.min(Math.min(120, this.contentWidth) / photo.width, 85 / photo.height);
	}

	photo(photo, caption) {
		if (!photo?.dataUrl) return false;
		const maxWidth = Math.min(120, this.contentWidth);
		const maxHeight = 85;
		const scale = Math.min(maxWidth / photo.width, maxHeight / photo.height);
		const width = photo.width * scale;
		const height = photo.height * scale;
		this.ensure(height + 12);
		this.doc.addImage(photo.dataUrl, imageFormat(photo.dataUrl) || 'JPEG', (this.width - width) / 2, this.y, width, height);
		this.y += height + 5;
		if (caption) {
			this.doc.setFont('helvetica', 'italic');
			this.doc.setFontSize(8);
			this.doc.setTextColor(...COLORS.muted);
			this.doc.text(caption, this.width / 2, this.y, { align: 'center' });
			this.y += 6;
		}
		return true;
	}

	centeredTitle(text, size, color = COLORS.text) {
		this.doc.setFont('helvetica', 'bold');
		this.doc.setFontSize(size);
		this.doc.setTextColor(...color);
		const lines = this.doc.splitTextToSize(text, this.contentWidth);
		this.ensure(lines.length * size * 0.45 + 2);
		this.doc.text(lines, this.width / 2, this.y, { align: 'center' });
		this.y += lines.length * size * 0.45 + 2;
	}
}

// ---------- Secciones ----------

function writeAssetSheet(writer, { asset, diagnosis, photo }, number) {
	writer.newPage();
	writer.centeredTitle(`FICHA TÉCNICA DE DIAGNÓSTICO No. ${number}`, 14, COLORS.title);
	writer.centeredTitle(asset.name.toUpperCase(), 13);
	writer.y += 3;

	let section = 0;
	const title = (text) => writer.sectionTitle(`${++section}. ${text}`);

	title('Identificación del equipo');
	writer.table(
		[{ header: '', width: 0.5 }, { header: '', width: 0.5 }],
		identificationRows(asset, diagnosis),
		{ header: false, firstColumnFill: true },
	);

	if (photo?.dataUrl) {
		// El título y la foto van juntos en la misma página.
		writer.ensure(writer.photoHeight(photo) + 26);
		title('Registro fotográfico');
		writer.photo(photo, writer.settings.photoCaption);
	}

	if (!diagnosis) {
		title('Diagnóstico');
		writer.paragraph('Este equipo aún no tiene una ficha de diagnóstico registrada.', { style: 'italic' });
		return;
	}

	if (diagnosis.currentStateDescription) {
		title('Descripción del estado actual');
		writer.paragraph(diagnosis.currentStateDescription);
	}
	if (diagnosis.technicalDiagnosis) {
		title('Diagnóstico técnico');
		writer.paragraph(diagnosis.technicalDiagnosis);
	}
	if (diagnosis.needs?.length) {
		title('Necesidades identificadas');
		writer.table(
			[
				{ header: 'No.', width: 0.08 },
				{ header: 'Necesidad', width: 0.42 },
				{ header: 'Tipo de intervención', width: 0.3 },
				{ header: 'Prioridad', width: 0.2 },
			],
			diagnosis.needs.map((need, index) => [
				index + 1,
				need.safetyRelated ? `${need.description} (seguridad)` : need.description,
				need.interventionTypes.map((type) => INTERVENTION_LABELS[type] || type).join(' / '),
				PRIORITY_LABELS[need.priority] || need.priority,
			]),
		);
	}
	if (diagnosis.technicalConcept) {
		title('Concepto técnico');
		writer.paragraph(diagnosis.technicalConcept);
	}
	writer.ensure(diagnosis.disposalSupport ? 40 : 28);
	title('Clasificación y recomendación');
	writer.labeledLine('Clasificación', classificationLabel(diagnosis.operationalCondition, diagnosis.recommendation));
	writer.labeledLine('Recomendación', recommendationText(diagnosis));
	if (diagnosis.disposalSupport) writer.labeledLine('Soporte de la evaluación', diagnosis.disposalSupport);
	if (diagnosis.conclusion) {
		title('Conclusión');
		writer.paragraph(diagnosis.conclusion);
	}
	writer.doc.setFont('helvetica', 'italic');
	writer.doc.setFontSize(8);
	writer.doc.setTextColor(...COLORS.muted);
	writer.ensure(6);
	writer.doc.text(
		`Diagnóstico registrado el ${formatDate(diagnosis.diagnosedOn)}${diagnosis.inspectorName ? ` por ${diagnosis.inspectorName}` : ''}.`,
		PAGE.margin,
		writer.y,
	);
	writer.y += 6;
}

function writeMatrix(writer, entries, { newPage = true } = {}) {
	if (newPage) writer.newPage();
	writer.sectionTitle('MATRIZ CONSOLIDADA DEL ESTADO DE LOS EQUIPOS', 13);
	writer.table(
		[
			{ header: 'No.', width: 0.08 },
			{ header: 'Equipo', width: 0.36 },
			{ header: 'Código', width: 0.2 },
			{ header: 'Clasificación', width: 0.36 },
		],
		entries.map(({ asset, diagnosis }, index) => [
			index + 1,
			asset.name,
			assetCode(asset),
			matrixClassification(asset, diagnosis),
		]),
	);
	writer.sectionTitle('Resumen por clasificación', 11);
	writer.table(
		[{ header: 'Clasificación', width: 0.8 }, { header: 'Equipos', width: 0.2 }],
		classificationSummary(entries).map(([label, count]) => [label, count]),
	);
}

function writeSignature(writer) {
	const { preparedBy, preparedByRole } = writer.settings;
	if (!preparedBy && !preparedByRole) return;
	writer.ensure(22);
	writer.y += 8;
	writer.doc.setFont('helvetica', 'italic');
	writer.doc.setFontSize(10);
	writer.doc.setTextColor(...COLORS.text);
	writer.doc.text('Elaboró: ', PAGE.margin, writer.y);
	if (preparedBy) {
		writer.doc.setFont('helvetica', 'bolditalic');
		writer.doc.text(preparedBy, PAGE.margin + writer.doc.getTextWidth('Elaboró: '), writer.y);
	}
	writer.y += 5;
	if (preparedByRole) {
		writer.doc.setFont('helvetica', 'italic');
		writer.doc.text(preparedByRole, PAGE.margin, writer.y);
		writer.y += 5;
	}
}

function writeCover(writer, date) {
	const { settings } = writer;
	writer.newPage();
	writer.y = 60;
	if (settings.institutionName) writer.centeredTitle(settings.institutionName.toUpperCase(), 18);
	if (settings.unitName) writer.centeredTitle(settings.unitName.toUpperCase(), 15);
	writer.y = 115;
	if (settings.farmName) writer.centeredTitle(settings.farmName.toUpperCase(), 16);
	writer.y = 160;
	writer.centeredTitle(settings.reportTitle.toUpperCase(), 17);
	writer.y = 235;
	writer.doc.setFont('helvetica', 'normal');
	writer.doc.setFontSize(10);
	writer.doc.setTextColor(...COLORS.muted);
	writer.doc.text(date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }), writer.width / 2, writer.y, { align: 'center' });
}

// ---------- Documentos ----------

/** Ficha técnica de diagnóstico de un solo equipo. */
export function buildAssetSheetPdf(entry, settings, number = 1) {
	const writer = new ReportWriter(settings);
	writeAssetSheet(writer, entry, number);
	writeSignature(writer);
	writer.drawFooters();
	return writer.doc;
}

/** Matriz consolidada del estado de los equipos. */
export function buildMatrixPdf(entries, settings) {
	const writer = new ReportWriter(settings);
	writer.newPage();
	writer.centeredTitle(settings.reportTitle.toUpperCase(), 12);
	writer.y += 4;
	writeMatrix(writer, entries, { newPage: false });
	writeSignature(writer);
	writer.drawFooters();
	return writer.doc;
}

/** Necesidades abiertas de todos los equipos, para planear compras y trabajos. */
export function buildOpenNeedsPdf(entries, settings) {
	const writer = new ReportWriter(settings, 'landscape');
	writer.newPage();
	writer.sectionTitle('NECESIDADES PENDIENTES POR PRIORIDAD', 13);
	const rows = openNeeds(entries);
	if (!rows.length) {
		writer.paragraph('No hay necesidades pendientes en los diagnósticos vigentes.', { style: 'italic' });
	} else {
		writer.table(
			[
				{ header: 'No.', width: 0.05 },
				{ header: 'Equipo', width: 0.2 },
				{ header: 'Código', width: 0.12 },
				{ header: 'Necesidad', width: 0.25 },
				{ header: 'Tipo', width: 0.13 },
				{ header: 'Prioridad', width: 0.08 },
				{ header: 'Seguridad', width: 0.07 },
				{ header: 'Orden', width: 0.1 },
			],
			rows.map(({ asset, need }, index) => [
				index + 1,
				asset.name,
				assetCode(asset),
				need.description,
				need.interventionTypes.map((type) => INTERVENTION_LABELS[type] || type).join(' / '),
				PRIORITY_LABELS[need.priority] || need.priority,
				need.safetyRelated ? 'Sí' : 'No',
				need.orderLabel ? `${need.orderLabel} (${ORDER_STATUS_LABELS[need.orderStatus] || need.orderStatus})` : 'Sin orden',
			]),
			{ fontSize: 8 },
		);
	}
	writer.drawFooters();
	return writer.doc;
}

/** Informe completo: portada, introducción, fichas, matriz, observaciones y firma. */
export function buildFullReportPdf(entries, settings, date = new Date()) {
	const writer = new ReportWriter(settings);
	writeCover(writer, date);

	writer.newPage();
	writer.sectionTitle('INTRODUCCIÓN');
	writer.paragraph(settings.introduction);
	writer.sectionTitle('OBJETIVO GENERAL');
	writer.paragraph(settings.generalObjective);
	const specific = splitLines(settings.specificObjectives);
	if (specific.length) {
		writer.sectionTitle('OBJETIVOS ESPECÍFICOS');
		writer.bullets(specific);
	}
	writer.sectionTitle('METODOLOGÍA');
	writer.paragraph(settings.methodology);

	entries.forEach((entry, index) => writeAssetSheet(writer, entry, index + 1));
	writeMatrix(writer, entries);

	if (settings.finalObservation) {
		writer.y += 4;
		writer.sectionTitle('OBSERVACIÓN FINAL SOBRE LOS EQUIPOS PARA BAJA');
		writer.paragraph(settings.finalObservation);
	}
	const recommendations = splitLines(settings.generalRecommendations);
	if (recommendations.length) {
		writer.sectionTitle('RECOMENDACIONES GENERALES');
		writer.bullets(recommendations);
	}
	writeSignature(writer);
	writer.drawFooters();
	return writer.doc;
}
