/**
 * ids.js - Identificadores únicos (UUID versión 4).
 *
 * crypto.randomUUID() es lo ideal, pero el navegador solo lo ofrece en
 * "contextos seguros" (HTTPS o localhost). Al probar desde el iPhone contra
 * http://IP-de-tu-PC:5173 no existe y la app fallaría al crear cualquier dato.
 * crypto.getRandomValues() sí está disponible siempre, así que lo usamos para
 * construir el UUID a mano cuando hace falta.
 */

/**
 * Convierte 16 bytes aleatorios en un UUID v4 con formato
 * xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.
 *
 * Los UUID v4 reservan unos bits para identificarse:
 * - byte 6: los 4 bits altos valen 0100 (versión 4) -> (b & 0x0f) | 0x40
 * - byte 8: los 2 bits altos valen 10 (variante RFC 4122) -> (b & 0x3f) | 0x80
 * Los 122 bits restantes son aleatorios.
 *
 * @param {Uint8Array} bytes  exactamente 16 bytes aleatorios (se modifica)
 * @returns {string}
 */
export function uuidFromBytes(bytes) {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Genera un id nuevo para cualquier registro (gasto, categoría, etc.).
 * @returns {string} UUID v4
 */
export function newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return uuidFromBytes(crypto.getRandomValues(new Uint8Array(16)));
}
