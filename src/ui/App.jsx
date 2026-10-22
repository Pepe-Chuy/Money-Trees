/**
 * App.jsx - Componente raiz.
 *
 * En la fase 0 es una pantalla de diagnostico para verificar en el iPhone que:
 *   1. la app esta instalada (se abrio desde la pantalla de inicio),
 *   2. funciona sin conexion (el service worker controla la pagina),
 *   3. IndexedDB abre y guarda datos (contador de aperturas),
 *   4. el almacenamiento quedo marcado como persistente.
 *
 * Conceptos de Preact usados:
 * - Componente = funcion que devuelve JSX.
 * - useState: guarda un valor que, al cambiar, vuelve a dibujar el componente.
 * - useEffect(fn, []): ejecuta fn una vez despues del primer dibujo; es donde
 *   va el trabajo asincrono (abrir la base, pedir permisos).
 */
import { useEffect, useState } from 'preact/hooks';
import { openDatabase } from '../data/db.js';
import { recordAppOpen } from '../data/diagnostics.js';
import { requestPersistentStorage, getStorageEstimate } from '../data/storage.js';
import { formatCents } from '../core/money.js';
import { todayISO } from '../core/dates.js';
import './App.css';

/**
 * Detecta si la app corre instalada (pantalla de inicio) y no dentro de Safari.
 * iOS expone navigator.standalone; los demas navegadores usan display-mode.
 * @returns {boolean}
 */
function isInstalled() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Convierte bytes a un texto legible (KB/MB/GB).
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
 * Fila de la lista de verificacion.
 * @param {{ label: string, ok: boolean|null, detail: string }} props
 *        ok = null significa "comprobando..."
 */
function CheckRow({ label, ok, detail }) {
  const status = ok === null ? 'pending' : ok ? 'ok' : 'fail';
  const statusText = { pending: '...', ok: 'OK', fail: 'NO' }[status];
  return (
    <li class="check-row">
      <span class={`check-status check-status--${status}`}>{statusText}</span>
      <div>
        <div class="check-label">{label}</div>
        <div class="check-detail">{detail}</div>
      </div>
    </li>
  );
}

export function App() {
  // Estado inicial: todo "comprobando" (null) hasta que terminen las verificaciones.
  const [db, setDb] = useState({ ok: null, detail: 'Abriendo base de datos...' });
  const [persist, setPersist] = useState({ ok: null, detail: 'Solicitando...' });
  const [offline, setOffline] = useState({ ok: null, detail: 'Comprobando...' });

  useEffect(() => {
    // Base de datos + contador de aperturas.
    (async () => {
      try {
        const database = await openDatabase();
        const diag = await recordAppOpen();
        setDb({
          ok: true,
          detail: `Versión ${database.version}, ${database.objectStoreNames.length} tablas. ` +
            `Abierta ${diag.openCount} ${diag.openCount === 1 ? 'vez' : 'veces'}.`,
        });
      } catch (error) {
        setDb({ ok: false, detail: `Error: ${error.message}` });
      }
    })();

    // Almacenamiento persistente.
    (async () => {
      const { supported, persisted } = await requestPersistentStorage();
      const estimate = await getStorageEstimate();
      const usage = estimate ? ` Usado: ${formatBytes(estimate.usage)}.` : '';
      setPersist({
        ok: persisted,
        detail: (supported ? (persisted ? 'Concedido.' : 'No concedido todavía.') : 'No soportado.') + usage,
      });
    })();

    // Offline: hay service worker controlando esta pagina.
    if (!import.meta.env.PROD) {
      setOffline({ ok: false, detail: 'Solo en la versión publicada (no en npm run dev).' });
    } else if (!('serviceWorker' in navigator)) {
      setOffline({ ok: false, detail: 'Este navegador no soporta service workers.' });
    } else {
      // ready se resuelve cuando hay un service worker activo; controller indica
      // si ya controla ESTA pagina (en la primera visita, hasta recargar o claim).
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
    <main class="app">
      <header class="app-header">
        <img class="app-logo" src="./icons/icon-180.png" alt="" width="64" height="64" />
        <div>
          <h1 class="app-title">Money Trees</h1>
          <p class="app-subtitle">Versión {__APP_VERSION__} - Fase 0</p>
        </div>
      </header>

      <section class="card">
        <h2 class="card-title">Verificación de la instalación</h2>
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
      </section>

      <section class="card">
        <h2 class="card-title">Formato local</h2>
        <p class="check-detail">
          Hoy: {todayISO()} - Ejemplo de monto: {formatCents(3000000)}
        </p>
      </section>
    </main>
  );
}
