# Cafecito

Sistema de **punto de venta (POS)** para la cafetería *Cafecito Feliz*, construido como proyecto final del curso de SCRUM (Inadaptados Academy). Monorepo fullstack: **Express + MongoDB Atlas** (backend) y **React + Vite** (frontend), en JavaScript puro (sin TypeScript), gestionado con **npm workspaces**.

El alcance sigue el **MVP del Kit de Arranque**: ventas con carrito, descuento automático a clientes recurrentes, control de stock y ticket; registro y búsqueda de clientes; administración de productos; roles vendedor y administrador.

## Estructura

```
Cafecito/
├── .github/         # pipeline de CI (workflows/ci.yml) y plantilla de Pull Request
├── backend/         # API Express (routes → controllers → services → models) + Mongoose
├── frontend/        # SPA React + Vite
├── CONTRIBUTING.md  # tablero, ramas, flujo de PR y Definition of Done
└── package.json     # raíz del monorepo (npm workspaces)
```

## Requisitos

- Node.js >= 20
- Un cluster de MongoDB Atlas (o local) y su connection string
- Opcional: extensión **REST Client** de VS Code (`humao.rest-client`) para probar la API

## Configuración de variables de entorno

Cada paquete tiene su propio `.env` (ignorado por git) basado en `.env.example`:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

En `backend/.env` pega tu connection string de Atlas en `MONGODB_URI` (Atlas > Database > Connect > Drivers; también se acepta el nombre del Kit, `DB_CONNECTION_STRING`). Incluye el nombre de la base de datos en la ruta, ej:

```
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/cafecito?retryWrites=true&w=majority&appName=Cafecito
```

> Este repo ya trae un `backend/.env` local con el connection string configurado para desarrollo. No se sube a git (ver `.gitignore`).

Variables opcionales del backend: `ADMIN_TOKEN` / `VENDEDOR_TOKEN` (tokens Bearer; en desarrollo valen `dev-admin-token` y `dev-vendedor-token`) y `TEST_MONGODB_URI` (base desechable para las pruebas de integración).

## Instalación

Desde la raíz (instala backend y frontend a la vez gracias a los workspaces):

```bash
npm install
```

### Base de datos

```bash
npm run migrate   # SOLO una vez si vienes de la versión anterior (orders, email/phone, sin stock)
npm run seed      # datos de ejemplo (productos, clientes y 3 ventas) solo si la base está vacía; no borra nada
```

`npm run migrate` es idempotente: agrega `stock` (50 por default; `npm run migrate --workspace=backend -- 100` para otro valor) a los productos que no lo tienen, convierte los clientes a `phoneOrEmail`, copia las compras de `orders` a `sales` y recalcula `purchasesCount`.

## Desarrollo

```bash
npm run dev              # levanta backend (puerto 5000) y frontend (puerto 5173) en paralelo
npm run dev:backend      # solo backend
npm run dev:frontend     # solo frontend
```

## Pruebas

```bash
npm test                 # unitarias (regla de descuento) + integración de la API
npm run smoke --workspace=backend   # smoke test contra una API ya levantada (API_URL)
```

- Las **pruebas de integración** (`backend/test/api.test.js`, 29 casos del contrato y de edge cases) solo corren si defines `TEST_MONGODB_URI` con una base **desechable** cuyo nombre termine en `_test` (ej. `mongodb://127.0.0.1:27017/cafecito_test` con Docker: `docker run -d -p 27017:27017 mongo:7`). Nunca apuntes a tu base de Atlas: las pruebas borran sus colecciones.
- **Pruebas manuales:** `backend/ejemplos-api.http` (extensión REST Client) o `backend/postman-collection.json` (Postman → Import → Run collection; 35 requests con asserts).
- **CI:** `.github/workflows/ci.yml` corre en GitHub Actions en cada push a `feature/**`, `develop` y `main`, y en cada PR: `npm ci` → `npm test` (con MongoDB de servicio) → `npm run build` → smoke test.

## Build de producción

El backend es JavaScript plano (sin paso de compilación); solo el frontend necesita build.

```bash
npm run build            # genera frontend/dist con Vite
npm start                # levanta el backend (Express) tal cual
```

## Frontend

La SPA tiene un **selector de rol** en el header (Vendedor / Administrador) y tres vistas:

- **Punto de venta** (ambos roles): tarjetas grandes de producto (3 por fila, con ilustración propia) con el stock restante; las bebidas muestran sus 3 tamaños con precio. El panel de cuenta es "pegajoso" (`sticky`) y tiene el buscador de productos, el carrito, el **cliente opcional** (con su nivel de descuento), subtotal/descuento/total, el **método de pago** y el botón Cobrar. Al cobrar se muestra el **ticket** (imprimible).
- **Clientes** (ambos roles): busca y registra clientes (nombre + correo o teléfono), muestra compras y % de descuento de cada uno, y su historial con el ticket de cada venta. El admin puede eliminar clientes.
- **Productos** (solo admin): crear, editar y eliminar productos (precio único o 3 tamaños para bebidas, stock, disponibilidad).

## API

Base URL `http://localhost:5000/api`. Sigue el **Contrato de API del Kit de Arranque**: listas paginadas `{ data, total, page, limit }` (`?q=&page=&limit=`), errores `{ error, details: [{ field, message }] }` y cada documento expone `id`.

**Autenticación (MVP):** `Authorization: Bearer <token>` (tokens `ADMIN_TOKEN` / `VENDEDOR_TOKEN`) o, en desarrollo, el header `X-User-Role: admin | vendedor` (lo usa el frontend). Sin credencial o token inválido → `401`; rol sin permiso → `403`.

| Endpoint | Rol |
|---|---|
| `GET /api/health` | público |
| `GET /api/products`, `GET /api/products/:id` | público |
| `POST /api/products`, `PUT/DELETE /api/products/:id` | admin |
| `GET/POST /api/customers`, `GET/PUT /api/customers/:id`, `GET /api/customers/:id/sales` | vendedor, admin |
| `DELETE /api/customers/:id` | admin |
| `POST /api/sales`, `GET /api/sales`, `GET /api/sales/:id` | vendedor, admin |

**Reglas de negocio de una venta (`POST /api/sales`):**

- `customerId` es opcional: sin cliente = público general, sin descuento.
- Descuento según compras previas del cliente: 0 → 0%, 1–3 → 5%, 4–7 → 10%, 8+ → 15%. Se calcula en el backend; luego `purchasesCount` sube 1.
- Si algún producto no tiene stock suficiente se rechaza **toda** la venta (`400`); si se acepta, el stock baja.
- `paymentMethod`: `cash` (default), `card` o `transfer`.
- La respuesta incluye el `ticket` listo para mostrar.

Todos los casos (éxito y error) están en [`backend/ejemplos-api.http`](backend/ejemplos-api.http) (REST Client) y en [`backend/postman-collection.json`](backend/postman-collection.json) (Postman).

## Notas sobre MongoDB Atlas

- Verifica que tu IP esté en la whitelist de Atlas (Network Access) o usa `0.0.0.0/0` solo en desarrollo.
- El usuario de base de datos (Database Access) necesita permisos de lectura/escritura sobre la base `cafecito`.

## Catálogo de ejemplo

El catálogo cargado en la base de datos corresponde al menú real de `productos_cafeteria.csv`: 23 bebidas con 3 tamaños (Chico/Mediano/Grande) cada una y 7 alimentos con precio único. El campo `description` de cada producto guarda su lista de ingredientes.

## Cómo contribuir

Se trabaja con ramas `feature/<historia>` que salen de `develop` y regresan por Pull Request (nunca push directo a `main` ni `develop`), con WIP máximo de 2 historias por persona y una Definition of Done verificable. Todo el flujo está en [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Documentación

- [`Prompt_Inicial_Claude.md`](Prompt_Inicial_Claude.md): especificación completa del proyecto y historial de cambios.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): tablero, ramas, PRs, conflictos y Definition of Done.
- Reportar errores: abre un *issue* en el repositorio de GitHub.
