/**
 * Pruebas de src/core/dates.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toISODate, monthOf, addMonths, monthsBetween, daysInMonth, isValidISODate, isValidMonth,
  monthDateRange, formatPeriodRange,
} from '../src/core/dates.js';

describe('toISODate', () => {
  it('usa la fecha LOCAL, no UTC', () => {
    // new Date(año, mes0, día, hora) se interpreta en hora local.
    // 31 de octubre a las 23:30 local debe seguir siendo 31 de octubre,
    // aunque en UTC ya sea 1 de noviembre (si la zona es UTC-x).
    assert.equal(toISODate(new Date(2026, 9, 31, 23, 30)), '2026-10-31');
    assert.equal(toISODate(new Date(2026, 0, 5)), '2026-01-05');
  });
});

describe('monthOf (periodos del 13 al 12)', () => {
  it('desde el día 13 es el periodo de ese mes', () => {
    assert.equal(monthOf('2026-10-13'), '2026-10');
    assert.equal(monthOf('2026-10-31'), '2026-10');
  });

  it('antes del 13 es el periodo del mes anterior', () => {
    assert.equal(monthOf('2026-11-12'), '2026-10');
    assert.equal(monthOf('2026-11-01'), '2026-10');
  });

  it('cruza el año', () => {
    assert.equal(monthOf('2027-01-05'), '2026-12');
    assert.equal(monthOf('2027-01-13'), '2027-01');
  });
});

describe('monthDateRange y formatPeriodRange', () => {
  it('va del 13 al 12 del mes siguiente, incluso cruzando año y febrero', () => {
    assert.deepEqual(monthDateRange('2026-11'), ['2026-11-13', '2026-12-12']);
    assert.deepEqual(monthDateRange('2026-12'), ['2026-12-13', '2027-01-12']);
    assert.deepEqual(monthDateRange('2027-01'), ['2027-01-13', '2027-02-12']);
  });

  it('los extremos del rango caen en ese mismo periodo', () => {
    for (const month of ['2026-01', '2026-02', '2026-12']) {
      const [first, last] = monthDateRange(month);
      assert.equal(monthOf(first), month);
      assert.equal(monthOf(last), month);
    }
  });

  it('texto legible', () => {
    assert.equal(formatPeriodRange('2026-11'), '13 nov – 12 dic');
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
