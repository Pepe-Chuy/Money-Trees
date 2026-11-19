/**
 * storage.js - Persistencia del almacenamiento del navegador.
 *
 * Por defecto el almacenamiento de un sitio es "best-effort": si el dispositivo
 * se queda sin espacio, el navegador puede borrarlo sin avisar. Además, Safari
 * borra los datos de sitios que no se visitan en 7 días, aunque esa regla NO
 * aplica a las apps añadidas a la pantalla de inicio.
 *
 * navigator.storage.persist() pide marcar el almacenamiento como "persistente"
 * (el navegador no lo borra automáticamente). El navegador decide si lo concede;
 * en iOS suele concederse a las PWA instaladas. Aun así, el respaldo JSON
 * (fase 2) sigue siendo la protección real ante cambio de teléfono o borrado.
 */

/**
 * Pide almacenamiento persistente si el navegador lo soporta.
 * @returns {Promise<{ supported: boolean, persisted: boolean }>}
 */
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return { supported: false, persisted: false };
  // Si ya se concedió antes, no hace falta volver a pedirlo.
  if (await navigator.storage.persisted()) return { supported: true, persisted: true };
  return { supported: true, persisted: await navigator.storage.persist() };
}

/**
 * Espacio usado y cuota disponible, en bytes (aproximado; el navegador redondea).
 * @returns {Promise<{ usage: number, quota: number } | null>} null si no hay soporte
 */
export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
