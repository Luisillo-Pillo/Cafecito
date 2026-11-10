# Sprint 3 · Tablero, flujo de trabajo y ramas

Las reglas completas del equipo están en [CONTRIBUTING.md](../../CONTRIBUTING.md). Este documento resume lo que pide el Sprint 3.

## Tablero inicial

Tablero en **GitHub Projects**, conectado al repositorio: cada tarjeta es un issue y cada PR se liga a su tarjeta con `Closes #N`.

| To Do (Backlog) | In Progress | In Review | Done |
| --- | --- | --- | --- |
| Historias listas, con criterios de aceptación y story points | Lo que se está programando ahora (**máximo 2 por persona**) | PR abierto esperando revisión, CI en verde | PR aprobado, mergeado y cumple la Definition of Done |

Tablero inicial: las 10 historias (#5 a #14) en **To Do**, con story points, sprint y responsable.

Automatizaciones activadas en el tablero:
- Un issue nuevo entra solo a **To Do**.
- Un PR mergeado o un issue cerrado mueve la tarjeta a **Done**.

## Flujo de una historia

```
To Do ──(creo la rama feature/…)──▶ In Progress ──(abro PR a develop)──▶ In Review ──(aprobado + CI verde + merge)──▶ Done
                                         ▲                                    │
                                         └──────── cambios pedidos ───────────┘
```

1. Tomo una historia de **To Do** respetando el WIP y la muevo a **In Progress**.
2. Creo la rama desde `develop` actualizado: `feature/registrar-venta-con-descuento`.
3. Hago commits pequeños con prefijo (`feat:`, `fix:`, `test:`, `docs:`).
4. Pruebo local (`npm test`, `npm run build`, los requests de `ejemplos-api.http`) y abro el PR con la plantilla. La tarjeta pasa a **In Review**.
5. El CI corre solo. Si falla, se corrige antes de pedir revisión.
6. Otra persona revisa. Si trabajo solo, me reviso al día siguiente con el checklist del PR.
7. Con aprobación y CI en verde, hago merge a `develop` y borro la rama. La tarjeta pasa a **Done**.

## Qué pasa con los conflictos de merge

1. Traigo lo último de `develop` a mi rama (`git merge develop`).
2. Resuelvo cada conflicto entendiendo los dos cambios; si es código de otra persona, le pregunto antes de decidir.
3. Vuelvo a correr pruebas y build y pruebo la historia otra vez.
4. Subo el commit del merge; el CI vuelve a correr y el PR regresa a revisión.
5. Para prevenirlos: PRs pequeños, una historia por rama y actualizar la rama seguido.

## Estrategia de ramas

```
main      ← estable; solo recibe PRs desde develop al cerrar un sprint
└── develop   ← integración del sprint; solo recibe PRs
    ├── feature/eliminar-administradores
    ├── feature/pruebas-e2e
    └── docs/entregables-scrum
```

- Nunca push directo a `main` ni a `develop`.
- Una historia = una rama = un PR.
- Prefijos: `feature/`, `fix/`, `docs/`, `test/`.

## Reglas de WIP

- Máximo **2 historias en In Progress** por persona; el tablero marca la columna en rojo si se pasa.
- Antes de empezar una tercera, termino una o la paso a revisión.
- Una tarjeta bloqueada se marca con un comentario y no cuenta como avance.

## Definition of Done

La DoD de 8 puntos está en [CONTRIBUTING.md](../../CONTRIBUTING.md#definition-of-done) y en el checklist de la [plantilla de PR](../../.github/pull_request_template.md); se detalla en el [Sprint 4](sprint-4-validacion.md).
