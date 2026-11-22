import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { columnIndex, columnName, readXlsx, writeXlsx } from '../src/services/xlsx';
import {
  analyzeImport,
  buildImportWorkbook,
  mapSpecifications,
  numericValue,
  parseClassification,
  parseDate,
  parseImportFile,
  parseInterventions,
  toAssetPayload,
  toDiagnosisPayload,
} from '../src/services/assetImport';

describe('xlsx', () => {
  it('convierte columnas y lee lo que escribe', () => {
    expect(columnName(0)).toBe('A');
    expect(columnName(27)).toBe('AB');
    expect(columnIndex('AB12')).toBe(27);
    const bytes = writeXlsx([{ name: 'Hoja & datos', rows: [['Nombre', 'Valor'], ['Línea 1\nLínea 2 <ok>', 86], ['', 'solo B']] }]);
    const sheets = readXlsx(bytes);
    expect(sheets['Hoja & datos']).toEqual([['Nombre', 'Valor'], ['Línea 1\nLínea 2 <ok>', '86'], ['', 'solo B']]);
  });

  it('lee cadenas compartidas y texto enriquecido como los guarda Excel', () => {
    const xml = (text) => strToU8(`<?xml version="1.0"?>${text}`);
    const bytes = zipSync({
      'xl/workbook.xml': xml('<workbook><sheets><sheet name="Equipos" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': xml('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
      'xl/sharedStrings.xml': xml('<sst><si><t>Nombre</t></si><si><r><t>Tractor </t></r><r><rPr><b/></rPr><t xml:space="preserve">MF &amp; 290</t></r></si></sst>'),
      'xl/worksheets/sheet1.xml': xml('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row><row r="3"><c r="C3" t="s"><v>1</v></c><c r="D3"><v>25530003001</v></c></row></sheetData></worksheet>'),
    });
    expect(readXlsx(bytes).Equipos).toEqual([['Nombre'], [], ['', '', 'Tractor MF & 290', '25530003001']]);
  });

  it('rechaza archivos que no son xlsx', () => {
    expect(() => readXlsx(new Uint8Array([1, 2, 3]))).toThrow(/no es un libro/);
  });
});

describe('interpretación de valores del informe', () => {
  it('entiende las clasificaciones tal como se escriben en las fichas', () => {
    expect(parseClassification('OPERATIVO – BUEN ESTADO')).toEqual({ condition: 'OPERATIONAL', recommendation: 'KEEP' });
    expect(parseClassification('BUEN ESTADO – REQUIERE CONSERVACIÓN PREVENTIVA'))
      .toEqual({ condition: 'OPERATIONAL_WITH_RESTRICTIONS', recommendation: 'KEEP' });
    expect(parseClassification('FUERA DE SERVICIO – RECUPERABLE MEDIANTE REPARACIÓN'))
      .toEqual({ condition: 'OUT_OF_SERVICE', recommendation: 'RECOVER' });
    expect(parseClassification('FUERA DE SERVICIO – PENDIENTE DE EVALUACIÓN PARA BAJA'))
      .toEqual({ condition: 'OUT_OF_SERVICE', recommendation: 'EVALUATE_DISPOSAL' });
    expect(parseClassification('FUERA DE SERVICIO – NO FUNCIONAL – PENDIENTE DE EVALUACIÓN'))
      .toEqual({ condition: 'OUT_OF_SERVICE', recommendation: 'PENDING_EVALUATION' });
    expect(parseClassification('FUERA DE SERVICIO – OBSOLETA – RECOMENDADA PARA BAJA'))
      .toEqual({ condition: 'OBSOLETE', recommendation: 'RECOMMENDED_DISPOSAL' });
    expect(parseClassification('cualquier cosa')).toBeNull();
  });

  it('entiende los tipos de intervención combinados', () => {
    expect(parseInterventions('Correctivo/preventivo').types).toEqual(['CORRECTIVE', 'PREVENTIVE']);
    expect(parseInterventions('Administrativo/patrimonial').types).toEqual(['ADMINISTRATIVE', 'PATRIMONIAL']);
    expect(parseInterventions('Técnico-económica').types).toEqual(['TECHNICAL_ECONOMIC']);
    expect(parseInterventions('Correctivo estructural').types).toEqual(['CORRECTIVE']);
    expect(parseInterventions('Evaluación').types).toEqual(['DIAGNOSTIC']);
    expect(parseInterventions('Magia').unknown).toEqual(['magia']);
  });

  it('interpreta fechas y números con unidad', () => {
    expect(parseDate('20/11/2026').value).toBe('2026-11-20');
    expect(parseDate('46346').value).toBe('2026-11-20');
    expect(parseDate('mañana').error).toBeTruthy();
    expect(numericValue('86 HP', 'HP')).toBe('86');
    expect(numericValue('2.200', 'rpm')).toBe('2200');
    expect(numericValue('86 HP a 2.200 rpm', 'HP')).toBeNull();
  });

  it('asigna los datos técnicos a la plantilla o los deja como adicionales', () => {
    const template = [
      { specKey: 'power_hp', label: 'Potencia', dataType: 'NUMBER', unit: 'HP' },
      { specKey: 'engine', label: 'Motor', dataType: 'TEXT', unit: null },
    ];
    const { payload, warnings } = mapSpecifications([
      { label: 'Potencia', value: '86 HP' },
      { label: 'motor', value: 'Perkins A4248' },
      { label: 'Presostato', value: '60–8 psi' },
    ], template);
    expect(payload).toEqual([
      { specKey: 'power_hp', value: '86' },
      { specKey: 'engine', value: 'Perkins A4248' },
      { specKey: null, label: 'Presostato', value: '60–8 psi' },
    ]);
    expect(warnings).toEqual([]);
    expect(mapSpecifications([{ label: 'Potencia', value: 'alta' }], template).payload[0])
      .toEqual({ specKey: null, label: 'Potencia (detalle)', value: 'alta' });
  });
});

describe('importación desde la plantilla', () => {
  const workbook = () => buildImportWorkbook({
    presets: [{ key: 'TRACTOR', name: 'Tractores' }],
    assets: [
      { no: '1', name: 'Tractor Massey Ferguson 290', category: 'Tractores', family: 'Tractores', brand: 'Massey Ferguson',
        model: 'NMH 290', inventoryCode: '25530003001', hasMotor: 'Sí', specs: 'Potencia: 86 HP\nMotor: Perkins A4248',
        classification: 'OPERATIVO – REQUIERE MANTENIMIENTO', recommendationDetail: 'Atender con prioridad las llantas.' },
      { no: '2', name: 'Fumigadora Olympia NP 250', category: 'Fumigación', inventoryCode: '2163002003',
        classification: 'FUERA DE SERVICIO – OBSOLETA – RECOMENDADA PARA BAJA' },
      { no: '3', name: 'Motosierra STIHL', category: 'Herramientas', inventoryCode: '2163002003', serial: '2019' },
      { no: '4', name: '', category: 'Herramientas', brand: 'X' },
    ],
    needs: [
      { assetNo: '1', description: 'Cambio de llantas delanteras', types: 'Correctivo', priority: 'Alta', safety: 'Sí' },
      { assetNo: '9', description: 'Fantasma', types: 'Correctivo', priority: 'Alta' },
    ],
  });

  it('lee equipos, diagnóstico y necesidades y detecta problemas', () => {
    const parsed = parseImportFile(workbook());
    expect(parsed.items).toHaveLength(4);
    const tractor = parsed.items[0];
    expect(tractor.fields.hasMotor).toBe(true);
    expect(tractor.specs).toEqual([{ label: 'Potencia', value: '86 HP' }, { label: 'Motor', value: 'Perkins A4248' }]);
    expect(tractor.diagnosis.condition).toBe('OPERATIONAL_WITH_RESTRICTIONS');
    expect(tractor.needs[0]).toEqual({ description: 'Cambio de llantas delanteras', interventionTypes: ['CORRECTIVE'], priority: 'ALTA', safetyRelated: true });
    expect(parsed.generalIssues[0].message).toContain('"9"');
    expect(parsed.items[2].issues.some((entry) => entry.message.includes('parece un año'))).toBe(true);
    expect(parsed.items[3].issues.some((entry) => entry.level === 'error')).toBe(true);

    const analysis = analyzeImport(parsed, {
      categories: [{ id: 1, name: 'TRACTORES' }],
      users: [{ id: 7, nombre: 'Admin Granja' }],
      assets: [{ id: 50, name: 'Motosierra vieja', inventoryCode: '9999' }],
      presets: [{ key: 'TRACTOR', name: 'Tractores' }],
      defaultResponsibleId: 7,
    });
    expect(analysis.items[0].resolution.categoryId).toBe(1);
    expect(analysis.newCategories.map((category) => category.name)).toEqual(['Fumigación', 'Herramientas']);
    expect(analysis.items[1].diagnosis.recommendation).toBe('EVALUATE_DISPOSAL');
    expect(analysis.items[2].issues.some((entry) => entry.message.includes('repetido en el archivo (No. 2)'))).toBe(true);
    expect(analysis.items.filter((item) => item.hasErrors).map((item) => item.no)).toEqual(['4']);

    const { payload } = toAssetPayload(analysis.items[0], {
      categoryId: 1,
      responsibleId: 7,
      template: [{ specKey: 'power_hp', label: 'Potencia', dataType: 'NUMBER', unit: 'HP' }],
    });
    expect(payload).toMatchObject({ name: 'Tractor Massey Ferguson 290', operationalStatus: 'OPERATIONAL_WITH_RESTRICTIONS', hasMotor: true });
    expect(payload.specifications).toEqual([
      { specKey: 'power_hp', value: '86' },
      { specKey: null, label: 'Motor', value: 'Perkins A4248' },
    ]);
    const diagnosis = toDiagnosisPayload(analysis.items[0], 99);
    expect(diagnosis).toMatchObject({ assetId: 99, recommendation: 'KEEP', recommendationDetail: 'Atender con prioridad las llantas.' });
    expect(diagnosis.needs[0]).toMatchObject({ id: null, status: 'PENDING', priority: 'ALTA' });
  });

  it('avisa cuando falta la hoja de equipos', () => {
    expect(() => parseImportFile(writeXlsx([{ name: 'Otra', rows: [['x']] }]))).toThrow(/Equipos/);
  });
});
