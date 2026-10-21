## Historia

<!-- Ej: Como vendedor quiero aplicar el descuento del cliente recurrente al cobrar para premiar su lealtad -->

Rama: `feature/...` → `develop`

## Qué cambia

-

## Cómo se probó

<!-- Requests concretos y resultado esperado. Ej: POST /api/sales con cliente de 2 compras → 201, discountPercent 5 -->

- [ ] Caso feliz:
- [ ] Caso de error (400 / 401 / 403 / 404 / 422):

## Definition of Done

- [ ] Cumple todos los criterios de aceptación de la historia
- [ ] Respeta el contrato de API (formato de listas y de errores)
- [ ] Maneja los edge cases que le aplican
- [ ] Probado con `backend/ejemplos-api.http` o Postman, con al menos un caso de error
- [ ] `npm test` pasa
- [ ] `npm run build` compila y la pantalla se probó en navegador (escritorio y móvil)
- [ ] No rompe `GET /products`, `GET /customers` ni `POST /sales`
- [ ] CI en verde y README / Prompt_Inicial_Claude.md actualizados si aplica
