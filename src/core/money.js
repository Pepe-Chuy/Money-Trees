/**
 * money.js - Manejo de dinero en centavos.
 *
 * Convención de toda la app: el dinero se guarda SIEMPRE como entero en
 * centavos ($1,234.56 -> 123456). Motivo: los números de JavaScript son
 * flotantes binarios (IEEE 754) y no pueden representar exactamente 0.1:
 *   0.1 + 0.2 === 0.30000000000000004
 * Con enteros (hasta 2^53, unos 90 billones de pesos en centavos) la suma y
 * la resta son exactas. Solo se convierte a pesos al mostrar.
 *
 * Este módulo es puro (no toca el DOM ni el almacenamiento) para poder
 * probarlo con `node --test`.
 */

/** Formateador reutilizable: crear un Intl.NumberFormat es costoso, se crea una sola vez. */
const mxnFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Convierte texto escrito por el usuario a centavos SIN pasar por flotantes.
 *
 * Acepta: "1234", "1234.5", "1,234.56", "$1,234.56", " 12 ", "-50", ".5"
 * Rechaza (devuelve null): texto vacío, letras, más de 2 decimales, más de un punto.
 *
 * Por qué no usar Math.round(parseFloat(text) * 100): para montos normales
 * funciona, pero 1.005 * 100 da 100.49999999999999 y redondea a 100, no a 101.
 * Separar parte entera y decimal como texto evita el problema por completo.
 *
 * @param {string} text  monto tal como lo escribió el usuario
 * @returns {number|null} entero en centavos, o null si el texto no es un monto válido
 */
export function parseMoneyToCents(text) {
  if (typeof text !== 'string') return null;

  // Quitar espacios, signo de pesos y separadores de miles (la coma).
  const cleaned = text.trim().replace(/[\s$,]/g, '');

  // Formato aceptado: signo opcional, dígitos, y opcionalmente punto con 0 a 2 decimales.
  // Debe haber al menos un dígito en total ("." solo no es válido).
  const match = /^(-?)(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;

  const [, sign, integerPart, decimalPart = ''] = match;
  if (integerPart === '' && decimalPart === '') return null;

  // padEnd convierte ".5" en "50" centavos y "" en "00".
  const cents = Number(integerPart || '0') * 100 + Number(decimalPart.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;

  // "-0" se normaliza a 0 para no tener un cero negativo.
  return sign === '-' && cents !== 0 ? -cents : cents;
}

/**
 * Formatea centavos como moneda mexicana: 123456 -> "$1,234.56".
 * Dividir entre 100 aquí produce un flotante, pero solo para mostrarlo con
 * 2 decimales; el valor guardado sigue siendo el entero exacto.
 *
 * @param {number} cents entero en centavos
 * @returns {string} texto formateado en es-MX
 */
export function formatCents(cents) {
  return mxnFormatter.format(cents / 100);
}

/**
 * Agrega comas de miles a una cadena de dígitos: "1000000" -> "1,000,000".
 *
 * La expresión regular busca cada posición (\B = no al inicio) seguida de
 * grupos completos de 3 dígitos hasta el final (?=(\d{3})+$). En esas
 * posiciones se inserta la coma. Se hace a mano y no con Intl.NumberFormat
 * porque Intl convierte a número, y aquí trabajamos con texto que el usuario
 * está escribiendo (puede tener 20 dígitos o un punto sin decimales todavía).
 *
 * @param {string} digits solo dígitos
 * @returns {string}
 */
function groupThousands(digits) {
  return digits.replace(/\B(?=(\d{3})+$)/g, ',');
}

/**
 * Convierte centavos al texto que va en un campo editable: 123456 -> "1,234.56".
 * Sin signo de pesos, pero con comas de miles, igual que lo que produce
 * formatMoneyInput mientras se escribe. parseMoneyToCents ignora las comas, así
 * que la ida y vuelta sigue siendo exacta.
 *
 * @param {number} cents entero en centavos
 * @returns {string}
 */
export function centsToInputValue(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const pesos = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}${groupThousands(String(pesos))}.${rest}`;
}

/**
 * Da formato a lo que el usuario está escribiendo en un campo de monto, en
 * cada tecla: "1000000" -> "1,000,000", "1234.5" -> "1,234.5".
 *
 * Reglas:
 * - Solo se conservan dígitos y UN punto decimal (el primero); cualquier otro
 *   carácter (letras, $, comas viejas, un segundo punto) se descarta.
 * - Máximo 2 decimales: lo que sobra se corta.
 * - Ceros a la izquierda se quitan ("007" -> "7"), pero "0.5" se respeta.
 * - No se completan decimales: "12." se queda así, porque el usuario puede
 *   estar a punto de escribir los centavos.
 *
 * @param {string} text lo que hay en el campo
 * @returns {string}
 */
export function formatMoneyInput(text) {
  const cleaned = String(text ?? '').replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  const hasDot = dotIndex !== -1;
  let integerPart = hasDot ? cleaned.slice(0, dotIndex) : cleaned;
  const decimalPart = hasDot ? cleaned.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2) : '';

  integerPart = integerPart.replace(/^0+(?=\d)/, ''); // "007" -> "7", "0" se queda
  const grouped = groupThousands(integerPart);
  return hasDot ? `${grouped}.${decimalPart}` : grouped;
}

/**
 * Cuántos caracteres "significativos" (dígitos y punto) hay antes de una
 * posición. Sirve para recolocar el cursor después de reformatear: las comas
 * se mueven, pero los dígitos no.
 * @param {string} text
 * @param {number} position índice del cursor
 * @returns {number}
 */
export function countSignificantBefore(text, position) {
  return text.slice(0, position).replace(/[^\d.]/g, '').length;
}

/**
 * Inversa de countSignificantBefore: la posición en `text` que queda justo
 * después del carácter significativo número `count`.
 * @param {string} text
 * @param {number} count
 * @returns {number}
 */
export function positionAfterSignificant(text, count) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/[\d.]/.test(text[i])) seen += 1;
    if (seen === count) return i + 1;
  }
  return text.length;
}
