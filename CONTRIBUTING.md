# Cómo trabajamos en Cafecito

Reglas del equipo para que "no se rompa nada" (Sprint 3) y para saber cuándo algo está realmente listo (Sprint 4).

## Tablero

Usamos un tablero con 4 columnas (GitHub Projects):

| To Do | In Progress | In Review | Done |
|---|---|---|---|
| Historias listas para trabajar (con criterios de aceptación) | Trabajo actual | PR abierto, esperando revisión | Mergeado y cumple la Definition of Done |

**Regla WIP:** máximo **2 historias en "In Progress" por persona**. Antes de empezar una tercera, termina o pasa a revisión una de las que tienes.

## Ramas

```
main                      ← siempre estable (lo que está en producción)
└── develop               ← integración del sprint
    ├── feature/registrar-venta-con-descuento
    ├── feature/buscar-cliente
    ├── feature/crud-productos
    └── fix/stock-negativo-en-ventas-simultaneas
```

- **Nunca se hace push directo a `main` ni a `develop`.** Todo entra por Pull Request.
- Una historia = una rama = un PR. Nombre en minúsculas y con guiones, que diga **qué** hace: `feature/registrar-cliente`, no `feature/fix` ni `cambios`.
- Prefijos: `feature/` (historia nueva), `fix/` (bug), `docs/` (solo documentación), `test/` (solo pruebas).
- Las ramas salen de `develop` actualizado y regresan a `develop` por PR. Al cerrar el sprint, `develop` se integra a `main` con otro PR.

## Flujo de una historia (de To Do a Done)

1. Tomo una historia de **To Do** (respetando el WIP) y la muevo a **In Progress**.
2. Creo la rama desde `develop` actualizado:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/registrar-venta-con-descuento
   ```
3. Desarrollo con **commits pequeños** usando prefijos: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`.
   ```bash
   git add backend/src/services/sale.service.js
   git commit -m "feat: aplicar descuento por purchasesCount en POST /api/sales"
   ```
4. Antes de subir, pruebo localmente: `npm test`, `npm run build` y los requests de `backend/ejemplos-api.http` (o la colección de Postman) que toca la historia.
5. Subo la rama y abro el PR hacia `develop` con la plantilla (qué historia es, cómo se probó, checklist de DoD). La historia pasa a **In Review**.
6. El **pipeline de CI** corre solo (pruebas, build, smoke test). Si falla, no se revisa hasta que esté en verde.
7. **Revisión:** otra persona del equipo revisa el código y lo prueba localmente. Si trabajo solo, hago la autorrevisión con el checklist del PR al día siguiente, con la cabeza fresca.
8. Si hay comentarios, corrijo en la misma rama (nuevos commits) y pido revisión otra vez.
9. Con aprobación + CI en verde → **merge a `develop`** y borro la rama. La historia pasa a **Done** solo si cumple la DoD.

### ¿Y si hay conflictos en el merge?

1. Actualizo mi rama con lo último de `develop`:
   ```bash
   git checkout develop && git pull origin develop
   git checkout feature/mi-historia
   git merge develop
   ```
2. Resuelvo cada conflicto en VS Code entendiendo **los dos cambios** (no acepto "el mío" a ciegas). Si el conflicto es con código de otra persona, le pregunto antes de decidir.
3. Vuelvo a correr `npm test` y `npm run build`, y pruebo la historia otra vez.
4. Commit del merge (`git commit -m "merge: develop en feature/mi-historia"`), push, y el CI vuelve a correr.
5. Para evitar conflictos grandes: PRs pequeños y actualizar la rama con `develop` seguido.

## Definition of Done

Una historia está **Done** cuando se cumple todo esto:

1. Cumple **todos** sus criterios de aceptación (Dado que… cuando… entonces…).
2. Respeta el contrato de API: rutas, formato `{ data, total, page, limit }` y errores `{ error, details }`.
3. Maneja los edge cases que le aplican: stock insuficiente → 400, cantidad ≤ 0 → 422, recurso inexistente → 404, sin token → 401, sin permiso → 403, etc.
4. Se probó manualmente con `backend/ejemplos-api.http` o Postman, incluyendo **al menos un caso de error**.
5. `npm test` pasa (las pruebas nuevas o actualizadas están incluidas si la historia cambió reglas de negocio).
6. `npm run build` compila sin errores y la pantalla se probó en el navegador (escritorio y móvil).
7. No rompe lo que ya funcionaba: `GET /products`, `GET /customers` y `POST /sales` siguen respondiendo igual.
8. PR revisado, CI en verde, mergeado sin conflictos, y `README.md` / `Prompt_Inicial_Claude.md` actualizados si cambió algo relevante.

## Reportar errores

Abre un *issue* en GitHub con: qué hiciste, qué esperabas, qué pasó (status y respuesta de la API si aplica) y cómo reproducirlo.
