# Cafecito

Monorepo fullstack: **Express + MongoDB Atlas** (backend) y **React + Vite** (frontend), en JavaScript puro (sin TypeScript), gestionado con **npm workspaces**.

## Estructura

```
Cafecito/
├── backend/     # API Express (JavaScript) + Mongoose + MongoDB Atlas
├── frontend/    # SPA React (JavaScript) + Vite
└── package.json # raíz del monorepo (npm workspaces)
```

## Requisitos

- Node.js >= 20
- Un cluster de MongoDB Atlas (o local) y su connection string

## Configuración de variables de entorno

Cada paquete tiene su propio `.env` (ignorado por git) basado en `.env.example`:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

En `backend/.env` pega tu connection string de Atlas en `MONGODB_URI` (Atlas > Database > Connect > Drivers). Incluye el nombre de la base de datos en la ruta, ej:

```
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/cafecito?retryWrites=true&w=majority&appName=Cafecito
```

> Este repo ya trae un `backend/.env` local con el connection string configurado para desarrollo. No se sube a git (ver `.gitignore`).

## Instalación

Desde la raíz (instala backend y frontend a la vez gracias a los workspaces):

```bash
npm install
```

## Desarrollo

```bash
npm run dev              # levanta backend (puerto 5000) y frontend (puerto 5173) en paralelo
npm run dev:backend      # solo backend
npm run dev:frontend     # solo frontend
```

## Build de producción

El backend es JavaScript plano (sin paso de compilación); solo el frontend necesita build.

```bash
npm run build            # genera frontend/dist con Vite
npm start                # levanta el backend (Express) tal cual
```

## Frontend

La SPA (`frontend/`) tiene dos vistas (sin librería de ruteo, solo un switch simple en `App.jsx`):

- **Punto de venta**: tarjetas grandes de producto (3 por fila, con una ilustración propia por producto) que se pueden buscar desde el panel de cuenta. Las bebidas muestran sus 3 tamaños (Chico/Mediano/Grande) con el precio de cada uno; al seleccionar un tamaño (o un producto sin tamaños) se suma a una cuenta con contador de artículos, cantidad por línea y total. Ese panel de cuenta es "pegajoso" (`sticky`): se queda arriba en pantalla mientras se hace scroll por el catálogo, y vuelve a su lugar al subir de nuevo. Para cobrar hay que seleccionar o registrar un cliente (nombre, correo, teléfono); el botón "Cobrar" registra la venta (`POST /api/orders`) y vacía el carrito.
- **Clientes**: lista y busca clientes, permite registrar uno nuevo, y muestra el historial de compras de cada uno.

## Endpoints de ejemplo

- `GET /api/health` — estado de la API y de la conexión a MongoDB
- `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id` — CRUD de productos (colección `products`); la lista (`GET /api/products`) viene ordenada por popularidad (unidades vendidas)
- `GET/POST /api/customers`, `GET/PUT/DELETE /api/customers/:id` — CRUD de clientes (colección `customers`); `GET /api/customers?search=texto` filtra por nombre/correo/teléfono
- `GET /api/customers/:id/orders` — historial de compras de un cliente
- `GET/POST /api/orders` — listar o registrar ventas (colección `orders`); el total se calcula en el servidor a partir de los precios actuales de los productos (y del tamaño elegido, si es una bebida)

## Notas sobre MongoDB Atlas

- Verifica que tu IP esté en la whitelist de Atlas (Network Access) o usa `0.0.0.0/0` solo en desarrollo.
- El usuario de base de datos (Database Access) necesita permisos de lectura/escritura sobre la base `cafecito`.

## Catálogo de ejemplo

El catálogo cargado en la base de datos corresponde al menú real de `productos_cafeteria.csv`: 23 bebidas con 3 tamaños (Chico/Mediano/Grande) cada una y 7 alimentos con precio único. El campo `description` de cada producto guarda su lista de ingredientes.
