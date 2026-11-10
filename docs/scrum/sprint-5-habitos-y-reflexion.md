# Sprint 5 · Hábitos, pipeline y reflexión

## Checklist de hábitos (8)

- [ ] **Una historia, una rama, un PR.** Antes de escribir código creo `feature/…` desde `develop` actualizado.
- [ ] **Commits pequeños con prefijo.** `feat:`, `fix:`, `test:`, `docs:`; un commit explica un solo cambio.
- [ ] **Pruebo antes de subir.** `npm test`, `npm run build` y los requests de la historia en `ejemplos-api.http`, incluyendo un caso de error.
- [ ] **Una regla nueva lleva su prueba.** Si cambia una regla de negocio, agrego o actualizo su prueba automática en el mismo PR.
- [ ] **No mergeo en rojo.** Si el CI falla, lo arreglo antes de pedir revisión.
- [ ] **Respeto el WIP.** Máximo 2 tarjetas en In Progress; muevo la tarjeta en el tablero cuando cambia su estado, no al final.
- [ ] **Los secretos no van al repositorio.** Contraseñas, cadenas de conexión y tokens solo en `.env`; reviso el diff antes de cada commit.
- [ ] **La documentación avanza con el código.** README, `Prompt_Inicial_Claude.md` y `CONTRIBUTING.md` se actualizan en el mismo PR que el cambio.

## Pipeline de CI

Archivo: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). Corre en GitHub Actions en cada push a `feature/**`, `develop` y `main`, y en cada Pull Request hacia `develop` o `main`. Usa un MongoDB 7 desechable como servicio, nunca la base de Atlas.

| Paso | Qué hace | Si falla |
| --- | --- | --- |
| 1. Checkout y Node.js 20 | Descarga el código y prepara Node con caché de npm | — |
| 2. `npm ci` | Instala exactamente las versiones de `package-lock.json` | Dependencia rota o lockfile desactualizado |
| 3. `npm test` | Pruebas unitarias (regla de descuento) y de integración de la API | Se rompió una regla o el contrato |
| 4. `npm run build` | Compila el frontend con Vite | Error de sintaxis o import roto |
| 5. Smoke test | Levanta la API real y prueba `GET /api/products`, `POST /api/customers`, una venta y los permisos | La API no arranca o un endpoint clave falló |
| 6–7. Pruebas E2E | Instala Chromium y recorre la aplicación en un navegador con Playwright | Un flujo de usuario se rompió; se sube el reporte como artefacto |

Si cualquier paso falla, el pipeline se detiene y el PR no se mezcla. El despliegue solo ocurre desde `main`, que recibe cambios únicamente por PR desde `develop`.

## Reflexión personal

Lo que mejor funcionó fue escribir primero las reglas de negocio con sus pruebas. La regla de descuento y la venta todo-o-nada tienen pruebas desde el principio. Cuando más tarde cambié la estructura del código, las pruebas me avisaron de inmediato si algo se rompía. La prueba de dos ventas simultáneas me enseñó que el stock puede quedar negativo aunque cada venta, por separado, esté bien validada.

**Mi error:** durante los primeros sprints trabajé directo en `develop`, con commits grandes como «Segunda revisión general» y sin una rama ni un PR por historia. El código funcionaba, pero el historial no permite saber qué commit corresponde a qué historia. Además, si algo se rompía, tenía que deshacer mucho más de lo necesario. El tablero también lo armé después de programar, así que no me sirvió para planear, solo para documentar.

**Qué cambié:** desde el Sprint 3 cada cambio entra por una rama `feature/` o `docs/` con su PR hacia `develop`, sus pruebas y el CI en verde, y la tarjeta se mueve en el tablero en cada paso. También aprendí a no dar por buena una entrega solo porque «funciona en mi máquina»: el pipeline corre en un equipo limpio, y ahí aparecen errores que localmente no se ven.

**Para el siguiente proyecto:** armar el tablero y las ramas el primer día, antes de escribir código, y entregar el backlog completo desde el Sprint 0. En este proyecto entregué solo 8 historias y obtuve 72/100.
