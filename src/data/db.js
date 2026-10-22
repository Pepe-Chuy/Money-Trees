/**
 * db.js - Envoltorio (wrapper) minimo de IndexedDB basado en promesas.
 *
 * La API nativa de IndexedDB es anterior a las promesas: cada operacion
 * devuelve un IDBRequest y el resultado llega despues por los eventos
 * `success` / `error`. Aqui convertimos eso a promesas para poder usar
 * async/await en el resto de la app, que solo vera funciones como
 * getAll('expenses') o put('expenses', gasto).
 *
 * TRAMPA IMPORTANTE de las transacciones: una transaccion de IndexedDB se
 * cierra sola (auto-commit) en cuanto termina la tarea actual del event loop
 * sin peticiones pendientes. Por eso, dentro de una transaccion NO se debe
 * hacer `await` de algo que no sea IndexedDB (un fetch, un setTimeout, etc.):
 * al volver, la transaccion ya estaria cerrada y fallaria con
 * "TransactionInactiveError". runTransaction() esta disenado para eso.
 */
import { DB_NAME, SCHEMA_VERSION, MIGRATIONS } from './schema.js';

/**
 * Convierte un IDBRequest en una promesa.
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>} se resuelve con request.result o se rechaza con request.error
 */
export function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Promesa que se resuelve cuando la transaccion termina de escribirse.
 * Importante: que un put() tenga exito NO significa que este guardado; lo
 * esta hasta que la transaccion completa ("complete"). Si una operacion falla,
 * la transaccion completa se revierte ("abort") y nada se guarda.
 * @param {IDBTransaction} transaction
 * @returns {Promise<void>}
 */
function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Transaccion abortada'));
  });
}

/** Promesa de la conexion abierta; se comparte para no abrir la base en cada operacion. */
let dbPromise = null;

/**
 * Abre la base de datos (una sola vez) y aplica las migraciones pendientes.
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, SCHEMA_VERSION);

    // Solo se dispara si la version guardada es menor que SCHEMA_VERSION.
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const transaction = request.transaction;
      // Ejecutar en orden las migraciones que faltan: de oldVersion a la actual.
      for (let version = event.oldVersion; version < SCHEMA_VERSION; version++) {
        MIGRATIONS[version](db, transaction);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Si otra pestana abre una version mas nueva, cerramos esta conexion
      // para no bloquear su migracion. La siguiente operacion reabrira.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    // Otra pestana tiene abierta una version vieja y no la cierra. En una PWA
    // instalada es raro; solo lo registramos para poder diagnosticarlo.
    request.onblocked = () => {
      console.warn('IndexedDB: actualizacion bloqueada por otra pestana abierta.');
    };
  });

  return dbPromise;
}

/**
 * Ejecuta varias operaciones en UNA transaccion (todo o nada).
 *
 * `work` recibe un objeto con los stores pedidos y debe lanzar sus peticiones
 * de forma sincrona (o haciendo await SOLO de peticiones de esos stores).
 * Ejemplo:
 *   await runTransaction(['expenses'], 'readwrite', ({ expenses }) => {
 *     expenses.put(gasto1);
 *     expenses.put(gasto2);
 *   });
 *
 * @template T
 * @param {string[]} storeNames  stores que participan
 * @param {'readonly'|'readwrite'} mode
 * @param {(stores: Record<string, IDBObjectStore>) => T | Promise<T>} work
 * @returns {Promise<T>} lo que devuelva `work`, cuando la transaccion ya se guardo
 */
export async function runTransaction(storeNames, mode, work) {
  const db = await openDatabase();
  const transaction = db.transaction(storeNames, mode);
  const done = transactionDone(transaction);

  const stores = {};
  for (const name of storeNames) stores[name] = transaction.objectStore(name);

  let result;
  try {
    result = await work(stores);
  } catch (error) {
    // Un error en nuestro codigo debe revertir lo que ya se pidio. abort()
    // lanza InvalidStateError si la transaccion ya termino; en ese caso no hay nada que revertir.
    try {
      transaction.abort();
    } catch {
      /* ya estaba cerrada */
    }
    await done.catch(() => {});
    throw error;
  }
  await done;
  return result;
}

/**
 * Todos los objetos de un store.
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
export function getAll(storeName) {
  return runTransaction([storeName], 'readonly', (stores) =>
    requestToPromise(stores[storeName].getAll())
  );
}

/**
 * Objetos cuyo valor en `indexName` esta entre `lower` y `upper` (inclusive).
 * Ejemplo: getAllInRange('expenses', 'by_date', '2026-10-01', '2026-10-31').
 * @param {string} storeName
 * @param {string} indexName
 * @param {any} lower
 * @param {any} upper
 * @returns {Promise<any[]>}
 */
export function getAllInRange(storeName, indexName, lower, upper) {
  return runTransaction([storeName], 'readonly', (stores) =>
    requestToPromise(stores[storeName].index(indexName).getAll(IDBKeyRange.bound(lower, upper)))
  );
}

/**
 * Un objeto por su llave primaria.
 * @param {string} storeName
 * @param {any} key
 * @returns {Promise<any|undefined>} undefined si no existe
 */
export function getByKey(storeName, key) {
  return runTransaction([storeName], 'readonly', (stores) =>
    requestToPromise(stores[storeName].get(key))
  );
}

/**
 * Inserta o reemplaza un objeto (put = "upsert": si la llave existe, lo sobrescribe).
 * @param {string} storeName
 * @param {object} value  debe incluir su llave primaria (ej. `id`)
 * @returns {Promise<void>}
 */
export function put(storeName, value) {
  return runTransaction([storeName], 'readwrite', (stores) => {
    stores[storeName].put(value);
  });
}

/**
 * Borra un objeto por su llave primaria (no falla si no existe).
 * @param {string} storeName
 * @param {any} key
 * @returns {Promise<void>}
 */
export function remove(storeName, key) {
  return runTransaction([storeName], 'readwrite', (stores) => {
    stores[storeName].delete(key);
  });
}
