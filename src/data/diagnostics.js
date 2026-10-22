/**
 * diagnostics.js - Contador de aperturas para la pantalla de prueba de la fase 0.
 *
 * Sirve para comprobar en el iPhone que IndexedDB realmente persiste:
 * si el contador sube cada vez que cierras y abres la app, los datos se
 * estan guardando. Se guarda en el store `settings` con id 'diagnostics'.
 * Probablemente se elimine cuando exista la pantalla real de ajustes.
 */
import { STORES } from './schema.js';
import { runTransaction, requestToPromise } from './db.js';

/**
 * Suma 1 al contador de aperturas y devuelve el registro actualizado.
 * Lectura y escritura van en la MISMA transaccion readwrite para que sea
 * atomica (si hubiera dos aperturas simultaneas, ninguna perderia su incremento).
 * Notar que el await dentro de la transaccion es de una peticion de IndexedDB,
 * lo cual es valido (ver la trampa explicada en db.js).
 * @returns {Promise<{ id: string, openCount: number, firstOpenedAt: string }>}
 */
export function recordAppOpen() {
  return runTransaction([STORES.settings], 'readwrite', async (stores) => {
    const settings = stores[STORES.settings];
    const current = await requestToPromise(settings.get('diagnostics'));
    const updated = {
      id: 'diagnostics',
      openCount: (current?.openCount ?? 0) + 1,
      firstOpenedAt: current?.firstOpenedAt ?? new Date().toISOString(),
    };
    settings.put(updated);
    return updated;
  });
}
