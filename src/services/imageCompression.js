/*
 * Comprime las fotos de evidencia antes de guardarlas o enviarlas.
 * Una foto de celular pesa 3–8 MB: con mala señal no sube, y guardar varias
 * en el dispositivo agota el espacio offline. A 1600 px y calidad 0.78 quedan
 * en unos cientos de KB y siguen siendo legibles como evidencia.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.78;
const MIN_BYTES_TO_COMPRESS = 400 * 1024;
const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function jpegName(name) {
  const base = String(name || 'evidencia').replace(/\.[^./\\]+$/, '');
  return `${base}.jpg`;
}

function canCompressInThisEnvironment() {
  return (
    typeof createImageBitmap === 'function' &&
    typeof document !== 'undefined' &&
    typeof File === 'function'
  );
}

export async function compressImage(blob, name) {
  if (
    !(blob instanceof Blob) ||
    !COMPRESSIBLE_TYPES.has(blob.type) ||
    blob.size < MIN_BYTES_TO_COMPRESS ||
    !canCompressInThisEnvironment()
  ) {
    return { blob, name };
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    // Fondo blanco para PNG con transparencia (JPEG no la soporta).
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const output = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!output || output.size >= blob.size) {
      return { blob, name };
    }
    const compressedName = jpegName(name);
    return {
      blob: new File([output], compressedName, { type: 'image/jpeg', lastModified: Date.now() }),
      name: compressedName,
    };
  } catch (error) {
    console.warn('No se pudo comprimir la imagen; se usa la original:', error);
    return { blob, name };
  } finally {
    bitmap?.close?.();
  }
}

/** Pide al navegador que no borre los datos offline cuando falte espacio. */
export async function requestPersistentStorage() {
  try {
    const storage = globalThis.navigator?.storage;
    if (!storage?.persist) return false;
    if (await storage.persisted?.()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}
