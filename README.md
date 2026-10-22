# Money Trees

Presupuesto mensual personal como PWA: ingresos, gastos por categoria, gastos fijos,
metas de ahorro e inversiones. Sin servidor: todos los datos viven en el telefono.

La especificacion completa esta en [PRESUPUESTO_PWA.md](PRESUPUESTO_PWA.md).

## Stack

- [Preact](https://preactjs.com/) (UI) + [Vite](https://vite.dev/) (servidor de desarrollo y build).
- IndexedDB con un wrapper propio (`src/data/db.js`) y migraciones por version (`src/data/schema.js`).
- Service worker propio (`sw.js`); `scripts/vite-plugin-sw.js` le inyecta la lista de archivos en el build.
- Pruebas con el runner nativo de Node (`node --test`).
- Despliegue con GitHub Actions a GitHub Pages.

## Estructura

```
index.html               pagina unica (metas de iOS, manifest)
sw.js                    plantilla del service worker
public/                  se copia tal cual al build
  manifest.webmanifest
  icons/                 icon.svg (fuente) y PNG generados
src/
  core/                  logica pura: dinero, fechas, finanzas (se prueba con node --test)
  data/                  IndexedDB, migraciones, almacenamiento persistente
  ui/                    componentes de Preact y estilos (theme.css = variables de diseno)
  main.jsx               punto de entrada
tests/                   pruebas unitarias
scripts/                 icono -> PNG, plugin del service worker
.github/workflows/       despliegue a GitHub Pages
```

## Correr en local

Requisito: Node.js 24 LTS.

```bash
npm install        # una sola vez (y cuando cambien las dependencias)
npm run dev        # servidor de desarrollo con recarga en caliente: http://localhost:5173
npm test           # pruebas unitarias
npm run build      # compila a dist/
npm run preview    # sirve dist/ en http://localhost:4173 (aqui si corre el service worker)
npm run icons      # regenera los PNG despues de editar public/icons/icon.svg
```

Para verlo en el iPhone sin publicar: con `npm run dev` corriendo, abre en Safari la
direccion "Network" que imprime Vite (ej. `http://192.168.1.50:5173`), con el telefono
en la misma red Wi-Fi. Sin HTTPS no funciona el modo offline, pero sirve para ver la UI.

## Publicar en GitHub Pages

Primera vez:

1. Crea un repositorio en GitHub (puede ser privado solo con GitHub Pro; si es gratuito, debe ser publico).
2. Sube el proyecto. **No subas `node_modules/` ni `dist/`** (el `.gitignore` ya los excluye si usas git):
   ```bash
   git init
   git add .
   git commit -m "Fase 0: esqueleto PWA"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```
3. En GitHub: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
4. Ve a la pestana **Actions**: el workflow "Deploy to GitHub Pages" corre pruebas, compila y
   publica. Si fallo porque Pages aun no estaba activado, usa "Re-run jobs".
5. La app queda en `https://TU-USUARIO.github.io/TU-REPO/`.

Despues: cada `git push` a `main` vuelve a publicar automaticamente.

## Instalar en el iPhone

1. Abre la URL de GitHub Pages en **Safari**.
2. Boton **Compartir > Anadir a pantalla de inicio**.
3. Abre la app desde el icono. La pantalla de verificacion debe mostrar todo en OK
   (el punto "Funciona sin conexion" puede requerir cerrar y abrir la app una vez).

Importante: Safari y la app instalada tienen **almacenamientos separados**. Los datos que
captures en la app instalada no aparecen en Safari y viceversa. Usa siempre la app instalada.

## Respaldos

Exportar e importar respaldos en JSON llega en la fase 2.
