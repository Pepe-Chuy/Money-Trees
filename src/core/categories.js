/**
 * categories.js - Reglas de las categorías de gasto.
 */

/**
 * Limpia un nombre: quita espacios al inicio/fin y colapsa espacios repetidos.
 * @param {string} name
 * @returns {string}
 */
export function normalizeCategoryName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Valida el nombre de una categoría nueva o editada.
 * No se permiten nombres repetidos entre categorías activas, sin importar
 * mayúsculas ni acentos ("Ropa" y "ropa" chocarían). localeCompare con
 * sensitivity 'base' compara ignorando ambas cosas.
 *
 * @param {string} name  nombre ya normalizado
 * @param {{ id: string, name: string, archived: boolean }[]} categories
 * @param {string|null} editingId  id de la categoría que se edita (no choca consigo misma)
 * @returns {string|null} mensaje de error, o null si es válido
 */
export function validateCategoryName(name, categories, editingId = null) {
  if (name === '') return 'Escribe un nombre.';
  if (name.length > 40) return 'Máximo 40 caracteres.';
  const duplicate = categories.some(
    (c) => c.id !== editingId && !c.archived && c.name.localeCompare(name, 'es', { sensitivity: 'base' }) === 0
  );
  return duplicate ? 'Ya existe una categoría con ese nombre.' : null;
}

/**
 * Orden para los botones de captura rápida: primero las más usadas
 * (usageCount, que sube cada vez que se registra un gasto con ella) y, en
 * empate, el orden en que fueron creadas. Las archivadas no aparecen.
 *
 * @param {{ archived: boolean, usageCount?: number, sortOrder?: number }[]} categories
 * @returns {object[]} copia ordenada (no modifica la original)
 */
export function sortForQuickPick(categories) {
  return categories
    .filter((c) => !c.archived)
    .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * Orden para listas de administración: activas por sortOrder, luego archivadas.
 * @param {{ archived: boolean, sortOrder?: number }[]} categories
 * @returns {object[]}
 */
export function sortForManagement(categories) {
  return [...categories].sort(
    (a, b) => Number(a.archived) - Number(b.archived) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
}
