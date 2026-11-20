/**
 * Pruebas de src/core/money.js con el runner nativo de Node.
 * Correr con: npm test
 *
 * node:test aporta describe/it; node:assert/strict las comparaciones
 * (strict = usa === y compara objetos en profundidad sin conversiones).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMoneyToCents, formatCents, centsToInputValue, formatMoneyInput,
  countSignificantBefore, positionAfterSignificant,
} from '../src/core/money.js';

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
    assert.equal(centsToInputValue(123456), '1,234.56');
    assert.equal(centsToInputValue(100000000), '1,000,000.00');
    assert.equal(centsToInputValue(5), '0.05');
    assert.equal(centsToInputValue(-5000), '-50.00');
  });

  it('ida y vuelta: parse(toInput(x)) === x', () => {
    for (const cents of [0, 1, 99, 100, 123456, -7, 3000000, 987654321]) {
      assert.equal(parseMoneyToCents(centsToInputValue(cents)), cents);
    }
  });
});

describe('formatMoneyInput', () => {
  it('agrega comas de miles mientras se escribe', () => {
    assert.equal(formatMoneyInput('1000000'), '1,000,000');
    assert.equal(formatMoneyInput('1000'), '1,000');
    assert.equal(formatMoneyInput('999'), '999');
    assert.equal(formatMoneyInput('1234.5'), '1,234.5');
    assert.equal(formatMoneyInput(''), '');
  });

  it('reacomoda comas viejas al insertar o borrar', () => {
    assert.equal(formatMoneyInput('1,0000'), '10,000');
    assert.equal(formatMoneyInput('1,00'), '100');
  });

  it('respeta el punto pendiente y limita a 2 decimales', () => {
    assert.equal(formatMoneyInput('12.'), '12.');
    assert.equal(formatMoneyInput('.5'), '.5');
    assert.equal(formatMoneyInput('1.999'), '1.99');
    assert.equal(formatMoneyInput('1.2.3'), '1.23');
  });

  it('descarta letras, signos y ceros a la izquierda', () => {
    assert.equal(formatMoneyInput('$1a2b3'), '123');
    assert.equal(formatMoneyInput('007'), '7');
    assert.equal(formatMoneyInput('0'), '0');
    assert.equal(formatMoneyInput('0.5'), '0.5');
  });

  it('lo formateado se lee igual con parseMoneyToCents', () => {
    assert.equal(parseMoneyToCents(formatMoneyInput('1234567.89')), 123456789);
  });
});

describe('posición del cursor', () => {
  it('cuenta y recoloca por dígitos, ignorando comas', () => {
    // "12,354": el usuario escribió el 5 tras "1,23"; el cursor iba después del 5.
    const raw = '1,2354'; // texto antes de reformatear, cursor en la posición 5
    const count = countSignificantBefore(raw, 5); // "1234"... -> 4 dígitos antes
    assert.equal(count, 4);
    // En "12,354" el 4.º dígito (el 5) termina en la posición 5.
    assert.equal(positionAfterSignificant('12,354', count), 5);
    assert.equal(positionAfterSignificant('1,000', 0), 0);
    assert.equal(positionAfterSignificant('1,000', 9), 5);
  });
});
