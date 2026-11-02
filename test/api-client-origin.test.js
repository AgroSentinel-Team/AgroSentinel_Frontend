import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('API origin selection', () => {
  it('uses the deployed backend for a native Android app', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    const { API_ORIGIN, API_ROOT } = await import('../src/services/apiClient.js');

    expect(API_ORIGIN).toBe('https://agrosentinel-backend-4f8q.onrender.com');
    expect(API_ROOT).toBe('https://agrosentinel-backend-4f8q.onrender.com/api');
  });

  it('keeps the local backend as the browser development default', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    const { API_ORIGIN, API_ROOT } = await import('../src/services/apiClient.js');

    expect(API_ORIGIN).toBe('http://localhost:8080');
    expect(API_ROOT).toBe('http://localhost:8080/api');
  });

  it('allows an explicit backend override on either platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/');

    const { API_ORIGIN, API_ROOT } = await import('../src/services/apiClient.js');

    expect(API_ORIGIN).toBe('https://api.example.test');
    expect(API_ROOT).toBe('https://api.example.test/api');
  });
});
