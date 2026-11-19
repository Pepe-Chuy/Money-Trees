/**
 * schema.js - Estructura de la base de datos IndexedDB y sus migraciones.
 *
 * Conceptos de IndexedDB:
 * - Base de datos: tiene un nombre y un número de VERSIÓN entero.
 * - Object store: equivalente a una tabla; guarda objetos JS completos.
 *   `keyPath: 'id'` indica que la llave primaria es la propiedad `id` del objeto.
 * - Índice: permite buscar por otra propiedad (ej. gastos por fecha) sin
 *   recorrer todo el store.
 * - La estructura (stores e índices) SOLO puede cambiarse dentro del evento
 *   `upgradeneeded`, que el navegador dispara al abrir la base con una versión
 *   mayor a la guardada en el dispositivo.
 *
 * Migraciones: MIGRATIONS[i] lleva la base de la versión i a la i+1.
 * - Un dispositivo nuevo (versión 0) ejecuta todas en orden.
 * - Un dispositivo en versión 1 que recibe una app con 3 migraciones ejecuta
 *   solo MIGRATIONS[1] y MIGRATIONS[2].
 * Regla de oro: NUNCA modificar una migración ya publicada; si algo cambia,
 * se agrega una migración nueva al final. Este mismo número de versión se usa
 * como `schemaVersion` en los respaldos JSON (fase 2).
 */

import { newId } from '../core/ids.js';

export const DB_NAME = 'money-trees';

/** Nombres de los stores, centralizados para evitar errores de dedo. */
export const STORES = {
  settings: 'settings',             // ajustes de la app, un objeto por id
  categories: 'categories',         // categorías de gasto
  expenses: 'expenses',             // gastos (manuales y los generados por fijos)
  fixedExpenses: 'fixedExpenses',   // definición de gastos fijos recurrentes
  extraIncomes: 'extraIncomes',     // aguinaldo, fondo de ahorro, ventas, otros
  savingsBoxes: 'savingsBoxes',     // cajas de inversión
  goals: 'goals',                   // metas de ahorro
  monthClosings: 'monthClosings',   // cierre de cada mes (sobrante y su destino)
  salaryChanges: 'salaryChanges',   // historial de nómina (versión 2)
};

/**
 * Lista ordenada de migraciones. Cada una recibe:
 * @param {IDBDatabase} db           la base abierta en modo de actualización
 * @param {IDBTransaction} transaction la transacción "versionchange" en curso
 *                                     (sirve para modificar datos existentes)
 */
export const MIGRATIONS = [
  // Versión 0 -> 1: estructura inicial.
  (db) => {
    db.createObjectStore(STORES.settings, { keyPath: 'id' });
    db.createObjectStore(STORES.categories, { keyPath: 'id' });

    const expenses = db.createObjectStore(STORES.expenses, { keyPath: 'id' });
    // Las fechas "YYYY-MM-DD" se ordenan bien como texto, así que un rango
    // ["2026-10-01", "2026-10-31"] sobre este índice da los gastos de octubre.
    expenses.createIndex('by_date', 'date');
    expenses.createIndex('by_category', 'categoryId');

    db.createObjectStore(STORES.fixedExpenses, { keyPath: 'id' });

    const extraIncomes = db.createObjectStore(STORES.extraIncomes, { keyPath: 'id' });
    extraIncomes.createIndex('by_date', 'date');

    db.createObjectStore(STORES.savingsBoxes, { keyPath: 'id' });
    db.createObjectStore(STORES.goals, { keyPath: 'id' });
    // El cierre se identifica por el mes ("2026-10"): uno por mes.
    db.createObjectStore(STORES.monthClosings, { keyPath: 'month' });
  },

  // Versión 1 -> 2: historial de nómina y categorías iniciales.
  (db, transaction) => {
    // Un cambio de sueldo por mes: la llave primaria es el propio mes
    // ("2026-11"). Guardar otro cambio en el mismo mes lo reemplaza.
    db.createObjectStore(STORES.salaryChanges, { keyPath: 'fromMonth' });

    // Sembrar las categorías iniciales DENTRO de la migración garantiza que se
    // creen exactamente una vez por dispositivo. La lista va escrita aquí (y no
    // importada de otro módulo) para que esta migración quede congelada aunque
    // el resto del código cambie después.
    const categories = transaction.objectStore(STORES.categories);
    const names = ['Restaurantes', 'Uber', 'Compras en línea', 'Regalos', 'Tiendas en plazas', 'Ropa', 'Suscripciones'];
    names.forEach((name, index) => {
      categories.add({ id: newId(), name, monthlyLimit: null, archived: false, sortOrder: index, usageCount: 0 });
    });
  },
];

/** Versión actual del esquema = cantidad de migraciones. */
export const SCHEMA_VERSION = MIGRATIONS.length;
