/**
 * PinSetup.jsx - Activar, cambiar o quitar el PIN (desde Ajustes).
 *
 * Es una pequeña máquina de estados. Cada modo recorre estos pasos:
 *   activar: 'new' -> 'confirm' -> guardar
 *   cambiar: 'current' -> 'new' -> 'confirm' -> guardar
 *   quitar:  'current' -> guardar (pin: null)
 * Pedir el PIN actual para cambiarlo o quitarlo evita que alguien que tome
 * el teléfono desbloqueado lo desactive.
 */
import { useState } from 'preact/hooks';
import { useAppData } from '../state/AppDataContext.jsx';
import { PinPad } from '../components/PinPad.jsx';
import { createPinRecord, verifyPin, isValidPin } from '../../core/pin.js';

const TITLES = {
  current: 'Escribe tu PIN actual',
  new: 'Escribe un PIN nuevo (4 a 6 dígitos)',
  confirm: 'Repite el PIN nuevo',
};

/**
 * @param {{ mode: 'enable'|'change'|'disable', onDone: () => void }} props
 */
export function PinSetup({ mode, onDone }) {
  const { settings, actions } = useAppData();
  const [step, setStep] = useState(mode === 'enable' ? 'new' : 'current');
  const [firstPin, setFirstPin] = useState('');
  const [message, setMessage] = useState({ text: null, isError: false });
  const [busy, setBusy] = useState(false);

  // crypto.subtle solo existe en HTTPS o localhost (contexto seguro).
  if (!globalThis.crypto?.subtle) {
    return <p class="field-error">El PIN requiere HTTPS. Ábrelo desde la app instalada (GitHub Pages).</p>;
  }

  /** @param {string} pin */
  async function handleSubmit(pin) {
    setBusy(true);
    try {
      if (step === 'current') {
        // Verificar cuesta ~0.5 s a propósito (600,000 iteraciones de PBKDF2).
        setMessage({ text: 'Verificando...', isError: false });
        if (!(await verifyPin(pin, settings.pin))) {
          setMessage({ text: 'PIN incorrecto.', isError: true });
          return;
        }
        if (mode === 'disable') {
          await actions.updateSettings({ pin: null });
          onDone();
          return;
        }
        setStep('new');
        setMessage({ text: null, isError: false });
      } else if (step === 'new') {
        if (!isValidPin(pin)) {
          setMessage({ text: 'Debe tener de 4 a 6 dígitos.', isError: true });
          return;
        }
        setFirstPin(pin);
        setStep('confirm');
        setMessage({ text: null, isError: false });
      } else {
        if (pin !== firstPin) {
          setStep('new');
          setMessage({ text: 'No coinciden. Empieza de nuevo.', isError: true });
          return;
        }
        setMessage({ text: 'Guardando...', isError: false });
        await actions.updateSettings({ pin: await createPinRecord(pin) });
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <PinPad
      // key fuerza a Preact a crear un PinPad nuevo (vacío) en cada paso.
      key={step}
      title={TITLES[step]}
      message={message.text}
      isError={message.isError}
      autoSubmitLength={step === 'current' ? settings.pin?.length : step === 'confirm' ? firstPin.length : null}
      disabled={busy}
      onSubmit={handleSubmit}
    />
  );
}
