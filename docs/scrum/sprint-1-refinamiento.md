# Sprint 1 · Historias refinadas

Se refinaron las 5 historias con más riesgo o más reglas de negocio. Cada criterio es medible: dice el dato de entrada, la acción y un resultado que se puede comprobar (un número, un código HTTP o un texto en pantalla). Las otras 5 historias también tienen sus criterios en su issue.

## 1. Registrar una venta y mostrar el ticket · [#7](https://github.com/Luisillo-Pillo/Cafecito/issues/7)

Como vendedor quiero cobrar la cuenta y ver un ticket para entregarle el comprobante al cliente.

- **Dado que** el carrito tiene 2 conchas y quedan 25 en stock, **cuando** cobro, **entonces** la venta se guarda (201), el stock de concha queda en 23 y aparece un ticket con «Cafecito Feliz», la fecha y el total.
- **Dado que** pido 3 brownies y solo queda 1, **cuando** cobro, **entonces** la venta se rechaza completa (400 «Stock insuficiente»), el stock no cambia y veo el mensaje «Solo quedan 1 de Brownie y la cuenta pide 3.».
- **Dado que** la cuenta lleva una cantidad de 0, **cuando** se envía, **entonces** la API responde 422 y no se guarda nada.

## 2. Aplicar descuento por compras previas · [#10](https://github.com/Luisillo-Pillo/Cafecito/issues/10)

Como vendedor quiero que el sistema aplique el descuento según las compras previas del cliente para premiar su lealtad sin calcularlo a mano.

- **Dado que** el cliente tiene 0, 2, 5 o 9 compras previas, **cuando** registro una venta de $100, **entonces** el descuento es 0 %, 5 %, 10 % o 15 % y el total es $100, $95, $90 u $85.
- **Dado que** vendo sin cliente, **cuando** registro la venta, **entonces** `discountPercent` es 0 y el `purchasesCount` de ningún cliente cambia.
- **Dado que** un cliente compra, **cuando** se guarda la venta, **entonces** su `purchasesCount` sube exactamente en 1.

## 3. Registrar clientes · [#8](https://github.com/Luisillo-Pillo/Cafecito/issues/8)

Como vendedor quiero registrar a un cliente con nombre y teléfono o correo para identificarlo en sus próximas compras.

- **Dado que** escribo «Ana Torres» y «ana@correo.com», **cuando** guardo, **entonces** el cliente se crea (201) con `purchasesCount` en 0.
- **Dado que** «ana@correo.com» ya está registrado, **cuando** intento registrarlo otra vez, **entonces** recibo 400 «El cliente ya existe» con el id del cliente existente (`existingCustomerId`), y no se crea un duplicado.
- **Dado que** el nombre tiene 1 letra o el contacto no es un correo ni un teléfono con +, **cuando** guardo, **entonces** recibo 422 con el campo que falló.

## 4. Crear productos · [#11](https://github.com/Luisillo-Pillo/Cafecito/issues/11)

Como administrador quiero dar de alta productos con nombre, precio y stock para que estén disponibles en la venta.

- **Dado que** lleno «Galleta de avena», precio 18 y stock 12, **cuando** guardo, **entonces** el producto se crea (201) y aparece al buscarlo en el punto de venta.
- **Dado que** el precio es 0 o el stock es -1 o 2.5, **cuando** guardo, **entonces** recibo 422 y no se crea.
- **Dado que** soy vendedor, **cuando** intento crear un producto por la API, **entonces** recibo 403.

## 5. Iniciar sesión como administrador · [#13](https://github.com/Luisillo-Pillo/Cafecito/issues/13)

Como administrador quiero entrar con correo y contraseña para que solo yo pueda gestionar los productos.

- **Dado que** escribo el correo y la contraseña correctos, **cuando** inicio sesión, **entonces** recibo un token válido por 8 horas y veo las pestañas Productos y Administradores.
- **Dado que** la contraseña es incorrecta, **cuando** inicio sesión, **entonces** veo «Correo o contraseña incorrectos» (401) sin saber si el correo existe.
- **Dado que** fallé 5 veces seguidas con el mismo correo, **cuando** lo intento otra vez, **entonces** recibo 429 y debo esperar 15 minutos.
