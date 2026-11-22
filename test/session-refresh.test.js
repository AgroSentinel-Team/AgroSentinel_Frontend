import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isNetworkAvailable } = vi.hoisted(() => ({
  isNetworkAvailable: vi.fn(),
}));

vi.mock('../src/services/offlineNetwork.js', () => ({
  isNetworkAvailable,
}));

globalThis.localStorage = createMemoryStorage();

let session;

beforeEach(async () => {
  vi.resetModules();
  vi.restoreAllMocks();
  isNetworkAvailable.mockReset();
  isNetworkAvailable.mockResolvedValue(true);
  globalThis.localStorage.clear();
  globalThis.fetch = vi.fn();
  session = await import('../src/services/sessionService.js');
});

describe('remembered field session', () => {
  it('keeps the remembered session across several app restarts on web', async () => {
    await session.establishSession(sessionPayload(makeToken(3600)), true);

    for (let restart = 0; restart < 3; restart++) {
      vi.resetModules();
      session = await import('../src/services/sessionService.js');
      await session.restoreRememberedSession();
      expect(session.isSessionAuthenticated()).toBe(true);
      expect(session.getSessionOwnerKey()).toBe('tecnico@example.com');
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('renews an expired access token without asking for the password', async () => {
    await session.establishSession(sessionPayload(makeToken(3600)), true);
    persistWithToken(makeToken(-60));
    vi.resetModules();
    session = await import('../src/services/sessionService.js');

    const renewed = makeToken(3600);
    globalThis.fetch.mockResolvedValue(jsonResponse(200, {
      token: renewed,
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: futureIso(14),
      email: 'tecnico@example.com',
      rol: 'TECNICO',
      roles: ['TECNICO'],
      nombre: 'Técnico',
    }));

    await session.restoreRememberedSession();
    await expect(session.ensureFreshToken()).resolves.toBe(renewed);

    expect(session.isOfflineAuthenticated()).toBe(false);
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/refresh$/);
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'refresh-1' });
    expect(JSON.parse(localStorage.getItem('agro_remembered_session')).refreshToken).toBe('refresh-2');
  });

  it('stays in local mode while offline instead of logging out', async () => {
    await session.establishSession(sessionPayload(makeToken(3600)), true);
    persistWithToken(makeToken(-60));
    vi.resetModules();
    session = await import('../src/services/sessionService.js');
    isNetworkAvailable.mockResolvedValue(false);

    await session.restoreRememberedSession();
    await expect(session.ensureFreshToken()).resolves.toBeNull();

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(session.isSessionAuthenticated()).toBe(true);
    expect(session.isOfflineAuthenticated()).toBe(true);
    expect(session.needsOnlineLogin()).toBe(false);
  });

  it('stays in local mode when the server cannot be reached', async () => {
    await session.establishSession(sessionPayload(makeToken(3600)), true);
    persistWithToken(makeToken(-60));
    vi.resetModules();
    session = await import('../src/services/sessionService.js');
    globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await session.restoreRememberedSession();
    await expect(session.refreshSession()).resolves.toBe(false);

    expect(session.isSessionAuthenticated()).toBe(true);
    expect(localStorage.getItem('agro_remembered_session')).not.toBeNull();
  });

  it('ends the session when the server rejects the refresh token', async () => {
    await session.establishSession(sessionPayload(makeToken(3600)), true);
    persistWithToken(makeToken(-60));
    vi.resetModules();
    session = await import('../src/services/sessionService.js');
    globalThis.fetch.mockResolvedValue(jsonResponse(401, { message: 'La sesión guardada ya no es válida.' }));
    const dispatched = [];
    globalThis.dispatchEvent = (event) => dispatched.push(event.type);

    await session.restoreRememberedSession();
    await expect(session.refreshSession()).resolves.toBe(false);

    expect(session.isSessionAuthenticated()).toBe(false);
    expect(localStorage.getItem('agro_remembered_session')).toBeNull();
    expect(dispatched).toContain('agrosentinel:session-expired');
    delete globalThis.dispatchEvent;
  });

  it('migrates the previous web format that stored only the JWT', async () => {
    localStorage.setItem('token', makeToken(3600));
    localStorage.setItem('email', 'legacy@example.com');
    localStorage.setItem('rol', 'TECNICO');

    await session.restoreRememberedSession();

    expect(session.isSessionAuthenticated()).toBe(true);
    expect(localStorage.getItem('token')).toBeNull();
    expect(JSON.parse(localStorage.getItem('agro_remembered_session')).email).toBe('legacy@example.com');
  });

  it('logout removes the stored session and revokes it on the server', async () => {
    await session.establishSession(sessionPayload(makeToken(3600)), true);
    globalThis.fetch.mockResolvedValue(jsonResponse(204, null));

    await session.clearSession();
    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    expect(session.isSessionAuthenticated()).toBe(false);
    expect(localStorage.getItem('agro_remembered_session')).toBeNull();
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/logout$/);
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'refresh-1' });
  });

  it('does not persist anything when the user opts out of remembering', async () => {
    await session.establishSession(sessionPayload(makeToken(3600)), false);

    expect(session.isSessionAuthenticated()).toBe(true);
    expect(localStorage.getItem('agro_remembered_session')).toBeNull();
  });
});

function sessionPayload(token) {
  return {
    token,
    refreshToken: 'refresh-1',
    refreshTokenExpiresAt: futureIso(14),
    email: 'tecnico@example.com',
    role: 'TECNICO',
    roles: ['TECNICO'],
    name: 'Técnico',
  };
}

function persistWithToken(token) {
  const stored = JSON.parse(localStorage.getItem('agro_remembered_session'));
  localStorage.setItem('agro_remembered_session', JSON.stringify({ ...stored, token }));
}

function futureIso(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function makeToken(secondsFromNow) {
  const encode = (value) => btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'tecnico@example.com', exp })}.signature`;
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}
