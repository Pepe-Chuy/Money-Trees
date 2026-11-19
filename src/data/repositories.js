/**
 * repositories.js - Operaciones de datos que usa la app, por entidad.
 *
 * La UI nunca habla con IndexedDB directamente: llama a estas funciones.
 * Así, si mañana cambia el almacenamiento, solo cambia este archivo y db.js.
 *
 * Todos los montos están en centavos y las fechas en "YYYY-MM-DD" (ver core/).
 */
import { STORES } from './schema.js';
import {
  runTransaction, requestToPromise, getAll, getAllInRange, getByKey, put, remove, countByIndex,
} from './db.js';
import { monthDateRange } from '../core/dates.js';

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

/**
 * Valores por defecto de los ajustes. Se combinan con lo guardado, de modo que
 * agregar un ajuste nuevo en el futuro no requiere migración: si no está
 * guardado, se usa el valor por defecto.
 */
export const DEFAULT_SETTINGS = {
  id: 'app',
  monthlyTotalLimit: null, // centavos o null (sin límite)
  pin: null,               // { hash, salt, iterations, length } o null (sin PIN)
  lockTimeoutMs: 60_000,   // tiempo en segundo plano antes de pedir el PIN
};

/**
 * Lee los ajustes (con valores por defecto para lo que falte).
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function getSettings() {
  const stored = await getByKey(STORES.settings, 'app');
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Modifica algunos ajustes sin tocar los demás. Lectura y escritura van en la
 * misma transacción para que dos cambios seguidos no se pisen.
 * @param {Partial<typeof DEFAULT_SETTINGS>} changes
 * @returns {Promise<void>}
 */
export function updateSettings(changes) {
  return runTransaction([STORES.settings], 'readwrite', async (stores) => {
    const current = await requestToPromise(stores[STORES.settings].get('app'));
    stores[STORES.settings].put({ ...DEFAULT_SETTINGS, ...current, ...changes, id: 'app' });
  });
}

/**
 * Intentos fallidos de PIN. Se guardan en la base (no en memoria) para que
 * cerrar y abrir la app no reinicie la espera obligatoria.
 * @returns {Promise<{ failedCount: number, lockedUntil: number }>}
 */
export async function getPinAttempts() {
  const stored = await getByKey(STORES.settings, 'pinAttempts');
  return { failedCount: stored?.failedCount ?? 0, lockedUntil: stored?.lockedUntil ?? 0 };
}

/**
 * @param {{ failedCount: number, lockedUntil: number }} attempts
 * @returns {Promise<void>}
 */
export function savePinAttempts(attempts) {
  return put(STORES.settings, { id: 'pinAttempts', ...attempts });
}

// ---------------------------------------------------------------------------
// Nómina
// ---------------------------------------------------------------------------

/** @returns {Promise<{ fromMonth: string, amount: number }[]>} */
export function listSalaryChanges() {
  return getAll(STORES.salaryChanges);
}

/**
 * Guarda un cambio de sueldo. Si ya había uno en ese mes, lo reemplaza
 * (la llave primaria es fromMonth).
 * @param {{ fromMonth: string, amount: number }} change
 */
export function saveSalaryChange(change) {
  return put(STORES.salaryChanges, change);
}

/** @param {string} fromMonth */
export function deleteSalaryChange(fromMonth) {
  return remove(STORES.salaryChanges, fromMonth);
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

/** @returns {Promise<object[]>} todas, incluidas las archivadas */
export function listCategories() {
  return getAll(STORES.categories);
}

/** @param {object} category  objeto completo con id */
export function saveCategory(category) {
  return put(STORES.categories, category);
}

/**
 * Cuántos gastos usan una categoría (para decidir cómo eliminarla).
 * @param {string} categoryId
 * @returns {Promise<number>}
 */
export function countExpensesInCategory(categoryId) {
  return countByIndex(STORES.expenses, 'by_category', categoryId);
}

/**
 * Elimina una categoría. Si `reassignTo` trae un id, primero mueve a esa
 * categoría todos sus gastos y gastos fijos. Todo en UNA transacción: o se
 * reasigna y elimina todo, o no cambia nada (no quedan gastos huérfanos).
 *
 * @param {string} categoryId
 * @param {string|null} reassignTo
 * @returns {Promise<void>}
 */
export function deleteCategory(categoryId, reassignTo = null) {
  const storeNames = [STORES.categories, STORES.expenses, STORES.fixedExpenses];
  return runTransaction(storeNames, 'readwrite', async (stores) => {
    if (reassignTo) {
      const expenses = await requestToPromise(stores[STORES.expenses].index('by_category').getAll(categoryId));
      for (const expense of expenses) stores[STORES.expenses].put({ ...expense, categoryId: reassignTo });

      // Los gastos fijos (fase 2) no tienen índice por categoría; son pocos, se filtran.
      const fixed = await requestToPromise(stores[STORES.fixedExpenses].getAll());
      for (const item of fixed.filter((f) => f.categoryId === categoryId)) {
        stores[STORES.fixedExpenses].put({ ...item, categoryId: reassignTo });
      }
    }
    stores[STORES.categories].delete(categoryId);
  });
}

// ---------------------------------------------------------------------------
// Gastos
// ---------------------------------------------------------------------------

/**
 * Gastos de un mes, usando el índice por fecha (no recorre todos los gastos).
 * @param {string} month "YYYY-MM"
 * @returns {Promise<object[]>}
 */
export function listExpensesForMonth(month) {
  const [first, last] = monthDateRange(month);
  return getAllInRange(STORES.expenses, 'by_date', first, last);
}

/**
 * TODOS los gastos de todos los meses (para exportar).
 * @returns {Promise<object[]>}
 */
export function listAllExpenses() {
  return getAll(STORES.expenses);
}

/**
 * Crea un gasto y suma 1 al contador de uso de su categoría (para ordenar los
 * botones de captura rápida). Ambas escrituras en la misma transacción.
 * @param {{ id: string, date: string, amount: number, categoryId: string, note: string }} expense
 * @returns {Promise<void>}
 */
export function createExpense(expense) {
  return runTransaction([STORES.expenses, STORES.categories], 'readwrite', async (stores) => {
    stores[STORES.expenses].add({ fixedExpenseId: null, ...expense, createdAt: new Date().toISOString() });
    const category = await requestToPromise(stores[STORES.categories].get(expense.categoryId));
    if (category) {
      stores[STORES.categories].put({ ...category, usageCount: (category.usageCount ?? 0) + 1 });
    }
  });
}

/** @param {object} expense  gasto completo ya existente */
export function updateExpense(expense) {
  return put(STORES.expenses, { ...expense, updatedAt: new Date().toISOString() });
}

/** @param {string} id */
export function deleteExpense(id) {
  return remove(STORES.expenses, id);
}

// ---------------------------------------------------------------------------
// Ingresos extra
// ---------------------------------------------------------------------------

/** Tipos de ingreso extra con su nombre para mostrar. */
export const EXTRA_INCOME_TYPES = {
  aguinaldo: 'Aguinaldo',
  fondo_ahorro: 'Fondo de ahorro',
  venta: 'Venta',
  otro: 'Otro',
};

/**
 * @param {string} month "YYYY-MM"
 * @returns {Promise<object[]>}
 */
export function listExtraIncomesForMonth(month) {
  const [first, last] = monthDateRange(month);
  return getAllInRange(STORES.extraIncomes, 'by_date', first, last);
}

/** @param {{ id: string, date: string, amount: number, type: string, note: string }} income */
export function saveExtraIncome(income) {
  return put(STORES.extraIncomes, income);
}

/** @param {string} id */
export function deleteExtraIncome(id) {
  return remove(STORES.extraIncomes, id);
}
