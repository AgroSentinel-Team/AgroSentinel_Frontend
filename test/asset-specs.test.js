import { describe, expect, it } from 'vitest';
import {
  buildSpecificationsPayload,
  computeCompleteness,
  customEntries,
  editableFieldsToPayload,
  isNumeric,
  newCustomKey,
  serialLooksLikeYear,
  specsFromAsset,
  toEditableFields,
  validateSpecs,
} from '../src/services/assetSpecs';

const template = [
  { specKey: 'power_hp', label: 'Potencia', dataType: 'NUMBER', unit: 'HP', options: [], required: true },
  { specKey: 'hitch', label: 'Acople', dataType: 'OPTION', unit: null, options: ['Tres puntos'], required: false },
];

describe('datos técnicos del activo', () => {
  it('separa los datos de plantilla de los adicionales y arma el payload', () => {
    const specs = specsFromAsset({
      specifications: [
        { specKey: 'power_hp', label: 'Potencia', value: '86', unit: 'HP' },
        { specKey: 'presostato', label: 'Presostato', value: '60–80 psi', unit: null },
      ],
    });
    const fresh = newCustomKey();
    specs[fresh] = { label: 'Tiro', value: ' 1,8 ', unit: '' };
    specs.hitch = { label: 'Acople', value: '   ', unit: '' };

    expect(customEntries(specs, template).map(([key]) => key)).toEqual(['presostato', fresh]);
    expect(buildSpecificationsPayload(specs, template)).toEqual([
      { specKey: 'power_hp', value: '86' },
      { specKey: 'presostato', label: 'Presostato', value: '60–80 psi', unit: null },
      { specKey: null, label: 'Tiro', value: '1,8', unit: null },
    ]);
  });

  it('detecta números inválidos, adicionales sin nombre y nombres repetidos', () => {
    const errors = validateSpecs({
      power_hp: { value: '86 HP a 2200' },
      a: { label: '', value: 'x' },
      b: { label: 'Tiro', value: '1' },
      c: { label: 'tiro ', value: '2' },
    }, template);
    expect(errors).toHaveLength(3);
    expect(validateSpecs({ power_hp: { value: '2,5' } }, template)).toEqual([]);
  });

  it('acepta coma o punto decimal', () => {
    expect(isNumeric('86')).toBe(true);
    expect(isNumeric('2,5')).toBe(true);
    expect(isNumeric('0.75')).toBe(true);
    expect(isNumeric('15x30')).toBe(false);
  });

  it('calcula la completitud igual que el servidor', () => {
    const form = {
      equipmentType: 'Tractor agrícola', brand: 'Massey Ferguson', model: 'NMH 290',
      serialNumber: '', inventoryCode: '25530003001', location: 'Granja',
    };
    const result = computeCompleteness(form, { power_hp: { value: '86' } }, template, false);
    expect(result).toEqual({ percent: 75, missing: ['Serial', 'Fotografía'] });
  });

  it('advierte cuando el serial parece un año', () => {
    expect(serialLooksLikeYear('2019')).toBe(true);
    expect(serialLooksLikeYear('20194501630')).toBe(false);
  });

  it('convierte la plantilla editable al formato del servidor', () => {
    const editable = toEditableFields(template);
    editable.push({ ...editable[0], specKey: '', label: '  ', id: 'vacío' });
    expect(editableFieldsToPayload(editable)).toEqual([
      { specKey: 'power_hp', label: 'Potencia', dataType: 'NUMBER', unit: 'HP', options: [], required: true, helpText: null },
      { specKey: 'hitch', label: 'Acople', dataType: 'OPTION', unit: null, options: ['Tres puntos'], required: false, helpText: null },
    ]);
  });
});
