/**
 * pin.js - Hash del PIN y reglas de bloqueo.
 *
 * El PIN NUNCA se guarda en claro. Se guarda:
 *   { hash, salt, iterations, length }
 * donde hash = PBKDF2-HMAC-SHA256(PIN, salt, iterations).
 *
 * Qué es PBKDF2: aplica una función hash (HMAC-SHA256) miles de veces
 * seguidas. Calcularlo UNA vez tarda una fracción de segundo (aceptable al
 * desbloquear), pero probar millones de PIN se vuelve lento.
 * La SAL (salt) es un valor aleatorio distinto por usuario: evita que alguien
 * use una tabla precalculada de hashes de PIN comunes.
 *
 * LIMITACIÓN HONESTA: un PIN de 4 a 6 dígitos tiene como máximo 1,000,000
 * combinaciones. Quien logre copiar los datos del teléfono podría probarlas
 * todas contra el hash en poco tiempo con una computadora potente. El PIN es
 * una barrera de privacidad casual (alguien que toma tu teléfono desbloqueado),
 * no cifrado. Los datos en IndexedDB siguen sin cifrar.
 *
 * Usa WebCrypto (crypto.subtle), que existe igual en el navegador y en Node,
 * por eso estas funciones se pueden probar con node --test.
 */

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/**
 * Iteraciones de PBKDF2. OWASP recomienda 600,000 para PBKDF2-HMAC-SHA256.
 * Se guarda junto con el hash para poder subirlo en el futuro sin romper los
 * PIN existentes (cada registro recuerda con cuántas se creó).
 */
export const PBKDF2_ITERATIONS = 600_000;

/** Intentos fallidos permitidos antes de empezar a hacer esperar. */
export const FREE_ATTEMPTS = 5;

/**
 * ¿Es un PIN con formato válido? (solo dígitos, de 4 a 6)
 * @param {string} pin
 * @returns {boolean}
 */
export function isValidPin(pin) {
  return typeof pin === 'string' && new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);
}

/**
 * Bytes -> texto Base64 (para guardar binarios como texto).
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Texto Base64 -> bytes.
 * @param {string} base64
 * @returns {Uint8Array}
 */
export function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/**
 * Deriva bytes con PBKDF2-HMAC-SHA256.
 * Paso 1: importKey convierte el secreto en una "llave" utilizable por WebCrypto.
 * Paso 2: deriveBits ejecuta PBKDF2 y devuelve los bits pedidos.
 *
 * @param {string} secret
 * @param {Uint8Array} salt
 * @param {number} iterations
 * @param {number} bits  longitud de salida en bits (256 = 32 bytes)
 * @returns {Promise<Uint8Array>}
 */
export async function pbkdf2(secret, salt, iterations, bits = 256) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, bits);
  return new Uint8Array(derived);
}

/**
 * Crea el registro que se guarda al activar o cambiar el PIN.
 * @param {string} pin
 * @param {number} iterations  (las pruebas usan menos para ir rápido)
 * @returns {Promise<{ hash: string, salt: string, iterations: number, length: number }>}
 */
export async function createPinRecord(pin, iterations = PBKDF2_ITERATIONS) {
  if (!isValidPin(pin)) throw new Error('PIN inválido');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(pin, salt, iterations);
  // length se guarda para enviar el PIN solo al teclear el último dígito,
  // sin botón "OK" (como el desbloqueo del iPhone).
  return { hash: bytesToBase64(hash), salt: bytesToBase64(salt), iterations, length: pin.length };
}

/**
 * Comprueba un PIN contra el registro guardado: recalcula el hash con la misma
 * sal e iteraciones y compara.
 * @param {string} pin
 * @param {{ hash: string, salt: string, iterations: number }} record
 * @returns {Promise<boolean>}
 */
export async function verifyPin(pin, record) {
  if (!isValidPin(pin)) return false;
  const hash = await pbkdf2(pin, base64ToBytes(record.salt), record.iterations);
  return bytesToBase64(hash) === record.hash;
}

/**
 * Espera obligatoria después de un intento fallido.
 *
 * Los primeros FREE_ATTEMPTS (5) fallos no tienen espera. Después se duplica:
 *   fallo 5 -> 30 s, 6 -> 1 min, 7 -> 2 min, 8 -> 4 min ... hasta 15 min.
 * Fórmula: 30 s * 2^(fallos - 5), con tope.
 * Así 1,000,000 de combinaciones a mano serían imposibles, sin dejarte
 * fuera para siempre si te equivocas varias veces.
 *
 * @param {number} failedAttempts  fallos consecutivos acumulados
 * @returns {number} milisegundos de espera (0 = puede intentar ya)
 */
export function lockoutDelayMs(failedAttempts) {
  if (failedAttempts < FREE_ATTEMPTS) return 0;
  const maxDelay = 15 * 60 * 1000;
  return Math.min(30_000 * 2 ** (failedAttempts - FREE_ATTEMPTS), maxDelay);
}

/**
 * ¿Hay que volver a pedir el PIN al regresar de segundo plano?
 * @param {number|null} hiddenAt  Date.now() del momento en que la app se ocultó
 * @param {number} now            Date.now() actual
 * @param {number} timeoutMs      tiempo permitido fuera de la app (0 = siempre)
 * @returns {boolean}
 */
export function shouldRelock(hiddenAt, now, timeoutMs) {
  return hiddenAt !== null && now - hiddenAt >= timeoutMs;
}
