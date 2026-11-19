/**
 * dates.js - Fechas y meses en hora LOCAL del dispositivo.
 *
 * Convenciones:
 *   fecha  -> texto ISO "YYYY-MM-DD"  (ej. "2026-10-19")
 *   mes    -> texto "YYYY-MM"         (ej. "2026-10")
 *
 * Trampa importante: new Date().toISOString() devuelve la fecha en UTC.
 * En Ciudad de México (UTC-6) un gasto capturado el 31 de octubre a las
 * 19:00 ya es 1 de noviembre en UTC, y caería en el mes equivocado. Por eso
 * aquí se usan getFullYear/getMonth/getDate, que trabajan en hora local.
 *
 * Guardar como texto (y no como Date) tiene otra ventaja: "2026-10-19" se
 * compara y ordena correctamente como string, y el mes es simplemente
 * fecha.slice(0, 7).
 */

/**
 * Rellena con ceros a la izquierda: 7 -> "07".
 * @param {number} n
 * @param {number} width
 * @returns {string}
 */
function pad(n, width = 2) {
  return String(n).padStart(width, '0');
}

/**
 * Fecha local de un objeto Date en formato "YYYY-MM-DD".
 * @param {Date} date  por defecto, ahora
 * @returns {string}
 */
export function toISODate(date = new Date()) {
  // getMonth() empieza en 0 (enero = 0), por eso el +1.
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Fecha de hoy en hora local, "YYYY-MM-DD".
 * @returns {string}
 */
export function todayISO() {
  return toISODate(new Date());
}

/**
 * Mes al que pertenece una fecha: "2026-10-19" -> "2026-10".
 * @param {string} isoDate
 * @returns {string}
 */
export function monthOf(isoDate) {
  return isoDate.slice(0, 7);
}

/**
 * Mes actual en hora local, "YYYY-MM".
 * @returns {string}
 */
export function currentMonth() {
  return monthOf(todayISO());
}

/**
 * Suma (o resta, con n negativo) meses a un mes "YYYY-MM".
 *
 * Matemática: se convierte el mes a un índice lineal
 *   índice = año * 12 + (mes - 1)
 * se le suma n, y se regresa con división entera y módulo:
 *   año = floor(índice / 12), mes = (índice mod 12) + 1
 * Ejemplo: "2026-11" + 3 -> índice 24311 + 3 = 24314 -> 2027, mes 3 -> "2027-02".
 *
 * @param {string} month "YYYY-MM"
 * @param {number} n     meses a sumar (entero, puede ser negativo)
 * @returns {string} "YYYY-MM"
 */
export function addMonths(month, n) {
  const index = monthIndex(month) + n;
  const year = Math.floor(index / 12);
  const monthNumber = (index - year * 12) + 1; // evita el módulo negativo de JS con n < 0
  return `${pad(year, 4)}-${pad(monthNumber)}`;
}

/**
 * Índice lineal de un mes (ver addMonths). Útil para restar meses.
 * @param {string} month "YYYY-MM"
 * @returns {number}
 */
function monthIndex(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return year * 12 + (monthNumber - 1);
}

/**
 * Cuántos meses hay de `from` a `to` (to - from). Negativo si `to` es anterior.
 * "2026-10" -> "2027-01" = 3.
 * @param {string} from "YYYY-MM"
 * @param {string} to   "YYYY-MM"
 * @returns {number}
 */
export function monthsBetween(from, to) {
  return monthIndex(to) - monthIndex(from);
}

/**
 * Días que tiene un mes. Truco: el día 0 del mes siguiente es el último día
 * del mes actual (Date normaliza el desbordamiento hacia atrás).
 * Como new Date(año, mes, 0) recibe el mes en base 0, pasar el número de mes
 * en base 1 equivale a "día 0 del mes siguiente".
 * @param {string} month "YYYY-MM"
 * @returns {number} 28 a 31
 */
export function daysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

/**
 * Valida que un texto sea una fecha real "YYYY-MM-DD" (rechaza "2026-02-30").
 * @param {string} text
 * @returns {boolean}
 */
export function isValidISODate(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const day = Number(text.slice(8, 10));
  return day >= 1 && isValidMonth(text.slice(0, 7)) && day <= daysInMonth(text.slice(0, 7));
}

/**
 * Valida que un texto sea un mes "YYYY-MM" con mes de 01 a 12.
 * @param {string} text
 * @returns {boolean}
 */
export function isValidMonth(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}$/.test(text)) return false;
  const monthNumber = Number(text.slice(5, 7));
  return monthNumber >= 1 && monthNumber <= 12;
}

/**
 * Suma (o resta) días a una fecha "YYYY-MM-DD". Usada para el atajo "Ayer".
 *
 * Se construye la fecha a mediodía (hora 12) a propósito: en zonas con
 * horario de verano, la medianoche de ciertos días no existe y Date la
 * movería a otro día. Al mediodía nunca pasa. Date normaliza el desbordamiento
 * (día 0 = último del mes anterior, día 32 = siguiente mes).
 *
 * @param {string} isoDate "YYYY-MM-DD"
 * @param {number} n días a sumar (negativo para restar)
 * @returns {string} "YYYY-MM-DD"
 */
export function addDays(isoDate, n) {
  const [year, monthNumber, day] = isoDate.split('-').map(Number);
  return toISODate(new Date(year, monthNumber - 1, day + n, 12));
}

/**
 * Primer y último día de un mes, para consultar un rango en IndexedDB.
 * @param {string} month "YYYY-MM"
 * @returns {[string, string]} ["YYYY-MM-01", "YYYY-MM-último"]
 */
export function monthDateRange(month) {
  return [`${month}-01`, `${month}-${pad(daysInMonth(month))}`];
}

/** Pone en mayúscula la primera letra ("octubre" -> "Octubre"). */
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const monthLabelFormatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
const dayLabelFormatter = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });

/**
 * Nombre legible de un mes: "2026-10" -> "Octubre de 2026".
 * @param {string} month "YYYY-MM"
 * @returns {string}
 */
export function formatMonthLabel(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return capitalize(monthLabelFormatter.format(new Date(year, monthNumber - 1, 1, 12)));
}

/**
 * Nombre legible de un día: "2026-10-19" -> "Lunes, 19 oct".
 * @param {string} isoDate "YYYY-MM-DD"
 * @returns {string}
 */
export function formatDayLabel(isoDate) {
  const [year, monthNumber, day] = isoDate.split('-').map(Number);
  return capitalize(dayLabelFormatter.format(new Date(year, monthNumber - 1, day, 12)));
}
