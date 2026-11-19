/**
 * CategoriesScreen.jsx - Lista de categorías para administrarlas.
 * Tocar una abre su formulario (renombrar, límite, archivar, eliminar).
 */
import { useAppData } from '../state/AppDataContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { sortForManagement } from '../../core/categories.js';
import { formatCents } from '../../core/money.js';

/**
 * @param {{ onBack: () => void, onEdit: (category: object|null) => void }} props
 *        onEdit(null) abre el formulario para crear una nueva.
 */
export function CategoriesScreen({ onBack, onEdit }) {
  const { categories } = useAppData();
  const sorted = sortForManagement(categories);

  return (
    <div class="screen">
      <button type="button" class="back-btn" onClick={onBack}>
        <Icon name="chevronLeft" size={20} /> Ajustes
      </button>
      <h1 class="screen-title">Categorías</h1>

      <ul class="list card">
        {sorted.map((category) => (
          <li key={category.id}>
            <button type="button" class="list-row" onClick={() => onEdit(category)}>
              <span class="list-row-main">
                <span class={category.archived ? 'is-muted' : ''}>{category.name}</span>
                {category.archived && <span class="hint">Archivada</span>}
              </span>
              <span class="hint">{category.monthlyLimit ? formatCents(category.monthlyLimit) : 'Sin límite'}</span>
            </button>
          </li>
        ))}
      </ul>

      <button type="button" class="btn btn-primary" onClick={() => onEdit(null)}>
        Agregar categoría
      </button>
    </div>
  );
}
