import { indexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isNetworkAvailable } = vi.hoisted(() => ({
  isNetworkAvailable: vi.fn(),
}));

vi.mock('../src/services/offlineNetwork.js', () => ({
  isNetworkAvailable,
}));

globalThis.indexedDB = indexedDB;
globalThis.localStorage = createMemoryStorage();

const database = await import('../src/services/offlineDatabase.js');
const offlineApi = await import('../src/services/offlineApi.js');
const { savePredictiveFeedback } = await import('../src/services/assetService.js');

beforeEach(() => {
  isNetworkAvailable.mockResolvedValue(false);
  globalThis.localStorage.clear();
  globalThis.localStorage.setItem('email', 'predictive-tech@example.com');
});

describe('offline predictive feedback', () => {
  it('queues the Spring feedback request with the retraining flag', async () => {
    const record = { id: 42, tipoFallaPredicha: 'Overheating' };
    await database.cacheCollection('predictive-tech@example.com', 'predictive-assets', [
      { assetId: 7, latestRecord: record },
    ]);
    await database.cacheCollection(
      'predictive-tech@example.com',
      'predictive-history:7',
      [record],
    );

    const result = await savePredictiveFeedback(42, 'Overheating', true, 7);
    const pending = await database.listPendingOperations('predictive-tech@example.com');

    expect(result.queued).toBe(true);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      endpoint: '/predictive/records/42/feedback',
      method: 'PUT',
      operationType: 'predictive.feedback',
      payload: {
        fallaRealConfirmada: 'Overheating',
        guardarParaReentrenamiento: true,
      },
      metadata: { recordId: 42, assetId: 7 },
    });
    await expect(
      database.readCachedCollection('predictive-tech@example.com', 'predictive-history:7'),
    ).resolves.toEqual([
      {
        ...record,
        fallaRealConfirmada: 'Overheating',
        guardarParaReentrenamiento: true,
        localSyncPending: true,
      },
    ]);

    await offlineApi.updatePredictiveFeedbackCache(
      'predictive-tech@example.com',
      pending[0].metadata,
      { fallaRealConfirmada: 'Overheating', guardarParaReentrenamiento: true },
      false,
    );
    await expect(
      database.readCachedCollection('predictive-tech@example.com', 'predictive-history:7'),
    ).resolves.toMatchObject([{ id: 42, localSyncPending: false }]);
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
    removeItem(key) {
      values.delete(key);
    },
  };
}
