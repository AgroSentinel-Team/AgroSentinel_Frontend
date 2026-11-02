import axios from 'axios';
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

const { createApi } = await import('../src/services/apiClient.js');

beforeEach(() => {
  vi.restoreAllMocks();
  isNetworkAvailable.mockReset();
  globalThis.localStorage.clear();
  globalThis.localStorage.setItem('email', 'admin@example.com');
});

describe('offline HTTP cache', () => {
  it('caches successful API reads and serves them when disconnected', async () => {
    const backendResponse = {
      data: [{ id: 8, nombre: 'Tractor norte' }],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
      request: {},
    };
    const networkAdapter = vi.fn().mockResolvedValue(backendResponse);
    vi.spyOn(axios, 'getAdapter').mockReturnValue(networkAdapter);
    isNetworkAvailable
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const api = createApi('https://api.example.test/api', false);
    const online = await api.get('/assets');
    const offline = await api.get('/assets');

    expect(online.data).toEqual(backendResponse.data);
    expect(offline.data).toEqual(backendResponse.data);
    expect(offline.headers['x-agrosentinel-cache']).toBe('offline');
    expect(networkAdapter).toHaveBeenCalledTimes(1);
  });

  it('does not expose one account cached responses to another account', async () => {
    const networkAdapter = vi.fn();
    vi.spyOn(axios, 'getAdapter').mockReturnValue(networkAdapter);
    isNetworkAvailable.mockResolvedValue(false);
    globalThis.localStorage.setItem('email', 'different-account@example.com');

    const api = createApi('https://api.example.test/api', false);
    await expect(api.get('/assets')).rejects.toThrow('No hay conexión');
    expect(networkAdapter).not.toHaveBeenCalled();
  });

  it('rejects writes instead of pretending unsupported changes were saved offline', async () => {
    const networkAdapter = vi.fn();
    vi.spyOn(axios, 'getAdapter').mockReturnValue(networkAdapter);
    isNetworkAvailable.mockResolvedValue(false);

    const api = createApi('https://api.example.test/api', false);
    await expect(api.post('/inventory/items', { cantidad: 2 }))
      .rejects.toThrow('no está habilitada para guardarse offline');
    expect(networkAdapter).not.toHaveBeenCalled();
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
