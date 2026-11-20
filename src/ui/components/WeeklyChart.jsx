/**
 * WeeklyChart.jsx - Histograma de gasto por semana (lunes a domingo) del periodo.
 *
 * Decisiones de diseño:
 * - Barras hechas con HTML y CSS (sin librería de gráficas): son 5 o 6 barras,
 *   una librería pesaría más que toda la app.
 * - Una sola serie, un solo color (el verde de la app); no hace falta leyenda,
 *   el título de la tarjeta dice qué es.
 * - No se escribe el monto sobre cada barra (se amontonaría). En su lugar hay
 *   una línea de lectura arriba con la semana seleccionada; tocar una barra la
 *   selecciona. Es el equivalente táctil del "tooltip" de una gráfica web.
 * - Cada barra es un botón con aria-label completo, así VoiceOver lee
 *   "Semana del 16 al 22 de nov: $1,234.00, 3 gastos".
 */
import { useState } from 'preact/hooks';
import { weeklyTotals } from '../../core/weeks.js';
import { formatCents } from '../../core/money.js';
import { todayISO } from '../../core/dates.js';

const shortMonth = new Intl.DateTimeFormat('es-MX', { month: 'short' });

/** "2026-11-16" -> { day: 16, month: "nov" } */
function dayParts(iso) {
  const [year, monthNumber, day] = iso.split('-').map(Number);
  return { day, month: shortMonth.format(new Date(year, monthNumber - 1, day, 12)).replace('.', '') };
}

/**
 * Rango legible de una semana: "16 – 22 nov", o "30 nov – 6 dic" si cruza de mes.
 * Si la semana es de un solo día (puede pasar en el borde del periodo): "13 nov".
 */
function formatWeekRange(start, end) {
  const a = dayParts(start);
  const b = dayParts(end);
  if (start === end) return `${a.day} ${a.month}`;
  return a.month === b.month ? `${a.day} – ${b.day} ${b.month}` : `${a.day} ${a.month} – ${b.day} ${b.month}`;
}

/**
 * @param {{ expenses: object[], month: string }} props
 */
export function WeeklyChart({ expenses, month }) {
  const weeks = weeklyTotals(expenses, month);
  const max = Math.max(...weeks.map((w) => w.total));

  // Selección inicial: la semana de hoy si cae en este periodo; si no, la de mayor gasto.
  const today = todayISO();
  const todayIndex = weeks.findIndex((w) => w.start <= today && today <= w.end);
  const maxIndex = weeks.findIndex((w) => w.total === max);
  const [selected, setSelected] = useState(todayIndex !== -1 ? todayIndex : maxIndex);
  const current = weeks[selected] ?? weeks[0];

  if (max === 0) return <p class="hint">Sin gastos en este periodo.</p>;

  return (
    <div class="week-chart">
      <p class="week-chart-readout" aria-live="polite">
        <span class="hint">{formatWeekRange(current.start, current.end)}</span>
        <strong>{formatCents(current.total)}</strong>
        <span class="hint">
          {current.count === 1 ? '1 gasto' : `${current.count} gastos`}
        </span>
      </p>
      <div class="week-chart-plot">
        {weeks.map((week, index) => {
          // Altura proporcional a la semana de mayor gasto (que llena el alto).
          // Una semana con gasto pequeño conserva al menos 2px para verse.
          const percent = (week.total / max) * 100;
          return (
            <button
              key={week.start}
              type="button"
              class={`week-chart-col ${index === selected ? 'is-selected' : ''}`}
              aria-pressed={index === selected}
              aria-label={`Semana ${formatWeekRange(week.start, week.end)}: ${formatCents(week.total)}, ${week.count} gastos`}
              onClick={() => setSelected(index)}
            >
              <span class="week-chart-track">
                {week.total > 0 && <span class="week-chart-bar" style={{ height: `max(2px, ${percent}%)` }} />}
              </span>
              <span class="week-chart-label">
                {dayParts(week.start).day}–{dayParts(week.end).day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
