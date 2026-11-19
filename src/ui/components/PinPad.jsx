/**
 * PinPad.jsx - Teclado numérico en pantalla para escribir el PIN.
 *
 * Se usa un teclado propio en lugar de un <input> porque así no aparece el
 * teclado del sistema, los dígitos nunca se muestran ni se autocompletan, y
 * el diseño es el mismo en el bloqueo y en los ajustes.
 *
 * Envío del PIN:
 * - Si se conoce la longitud (desbloqueo: está guardada), se envía solo al
 *   teclear el último dígito, como en el iPhone.
 * - Si no (al crear un PIN nuevo, de 4 a 6), aparece el botón "Listo".
 */
import { useState } from 'preact/hooks';
import { Icon } from './Icon.jsx';
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '../../core/pin.js';

/**
 * @param {{
 *   title: string,
 *   message?: string|null,        texto de ayuda o error bajo el título
 *   isError?: boolean,
 *   autoSubmitLength?: number|null,
 *   disabled?: boolean,           p. ej. durante la espera por intentos fallidos
 *   onSubmit: (pin: string) => void,
 * }} props
 */
export function PinPad({ title, message, isError = false, autoSubmitLength = null, disabled = false, onSubmit }) {
  const [digits, setDigits] = useState('');
  const dotCount = autoSubmitLength ?? PIN_MAX_LENGTH;

  /** Envía y limpia para el siguiente intento. */
  function submit(pin) {
    setDigits('');
    onSubmit(pin);
  }

  /** @param {string} digit */
  function press(digit) {
    if (disabled || digits.length >= PIN_MAX_LENGTH) return;
    const next = digits + digit;
    if (autoSubmitLength && next.length === autoSubmitLength) submit(next);
    else setDigits(next);
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const canConfirm = !autoSubmitLength && digits.length >= PIN_MIN_LENGTH;

  return (
    <div class="pinpad">
      <p class="pinpad-title">{title}</p>
      <div class="pinpad-dots" aria-label={`${digits.length} dígitos escritos`}>
        {Array.from({ length: dotCount }, (_, i) => (
          <span key={i} class={`pinpad-dot ${i < digits.length ? 'is-filled' : ''}`} />
        ))}
      </div>
      <p class={`pinpad-message ${isError ? 'is-error' : ''}`} role="status">
        {message || ' '}
      </p>
      <div class="pinpad-keys">
        {keys.map((k) => (
          <button key={k} type="button" class="pinpad-key" disabled={disabled} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        {canConfirm ? (
          <button type="button" class="pinpad-key pinpad-key--text" onClick={() => submit(digits)}>
            Listo
          </button>
        ) : (
          <span />
        )}
        <button type="button" class="pinpad-key" disabled={disabled} onClick={() => press('0')}>
          0
        </button>
        <button
          type="button"
          class="pinpad-key pinpad-key--text"
          disabled={disabled || digits.length === 0}
          onClick={() => setDigits(digits.slice(0, -1))}
          aria-label="Borrar"
        >
          <Icon name="backspace" />
        </button>
      </div>
    </div>
  );
}
