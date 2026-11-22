// Importación masiva de activos y diagnósticos desde una plantilla de Excel.
// Sin React ni llamadas a la API: lee, valida y arma los payloads. (Imports con .js
// explícito para poder usarlo también desde scripts de Node.)
import { readXlsx, writeXlsx } from './xlsx.js';
import { INVENTORY_CODE_STATUS_LABELS, isNumeric, normalizeKey, serialLooksLikeYear } from './assetSpecs.js';
import { allowedRecommendations, classificationLabel, INTERVENTION_LABELS } from './diagnosis.js';

export const SHEETS = { assets: 'Equipos', needs: 'Necesidades', help: 'Instrucciones', values: 'Valores' };

/** Columnas de la hoja "Equipos". `match` es el inicio del encabezado (sin tildes ni mayúsculas). */
export const ASSET_COLUMNS = [
	{ key: 'no', header: 'No.', width: 6, exact: 'no' },
	{ key: 'name', header: 'Nombre *', width: 34, match: 'nombre' },
	{ key: 'category', header: 'Categoría *', width: 26, match: 'categoria' },
	{ key: 'family', header: 'Plantilla (si la categoría es nueva)', width: 24, match: 'plantilla' },
	{ key: 'equipmentType', header: 'Tipo de equipo', width: 24, match: 'tipo_de_equipo' },
	{ key: 'brand', header: 'Marca', width: 18, match: 'marca' },
	{ key: 'model', header: 'Modelo / Referencia', width: 18, match: 'modelo' },
	{ key: 'year', header: 'Año', width: 8, match: 'ano' },
	{ key: 'serial', header: 'Serial', width: 20, match: 'serial' },
	{ key: 'inventoryCode', header: 'Código de inventario', width: 18, match: 'codigo_de_inventario' },
	{ key: 'noCodeReason', header: 'Sin código porque', width: 22, match: 'sin_codigo' },
	{ key: 'location', header: 'Ubicación', width: 22, match: 'ubicacion' },
	{ key: 'responsible', header: 'Responsable (nombre o correo)', width: 24, match: 'responsable' },
	{ key: 'hasMotor', header: 'Tiene motor (Sí/No)', width: 12, match: 'tiene_motor' },
	{ key: 'specs', header: 'Datos técnicos (uno por línea → Dato: valor)', width: 44, match: 'datos_tecnicos' },
	{ key: 'notes', header: 'Observaciones', width: 30, match: 'observaciones' },
	{ key: 'diagnosedOn', header: 'Fecha del diagnóstico (AAAA-MM-DD)', width: 16, match: 'fecha' },
	{ key: 'classification', header: 'Clasificación', width: 40, match: 'clasificacion' },
	{ key: 'currentState', header: 'Descripción del estado actual', width: 40, match: 'descripcion' },
	{ key: 'technicalDiagnosis', header: 'Diagnóstico técnico', width: 44, match: 'diagnostico_tecnico' },
	{ key: 'technicalConcept', header: 'Concepto técnico', width: 40, match: 'concepto' },
	{ key: 'recommendationDetail', header: 'Recomendación', width: 40, match: 'recomendacion' },
	{ key: 'conclusion', header: 'Conclusión', width: 40, match: 'conclusion' },
	{ key: 'disposalSupport', header: 'Soporte de la evaluación (si se recomienda la baja)', width: 36, match: 'soporte' },
];

export const NEED_COLUMNS = [
	{ key: 'assetNo', header: 'No. equipo *', width: 10, match: 'no_equipo' },
	{ key: 'description', header: 'Necesidad *', width: 40, match: 'necesidad' },
	{ key: 'types', header: 'Tipo de intervención', width: 28, match: 'tipo' },
	{ key: 'priority', header: 'Prioridad', width: 12, match: 'prioridad' },
	{ key: 'safety', header: 'Seguridad (Sí/No)', width: 14, match: 'seguridad' },
];

export const CLASSIFICATION_EXAMPLES = [
	'OPERATIVO – BUEN ESTADO',
	'OPERATIVO – REQUIERE MANTENIMIENTO',
	'EN REPARACIÓN',
	'FUERA DE SERVICIO – RECUPERABLE',
	'FUERA DE SERVICIO – PENDIENTE DE EVALUACIÓN',
	'FUERA DE SERVICIO – RECOMENDADO PARA EVALUACIÓN DE BAJA',
	'FUERA DE SERVICIO – OBSOLETO – RECOMENDADO PARA BAJA',
];

const PRIORITY_ALIASES = { alta: 'ALTA', critica: 'ALTA', urgente: 'ALTA', media: 'MEDIA', baja: 'BAJA' };

// Palabras de "Tipo de intervención" tal como suelen escribirse en los informes.
const INTERVENTION_ALIASES = [
	['preventiv', 'PREVENTIVE'],
	['correctiv', 'CORRECTIVE'],
	['diagnostic', 'DIAGNOSTIC'],
	['evaluacion', 'DIAGNOSTIC'],
	['verificacion', 'VERIFICATION'],
	['prueba', 'VERIFICATION'],
	['calibracion', 'CALIBRATION'],
	['tecnico_economic', 'TECHNICAL_ECONOMIC'],
	['economic', 'TECHNICAL_ECONOMIC'],
	['administrativ', 'ADMINISTRATIVE'],
	['patrimonial', 'PATRIMONIAL'],
	['tecnico', 'DIAGNOSTIC'],
];

const NO_CODE_REASONS = {
	pendiente: 'PENDING',
	pendiente_de_asignacion: 'PENDING',
	no_asignado: 'PENDING',
	no_suministrado: 'NOT_PROVIDED',
	no_suministrada: 'NOT_PROVIDED',
};

const clean = (value) => String(value ?? '').replace(/\r\n?/g, '\n').trim();

// ---------- Interpretación de valores ----------

/** "FUERA DE SERVICIO – RECUPERABLE" → { condition: 'OUT_OF_SERVICE', recommendation: 'RECOVER' } */
export function parseClassification(text) {
	const value = normalizeKey(text);
	if (!value) return null;
	let condition = null;
	if (value.includes('obsolet')) condition = 'OBSOLETE';
	else if (value.includes('fuera_de_servicio') || value.includes('no_funcional') || value.includes('no_operativ')) condition = 'OUT_OF_SERVICE';
	else if (value.includes('en_reparacion')) condition = 'IN_REPAIR';
	else if (value.includes('operativ') || value.includes('buen_estado') || value.includes('funcional')) {
		condition = value.includes('requiere') || value.includes('restriccion') ? 'OPERATIONAL_WITH_RESTRICTIONS' : 'OPERATIONAL';
	}
	if (!condition) return null;

	let recommendation = 'KEEP';
	if (value.includes('baja')) {
		recommendation = value.includes('evaluacion') ? 'EVALUATE_DISPOSAL' : 'RECOMMENDED_DISPOSAL';
	} else if (value.includes('pendiente_de_evaluacion') || value.includes('pendiente_evaluacion')) {
		recommendation = 'PENDING_EVALUATION';
	} else if (value.includes('recuperable') || value.includes('recuperar')) {
		recommendation = 'RECOVER';
	}
	return { condition, recommendation };
}

/** "Correctivo/preventivo" → ['CORRECTIVE', 'PREVENTIVE']; desconocidos en `unknown`. */
export function parseInterventions(text) {
	const types = [];
	const unknown = [];
	clean(text).split(/[/,;+|]| y /i).map((part) => normalizeKey(part)).filter(Boolean).forEach((part) => {
		const found = INTERVENTION_ALIASES.find(([alias]) => part.includes(alias));
		if (!found) {
			const byLabel = Object.entries(INTERVENTION_LABELS).find(([, label]) => normalizeKey(label) === part);
			if (byLabel) types.push(byLabel[0]);
			else unknown.push(part);
		} else {
			types.push(found[1]);
		}
	});
	return { types: [...new Set(types)], unknown };
}

export function parsePriority(text) {
	return PRIORITY_ALIASES[normalizeKey(text)] || null;
}

export function parseYesNo(text) {
	const value = normalizeKey(text);
	if (['si', 's', 'yes', 'true', 'x', '1'].includes(value)) return true;
	if (['no', 'n', 'false', '0', ''].includes(value)) return false;
	return null;
}

/** Acepta AAAA-MM-DD, DD/MM/AAAA y el número de serie de fecha de Excel. */
export function parseDate(text) {
	const value = clean(text);
	if (!value) return { value: null };
	let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
	if (match) return { value: `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` };
	match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
	if (match) return { value: `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` };
	if (/^\d{5}(\.\d+)?$/.test(value)) {
		const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(value)) * 86400000);
		return { value: date.toISOString().slice(0, 10) };
	}
	return { value: null, error: `Fecha "${value}" no reconocida. Usa AAAA-MM-DD.` };
}

/** "Potencia: 86 HP\nMotor: Perkins" → [{ label, value }] */
export function parseSpecs(text) {
	const specs = [];
	const invalid = [];
	clean(text).split(/\n|;/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
		const separator = line.indexOf(':');
		if (separator <= 0 || !line.slice(separator + 1).trim()) {
			invalid.push(line);
			return;
		}
		specs.push({ label: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() });
	});
	return { specs, invalid };
}

/** "86 HP" con unidad HP → "86"; "2.200" (miles) → "2200". null si no es un número. */
export function numericValue(value, unit) {
	let text = clean(value);
	if (unit && normalizeKey(text).endsWith(normalizeKey(unit))) {
		text = text.slice(0, text.length - unit.length).trim();
	}
	if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, '');
	return isNumeric(text) ? text : null;
}

// ---------- Lectura del libro ----------

function mapHeaders(headerRow, columns) {
	const mapping = {};
	headerRow.forEach((header, index) => {
		const key = normalizeKey(header);
		if (!key) return;
		const column = columns.find((item) => (item.exact ? key === item.exact : key.startsWith(item.match)));
		if (column && mapping[column.key] === undefined) mapping[column.key] = index;
	});
	return mapping;
}

function findSheet(sheets, name) {
	const wanted = normalizeKey(name);
	const found = Object.keys(sheets).find((sheetName) => normalizeKey(sheetName) === wanted);
	return found ? sheets[found] : null;
}

const issue = (level, message) => ({ level, message });

/**
 * Convierte las hojas leídas en filas de importación con sus problemas.
 * Cada fila: { rowNumber, no, fields, specs, diagnosis, needs, issues }.
 */
export function parseImportSheets(sheets) {
	const assetRows = findSheet(sheets, SHEETS.assets);
	if (!assetRows || !assetRows.length) {
		throw new Error(`El archivo no tiene la hoja "${SHEETS.assets}". Descarga la plantilla y úsala como base.`);
	}
	const headerIndex = assetRows.findIndex((row) => row.some((cell) => normalizeKey(cell).startsWith('nombre')));
	if (headerIndex < 0) throw new Error(`La hoja "${SHEETS.assets}" no tiene la columna "Nombre".`);
	const mapping = mapHeaders(assetRows[headerIndex], ASSET_COLUMNS);
	if (mapping.category === undefined) throw new Error(`La hoja "${SHEETS.assets}" no tiene la columna "Categoría".`);

	const items = [];
	assetRows.slice(headerIndex + 1).forEach((row, offset) => {
		const value = (key) => (mapping[key] === undefined ? '' : clean(row[mapping[key]]));
		if (!ASSET_COLUMNS.some((column) => value(column.key))) return;
		const rowNumber = headerIndex + offset + 2;
		const issues = [];
		const no = value('no') || String(items.length + 1);

		const name = value('name');
		if (!name) issues.push(issue('error', 'Falta el nombre del equipo.'));
		const category = value('category');
		if (!category) issues.push(issue('error', 'Falta la categoría.'));

		let year = null;
		if (value('year')) {
			const parsed = Number(value('year'));
			if (Number.isInteger(parsed) && parsed >= 1900 && parsed <= new Date().getFullYear() + 1) year = parsed;
			else issues.push(issue('warning', `El año "${value('year')}" no es válido; se omite.`));
		}

		const inventoryCode = value('inventoryCode');
		let inventoryCodeStatus = inventoryCode ? 'ASSIGNED' : 'PENDING';
		if (!inventoryCode && value('noCodeReason')) {
			inventoryCodeStatus = NO_CODE_REASONS[normalizeKey(value('noCodeReason'))] || 'PENDING';
		}
		if (!inventoryCode) {
			issues.push(issue('info', `Sin código de inventario (${INVENTORY_CODE_STATUS_LABELS[inventoryCodeStatus].toLowerCase()}).`));
		}

		const serial = value('serial');
		if (serialLooksLikeYear(serial)) {
			issues.push(issue('warning', `El serial "${serial}" parece un año. Verifícalo en la placa del equipo.`));
		}

		const hasMotor = parseYesNo(value('hasMotor'));
		if (hasMotor === null) issues.push(issue('warning', `"Tiene motor" debe ser Sí o No; se toma como No.`));

		const { specs, invalid } = parseSpecs(value('specs'));
		invalid.forEach((line) => issues.push(issue('warning', `Dato técnico sin formato "Dato: valor" se omite: "${line}".`)));

		let diagnosis = null;
		const classificationText = value('classification');
		const hasDiagnosisText = ['currentState', 'technicalDiagnosis', 'technicalConcept', 'conclusion', 'recommendationDetail']
			.some((key) => value(key));
		if (classificationText) {
			const parsed = parseClassification(classificationText);
			const date = parseDate(value('diagnosedOn'));
			if (date.error) issues.push(issue('warning', `${date.error} Se usará la fecha de hoy.`));
			if (!parsed) {
				issues.push(issue('error', `Clasificación "${classificationText}" no reconocida. Usa una de la hoja "${SHEETS.values}".`));
			} else {
				diagnosis = {
					diagnosedOn: date.value,
					condition: parsed.condition,
					recommendation: parsed.recommendation,
					classificationText,
					currentStateDescription: value('currentState'),
					technicalDiagnosis: value('technicalDiagnosis'),
					technicalConcept: value('technicalConcept'),
					recommendationDetail: value('recommendationDetail'),
					conclusion: value('conclusion'),
					disposalSupport: value('disposalSupport'),
				};
			}
		} else if (hasDiagnosisText) {
			issues.push(issue('warning', 'Tiene textos de diagnóstico pero no clasificación: el diagnóstico no se importará.'));
		}

		items.push({
			rowNumber,
			no,
			fields: {
				name,
				category,
				family: value('family'),
				equipmentType: value('equipmentType'),
				brand: value('brand'),
				model: value('model'),
				year,
				serial,
				inventoryCode,
				inventoryCodeStatus,
				location: value('location'),
				responsible: value('responsible'),
				hasMotor: Boolean(hasMotor),
				notes: value('notes'),
			},
			specs,
			diagnosis,
			needs: [],
			issues,
		});
	});

	const generalIssues = [];
	const needRows = findSheet(sheets, SHEETS.needs) || [];
	const needHeaderIndex = needRows.findIndex((row) => row.some((cell) => normalizeKey(cell).startsWith('necesidad')));
	if (needHeaderIndex >= 0) {
		const needMapping = mapHeaders(needRows[needHeaderIndex], NEED_COLUMNS);
		const byNo = new Map(items.map((item) => [normalizeKey(item.no), item]));
		needRows.slice(needHeaderIndex + 1).forEach((row, offset) => {
			const value = (key) => (needMapping[key] === undefined ? '' : clean(row[needMapping[key]]));
			if (!NEED_COLUMNS.some((column) => value(column.key))) return;
			const rowNumber = needHeaderIndex + offset + 2;
			const item = byNo.get(normalizeKey(value('assetNo')));
			if (!item) {
				generalIssues.push(issue('error', `Necesidades, fila ${rowNumber}: el equipo No. "${value('assetNo')}" no existe en la hoja "${SHEETS.assets}".`));
				return;
			}
			const description = value('description');
			if (!description) {
				item.issues.push(issue('error', `Necesidades, fila ${rowNumber}: falta la descripción.`));
				return;
			}
			const { types, unknown } = parseInterventions(value('types'));
			if (unknown.length) {
				item.issues.push(issue('warning', `Necesidad "${description}": tipo "${unknown.join(', ')}" no reconocido.`));
			}
			const priority = parsePriority(value('priority'));
			if (!priority) {
				item.issues.push(issue('warning', `Necesidad "${description}": prioridad "${value('priority') || 'vacía'}" no reconocida; se usa Media.`));
			}
			item.needs.push({
				description: description.slice(0, 255),
				interventionTypes: types.length ? types : ['CORRECTIVE'],
				priority: priority || 'MEDIA',
				safetyRelated: Boolean(parseYesNo(value('safety'))),
			});
		});
	}
	items.forEach((item) => {
		if (item.needs.length && !item.diagnosis) {
			item.issues.push(issue('warning', 'Tiene necesidades pero no clasificación: las necesidades no se importarán.'));
		}
	});
	return { items, generalIssues };
}

export function parseImportFile(data) {
	return parseImportSheets(readXlsx(data));
}

// ---------- Validación contra lo que ya existe ----------

/**
 * Resuelve categoría, responsable y duplicados. Agrega problemas a cada fila y marca
 * `resolution` con lo necesario para importarla.
 * context: { categories, users, assets, presets, defaultResponsibleId, skipExisting }
 */
export function analyzeImport(parsed, context) {
	const { categories = [], users = [], assets = [], presets = [], defaultResponsibleId = null } = context;
	const categoryByName = new Map(categories.map((category) => [normalizeKey(category.name), category]));
	const presetByKey = new Map();
	presets.forEach((preset) => {
		presetByKey.set(normalizeKey(preset.key), preset);
		presetByKey.set(normalizeKey(preset.name), preset);
	});
	const userIndex = new Map();
	users.forEach((user) => {
		if (user.nombre) userIndex.set(normalizeKey(user.nombre), user);
		if (user.email) userIndex.set(normalizeKey(user.email), user);
	});
	const existingByCode = new Map();
	const existingBySerial = new Map();
	assets.forEach((asset) => {
		if (asset.inventoryCode) existingByCode.set(normalizeKey(asset.inventoryCode), asset);
		if (asset.serialNumber) existingBySerial.set(normalizeKey(asset.serialNumber), asset);
	});

	const fileCodes = new Map();
	const fileSerials = new Map();
	parsed.items.forEach((item) => {
		const { inventoryCode, serial } = item.fields;
		if (inventoryCode) fileCodes.set(normalizeKey(inventoryCode), [...(fileCodes.get(normalizeKey(inventoryCode)) || []), item]);
		if (serial) fileSerials.set(normalizeKey(serial), [...(fileSerials.get(normalizeKey(serial)) || []), item]);
	});
	const newCategories = new Map();

	const items = parsed.items.map((source) => {
		const item = { ...source, issues: [...source.issues] };
		const { fields } = item;
		const resolution = { categoryId: null, newCategoryKey: null, responsibleId: null, existingAsset: null };

		// Categoría: existente o nueva (con plantilla de datos técnicos si se indicó).
		if (fields.category) {
			const categoryKey = normalizeKey(fields.category);
			const existing = categoryByName.get(categoryKey);
			if (existing) {
				resolution.categoryId = existing.id;
			} else {
				const preset = fields.family ? presetByKey.get(normalizeKey(fields.family)) : null;
				if (fields.family && !preset) {
					item.issues.push(issue('warning', `Plantilla "${fields.family}" no reconocida: la categoría nueva se crea sin campos técnicos.`));
				}
				if (!newCategories.has(categoryKey)) {
					newCategories.set(categoryKey, { key: categoryKey, name: fields.category.trim(), presetKey: preset?.key || null });
				}
				resolution.newCategoryKey = categoryKey;
				item.issues.push(issue('info', `Se creará la categoría "${fields.category.trim()}"${preset ? ` con la plantilla ${preset.name}` : ''}.`));
			}
		}

		// Responsable.
		const user = fields.responsible ? userIndex.get(normalizeKey(fields.responsible)) : null;
		if (fields.responsible && !user) {
			item.issues.push(issue('warning', `Responsable "${fields.responsible}" no encontrado: se asigna el responsable por defecto.`));
		}
		resolution.responsibleId = user?.id ?? defaultResponsibleId;
		if (!resolution.responsibleId) item.issues.push(issue('error', 'Elige un responsable por defecto para los equipos.'));

		// Ya existe en el sistema (mismo código de inventario).
		const existing = fields.inventoryCode ? existingByCode.get(normalizeKey(fields.inventoryCode)) : null;
		if (existing) {
			resolution.existingAsset = existing;
			item.issues.push(issue('warning', `Ya existe un activo con el código ${fields.inventoryCode}: "${existing.name}".`));
		}
		const sameSerial = fields.serial ? existingBySerial.get(normalizeKey(fields.serial)) : null;
		if (sameSerial && sameSerial !== existing) {
			item.issues.push(issue('warning', `El serial ${fields.serial} ya lo usa "${sameSerial.name}".`));
		}

		// Duplicados dentro del mismo archivo.
		const others = (map, key) => (map.get(normalizeKey(key)) || []).filter((other) => other !== source);
		if (fields.inventoryCode && others(fileCodes, fields.inventoryCode).length) {
			item.issues.push(issue('warning', `Código ${fields.inventoryCode} repetido en el archivo (No. ${others(fileCodes, fields.inventoryCode).map((other) => other.no).join(', ')}).`));
		}
		if (fields.serial && others(fileSerials, fields.serial).length) {
			item.issues.push(issue('warning', `Serial ${fields.serial} repetido en el archivo (No. ${others(fileSerials, fields.serial).map((other) => other.no).join(', ')}).`));
		}

		// Coherencia del diagnóstico.
		if (item.diagnosis) {
			const diagnosis = { ...item.diagnosis };
			if (diagnosis.recommendation === 'RECOMMENDED_DISPOSAL' && !diagnosis.disposalSupport) {
				diagnosis.recommendation = 'EVALUATE_DISPOSAL';
				item.issues.push(issue('warning', 'Se recomienda la baja sin soporte técnico-económico: se importa como "Evaluar para baja" hasta registrar el soporte.'));
			}
			if (!allowedRecommendations(diagnosis.condition).includes(diagnosis.recommendation)) {
				item.issues.push(issue('error', `La clasificación "${diagnosis.classificationText}" no es coherente (la baja solo aplica a equipos fuera de servicio u obsoletos).`));
			}
			if (diagnosis.diagnosedOn && diagnosis.diagnosedOn > new Date().toLocaleDateString('en-CA')) {
				item.issues.push(issue('error', 'La fecha del diagnóstico es futura.'));
			}
			const urgentCorrective = item.needs.some((need) => need.priority === 'ALTA' && need.interventionTypes.includes('CORRECTIVE'));
			if (diagnosis.condition === 'OPERATIONAL' && urgentCorrective) {
				item.issues.push(issue('warning', 'Está clasificado "buen estado" pero tiene necesidades correctivas de prioridad alta. Revisa la clasificación.'));
			}
			diagnosis.label = classificationLabel(diagnosis.condition, diagnosis.recommendation);
			item.diagnosis = diagnosis;
		}

		if (!fields.brand) item.issues.push(issue('info', 'Sin marca registrada.'));
		item.resolution = resolution;
		item.hasErrors = item.issues.some((entry) => entry.level === 'error');
		return item;
	});

	return { items, generalIssues: parsed.generalIssues, newCategories: [...newCategories.values()] };
}

// ---------- Payloads para la API ----------

/** Asigna cada dato técnico a un campo de la plantilla (por nombre) o lo deja como adicional. */
export function mapSpecifications(specs, template) {
	const warnings = [];
	const used = new Set();
	const payload = specs.map(({ label, value }) => {
		const key = normalizeKey(label);
		const field = template.find((item) => !used.has(item.specKey)
			&& (normalizeKey(item.label) === key || item.specKey === key));
		if (!field) return { specKey: null, label, value };
		used.add(field.specKey);
		if (field.dataType === 'NUMBER') {
			const number = numericValue(value, field.unit);
			if (number === null) {
				warnings.push(`"${label}: ${value}" no es numérico; se guarda como dato adicional.`);
				return { specKey: null, label: `${label} (detalle)`, value };
			}
			return { specKey: field.specKey, value: number };
		}
		return { specKey: field.specKey, value };
	});
	return { payload, warnings };
}

export function toAssetPayload(item, { categoryId, responsibleId, template = [] }) {
	const { fields } = item;
	const { payload: specifications, warnings } = mapSpecifications(item.specs, template);
	return {
		warnings,
		payload: {
			name: fields.name,
			equipmentType: fields.equipmentType,
			brand: fields.brand,
			model: fields.model,
			serialNumber: fields.serial,
			manufactureYear: fields.year,
			inventoryCode: fields.inventoryCode,
			inventoryCodeStatus: fields.inventoryCodeStatus,
			extraSpecifications: fields.notes,
			categoryId,
			responsibleId,
			location: fields.location,
			operationalStatus: item.diagnosis?.condition || 'OPERATIONAL',
			isActive: true,
			hasMotor: fields.hasMotor,
			specifications,
		},
	};
}

export function toDiagnosisPayload(item, assetId) {
	const { diagnosis } = item;
	return {
		assetId,
		diagnosedOn: diagnosis.diagnosedOn,
		currentStateDescription: diagnosis.currentStateDescription,
		technicalDiagnosis: diagnosis.technicalDiagnosis,
		technicalConcept: diagnosis.technicalConcept,
		conclusion: diagnosis.conclusion,
		operationalCondition: diagnosis.condition,
		recommendation: diagnosis.recommendation,
		recommendationDetail: diagnosis.recommendationDetail,
		disposalSupport: ['EVALUATE_DISPOSAL', 'RECOMMENDED_DISPOSAL'].includes(diagnosis.recommendation) ? diagnosis.disposalSupport : '',
		updateAssetStatus: true,
		needs: item.needs.map((need) => ({ ...need, id: null, status: 'PENDING' })),
	};
}

// ---------- Archivos ----------

const HELP_ROWS = [
	['Importación de equipos y diagnósticos'],
	[''],
	['1. Hoja "Equipos": una fila por equipo. Nombre y Categoría son obligatorios.'],
	['2. Si la categoría no existe se crea. En "Plantilla" puedes indicar su familia para que pida los datos técnicos correctos.'],
	['3. "Datos técnicos": un dato por línea dentro de la celda (Alt+Enter), con el formato  Dato: valor  (por ejemplo  Potencia: 86 HP).'],
	['   Si el nombre del dato coincide con un campo de la plantilla de la categoría, se guarda en ese campo; si no, como dato adicional.'],
	['4. Si el equipo no tiene código de inventario, indica en "Sin código porque": Pendiente de asignación o No suministrado.'],
	['5. "Clasificación" crea el diagnóstico del equipo (usa los textos de la hoja "Valores"). Sin clasificación solo se registra el equipo.'],
	['6. Hoja "Necesidades": una fila por necesidad, con el No. del equipo de la hoja "Equipos".'],
	['7. Antes de guardar, AgroSentinel muestra una vista previa con los errores y advertencias de cada fila.'],
	['   Las filas con errores no se importan. Las que ya existen (mismo código de inventario) se omiten.'],
];

/** Libro de importación: vacío (plantilla) o con datos. */
export function buildImportWorkbook({ assets = [], needs = [], presets = [], extraSheets = [] } = {}) {
	const assetRows = [ASSET_COLUMNS.map((column) => column.header)];
	assets.forEach((row) => assetRows.push(ASSET_COLUMNS.map((column) => row[column.key] ?? '')));
	const needRows = [NEED_COLUMNS.map((column) => column.header)];
	needs.forEach((row) => needRows.push(NEED_COLUMNS.map((column) => row[column.key] ?? '')));

	const listLength = Math.max(CLASSIFICATION_EXAMPLES.length, Object.keys(INTERVENTION_LABELS).length, presets.length, 3);
	const valueRows = [['Clasificación', 'Tipo de intervención', 'Prioridad', 'Sin código porque', 'Plantilla']];
	for (let index = 0; index < listLength; index += 1) {
		valueRows.push([
			CLASSIFICATION_EXAMPLES[index] || '',
			Object.values(INTERVENTION_LABELS)[index] || '',
			['Alta', 'Media', 'Baja'][index] || '',
			['Pendiente de asignación', 'No suministrado'][index] || '',
			presets[index]?.name || '',
		]);
	}

	return writeXlsx([
		{ name: SHEETS.help, rows: HELP_ROWS, columnWidths: [130], headerRows: 1, freezeHeader: false },
		{ name: SHEETS.assets, rows: assetRows, columnWidths: ASSET_COLUMNS.map((column) => column.width) },
		{ name: SHEETS.needs, rows: needRows, columnWidths: NEED_COLUMNS.map((column) => column.width) },
		{ name: SHEETS.values, rows: valueRows, columnWidths: [56, 22, 12, 24, 30] },
		...extraSheets,
	]);
}

/** Lista de problemas encontrados, para corregir el inventario. */
export function buildIssuesWorkbook(analysis) {
	const levelLabel = { error: 'Error', warning: 'Advertencia', info: 'Información' };
	const rows = [['No.', 'Fila', 'Equipo', 'Nivel', 'Detalle']];
	analysis.generalIssues.forEach((entry) => rows.push(['', '', '', levelLabel[entry.level], entry.message]));
	analysis.items.forEach((item) => {
		item.issues
			.filter((entry) => entry.level !== 'info')
			.forEach((entry) => rows.push([item.no, item.rowNumber, item.fields.name, levelLabel[entry.level], entry.message]));
	});
	return writeXlsx([{ name: 'Inconsistencias', rows, columnWidths: [6, 6, 36, 12, 90] }]);
}
