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
    │   └── Product.js        # esquema Mongoose de producto
    └── routes/
        ├── health.routes.js  # GET /api/health
        └── product.routes.js # CRUD de productos
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

**Rutas:**
- `GET /api/health` → `{ status: "ok", db: <estado de conexión mongoose>, timestamp }`.
- `GET /api/products` → lista todos, ordenados por `createdAt` descendente.
- `GET /api/products/:id` → detalle; `404` si no existe.
- `POST /api/products` → crea; `201` con el documento creado.
- `PUT /api/products/:id` → actualiza con `runValidators: true`; `404` si no existe.
- `DELETE /api/products/:id` → elimina; `204` sin contenido; `404` si no existe.

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
    ├── main.jsx     # entry point: createRoot + StrictMode
    ├── App.jsx      # componente raíz
    └── index.css
```

- `vite.config.js`: plugin de React, servidor en puerto `5173`.
- `App.jsx` — **página de punto de venta (POS)**, minimalista y sin funcionalidades extra:
  - Al montar, hace `fetch` a `${VITE_API_URL}/products` (con `VITE_API_URL` default `http://localhost:5000/api`) y lista los productos disponibles como tarjetas clicables (grid).
  - Click en una tarjeta agrega el producto a la "Cuenta" (carrito en memoria, estado local con `useState`, sin persistencia ni backend de órdenes).
  - El carrito permite subir/bajar cantidad (`+`/`−`); al llegar a 0 el ítem se quita. Muestra subtotal por línea y total general (formateado con `Intl.NumberFormat` en `es-MX`).
  - Botón **Cobrar** vacía el carrito (no hay integración de pago ni endpoint de órdenes todavía — es un punto de partida intencionalmente simple).
  - Maneja 3 estados: `loading`, `ready` (con mensaje si no hay productos) y `error` (si la API no responde).
  - Estilos en `index.css`: paleta neutra (beige/blanco) con un acento café (`--accent: #6b4226`), layout en dos columnas (productos + cuenta) que colapsa a una sola columna en móvil (`max-width: 720px`). Sin librerías de UI ni CSS frameworks.
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

---

## Historial de cambios relevantes

- **2026-10-14** — Diagnóstico y resolución de fallos de arranque del backend: variable `MONGODB_URI` ausente al ejecutar fuera del workspace, IP no whitelisteada en Atlas, y fallo transitorio de DNS resolviendo el hostname del cluster. Sin cambios de código; el backend funciona como está documentado arriba.
- **2026-10-14** — Creación de este documento (`Prompt_Inicial_Claude.md`) como documentación complementaria al README.
- **2026-10-15** — `App.jsx` pasó de ser una demo de health-check a la página base del punto de venta (grid de productos + carrito en memoria + total + botón "Cobrar"). Se agregó estilo minimalista en `index.css` (paleta café/beige, layout responsive de 2 columnas). No se agregó modelo de órdenes en el backend; el carrito es solo de cliente.
