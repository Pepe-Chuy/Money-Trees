/**
 * ProgressBar.jsx - Barra de gasto contra límite con su color de estado:
 * ok (verde), warning (ámbar, desde 80%) y danger (rojo, desde 100%).
 * El estado ya viene calculado por core/budget.js; aquí solo se dibuja.
 */

/**
 * @param {{ percent: number, status: 'ok'|'warning'|'danger' }} props
 */
export function ProgressBar({ percent, status }) {
  // El ancho visual se limita a 100% aunque el gasto lo supere.
  const width = Math.min(percent, 100);
  return (
    <div class="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div class={`progress-fill progress-fill--${status}`} style={{ width: `${width}%` }} />
    </div>
  );
}
