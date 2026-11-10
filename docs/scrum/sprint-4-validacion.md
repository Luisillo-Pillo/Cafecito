# Sprint 4 · Definition of Done y plan de validación

## Definition of Done (8 puntos)

Una historia está **Done** solo cuando cumple los 8:

1. Cumple **todos** sus criterios de aceptación «Dado que… cuando… entonces…».
2. Respeta el contrato de API: listas `{ data, total, page, limit }` y errores `{ error, details: [{ field, message }] }`.
3. Maneja sus casos límite: stock insuficiente → 400, cantidad ≤ 0 → 422, inexistente → 404, sin token → 401, sin permiso → 403.
4. Se probó con `backend/ejemplos-api.http` o Postman, incluyendo **al menos un caso de error**.
5. `npm test` pasa, con pruebas nuevas si la historia cambió una regla de negocio.
6. `npm run build` compila y la pantalla se probó en el navegador, en escritorio y en móvil.
7. No rompe lo que ya funcionaba: `GET /products`, `GET /customers` y `POST /sales` responden igual.
8. PR revisado, CI en verde, mergeado sin conflictos y documentación actualizada si cambió algo relevante.

La misma lista está en el checklist de la [plantilla de PR](../../.github/pull_request_template.md), para marcarla en cada PR.

## Plan de validación

Requests para REST Client o Postman contra `http://localhost:5000/api`. Los ids (`<conchaId>`, `<jorgeId>`…) se toman de la respuesta de `GET /products` y `GET /customers`. Con una base recién sembrada (`npm run seed`): Concha cuesta $22 y tiene 21 en stock, y Jorge Ramírez tiene 10 compras previas (9 del seed más una venta de ejemplo).

### Historia 1 · Registrar una venta y mostrar el ticket ([#7](https://github.com/Luisillo-Pillo/Cafecito/issues/7))

**Caso feliz:** venta de 2 conchas sin cliente.

```http
POST /api/sales
Content-Type: application/json
X-User-Role: vendedor

{ "items": [{ "productId": "<conchaId>", "quantity": 2 }], "paymentMethod": "cash" }
```

Esperado: **201**, `subtotal` 44, `discountPercent` 0, `total` 44, `ticket.storeName` «Cafecito Feliz». Después, `GET /api/products/<conchaId>` muestra el stock 2 unidades más bajo.

**Caso de error:** pedir más de lo que hay.

```http
POST /api/sales
Content-Type: application/json
X-User-Role: vendedor

{ "items": [{ "productId": "<conchaId>", "quantity": 999 }] }
```

Esperado: **400** «Stock insuficiente», `details[0].field` = `items[0].quantity`, y el stock **no cambia**.

**Caso de error:** cantidad 0 → **422** «Validación fallida».

### Historia 2 · Aplicar descuento por compras previas ([#10](https://github.com/Luisillo-Pillo/Cafecito/issues/10))

**Caso feliz:** venta de 1 concha a Jorge Ramírez (10 compras previas).

```http
POST /api/sales
Content-Type: application/json
X-User-Role: vendedor

{ "customerId": "<jorgeId>", "items": [{ "productId": "<conchaId>", "quantity": 1 }] }
```

Esperado: **201**, `discountPercent` 15, `discountAmount` 3.3, `total` 18.7. Después, `GET /api/customers/<jorgeId>` muestra `purchasesCount` 11.

**Caso de error:** cliente que no existe.

```http
POST /api/sales
Content-Type: application/json
X-User-Role: vendedor

{ "customerId": "000000000000000000000000", "items": [{ "productId": "<conchaId>", "quantity": 1 }] }
```

Esperado: **400** «Cliente no encontrado» y no se guarda la venta.

### Historia 3 · Registrar clientes ([#8](https://github.com/Luisillo-Pillo/Cafecito/issues/8))

**Caso feliz:**

```http
POST /api/customers
Content-Type: application/json
X-User-Role: vendedor

{ "name": "Mariana López", "phoneOrEmail": "mariana@correo.com" }
```

Esperado: **201** con `id` y `purchasesCount` 0.

**Caso de error:** el mismo correo otra vez → **400** «El cliente ya existe», con `existingCustomerId`.

**Caso de error:** `{ "name": "M", "phoneOrEmail": "5512345678" }` → **422** con los campos `name` y `phoneOrEmail` (el teléfono debe empezar con +).

**Caso de error:** sin `X-User-Role` ni token → **401**.

## Cómo se automatizó

Además de la validación manual, cada caso está cubierto por pruebas que corren en el CI:

- **Unitarias** (`backend/test/discount.test.js`): los 4 niveles de descuento.
- **Integración** (`backend/test/api.test.js`): contrato, casos límite, ventas simultáneas y permisos.
- **Extremo a extremo** (`e2e/`): venta a cliente VIP con ticket, venta rechazada por stock agotado y alta de producto por el administrador.
