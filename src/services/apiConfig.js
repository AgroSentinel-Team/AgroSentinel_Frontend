import { Capacitor } from '@capacitor/core';

const DEFAULT_API_ORIGIN = Capacitor.isNativePlatform()
  ? 'https://agrosentinel-backend-4f8q.onrender.com'
  : 'http://localhost:8080';

export const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_ORIGIN).replace(/\/+$/, '');
export const API_ROOT = `${API_ORIGIN}/api`;
