import {
  cacheCollection,
  deleteCachedCollection,
  readCachedCollection,
} from './offlineDatabase';
import { getSessionOwnerKey } from './sessionService';

/*
 * Borradores de formularios guardados en el dispositivo (IndexedDB), por cuenta.
 * Incluyen las fotos ya tomadas: si la app se cierra a mitad de una intervención,
 * el técnico la retoma donde la dejó, con o sin internet.
 */

const DRAFT_PREFIX = 'draft:';

export async function loadDraft(key) {
  const ownerKey = getSessionOwnerKey();
  if (!ownerKey) return null;
  try {
    const draft = await readCachedCollection(ownerKey, DRAFT_PREFIX + key);
    return draft && typeof draft === 'object' && 'value' in draft ? draft : null;
  } catch (error) {
    console.error('No se pudo leer el borrador:', error);
    return null;
  }
}

export async function saveDraft(key, value) {
  const ownerKey = getSessionOwnerKey();
  if (!ownerKey) return;
  try {
    await cacheCollection(ownerKey, DRAFT_PREFIX + key, {
      value,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('No se pudo guardar el borrador:', error);
  }
}

export async function clearDraft(key) {
  const ownerKey = getSessionOwnerKey();
  if (!ownerKey) return;
  try {
    await deleteCachedCollection(ownerKey, DRAFT_PREFIX + key);
  } catch (error) {
    console.error('No se pudo borrar el borrador:', error);
  }
}
