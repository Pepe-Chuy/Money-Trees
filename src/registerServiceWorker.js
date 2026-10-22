/**
 * registerServiceWorker.js - Registra el service worker solo en produccion.
 *
 * En desarrollo (`npm run dev`) NO se registra: el servidor de Vite sirve los
 * archivos sin hash y con recarga en caliente, y un service worker cacheando
 * todo haria que vieras versiones viejas mientras programas. Ademas dist/sw.js
 * solo existe despues de `npm run build`.
 *
 * import.meta.env.PROD lo define Vite: true en el build, false en dev.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  // Se registra despues de "load" para no competir por la red con la carga inicial.
  window.addEventListener('load', () => {
    // Ruta relativa: funciona en localhost y en /<repo>/ de GitHub Pages.
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('No se pudo registrar el service worker:', error);
    });
  });
}
