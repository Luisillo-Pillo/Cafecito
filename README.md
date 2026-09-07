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

## Endpoints de ejemplo

- `GET /api/health` — estado de la API y de la conexión a MongoDB
- `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id` — CRUD de ejemplo (colección `products`)

## Notas sobre MongoDB Atlas

- Verifica que tu IP esté en la whitelist de Atlas (Network Access) o usa `0.0.0.0/0` solo en desarrollo.
- El usuario de base de datos (Database Access) necesita permisos de lectura/escritura sobre la base `cafecito`.
