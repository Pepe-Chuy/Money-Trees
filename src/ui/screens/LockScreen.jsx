/**
 * LockScreen.jsx - Pantalla de bloqueo con PIN.
 *
 * Mientras está bloqueada, el resto de la app NO se dibuja (App.jsx no monta
 * las pantallas), así que no hay datos visibles detrás del teclado.
 *
 * Intentos fallidos: se guardan en IndexedDB (no en memoria) para que cerrar
 * y abrir la app no reinicie la cuenta. Tras 5 fallos hay que esperar, y la
 * espera se duplica con cada fallo (ver lockoutDelayMs en core/pin.js).
 */
import { useEffect, useState } from 'preact/hooks';
import { useAppData } from '../state/AppDataContext.jsx';
import { PinPad } from '../components/PinPad.jsx';
import { verifyPin, lockoutDelayMs } from '../../core/pin.js';
import { getPinAttempts, savePinAttempts } from '../../data/repositories.js';
import { deleteDatabase } from '../../data/db.js';

/**
 * @param {{ onUnlock: () => void }} props
 */
export function LockScreen({ onUnlock }) {
  const { settings } = useAppData();
  const [attempts, setAttempts] = useState(null); // { failedCount, lockedUntil }
  const [message, setMessage] = useState({ text: null, isError: false });
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Cargar los intentos guardados al mostrar el bloqueo.
  useEffect(() => {
    getPinAttempts().then(setAttempts);
  }, []);

  // Mientras haya espera, actualizar "now" cada segundo para la cuenta regresiva.
  const waitMs = attempts ? Math.max(0, attempts.lockedUntil - now) : 0;
  useEffect(() => {
    if (waitMs <= 0) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    // La función que devuelve useEffect es la "limpieza": se ejecuta al
    // desmontar o antes del siguiente efecto, y evita timers huérfanos.
    return () => clearInterval(timer);
  }, [waitMs > 0]);

  /** @param {string} pin */
  async function handleSubmit(pin) {
    setBusy(true);
    setMessage({ text: 'Verificando...', isError: false });
    try {
      if (await verifyPin(pin, settings.pin)) {
        await savePinAttempts({ failedCount: 0, lockedUntil: 0 });
        onUnlock();
        return;
      }
      const failedCount = attempts.failedCount + 1;
      const next = { failedCount, lockedUntil: Date.now() + lockoutDelayMs(failedCount) };
      await savePinAttempts(next);
      setAttempts(next);
      setNow(Date.now());
      setMessage({ text: 'PIN incorrecto.', isError: true });
    } finally {
      setBusy(false);
    }
  }

  /** "Olvidé mi PIN": la única salida es borrar todo (doble confirmación). */
  async function handleForgot() {
    if (!confirm('Sin el PIN, la única opción es BORRAR TODOS LOS DATOS de la app. ¿Continuar?')) return;
    if (!confirm('Esto no se puede deshacer. ¿Borrar todos los datos?')) return;
    await deleteDatabase();
    location.reload();
  }

  if (!attempts) return <div class="lock-screen" />;

  const waitSeconds = Math.ceil(waitMs / 1000);
  const waitText = waitSeconds >= 60 ? `${Math.ceil(waitSeconds / 60)} min` : `${waitSeconds} s`;

  return (
    <div class="lock-screen">
      <img class="lock-logo" src="./icons/icon-180.png" alt="" width="72" height="72" />
      <PinPad
        title="Money Trees"
        message={waitMs > 0 ? `Demasiados intentos. Espera ${waitText}.` : message.text}
        isError={waitMs > 0 || message.isError}
        autoSubmitLength={settings.pin.length}
        disabled={busy || waitMs > 0}
        onSubmit={handleSubmit}
      />
      <button type="button" class="link-btn" onClick={handleForgot}>
        Olvidé mi PIN
      </button>
    </div>
  );
}
