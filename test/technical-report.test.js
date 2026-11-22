/* global process, Buffer */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_REPORT_SETTINGS } from '../src/services/reportSettings';
import {
  buildAssetSheetPdf,
  buildFullReportPdf,
  buildMatrixPdf,
  buildOpenNeedsPdf,
  classificationSummary,
  identificationRows,
  matrixClassification,
  openNeeds,
} from '../src/services/technicalReportPdf';

// Con REPORT_SAMPLE_DIR se guardan los PDF para revisarlos a ojo.
const sampleDir = process.env.REPORT_SAMPLE_DIR;

const png = (file) => `data:image/png;base64,${readFileSync(`public/icons/${file}`).toString('base64')}`;
const settings = {
  ...DEFAULT_REPORT_SETTINGS,
  institutionName: 'Institución de ejemplo',
  unitName: 'Facultad de Ingeniería',
  farmName: 'Granja Experimental',
  logoPrimary: png('pwa-192.png'),
  logoSecondary: null,
  footerText: 'Granja Experimental · Vereda San Miguel\nDocumento generado con AgroSentinel',
  preparedBy: 'Coordinador de la granja',
  preparedByRole: 'Coordinador granja experimental',
  photoCaption: 'Fuente: registro fotográfico de la granja experimental.',
};
const photo = { dataUrl: png('pwa-512.png'), width: 512, height: 512 };

const tractor = {
  id: 1, name: 'Tractor agrícola Massey Ferguson 290', equipmentType: 'Tractor agrícola', brand: 'Massey Ferguson', model: 'NMH 290',
  serialNumber: null, inventoryCode: '25530003001', inventoryCodeStatus: 'ASSIGNED', location: 'Granja Experimental', operationalStatus: 'OPERATIONAL_WITH_RESTRICTIONS',
  specifications: [
    { specKey: 'engine', label: 'Motor', displayValue: 'Perkins A4248, diésel, 4 cilindros' },
    { specKey: 'power_hp', label: 'Potencia', displayValue: '86 HP' },
    { specKey: 'rated_rpm', label: 'Régimen nominal', displayValue: '2200 rpm' },
    { specKey: 'transmission', label: 'Transmisión', displayValue: 'Sencilla' },
    { specKey: 'front_tires', label: 'Llantas delanteras', displayValue: '7.50-16' },
    { specKey: 'rear_tires', label: 'Llantas traseras', displayValue: '15x30' },
  ],
};
const tractorDiagnosis = {
  diagnosedOn: '2026-11-20', inspectorName: 'Coordinador de la granja',
  currentStateDescription: 'El tractor se encuentra actualmente en funcionamiento y presta servicio en las labores agrícolas de la Granja Experimental.',
  technicalDiagnosis: 'Realizar lista de chequeo antes de cada uso. Verificar combustible, aceite y agua antes de operación. Realizar cambios de aceite cada 50 horas de trabajo. Reemplazar las llantas delanteras, debido a su mal estado. Realizar reparación del sistema de escape.',
  technicalConcept: 'El tractor es técnicamente viable para continuar en operación y requiere mantenimiento preventivo y correctivo, priorizando las llantas delanteras por razones de seguridad.',
  conclusion: 'El Massey Ferguson 290 se encuentra operativo. Las intervenciones identificadas permiten conservar su confiabilidad, seguridad y vida útil.',
  operationalCondition: 'OPERATIONAL_WITH_RESTRICTIONS', recommendation: 'KEEP',
  needs: [
    { description: 'Cambio/revisión de filtro de aire', interventionTypes: ['PREVENTIVE'], priority: 'MEDIA', safetyRelated: false, status: 'PENDING' },
    { description: 'Cambio de filtro de aceite', interventionTypes: ['PREVENTIVE'], priority: 'MEDIA', safetyRelated: false, status: 'PENDING' },
    { description: 'Cambio de llantas delanteras', interventionTypes: ['CORRECTIVE'], priority: 'ALTA', safetyRelated: true, status: 'IN_PROGRESS', orderLabel: 'F-88', orderStatus: 'ASIGNADA' },
    { description: 'Reparación del escape', interventionTypes: ['CORRECTIVE'], priority: 'MEDIA', safetyRelated: false, status: 'PENDING' },
  ],
};
const newHolland = {
  id: 2, name: 'Tractor agrícola New Holland ZBC834', equipmentType: 'Tractor agrícola', brand: 'New Holland', model: 'ZBC834', serialNumber: null,
  inventoryCode: null, inventoryCodeStatus: 'NOT_PROVIDED', operationalStatus: 'OUT_OF_SERVICE',
  specifications: [{ specKey: 'engine_number', label: 'Número de motor', displayValue: '6059574' }, { specKey: 'electrical_system', label: 'Sistema eléctrico', displayValue: '12 V' }],
};
const newHollandDiagnosis = {
  diagnosedOn: '2026-11-20', inspectorName: 'Coordinador de la granja',
  currentStateDescription: 'El tractor se encuentra fuera de servicio debido a una falla grave del motor.',
  technicalConcept: 'Por la severidad de la falla reportada y la inconveniencia económica de la reparación, se considera procedente evaluar el activo para eventual baja institucional.',
  operationalCondition: 'OUT_OF_SERVICE', recommendation: 'EVALUATE_DISPOSAL',
  needs: [
    { description: 'Evaluación técnica del motor', interventionTypes: ['DIAGNOSTIC'], priority: 'ALTA', safetyRelated: false, status: 'PENDING' },
    { description: 'Evaluación económica de recuperación', interventionTypes: ['TECHNICAL_ECONOMIC'], priority: 'ALTA', safetyRelated: false, status: 'PENDING' },
  ],
};
const kubota = {
  id: 3, name: 'Transplantadora de arroz Kubota SPV-8C', equipmentType: 'Transplantadora de arroz', brand: 'Kubota', model: 'SPV-8C', manufactureYear: 2020,
  inventoryCode: null, inventoryCodeStatus: 'PENDING', operationalStatus: 'OPERATIONAL', specifications: [{ specKey: 'power_hp', label: 'Potencia', displayValue: '22 HP' }],
};
const entries = [
  { asset: tractor, diagnosis: tractorDiagnosis, photo },
  { asset: newHolland, diagnosis: newHollandDiagnosis, photo: null },
  { asset: kubota, diagnosis: null, photo: null },
];


const pdfText = (doc) => new TextDecoder('latin1').decode(doc.output('arraybuffer'));
const save = (doc, name) => {
  if (!sampleDir) return;
  mkdirSync(sampleDir, { recursive: true });
  writeFileSync(`${sampleDir}/${name}`, Buffer.from(doc.output('arraybuffer')));
};

describe('informe técnico en PDF', () => {
  it('arma la identificación con datos base, técnicos y estado', () => {
    const rows = identificationRows(tractor, tractorDiagnosis);
    expect(rows[0]).toEqual(['Equipo', 'Tractor agrícola']);
    expect(rows).toContainEqual(['Serial', 'No registrado']);
    expect(rows).toContainEqual(['Potencia', '86 HP']);
    expect(rows.at(-1)).toEqual(['Estado actual', 'OPERATIVO – REQUIERE MANTENIMIENTO']);
    expect(identificationRows(newHolland, null)).toContainEqual(['Código de inventario', 'No suministrado']);
  });

  it('resume clasificaciones y ordena las necesidades abiertas', () => {
    expect(matrixClassification(kubota, null)).toBe('OPERATIVO – SIN DIAGNÓSTICO');
    expect(classificationSummary(entries)).toHaveLength(3);
    const needs = openNeeds(entries);
    expect(needs[0].need.description).toBe('Cambio de llantas delanteras');
    expect(needs.every(({ need }) => need.status !== 'DONE')).toBe(true);
  });

  it('genera ficha, matriz, necesidades e informe completo', () => {
    const sheet = buildAssetSheetPdf(entries[0], settings, 1);
    const matrix = buildMatrixPdf(entries, settings);
    const needs = buildOpenNeedsPdf(entries, settings);
    const full = buildFullReportPdf(entries, settings, new Date('2026-11-22T12:00:00'));
    expect(sheet.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(full.getNumberOfPages()).toBeGreaterThan(4);
    expect(pdfText(matrix)).toContain('MATRIZ CONSOLIDADA');
    save(sheet, 'ficha.pdf');
    save(matrix, 'matriz.pdf');
    save(needs, 'necesidades.pdf');
    save(full, 'informe.pdf');
  });
});
