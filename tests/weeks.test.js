/**
 * Pruebas de core/weeks.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { weekdayMondayFirst, weeklyTotals } from '../src/core/weeks.js';

describe('weekdayMondayFirst', () => {
  it('lunes = 0, domingo = 6', () => {
    assert.equal(weekdayMondayFirst('2026-11-16'), 0); // lunes
    assert.equal(weekdayMondayFirst('2026-11-13'), 4); // viernes
    assert.equal(weekdayMondayFirst('2026-11-15'), 6); // domingo
  });
});

describe('weeklyTotals', () => {
  // Periodo 2026-11: vie 13 nov - sáb 12 dic.
  const expenses = [
    { date: '2026-11-13', amount: 1000 },
    { date: '2026-11-15', amount: 500 },  // domingo: misma semana que el 13
    { date: '2026-11-16', amount: 2000 }, // lunes: semana nueva
    { date: '2026-11-16', amount: 300 },
    { date: '2026-12-12', amount: 700 },  // último día del periodo
    { date: '2026-12-13', amount: 9999 }, // ya es el periodo siguiente
    { date: '2026-11-12', amount: 9999 }, // periodo anterior
  ];
  const weeks = weeklyTotals(expenses, '2026-11');

  it('semanas lunes a domingo recortadas al periodo', () => {
    assert.deepEqual(
      weeks.map((w) => [w.start, w.end]),
      [
        ['2026-11-13', '2026-11-15'],
        ['2026-11-16', '2026-11-22'],
        ['2026-11-23', '2026-11-29'],
        ['2026-11-30', '2026-12-06'],
        ['2026-12-07', '2026-12-12'],
      ]
    );
  });

  it('suma y cuenta por semana, ignorando fuera del periodo', () => {
    assert.deepEqual(weeks.map((w) => w.total), [1500, 2300, 0, 0, 700]);
    assert.deepEqual(weeks.map((w) => w.count), [2, 2, 0, 0, 1]);
  });

  it('cubre todos los días sin huecos ni duplicados', () => {
    for (const month of ['2026-01', '2026-02', '2026-12', '2028-02']) {
      const ws = weeklyTotals([], month);
      for (let i = 1; i < ws.length; i += 1) {
        assert.equal(weekdayMondayFirst(ws[i].start), 0);
        assert.ok(ws[i].start > ws[i - 1].end);
      }
    }
  });
});
