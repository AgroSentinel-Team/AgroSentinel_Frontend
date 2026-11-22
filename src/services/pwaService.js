import { Capacitor } from '@capacitor/core';

/*
 * App web instalable y offline (PWA)
 * ----------------------------------
 * - El service worker guarda los archivos de la app para que la web abra sin internet.
 * - Cuando se publica una versión nueva, NO se recarga sola (el técnico podría estar
 *   llenando un formulario): se avisa y el usuario decide cuándo actualizar.
 * - En Android (Capacitor) no se registra: la app ya viene completa dentro del APK y
 *   un service worker ahí podría servir archivos viejos después de actualizar la app.
 */

export const PWA_UPDATE_AVAILABLE_EVENT = 'agrosentinel:pwa-update-available';
export const PWA_OFFLINE_READY_EVENT = 'agrosentinel:pwa-offline-ready';
export const PWA_INSTALL_AVAILABLE_EVENT = 'agrosentinel:pwa-install-available';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

let applyUpdate = null;
let updateAvailable = false;
let offlineReady = false;
let deferredInstallPrompt = null;

function emit(name) {
  globalThis.dispatchEvent?.(new Event(name));
}

export function isPwaUpdateAvailable() {
  return updateAvailable;
}

export function isPwaOfflineReady() {
  return offlineReady;
}

export function canInstallPwa() {
  return Boolean(deferredInstallPrompt);
}

/** Activa la versión nueva y recarga la página. */
export async function applyPwaUpdate() {
  if (applyUpdate) {
    await applyUpdate(true);
  } else {
    globalThis.location?.reload();
  }
}

/** Muestra el diálogo del navegador para instalar la app. Devuelve true si se instaló. */
export async function promptPwaInstall() {
  const prompt = deferredInstallPrompt;
  if (!prompt) return false;
  deferredInstallPrompt = null;
  emit(PWA_INSTALL_AVAILABLE_EVENT);
  await prompt.prompt();
  const choice = await prompt.userChoice;
  return choice?.outcome === 'accepted';
}

export async function setupPwa() {
  if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator) || import.meta.env.DEV) {
    return;
  }

  globalThis.addEventListener('beforeinstallprompt', (event) => {
    // Se guarda para mostrar un botón propio "Instalar app" en lugar del aviso del navegador.
    event.preventDefault();
    deferredInstallPrompt = event;
    emit(PWA_INSTALL_AVAILABLE_EVENT);
  });
  globalThis.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    emit(PWA_INSTALL_AVAILABLE_EVENT);
  });

  try {
    const { registerSW } = await import('virtual:pwa-register');
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateAvailable = true;
        emit(PWA_UPDATE_AVAILABLE_EVENT);
      },
      onOfflineReady() {
        offlineReady = true;
        emit(PWA_OFFLINE_READY_EVENT);
      },
      onRegisteredSW(_url, registration) {
        // Las apps abiertas todo el día en campo buscan versiones nuevas cada hora.
        if (!registration) return;
        setInterval(() => {
          if (navigator.onLine) void registration.update().catch(() => {});
        }, UPDATE_CHECK_INTERVAL_MS);
      },
      onRegisterError(error) {
        console.error('No se pudo registrar el service worker:', error);
      },
    });
  } catch (error) {
    console.error('No se pudo iniciar el modo offline de la web:', error);
  }
}
