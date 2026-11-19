/**
 * AppDataContext.jsx - Estado compartido de la app (patrón Provider + hook).
 *
 * Problema: varias pantallas necesitan los mismos datos (categorías, gastos
 * del mes, ajustes). Pasarlos de componente en componente por props sería
 * tedioso ("prop drilling").
 *
 * Solución de Preact/React: Context.
 * - createContext() crea un "canal".
 * - <AppDataProvider> envuelve la app y publica un valor en ese canal.
 * - Cualquier componente descendiente lo lee con useAppData().
 *
 * Estrategia de datos: después de cada escritura se vuelve a leer lo afectado
 * desde IndexedDB. Con los volúmenes de una app personal (cientos de gastos al
 * mes como mucho) es instantáneo, y evita que el estado en memoria y la base
 * se desincronicen.
 */
import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as repo from '../../data/repositories.js';
import { recordAppOpen } from '../../data/diagnostics.js';
import { requestPersistentStorage } from '../../data/storage.js';
import { currentMonth, monthOf } from '../../core/dates.js';
import { summarizeMonth } from '../../core/budget.js';

const AppDataContext = createContext(null);

/**
 * Proveedor de datos. Debe envolver a todos los componentes que usen useAppData().
 * @param {{ children: any }} props
 */
export function AppDataProvider({ children }) {
  const [month, setMonth] = useState(currentMonth);
  // Datos que no dependen del mes.
  const [base, setBase] = useState(null); // { settings, categories, salaryChanges }
  // Datos del mes seleccionado.
  const [monthData, setMonthData] = useState(null); // { month, expenses, extraIncomes }
  const [error, setError] = useState(null);

  // useRef guarda un valor que sobrevive entre renders sin provocar uno nuevo.
  // Aquí recuerda el último mes pedido, para descartar respuestas viejas: si
  // cambias rápido de octubre a noviembre, la lectura de octubre podría
  // terminar DESPUÉS y pintar datos del mes equivocado.
  const requestedMonth = useRef(month);

  /** Recarga ajustes, categorías e historial de nómina. */
  const reloadBase = useCallback(async () => {
    const [settings, categories, salaryChanges] = await Promise.all([
      repo.getSettings(),
      repo.listCategories(),
      repo.listSalaryChanges(),
    ]);
    setBase({ settings, categories, salaryChanges });
  }, []);

  /** Recarga gastos e ingresos extra de un mes. */
  const reloadMonth = useCallback(async (targetMonth) => {
    requestedMonth.current = targetMonth;
    const [expenses, extraIncomes] = await Promise.all([
      repo.listExpensesForMonth(targetMonth),
      repo.listExtraIncomesForMonth(targetMonth),
    ]);
    if (requestedMonth.current === targetMonth) {
      setMonthData({ month: targetMonth, expenses, extraIncomes });
    }
  }, []);

  /** Recarga todo lo visible (tras cualquier escritura). */
  const refresh = useCallback(
    () => Promise.all([reloadBase(), reloadMonth(requestedMonth.current)]),
    [reloadBase, reloadMonth]
  );

  // Al iniciar: cargar datos y tareas de mantenimiento que no bloquean la UI.
  useEffect(() => {
    reloadBase().catch(setError);
    requestPersistentStorage().catch(() => {});
    recordAppOpen().catch(() => {});
  }, [reloadBase]);

  // Cada vez que cambia el mes seleccionado, cargar sus datos.
  useEffect(() => {
    reloadMonth(month).catch(setError);
  }, [month, reloadMonth]);

  /**
   * Acciones de escritura. Cada una guarda en la base y luego refresca.
   * useMemo evita crear un objeto nuevo en cada render (lo que haría que todos
   * los componentes que lo usan se redibujaran sin necesidad).
   */
  const actions = useMemo(
    () => ({
      /** Crea o actualiza un gasto y muestra el mes donde quedó. */
      async saveExpense(expense, isNew) {
        await (isNew ? repo.createExpense(expense) : repo.updateExpense(expense));
        setMonth(monthOf(expense.date));
        await refresh();
      },
      async deleteExpense(id) {
        await repo.deleteExpense(id);
        await refresh();
      },
      async saveExtraIncome(income) {
        await repo.saveExtraIncome(income);
        setMonth(monthOf(income.date));
        await refresh();
      },
      async deleteExtraIncome(id) {
        await repo.deleteExtraIncome(id);
        await refresh();
      },
      async saveCategory(category) {
        await repo.saveCategory(category);
        await refresh();
      },
      async deleteCategory(id, reassignTo) {
        await repo.deleteCategory(id, reassignTo);
        await refresh();
      },
      async saveSalaryChange(change) {
        await repo.saveSalaryChange(change);
        await refresh();
      },
      async deleteSalaryChange(fromMonth) {
        await repo.deleteSalaryChange(fromMonth);
        await refresh();
      },
      async updateSettings(changes) {
        await repo.updateSettings(changes);
        await refresh();
      },
    }),
    [refresh]
  );

  // `ready` indica que terminó la PRIMERA carga. Al cambiar de mes no vuelve a
  // false: se siguen mostrando los datos anteriores unos milisegundos hasta que
  // llegan los nuevos, en vez de desmontar las pantallas (parpadeo).
  const ready = base !== null && monthData !== null;

  // El resumen se recalcula solo cuando cambian sus entradas. Usa el mes de
  // los datos cargados (monthData.month), no el seleccionado, para ser coherente.
  const summary = useMemo(() => {
    if (!ready) return null;
    return summarizeMonth({
      month: monthData.month,
      salaryChanges: base.salaryChanges,
      expenses: monthData.expenses,
      extraIncomes: monthData.extraIncomes,
      categories: base.categories,
      monthlyTotalLimit: base.settings.monthlyTotalLimit,
    });
  }, [ready, base, monthData]);

  const value = {
    ready,
    error,
    month,
    setMonth,
    settings: base?.settings ?? null,
    categories: base?.categories ?? [],
    salaryChanges: base?.salaryChanges ?? [],
    expenses: ready ? monthData.expenses : [],
    extraIncomes: ready ? monthData.extraIncomes : [],
    summary,
    actions,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

/**
 * Hook para leer los datos compartidos desde cualquier componente.
 * @returns {object} el valor publicado por AppDataProvider
 */
export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData() debe usarse dentro de <AppDataProvider>.');
  return value;
}
