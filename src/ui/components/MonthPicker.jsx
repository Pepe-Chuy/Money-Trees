/**
 * MonthPicker.jsx - Selector de mes: "<  Octubre de 2026  >".
 * Es la forma de navegar el historial. Si no estás en el mes actual,
 * aparece "Ir a hoy" para regresar con un toque.
 */
import { Icon } from './Icon.jsx';
import { addMonths, currentMonth, formatMonthLabel } from '../../core/dates.js';

/**
 * @param {{ month: string, onChange: (month: string) => void }} props
 */
export function MonthPicker({ month, onChange }) {
  const today = currentMonth();
  return (
    <div class="month-picker">
      <button type="button" class="icon-btn" onClick={() => onChange(addMonths(month, -1))} aria-label="Mes anterior">
        <Icon name="chevronLeft" />
      </button>
      <div class="month-picker-label">
        <strong>{formatMonthLabel(month)}</strong>
        {month !== today && (
          <button type="button" class="link-btn" onClick={() => onChange(today)}>
            Ir a hoy
          </button>
        )}
      </div>
      <button type="button" class="icon-btn" onClick={() => onChange(addMonths(month, 1))} aria-label="Mes siguiente">
        <Icon name="chevronRight" />
      </button>
    </div>
  );
}
