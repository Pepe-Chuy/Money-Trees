/**
 * Pruebas de src/core/money.js con el runner nativo de Node.
 * Correr con: npm test
 *
 * node:test aporta describe/it; node:assert/strict las comparaciones
 * (strict = usa === y compara objetos en profundidad sin conversiones).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoneyToCents, formatCents, centsToInputValue } from '../src/core/money.js';

describe('parseMoneyToCents', () => {
  it('lee enteros y decimales', () => {
    assert.equal(parseMoneyToCents('1234'), 123400);
    assert.equal(parseMoneyToCents('1234.5'), 123450);
    assert.equal(parseMoneyToCents('1234.56'), 123456);
    assert.equal(parseMoneyToCents('.5'), 50);
    assert.equal(parseMoneyToCents('0'), 0);
  });

  it('ignora signo de pesos, comas y espacios', () => {
    assert.equal(parseMoneyToCents('$1,234.56'), 123456);
    assert.equal(parseMoneyToCents('  30,000 '), 3000000);
  });

  it('no sufre errores de punto flotante (1.005 * 100 = 100.4999...)', () => {
    assert.equal(parseMoneyToCents('1.01'), 101);
    assert.equal(parseMoneyToCents('0.29'), 29); // 0.29 * 100 = 28.999999999999996
  });

  it('acepta negativos y normaliza -0', () => {
    assert.equal(parseMoneyToCents('-50'), -5000);
    assert.equal(parseMoneyToCents('-0'), 0);
  });

  it('rechaza textos invalidos', () => {
    for (const bad of ['', '   ', '.', 'abc', '12a', '1.234', '1.2.3', '--5', null, undefined, 12]) {
      assert.equal(parseMoneyToCents(bad), null, `deberia rechazar ${JSON.stringify(bad)}`);
    }
  });
});

describe('formatCents', () => {
  it('formatea en pesos mexicanos', () => {
    assert.equal(formatCents(123456), '$1,234.56');
    assert.equal(formatCents(0), '$0.00');
    assert.equal(formatCents(5), '$0.05');
  });
});

describe('centsToInputValue', () => {
  it('produce texto editable', () => {
    assert.equal(centsToInputValue(123456), '1234.56');
    assert.equal(centsToInputValue(5), '0.05');
    assert.equal(centsToInputValue(-5000), '-50.00');
  });

  it('ida y vuelta: parse(toInput(x)) === x', () => {
    for (const cents of [0, 1, 99, 100, 123456, -7, 3000000, 987654321]) {
      assert.equal(parseMoneyToCents(centsToInputValue(cents)), cents);
    }
  });
});
