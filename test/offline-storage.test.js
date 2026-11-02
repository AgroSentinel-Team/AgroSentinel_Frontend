import { describe, expect, it } from 'vitest';
import { indexedDB } from 'fake-indexeddb';

globalThis.indexedDB = indexedDB;
globalThis.localStorage = createMemoryStorage();

const database = await import('../src/services/offlineDatabase.js');
const offlineApi = await import('../src/services/offlineApi.js');
const sessionService = await import('../src/services/sessionService.js');

describe('offline persistence', () => {
  it('keeps cached records isolated by account', async () => {
    await database.cacheCollection('field-a@example.com', 'assigned-orders', [
      { id: 41, name: 'Tractor norte' },
    ]);
    await database.cacheCollection('field-b@example.com', 'assigned-orders', [
      { id: 41, name: 'Tractor sur' },
    ]);

    await expect(
      database.readCachedCollection('field-a@example.com', 'assigned-orders'),
    ).resolves.toEqual([{ id: 41, name: 'Tractor norte' }]);
    await expect(
      database.readCachedCollection('field-b@example.com', 'assigned-orders'),
    ).resolves.toEqual([{ id: 41, name: 'Tractor sur' }]);
  });

  it('retains offline multipart failure reports and evidence blobs', async () => {
    globalThis.localStorage.setItem('email', 'field-a@example.com');
    const formData = new FormData();
    formData.append(
      'data',
      new Blob(
        [JSON.stringify({ assetId: 7, tipoFalla: 'Fuga', prioridad: 'ALTA' })],
        { type: 'application/json' },
      ),
    );
    formData.append(
      'evidencia',
      new Blob(['evidence-bytes'], { type: 'image/jpeg' }),
      'fuga.jpg',
    );

    const result = await offlineApi.sendOrQueueForm({
      endpoint: '/failure-reports',
      method: 'POST',
      formData,
      operationType: 'failure_report.create',
    });
    const pending = await database.listPendingOperations('field-a@example.com');

    expect(result.queued).toBe(true);
    expect(pending).toHaveLength(1);
    expect(pending[0].endpoint).toBe('/failure-reports');
    expect(pending[0].payload.assetId).toBe(7);
    expect(pending[0].files[0].fieldName).toBe('evidencia');
    expect(pending[0].files[0].name).toBe('fuga.jpg');
    await expect(pending[0].files[0].blob.text()).resolves.toBe('evidence-bytes');
    await expect(
      database.countPendingOperations('field-a@example.com'),
    ).resolves.toBe(1);
  });

  it('retains failed operations for retry and removes successful ones', async () => {
    globalThis.localStorage.setItem('email', 'field-b@example.com');
    const id = await database.enqueueOfflineOperation({
      ownerKey: 'field-b@example.com',
      endpoint: '/failure-reports/9/intervention',
      method: 'PUT',
      operationType: 'failure_report.intervention',
      payload: { actualFailure: 'Hydraulic leak' },
      files: [],
      metadata: { failureId: 9 },
    });

    await database.markOperationFailed(
      id,
      'field-b@example.com',
      'Network unavailable',
    );
    const retained = await database.listPendingOperations('field-b@example.com');
    expect(retained[0].attempts).toBe(1);
    expect(retained[0].lastError).toBe('Network unavailable');

    await database.removePendingOperation(id, 'field-b@example.com');
    await expect(
      database.listPendingOperations('field-b@example.com'),
    ).resolves.toEqual([]);
  });

  it('restores a remembered identity for local-only access after token expiry', async () => {
    const token = makeToken(Date.now() - 60_000);
    globalThis.localStorage.setItem('token', token);
    globalThis.localStorage.setItem('email', 'offline-tech@example.com');
    globalThis.localStorage.setItem('rol', 'TECNICO');
    globalThis.localStorage.setItem('roles', '["TECNICO"]');
    globalThis.localStorage.setItem('nombre', 'Tecnico Offline');

    await sessionService.restoreRememberedSession();

    expect(sessionService.getAuthToken()).toBeNull();
    expect(sessionService.isOfflineAuthenticated()).toBe(true);
    expect(sessionService.isSessionAuthenticated()).toBe(true);
    expect(sessionService.getSessionOwnerKey()).toBe('offline-tech@example.com');

    await sessionService.clearSession();
  });
});

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function makeToken(expiration) {
  const payload = btoa(JSON.stringify({ exp: Math.floor(expiration / 1000) }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `header.${payload}.signature`;
}
