import axios, { AxiosError } from 'axios';
import { indexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ owner: 'sync-a@example.com', responses: new Map(), sent: [] }));

vi.mock('../src/services/offlineNetwork.js', () => ({
  isNetworkAvailable: vi.fn().mockResolvedValue(true),
}));
vi.mock('../src/services/sessionService.js', () => ({
  canRefreshSession: () => true,
  ensureFreshToken: vi.fn().mockResolvedValue('token'),
  expireSession: vi.fn(),
  getSessionOwnerKey: () => state.owner,
  isOfflineAuthenticated: () => false,
  refreshSession: vi.fn().mockResolvedValue(false),
}));

globalThis.indexedDB = indexedDB;

// Servidor simulado: responde según la ruta; registra lo enviado.
vi.spyOn(axios, 'getAdapter').mockReturnValue(async (config) => {
  state.sent.push({ url: config.url, key: config.headers?.get?.('Idempotency-Key') });
  const reply = state.responses.get(config.url) ?? { status: 200, data: { ok: true } };
  const response = { status: reply.status, data: reply.data, headers: {}, config, statusText: '' };
  if (reply.status >= 400) {
    throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
  }
  return response;
});

const database = await import('../src/services/offlineDatabase.js');
const sync = await import('../src/services/offlineSync.js');

let ownerCounter = 0;

beforeEach(() => {
  ownerCounter++;
  state.owner = `sync-${ownerCounter}@example.com`;
  state.responses.clear();
  state.sent = [];
});

function enqueue(endpoint, metadata, extra = {}) {
  return database.enqueueOfflineOperation({
    ownerKey: state.owner,
    endpoint,
    method: 'PUT',
    operationType: 'failure_report.intervention',
    payload: { actualFailure: 'Fuga' },
    files: [],
    metadata,
    ...extra,
  });
}

describe('offline sync queue', () => {
  it('sends every operation with its idempotency key and clears the queue', async () => {
    await enqueue('/failure-reports/1/intervention', { failureId: 1 }, { clientOperationId: 'op-fixed-key-1' });

    const result = await sync.syncPendingOfflineOperations();

    expect(result).toMatchObject({ successful: 1, conflicts: 0, failed: 0 });
    expect(state.sent).toEqual([{ url: '/failure-reports/1/intervention', key: 'op-fixed-key-1' }]);
    await expect(sync.getQueuedOperations()).resolves.toEqual([]);
  });

  it('sets aside a rejected operation, holds later work on the same order and continues with the rest', async () => {
    state.responses.set('/failure-reports/5/start-review', {
      status: 409,
      data: { message: 'La orden fue reasignada' },
    });
    await database.enqueueOfflineOperation({
      ownerKey: state.owner,
      endpoint: '/failure-reports/5/start-review',
      method: 'POST',
      operationType: 'failure_report.start_review',
      payload: {},
      files: [],
      metadata: { failureId: 5 },
    });
    await enqueue('/failure-reports/5/intervention', { failureId: 5 });
    await enqueue('/failure-reports/6/intervention', { failureId: 6 });

    const result = await sync.syncPendingOfflineOperations();

    expect(result).toMatchObject({ successful: 1, conflicts: 1, waiting: 1 });
    expect(state.sent.map((item) => item.url)).toEqual([
      '/failure-reports/5/start-review',
      '/failure-reports/6/intervention',
    ]);
    const queued = await sync.getQueuedOperations();
    expect(queued.map((operation) => [operation.endpoint, operation.status])).toEqual([
      ['/failure-reports/5/start-review', 'conflict'],
      ['/failure-reports/5/intervention', 'pending'],
    ]);
    expect(queued[0].lastError).toBe('La orden fue reasignada');
    await expect(sync.getQueueSummary()).resolves.toEqual({ pending: 1, conflicts: 1 });
  });

  it('keeps everything pending and stops when the server is temporarily down', async () => {
    state.responses.set('/failure-reports/7/intervention', { status: 503, data: {} });
    await enqueue('/failure-reports/7/intervention', { failureId: 7 });
    await enqueue('/failure-reports/8/intervention', { failureId: 8 });

    const result = await sync.syncPendingOfflineOperations();

    expect(result).toMatchObject({ successful: 0, failed: 2 });
    expect(state.sent).toHaveLength(1);
    const queued = await sync.getQueuedOperations();
    expect(queued.every((operation) => operation.status === 'pending')).toBe(true);
    expect(queued[0].attempts).toBe(1);
  });

  it('treats an operation still processing on the server as temporary', () => {
    const inProgress = { response: { status: 409, data: { code: 'OPERATION_IN_PROGRESS' } } };
    const reassigned = { response: { status: 409, data: { message: 'Ya fue ejecutado' } } };
    expect(sync.isTransientSyncError(inProgress)).toBe(true);
    expect(sync.isTransientSyncError(reassigned)).toBe(false);
    expect(sync.isTransientSyncError(new Error('Network Error'))).toBe(true);
  });

  it('lets the technician retry a rejected operation once it is fixed, or discard it', async () => {
    state.responses.set('/failure-reports/9/intervention', { status: 400, data: { message: 'Stock insuficiente' } });
    await enqueue('/failure-reports/9/intervention', { failureId: 9 });
    await enqueue('/failure-reports/10/intervention', { failureId: 10 });
    state.responses.set('/failure-reports/10/intervention', { status: 422, data: { message: 'Datos inválidos' } });
    await sync.syncPendingOfflineOperations();

    let queued = await sync.getQueuedOperations();
    expect(queued.map((operation) => operation.status)).toEqual(['conflict', 'conflict']);

    state.responses.delete('/failure-reports/9/intervention');
    const retried = await sync.retryQueuedOperation(queued[0].id);
    expect(retried.successful).toBe(1);

    queued = await sync.getQueuedOperations();
    expect(queued).toHaveLength(1);
    await sync.discardQueuedOperation(queued[0]);
    await expect(sync.getQueuedOperations()).resolves.toEqual([]);
  });

  it('reuses the same key when an online send loses its response and falls back to the queue', async () => {
    // El servidor procesa la petición pero la respuesta nunca llega (mala señal).
    const adapter = axios.getAdapter.getMockImplementation()();
    axios.getAdapter.mockReturnValue(async (config) => {
      if (config.url === '/failure-reports/14/start-review') {
        state.sent.push({ url: config.url, key: config.headers?.get?.('Idempotency-Key') });
        throw new AxiosError('Network Error', 'ERR_NETWORK', config, {});
      }
      return adapter(config);
    });
    vi.resetModules();
    const freshOfflineApi = await import('../src/services/offlineApi.js');
    const freshSync = await import('../src/services/offlineSync.js');

    const result = await freshOfflineApi.sendOrQueueJson({
      endpoint: '/failure-reports/14/start-review',
      method: 'POST',
      payload: { startedAt: '2026-11-21T08:00:00Z' },
      operationType: 'failure_report.start_review',
      metadata: { failureId: 14 },
    });

    expect(result.queued).toBe(true);
    const [queued] = await freshSync.getQueuedOperations();
    expect(state.sent[0].key).toBeTruthy();
    expect(queued.clientOperationId).toBe(state.sent[0].key);
  });

  it('describes queued work in words the technician understands', () => {
    expect(sync.describeOperation({ operationType: 'failure_report.intervention', metadata: { failureId: 12 } }))
      .toBe('Intervención de la orden F-12');
    expect(sync.describeOperation({ operationType: 'preventive_maintenance.execution', metadata: { maintenanceId: 3 } }))
      .toBe('Ejecución del preventivo MP-3');
  });
});
