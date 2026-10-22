/**
 * schema.js - Estructura de la base de datos IndexedDB y sus migraciones.
 *
 * Conceptos de IndexedDB:
 * - Base de datos: tiene un nombre y un numero de VERSION entero.
 * - Object store: equivalente a una tabla; guarda objetos JS completos.
 *   `keyPath: 'id'` indica que la llave primaria es la propiedad `id` del objeto.
 * - Indice: permite buscar por otra propiedad (ej. gastos por fecha) sin
 *   recorrer todo el store.
 * - La estructura (stores e indices) SOLO puede cambiarse dentro del evento
 *   `upgradeneeded`, que el navegador dispara al abrir la base con una version
 *   mayor a la guardada en el dispositivo.
 *
 * Migraciones: MIGRATIONS[i] lleva la base de la version i a la i+1.
 * - Un dispositivo nuevo (version 0) ejecuta todas en orden.
 * - Un dispositivo en version 1 que recibe una app con 3 migraciones ejecuta
 *   solo MIGRATIONS[1] y MIGRATIONS[2].
 * Regla de oro: NUNCA modificar una migracion ya publicada; si algo cambia,
 * se agrega una migracion nueva al final. Este mismo numero de version se usa
 * como `schemaVersion` en los respaldos JSON (fase 2).
 */

export const DB_NAME = 'money-trees';

/** Nombres de los stores, centralizados para evitar errores de dedo. */
export const STORES = {
  settings: 'settings',             // ajustes de la app, un objeto por id
  categories: 'categories',         // categorias de gasto
  expenses: 'expenses',             // gastos (manuales y los generados por fijos)
  fixedExpenses: 'fixedExpenses',   // definicion de gastos fijos recurrentes
  extraIncomes: 'extraIncomes',     // aguinaldo, fondo de ahorro, ventas, otros
  savingsBoxes: 'savingsBoxes',     // cajas de inversion
  goals: 'goals',                   // metas de ahorro
  monthClosings: 'monthClosings',   // cierre de cada mes (sobrante y su destino)
};

/**
 * Lista ordenada de migraciones. Cada una recibe:
 * @param {IDBDatabase} db           la base abierta en modo de actualizacion
 * @param {IDBTransaction} transaction la transaccion "versionchange" en curso
 *                                     (sirve para modificar datos existentes)
 */
export const MIGRATIONS = [
  // Version 0 -> 1: estructura inicial.
  (db) => {
    db.createObjectStore(STORES.settings, { keyPath: 'id' });
    db.createObjectStore(STORES.categories, { keyPath: 'id' });

    const expenses = db.createObjectStore(STORES.expenses, { keyPath: 'id' });
    // Las fechas "YYYY-MM-DD" se ordenan bien como texto, asi que un rango
    // ["2026-10-01", "2026-10-31"] sobre este indice da los gastos de octubre.
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
];

/** Version actual del esquema = cantidad de migraciones. */
export const SCHEMA_VERSION = MIGRATIONS.length;
