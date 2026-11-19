/**
 * csv.js - Exportación de gastos a CSV (para analizar en Excel, Sheets o pandas).
 *
 * Formato (RFC 4180):
 * - Campos separados por coma, filas por CRLF ("\r\n"), que es lo que Excel espera.
 * - Un campo va entre comillas si contiene coma, comillas o salto de línea;
 *   las comillas internas se duplican: Dijo "hola" -> "Dijo ""hola""".
 * - Se antepone un BOM (U+FEFF) para que Excel en Windows detecte UTF-8 y
 *   muestre bien acentos y ñ. Sheets y pandas lo ignoran sin problema.
 */
import { monthOf } from './dates.js';

/** Encabezados de las columnas del archivo de gastos. */
export const EXPENSE_CSV_HEADERS = ['fecha', 'mes', 'categoria', 'monto', 'nota', 'origen', 'id'];

/**
 * Protege y escapa un campo de texto.
 *
 * Inyección de fórmulas: Excel interpreta como fórmula una celda que empieza
 * con = + - @ (o tabulador / retorno). Una nota como "=HYPERLINK(...)" podría
 * ejecutarse al abrir el archivo. Se antepone un apóstrofo, que Excel muestra
 * como texto literal. Solo se aplica a campos de TEXTO; los montos se escriben
 * como números y no pasan por aquí.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeTextField(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Centavos -> número decimal con punto y sin separadores: 123456 -> "1234.56".
 * Se arma con enteros (sin dividir entre 100) para no introducir flotantes.
 * @param {number} cents
 * @returns {string}
 */
export function centsToDecimalString(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Genera el CSV completo de gastos, ordenado por fecha (y por hora de captura
 * dentro del mismo día).
 *
 * @param {{ id: string, date: string, amount: number, categoryId: string,
 *           note?: string, fixedExpenseId?: string|null, createdAt?: string }[]} expenses
 * @param {{ id: string, name: string }[]} categories  incluidas las archivadas
 * @returns {string} contenido del archivo, con BOM
 */
export function expensesToCsv(expenses, categories) {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const sorted = [...expenses].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
  );
  const lines = [EXPENSE_CSV_HEADERS.join(',')];
  for (const e of sorted) {
    lines.push(
      [
        e.date,
        monthOf(e.date),
        escapeTextField(names.get(e.categoryId) ?? 'Sin categoría'),
        centsToDecimalString(e.amount),
        escapeTextField(e.note ?? ''),
        e.fixedExpenseId ? 'fijo' : 'manual',
        e.id,
      ].join(',')
    );
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}
