// Lectura y escritura mínima de libros .xlsx (Office Open XML) sobre fflate.
// Solo texto y números en celdas: suficiente para plantillas de importación.
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const escapeXml = (value) => String(value)
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	// Caracteres de control no permitidos en XML 1.0.
	.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); // eslint-disable-line no-control-regex

const unescapeXml = (value) => value
	.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
	.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
	.replace(/&lt;/g, '<')
	.replace(/&gt;/g, '>')
	.replace(/&quot;/g, '"')
	.replace(/&apos;/g, "'")
	.replace(/&amp;/g, '&');

/** 0 → A, 25 → Z, 26 → AA */
export function columnName(index) {
	let name = '';
	let current = index + 1;
	while (current > 0) {
		const remainder = (current - 1) % 26;
		name = String.fromCharCode(65 + remainder) + name;
		current = Math.floor((current - 1) / 26);
	}
	return name;
}

/** "AB12" → 27 (índice de columna desde 0) */
export function columnIndex(reference) {
	const letters = /^[A-Z]+/i.exec(reference)?.[0].toUpperCase() || 'A';
	return [...letters].reduce((total, letter) => total * 26 + (letter.charCodeAt(0) - 64), 0) - 1;
}

function sheetXml({ rows, columnWidths = [], headerRows = 1, freezeHeader = true }) {
	const cols = columnWidths.length
		? `<cols>${columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
		: '';
	const pane = freezeHeader && headerRows > 0
		? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRows}" topLeftCell="A${headerRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
		: '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
	const body = rows.map((row, rowIndex) => {
		const cells = row.map((value, columnIndexValue) => {
			if (value === null || value === undefined || value === '') return '';
			const reference = `${columnName(columnIndexValue)}${rowIndex + 1}`;
			const style = rowIndex < headerRows ? ' s="1"' : ' s="2"';
			if (typeof value === 'number' && Number.isFinite(value)) {
				return `<c r="${reference}"${style}><v>${value}</v></c>`;
			}
			return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
		}).join('');
		return `<row r="${rowIndex + 1}">${cells}</row>`;
	}).join('');
	return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${body}</sheetData></worksheet>`;
}

const STYLES = `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E3D"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/**
 * Crea un .xlsx. sheets: [{ name, rows: (string|number)[][], columnWidths?, headerRows? }].
 * Devuelve los bytes del archivo.
 */
export function writeXlsx(sheets) {
	const files = {
		'[Content_Types].xml': strToU8(`${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`),
		'_rels/.rels': strToU8(`${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
		'xl/workbook.xml': strToU8(`${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
			.map((sheet, index) => `<sheet name="${escapeXml(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
			.join('')}</sheets></workbook>`),
		'xl/_rels/workbook.xml.rels': strToU8(`${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
			.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
			.join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
		'xl/styles.xml': strToU8(STYLES),
	};
	sheets.forEach((sheet, index) => {
		files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(sheetXml(sheet));
	});
	return zipSync(files, { level: 6 });
}

function textOf(fragment) {
	// Concatena todos los <t> (incluye texto enriquecido con varios <r>).
	const parts = [...fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => unescapeXml(match[1]));
	return parts.join('');
}

function attribute(tag, name) {
	return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
}

function resolveTarget(target) {
	const clean = target.replace(/^\//, '');
	return clean.startsWith('xl/') ? clean : `xl/${clean}`;
}

/**
 * Lee un .xlsx y devuelve { nombreHoja: filas[][] } con los valores como texto
 * (los números se devuelven como texto también, sin formato).
 */
export function readXlsx(data) {
	let files;
	try {
		files = unzipSync(data instanceof Uint8Array ? data : new Uint8Array(data));
	} catch {
		throw new Error('El archivo no es un libro de Excel (.xlsx) válido.');
	}
	const read = (path) => (files[path] ? strFromU8(files[path]) : null);
	const workbook = read('xl/workbook.xml');
	if (!workbook) throw new Error('El archivo no es un libro de Excel (.xlsx) válido.');

	const sharedXml = read('xl/sharedStrings.xml');
	const shared = sharedXml ? [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => textOf(match[1])) : [];
	const relsXml = read('xl/_rels/workbook.xml.rels') || '';
	const targets = Object.fromEntries([...relsXml.matchAll(/<Relationship\b[^>]*>/g)].map(([tag]) => [attribute(tag, 'Id'), attribute(tag, 'Target')]));

	const result = {};
	for (const [tag] of workbook.matchAll(/<sheet\b[^>]*\/?>/g)) {
		const name = unescapeXml(attribute(tag, 'name') || '');
		const relationId = attribute(tag, 'r:id');
		const sheetXmlText = targets[relationId] ? read(resolveTarget(targets[relationId])) : null;
		if (!sheetXmlText) continue;
		const rows = [];
		for (const rowMatch of sheetXmlText.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
			const rowAttributes = rowMatch[1] ?? rowMatch[3] ?? '';
			const rowNumber = Number(attribute(rowAttributes, 'r')) || rows.length + 1;
			const cells = [];
			for (const cellMatch of (rowMatch[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
				const cellAttributes = cellMatch[1];
				const content = cellMatch[2] || '';
				const reference = attribute(cellAttributes, 'r');
				const index = reference ? columnIndex(reference) : cells.length;
				const type = attribute(cellAttributes, 't');
				let value;
				if (type === 's') {
					value = shared[Number(/<v>([\s\S]*?)<\/v>/.exec(content)?.[1])] ?? '';
				} else if (type === 'inlineStr') {
					value = textOf(content);
				} else {
					const raw = /<v>([\s\S]*?)<\/v>/.exec(content)?.[1];
					value = raw === undefined ? '' : unescapeXml(raw);
					if (type === 'b') value = value === '1' ? 'TRUE' : 'FALSE';
				}
				cells[index] = value;
			}
			rows[rowNumber - 1] = Array.from(cells, (cell) => cell ?? '');
		}
		result[name] = Array.from(rows, (row) => row ?? []);
	}
	return result;
}
