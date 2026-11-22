import { describe, expect, it } from 'vitest';
import {
  allowedRecommendations,
  classificationLabel,
  diagnosisPayload,
  emptyDiagnosisForm,
  emptyNeed,
  validateDiagnosisForm,
} from '../src/services/diagnosis';

describe('ficha de diagnóstico', () => {
  it('genera las mismas clasificaciones del informe técnico', () => {
    expect(classificationLabel('OPERATIONAL', 'KEEP')).toBe('OPERATIVO – BUEN ESTADO');
    expect(classificationLabel('OPERATIONAL_WITH_RESTRICTIONS', 'KEEP')).toBe('OPERATIVO – REQUIERE MANTENIMIENTO');
    expect(classificationLabel('OUT_OF_SERVICE', 'RECOVER')).toBe('FUERA DE SERVICIO – RECUPERABLE');
    expect(classificationLabel('OUT_OF_SERVICE', 'EVALUATE_DISPOSAL'))
      .toBe('FUERA DE SERVICIO – RECOMENDADO PARA EVALUACIÓN DE BAJA');
  });

  it('solo ofrece la baja para equipos fuera de servicio u obsoletos', () => {
    expect(allowedRecommendations('OPERATIONAL')).toEqual(['KEEP', 'PENDING_EVALUATION']);
    expect(allowedRecommendations('OUT_OF_SERVICE')).toContain('EVALUATE_DISPOSAL');
    expect(allowedRecommendations('IN_REPAIR')).toContain('RECOVER');
    expect(allowedRecommendations('IN_REPAIR')).not.toContain('RECOMMENDED_DISPOSAL');
  });

  it('valida soporte de baja y necesidades completas', () => {
    const form = {
      ...emptyDiagnosisForm({ operationalStatus: 'OBSOLETE' }),
      recommendation: 'RECOMMENDED_DISPOSAL',
      needs: [{ ...emptyNeed(), description: ' ', interventionTypes: [] }],
    };
    const errors = validateDiagnosisForm(form);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toContain('soporte');
  });

  it('arma el payload sin soporte de baja cuando no aplica', () => {
    const form = {
      ...emptyDiagnosisForm({ operationalStatus: 'OPERATIONAL' }),
      disposalSupport: 'texto que no aplica',
      needs: [{ ...emptyNeed(), id: 4, description: ' Cambio de bujía ', interventionTypes: ['PREVENTIVE'] }],
    };
    const payload = diagnosisPayload(9, form);
    expect(payload.disposalSupport).toBe('');
    expect(payload.recommendation).toBe('KEEP');
    expect(payload.needs).toEqual([
      { id: 4, description: 'Cambio de bujía', interventionTypes: ['PREVENTIVE'], priority: 'MEDIA', safetyRelated: false, status: 'PENDING' },
    ]);
  });
});
