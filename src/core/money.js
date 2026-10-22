/**
 * money.js - Manejo de dinero en centavos.
 *
 * Convencion de toda la app: el dinero se guarda SIEMPRE como entero en
 * centavos ($1,234.56 -> 123456). Motivo: los numeros de JavaScript son
 * flotantes binarios (IEEE 754) y no pueden representar exactamente 0.1:
 *   0.1 + 0.2 === 0.30000000000000004
 * Con enteros (hasta 2^53, unos 90 billones de pesos en centavos) la suma y
 * la resta son exactas. Solo se convierte a pesos al mostrar.
 *
 * Este modulo es puro (no toca el DOM ni el almacenamiento) para poder
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
 * Rechaza (devuelve null): texto vacio, letras, mas de 2 decimales, mas de un punto.
 *
 * Por que no usar Math.round(parseFloat(text) * 100): para montos normales
 * funciona, pero 1.005 * 100 da 100.49999999999999 y redondea a 100, no a 101.
 * Separar parte entera y decimal como texto evita el problema por completo.
 *
 * @param {string} text  monto tal como lo escribio el usuario
 * @returns {number|null} entero en centavos, o null si el texto no es un monto valido
 */
export function parseMoneyToCents(text) {
  if (typeof text !== 'string') return null;

  // Quitar espacios, signo de pesos y separadores de miles (la coma).
  const cleaned = text.trim().replace(/[\s$,]/g, '');

  // Formato aceptado: signo opcional, digitos, y opcionalmente punto con 0 a 2 decimales.
  // Debe haber al menos un digito en total ("." solo no es valido).
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
 * Dividir entre 100 aqui produce un flotante, pero solo para mostrarlo con
 * 2 decimales; el valor guardado sigue siendo el entero exacto.
 *
 * @param {number} cents entero en centavos
 * @returns {string} texto formateado en es-MX
 */
export function formatCents(cents) {
  return mxnFormatter.format(cents / 100);
}

/**
 * Convierte centavos al texto que va en un campo editable: 123456 -> "1234.56".
 * Sin signo de pesos ni comas, para que el usuario lo edite y se pueda volver
 * a leer con parseMoneyToCents (ida y vuelta exacta).
 *
 * @param {number} cents entero en centavos
 * @returns {string}
 */
export function centsToInputValue(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const pesos = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}${pesos}.${rest}`;
}
