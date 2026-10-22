/**
 * vite-plugin-sw.js
 *
 * Plugin minimo de Vite que genera dist/sw.js a partir de la plantilla ./sw.js.
 *
 * Problema que resuelve: Vite pone un hash en el nombre de cada archivo
 * compilado (assets/index-a1b2c3.js) para que el navegador nunca use una
 * version vieja de su cache HTTP. El service worker necesita conocer esos
 * nombres exactos para precargarlos, pero solo se saben al terminar el build.
 *
 * Solucion: en el hook `closeBundle` (corre cuando Vite ya escribio todo en
 * dist/, incluidos los archivos de public/), recorremos dist/, armamos la lista
 * de archivos, calculamos un hash de su contenido y lo inyectamos en la plantilla.
 *
 * Que es un plugin de Vite: un objeto con nombre y "hooks" (funciones) que Vite
 * llama en momentos concretos del build. `apply: 'build'` hace que solo se use
 * en `vite build`, no en el servidor de desarrollo.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Lista recursivamente los archivos de un directorio.
 * @param {string} dir      directorio absoluto a recorrer
 * @param {string} baseDir  directorio raiz contra el que se calculan las rutas relativas
 * @returns {Promise<string[]>} rutas relativas con "/" (formato URL, tambien en Windows)
 */
async function listFiles(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath, baseDir)));
    } else {
      files.push(path.relative(baseDir, fullPath).split(path.sep).join('/'));
    }
  }
  return files;
}

/**
 * Reemplaza `search` por `replacement` exigiendo que `search` aparezca
 * EXACTAMENTE una vez. Si no, lanza un error y el build falla.
 *
 * Por que: String.prototype.replace con un texto solo cambia la primera
 * aparicion. Si el marcador tambien aparece en un comentario, se reemplazaria
 * el comentario y el codigo quedaria con el marcador sin sustituir (error que
 * solo se veria en el telefono). Buscar la linea de codigo completa y fallar
 * ruidosamente evita ese error silencioso.
 *
 * @param {string} source
 * @param {string} search
 * @param {string} replacement
 * @returns {string}
 */
function replaceExactlyOnce(source, search, replacement) {
  const count = source.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`[sw] Se esperaba encontrar "${search}" una vez en la plantilla, se encontro ${count}.`);
  }
  // Funcion como reemplazo: evita que "$&" u otros patrones especiales del
  // texto se interpreten (replace trata "$" de forma especial en strings).
  return source.replace(search, () => replacement);
}

/**
 * Crea el plugin.
 * @param {{ template?: string }} options  ruta de la plantilla, relativa a la raiz del proyecto
 * @returns {import('vite').Plugin}
 */
export function serviceWorkerPlugin({ template = 'sw.js' } = {}) {
  let rootDir = '';
  let outDir = '';

  return {
    name: 'money-trees-service-worker',
    apply: 'build',

    // configResolved recibe la configuracion final; de ahi sacamos las rutas absolutas.
    configResolved(config) {
      rootDir = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },

    async closeBundle() {
      // Todo lo que hay en dist/ menos el propio sw.js (no debe precargarse a si mismo).
      const files = (await listFiles(outDir)).filter((f) => f !== 'sw.js').sort();

      // Hash = sha256 de (ruta + contenido) de cada archivo. Si nada cambio, el
      // hash es el mismo y el navegador no reinstala el service worker.
      const hash = createHash('sha256');
      for (const file of files) {
        hash.update(file);
        hash.update(await readFile(path.join(outDir, file)));
      }
      const version = hash.digest('hex').slice(0, 12);

      const source = await readFile(path.resolve(rootDir, template), 'utf8');
      let output = replaceExactlyOnce(
        source,
        'const PRECACHE_URLS = __PRECACHE_URLS__;',
        `const PRECACHE_URLS = ${JSON.stringify(files, null, 2)};`
      );
      output = replaceExactlyOnce(output, 'money-trees-__CACHE_VERSION__', `money-trees-${version}`);

      await writeFile(path.join(outDir, 'sw.js'), output);
      console.log(`[sw] dist/sw.js generado: ${files.length} archivos, version ${version}`);
    },
  };
}
