/**
 * salary.js - Nómina mensual con historial de cambios.
 *
 * El sueldo se guarda como una lista de CAMBIOS, no mes por mes:
 *   [{ fromMonth: '2026-01', amount: 2500000 },
 *    { fromMonth: '2026-09', amount: 2800000 }]
 * significa: $25,000 de enero a agosto y $28,000 de septiembre en adelante.
 *
 * Ventajas: un aumento se captura una sola vez, los meses anteriores no se
 * reescriben, y corregir un error es editar un solo registro.
 */

/**
 * Sueldo vigente en un mes: el del último cambio con fromMonth <= month.
 *
 * Funciona comparando textos porque "YYYY-MM" con ceros a la izquierda se
 * ordena alfabéticamente igual que cronológicamente ("2026-09" < "2026-10").
 *
 * @param {{ fromMonth: string, amount: number }[]} changes  en cualquier orden
 * @param {string} month "YYYY-MM"
 * @returns {number} centavos; 0 si no hay ningún cambio antes o en ese mes
 */
export function salaryForMonth(changes, month) {
  let current = null;
  for (const change of changes) {
    if (change.fromMonth <= month && (current === null || change.fromMonth > current.fromMonth)) {
      current = change;
    }
  }
  return current ? current.amount : 0;
}
