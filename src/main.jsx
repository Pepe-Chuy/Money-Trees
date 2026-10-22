/**
 * main.jsx - Punto de entrada de la app.
 *
 * Vite empieza aqui (ver <script type="module" src="/src/main.jsx"> en index.html):
 * carga los estilos globales, monta el componente raiz <App /> dentro de
 * <div id="app"> y registra el service worker.
 */
import { render } from 'preact';
import { App } from './ui/App.jsx';
import { registerServiceWorker } from './registerServiceWorker.js';
import './ui/styles/theme.css';
import './ui/styles/base.css';

render(<App />, document.getElementById('app'));
registerServiceWorker();
