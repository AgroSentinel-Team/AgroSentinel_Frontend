import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export async function isNetworkAvailable() {
  if (Capacitor.isNativePlatform()) {
    const status = await Network.getStatus();
    return status.connected;
  }
  return globalThis.navigator?.onLine ?? false;
}

export async function subscribeToNetworkChanges(onChange) {
  const handleBrowserChange = () => {
    void onChange(globalThis.navigator?.onLine ?? false);
  };
  globalThis.addEventListener?.('online', handleBrowserChange);
  globalThis.addEventListener?.('offline', handleBrowserChange);

  let nativeListener;
  if (Capacitor.isNativePlatform()) {
    nativeListener = await Network.addListener('networkStatusChange', (status) => {
      void onChange(status.connected);
    });
  }

  return async () => {
    globalThis.removeEventListener?.('online', handleBrowserChange);
    globalThis.removeEventListener?.('offline', handleBrowserChange);
    await nativeListener?.remove();
  };
}
