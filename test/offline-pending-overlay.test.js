import { indexedDB } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/offlineNetwork.js', () => ({
  isNetworkAvailable: vi.fn().mockResolvedValue(false),
}));

globalThis.indexedDB = indexedDB;
globalThis.localStorage = createMemoryStorage();

const database = await import('../src/services/offlineDatabase.js');
const offlineApi = await import('../src/services/offlineApi.js');

describe('pending operations over fresh server data', () => {
  it('starting an assigned order offline marks it as in execution locally', () => {
    const records = [{ id: 5, estado: 'ASIGNADA' }, { id: 6, estado: 'ASIGNADA' }];

    const updated = offlineApi.applyPendingOperation(records, {
      id: 1,
      operationType: 'failure_report.start_review',
      metadata: { failureId: 5, startedAt: '2026-11-21T08:00:00.000Z' },
    });

    expect(updated[0]).toMatchObject({
      estado: 'EN_EJECUCION',
      reviewStartPending: true,
      fechaInicioRevision: '2026-11-21T08:00:00.000Z',
    });
    expect(updated[1]).toEqual({ id: 6, estado: 'ASIGNADA' });
  });

  it('keeps queued interventions visible when the list is refreshed from the server', async () => {
    await database.enqueueOfflineOperation({
      ownerKey: 'overlay@example.com',
      endpoint: '/failure-reports/5/intervention',
      method: 'PUT',
      operationType: 'failure_report.intervention',
      payload: {},
      files: [],
      metadata: { failureId: 5 },
    });

    const serverRecords = [{ id: 5, estado: 'EN_EJECUCION' }, { id: 6, estado: 'ASIGNADA' }];
    const merged = await offlineApi.overlayPendingOperations(
      'overlay@example.com',
      'assigned-failure-reports',
      serverRecords,
    );

    expect(merged[0].localSyncPending).toBe(true);
    expect(merged[1].localSyncPending).toBeUndefined();
  });

  it('reserves stock used by interventions that are still waiting to sync', async () => {
    await database.enqueueOfflineOperation({
      ownerKey: 'stock@example.com',
      endpoint: '/failure-reports/8/intervention',
      method: 'PUT',
      operationType: 'failure_report.intervention',
      payload: { replacedParts: [{ itemId: 40, quantity: 2 }, { itemId: 40, quantity: 1 }] },
      files: [],
      metadata: { failureId: 8 },
    });

    const items = await offlineApi.applyPendingStockUsage('stock@example.com', [
      { id: 40, name: 'Filtro', stock: 5 },
      { id: 41, name: 'Correa', stock: 2 },
    ]);

    expect(items[0]).toMatchObject({ stock: 2, pendingReservedQuantity: 3 });
    expect(items[1]).toEqual({ id: 41, name: 'Correa', stock: 2 });
  });

  it('keeps form drafts with photos per account until they are cleared', async () => {
    globalThis.localStorage.setItem('email', 'draft@example.com');
    const drafts = await import('../src/services/draftService.js');
    const photo = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });

    await drafts.saveDraft('failure-intervention:5', { form: { rootCause: 'Desgaste' }, evidences: [photo] });
    const restored = await drafts.loadDraft('failure-intervention:5');

    expect(restored.value.form.rootCause).toBe('Desgaste');
    await expect(restored.value.evidences[0].text()).resolves.toBe('jpeg-bytes');
    expect(restored.savedAt).toEqual(expect.any(String));

    globalThis.localStorage.setItem('email', 'other@example.com');
    await expect(drafts.loadDraft('failure-intervention:5')).resolves.toBeNull();

    globalThis.localStorage.setItem('email', 'draft@example.com');
    await drafts.clearDraft('failure-intervention:5');
    await expect(drafts.loadDraft('failure-intervention:5')).resolves.toBeNull();
  });

  it('does not duplicate locally created records', () => {
    const operation = {
      id: 3,
      operationType: 'failure_report.create',
      payload: { assetId: 1 },
    };
    const once = offlineApi.applyPendingOperation([], operation);
    const twice = offlineApi.applyPendingOperation(once, operation);
    expect(twice).toHaveLength(1);
    expect(twice[0].id).toBe('local-3');
  });
});

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}
