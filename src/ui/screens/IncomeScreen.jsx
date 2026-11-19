/**
 * IncomeScreen.jsx - Ingresos del mes: la nómina (automática, según el
 * historial de Ajustes) y los ingresos extra registrados a mano.
 */
import { useAppData } from '../state/AppDataContext.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { EXTRA_INCOME_TYPES } from '../../data/repositories.js';
import { formatCents } from '../../core/money.js';
import { formatDayLabel } from '../../core/dates.js';

/**
 * @param {{ onAdd: () => void, onEdit: (income: object) => void, onGoToSettings: () => void }} props
 */
export function IncomeScreen({ onAdd, onEdit, onGoToSettings }) {
  const { month, setMonth, extraIncomes, summary } = useAppData();
  const sorted = [...extraIncomes].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div class="screen">
      <MonthPicker month={month} onChange={setMonth} />

      <section class="card">
        <div class="row-between">
          <span>Nómina del mes</span>
          <strong>{formatCents(summary.salary)}</strong>
        </div>
        <button type="button" class="link-btn" onClick={onGoToSettings}>
          Cambiar nómina en Ajustes
        </button>
      </section>

      <section class="card">
        <div class="row-between">
          <h2 class="card-title">Ingresos extra</h2>
          <strong>{formatCents(summary.extraIncome)}</strong>
        </div>
        {sorted.length === 0 ? (
          <p class="hint">Sin ingresos extra este mes.</p>
        ) : (
          <ul class="list">
            {sorted.map((income) => (
              <li key={income.id}>
                <button type="button" class="list-row" onClick={() => onEdit(income)}>
                  <span class="list-row-main">
                    <span>{EXTRA_INCOME_TYPES[income.type] ?? income.type}</span>
                    <span class="hint">
                      {formatDayLabel(income.date)}
                      {income.note && ` - ${income.note}`}
                    </span>
                  </span>
                  <strong>{formatCents(income.amount)}</strong>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" class="btn btn-secondary" onClick={onAdd}>
          Agregar ingreso extra
        </button>
      </section>
    </div>
  );
}
