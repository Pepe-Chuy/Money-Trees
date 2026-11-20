/**
 * Pruebas de ids.js, categories.js y las funciones nuevas de dates.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { uuidFromBytes, newId } from '../src/core/ids.js';
import {
  normalizeCategoryName, validateCategoryName, sortForQuickPick, sortForManagement,
} from '../src/core/categories.js';
import { addDays, monthDateRange, formatMonthLabel } from '../src/core/dates.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('ids', () => {
  it('uuidFromBytes marca versión 4 y variante RFC aunque los bytes sean 0xff', () => {
    assert.match(uuidFromBytes(new Uint8Array(16).fill(0xff)), UUID_V4);
    assert.match(uuidFromBytes(new Uint8Array(16)), UUID_V4);
  });

  it('newId produce UUID v4 distintos', () => {
    const a = newId();
    assert.match(a, UUID_V4);
    assert.notEqual(a, newId());
  });
});

describe('categories', () => {
  const categories = [
    { id: '1', name: 'Ropa', archived: false, usageCount: 2, sortOrder: 0 },
    { id: '2', name: 'Uber', archived: false, usageCount: 9, sortOrder: 1 },
    { id: '3', name: 'Regalos', archived: false, usageCount: 2, sortOrder: 2 },
    { id: '4', name: 'Café', archived: true, usageCount: 50, sortOrder: 3 },
  ];

  it('normaliza espacios', () => {
    assert.equal(normalizeCategoryName('  Compras   en  línea '), 'Compras en línea');
  });

  it('valida vacío, largo y duplicados sin importar mayúsculas ni acentos', () => {
    assert.equal(validateCategoryName('', categories), 'Escribe un nombre.');
    assert.equal(validateCategoryName('x'.repeat(41), categories), 'Máximo 40 caracteres.');
    assert.match(validateCategoryName('ROPA', categories), /Ya existe/);
    assert.match(validateCategoryName('úber', categories), /Ya existe/);
    assert.equal(validateCategoryName('Ropa', categories, '1'), null); // editarse a sí misma
    assert.equal(validateCategoryName('Cafe', categories), null); // la archivada no choca
  });

  it('captura rápida: más usadas primero, sin archivadas, empate por sortOrder', () => {
    assert.deepEqual(sortForQuickPick(categories).map((c) => c.id), ['2', '1', '3']);
  });

  it('administración: activas por orden y archivadas al final', () => {
    assert.deepEqual(sortForManagement(categories).map((c) => c.id), ['1', '2', '3', '4']);
  });
});

describe('dates (fase 1)', () => {
  it('addDays cruza meses y años', () => {
    assert.equal(addDays('2026-10-19', -1), '2026-10-18');
    assert.equal(addDays('2026-11-01', -1), '2026-10-31');
    assert.equal(addDays('2027-01-01', -1), '2026-12-31');
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  });

  it('monthDateRange', () => {
    // Periodos del 13 al 12 (más casos en dates.test.js).
    assert.deepEqual(monthDateRange('2026-02'), ['2026-02-13', '2026-03-12']);
    assert.deepEqual(monthDateRange('2026-10'), ['2026-10-13', '2026-11-12']);
  });

  it('formatMonthLabel en español', () => {
    assert.equal(formatMonthLabel('2026-10'), 'Octubre de 2026');
    assert.equal(formatMonthLabel('2027-01'), 'Enero de 2027');
  });
});
