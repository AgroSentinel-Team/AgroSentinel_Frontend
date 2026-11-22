import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { API_ROOT } from './apiConfig';
import { isNetworkAvailable } from './offlineNetwork';

export const SESSION_EXPIRED_EVENT = 'agrosentinel:session-expired';
export const SESSION_CHANGED_EVENT = 'agrosentinel:session-changed';

/*
 * Modelo de sesión offline-first
 * ------------------------------
 * - El token de acceso (JWT) dura poco (1 h). El refresh token dura días y permite
 *   pedir un token nuevo sin contraseña.
 * - Con "Recordar sesión" ambos se guardan en el dispositivo (SecureStorage en Android,
 *   localStorage en web). Al abrir la app sin internet, el usuario entra en "modo local":
 *   consulta lo descargado y sus cambios se encolan.
 * - Cuando vuelve la conexión, el token se renueva solo y la cola se sincroniza,
 *   sin volver a pedir la contraseña.
 */

const REMEMBERED_SESSION_KEY = 'remembered_session';
const WEB_REMEMBERED_SESSION_KEY = 'agro_remembered_session';
const LEGACY_WEB_TOKEN_KEY = 'token';
const REFRESH_LOCK_NAME = 'agrosentinel-session-refresh';
const ACCESS_TOKEN_MARGIN_SECONDS = 60;
const PROACTIVE_REFRESH_SECONDS = 120;
const REFRESH_TIMEOUT_MS = 15000;

let activeToken = null;
let refreshToken = null;
let refreshTokenExpiresAt = null;
let remembered = false;
let offlineAuthenticated = false;
let refreshInFlight = null;
let proactiveTimer = null;

function readTokenClaims(token) {
  if (!token || token.split('.').length !== 3) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return JSON.parse(atob(paddedPayload));
  } catch {
    return null;
  }
}

export function hasUnexpiredToken(token, marginSeconds = 0) {
  const claims = readTokenClaims(token);
  return typeof claims?.exp === 'number' && (claims.exp - marginSeconds) * 1000 > Date.now();
}

function hasUsableRefreshToken() {
  if (!refreshToken) return false;
  if (!refreshTokenExpiresAt) return true;
  const expiresAt = Date.parse(refreshTokenExpiresAt);
  return Number.isNaN(expiresAt) || expiresAt > Date.now();
}

/** Hay una sesión que puede renovarse sin pedir la contraseña. */
export function canRefreshSession() {
  return hasUsableRefreshToken();
}

export function getAuthToken() {
  if (activeToken && hasUnexpiredToken(activeToken)) {
    return activeToken;
  }
  if (activeToken && (remembered || refreshToken)) {
    // El token venció pero la identidad sigue en el dispositivo: modo local hasta renovar.
    activeToken = null;
    offlineAuthenticated = true;
  }
  return null;
}

export function getSessionOwnerKey() {
  const email = localStorage.getItem('email')?.trim().toLowerCase();
  if (email) {
    return email;
  }
  const claims = readTokenClaims(getAuthToken());
  const identity = claims?.email ?? claims?.sub;
  return typeof identity === 'string' && identity.trim()
    ? identity.trim().toLowerCase()
    : null;
}

export function isOfflineAuthenticated() {
  getAuthToken();
  return offlineAuthenticated;
}

/** Modo local sin forma de renovar: hace falta iniciar sesión con internet. */
export function needsOnlineLogin() {
  return isOfflineAuthenticated() && !hasUsableRefreshToken();
}

export function isSessionAuthenticated() {
  return Boolean(getAuthToken()) || offlineAuthenticated;
}

/* ---------- Persistencia ---------- */

async function readPersistedSession() {
  if (Capacitor.isNativePlatform()) {
    localStorage.removeItem(LEGACY_WEB_TOKEN_KEY);
    const stored = await SecureStorage.get(REMEMBERED_SESSION_KEY);
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : null;
  }
  try {
    const stored = JSON.parse(localStorage.getItem(WEB_REMEMBERED_SESSION_KEY) ?? 'null');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) return stored;
  } catch {
    localStorage.removeItem(WEB_REMEMBERED_SESSION_KEY);
  }
  // Compatibilidad con la versión anterior, que guardaba solo el JWT.
  const legacyToken = localStorage.getItem(LEGACY_WEB_TOKEN_KEY);
  if (legacyToken) {
    return {
      token: legacyToken,
      email: localStorage.getItem('email') ?? '',
      role: localStorage.getItem('rol') ?? '',
      roles: parseRoles(localStorage.getItem('roles')),
      name: localStorage.getItem('nombre') ?? '',
    };
  }
  return null;
}

async function writePersistedSession(session) {
  if (Capacitor.isNativePlatform()) {
    await SecureStorage.set(REMEMBERED_SESSION_KEY, session);
    return;
  }
  localStorage.setItem(WEB_REMEMBERED_SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(LEGACY_WEB_TOKEN_KEY);
}

async function removePersistedSession() {
  localStorage.removeItem(LEGACY_WEB_TOKEN_KEY);
  localStorage.removeItem(WEB_REMEMBERED_SESSION_KEY);
  if (Capacitor.isNativePlatform()) {
    await SecureStorage.remove(REMEMBERED_SESSION_KEY);
  }
}

function currentSnapshot() {
  return {
    token: activeToken,
    refreshToken,
    refreshTokenExpiresAt,
    email: localStorage.getItem('email') ?? '',
    role: localStorage.getItem('rol') ?? '',
    roles: parseRoles(localStorage.getItem('roles')),
    name: localStorage.getItem('nombre') ?? '',
  };
}

function writeProfile({ email, role, roles, name }) {
  if (email) localStorage.setItem('email', email.trim().toLowerCase());
  localStorage.setItem('rol', String(role ?? ''));
  localStorage.setItem('roles', JSON.stringify(Array.isArray(roles) ? roles : []));
  localStorage.setItem('nombre', String(name ?? ''));
}

/* ---------- Ciclo de vida ---------- */

function applyTokens(session) {
  activeToken = hasUnexpiredToken(session.token) ? session.token : null;
  refreshToken = typeof session.refreshToken === 'string' && session.refreshToken
    ? session.refreshToken
    : null;
  refreshTokenExpiresAt = session.refreshTokenExpiresAt ?? null;
  offlineAuthenticated = !activeToken;
  scheduleProactiveRefresh();
}

export async function establishSession(session, remember = false) {
  const { token, email } = session;
  if (!hasUnexpiredToken(token)) {
    throw new Error('El token de sesión no es válido o ya venció.');
  }
  if (!email) {
    throw new Error('El inicio de sesión no devolvió el correo del usuario.');
  }
  remembered = remember;
  applyTokens(session);
  writeProfile(session);
  if (remember) {
    await writePersistedSession(currentSnapshot());
  } else {
    await removePersistedSession();
  }
  notifySessionChanged();
}

export async function restoreRememberedSession() {
  const stored = await readPersistedSession();
  if (
    !stored ||
    typeof stored.token !== 'string' ||
    typeof stored.email !== 'string' ||
    !stored.email.trim()
  ) {
    resetMemory();
    return;
  }

  remembered = true;
  applyTokens(stored);
  writeProfile(stored);
  // Migra el formato anterior y deja la sesión guardada de forma persistente.
  await writePersistedSession(currentSnapshot());
  notifySessionChanged();

  if (!activeToken && hasUsableRefreshToken()) {
    void refreshSession();
  }
}

/**
 * Renueva el token de acceso con el refresh token.
 * Devuelve true si hay un token válido al terminar. Si el servidor rechaza el
 * refresh token, la sesión se cierra; si solo falla la red, se sigue en modo local.
 */
export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(performRefresh).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function withRefreshLock(task) {
  const locks = globalThis.navigator?.locks;
  if (locks?.request) {
    return locks.request(REFRESH_LOCK_NAME, task);
  }
  return task();
}

async function adoptNewerPersistedSession() {
  // Otra pestaña pudo haber renovado ya la sesión: se reutiliza su resultado.
  if (!remembered) return false;
  try {
    const stored = await readPersistedSession();
    if (
      stored?.refreshToken &&
      stored.refreshToken !== refreshToken &&
      stored.email?.trim().toLowerCase() === getSessionOwnerKey()
    ) {
      applyTokens(stored);
      return true;
    }
  } catch (error) {
    console.error('No se pudo leer la sesion guardada:', error);
  }
  return false;
}

async function performRefresh() {
  if (await adoptNewerPersistedSession()) {
    if (activeToken && hasUnexpiredToken(activeToken, ACCESS_TOKEN_MARGIN_SECONDS)) {
      notifySessionChanged();
      return true;
    }
  }
  if (!hasUsableRefreshToken()) return false;
  if (!(await isNetworkAvailable())) return false;

  const presentedToken = refreshToken;
  let response;
  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS) : null;
    try {
      response = await fetch(`${API_ROOT}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: presentedToken }),
        signal: controller?.signal,
      });
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  } catch {
    // Sin red o servidor inalcanzable: se mantiene el modo local.
    return false;
  }

  if (response.status === 401 || response.status === 400 || response.status === 403) {
    if (refreshToken !== presentedToken || (await adoptNewerPersistedSession())) {
      return Boolean(activeToken);
    }
    expireSession();
    return false;
  }
  if (!response.ok) {
    return false;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return false;
  }
  if (!hasUnexpiredToken(data?.token)) return false;

  applyTokens({
    token: data.token,
    refreshToken: data.refreshToken ?? presentedToken,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? refreshTokenExpiresAt,
  });
  writeProfile({
    email: data.email ?? localStorage.getItem('email'),
    role: data.rol ?? localStorage.getItem('rol'),
    roles: Array.isArray(data.roles) ? data.roles : parseRoles(localStorage.getItem('roles')),
    name: data.nombre ?? localStorage.getItem('nombre'),
  });
  if (remembered) {
    try {
      await writePersistedSession(currentSnapshot());
    } catch (error) {
      console.error('No se pudo guardar la sesion renovada:', error);
    }
  }
  notifySessionChanged();
  return true;
}

/**
 * Devuelve un token de acceso vigente, renovándolo si está por vencer y hay red.
 * Devuelve null en modo local (sin red o sin forma de renovar).
 */
export async function ensureFreshToken() {
  const token = getAuthToken();
  if (token && hasUnexpiredToken(token, ACCESS_TOKEN_MARGIN_SECONDS)) {
    return token;
  }
  if (hasUsableRefreshToken()) {
    await refreshSession();
  }
  return getAuthToken();
}

function scheduleProactiveRefresh() {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
  const claims = readTokenClaims(activeToken);
  if (!claims?.exp || !refreshToken || typeof setTimeout !== 'function') return;
  const delay = Math.max(5000, (claims.exp - PROACTIVE_REFRESH_SECONDS) * 1000 - Date.now());
  proactiveTimer = setTimeout(() => {
    proactiveTimer = null;
    void refreshSession();
  }, Math.min(delay, 2_147_000_000));
}

function resetMemory() {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
  activeToken = null;
  refreshToken = null;
  refreshTokenExpiresAt = null;
  remembered = false;
  offlineAuthenticated = false;
}

/** El servidor invalidó la sesión: se borra todo y se pide iniciar sesión. */
export function expireSession() {
  resetMemory();
  clearSessionProfile();
  void removePersistedSession().catch((error) => {
    console.error('No se pudo borrar la sesion recordada:', error);
  });
  globalThis.dispatchEvent?.(new Event(SESSION_EXPIRED_EVENT));
  notifySessionChanged();
}

/** Cierre de sesión voluntario. Revoca el refresh token en el servidor si hay red. */
export async function clearSession() {
  const tokenToRevoke = refreshToken;
  resetMemory();
  clearSessionProfile();
  await removePersistedSession();
  notifySessionChanged();
  if (tokenToRevoke) {
    void revokeRemoteSession(tokenToRevoke);
  }
}

async function revokeRemoteSession(token) {
  try {
    if (!(await isNetworkAvailable())) return;
    await fetch(`${API_ROOT}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });
  } catch {
    // Si no se pudo revocar, el token vencerá solo; ya no existe en el dispositivo.
  }
}

function clearSessionProfile() {
  localStorage.removeItem('email');
  localStorage.removeItem('rol');
  localStorage.removeItem('roles');
  localStorage.removeItem('nombre');
}

function parseRoles(roles) {
  if (Array.isArray(roles)) return roles;
  try {
    const parsed = JSON.parse(roles ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function notifySessionChanged() {
  globalThis.dispatchEvent?.(new Event(SESSION_CHANGED_EVENT));
}
