/**
 * useAutoLock.js - Decide cuándo mostrar la pantalla de bloqueo.
 *
 * Un "custom hook" es una función que usa otros hooks y encapsula lógica
 * reutilizable; por convención su nombre empieza con "use".
 *
 * Reglas:
 * - Al abrir la app con PIN activado: bloqueada.
 * - Al pasar a segundo plano se anota la hora (evento visibilitychange).
 * - Al volver: si pasó más de settings.lockTimeoutMs, se bloquea.
 * - Si iOS cerró la app mientras estaba en segundo plano, al reabrirla se
 *   bloquea por la primera regla.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { shouldRelock } from '../../core/pin.js';

/**
 * @param {{ pin: object|null, lockTimeoutMs: number } | null} settings  null mientras cargan
 * @returns {{ decided: boolean, locked: boolean, unlock: () => void }}
 */
export function useAutoLock(settings) {
  const pinEnabled = Boolean(settings?.pin);
  // null = todavía no se sabe (ajustes cargando).
  const [locked, setLocked] = useState(null);
  const hiddenAt = useRef(null);

  // Decisión inicial, una sola vez, en cuanto llegan los ajustes.
  useEffect(() => {
    if (settings && locked === null) setLocked(pinEnabled);
  }, [settings, locked, pinEnabled]);

  // Escuchar cuando la app se oculta o vuelve a mostrarse.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
      } else {
        if (pinEnabled && shouldRelock(hiddenAt.current, Date.now(), settings.lockTimeoutMs)) {
          setLocked(true);
        }
        hiddenAt.current = null;
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pinEnabled, settings?.lockTimeoutMs]);

  return {
    decided: locked !== null,
    locked: locked === true,
    unlock: () => setLocked(false),
  };
}
