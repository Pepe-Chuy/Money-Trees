/**
 * IncomeForm.jsx - Captura y edición de un ingreso extra (aguinaldo, fondo de
 * ahorro, venta u otro). Suma solo al mes de su fecha.
 */
import { useState } from 'preact/hooks';
import { useAppData } from '../state/AppDataContext.jsx';
import { MoneyField, TextField, ChipGroup, DateField } from '../components/fields.jsx';
import { EXTRA_INCOME_TYPES } from '../../data/repositories.js';
import { parseMoneyToCents, centsToInputValue } from '../../core/money.js';
import { todayISO, isValidISODate } from '../../core/dates.js';
import { newId } from '../../core/ids.js';

const TYPE_OPTIONS = Object.entries(EXTRA_INCOME_TYPES).map(([value, label]) => ({ value, label }));

/**
 * @param {{ income?: object|null, onDone: () => void }} props
 */
export function IncomeForm({ income = null, onDone }) {
  const { actions } = useAppData();
  const isNew = income === null;

  const [amountText, setAmountText] = useState(isNew ? '' : centsToInputValue(income.amount));
  const [type, setType] = useState(income?.type ?? 'otro');
  const [date, setDate] = useState(income?.date ?? todayISO());
  const [note, setNote] = useState(income?.note ?? '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const amount = parseMoneyToCents(amountText);
    const nextErrors = {};
    if (amount === null || amount <= 0) nextErrors.amount = 'Escribe un monto mayor a cero.';
    if (!isValidISODate(date)) nextErrors.date = 'Fecha inválida.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await actions.saveExtraIncome({ ...income, id: income?.id ?? newId(), amount, type, date, note: note.trim() });
      onDone();
    } catch (error) {
      setErrors({ form: `No se pudo guardar: ${error.message}` });
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este ingreso?')) return;
    await actions.deleteExtraIncome(income.id);
    onDone();
  }

  return (
    <form class="form" onSubmit={handleSubmit}>
      <MoneyField label="Monto" value={amountText} onInput={setAmountText} error={errors.amount} large />
      <ChipGroup label="Tipo" options={TYPE_OPTIONS} value={type} onChange={setType} />
      <DateField value={date} onChange={setDate} />
      <TextField label="Nota (opcional)" value={note} onInput={setNote} />
      {errors.form && <p class="field-error">{errors.form}</p>}
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {!isNew && (
          <button type="button" class="btn btn-danger-ghost" onClick={handleDelete}>
            Eliminar ingreso
          </button>
        )}
      </div>
    </form>
  );
}
