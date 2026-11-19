/**
 * Sheet.jsx - Hoja modal que sube desde abajo (como las de iOS).
 * Se usa para todos los formularios: capturar gasto, editar categoría, PIN...
 *
 * Tocar el fondo oscuro o "Cerrar" la cierra. role="dialog" y aria-modal
 * le indican a VoiceOver que es una ventana encima del resto.
 */

/**
 * @param {{ title: string, onClose: () => void, children: any }} props
 */
export function Sheet({ title, onClose, children }) {
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      {/* stopPropagation: un toque DENTRO de la hoja no debe llegar al fondo y cerrarla. */}
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header class="sheet-header">
          <h2>{title}</h2>
          <button type="button" class="link-btn" onClick={onClose}>
            Cerrar
          </button>
        </header>
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}
