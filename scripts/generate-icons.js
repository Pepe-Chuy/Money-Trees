/**
 * generate-icons.js
 *
 * Genera los iconos PNG de la PWA a partir de public/icons/icon.svg.
 * Se corre a mano con `npm run icons` cada vez que cambie el SVG; los PNG
 * resultantes se guardan en el repositorio (no se generan en el build).
 *
 * Por que hace falta: iOS no acepta SVG como apple-touch-icon y el manifest
 * necesita PNG de 192 y 512 px para que los navegadores lo consideren
 * instalable. Usamos `sharp` (dependencia solo de desarrollo) para rasterizar.
 *
 * Salida:
 *   icon-180.png           apple-touch-icon (tamano que usa el iPhone)
 *   icon-192.png           manifest, proposito "any"
 *   icon-512.png           manifest, proposito "any"
 *   icon-maskable-512.png  manifest, proposito "maskable" (Android recorta en circulo
 *                          u otras formas; el dibujo se reduce al 80% para quedar
 *                          dentro de la zona segura)
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const iconsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons');

/**
 * Convierte un texto SVG a PNG cuadrado del tamano indicado.
 * @param {string} svgText  contenido del SVG
 * @param {number} size     lado del PNG en pixeles
 * @param {string} fileName nombre del archivo de salida dentro de public/icons
 */
async function renderPng(svgText, size, fileName) {
  // density alta para que sharp rasterice el vector con buena nitidez antes de reescalar.
  await sharp(Buffer.from(svgText), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, fileName));
  console.log(`  ${fileName} (${size}x${size})`);
}

/**
 * Crea la variante maskable: escala el grupo "art" al 80% alrededor del centro.
 * Matematica: para escalar por s alrededor del centro c, se traslada por c*(1-s)
 * y luego se escala por s. Con c = 256 y s = 0.8, la traslacion es 51.2.
 * @param {string} svgText SVG original
 * @returns {string} SVG con el dibujo reducido
 */
function toMaskable(svgText) {
  const scale = 0.8;
  const offset = 256 * (1 - scale);
  return svgText.replace('<g id="art">', `<g id="art" transform="translate(${offset} ${offset}) scale(${scale})">`);
}

const svg = await readFile(path.join(iconsDir, 'icon.svg'), 'utf8');
console.log('Generando iconos en public/icons:');
await renderPng(svg, 180, 'icon-180.png');
await renderPng(svg, 192, 'icon-192.png');
await renderPng(svg, 512, 'icon-512.png');
await renderPng(toMaskable(svg), 512, 'icon-maskable-512.png');
