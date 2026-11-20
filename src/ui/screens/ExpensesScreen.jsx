/**
 * ExpensesScreen.jsx - Gastos del mes agrupados por día (más reciente arriba).
 * Tocar un gasto lo abre para editarlo o eliminarlo.
 */
import { useAppData } from '../state/AppDataContext.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { formatCents } from '../../core/money.js';
import { formatDayLabel } from '../../core/dates.js';
import { sumAmounts } from '../../core/budget.js';

/**
 * Agrupa gastos por fecha, ordenados de la más reciente a la más antigua.
 * Dentro de un día, el último capturado va primero.
 * @param {object[]} expenses
 * @returns {[string, object[]][]} pares [fecha, gastos]
 */
function groupByDate(expenses) {
  const groups = new Map();
  const sorted = [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  );
  for (const expense of sorted) {
    if (!groups.has(expense.date)) groups.set(expense.date, []);
    groups.get(expense.date).push(expense);
  }
  return [...groups.entries()];
}

/**
 * @param {{ onEdit: (expense: object) => void }} props
 */
export function ExpensesScreen({ onEdit }) {
  const { month, setMonth, expenses, categories, summary } = useAppData();
  // Map id -> nombre para mostrar la categoría de cada gasto rápidamente.
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div class="screen">
      <MonthPicker month={month} onChange={setMonth} />
      <section class="card">
        <div class="row-between">
          <span>Total del mes</span>
          <strong>{formatCents(summary.totalExpenses)}</strong>
        </div>
      </section>

      {expenses.length === 0 ? (
        <p class="empty">Sin gastos este mes. Toca + para agregar uno.</p>
      ) : (
        groupByDate(expenses).map(([date, items]) => (
          <section key={date} class="day-group">
            <h3 class="day-group-title">
              <span>{formatDayLabel(date)}</span>
              {/* Total del día solo cuando hay 2 o más gastos; con uno sería repetir el mismo monto. */}
              {items.length >= 2 && <span class="day-group-total">{formatCents(sumAmounts(items))}</span>}
            </h3>
            <ul class="list">
              {items.map((expense) => (
                <li key={expense.id}>
                  <button type="button" class="list-row" onClick={() => onEdit(expense)}>
                    <span class="list-row-main">
                      <span>{categoryNames.get(expense.categoryId) ?? 'Sin categoría'}</span>
                      {expense.note && <span class="hint">{expense.note}</span>}
                    </span>
                    <strong>{formatCents(expense.amount)}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
