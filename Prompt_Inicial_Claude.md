# Prompt Inicial — Cafecito

> Este documento es el prompt (reconstruido) que describe cómo generar el proyecto **Cafecito** completo con IA, tal como existe hoy. Junto con [README.md](README.md), es la documentación de referencia del proyecto. **Debe mantenerse actualizado con cada cambio relevante** (nuevas dependencias, endpoints, modelos, decisiones de arquitectura, etc.).

---

## Prompt

Quiero que generes un proyecto fullstack llamado **Cafecito** (una app para gestionar productos de una cafetería: bebidas, postres, snacks). Sigue estas especificaciones exactamente:

### 1. Arquitectura general

- **Monorepo** gestionado con **npm workspaces**, con dos paquetes: `backend` y `frontend`.
- Node.js >= 20.
- Todo en **JavaScript puro, sin TypeScript**.
- El `package.json` raíz solo orquesta scripts (`dev`, `build`, `start`) usando `concurrently` para correr backend y frontend en paralelo; no tiene código propio.

```
Cafecito/
├── backend/     # API Express + Mongoose + MongoDB Atlas (CommonJS)
├── frontend/    # SPA React + Vite (ESM)
├── package.json # raíz del monorepo (workspaces)
└── README.md
```

### 2. Backend (`backend/`)

**Stack:** Express 4, Mongoose 8, MongoDB Atlas, `cors`, `helmet`, `morgan`, `dotenv`. Dev con `nodemon`.

**Módulo:** CommonJS (`"type": "commonjs"` en `package.json`).

**Estructura:**
```
backend/
├── .env.example
├── package.json
└── src/
    ├── index.js              # entry point: carga .env, conecta a DB, levanta Express
    ├── app.js                # createApp(): configura middlewares, rutas, 404 y error handler
    ├── config/
    │   └── db.js             # connectDB() / disconnectDB() con Mongoose
    ├── middleware/
    │   └── asyncHandler.js   # envuelve handlers async para propagar errores a Express
    ├── models/
    │   ├── Product.js        # esquema Mongoose de producto
    │   ├── Customer.js       # esquema Mongoose de cliente
    │   └── Order.js          # esquema Mongoose de compra (ligada a cliente)
    └── routes/
        ├── health.routes.js   # GET /api/health
        ├── product.routes.js  # CRUD de productos
        ├── customer.routes.js # CRUD de clientes + historial de compras
        └── order.routes.js    # registrar/listar compras
```

**`src/index.js`:**
- Carga variables de entorno con `require("dotenv/config")`.
- Llama a `connectDB()` **antes** de levantar el servidor (si falla la conexión, el proceso debe terminar con `process.exit(1)` — fail fast, nunca levantar el servidor sin base de datos).
- Puerto desde `process.env.PORT`, default `5000`.

**`src/app.js` — `createApp()`:**
- Orden de middlewares: `helmet()` → `cors({ origin: process.env.CORS_ORIGIN })` → `express.json()` → `morgan("dev"` en desarrollo, `"combined"` en producción`)`.
- Rutas montadas en `/api` (health) y `/api/products` (CRUD).
- Handler 404 genérico al final de las rutas: `{ message: "Ruta no encontrada" }`.
- Middleware de errores centralizado (4 argumentos, `err` primero) que loggea el error y responde `500 { message: "Error interno del servidor" }`.

**`src/config/db.js`:**
- `connectDB()` lee `MONGODB_URI`; si no existe, lanza un `Error` explicativo (apunta a `.env.example`) en vez de dejar que Mongoose falle silenciosamente.
- Loggea eventos de conexión (`connected`, `error`, `disconnected`) por consola con prefijo `[mongo]`.
- `disconnectDB()` para cierres limpios (tests, scripts).

**`src/middleware/asyncHandler.js`:**
- Helper `asyncHandler(fn)` que envuelve un route handler async y hace `.catch(next)` sobre la promesa, porque Express 4 no captura rechazos de promesas automáticamente.

**`src/models/Product.js`** — esquema Mongoose `Product`:
| Campo         | Tipo    | Reglas                                                        |
|---------------|---------|----------------------------------------------------------------|
| `name`        | String  | requerido, trim                                                |
| `description` | String  | default `""`                                                   |
| `price`       | Number  | requerido, mínimo `0`                                          |
| `category`    | String  | enum `["bebida", "postre", "snack", "otro"]`, default `"bebida"`|
| `available`   | Boolean | default `true`                                                 |

Con `timestamps: true` (agrega `createdAt`/`updatedAt`).

**`src/models/Customer.js`** — esquema Mongoose `Customer`:
| Campo   | Tipo   | Reglas                                           |
|---------|--------|---------------------------------------------------|
| `name`  | String | requerido, trim                                   |
| `email` | String | requerido, trim, lowercase, **único**             |
| `phone` | String | requerido, trim                                   |

**`src/models/Order.js`** — esquema Mongoose `Order` (una compra/venta):
| Campo      | Tipo                        | Reglas                                   |
|------------|-----------------------------|-------------------------------------------|
| `customer` | ObjectId (ref `Customer`)   | requerido                                 |
| `items`    | `[{ product, name, price, qty }]` | al menos 1 ítem; `product` ref a `Product`, `name`/`price` se copian al momento de la venta (no cambian si el producto se edita después) |
| `total`    | Number                      | requerido, mínimo `0`, calculado en el servidor |

**Rutas:**
- `GET /api/health` → `{ status: "ok", db: <estado de conexión mongoose>, timestamp }`.
- `GET /api/products` → lista todos, ordenados por `createdAt` descendente.
- `GET /api/products/:id` → detalle; `404` si no existe.
- `POST /api/products` → crea; `201` con el documento creado.
- `PUT /api/products/:id` → actualiza con `runValidators: true`; `404` si no existe.
- `DELETE /api/products/:id` → elimina; `204` sin contenido; `404` si no existe.
- `GET /api/customers?search=texto` → lista clientes; `search` filtra por nombre/correo/teléfono (regex case-insensitive, escapado).
- `GET /api/customers/:id` → detalle; `404` si no existe.
- `GET /api/customers/:id/orders` → historial de compras del cliente, más reciente primero.
- `POST /api/customers` → registra cliente; `201`; `409` si el correo ya existe (índice único + `err.code === 11000`).
- `PUT /api/customers/:id` → actualiza; mismas reglas de `409` por correo duplicado.
- `DELETE /api/customers/:id` → elimina; `204`; `404` si no existe.
- `GET /api/orders` → lista compras con el cliente poblado (`name`, `email`).
- `GET /api/orders/:id` → detalle de una compra.
- `POST /api/orders` → registra una venta: recibe `{ customerId, items: [{ productId, qty }] }`; el servidor busca los productos, **recalcula precio y total del lado del servidor** (nunca confía en precios del cliente), y guarda copia de `name`/`price` en cada ítem. `400` si falta algún producto/cantidad inválida, `404` si el cliente no existe.

Todas las rutas async usan `asyncHandler`. Mensajes de error en español.

**Variables de entorno (`backend/.env.example`):**
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/cafecito?retryWrites=true&w=majority&appName=Cafecito
CORS_ORIGIN=http://localhost:5173
```

### 3. Frontend (`frontend/`)

**Stack:** React 18, Vite 6, `@vitejs/plugin-react`. Módulo ESM.

**Estructura:**
```
frontend/
├── .env.example
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx               # entry point: createRoot + StrictMode
    ├── App.jsx                # raíz: header + switch de vista (pos | clientes)
    ├── api.js                 # API_URL + apiFetch() helper (fetch + manejo de errores)
    ├── utils.js                # normalize(): quita acentos/mayúsculas para búsquedas
    ├── productIcon.js          # getProductIcon(): ícono por palabras clave del nombre o por categoría
    ├── index.css
    ├── components/
    │   └── CustomerForm.jsx   # formulario reutilizable: registra un cliente (POST /api/customers)
    └── pages/
        ├── Pos.jsx            # página de punto de venta
        └── Customers.jsx      # página de clientes + historial de compras
```

- `vite.config.js`: plugin de React, servidor en puerto `5173`.
- `api.js`: centraliza `API_URL` (default `http://localhost:5000/api`) y `apiFetch(path, options)`, que lanza `Error` con el `message` del backend si la respuesta no es `ok`.
- `App.jsx`: header con el nombre de la app y una navegación simple (dos botones, estado local `view`) entre **Punto de venta** y **Clientes**. Sin librería de ruteo — es solo un `useState`.
- `pages/Pos.jsx` — página de punto de venta, minimalista:
  - Lista productos (`GET /products`) como tarjetas clicables, cada una con un ícono representativo (`getProductIcon`, por palabra clave del nombre o por categoría como respaldo) y el nombre y precio. Click agrega a la "Cuenta" (carrito en memoria, `useState`).
  - Un campo de búsqueda filtra las tarjetas por nombre en el cliente (sin golpear la API), ignorando acentos y mayúsculas (`normalize`).
  - Cada tarjeta muestra un badge con la cantidad seleccionada de ese producto cuando ya está en el carrito, y el encabezado "Cuenta" muestra el conteo total de artículos junto al listado y el total.
  - El carrito permite subir/bajar cantidad (`+`/`−`); al llegar a 0 el ítem se quita. Muestra subtotal por línea y total general (`Intl.NumberFormat` en `es-MX`).
  - **Selector de cliente** integrado en el panel de cuenta: campo de búsqueda (debounce de 300ms) contra `GET /customers?search=`, lista de coincidencias clicables, y botón "+ Registrar cliente nuevo" que despliega `<CustomerForm>` inline.
  - Botón **Cobrar** solo se habilita con carrito no vacío **y** cliente seleccionado; hace `POST /orders` con `{ customerId, items }` y, si tiene éxito, vacía carrito y cliente y muestra un mensaje de confirmación.
  - Maneja estados `loading`/`ready`/`error` para productos, y mensajes de error específicos del checkout (ej. cliente no encontrado).
- `pages/Customers.jsx` — página de clientes:
  - Lista todos los clientes (`GET /customers`) con una barra de búsqueda (filtro en cliente sobre la lista ya cargada) y botón "+ Nuevo cliente" (abre `<CustomerForm>`).
  - Al hacer click en un cliente, carga su historial (`GET /customers/:id/orders`) en un panel lateral: fecha, resumen de ítems y total de cada compra.
- `components/CustomerForm.jsx`: formulario controlado (nombre, correo, teléfono) que hace `POST /customers`; muestra el mensaje de error del backend (ej. correo duplicado → 409) y llama a `onCreated(customer)` al terminar, para que la página que lo use decida qué hacer con el cliente recién creado (seleccionarlo, refrescar la lista, etc.).
- Estilos en `index.css`: paleta neutra (beige/blanco) con un acento café (`--accent: #6b4226`), layout en dos columnas (`pos-main`: contenido + panel lateral) reutilizado tanto en POS como en Clientes, colapsa a una sola columna en móvil (`max-width: 720px`). Sin librerías de UI ni CSS frameworks.
- `index.html`: título `Cafecito`, `lang="es"`.
- **Variables de entorno (`frontend/.env.example`):**
  ```
  VITE_API_URL=http://localhost:5000/api
  ```

### 4. Convenciones generales

- Comentarios y mensajes de usuario/API en **español**.
- Sin TypeScript, sin frameworks de testing todavía.
- `.env` reales nunca se commitean (están en `.gitignore`); siempre se documenta el `.env.example` correspondiente.
- Backend "fail fast": si falta configuración crítica (ej. `MONGODB_URI`), el proceso debe morir con un mensaje claro en vez de arrancar en un estado inválido.
- Scripts raíz (`package.json`):
  - `npm run dev` — backend + frontend en paralelo (`concurrently`).
  - `npm run dev:backend` / `npm run dev:frontend` — por separado.
  - `npm run build` — build de producción del frontend (Vite); el backend no requiere build.
  - `npm start` — levanta el backend en modo producción (`node src/index.js`).

### 5. Notas de despliegue / infraestructura

- Base de datos: MongoDB Atlas (cluster `cafecito`, cuenta `luisferandradesan_db_user`).
- Hay que whitelistear la IP del entorno donde corre el backend en **Atlas → Network Access**.
- CORS del backend debe apuntar al origen real del frontend desplegado (`CORS_ORIGIN`).
- La base de datos trae un catálogo de ejemplo (13 productos entre bebida/postre/snack/otro, ej. "Café americano", "Frappé de vainilla", "Sándwich de jamón y queso") cargado vía `POST /api/products` para poder probar la UI con datos reales.

---

## Historial de cambios relevantes

- **2026-10-14** — Diagnóstico y resolución de fallos de arranque del backend: variable `MONGODB_URI` ausente al ejecutar fuera del workspace, IP no whitelisteada en Atlas, y fallo transitorio de DNS resolviendo el hostname del cluster. Sin cambios de código; el backend funciona como está documentado arriba.
- **2026-10-14** — Creación de este documento (`Prompt_Inicial_Claude.md`) como documentación complementaria al README.
- **2026-10-15** — Catálogo de ejemplo ampliado a 13 productos variados (bebidas, postres, snacks y otros). En el POS: buscador de productos por nombre (`productQuery` + `normalize`), ícono representativo por producto (`productIcon.js`, por palabra clave o categoría), badge de cantidad seleccionada en cada tarjeta, y contador de artículos junto al total en la "Cuenta".
- **2026-10-15** — `App.jsx` pasó de ser una demo de health-check a la página base del punto de venta (grid de productos + carrito en memoria + total + botón "Cobrar"). Se agregó estilo minimalista en `index.css` (paleta café/beige, layout responsive de 2 columnas). No se agregó modelo de órdenes en el backend; el carrito es solo de cliente.
- **2026-10-15** — Se trabaja de ahora en adelante en la rama `develop` (no directamente en `main`).
- **2026-10-15** — Sistema de clientes y registro de compras: modelos `Customer` y `Order`, rutas `customer.routes.js` y `order.routes.js` (CRUD de clientes, búsqueda, historial de compras, registro de ventas con cálculo de total en el servidor). El frontend se reorganizó en `pages/` (`Pos.jsx`, `Customers.jsx`) y `components/CustomerForm.jsx`, con `App.jsx` como switch de vista; se agregó `api.js` como helper centralizado de fetch. El POS ahora requiere seleccionar o registrar un cliente antes de poder cobrar.
