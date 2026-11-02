import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

export const SESSION_EXPIRED_EVENT = 'agrosentinel:session-expired';
export const SESSION_CHANGED_EVENT = 'agrosentinel:session-changed';

const REMEMBERED_SESSION_KEY = 'remembered_session';
let activeToken = null;
let offlineAuthenticated = false;
let rememberedSessionAvailable = false;

export function hasUnexpiredToken(token) {
  if (!token || token.split('.').length !== 3) return false;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const claims = JSON.parse(atob(paddedPayload));
    return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getAuthToken() {
  if (activeToken && hasUnexpiredToken(activeToken)) {
    return activeToken;
  }
  if (activeToken && rememberedSessionAvailable) {
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
  const token = getAuthToken();
  if (!token) {
    return null;
  }
  try {
    const encodedPayload = token.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(token.split('.')[1].length / 4) * 4, '=');
    const payload = JSON.parse(atob(encodedPayload));
    const identity = payload.email ?? payload.sub;
    return typeof identity === 'string' && identity.trim()
      ? identity.trim().toLowerCase()
      : null;
  } catch {
    return null;
  }
}

export function isOfflineAuthenticated() {
  return offlineAuthenticated;
}

export function isSessionAuthenticated() {
  return Boolean(getAuthToken()) || offlineAuthenticated;
}

export async function establishSession(session, remember = false) {
  const { token, email, role, roles, name } = session;
  if (!hasUnexpiredToken(token)) {
    throw new Error('El token de sesion no es valido o ya vencio.');
  }
  const rememberedSession = {
    token,
    email,
    role: role ?? '',
    roles: Array.isArray(roles) ? roles : [],
    name: name ?? '',
  };
  if (Capacitor.isNativePlatform()) {
    localStorage.removeItem('token');
    if (remember) {
      await SecureStorage.set(REMEMBERED_SESSION_KEY, rememberedSession);
    } else {
      await SecureStorage.remove(REMEMBERED_SESSION_KEY);
    }
  } else if (remember) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
  activeToken = token;
  offlineAuthenticated = false;
  rememberedSessionAvailable = remember;
  localStorage.setItem('email', email);
  localStorage.setItem('rol', role ?? '');
  localStorage.setItem('roles', JSON.stringify(Array.isArray(roles) ? roles : []));
  localStorage.setItem('nombre', name ?? '');
  notifySessionChanged();
}

export async function restoreRememberedSession() {
  let rememberedSession;
  if (Capacitor.isNativePlatform()) {
    localStorage.removeItem('token');
    const stored = await SecureStorage.get(REMEMBERED_SESSION_KEY);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      rememberedSession = stored;
    }
  } else {
    const token = localStorage.getItem('token');
    if (token) {
      rememberedSession = {
        token,
        email: localStorage.getItem('email') ?? '',
        role: localStorage.getItem('rol') ?? '',
        roles: parseRoles(localStorage.getItem('roles')),
        name: localStorage.getItem('nombre') ?? '',
      };
    }
  }

  if (
    !rememberedSession ||
    typeof rememberedSession.token !== 'string' ||
    typeof rememberedSession.email !== 'string' ||
    !rememberedSession.email.trim()
  ) {
    activeToken = null;
    offlineAuthenticated = false;
    rememberedSessionAvailable = false;
    return;
  }

  rememberedSessionAvailable = true;
  const tokenIsValid = hasUnexpiredToken(rememberedSession.token);
  activeToken = tokenIsValid ? rememberedSession.token : null;
  offlineAuthenticated = !tokenIsValid;
  localStorage.setItem('email', rememberedSession.email);
  localStorage.setItem('rol', String(rememberedSession.role ?? ''));
  localStorage.setItem(
    'roles',
    JSON.stringify(Array.isArray(rememberedSession.roles) ? rememberedSession.roles : []),
  );
  localStorage.setItem('nombre', String(rememberedSession.name ?? ''));
  localStorage.removeItem('token');
  notifySessionChanged();
}

export function expireSession() {
  activeToken = null;
  offlineAuthenticated = false;
  rememberedSessionAvailable = false;
  clearSessionProfile();
  if (Capacitor.isNativePlatform()) {
    void SecureStorage.remove(REMEMBERED_SESSION_KEY).catch((error) => {
      console.error('No se pudo borrar la sesion recordada:', error);
    });
  }
  globalThis.dispatchEvent?.(new Event(SESSION_EXPIRED_EVENT));
  notifySessionChanged();
}

export async function clearSession() {
  activeToken = null;
  offlineAuthenticated = false;
  rememberedSessionAvailable = false;
  clearSessionProfile();
  if (Capacitor.isNativePlatform()) {
    await SecureStorage.remove(REMEMBERED_SESSION_KEY);
  }
  notifySessionChanged();
}

export function expireSessionIfTokenExpired() {
  if (hasUnexpiredToken(getAuthToken())) return false;
  if (rememberedSessionAvailable) {
    offlineAuthenticated = true;
    notifySessionChanged();
    return false;
  }
  if (offlineAuthenticated) return false;
  expireSession();
  return true;
}

function clearSessionProfile() {
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  localStorage.removeItem('rol');
  localStorage.removeItem('roles');
  localStorage.removeItem('nombre');
}

function parseRoles(roles) {
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
