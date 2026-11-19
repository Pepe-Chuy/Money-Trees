/**
 * ExpenseForm.jsx - Captura y edición de un gasto.
 *
 * Diseñado para tardar segundos: el monto recibe el foco al abrir (teclado
 * numérico listo), la categoría es un toque (las más usadas primero), la
 * fecha ya es hoy y la nota es opcional. Total típico: monto + 1 toque + Guardar.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { useAppData } from '../state/AppDataContext.jsx';
import { MoneyField, TextField, ChipGroup, DateField } from '../components/fields.jsx';
import { parseMoneyToCents, centsToInputValue } from '../../core/money.js';
import { todayISO, isValidISODate } from '../../core/dates.js';
import { sortForQuickPick } from '../../core/categories.js';
import { newId } from '../../core/ids.js';

/**
 * @param {{ expense?: object|null, onDone: () => void }} props
 *        expense: si viene, se edita; si no, se crea uno nuevo.
 */
export function ExpenseForm({ expense = null, onDone }) {
  const { categories, actions } = useAppData();
  const isNew = expense === null;

  // Estado del formulario: textos tal como se escriben (el monto se convierte al guardar).
  const [amountText, setAmountText] = useState(isNew ? '' : centsToInputValue(expense.amount));
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? null);
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [note, setNote] = useState(expense?.note ?? '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Foco automático en el monto al abrir (ver la nota sobre iOS en App.jsx).
  const amountRef = useRef(null);
  useEffect(() => {
    if (isNew) amountRef.current?.focus();
  }, [isNew]);

  // Botones de categoría. Al editar un gasto de una categoría archivada, se
  // agrega al final para que el gasto no se quede sin categoría seleccionada.
  const quickPick = sortForQuickPick(categories);
  const current = categories.find((c) => c.id === categoryId);
  if (current?.archived) quickPick.push(current);
  const options = quickPick.map((c) => ({ value: c.id, label: c.name }));

  /** Valida y guarda. */
  async function handleSubmit(event) {
    event.preventDefault(); // evita que el navegador recargue la página al enviar el form
    const amount = parseMoneyToCents(amountText);
    const nextErrors = {};
    if (amount === null || amount <= 0) nextErrors.amount = 'Escribe un monto mayor a cero.';
    if (!categoryId) nextErrors.category = 'Elige una categoría.';
    if (!isValidISODate(date)) nextErrors.date = 'Fecha inválida.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const data = { ...expense, id: expense?.id ?? newId(), amount, categoryId, date, note: note.trim() };
      await actions.saveExpense(data, isNew);
      onDone();
    } catch (error) {
      setErrors({ form: `No se pudo guardar: ${error.message}` });
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este gasto?')) return;
    await actions.deleteExpense(expense.id);
    onDone();
  }

  return (
    <form class="form" onSubmit={handleSubmit}>
      <MoneyField label="Monto" value={amountText} onInput={setAmountText} error={errors.amount} inputRef={amountRef} large />
      {options.length === 0 ? (
        <p class="field-error">No hay categorías activas. Crea una en Ajustes.</p>
      ) : (
        <ChipGroup label="Categoría" options={options} value={categoryId} onChange={setCategoryId} error={errors.category} />
      )}
      <DateField value={date} onChange={setDate} />
      <TextField label="Nota (opcional)" value={note} onInput={setNote} placeholder="Ej. comida con amigos" />
      {errors.form && <p class="field-error">{errors.form}</p>}
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {!isNew && (
          <button type="button" class="btn btn-danger-ghost" onClick={handleDelete}>
            Eliminar gasto
          </button>
        )}
      </div>
    </form>
  );
}
