/**
 * TabBar.jsx - Barra de pestañas fija abajo, al alcance del pulgar.
 *
 * El botón central "+" no es una pestaña: abre la captura rápida de gasto
 * desde cualquier pantalla.
 */
import { Icon } from './Icon.jsx';

const TABS = [
  { id: 'summary', label: 'Resumen', icon: 'summary' },
  { id: 'expenses', label: 'Gastos', icon: 'expenses' },
  { id: 'add' },
  { id: 'income', label: 'Ingresos', icon: 'income' },
  { id: 'settings', label: 'Ajustes', icon: 'settings' },
];

/**
 * @param {{ tab: string, onChange: (id: string) => void, onAdd: () => void }} props
 */
export function TabBar({ tab, onChange, onAdd }) {
  return (
    <nav class="tabbar" aria-label="Secciones">
      {TABS.map((item) =>
        item.id === 'add' ? (
          <button key="add" type="button" class="tabbar-add" onClick={onAdd} aria-label="Agregar gasto">
            <Icon name="plus" size={28} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            key={item.id}
            type="button"
            class={`tabbar-item ${tab === item.id ? 'is-active' : ''}`}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        )
      )}
    </nav>
  );
}
