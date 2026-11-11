import { beforeEach, describe, expect, it } from 'vitest';

import {
  canAssignFailureTechnician,
  canReportFailure,
  isFailureReportAdministrator,
} from '../src/services/assetService.js';

const storage = createMemoryStorage();
globalThis.localStorage = storage;

beforeEach(() => {
  storage.clear();
});

describe('failure report permissions', () => {
  it('allows supervisors to create reports and select a technician', () => {
    storage.setItem('rol', 'SUPERVISOR');

    expect(canReportFailure()).toBe(true);
    expect(canAssignFailureTechnician()).toBe(true);
    expect(isFailureReportAdministrator()).toBe(false);
  });

  it('recognizes supervisor roles stored in the roles list', () => {
    storage.setItem('rol', 'OPERATIVO_CAMPO');
    storage.setItem('roles', JSON.stringify(['ROLE_SUPERVISOR']));

    expect(canReportFailure()).toBe(true);
    expect(canAssignFailureTechnician()).toBe(true);
  });

  it.each(['ADMIN', 'ADMINISTRADOR', 'ROLE_ADMINISTRADOR'])(
    'keeps administrator report permissions for %s',
    (role) => {
      storage.setItem('rol', role);

      expect(canReportFailure()).toBe(true);
      expect(canAssignFailureTechnician()).toBe(true);
      expect(isFailureReportAdministrator()).toBe(true);
    },
  );

  it('allows field operators to report but not choose the assigned technician', () => {
    storage.setItem('rol', 'OPERATIVO_CAMPO');

    expect(canReportFailure()).toBe(true);
    expect(canAssignFailureTechnician()).toBe(false);
  });

  it('denies report permissions for malformed or unrelated role data', () => {
    storage.setItem('rol', 'ALMACENISTA');
    storage.setItem('roles', '{invalid');

    expect(canReportFailure()).toBe(false);
    expect(canAssignFailureTechnician()).toBe(false);
    expect(isFailureReportAdministrator()).toBe(false);
  });
});

function createMemoryStorage() {
  const values = new Map();
  return {
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}
