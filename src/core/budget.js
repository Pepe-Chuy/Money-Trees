/**
 * budget.js - Resumen del mes y estado de los límites de gasto.
 *
 * Funciones puras: reciben los datos ya leídos de la base y devuelven números.
 * La UI solo muestra lo que sale de aquí, así toda la aritmética queda probada.
 */
import { monthOf } from './dates.js';
import { salaryForMonth } from './salary.js';

/** Porcentaje del límite a partir del cual se muestra el aviso. */
export const WARNING_PERCENT = 80;

/**
 * Estado de un gasto contra su límite.
 *
 * Reglas:
 *   sin límite (null o <= 0) -> 'none'
 *   gasto >= límite          -> 'danger'   (alerta al 100%)
 *   gasto >= 80% del límite  -> 'warning'  (aviso al 80%)
 *   en otro caso             -> 'ok'
 *
 * La comparación del 80% se hace con enteros, sin dividir:
 *   gasto / límite >= 80 / 100  <=>  gasto * 100 >= límite * 80
 * (multiplicar en cruz es válido porque ambos denominadores son positivos).
 * Así no hay redondeos: con límite $1,000 el aviso salta exactamente en $800.00.
 *
 * @param {number} spent  centavos gastados
 * @param {number|null} limit  centavos de límite, o null
 * @returns {{ status: 'none'|'ok'|'warning'|'danger', percent: number|null }}
 *          percent: porcentaje entero (truncado) para mostrar; puede pasar de 100
 */
export function limitStatus(spent, limit) {
  if (limit == null || limit <= 0) return { status: 'none', percent: null };
  const percent = Math.floor((spent * 100) / limit);
  let status = 'ok';
  if (spent >= limit) status = 'danger';
  else if (spent * 100 >= limit * WARNING_PERCENT) status = 'warning';
  return { status, percent };
}

/**
 * Suma los montos de una lista.
 * @param {{ amount: number }[]} items
 * @returns {number} centavos
 */
export function sumAmounts(items) {
  return items.reduce((total, item) => total + item.amount, 0);
}

/**
 * Resumen completo de un mes.
 *
 * Ahorro del mes (sobrante) = nómina + ingresos extra - gastos.
 * Cada mes empieza en cero: no se arrastra el saldo del mes anterior.
 *
 * @param {object} input
 * @param {string} input.month "YYYY-MM"
 * @param {{ fromMonth: string, amount: number }[]} input.salaryChanges
 * @param {{ date: string, amount: number, categoryId: string }[]} input.expenses
 * @param {{ date: string, amount: number }[]} input.extraIncomes
 * @param {{ id: string, name: string, monthlyLimit: number|null, archived: boolean }[]} input.categories
 * @param {number|null} input.monthlyTotalLimit
 * @returns {{
 *   salary: number, extraIncome: number, totalIncome: number,
 *   totalExpenses: number, leftover: number,
 *   total: { status: string, percent: number|null, limit: number|null },
 *   byCategory: { category: object, spent: number, status: string, percent: number|null }[]
 * }}
 */
export function summarizeMonth({ month, salaryChanges, expenses, extraIncomes, categories, monthlyTotalLimit }) {
  // Se filtra por mes aunque los datos ya vengan filtrados: la función no
  // depende de que quien la llame lo haya hecho bien.
  const monthExpenses = expenses.filter((e) => monthOf(e.date) === month);
  const monthIncomes = extraIncomes.filter((i) => monthOf(i.date) === month);

  const salary = salaryForMonth(salaryChanges, month);
  const extraIncome = sumAmounts(monthIncomes);
  const totalIncome = salary + extraIncome;
  const totalExpenses = sumAmounts(monthExpenses);

  // Gasto por categoría: un Map id -> centavos.
  const spentByCategory = new Map();
  for (const expense of monthExpenses) {
    spentByCategory.set(expense.categoryId, (spentByCategory.get(expense.categoryId) ?? 0) + expense.amount);
  }

  // Se muestran las categorías con gasto en el mes, y las activas que tienen
  // límite aunque no tengan gasto (para ver cuánto margen queda).
  const byCategory = categories
    .filter((c) => spentByCategory.has(c.id) || (!c.archived && c.monthlyLimit > 0))
    .map((category) => {
      const spent = spentByCategory.get(category.id) ?? 0;
      return { category, spent, ...limitStatus(spent, category.monthlyLimit) };
    })
    .sort((a, b) => b.spent - a.spent || a.category.name.localeCompare(b.category.name, 'es'));

  return {
    salary,
    extraIncome,
    totalIncome,
    totalExpenses,
    leftover: totalIncome - totalExpenses,
    total: { ...limitStatus(totalExpenses, monthlyTotalLimit), limit: monthlyTotalLimit ?? null },
    byCategory,
  };
}
