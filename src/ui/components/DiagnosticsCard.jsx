/**
 * DiagnosticsCard.jsx - La verificación de la fase 0, ahora dentro de Ajustes.
 * Útil para revisar en el iPhone que la app sigue instalada, funciona sin
 * conexión y que los datos persisten.
 */
import { useEffect, useState } from 'preact/hooks';
import { openDatabase, getByKey } from '../../data/db.js';
import { getStorageEstimate } from '../../data/storage.js';

/**
 * ¿Corre instalada (pantalla de inicio) y no dentro de Safari?
 * iOS expone navigator.standalone; los demás navegadores usan display-mode.
 * @returns {boolean}
 */
function isInstalled() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Bytes a texto legible (KB/MB/GB).
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/**
 * @param {{ label: string, ok: boolean|null, detail: string }} props  ok null = comprobando
 */
function CheckRow({ label, ok, detail }) {
  const status = ok === null ? 'pending' : ok ? 'ok' : 'fail';
  return (
    <li class="check-row">
      <span class={`check-status check-status--${status}`}>{{ pending: '...', ok: 'OK', fail: 'NO' }[status]}</span>
      <div>
        <div class="check-label">{label}</div>
        <div class="hint">{detail}</div>
      </div>
    </li>
  );
}

export function DiagnosticsCard() {
  const [db, setDb] = useState({ ok: null, detail: 'Comprobando...' });
  const [persist, setPersist] = useState({ ok: null, detail: 'Comprobando...' });
  const [offline, setOffline] = useState({ ok: null, detail: 'Comprobando...' });

  useEffect(() => {
    (async () => {
      try {
        const database = await openDatabase();
        const diag = await getByKey('settings', 'diagnostics');
        const opens = diag?.openCount ?? 0;
        setDb({
          ok: true,
          detail: `Versión ${database.version}, ${database.objectStoreNames.length} tablas. Abierta ${opens} ${opens === 1 ? 'vez' : 'veces'}.`,
        });
      } catch (error) {
        setDb({ ok: false, detail: `Error: ${error.message}` });
      }
    })();

    (async () => {
      const persisted = (await navigator.storage?.persisted?.()) ?? false;
      const estimate = await getStorageEstimate();
      const usage = estimate ? ` Usado: ${formatBytes(estimate.usage)}.` : '';
      setPersist({ ok: persisted, detail: (persisted ? 'Concedido.' : 'No concedido todavía.') + usage });
    })();

    if (!import.meta.env.PROD) {
      setOffline({ ok: false, detail: 'Solo en la versión publicada (no en npm run dev).' });
    } else if (!('serviceWorker' in navigator)) {
      setOffline({ ok: false, detail: 'Este navegador no soporta service workers.' });
    } else {
      navigator.serviceWorker.ready.then(() => {
        setOffline(
          navigator.serviceWorker.controller
            ? { ok: true, detail: 'Archivos guardados; abre sin internet.' }
            : { ok: false, detail: 'Instalado; cierra y vuelve a abrir la app.' }
        );
      });
    }
  }, []);

  const installed = isInstalled();

  return (
    <section class="card">
      <h2 class="card-title">Diagnóstico</h2>
      <ul class="check-list">
        <CheckRow
          label="Instalada en pantalla de inicio"
          ok={installed}
          detail={installed ? 'Corriendo como app.' : 'En Safari: Compartir > Añadir a pantalla de inicio.'}
        />
        <CheckRow label="Funciona sin conexión" ok={offline.ok} detail={offline.detail} />
        <CheckRow label="Base de datos (IndexedDB)" ok={db.ok} detail={db.detail} />
        <CheckRow label="Almacenamiento persistente" ok={persist.ok} detail={persist.detail} />
      </ul>
      <p class="hint">Money Trees versión {__APP_VERSION__}</p>
    </section>
  );
}
