/**
 * Icon.jsx - Iconos de línea en SVG, dibujados a mano (sin librerías).
 *
 * Todos usan una cuadrícula de 24x24 y `currentColor`, así toman el color del
 * texto que los rodea (la pestaña activa se pinta sola con el color primario).
 */

/** Trazos de cada icono (atributo d de <path>). */
const PATHS = {
  summary: 'M4 20V10M10 20V4M16 20v-7M22 20H2',             // barras
  expenses: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', // lista
  plus: 'M12 5v14M5 12h14',
  income: 'M12 3v12M7 10l5 5 5-5M4 21h16',                  // flecha hacia abajo (entra dinero)
  settings: 'M4 6h9M17 6h3M15 4v4M4 12h3M11 12h9M9 10v4M4 18h11M19 18h1M17 16v4', // deslizadores
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  backspace: 'M21 5H9l-6 7 6 7h12zM18 9l-6 6M12 9l6 6',
};

/**
 * @param {{ name: keyof PATHS, size?: number, strokeWidth?: number }} props
 */
export function Icon({ name, size = 24, strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
