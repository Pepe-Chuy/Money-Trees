/**
 * CategoryForm.jsx - Crear, renombrar, poner límite, archivar o eliminar una categoría.
 *
 * Eliminar nunca pierde datos:
 * - Sin gastos: se elimina directo (tras confirmar).
 * - Con gastos: se ofrece reasignarlos a otra categoría y luego eliminar,
 *   o archivarla (deja de aparecer al capturar, pero su historial se conserva).
 */
import { useState } from 'preact/hooks';
import { useAppData } from '../state/AppDataContext.jsx';
import { MoneyField, TextField } from '../components/fields.jsx';
import { normalizeCategoryName, validateCategoryName, sortForManagement } from '../../core/categories.js';
import { parseMoneyToCents, centsToInputValue } from '../../core/money.js';
import { countExpensesInCategory } from '../../data/repositories.js';
import { newId } from '../../core/ids.js';

/**
 * @param {{ category?: object|null, onDone: () => void }} props
 */
export function CategoryForm({ category = null, onDone }) {
  const { categories, actions } = useAppData();
  const isNew = category === null;

  const [name, setName] = useState(category?.name ?? '');
  const [limitText, setLimitText] = useState(category?.monthlyLimit ? centsToInputValue(category.monthlyLimit) : '');
  const [errors, setErrors] = useState({});
  // Panel de eliminación: null (oculto) o { count } con los gastos que tiene.
  const [deleting, setDeleting] = useState(null);
  const [reassignTo, setReassignTo] = useState('');

  /** Guarda nombre y límite (vacío = sin límite). */
  async function handleSubmit(event) {
    event.preventDefault();
    const cleanName = normalizeCategoryName(name);
    const nextErrors = {};
    const nameError = validateCategoryName(cleanName, categories, category?.id ?? null);
    if (nameError) nextErrors.name = nameError;

    let monthlyLimit = null;
    if (limitText.trim() !== '') {
      monthlyLimit = parseMoneyToCents(limitText);
      if (monthlyLimit === null || monthlyLimit <= 0) nextErrors.limit = 'Escribe un monto mayor a cero, o déjalo vacío.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // sortOrder de una nueva: después de la última existente.
    const nextOrder = Math.max(-1, ...categories.map((c) => c.sortOrder ?? 0)) + 1;
    await actions.saveCategory(
      isNew
        ? { id: newId(), name: cleanName, monthlyLimit, archived: false, sortOrder: nextOrder, usageCount: 0 }
        : { ...category, name: cleanName, monthlyLimit }
    );
    onDone();
  }

  /** Archivar o reactivar. Al reactivar se valida que el nombre no choque. */
  async function toggleArchived() {
    if (category.archived) {
      const nameError = validateCategoryName(category.name, categories, category.id);
      if (nameError) {
        setErrors({ name: `${nameError} Renómbrala antes de reactivarla.` });
        return;
      }
    }
    await actions.saveCategory({ ...category, archived: !category.archived });
    onDone();
  }

  /** Primer paso de eliminar: contar sus gastos. */
  async function startDelete() {
    const count = await countExpensesInCategory(category.id);
    if (count === 0) {
      if (confirm(`¿Eliminar la categoría "${category.name}"?`)) {
        await actions.deleteCategory(category.id, null);
        onDone();
      }
      return;
    }
    setDeleting({ count });
  }

  async function confirmReassignAndDelete() {
    if (!reassignTo) return;
    await actions.deleteCategory(category.id, reassignTo);
    onDone();
  }

  const otherCategories = sortForManagement(categories).filter((c) => c.id !== category?.id);

  return (
    <form class="form" onSubmit={handleSubmit}>
      <TextField label="Nombre" value={name} onInput={setName} error={errors.name} maxLength={40} />
      <MoneyField
        label="Límite mensual (opcional)"
        value={limitText}
        onInput={setLimitText}
        error={errors.limit}
        placeholder="Sin límite"
      />
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          Guardar
        </button>
      </div>

      {!isNew && (
        <div class="form-section">
          <button type="button" class="btn btn-secondary" onClick={toggleArchived}>
            {category.archived ? 'Reactivar categoría' : 'Archivar categoría'}
          </button>
          <p class="hint">
            Archivar la oculta al capturar gastos, pero conserva su historial.
          </p>

          {deleting === null ? (
            <button type="button" class="btn btn-danger-ghost" onClick={startDelete}>
              Eliminar categoría
            </button>
          ) : (
            <div class="danger-panel">
              <p>
                Esta categoría tiene <strong>{deleting.count}</strong> {deleting.count === 1 ? 'gasto' : 'gastos'}.
                Para eliminarla, muévelos a otra categoría:
              </p>
              <select class="input" value={reassignTo} onChange={(e) => setReassignTo(e.currentTarget.value)}>
                <option value="">Elige una categoría...</option>
                {otherCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.archived ? ' (archivada)' : ''}
                  </option>
                ))}
              </select>
              <button type="button" class="btn btn-danger" disabled={!reassignTo} onClick={confirmReassignAndDelete}>
                Mover gastos y eliminar
              </button>
              <button type="button" class="link-btn" onClick={() => setDeleting(null)}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
