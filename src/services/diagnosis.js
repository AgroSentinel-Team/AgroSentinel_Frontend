// Reglas y textos de la ficha técnica de diagnóstico (sin React, para probarlas aparte).
// Deben coincidir con AssetDiagnosisService del backend.

export const CONDITION_LABELS = {
	OPERATIONAL: 'Operativo – buen estado',
	OPERATIONAL_WITH_RESTRICTIONS: 'Operativo – requiere mantenimiento',
	IN_REPAIR: 'En reparación',
	OUT_OF_SERVICE: 'Fuera de servicio',
	OBSOLETE: 'Obsoleto',
};

export const RECOMMENDATION_LABELS = {
	KEEP: 'Conservar en operación',
	RECOVER: 'Recuperar (reparar)',
	PENDING_EVALUATION: 'Pendiente de evaluación técnico-económica',
	EVALUATE_DISPOSAL: 'Evaluar para baja',
	RECOMMENDED_DISPOSAL: 'Recomendado para baja',
};

export const INTERVENTION_LABELS = {
	PREVENTIVE: 'Preventivo',
	CORRECTIVE: 'Correctivo',
	DIAGNOSTIC: 'Diagnóstico',
	VERIFICATION: 'Verificación',
	CALIBRATION: 'Calibración',
	TECHNICAL_ECONOMIC: 'Técnico-económica',
	ADMINISTRATIVE: 'Administrativo',
	PATRIMONIAL: 'Patrimonial',
};

export const PRIORITY_LABELS = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };

export const NEED_STATUS_LABELS = {
	PENDING: 'Pendiente',
	IN_PROGRESS: 'En curso',
	DONE: 'Atendida',
	DISCARDED: 'Descartada',
};

export const ORDER_STATUS_LABELS = {
	PENDIENTE: 'Pendiente',
	ASIGNADA: 'Asignada',
	EN_EJECUCION: 'En ejecución',
	EN_CIERRE: 'En cierre',
	EN_REVISION: 'En revisión',
	RESUELTO: 'Resuelta',
	ESPERA_REPUESTO: 'Esperando repuesto',
	SCHEDULED: 'Programado',
	COMPLETED: 'Completado',
	PARTIALLY_COMPLETED: 'Parcial',
	URGENT_CORRECTIVE: 'Correctivo urgente',
};

const DISPOSAL = new Set(['EVALUATE_DISPOSAL', 'RECOMMENDED_DISPOSAL']);
const DISPOSAL_CONDITIONS = new Set(['OUT_OF_SERVICE', 'OBSOLETE']);
const OPERATING = new Set(['OPERATIONAL', 'OPERATIONAL_WITH_RESTRICTIONS']);

/** Recomendaciones coherentes con la condición del equipo. */
export function allowedRecommendations(condition) {
	return Object.keys(RECOMMENDATION_LABELS).filter((recommendation) => {
		if (DISPOSAL.has(recommendation)) return DISPOSAL_CONDITIONS.has(condition);
		if (recommendation === 'RECOVER') return !OPERATING.has(condition);
		return true;
	});
}

/** Recomendación sugerida al cambiar la condición. */
export function defaultRecommendation(condition) {
	if (condition === 'OUT_OF_SERVICE' || condition === 'IN_REPAIR') return 'RECOVER';
	if (condition === 'OBSOLETE') return 'EVALUATE_DISPOSAL';
	return 'KEEP';
}

/** Igual que el backend: "FUERA DE SERVICIO – RECUPERABLE", "OPERATIVO – BUEN ESTADO"... */
export function classificationLabel(condition, recommendation) {
	const base = {
		OPERATIONAL: 'OPERATIVO – BUEN ESTADO',
		OPERATIONAL_WITH_RESTRICTIONS: 'OPERATIVO – REQUIERE MANTENIMIENTO',
		IN_REPAIR: 'EN REPARACIÓN',
		OUT_OF_SERVICE: 'FUERA DE SERVICIO',
		OBSOLETE: 'FUERA DE SERVICIO – OBSOLETO',
	}[condition];
	const suffix = {
		KEEP: '',
		RECOVER: 'RECUPERABLE',
		PENDING_EVALUATION: 'PENDIENTE DE EVALUACIÓN',
		EVALUATE_DISPOSAL: 'RECOMENDADO PARA EVALUACIÓN DE BAJA',
		RECOMMENDED_DISPOSAL: 'RECOMENDADO PARA BAJA',
	}[recommendation];
	if (!base) return '';
	return suffix ? `${base} – ${suffix}` : base;
}

/** Tono visual de la clasificación. */
export function classificationTone(condition, recommendation) {
	if (DISPOSAL.has(recommendation) || condition === 'OBSOLETE') return 'error';
	if (condition === 'OUT_OF_SERVICE' || condition === 'IN_REPAIR') return 'warning';
	if (condition === 'OPERATIONAL_WITH_RESTRICTIONS') return 'info';
	return 'success';
}

export const emptyNeed = () => ({
	key: `need-${Math.random().toString(36).slice(2)}`,
	id: null,
	description: '',
	interventionTypes: ['CORRECTIVE'],
	priority: 'MEDIA',
	safetyRelated: false,
	status: 'PENDING',
});

export function emptyDiagnosisForm(asset) {
	const condition = asset?.operationalStatus || 'OPERATIONAL';
	return {
		diagnosedOn: new Date().toLocaleDateString('en-CA'),
		currentStateDescription: '',
		technicalDiagnosis: '',
		technicalConcept: '',
		conclusion: '',
		operationalCondition: condition,
		recommendation: defaultRecommendation(condition),
		recommendationDetail: '',
		disposalSupport: '',
		updateAssetStatus: true,
		needs: [],
	};
}

export function diagnosisToForm(diagnosis) {
	return {
		diagnosedOn: diagnosis.diagnosedOn,
		currentStateDescription: diagnosis.currentStateDescription || '',
		technicalDiagnosis: diagnosis.technicalDiagnosis || '',
		technicalConcept: diagnosis.technicalConcept || '',
		conclusion: diagnosis.conclusion || '',
		operationalCondition: diagnosis.operationalCondition,
		recommendation: diagnosis.recommendation,
		recommendationDetail: diagnosis.recommendationDetail || '',
		disposalSupport: diagnosis.disposalSupport || '',
		updateAssetStatus: true,
		needs: diagnosis.needs.map((need) => ({ ...need, key: `need-${need.id}` })),
	};
}

/** Errores que el servidor también rechazaría. */
export function validateDiagnosisForm(form) {
	const errors = [];
	const today = new Date().toLocaleDateString('en-CA');
	if (form.diagnosedOn && form.diagnosedOn > today) errors.push('La fecha del diagnóstico no puede ser futura.');
	if (!allowedRecommendations(form.operationalCondition).includes(form.recommendation)) {
		errors.push('La recomendación no corresponde a la condición del equipo.');
	}
	if (form.recommendation === 'RECOMMENDED_DISPOSAL' && !form.disposalSupport.trim()) {
		errors.push('Para recomendar la baja registra el soporte de la evaluación técnica y económica.');
	}
	form.needs.forEach((need, index) => {
		if (!need.description.trim()) errors.push(`La necesidad ${index + 1} no tiene descripción.`);
		if (!need.interventionTypes.length) errors.push(`La necesidad ${index + 1} necesita al menos un tipo de intervención.`);
	});
	return [...new Set(errors)];
}

export function diagnosisPayload(assetId, form) {
	return {
		assetId,
		diagnosedOn: form.diagnosedOn || null,
		currentStateDescription: form.currentStateDescription,
		technicalDiagnosis: form.technicalDiagnosis,
		technicalConcept: form.technicalConcept,
		conclusion: form.conclusion,
		operationalCondition: form.operationalCondition,
		recommendation: form.recommendation,
		recommendationDetail: form.recommendationDetail,
		disposalSupport: DISPOSAL.has(form.recommendation) ? form.disposalSupport : '',
		updateAssetStatus: form.updateAssetStatus,
		needs: form.needs.map((need) => ({
			id: need.id ?? null,
			description: need.description.trim(),
			interventionTypes: need.interventionTypes,
			priority: need.priority,
			safetyRelated: need.safetyRelated,
			status: need.status,
		})),
	};
}

export const isDisposalRecommendation = (recommendation) => DISPOSAL.has(recommendation);
