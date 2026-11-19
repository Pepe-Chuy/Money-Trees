/**
 * main.jsx - Punto de entrada de la app.
 *
 * Vite empieza aquí (ver <script type="module" src="/src/main.jsx"> en index.html):
 * carga los estilos globales, monta el componente raiz <App /> dentro de
 * <div id="app"> y registra el service worker.
 */
import { render } from 'preact';
import { App } from './ui/App.jsx';
import { registerServiceWorker } from './registerServiceWorker.js';
import './ui/styles/theme.css';
import './ui/styles/base.css';
import './ui/styles/components.css';

render(<App />, document.getElementById('app'));
registerServiceWorker();
