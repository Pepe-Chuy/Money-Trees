/**
 * Pruebas de core/csv.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeTextField, centsToDecimalString, expensesToCsv } from '../src/core/csv.js';

describe('escapeTextField', () => {
  it('deja intacto el texto simple', () => {
    assert.equal(escapeTextField('Compras en línea'), 'Compras en línea');
    assert.equal(escapeTextField(''), '');
  });

  it('entrecomilla comas, comillas y saltos de línea', () => {
    assert.equal(escapeTextField('tacos, refresco'), '"tacos, refresco"');
    assert.equal(escapeTextField('dijo "hola"'), '"dijo ""hola"""');
    assert.equal(escapeTextField('linea1\nlinea2'), '"linea1\nlinea2"');
  });

  it('neutraliza fórmulas de Excel', () => {
    assert.equal(escapeTextField('=1+1'), "'=1+1");
    assert.equal(escapeTextField('+52 55'), "'+52 55");
    assert.equal(escapeTextField('-descuento'), "'-descuento");
    assert.equal(escapeTextField('@user'), "'@user");
    assert.equal(escapeTextField('=SUMA(A1,B1)'), `"'=SUMA(A1,B1)"`);
  });
});

describe('centsToDecimalString', () => {
  it('convierte sin flotantes ni separadores', () => {
    assert.equal(centsToDecimalString(123456), '1234.56');
    assert.equal(centsToDecimalString(5), '0.05');
    assert.equal(centsToDecimalString(0), '0.00');
    assert.equal(centsToDecimalString(-1050), '-10.50');
    assert.equal(centsToDecimalString(29), '0.29');
  });
});

describe('expensesToCsv', () => {
  const categories = [
    { id: 'c1', name: 'Restaurantes' },
    { id: 'c2', name: 'Café, té' },
  ];
  const expenses = [
    { id: 'e2', date: '2026-11-03', amount: 4550, categoryId: 'c2', note: '', createdAt: '2026-11-03T10:00:00Z' },
    { id: 'e1', date: '2026-10-31', amount: 123456, categoryId: 'c1', note: 'cena "cumple"', fixedExpenseId: null },
    { id: 'e3', date: '2026-11-03', amount: 100, categoryId: 'borrada', note: 'x', createdAt: '2026-11-03T09:00:00Z', fixedExpenseId: 'f1' },
  ];
  const csv = expensesToCsv(expenses, categories);

  it('empieza con BOM y usa CRLF', () => {
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.ok(csv.endsWith('\r\n'));
  });

  it('filas ordenadas por fecha y hora de captura, con columnas correctas', () => {
    const lines = csv.slice(1).trimEnd().split('\r\n');
    assert.deepEqual(lines, [
      'fecha,mes,categoria,monto,nota,origen,id',
      '2026-10-31,2026-10,Restaurantes,1234.56,"cena ""cumple""",manual,e1',
      '2026-11-03,2026-11,Sin categoría,1.00,x,fijo,e3',
      '2026-11-03,2026-11,"Café, té",45.50,,manual,e2',
    ]);
  });

  it('sin gastos produce solo el encabezado', () => {
    assert.equal(expensesToCsv([], categories), '﻿fecha,mes,categoria,monto,nota,origen,id\r\n');
  });
});
