/**
 * Pruebas de nómina (salary.js) y resumen del mes (budget.js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { salaryForMonth } from '../src/core/salary.js';
import { limitStatus, summarizeMonth, sumAmounts } from '../src/core/budget.js';

describe('salaryForMonth', () => {
  const changes = [
    { fromMonth: '2026-09', amount: 2_800_000 },
    { fromMonth: '2026-01', amount: 2_500_000 }, // desordenado a propósito
  ];

  it('usa el último cambio vigente', () => {
    assert.equal(salaryForMonth(changes, '2026-03'), 2_500_000);
    assert.equal(salaryForMonth(changes, '2026-08'), 2_500_000);
    assert.equal(salaryForMonth(changes, '2026-09'), 2_800_000);
    assert.equal(salaryForMonth(changes, '2027-05'), 2_800_000);
  });

  it('devuelve 0 antes del primer cambio o sin historial', () => {
    assert.equal(salaryForMonth(changes, '2025-12'), 0);
    assert.equal(salaryForMonth([], '2026-10'), 0);
  });
});

describe('limitStatus', () => {
  const limit = 100_000; // $1,000.00

  it('sin límite', () => {
    assert.deepEqual(limitStatus(50_000, null), { status: 'none', percent: null });
    assert.deepEqual(limitStatus(50_000, 0), { status: 'none', percent: null });
  });

  it('cambia de estado exactamente en 80% y 100%', () => {
    assert.equal(limitStatus(79_999, limit).status, 'ok');
    assert.equal(limitStatus(80_000, limit).status, 'warning');
    assert.equal(limitStatus(99_999, limit).status, 'warning');
    assert.equal(limitStatus(100_000, limit).status, 'danger');
    assert.equal(limitStatus(150_000, limit).status, 'danger');
  });

  it('porcentaje entero truncado, puede pasar de 100', () => {
    assert.equal(limitStatus(79_999, limit).percent, 79);
    assert.equal(limitStatus(150_000, limit).percent, 150);
  });
});

describe('summarizeMonth', () => {
  const categories = [
    { id: 'rest', name: 'Restaurantes', monthlyLimit: 300_000, archived: false },
    { id: 'uber', name: 'Uber', monthlyLimit: null, archived: false },
    { id: 'ropa', name: 'Ropa', monthlyLimit: 100_000, archived: false },
    { id: 'vieja', name: 'Vieja', monthlyLimit: 50_000, archived: true },
  ];
  const input = {
    month: '2026-10',
    salaryChanges: [{ fromMonth: '2026-01', amount: 2_500_000 }],
    expenses: [
      { date: '2026-10-01', amount: 120_000, categoryId: 'rest' },
      { date: '2026-10-15', amount: 130_000, categoryId: 'rest' },
      { date: '2026-10-20', amount: 45_050, categoryId: 'uber' },
      { date: '2026-09-30', amount: 999_999, categoryId: 'rest' }, // otro mes: se ignora
    ],
    extraIncomes: [{ date: '2026-10-10', amount: 300_000 }],
    categories,
    monthlyTotalLimit: 400_000,
  };
  const summary = summarizeMonth(input);

  it('totales e ingreso', () => {
    assert.equal(summary.salary, 2_500_000);
    assert.equal(summary.extraIncome, 300_000);
    assert.equal(summary.totalIncome, 2_800_000);
    assert.equal(summary.totalExpenses, 295_050);
    assert.equal(summary.leftover, 2_800_000 - 295_050);
  });

  it('límite total', () => {
    // 295,050 / 400,000 = 73.76% -> por debajo del 80%: ok, porcentaje truncado a 73.
    assert.deepEqual(summary.total, { status: 'ok', percent: 73, limit: 400_000 });
    // Con límite de $3,500: 295,050 / 350,000 = 84% -> aviso.
    assert.equal(summarizeMonth({ ...input, monthlyTotalLimit: 350_000 }).total.status, 'warning');
  });

  it('categorías: con gasto o con límite activo, ordenadas por gasto', () => {
    const ids = summary.byCategory.map((row) => row.category.id);
    // Ropa aparece (tiene límite) aunque no tenga gasto; Vieja no (archivada sin gasto).
    assert.deepEqual(ids, ['rest', 'uber', 'ropa']);
    assert.equal(summary.byCategory[0].spent, 250_000);
    assert.equal(summary.byCategory[0].status, 'warning'); // 250k de 300k = 83%
    assert.equal(summary.byCategory[1].status, 'none');
    assert.equal(summary.byCategory[2].spent, 0);
  });

  it('sobrante negativo cuando se gasta más de lo que entra', () => {
    const deficit = summarizeMonth({ ...input, salaryChanges: [], extraIncomes: [] });
    assert.equal(deficit.leftover, -295_050);
  });

  it('sumAmounts de lista vacía es 0', () => {
    assert.equal(sumAmounts([]), 0);
  });
});
