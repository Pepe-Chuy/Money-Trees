/**
 * weeks.js - Gasto por semana dentro de un periodo, para el histograma del Resumen.
 *
 * Las semanas son de calendario, de lunes a domingo, recortadas a los bordes
 * del periodo (13 al 12). Por eso la primera y la última suelen ser parciales:
 * el periodo "2026-11" (13 nov - 12 dic) empieza en viernes, así que su
 * primera semana es solo vie 13 - dom 15.
 *
 * Módulo puro (sin DOM ni almacenamiento) para probarlo con node --test.
 */
import { addDays, monthDateRange } from './dates.js';

/**
 * Día de la semana con lunes = 0 ... domingo = 6.
 * Date.getDay() usa domingo = 0; sumar 6 y sacar módulo 7 lo recorre.
 * Se construye a mediodía por la misma razón que en addDays (horario de verano).
 * @param {string} isoDate "YYYY-MM-DD"
 * @returns {number}
 */
export function weekdayMondayFirst(isoDate) {
  const [year, monthNumber, day] = isoDate.split('-').map(Number);
  return (new Date(year, monthNumber - 1, day, 12).getDay() + 6) % 7;
}

/**
 * Totales por semana (lunes a domingo) de un periodo.
 *
 * Algoritmo: se recorre el periodo día por día. Se abre una semana nueva en
 * el primer día y en cada lunes; cada día suma sus gastos a la semana abierta.
 * Como las fechas son texto "YYYY-MM-DD", agrupar por día es un simple Map.
 *
 * @param {{ date: string, amount: number }[]} expenses  pueden venir de más meses: se filtran
 * @param {string} month "YYYY-MM" del periodo
 * @returns {{ start: string, end: string, total: number, count: number }[]}
 *          en orden; total en centavos, count = cantidad de gastos
 */
export function weeklyTotals(expenses, month) {
  const [first, last] = monthDateRange(month);

  // Suma por día, solo de los gastos dentro del periodo.
  const byDay = new Map();
  for (const e of expenses) {
    if (e.date < first || e.date > last) continue;
    const day = byDay.get(e.date) ?? { total: 0, count: 0 };
    day.total += e.amount;
    day.count += 1;
    byDay.set(e.date, day);
  }

  const weeks = [];
  for (let date = first; date <= last; date = addDays(date, 1)) {
    if (weeks.length === 0 || weekdayMondayFirst(date) === 0) {
      weeks.push({ start: date, end: date, total: 0, count: 0 });
    }
    const week = weeks[weeks.length - 1];
    week.end = date;
    const day = byDay.get(date);
    if (day) {
      week.total += day.total;
      week.count += day.count;
    }
  }
  return weeks;
}
