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

**Stack:** Express 4, Mongoose 8, MongoDB Atlas, `cors`, `helmet`, `morgan`, `dotenv`. Dev con `nodemon`. Pruebas unitarias y de integración con el test runner nativo de Node (`node --test`) y `fetch` nativo, sin dependencias extra.

**Módulo:** CommonJS (`"type": "commonjs"` en `package.json`).

**Contrato:** el backend implementa el **Contrato de API del Kit de Arranque** del curso (Proyecto Final con SCRUM: Sistema POS — "Cafecito Feliz"): endpoints `/api/products`, `/api/customers`, `/api/sales`, respuestas paginadas `{ data, total, page, limit }`, errores `{ error, details }` con los status del documento de edge cases (400/401/403/404/422), descuento progresivo y stock. Campos JSON en **camelCase** (como en los ejemplos del contrato) y cada documento expone `id` (string) en vez de `_id`.

**Estructura** (capas sugeridas por el Repo Base del Kit: routes → controllers → services → models):
```
backend/
├── .env.example
├── package.json
├── ejemplos-api.http         # 36 requests para VS Code REST Client (éxito y error)
├── postman-collection.json   # 35 requests para Postman con asserts de status y variables de ids
├── scripts/
│   ├── seed.js               # npm run seed: datos de ejemplo SOLO si las colecciones están vacías
│   ├── migrate-mvp.js        # npm run migrate: migra datos del modelo anterior (idempotente)
│   └── smoke.js              # npm run smoke: smoke test contra una API levantada (API_URL)
├── test/
│   ├── discount.test.js      # pruebas unitarias de la regla de descuento
│   └── api.test.js           # 29 pruebas de integración (contrato + edge cases), requiere TEST_MONGODB_URI
└── src/
    ├── index.js              # entry point: carga .env, conecta a DB, levanta Express
    ├── app.js                # createApp(): middlewares, rutas, 404 y error handler
    ├── config/
    │   ├── db.js             # connectDB() / disconnectDB() con Mongoose
    │   └── constants.js      # STORE_NAME, ROLES, PAYMENT_METHODS, PRODUCT_CATEGORIES
    ├── middleware/
    │   ├── asyncHandler.js   # envuelve handlers async para propagar errores a Express
    │   ├── auth.js           # requireRole(...) / adminOnly / staff (header X-User-Role)
    │   └── errorHandler.js   # 404 genérico + manejador central de errores
    ├── utils/
    │   ├── httpError.js      # HttpError(status, error, extra), validationError(), notFound()
    │   ├── validation.js     # isValidId, round2, escapeRegex, normalizePhoneOrEmail, parsePagination, paginated
    │   └── toJSON.js         # serialización: expone `id`, oculta `_id` y `__v`
    ├── models/
    │   ├── Product.js
    │   ├── Customer.js
    │   └── Sale.js           # venta + items (SaleItem embebido)
    ├── services/             # lógica de negocio y validaciones con mensajes del contrato
    │   ├── discount.service.js   # calculateDiscount(purchasesCount)
    │   ├── product.service.js
    │   ├── customer.service.js
    │   └── sale.service.js       # createSale(): flujo completo de una venta
    ├── controllers/          # traducen request → servicio → respuesta HTTP
    │   ├── product.controller.js
    │   ├── customer.controller.js
    │   └── sale.controller.js
    └── routes/
        ├── health.routes.js   # GET /api/health
        ├── product.routes.js
        ├── customer.routes.js
        └── sale.routes.js
```

**`src/index.js`:**
- Carga variables de entorno con `require("dotenv/config")`.
- Llama a `connectDB()` **antes** de levantar el servidor (si falla la conexión, el proceso debe terminar con `process.exit(1)` — fail fast, nunca levantar el servidor sin base de datos).
- Puerto desde `process.env.PORT`, default `5000`.

**`src/app.js` — `createApp()`:**
- Orden de middlewares: `helmet()` → `cors({ origin: process.env.CORS_ORIGIN })` → `express.json()` → `morgan("dev"` en desarrollo, `"combined"` en producción, desactivado con `NODE_ENV=test`).
- Rutas montadas en `/api` (health), `/api/products`, `/api/customers`, `/api/sales`.
- `notFoundHandler` al final: `404 { error: "Ruta no encontrada" }`.
- `errorHandler` (4 argumentos): `HttpError` → su status y cuerpo; JSON mal formado → `400`; índice único duplicado (`err.code === 11000`) → `400`; cualquier otro → loggea y responde `500 { error: "Error interno del servidor" }`.

**`src/config/db.js`:**
- `connectDB(uri?)` lee `MONGODB_URI` (o `DB_CONNECTION_STRING`, el nombre del Kit), o recibe la URI como parámetro (pruebas); si no hay ninguna, lanza un `Error` explicativo (apunta a `.env.example`) en vez de dejar que Mongoose falle silenciosamente.
- Loggea eventos de conexión (`connected`, `error`, `disconnected`) por consola con prefijo `[mongo]`.
- `disconnectDB()` para cierres limpios (tests, scripts).

**`src/middleware/asyncHandler.js`:**
- Helper `asyncHandler(fn)` que envuelve un route handler async y hace `.catch(next)` sobre la promesa, porque Express 4 no captura rechazos de promesas automáticamente.

**`src/middleware/auth.js` — autenticación básica del MVP:**
- `Authorization: Bearer <token>`: el rol sale del token (`ADMIN_TOKEN` / `VENDEDOR_TOKEN` del `.env`; fuera de producción valen por default `dev-admin-token` y `dev-vendedor-token`). Token mal formado o desconocido → `401 { error: "Token inválido" }`.
- Sin `Authorization`, se acepta el "header estático para desarrollo" que permite el Kit: `X-User-Role: admin | vendedor` (lo usa el frontend). Rol desconocido → `401 { error: "Credencial inválida" }`.
- Sin ninguna credencial → `401 { error: "Autenticación requerida" }`; rol sin permiso → `403 { error: "Permisos insuficientes" }`.
- `requireRole(...roles)` con atajos `adminOnly` y `staff` (admin o vendedor). Se puede cambiar por JWT más adelante sin tocar las rutas.

**`src/models/Product.js`** — esquema Mongoose `Product`:
| Campo         | Tipo              | Reglas                                                        |
|---------------|-------------------|------------------------------------------------------------------|
| `name`        | String            | requerido, trim, 2–100 caracteres                                |
| `description` | String            | default `""` (guarda los ingredientes)                           |
| `category`    | String            | enum `["bebida", "postre", "snack", "otro"]`, default `"otro"`    |
| `price`       | Number            | requerido (> 0) **solo si `category !== "bebida"`**               |
| `sizes`       | `[{ name, price }]` | default `[]`; exactamente **3** si `category === "bebida"`, **0** en cualquier otro caso; cada `price` > 0 |
| `stock`       | Number            | requerido, entero ≥ 0 (los 3 tamaños de una bebida comparten stock) |
| `available`   | Boolean           | default `true`                                                   |

Las bebidas se venden por tamaño (Chico/Mediano/Grande, cada uno con su propio precio) en vez de un precio único; es una extensión de Cafecito sobre el Kit (que solo pide `name`, `price`, `stock`). La categoría por default es `"otro"` para que un `POST` exactamente como el del contrato (`{ name, price, stock }`) funcione. Con `timestamps: true`.

**`src/models/Customer.js`** — esquema Mongoose `Customer`:
| Campo            | Tipo   | Reglas                                                       |
|------------------|--------|---------------------------------------------------------------|
| `name`           | String | requerido, trim, 2–100 caracteres                             |
| `phoneOrEmail`   | String | requerido, **único**; correo válido (se guarda en minúsculas) o teléfono `+` y 8–15 dígitos (se guarda sin espacios ni guiones) |
| `purchasesCount` | Number | default `0`; **solo lo incrementa `POST /api/sales`**, la API lo ignora en POST/PUT de clientes |

**`src/models/Sale.js`** — esquema Mongoose `Sale` (reemplaza al antiguo `Order`):
| Campo                  | Tipo                      | Reglas                                   |
|------------------------|---------------------------|-------------------------------------------|
| `customerId`           | ObjectId (ref `Customer`) | opcional, default `null` (venta a público general) |
| `customerNameSnapshot` | String                    | nombre del cliente al momento de la venta |
| `paymentMethod`        | String                    | enum `["cash", "card", "transfer"]`, default `"cash"` |
| `items`                | `[{ productId, productNameSnapshot, size?, unitPriceSnapshot, quantity, lineTotal }]` | al menos 1; snapshots de nombre/precio/tamaño al vender |
| `subtotal`, `discountPercent`, `discountAmount`, `total` | Number | calculados por el backend, redondeados a 2 decimales |
| `legacyOrderId`        | ObjectId                  | solo en ventas migradas desde `orders`   |

**Regla de descuento (`services/discount.service.js`):** según `purchasesCount` del cliente **antes** de la venta: `0` → 0%, `1–3` → 5%, `4–7` → 10%, `8+` → 15% (tope). Sin cliente → 0%. Justificación de negocio en el Kit (contexto-narrativo): reducir churn con margen controlado.

**Rutas** (permisos según la matriz del contrato):
| Método y ruta | Rol | Respuesta |
|---|---|---|
| `GET /api/health` | público | `{ status: "ok", db, timestamp }` |
| `GET /api/products?q=&page=&limit=` | público | `{ data, total, page, limit }` ordenado por **popularidad** (unidades vendidas sumando `items.quantity` de `Sale`; empate alfabético). `q` busca por nombre (regex escapada, sin mayúsculas). `limit` default 20, máx. 100. Sin resultados → `200` con `data: []` y `message` |
| `GET /api/products/:id` | público | producto; `404 { error, id }` si no existe (o el id es inválido) |
| `POST /api/products` | admin | `201`; `422 { error: "Validación fallida", details: [{ field, message }] }` |
| `PUT /api/products/:id` | admin | actualización parcial (se valida el producto ya combinado); `200`; `404`; `422` |
| `DELETE /api/products/:id` | admin | `200 { message, id }`; `404` |
| `GET /api/customers?q=&page=&limit=` | admin, vendedor | paginado; `q` filtra por nombre o `phoneOrEmail`; cada cliente incluye `nextDiscountPercent` |
| `GET /api/customers/:id` | admin, vendedor | cliente; `404` |
| `GET /api/customers/:id/sales` | admin, vendedor | historial paginado, más reciente primero |
| `POST /api/customers` | admin, vendedor | `201` con `purchasesCount: 0`; `422` (nombre 2–100, contacto inválido); **duplicado → `400 { error: "El cliente ya existe", details: [{ field, message, existingCustomerId }] }`** (decisión del equipo: rechazar) |
| `PUT /api/customers/:id` | admin, vendedor | parcial; mismas reglas de `422`/`400` |
| `DELETE /api/customers/:id` | admin | `200 { message, id }`; `404` |
| `POST /api/sales` | admin, vendedor | registra la venta (ver flujo abajo); `201` con la venta y su `ticket` |
| `GET /api/sales?customerId=&page=&limit=` | admin, vendedor | paginado, más recientes primero |
| `GET /api/sales/:id` | admin, vendedor | venta con `ticket`; `404` |

**Flujo de `POST /api/sales`** — body `{ customerId?, paymentMethod?, items: [{ productId, quantity, size? }] }`:
1. Forma del body → `422`: `items` vacío, `quantity` no entero ≥ 1, `paymentMethod` fuera de `cash/card/transfer`.
2. Cliente: si viene `customerId` y no existe → `400 "Cliente no encontrado"` (decisión: rechazar para mantener integridad). `null`/ausente → venta sin cliente.
3. Productos: alguno no existe → `400 "Producto no encontrado"`; no disponible → `400`; bebida sin tamaño válido → `422`.
4. Stock: suma cantidades por producto (dos tamaños de la misma bebida comparten stock); si alguno no alcanza → `400 "Stock insuficiente"` con `available`/`requested` y **se rechaza toda la venta**. El descuento de stock es atómico por producto (`updateOne` con `stock >= cantidad`), y si algo falla a mitad se regresa el stock ya descontado.
5. Cálculo en el servidor (nunca se confía en precios del cliente): `lineTotal`, `subtotal`, `discountPercent` por `purchasesCount`, `discountAmount`, `total`.
6. Guarda la venta; si falla, regresa el stock. Si hay cliente, `purchasesCount += 1` (una venta sin cliente no incrementa a nadie).
7. Responde `201` con `saleId`, `items` (`productName`, `size`, `quantity`, `unitPrice`, `lineTotal`), totales y `ticket` (`storeName: "Cafecito Feliz"`, `timestamp`, `customerName` o "Público general", items, `discount` como texto `"5% (-$0.73)"` o "Sin descuento", `paymentMethod` en español).

Mensajes de error y de API en español; la estructura (`error`, `details`, `id`) y los status siguen el contrato.

**Scripts:**
- `npm run migrate` (`scripts/migrate-mvp.js [stockInicial=50]`): productos sin `stock` → stock inicial; clientes con `email`/`phone` → `phoneOrEmail` (email) y borra el índice viejo `email_1`; copia `orders` → `sales` (sin descuento, efectivo, misma fecha; `orders` no se borra); recalcula `purchasesCount` contando ventas. Idempotente.
- `npm run seed` (`scripts/seed.js`): inserta 8 productos y 5 clientes de ejemplo (con `purchasesCount` que cubren los 4 niveles de descuento) **solo si** las colecciones están vacías; si la base estaba totalmente vacía, registra además 3 ventas de ejemplo con `createSale()` (5%, 15% y público general). Nunca borra.
- `npm run smoke` (`scripts/smoke.js`): espera a `/health` y prueba health, listar productos, crear producto/cliente/venta, consultar la venta, 401 sin token y 400 por stock; limpia lo que creó. Sale con código 1 si algo falla. (Se llama `smoke.js` y no `smoke-test.js` para que `node --test` no lo tome como prueba.)
- `npm test`: `node --test` → `test/discount.test.js` (unitarias) y `test/api.test.js` (integración: levanta `createApp()` en un puerto libre contra `TEST_MONGODB_URI`; **se omite** si la variable no existe y se niega a correr si el nombre de la base no termina en `_test`, porque borra sus colecciones). Incluye la prueba de dos ventas simultáneas que no deben dejar stock negativo.

**Variables de entorno (`backend/.env.example`):**
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/cafecito?retryWrites=true&w=majority&appName=Cafecito
CORS_ORIGIN=http://localhost:5173
ADMIN_TOKEN=
VENDEDOR_TOKEN=
# TEST_MONGODB_URI=mongodb://127.0.0.1:27017/cafecito_test
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
    ├── App.jsx                # raíz: header + selector de rol + switch de vista (pos | clientes | productos)
    ├── api.js                 # API_URL, apiFetch(), ApiError, getRole()/setRole()
    ├── utils.js                # normalize(), slugify(), currency, dateTimeFormat, PAYMENT_METHODS, previewDiscount(), discountLabel()
    ├── productIcon.js          # getProductIcon(): ícono emoji de respaldo (por palabra clave o categoría)
    ├── productImages.js        # getProductImage(): ilustración SVG por producto (import.meta.glob + slugify)
    ├── assets/products/*.svg   # 30 ilustraciones, una por producto, nombradas con el slug de su nombre
    ├── index.css
    ├── components/
    │   ├── CustomerForm.jsx   # registra un cliente (POST /api/customers) con nombre + phoneOrEmail
    │   └── Ticket.jsx         # ticket visual (modal) a partir de sale.ticket; botón Imprimir
    └── pages/
        ├── Pos.jsx            # punto de venta
        ├── Customers.jsx      # clientes + historial de compras
        └── Products.jsx       # administración de productos (solo admin)
```

- `vite.config.js`: plugin de React, servidor en puerto `5173`.
- `api.js`: centraliza `API_URL` (default `http://localhost:5000/api`) y `apiFetch(path, { method, body })`, que agrega `X-User-Role` y `Content-Type`, serializa `body` y, si la respuesta no es `ok`, lanza `ApiError` (con `status`, `details` y un mensaje armado con los `details[].message` del backend). El rol actual se guarda en `localStorage` (envuelto en try/catch; default `vendedor`).
- `App.jsx`: header con el logo (`assets/products/americano.svg`), el nombre de la app, navegación con estado local `view` y un **selector de rol** (Vendedor / Administrador). La pestaña **Productos** solo aparece para admin; al cambiar de rol las páginas se remontan (`key={role}`). Sin librería de ruteo.
- `pages/Pos.jsx` — punto de venta:
  - Lista productos (`GET /products?limit=100`, usa `res.data`) como tarjetas **grandes, 3 por fila** (`pos-grid`; 2 columnas en pantallas medianas y 1 en móvil), con ilustración (`<ProductVisual>`: SVG por slug o emoji de respaldo), nombre y **stock restante** ("Quedan N", descontando lo que ya está en el carrito; "Agotado" en 0).
    - **Bebidas** (`category === "bebida"` con 3 `sizes`): 3 botones de tamaño con su precio.
    - **Resto**: la tarjeta entera es un botón con precio único.
    - No deja agregar más unidades que el stock (los tamaños de una bebida comparten stock); productos no disponibles o agotados se deshabilitan.
  - **Panel de cuenta pegajoso** (`.order-summary` dentro de `<aside className="pos-cart order-summary">`): `position: sticky; top: 1.5rem; align-self: start`, `max-height: calc(100vh - 3rem)` + `overflow-y: auto`. Contiene el **buscador de productos** (filtra en el cliente con `normalize`), la "Cuenta" (agrupada por `producto + tamaño`, `+`/`−`, subtotal por línea), el cliente, los totales, el método de pago y el botón Cobrar.
  - **Cliente opcional**: búsqueda con debounce de 300ms (`GET /customers?q=`), registro inline con `<CustomerForm>`. Al seleccionarlo muestra su nivel ("Cliente semanal · 10%"). Sin cliente se cobra como público general, sin descuento.
  - **Totales**: subtotal, descuento (vista previa con `previewDiscount`, misma regla que el backend) y total. El backend recalcula todo al cobrar.
  - **Método de pago**: Efectivo / Tarjeta / Transferencia (`cash`/`card`/`transfer`).
  - **Cobrar** se habilita con carrito no vacío; hace `POST /sales` con `{ customerId | null, paymentMethod, items: [{ productId, quantity, size? }] }`. Si tiene éxito muestra el **`<Ticket>`** devuelto por el backend, vacía carrito y cliente y recarga productos (stock). Si falla muestra el mensaje del backend (ej. "Solo hay 3 disponibles, se pidieron 5") y recarga productos.
- `pages/Customers.jsx` — clientes:
  - Búsqueda en el servidor (`GET /customers?q=&limit=100`, debounce 300ms), botón "+ Nuevo cliente" (`<CustomerForm>`). Cada cliente muestra `phoneOrEmail`, número de compras y su % de descuento.
  - Al seleccionar uno carga su historial (`GET /customers/:id/sales`): fecha, resumen de ítems (con tamaño), descuento aplicado y total; clic en una venta abre su ticket.
  - Admin ve "Eliminar cliente" (con confirmación en línea).
- `pages/Products.jsx` (solo admin): lista alfabética con ilustración, precios (por tamaño en bebidas), stock y estado; formulario lateral para crear/editar (nombre, descripción, categoría, precio o 3 tamaños con precio, stock, disponible) y eliminar con confirmación en línea. Muestra los errores `422` del backend.
- `components/CustomerForm.jsx`: formulario controlado (nombre, correo o teléfono) → `POST /customers`; muestra el error del backend (422 o 400 duplicado) y llama a `onCreated(customer)`.
- `components/Ticket.jsx`: modal con tienda, fecha, folio (últimos 8 caracteres del `saleId`), cliente, ítems, subtotal, descuento, total y método de pago; botón **Imprimir** (`window.print()`; en `@media print` solo se imprime el ticket).
- Estilos en `index.css`: paleta neutra (beige/blanco) con un acento café (`--accent: #6b4226`), layout en dos columnas (`pos-main`) reutilizado en las tres vistas, colapsa a una columna en móvil (`max-width: 720px`). Sin librerías de UI ni CSS frameworks.
- `index.html`: título `Cafecito`, `lang="es"`.
- **Variables de entorno (`frontend/.env.example`):**
  ```
  VITE_API_URL=http://localhost:5000/api
  ```

### 4. Convenciones generales

- Comentarios y mensajes de usuario/API en **español**.
- Sin TypeScript. Pruebas con `node --test` (sin frameworks); pruebas manuales de la API con `backend/ejemplos-api.http` (REST Client) o `backend/postman-collection.json` (Postman).
- **Flujo de trabajo (`CONTRIBUTING.md`):** tablero To Do / In Progress / In Review / Done con WIP máximo 2 por persona; ramas `feature/<historia>` (también `fix/`, `docs/`, `test/`) que salen de `develop` y regresan por PR (nunca push directo a `main`/`develop`); 1 historia = 1 PR; commits con prefijos `feat:`/`fix:`/`test:`/`docs:`; cómo resolver conflictos; Definition of Done de 8 puntos. Plantilla de PR en `.github/pull_request_template.md` con el checklist de la DoD.
- **CI (`.github/workflows/ci.yml`, GitHub Actions):** en push a `main`, `develop`, `feature/**` y en PRs a `main`/`develop`, con un servicio `mongo:7`: `npm ci` → `npm test` (con `TEST_MONGODB_URI`) → `npm run build` → levantar la API y `npm run smoke`. Si un paso falla, el PR no se mergea.
- `.env` reales nunca se commitean (están en `.gitignore`); siempre se documenta el `.env.example` correspondiente.
- Backend "fail fast": si falta configuración crítica (ej. `MONGODB_URI`), el proceso debe morir con un mensaje claro en vez de arrancar en un estado inválido.
- Se trabaja en la rama `develop`.
- Scripts raíz (`package.json`):
  - `npm run dev` — backend + frontend en paralelo (`concurrently`).
  - `npm run dev:backend` / `npm run dev:frontend` — por separado.
  - `npm run build` — build de producción del frontend (Vite); el backend no requiere build.
  - `npm start` — levanta el backend en modo producción (`node src/index.js`).
  - `npm run seed` / `npm run migrate` / `npm test` — atajos a los scripts del backend (`npm run smoke --workspace=backend` para el smoke test).

### 5. Notas de despliegue / infraestructura

- Base de datos: MongoDB Atlas (cluster `cafecito`, cuenta `luisferandradesan_db_user`).
- Hay que whitelistear la IP del entorno donde corre el backend en **Atlas → Network Access**.
- CORS del backend debe apuntar al origen real del frontend desplegado (`CORS_ORIGIN`).
- La base de datos trae un catálogo de ejemplo tomado de un menú real de cafetería (`productos_cafeteria.csv` provisto por el usuario): 30 productos — 23 bebidas (cafés calientes, otras bebidas calientes, bebidas frías y frappés) con 3 tamaños Chico/Mediano/Grande y su propio precio cada una, y 7 alimentos con precio único (3 `snack` salados — croissant de jamón y queso, bagel, chapata de pollo — y 4 `postre` dulces — concha, muffin, brownie, pastel de zanahoria). El campo `description` de cada producto guarda su lista de ingredientes tal cual venía en el CSV. Cargado vía `POST /api/products`, junto con una lista default de 5 clientes (Ana Torres, Carlos Méndez, Laura Jiménez, Jorge Ramírez, Sofía Vargas) cargada vía `POST /api/customers`, para poder probar la UI con datos reales.
- Después de actualizar a la versión del MVP del Kit, correr **una vez** `npm run migrate` contra la base existente (agrega `stock`, convierte clientes a `phoneOrEmail` y pasa `orders` a `sales`).

---

## Historial de cambios relevantes

- **2026-10-14** — Diagnóstico y resolución de fallos de arranque del backend: variable `MONGODB_URI` ausente al ejecutar fuera del workspace, IP no whitelisteada en Atlas, y fallo transitorio de DNS resolviendo el hostname del cluster. Sin cambios de código; el backend funciona como está documentado arriba.
- **2026-10-14** — Creación de este documento (`Prompt_Inicial_Claude.md`) como documentación complementaria al README.
- **2026-10-15** — Catálogo de ejemplo ampliado a 13 productos variados (bebidas, postres, snacks y otros). En el POS: buscador de productos por nombre (`productQuery` + `normalize`), ícono representativo por producto (`productIcon.js`, por palabra clave o categoría), badge de cantidad seleccionada en cada tarjeta, y contador de artículos junto al total en la "Cuenta".
- **2026-10-15** — Catálogo reemplazado por uno enfocado en cafetería (se quitaron agua/papas/sándwich/jugo; se agregaron Espresso, Latte, Mocha, Macchiato, Cold brew, Muffin de arándano). Tarjetas de producto más grandes, grid fijo de 3 columnas (2 en tablet, 1 en móvil). Se agregó una lista default de 5 clientes de ejemplo.
- **2026-10-15** — `App.jsx` pasó de ser una demo de health-check a la página base del punto de venta (grid de productos + carrito en memoria + total + botón "Cobrar"). Se agregó estilo minimalista en `index.css` (paleta café/beige, layout responsive de 2 columnas). No se agregó modelo de órdenes en el backend; el carrito es solo de cliente.
- **2026-10-15** — Se trabaja de ahora en adelante en la rama `develop` (no directamente en `main`).
- **2026-10-15** — Sistema de clientes y registro de compras: modelos `Customer` y `Order`, rutas `customer.routes.js` y `order.routes.js` (CRUD de clientes, búsqueda, historial de compras, registro de ventas con cálculo de total en el servidor). El frontend se reorganizó en `pages/` (`Pos.jsx`, `Customers.jsx`) y `components/CustomerForm.jsx`, con `App.jsx` como switch de vista; se agregó `api.js` como helper centralizado de fetch. El POS ahora requiere seleccionar o registrar un cliente antes de poder cobrar.
- **2026-10-15** — Fix de UI: el nombre del producto no se veía en las tarjetas porque los `<button>` toman el color de texto nativo del sistema (`ButtonText`), que en modo oscuro resulta blanco sobre la tarjeta blanca. Se agregó `color: inherit` a la regla global `button` en `index.css` para que todos los botones hereden el color de texto definido por la app.
- **2026-10-15** — Bebidas con 3 tamaños y precio por tamaño: `Product.sizes` (`[{ name, price }]`, exactamente 3 si `category === "bebida"`, 0 en cualquier otro caso); `price` pasa a ser requerido solo para categorías que no son bebida. `Order.items` ahora puede llevar `size`, y `POST /api/orders` valida que el tamaño enviado exista en el producto. En el POS, las tarjetas de bebida muestran 3 botones (uno por tamaño, con su precio) en vez de un precio único; el carrito agrupa por `producto + tamaño`.
- **2026-10-15** — Catálogo reemplazado por el menú real provisto en `productos_cafeteria.csv`: 30 productos (23 bebidas con 3 tamaños, 7 alimentos con precio único). Se usa `description` para guardar los ingredientes de cada producto. `productIcon.js` ganó reglas nuevas (zanahoria, brownie, concha, bagel, chapata, matcha, tisana, horchata, flat white) para cubrir los nombres del menú real.
- **2026-10-15** — Ilustraciones SVG por producto (provistas por el usuario, 30 archivos): se guardaron en `assets/products/`, nombradas con el slug del nombre del producto (`slugify()`, nuevo en `utils.js`). `productImages.js` las carga con `import.meta.glob` y expone `getProductImage(product)`; en el POS, `<ProductVisual>` usa la ilustración si existe y cae al ícono emoji (`productIcon.js`) si no hay ninguna para ese producto.
- **2026-10-15** — Panel de cuenta del POS flotante y fijo en escritorio/tablet (`.order-summary`, `position: fixed`), con el buscador de productos movido dentro de ese panel; en móvil vuelve a fluir normalmente. Logo del sitio en el header: se reutiliza la ilustración del Americano (`assets/products/americano.svg`) en vez del emoji ☕.
- **2026-10-15** — El panel de cuenta pasó de `position: fixed` (desalineado con la grilla de productos y con un offset fijo adivinado) a `position: sticky; align-self: start`. Esto alinea su borde superior con el de la grilla de productos automáticamente (ambos son hijos de la misma grilla `.pos-main` con el mismo padding) y hace que se "pegue" arriba solo al hacer scroll hacia abajo, regresando a su lugar al subir — en vez de estar siempre fijo con un offset calculado a mano. Se eliminó `.pos-main-floating` (ya no hace falta reservar espacio con `padding-right`).
- **2026-10-15** — El `top` del panel pegajoso pasó de `0` a `1.5rem` para conservar el mismo margen que ya existía entre el contenido y el borde del sitio, en vez de quedar pegado a ras del viewport al hacer scroll.
- **2026-10-15** — `GET /api/products` ahora ordena por popularidad (unidades vendidas vía agregación sobre `Order.items.qty`) en vez de por fecha de creación; empate se resuelve alfabéticamente. El frontend no necesitó cambios porque ya renderiza los productos en el orden que recibe de la API.
- **2026-10-16** — Alineación con el **MVP del Kit de Arranque** del curso de SCRUM (contrato de API, modelo de datos, edge cases, flujos y matriz de permisos). Backend reorganizado en capas (routes → controllers → services → models, más `utils/` y `middleware/auth.js` + `errorHandler.js`). `Order` se reemplaza por `Sale` y `/api/orders` por `/api/sales`: cliente opcional (venta a público general), `paymentMethod`, descuento progresivo por `purchasesCount` (0/5/10/15%), validación y descuento atómico de **stock** (venta todo-o-nada), snapshots de nombre/precio y **ticket** en la respuesta. `Product` gana `stock` (y la categoría por default pasa a `"otro"`); `Customer` pasa de `email` + `phone` a **`phoneOrEmail`** único + `purchasesCount`. Respuestas paginadas `{ data, total, page, limit }` con `q`, errores `{ error, details }` (400/401/403/404/422), `id` en vez de `_id`. Roles con header `X-User-Role` (admin / vendedor). Scripts `npm run migrate` (migra la base existente, idempotente) y `npm run seed`, pruebas `node --test` y `ejemplos-api.http`. Frontend: selector de rol, POS con stock, cliente opcional, vista previa de descuento, método de pago y ticket imprimible; historial con tickets en Clientes; nueva página **Productos** (CRUD, solo admin). Se eliminaron `models/Order.js` y `routes/order.routes.js`.
- **2026-10-16** — Cierre de requisitos del Kit y de los sprints: autenticación con `Authorization: Bearer <token>` (además de `X-User-Role`), alias `DB_CONNECTION_STRING`, pruebas de integración de la API (`test/api.test.js`, base `_test` desechable), smoke test (`scripts/smoke.js`), pipeline de CI en GitHub Actions, colección de Postman, ventas de ejemplo en el seed, `CONTRIBUTING.md` (tablero, WIP, ramas `feature/`, PRs, conflictos, Definition of Done) y plantilla de Pull Request.
