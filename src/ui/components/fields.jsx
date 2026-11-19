/**
 * fields.jsx - Campos de formulario reutilizables.
 *
 * Son "componentes controlados": el valor vive en el estado del formulario
 * padre (value) y cada cambio se le avisa con onChange. Así el padre siempre
 * sabe qué hay escrito y puede validar antes de guardar.
 */
import { addDays, todayISO } from '../../core/dates.js';

/**
 * Campo de monto. type="text" + inputMode="decimal" muestra en el iPhone el
 * teclado numérico con punto decimal, sin las flechas ni las reglas raras de
 * type="number" (que acepta "1e5" y borra el valor si no le parece válido).
 *
 * @param {{ label: string, value: string, onInput: (v: string) => void,
 *           error?: string|null, inputRef?: any, placeholder?: string, large?: boolean }} props
 */
export function MoneyField({ label, value, onInput, error, inputRef, placeholder = '0.00', large = false }) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <div class={`money-input ${large ? 'money-input--large' : ''}`}>
        <span class="money-input-sign">$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onInput={(e) => onInput(e.currentTarget.value)}
        />
      </div>
      {error && <span class="field-error">{error}</span>}
    </label>
  );
}

/**
 * Campo de texto simple.
 * @param {{ label: string, value: string, onInput: (v: string) => void,
 *           error?: string|null, placeholder?: string, maxLength?: number }} props
 */
export function TextField({ label, value, onInput, error, placeholder = '', maxLength = 120 }) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <input
        class="input"
        type="text"
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onInput={(e) => onInput(e.currentTarget.value)}
      />
      {error && <span class="field-error">{error}</span>}
    </label>
  );
}

/**
 * Grupo de botones donde se elige una opción (chips).
 * @param {{ label: string, options: { value: string, label: string }[], value: string|null,
 *           onChange: (v: string) => void, error?: string|null }} props
 */
export function ChipGroup({ label, options, value, onChange, error }) {
  return (
    <div class="field" role="radiogroup" aria-label={label}>
      <span class="field-label">{label}</span>
      <div class="chips">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            class={`chip ${value === option.value ? 'is-selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <span class="field-error">{error}</span>}
    </div>
  );
}

/**
 * Fecha con atajos: "Hoy" y "Ayer" a un toque, y el calendario nativo para
 * cualquier otro día. Hoy ya viene seleccionado, así el caso común no cuesta
 * ningún toque.
 * @param {{ value: string, onChange: (iso: string) => void }} props
 */
export function DateField({ value, onChange }) {
  const today = todayISO();
  const yesterday = addDays(today, -1);
  return (
    <div class="field">
      <span class="field-label">Fecha</span>
      <div class="date-field">
        <button type="button" class={`chip ${value === today ? 'is-selected' : ''}`} onClick={() => onChange(today)}>
          Hoy
        </button>
        <button
          type="button"
          class={`chip ${value === yesterday ? 'is-selected' : ''}`}
          onClick={() => onChange(yesterday)}
        >
          Ayer
        </button>
        <input
          class="input date-input"
          type="date"
          value={value}
          max={today}
          // Si el usuario borra la fecha en el calendario, se conserva la anterior.
          onInput={(e) => e.currentTarget.value && onChange(e.currentTarget.value)}
          aria-label="Otra fecha"
        />
      </div>
    </div>
  );
}
