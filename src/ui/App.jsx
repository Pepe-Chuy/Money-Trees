/**
 * App.jsx - Componente raíz: proveedor de datos, bloqueo con PIN, pestañas
 * y la hoja modal donde se abren todos los formularios.
 *
 * Navegación: no usamos URLs ni un "router". La pestaña activa es un estado
 * (useState). En una PWA instalada no hay barra de direcciones, así que las
 * URLs no aportan nada y un estado es más simple.
 */
import { useRef, useState } from 'preact/hooks';
import { AppDataProvider, useAppData } from './state/AppDataContext.jsx';
import { useAutoLock } from './hooks/useAutoLock.js';
import { TabBar } from './components/TabBar.jsx';
import { Sheet } from './components/Sheet.jsx';
import { SummaryScreen } from './screens/SummaryScreen.jsx';
import { ExpensesScreen } from './screens/ExpensesScreen.jsx';
import { IncomeScreen } from './screens/IncomeScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { CategoriesScreen } from './screens/CategoriesScreen.jsx';
import { LockScreen } from './screens/LockScreen.jsx';
import { ExpenseForm } from './forms/ExpenseForm.jsx';
import { IncomeForm } from './forms/IncomeForm.jsx';
import { CategoryForm } from './forms/CategoryForm.jsx';
import { PinSetup } from './forms/PinSetup.jsx';

/** Títulos de la hoja modal según lo que se abra. */
const PIN_TITLES = { enable: 'Activar PIN', change: 'Cambiar PIN', disable: 'Quitar PIN' };

export function App() {
  return (
    <AppDataProvider>
      <AppShell />
    </AppDataProvider>
  );
}

/**
 * Estructura visible de la app. Va separada de App porque necesita leer el
 * contexto, y el contexto solo existe DENTRO de <AppDataProvider>.
 */
function AppShell() {
  const { ready, error, settings } = useAppData();
  const { decided, locked, unlock } = useAutoLock(settings);
  const [tab, setTab] = useState('summary');
  const [settingsView, setSettingsView] = useState('main'); // 'main' | 'categories'
  // Hoja abierta: null o { kind: 'expense'|'income'|'category'|'pin', item }.
  const [sheet, setSheet] = useState(null);

  /**
   * Truco para iOS: Safari solo abre el teclado si focus() ocurre dentro del
   * mismo toque del usuario. El formulario se monta DESPUÉS del toque, así que
   * su focus() no abriría el teclado. Solución: en el toque enfocamos este
   * input invisible (ya existe en la página); el teclado se abre, y cuando el
   * formulario enfoca el campo de monto, el foco pasa de un input a otro y
   * el teclado sigue abierto. Ahorra un toque en cada captura.
   */
  const keyboardPrimer = useRef(null);

  if (error) {
    return (
      <div class="splash">
        <p>No se pudieron abrir los datos: {String(error.message ?? error)}</p>
      </div>
    );
  }
  if (!ready || !decided) {
    return (
      <div class="splash">
        <img src="./icons/icon-180.png" alt="" width="72" height="72" />
      </div>
    );
  }
  if (locked) return <LockScreen onUnlock={unlock} />;

  const closeSheet = () => setSheet(null);

  function openQuickAdd() {
    keyboardPrimer.current?.focus();
    setSheet({ kind: 'expense', item: null });
  }

  /** Cambia de pestaña y regresa al inicio de la pantalla. */
  function changeTab(id) {
    setTab(id);
    if (id === 'settings') setSettingsView('main');
    window.scrollTo(0, 0);
  }

  const goToSettings = () => changeTab('settings');

  let screen;
  if (tab === 'summary') {
    screen = <SummaryScreen onGoToSettings={goToSettings} />;
  } else if (tab === 'expenses') {
    screen = <ExpensesScreen onEdit={(item) => setSheet({ kind: 'expense', item })} />;
  } else if (tab === 'income') {
    screen = (
      <IncomeScreen
        onAdd={() => setSheet({ kind: 'income', item: null })}
        onEdit={(item) => setSheet({ kind: 'income', item })}
        onGoToSettings={goToSettings}
      />
    );
  } else if (settingsView === 'categories') {
    screen = (
      <CategoriesScreen onBack={() => setSettingsView('main')} onEdit={(item) => setSheet({ kind: 'category', item })} />
    );
  } else {
    screen = (
      <SettingsScreen
        onOpenCategories={() => setSettingsView('categories')}
        onPin={(mode) => setSheet({ kind: 'pin', item: mode })}
      />
    );
  }

  let sheetContent = null;
  if (sheet?.kind === 'expense') {
    sheetContent = (
      <Sheet title={sheet.item ? 'Editar gasto' : 'Nuevo gasto'} onClose={closeSheet}>
        <ExpenseForm expense={sheet.item} onDone={closeSheet} />
      </Sheet>
    );
  } else if (sheet?.kind === 'income') {
    sheetContent = (
      <Sheet title={sheet.item ? 'Editar ingreso' : 'Nuevo ingreso extra'} onClose={closeSheet}>
        <IncomeForm income={sheet.item} onDone={closeSheet} />
      </Sheet>
    );
  } else if (sheet?.kind === 'category') {
    sheetContent = (
      <Sheet title={sheet.item ? 'Editar categoría' : 'Nueva categoría'} onClose={closeSheet}>
        <CategoryForm category={sheet.item} onDone={closeSheet} />
      </Sheet>
    );
  } else if (sheet?.kind === 'pin') {
    sheetContent = (
      <Sheet title={PIN_TITLES[sheet.item]} onClose={closeSheet}>
        <PinSetup mode={sheet.item} onDone={closeSheet} />
      </Sheet>
    );
  }

  return (
    <>
      <main class="app-main">{screen}</main>
      <TabBar tab={tab} onChange={changeTab} onAdd={openQuickAdd} />
      <input ref={keyboardPrimer} class="keyboard-primer" type="text" inputMode="decimal" tabIndex={-1} aria-hidden="true" />
      {sheetContent}
    </>
  );
}
