/**
 * Pruebas de src/core/dates.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toISODate, monthOf, addMonths, monthsBetween, daysInMonth, isValidISODate, isValidMonth,
} from '../src/core/dates.js';

describe('toISODate', () => {
  it('usa la fecha LOCAL, no UTC', () => {
    // new Date(anio, mes0, dia, hora) se interpreta en hora local.
    // 31 de octubre a las 23:30 local debe seguir siendo 31 de octubre,
    // aunque en UTC ya sea 1 de noviembre (si la zona es UTC-x).
    assert.equal(toISODate(new Date(2026, 9, 31, 23, 30)), '2026-10-31');
    assert.equal(toISODate(new Date(2026, 0, 5)), '2026-01-05');
  });
});

describe('monthOf', () => {
  it('extrae YYYY-MM', () => {
    assert.equal(monthOf('2026-10-19'), '2026-10');
  });
});

describe('addMonths', () => {
  it('suma dentro del mismo anio y cruzando anios', () => {
    assert.equal(addMonths('2026-10', 1), '2026-11');
    assert.equal(addMonths('2026-11', 3), '2027-02');
    assert.equal(addMonths('2026-12', 1), '2027-01');
    assert.equal(addMonths('2026-10', 0), '2026-10');
  });

  it('resta con n negativo', () => {
    assert.equal(addMonths('2026-01', -1), '2025-12');
    assert.equal(addMonths('2026-03', -15), '2024-12');
  });
});

describe('monthsBetween', () => {
  it('cuenta meses con signo', () => {
    assert.equal(monthsBetween('2026-10', '2027-01'), 3);
    assert.equal(monthsBetween('2027-01', '2026-10'), -3);
    assert.equal(monthsBetween('2026-10', '2026-10'), 0);
  });

  it('es la inversa de addMonths', () => {
    for (const n of [-25, -1, 0, 1, 7, 40]) {
      assert.equal(monthsBetween('2026-10', addMonths('2026-10', n)), n);
    }
  });
});

describe('daysInMonth', () => {
  it('conoce meses de 30, 31 y febrero bisiesto', () => {
    assert.equal(daysInMonth('2026-10'), 31);
    assert.equal(daysInMonth('2026-11'), 30);
    assert.equal(daysInMonth('2026-02'), 28);
    assert.equal(daysInMonth('2028-02'), 29);
  });
});

describe('validaciones', () => {
  it('isValidISODate rechaza fechas imposibles', () => {
    assert.equal(isValidISODate('2026-10-19'), true);
    assert.equal(isValidISODate('2028-02-29'), true);
    assert.equal(isValidISODate('2026-02-29'), false);
    assert.equal(isValidISODate('2026-13-01'), false);
    assert.equal(isValidISODate('2026-10-00'), false);
    assert.equal(isValidISODate('19/10/2026'), false);
  });

  it('isValidMonth', () => {
    assert.equal(isValidMonth('2026-10'), true);
    assert.equal(isValidMonth('2026-00'), false);
    assert.equal(isValidMonth('2026-1'), false);
  });
});
