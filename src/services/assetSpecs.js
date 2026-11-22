// Lógica de la ficha técnica de activos: datos técnicos por plantilla, campos adicionales,
// completitud y advertencias. Sin React, para poder probarla aparte.

export const INVENTORY_CODE_STATUS_LABELS = {
	ASSIGNED: 'Asignado',
	PENDING: 'Pendiente de asignación',
	NOT_PROVIDED: 'No suministrado',
};

export const SPEC_TYPE_LABELS = {
	TEXT: 'Texto',
	NUMBER: 'Número',
	OPTION: 'Selección',
};

const NEW_PREFIX = 'new:';
let newCounter = 0;

/** Clave temporal para un dato adicional que aún no existe en el servidor. */
export function newCustomKey() {
	newCounter += 1;
	return `${NEW_PREFIX}${Date.now().toString(36)}-${newCounter}`;
}

export const isNewCustomKey = (key) => key.startsWith(NEW_PREFIX);

/**
 * Estado inicial de los datos técnicos a partir de lo que devuelve el servidor:
 * { [specKey]: { label, value, unit } }.
 */
export function specsFromAsset(asset) {
	const specs = {};
	(asset?.specifications || []).forEach((spec) => {
		specs[spec.specKey] = { label: spec.label, value: spec.value ?? '', unit: spec.unit || '' };
	});
	return specs;
}

/** Datos que no pertenecen a la plantilla actual: se muestran como adicionales. */
export function customEntries(specs, template) {
	const templateKeys = new Set(template.map((field) => field.specKey));
	return Object.entries(specs).filter(([key]) => !templateKeys.has(key));
}

/** Lista que espera el backend. Omite los valores vacíos (el servidor los elimina). */
export function buildSpecificationsPayload(specs, template) {
	const templateKeys = new Set(template.map((field) => field.specKey));
	const payload = [];
	template.forEach((field) => {
		const value = String(specs[field.specKey]?.value ?? '').trim();
		if (value) payload.push({ specKey: field.specKey, value });
	});
	Object.entries(specs).forEach(([key, spec]) => {
		if (templateKeys.has(key)) return;
		const value = String(spec.value ?? '').trim();
		const label = String(spec.label ?? '').trim();
		if (!value) return;
		payload.push({
			specKey: isNewCustomKey(key) ? null : key,
			label,
			value,
			unit: String(spec.unit ?? '').trim() || null,
		});
	});
	return payload;
}

/** Errores que impiden guardar (los que el servidor también rechazaría). */
export function validateSpecs(specs, template) {
	const errors = [];
	template.forEach((field) => {
		const value = String(specs[field.specKey]?.value ?? '').trim();
		if (field.dataType === 'NUMBER' && value && !isNumeric(value)) {
			errors.push(`"${field.label}" debe ser un número (por ejemplo 86 o 2,5).`);
		}
	});
	customEntries(specs, template).forEach(([, spec]) => {
		if (String(spec.value ?? '').trim() && !String(spec.label ?? '').trim()) {
			errors.push('Cada dato técnico adicional necesita un nombre.');
		}
	});
	const labels = customEntries(specs, template)
		.filter(([, spec]) => String(spec.value ?? '').trim())
		.map(([, spec]) => normalizeKey(spec.label));
	if (new Set(labels).size !== labels.length) {
		errors.push('Hay datos técnicos adicionales con el mismo nombre.');
	}
	return [...new Set(errors)];
}

export function isNumeric(value) {
	const normalized = String(value).replace(/\s/g, '');
	const decimal = normalized.includes(',') && !normalized.includes('.') ? normalized.replace(',', '.') : normalized;
	return /^-?\d+(\.\d+)?$/.test(decimal);
}

export function normalizeKey(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

/** Misma regla que el servidor: datos base de identificación + campos obligatorios de la plantilla. */
export function computeCompleteness(form, specs, template, hasImage) {
	const checks = [
		['Tipo de equipo', form.equipmentType],
		['Marca', form.brand],
		['Modelo o referencia', form.model],
		['Serial', form.serialNumber],
		['Código de inventario', form.inventoryCode],
		['Ubicación', form.location],
		['Fotografía', hasImage ? 'sí' : ''],
		...template
			.filter((field) => field.required)
			.map((field) => [field.label, specs[field.specKey]?.value]),
	];
	const missing = checks
		.filter(([, value]) => !String(value ?? '').trim())
		.map(([label]) => label);
	return {
		percent: Math.round((100 * (checks.length - missing.length)) / checks.length),
		missing,
	};
}

/** Advertencias que no bloquean el guardado. */
export function serialLooksLikeYear(serial) {
	return /^(19|20)\d{2}$/.test(String(serial ?? '').trim());
}

/** Plantilla editable a partir de una sugerida o de la guardada. */
export function toEditableFields(fields) {
	return fields.map((field) => ({
		id: newCustomKey(),
		specKey: field.specKey || '',
		label: field.label || '',
		dataType: field.dataType || 'TEXT',
		unit: field.unit || '',
		optionsText: (field.options || []).join(', '),
		required: Boolean(field.required),
		helpText: field.helpText || '',
	}));
}

export function editableFieldsToPayload(fields) {
	return fields
		.filter((field) => field.label.trim())
		.map((field) => ({
			specKey: field.specKey || null,
			label: field.label.trim(),
			dataType: field.dataType,
			unit: field.unit.trim() || null,
			options: field.dataType === 'OPTION'
				? field.optionsText.split(',').map((option) => option.trim()).filter(Boolean)
				: [],
			required: field.required,
			helpText: field.helpText.trim() || null,
		}));
}
