# Proyecto: App de Presupuesto Mensual (PWA)

Documento de especificación para Claude Code. Léelo completo antes de escribir cualquier línea de código.

---

## 0. Reglas de trabajo (OBLIGATORIAS)

El usuario es un programador con experiencia que **quiere aprender** durante el proceso. Por eso:

1. **Sin emojis** en código, comentarios, commits ni mensajes de UI.
2. **Comentar mucho el código.** Cada función lleva un comentario que explique qué hace, por qué existe y qué recibe/devuelve. Las fórmulas financieras llevan además la derivación o la explicación matemática en el comentario.
3. **Explicar antes y después de cada paso.** Antes de crear o modificar un archivo, di qué vas a hacer y por qué. Al terminar, resume qué quedó hecho y qué concepto nuevo se usó.
4. **Preguntar antes de decidir.** Cuando exista más de una forma razonable de hacer algo (stack, librería, estructura de datos, almacenamiento, cómo generar los gastos fijos, etc.), NO elijas en silencio: presenta 2 o 3 alternativas con pros y contras, da tu recomendación y espera la respuesta del usuario antes de codificar esa parte.
5. **Avanzar por fases pequeñas** (ver sección 9). Al terminar cada fase, detente, deja que el usuario la pruebe en su iPhone y espera su visto bueno.
6. Idioma de la UI y de los comentarios: **español**. Nombres de variables y funciones: **inglés** (convención de código), salvo que el usuario pida otra cosa. Confirmar esto con el usuario en la primera sesión.

---

## 1. Resumen del producto

App personal para controlar el presupuesto mensual: ingresos, gastos por categoría, gastos fijos recurrentes, metas de ahorro y un módulo de inversiones con "cajas" (por ejemplo Nu, Caja Turbo, Cajitas congeladas) que calcula rendimientos y permite simular escenarios.

- Un solo usuario, un solo dispositivo principal: **iPhone** (el usuario NO tiene Mac).
- Moneda única: **pesos mexicanos (MXN)**.
- **Sin servidor ni backend.** Todos los datos viven en el dispositivo.
- Se distribuye como **PWA** alojada en **GitHub Pages** (HTTPS gratis) y se instala con "Añadir a pantalla de inicio" desde Safari.
- Por ahora solo **modo claro**. La UI se refinará más adelante, así que usa variables CSS para colores, tipografía y espaciados y así poder cambiar el tema fácilmente (y agregar modo oscuro después).

---

## 2. Stack propuesto (CONFIRMAR con el usuario antes de empezar)

Propuesta inicial, sujeta a discusión según la regla 4:

- **HTML + CSS + JavaScript vanilla (módulos ES)**, sin paso de build. Ventaja: cero tooling, el usuario ve exactamente qué hace cada línea, despliegue directo en GitHub Pages.
- Alternativa a presentar: framework ligero (Preact, Svelte, Vue) con Vite. Más cómodo para UI compleja, pero añade build y dependencias.
- **Gráficas:** Chart.js (o alternativa ligera). Presentar opciones, incluyendo hacerlas con SVG a mano.
- **Almacenamiento:** presentar opciones: `localStorage` (simple, límite ~5 MB, síncrono) vs `IndexedDB` (más robusto, asíncrono, más código). Pedir `navigator.storage.persist()` para reducir riesgo de desalojo de datos.
- **Pruebas:** tests unitarios para toda la lógica financiera (sección 6), por ejemplo con el test runner nativo de Node (`node --test`) o Vitest. La lógica financiera debe estar en módulos puros, sin tocar el DOM, para que sea testeable.

---

## 3. Convenciones técnicas

- **Dinero:** guardar siempre como **enteros en centavos** (ej. $1,234.56 se guarda como `123456`) para evitar errores de punto flotante. Convertir solo al mostrar. Excepción: los cálculos de rendimiento pueden usar flotantes internamente, redondeando al final.
- **Formato:** `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
- **Fechas:** guardar como string ISO `YYYY-MM-DD`. Los meses se identifican con `YYYY-MM`. Cuidado con zonas horarias: usar la fecha local del usuario (America/Mexico_City), no UTC, para decidir en qué mes cae un gasto.
- **IDs:** `crypto.randomUUID()`.
- **Estructura de carpetas sugerida** (confirmar con el usuario):

```
/
  index.html
  manifest.webmanifest
  sw.js                  service worker (cache offline)
  /icons                 iconos 180x180, 192, 512
  /src
    /core                lógica pura (finanzas, fechas, dinero)
    /data                capa de almacenamiento, import/export
    /ui                  pantallas y componentes
    main.js
  /tests
  README.md
```

- **Requisitos PWA para iOS:** `manifest` con `display: standalone`, `apple-touch-icon`, metas `apple-mobile-web-app-capable` y `viewport` con `viewport-fit=cover`, respetar safe areas (`env(safe-area-inset-*)`), service worker con estrategia de cache para funcionar offline. Recordar que iOS no permite Face ID ni notificaciones push fiables en este escenario; no depender de ellos.

---

## 4. Modelo de datos (borrador, ajustar con el usuario)

```
Settings
  baseSalary          centavos, nómina mensual editable
  pinHash, pinSalt    ver sección 7
  monthlyTotalLimit   límite de gasto total mensual (centavos) o null

Category
  id, name, monthlyLimit (centavos o null), archived (bool)

Expense
  id, date, amount, categoryId, note, fixedExpenseId (null si es manual)

FixedExpense                gastos fijos recurrentes
  id, name, amount, categoryId, dayOfMonth,
  startMonth (YYYY-MM), endMonth (YYYY-MM o null = activo)
  pausedMonths? (opcional, a discutir)

ExtraIncome
  id, date, amount, type ('aguinaldo' | 'fondo_ahorro' | 'venta' | 'otro'), note

SavingsBox                  "caja" de inversión
  id, name, annualRate (ej. 0.135), currentBalance (centavos),
  balanceHistory: [{ date, balance }]     registro real a lo largo del tiempo
  archived

Goal                        meta de ahorro
  id, name, targetAmount, targetDate, currentAmount, annualRate,
  monthlyContribution (ver calculadora de metas)

MonthClosing                (a discutir) registro del sobrante de cada mes
  month, leftover, destinationBoxId
```

**Decisión pendiente para preguntar al usuario (regla 4):** cómo representar los gastos fijos. Alternativas:
- (A) **Virtuales:** no se guardan como gastos; al calcular un mes se generan al vuelo desde `FixedExpense` según `startMonth/endMonth`. Pros: editar un fijo se refleja en todo el historial futuro, nada se duplica. Contras: el historial pasado cambia si editas el monto.
- (B) **Materializados:** al abrir un mes nuevo se insertan como `Expense` reales. Pros: el historial queda congelado, el usuario puede ajustar el monto de un mes específico. Contras: más lógica para evitar duplicados y para "meses perdidos" si no abre la app.
- Recomendación inicial: (B) con inserción idempotente al abrir la app, pero que el usuario decida.

---

## 5. Funcionalidades

### 5.1 Ingresos
- La **nómina es mensual** y se cuenta automáticamente cada mes con el monto base editable en ajustes.
- Si el sueldo cambia, el cambio aplica de ese mes en adelante (no reescribe meses pasados). Discutir con el usuario cómo guardar el historial de cambios de nómina.
- **Ingresos extra** (aguinaldo, fondo de ahorro, ventas pequeñas, otros) se registran con fecha, monto, tipo y nota, y suman solo al mes en que ocurren.

### 5.2 Gastos
- Alta rápida: **monto, categoría (dropdown), fecha (hoy por defecto), nota opcional**. Optimizar para la menor cantidad de toques posible (la captura debe tardar segundos).
- Editar y eliminar gastos.
- **Categorías iniciales:** Restaurantes, Uber, Compras en línea, Regalos, Tiendas en plazas, Ropa, Suscripciones.
- **CRUD completo de categorías** desde la app (agregar, renombrar, archivar/eliminar). Al eliminar una categoría con gastos, no perder datos: ofrecer reasignar o archivar.
- No se usa crédito: método de pago fuera de alcance.

### 5.3 Gastos fijos
- Apartado propio para administrarlos (alta, edición, cancelación).
- Aparecen **cada mes automáticamente hasta que el usuario los cancele** (cancelar = fijar `endMonth`; no borrar el historial).
- Ver ejemplo: renta, suscripciones, etc. Se suman al gasto del mes y a su categoría.
- En el resumen mensual, mostrar cuánto del mes ya está comprometido por fijos.

### 5.4 Presupuesto y alertas
- **Límite total mensual** y **límite por categoría** (ambos opcionales).
- Indicador visual de progreso: normal, **aviso al 80%**, **alerta al 100%**.
- Sin notificaciones push: las alertas son visuales dentro de la app.

### 5.5 Fin de mes
- Cada mes **empieza en cero** (no se arrastra saldo de gastos).
- Lo que sobra (ingresos - gastos) **se considera ahorro**. Preguntar al usuario cómo quiere manejarlo: solo mostrarlo como "ahorro del mes", o permitir asignarlo con un toque a una caja de inversión (actualizando su saldo).

### 5.6 Historial
- Navegar entre **meses anteriores** (selector de mes) y ver su resumen, gastos e ingresos.
- **Comparación mes contra mes** (ver gráficas).

### 5.7 Gráficas
- **Pastel/dona** de gastos por categoría del mes.
- **Barras** de gasto contra límite, por categoría.
- **Comparación mes contra mes** (total y por categoría).

### 5.8 Inversiones: cajas

Cada **caja** es un contenedor con nombre, saldo y tasa anual. Ejemplos del usuario: Nu (rendimiento diario), Caja Turbo, Cajitas congeladas (p. ej. una caja a 13.5% con $30,000).

- Crear, editar y archivar cajas libremente.
- **Registro real:** el usuario actualiza a mano el saldo de cada caja; cada actualización se guarda en `balanceHistory` con fecha para poder ver la evolución.
- **Estadísticas por caja:** ganancia estimada **por día, por semana y por mes** con el saldo y la tasa actuales.
- **Estadísticas generales:** suma de todas las cajas (saldo total, ganancia total por día/semana/mes, tasa promedio ponderada).
- Aclarar en la UI que son **estimaciones**: la tasa real de cada producto varía con el tiempo y es un campo que el usuario actualiza.

### 5.9 Calculadora de inversión (what if)

Dos modos, ambos sobre las cajas:

1. **Modo "mi registro + what if":** parte del saldo real de una caja (o del total) y permite añadir una aportación hipotética (único depósito y/o aportación mensual, positiva o negativa) para ver cuánto se tendría a un plazo dado y cuánto más rinde por día/semana/mes. Permitir comparar **escenarios lado a lado** (ej. meter $2,000 vs $3,000 al mes).
2. **Modo "jugar con el tercer dato":** el usuario llena algunos campos y la app despeja el faltante (ver 5.10).

El what if **nunca modifica** el registro real; es solo simulación.

### 5.10 Metas ("quiero llegar a")

Cada meta tiene: **monto objetivo, fecha objetivo (o plazo), monto actual, tasa de interés y aportación mensual**. El usuario llena todos menos uno y la app **despeja el que falta**. Variables despejables:

- Monto objetivo (cuánto tendré al final)
- Plazo / fecha (cuándo llegaré)
- Aportación mensual requerida (cuánto debo meter)
- Monto inicial/actual requerido
- Tasa requerida (necesita método numérico)

Mostrar el resultado con una explicación breve y, si es útil, una gráfica de crecimiento mes a mes. Validar casos imposibles (por ejemplo, meta ya alcanzada, plazo negativo, tasa que no converge) con mensajes claros.

---

## 6. Matemática financiera (documentar en comentarios con derivación)

Convención a confirmar con el usuario: la tasa anual (ej. 13.5%) se trata como **tasa nominal anual con capitalización diaria**, base 365 días, porque estos productos pagan rendimiento cada noche. Tasa diaria `i = annualRate / 365`.

- **Valor futuro con aportaciones mensuales.** Con capitalización diaria, la tasa efectiva mensual es `m = (1 + annualRate/365)^(365/12) - 1`. Entonces, tras `n` meses con aportación mensual `P` al final de cada mes y saldo inicial `PV`:

  `FV = PV * (1 + m)^n + P * ((1 + m)^n - 1) / m`   (si `m = 0`, `FV = PV + P*n`)

- **Despejes:**
  - `P = (FV - PV*(1+m)^n) * m / ((1+m)^n - 1)`
  - `PV = (FV - P*((1+m)^n - 1)/m) / (1+m)^n`
  - `n = ln((FV*m + P) / (PV*m + P)) / ln(1+m)`  (validar argumentos del logaritmo)
  - Tasa: no tiene forma cerrada con aportaciones; resolver con **bisección** o Newton-Raphson, con tolerancia y máximo de iteraciones.
- **Ganancia estimada** con saldo `S` y tasa anual `r`: diaria `S * r/365`; semanal `diaria * 7`; mensual `diaria * 365/12` (aprox., sin recapitalizar dentro del periodo; documentar la aproximación). Preguntar al usuario si prefiere que las estadísticas incluyan la capitalización diaria dentro del periodo.
- Escribir **tests unitarios** con casos conocidos (por ejemplo, calcular FV y verificar que al despejar de vuelta se recupera el dato original: prueba de ida y vuelta).

---

## 7. Seguridad: PIN

- PIN al abrir la app (4 a 6 dígitos, configurable). Re-bloqueo al volver de segundo plano tras un tiempo configurable.
- Guardar **nunca el PIN en claro**: derivar un hash con **WebCrypto** (PBKDF2 con sal aleatoria y suficientes iteraciones, o SHA-256 con sal como mínimo) y guardar `pinHash` y `pinSalt`.
- Explicar al usuario con honestidad las limitaciones: el PIN es una **barrera de privacidad casual**, no cifrado fuerte. Los datos en `localStorage/IndexedDB` siguen sin cifrar a menos que se implemente cifrado con una llave derivada del PIN (presentar como mejora opcional con sus pros y contras, incluida la pérdida irrecuperable de datos si olvida el PIN).
- Opción de reiniciar el PIN restaurando desde respaldo o borrando datos.
- Face ID **no disponible** en PWA: no prometerlo.

---

## 8. Respaldo: exportar e importar

- **Exportar** todos los datos a un archivo **JSON** (con campo `schemaVersion` y fecha de exportación). Opcional: exportar gastos a **CSV** para abrir en Excel.
- **Importar** desde JSON con **validación** del esquema y confirmación antes de sobrescribir (ofrecer "reemplazar" o "combinar", presentar la alternativa al usuario).
- En iOS, guardar archivos desde una PWA puede requerir la hoja de compartir (`navigator.share` con archivo) o una descarga por Safari; probar ambas y explicar al usuario.
- Recordatorio dentro de la app si hace más de N días que no se exporta un respaldo (esto cubre el riesgo de que iOS borre datos o el usuario cambie de teléfono).
- Diseñar el almacenamiento con **migraciones por `schemaVersion`** desde el inicio.

---

## 9. Fases de desarrollo

Detenerse al final de cada fase para que el usuario pruebe en su iPhone.

**Fase 0: Cimientos y despliegue**
- Confirmar stack y estructura (regla 4).
- Esqueleto PWA instalable (manifest, iconos, service worker, metas iOS).
- Publicar en GitHub Pages con una pantalla "hola mundo" y verificar que se instala en el iPhone. Guiar al usuario paso a paso (repositorio, Pages, HTTPS).
- Capa de almacenamiento y modelo de datos base.

**Fase 1: Núcleo del presupuesto**
- Ajustes: nómina base, PIN.
- Categorías (CRUD) con las iniciales.
- Registrar, editar y borrar gastos (captura rápida con dropdown).
- Ingresos extra.
- Resumen del mes con totales y sobrante; selector de mes (historial).
- Límites total y por categoría con alertas al 80% y 100%.

**Fase 2: Gastos fijos y respaldos**
- Apartado de gastos fijos (alta, edición, cancelación) integrados a cada mes.
- Exportar/importar JSON (y CSV opcional), recordatorio de respaldo.

**Fase 3: Gráficas**
- Dona por categoría, barras contra límite, comparación mes contra mes.

**Fase 4: Inversiones**
- Cajas con saldo, tasa e historial.
- Estadísticas por caja y generales (día, semana, mes).
- Calculadora what if (dos modos, escenarios comparables).
- Metas con despeje del dato faltante.
- Manejo del sobrante mensual hacia una caja (si el usuario lo decide).

**Fase 5: Pulido**
- UI/UX (el usuario revisará el diseño después), modo oscuro, accesibilidad, rendimiento, pruebas en distintos tamaños de iPhone.

---

## 10. Preguntas abiertas para hacer al usuario en la primera sesión

1. Stack: vanilla JS vs framework ligero; librería de gráficas.
2. Almacenamiento: `localStorage` vs `IndexedDB`.
3. Gastos fijos: virtuales vs materializados (sección 4).
4. Qué hacer con el sobrante de cada mes (solo mostrar, o asignar a una caja).
5. Convención de tasa y estadísticas de rendimiento (nominal diaria vs otra) y base de días.
6. Idioma de nombres de variables (inglés recomendado).
7. Cifrado de datos con el PIN: sí o no.
8. Nombre de la app e icono provisional.

---

## 11. Criterios de calidad

- Funciona **100% offline** después de la primera carga.
- Captura de un gasto en menos de 10 segundos.
- Ningún cálculo financiero sin prueba unitaria.
- Sin dependencias innecesarias; cada dependencia se justifica al usuario.
- Código legible y comentado según la sección 0.
- README del proyecto con: cómo correrlo en local, cómo desplegar a GitHub Pages, cómo exportar y restaurar respaldos.
