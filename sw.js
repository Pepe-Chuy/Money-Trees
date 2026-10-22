/**
 * sw.js - Service worker de Money Trees (PLANTILLA).
 *
 * Este archivo NO se sirve tal cual. Durante `npm run build`, el plugin
 * scripts/vite-plugin-sw.js reemplaza los dos marcadores de abajo y escribe
 * el resultado en dist/sw.js:
 *   __PRECACHE_URLS__  -> arreglo JSON con todos los archivos del build
 *                         (con sus nombres con hash, ej. assets/index-a1b2c3.js)
 *   __CACHE_VERSION__  -> hash del contenido del build
 *
 * Que es un service worker: un script que el navegador ejecuta aparte de la
 * pagina y que puede interceptar cada peticion de red (evento fetch). Lo usamos
 * para guardar todos los archivos de la app en la Cache Storage y responder
 * desde ahi, de modo que la app abra sin conexion.
 *
 * Ciclo de vida:
 *   1. install:  se descarga todo lo de PRECACHE_URLS en una cache nueva.
 *   2. activate: se borran las caches de versiones anteriores.
 *   3. fetch:    cada peticion se responde primero desde la cache.
 *
 * Como llegan las actualizaciones: el navegador vuelve a descargar sw.js al
 * abrir la app. Si cambio un solo byte (y el hash cambia en cada build con
 * cambios), se instala la version nueva. Con skipWaiting + clients.claim la
 * nueva version toma el control de inmediato; la pantalla ya abierta sigue
 * usando los archivos que tenia cargados y la siguiente apertura usa los nuevos.
 */

const PRECACHE_URLS = __PRECACHE_URLS__;
const CACHE_NAME = `money-trees-__CACHE_VERSION__`;

/**
 * install: precarga todos los archivos del build.
 * event.waitUntil mantiene vivo al service worker hasta que la promesa termine;
 * si alguna descarga falla, la instalacion completa falla y se reintenta en la
 * siguiente visita (asi nunca queda una cache a medias).
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Las rutas son relativas al alcance (scope) del service worker, que en
      // GitHub Pages es /<nombre-del-repo>/. new URL las vuelve absolutas.
      const urls = PRECACHE_URLS.map((p) => new URL(p, self.registration.scope).href);
      await cache.addAll(urls);
      // Activar la nueva version sin esperar a que se cierren las pestanas viejas.
      await self.skipWaiting();
    })()
  );
});

/**
 * activate: borra las caches de versiones anteriores y toma el control de las
 * paginas abiertas (clients.claim) para que empiecen a usar este worker.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('money-trees-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * fetch: estrategia "cache primero".
 * - Solo se interceptan peticiones GET al mismo origen; todo lo demas pasa
 *   directo a la red (la app no usa servidores externos, pero por si acaso).
 * - Navegaciones (abrir la app o recargar): se responde con index.html de la
 *   cache. Es una SPA, asi que cualquier ruta muestra la misma pagina.
 * - Otros archivos: cache si existe; si no, red.
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (request.mode === 'navigate') {
        const indexUrl = new URL('index.html', self.registration.scope).href;
        const cachedIndex = await cache.match(indexUrl);
        if (cachedIndex) return cachedIndex;
        return fetch(request);
      }

      // ignoreSearch: tratar "icon.png?v=2" igual que "icon.png".
      const cached = await cache.match(request, { ignoreSearch: true });
      return cached || fetch(request);
    })()
  );
});
