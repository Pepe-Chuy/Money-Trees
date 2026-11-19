/**
 * exportFile.js - Entregar un archivo generado por la app al usuario.
 *
 * En una PWA instalada en iPhone, descargar un archivo a veces abre una vista
 * previa sin opción clara de guardarlo. La forma más confiable es la hoja de
 * Compartir de iOS (navigator.share con un archivo): desde ahí se puede
 * "Guardar en Archivos", mandar por correo, AirDrop, etc.
 * Si el navegador no puede compartir archivos (p. ej. en la PC), se descarga.
 */

/**
 * @param {string} fileName  ej. "money-trees-gastos-2026-11-19.csv"
 * @param {string} content   contenido de texto
 * @param {string} mimeType  ej. "text/csv"
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export async function shareOrDownload(fileName, content, mimeType) {
  const file = new File([content], fileName, { type: mimeType });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (error) {
      // AbortError = el usuario cerró la hoja de Compartir; no es un fallo.
      if (error.name === 'AbortError') return 'cancelled';
      // Cualquier otro error: intentar la descarga normal.
    }
  }

  // Descarga clásica: un enlace temporal a un Blob en memoria con atributo download.
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Liberar la memoria del Blob un poco después (el clic necesita la URL viva).
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
