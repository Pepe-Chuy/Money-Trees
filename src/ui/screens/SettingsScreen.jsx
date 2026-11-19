/**
 * SettingsScreen.jsx - Ajustes: nómina (con historial), límite total,
 * categorías, PIN y diagnóstico.
 */
import { useState } from 'preact/hooks';
import { useAppData } from '../state/AppDataContext.jsx';
import { MoneyField } from '../components/fields.jsx';
import { DiagnosticsCard } from '../components/DiagnosticsCard.jsx';
import { parseMoneyToCents, centsToInputValue, formatCents } from '../../core/money.js';
import { currentMonth, formatMonthLabel, isValidMonth, todayISO } from '../../core/dates.js';
import { salaryForMonth } from '../../core/salary.js';
import { expensesToCsv } from '../../core/csv.js';
import { listAllExpenses } from '../../data/repositories.js';
import { shareOrDownload } from '../exportFile.js';

/** Opciones de re-bloqueo en milisegundos. */
const LOCK_OPTIONS = [
  { value: 0, label: 'Siempre al volver' },
  { value: 60_000, label: 'Después de 1 minuto' },
  { value: 5 * 60_000, label: 'Después de 5 minutos' },
  { value: 15 * 60_000, label: 'Después de 15 minutos' },
];

/**
 * Sección de nómina: sueldo vigente, historial y alta de un cambio.
 */
function SalarySection() {
  const { salaryChanges, actions } = useAppData();
  const [fromMonth, setFromMonth] = useState(currentMonth());
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState(null);

  const current = salaryForMonth(salaryChanges, currentMonth());
  // Historial del más reciente al más antiguo.
  const history = [...salaryChanges].sort((a, b) => b.fromMonth.localeCompare(a.fromMonth));

  async function handleSubmit(event) {
    event.preventDefault();
    const amount = parseMoneyToCents(amountText);
    if (amount === null || amount <= 0) return setError('Escribe un monto mayor a cero.');
    if (!isValidMonth(fromMonth)) return setError('Elige un mes.');
    const replacing = salaryChanges.some((c) => c.fromMonth === fromMonth);
    if (replacing && !confirm(`Ya hay un sueldo desde ${formatMonthLabel(fromMonth)}. ¿Reemplazarlo?`)) return;
    setError(null);
    await actions.saveSalaryChange({ fromMonth, amount });
    setAmountText('');
  }

  async function handleDelete(change) {
    if (!confirm(`¿Eliminar el sueldo de ${formatCents(change.amount)} desde ${formatMonthLabel(change.fromMonth)}?`)) return;
    await actions.deleteSalaryChange(change.fromMonth);
  }

  return (
    <section class="card">
      <h2 class="card-title">Nómina mensual</h2>
      <div class="row-between">
        <span>Vigente este mes</span>
        <strong>{formatCents(current)}</strong>
      </div>

      {history.length > 0 && (
        <ul class="list">
          {history.map((change) => (
            <li key={change.fromMonth} class="list-row list-row--static">
              <span class="list-row-main">
                <span>{formatCents(change.amount)}</span>
                <span class="hint">Desde {formatMonthLabel(change.fromMonth)}</span>
              </span>
              <button type="button" class="link-btn link-btn--danger" onClick={() => handleDelete(change)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form class="form form--compact" onSubmit={handleSubmit}>
        <p class="hint">
          Si tu sueldo cambia, registra el nuevo monto y desde qué mes aplica. Los meses anteriores no cambian.
        </p>
        <label class="field">
          <span class="field-label">Desde el mes</span>
          <input class="input" type="month" value={fromMonth} onInput={(e) => setFromMonth(e.currentTarget.value)} />
        </label>
        <MoneyField label="Sueldo mensual" value={amountText} onInput={setAmountText} error={error} />
        <button type="submit" class="btn btn-secondary">
          Guardar sueldo
        </button>
      </form>
    </section>
  );
}

/**
 * Límite de gasto total del mes (vacío = sin límite).
 */
function TotalLimitSection() {
  const { settings, actions } = useAppData();
  const [text, setText] = useState(settings.monthlyTotalLimit ? centsToInputValue(settings.monthlyTotalLimit) : '');
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    let limit = null;
    if (text.trim() !== '') {
      limit = parseMoneyToCents(text);
      if (limit === null || limit <= 0) return setMessage({ error: 'Escribe un monto mayor a cero, o déjalo vacío.' });
    }
    await actions.updateSettings({ monthlyTotalLimit: limit });
    setMessage({ ok: limit ? 'Límite guardado.' : 'Sin límite total.' });
  }

  return (
    <section class="card">
      <h2 class="card-title">Límite de gasto mensual</h2>
      <form class="form form--compact" onSubmit={handleSubmit}>
        <MoneyField label="Límite total" value={text} onInput={setText} error={message?.error} placeholder="Sin límite" />
        <p class="hint">Aviso al llegar al 80% y alerta al 100%. Cada categoría puede tener su propio límite.</p>
        {message?.ok && <p class="status-text status-text--ok">{message.ok}</p>}
        <button type="submit" class="btn btn-secondary">
          Guardar límite
        </button>
      </form>
    </section>
  );
}

/**
 * PIN: estado, activar/cambiar/quitar y tiempo de re-bloqueo.
 * @param {{ onPin: (mode: 'enable'|'change'|'disable') => void }} props
 */
function SecuritySection({ onPin }) {
  const { settings, actions } = useAppData();
  const enabled = settings.pin !== null;

  return (
    <section class="card">
      <h2 class="card-title">PIN de acceso</h2>
      <p class="hint">
        El PIN impide que alguien con tu teléfono desbloqueado vea tus datos. No cifra la información: es una
        barrera de privacidad, no una caja fuerte. Face ID no está disponible para apps web.
      </p>
      {enabled ? (
        <>
          <label class="field">
            <span class="field-label">Pedir PIN al volver a la app</span>
            <select
              class="input"
              value={settings.lockTimeoutMs}
              onChange={(e) => actions.updateSettings({ lockTimeoutMs: Number(e.currentTarget.value) })}
            >
              {LOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div class="button-row">
            <button type="button" class="btn btn-secondary" onClick={() => onPin('change')}>
              Cambiar PIN
            </button>
            <button type="button" class="btn btn-danger-ghost" onClick={() => onPin('disable')}>
              Quitar PIN
            </button>
          </div>
        </>
      ) : (
        <button type="button" class="btn btn-secondary" onClick={() => onPin('enable')}>
          Activar PIN
        </button>
      )}
    </section>
  );
}

/**
 * Exportar todos los gastos a CSV para analizarlos fuera de la app.
 * Lee directo de la base (no del estado), porque el estado solo tiene el mes visible.
 */
function ExportSection() {
  const { categories } = useAppData();
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      const expenses = await listAllExpenses();
      const csv = expensesToCsv(expenses, categories);
      const result = await shareOrDownload(`money-trees-gastos-${todayISO()}.csv`, csv, 'text/csv');
      if (result !== 'cancelled') setMessage({ ok: `${expenses.length} gastos exportados.` });
    } catch (error) {
      setMessage({ error: `No se pudo exportar: ${error.message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section class="card">
      <h2 class="card-title">Exportar datos</h2>
      <p class="hint">
        Todos tus gastos de todos los meses en un archivo CSV (fecha, mes, categoría, monto, nota). Se abre en
        Excel, Google Sheets o Numbers. En el iPhone usa "Guardar en Archivos" en la hoja de Compartir.
      </p>
      {message?.ok && <p class="status-text status-text--ok">{message.ok}</p>}
      {message?.error && <p class="field-error">{message.error}</p>}
      <button type="button" class="btn btn-secondary" onClick={handleExport} disabled={busy}>
        {busy ? 'Generando...' : 'Exportar gastos (CSV)'}
      </button>
    </section>
  );
}

/**
 * @param {{ onOpenCategories: () => void, onPin: (mode: string) => void }} props
 */
export function SettingsScreen({ onOpenCategories, onPin }) {
  const { categories } = useAppData();
  const activeCount = categories.filter((c) => !c.archived).length;

  return (
    <div class="screen">
      <h1 class="screen-title">Ajustes</h1>
      <SalarySection />
      <TotalLimitSection />
      <section class="card">
        <button type="button" class="list-row" onClick={onOpenCategories}>
          <span class="list-row-main">
            <span>Categorías</span>
            <span class="hint">{activeCount} activas. Nombres, límites y archivo.</span>
          </span>
          <span class="hint">Abrir</span>
        </button>
      </section>
      <SecuritySection onPin={onPin} />
      <ExportSection />
      <DiagnosticsCard />
    </div>
  );
}
