/**
 * SummaryScreen.jsx - Resumen del mes: ingresos, gastos, ahorro y límites.
 * Todos los números vienen de summarizeMonth() (core/budget.js).
 */
import { useAppData } from '../state/AppDataContext.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { WeeklyChart } from '../components/WeeklyChart.jsx';
import { formatCents } from '../../core/money.js';

/** Texto corto para el estado de un límite. */
const STATUS_TEXT = { ok: '', warning: 'Cerca del límite', danger: 'Límite superado' };

/**
 * @param {{ onGoToSettings: () => void }} props
 */
export function SummaryScreen({ onGoToSettings }) {
  const { month, setMonth, summary, salaryChanges, expenses } = useAppData();
  const { salary, extraIncome, totalIncome, totalExpenses, leftover, savingsPercent, total, byCategory } = summary;

  return (
    <div class="screen">
      <MonthPicker month={month} onChange={setMonth} />

      {salaryChanges.length === 0 && (
        <div class="card card--notice">
          <p>Aún no registras tu nómina, así que los ingresos salen en cero.</p>
          <button type="button" class="btn btn-secondary" onClick={onGoToSettings}>
            Configurar nómina
          </button>
        </div>
      )}

      <section class="card">
        <h2 class="card-title">Ahorro del mes</h2>
        <div class="savings-row">
          <p class={`big-number ${leftover < 0 ? 'is-negative' : 'is-positive'}`}>{formatCents(leftover)}</p>
          {/* Tasa de ahorro: qué parte de los ingresos queda. null si no hubo ingresos. */}
          {savingsPercent !== null && (
            <span class={`savings-percent ${leftover < 0 ? 'is-negative' : 'is-positive'}`}>
              {savingsPercent}%
            </span>
          )}
        </div>
        <p class="hint">
          {savingsPercent === null
            ? 'Ingresos menos gastos.'
            : leftover < 0
              ? `Gastaste ${Math.abs(savingsPercent)}% más de lo que entró este mes.`
              : `Ahorras el ${savingsPercent}% de tus ingresos del mes.`}
        </p>
      </section>

      <section class="card">
        <dl class="kv">
          <dt>Nómina</dt>
          <dd>{formatCents(salary)}</dd>
          <dt>Ingresos extra</dt>
          <dd>{formatCents(extraIncome)}</dd>
          <dt class="kv-strong">Total de ingresos</dt>
          <dd class="kv-strong">{formatCents(totalIncome)}</dd>
          <dt class="kv-strong">Total de gastos</dt>
          <dd class="kv-strong">{formatCents(totalExpenses)}</dd>
        </dl>
        {total.status !== 'none' && (
          <div class="limit-row">
            <div class="limit-row-head">
              <span>Límite mensual: {formatCents(total.limit)}</span>
              <span class={`status-text status-text--${total.status}`}>{total.percent}%</span>
            </div>
            <ProgressBar percent={total.percent} status={total.status} />
            {STATUS_TEXT[total.status] && (
              <p class={`status-text status-text--${total.status}`}>{STATUS_TEXT[total.status]}</p>
            )}
          </div>
        )}
      </section>

      <section class="card">
        <h2 class="card-title">Gasto por semana</h2>
        {/* key={month}: al cambiar de periodo se reinicia la semana seleccionada. */}
        <WeeklyChart key={month} expenses={expenses} month={month} />
      </section>

      <section class="card">
        <h2 class="card-title">Por categoría</h2>
        {byCategory.length === 0 ? (
          <p class="hint">Sin gastos este mes.</p>
        ) : (
          <ul class="category-list">
            {byCategory.map(({ category, spent, status, percent }) => (
              <li key={category.id} class="limit-row">
                <div class="limit-row-head">
                  <span>
                    {category.name}
                    {category.archived && <span class="hint"> (archivada)</span>}
                  </span>
                  <span>
                    <strong>{formatCents(spent)}</strong>
                    {status !== 'none' && <span class="hint"> / {formatCents(category.monthlyLimit)}</span>}
                  </span>
                </div>
                {status !== 'none' && <ProgressBar percent={percent} status={status} />}
                {STATUS_TEXT[status] && (
                  <p class={`status-text status-text--${status}`}>
                    {STATUS_TEXT[status]} ({percent}%)
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
