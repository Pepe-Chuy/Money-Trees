/**
 * Configuracion de Vite.
 *
 * - preact(): permite JSX con Preact (transforma <App /> en llamadas a Preact)
 *   y activa Prefresh (recarga en caliente al editar componentes en desarrollo).
 * - base: './' hace que todas las rutas del build sean relativas. Asi la app
 *   funciona igual en http://localhost y en https://usuario.github.io/<repo>/
 *   sin tener que escribir el nombre del repositorio en ningun lado.
 * - define: reemplaza __APP_VERSION__ en el codigo por la version de package.json,
 *   para mostrarla en pantalla y saber que version tiene instalada el iPhone.
 */
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { readFileSync } from 'node:fs';
import { serviceWorkerPlugin } from './scripts/vite-plugin-sw.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  plugins: [preact(), serviceWorkerPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    // host: true expone el servidor en la red local para abrirlo desde el iPhone
    // (http://IP-de-tu-PC:5173). Ojo: sin HTTPS el service worker no funciona ahi.
    host: true,
  },
});
