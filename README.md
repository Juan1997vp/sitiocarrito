# Ritmo Sport

Tienda deportiva en español, adaptable a móviles y escritorio. La aplicación incluye un catálogo de demostración de 92 artículos (12 zapatos, 9 pantalonetas, 25 camisetas, 24 gorras y 22 accesorios), búsqueda y filtros, detalle de producto, variantes, favoritos, carrito persistente, cupones, checkout, inventario, pedidos y panel administrativo. El catálogo público muestra solo productos con fotografía local disponible; los modelos sin foto y las repeticiones de una misma imagen se excluyen.

> **Importante:** es una demostración técnica. Los productos, marcas, vendedores, precios, existencias, reseñas, pedidos e informes incluidos son ejemplos ficticios. El modo de pago predeterminado no cobra dinero. No uses esta aplicación tal cual para procesar ventas reales.

## Ejecutar localmente

Requisitos: Node.js 20 o posterior.

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Abre <http://localhost:3000>. Para usar solo la demostración no hacen falta credenciales. El servidor guarda pedidos e inventario en `.data/store.json`, creado automáticamente; los perfiles, favoritos y carrito de cliente de demostración se guardan en el navegador. Las ventas y reservas actualizan el inventario del servidor y quedan visibles en la tienda y en el panel administrativo, que se sincronizan automáticamente mientras están abiertos. No borres ese archivo mientras la tienda está ejecutándose.

## Administración

El panel se encuentra en <http://localhost:3000/admin>. Sus API validan un token firmado en una cookie `HttpOnly`, `SameSite=Strict`, con expiración y límite de intentos. Las rutas administrativas requieren iniciar sesión; no existe una contraseña predeterminada.

1. En `.env`, define `ADMIN_USERNAME`, un `ADMIN_PASSWORD` largo y único (recomendado: al menos 16 caracteres) y un `ADMIN_SESSION_SECRET` aleatorio de al menos 32 bytes. Si no defines `ADMIN_USERNAME`, se conserva la autenticación anterior basada en contraseña.
2. Opcionalmente define `STAFF_PASSWORD` para un rol de personal con acceso a pedidos, soporte e inventario, sin administración de productos o cupones.
3. Reinicia `npm start` e inicia sesión con el usuario y la contraseña configurados.

Puedes generar un secreto local con Node:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

El panel demo permite crear y ocultar productos, editar precio, ajustar inventario por color/talla sin aceptar saldo negativo, gestionar cupones, actualizar estados de pedidos/pagos y guías, atender solicitudes demo y exportar reportes CSV. El borrado de productos es un ocultamiento reversible; los pedidos conservan su copia histórica. Los datos se guardan en un JSON local, no en una base de datos transaccional.

## Configuración de pagos

### Simulación

Es el modo predeterminado. El cliente puede escoger resultado aprobado, pendiente o rechazado; la pantalla indica que no se realiza ningún cobro. Los pedidos aprobados de simulación actualizan el inventario de demostración; los pendientes reservan unidades y se pueden cancelar desde la cuenta demo, liberándolas. Los pedidos rechazados no descuentan inventario. No introduzcas datos de tarjetas.

### Mercado Pago

Para pruebas reales con Mercado Pago Checkout Pro:

1. Configura credenciales de prueba en un entorno seguro.
2. Define `MERCADOPAGO_ACCESS_TOKEN` en el entorno del servidor. Nunca lo incluyas en HTML, JavaScript del navegador, capturas ni repositorio.
3. Define `BASE_URL` con el origen público HTTPS.
4. Para recibir cambios de estado, configura la URL `https://TU-DOMINIO/api/mercadopago/webhook` y su secreto en `MERCADOPAGO_WEBHOOK_SECRET`.
5. Prueba pagos, webhooks, estados y cancelaciones con la cuenta sandbox antes de considerar credenciales productivas.

El servidor vuelve a validar productos, variantes, cupones, dirección, precios e inventario; crea la preferencia y mantiene una reserva mientras el pago está pendiente. Un rechazo o fallo al crear la preferencia libera la reserva. La notificación consulta el pago directamente con Mercado Pago. La cancelación de pagos y los reembolsos reales requieren completar los procedimientos de la cuenta/proveedor.

## Google OAuth

El botón de Google informa que la integración no está activa. Define `GOOGLE_CLIENT_ID` y `GOOGLE_DOMAIN` para indicar que la configuración existe, y registra el dominio/orígenes y URI de retorno en Google Cloud. **Esta demo no implementa el flujo OAuth ni valida tokens**; esas variables no habilitan el acceso por sí solas. Añade un backend OAuth real, validación de `state`/`nonce`, sesiones seguras, política de privacidad y recuperación de cuentas antes de habilitarlo.

Las cuentas y contraseñas de demostración solo existen en `localStorage` del navegador. Aunque la contraseña se resume con SHA-256 antes de guardarla, esto no es autenticación de producción ni protege una cuenta entre dispositivos. La recuperación de contraseña es informativa.

## Catálogo, cobros y operaciones

- Categorías: 12 zapatos, 9 pantalonetas (5 para hombre y 4 para mujer), 25 camisetas (10 para hombre y 15 para mujer), 22 accesorios con fotografía y 24 gorras (16 para hombre y 8 para mujer).
- En la sección de categorías, los accesos por género y sus cantidades se generan a partir de los productos disponibles; los filtros de categoría, género, marca, talla y color muestran solo opciones existentes en la selección actual.
- Las tarjetas de categoría filtran y llevan al catálogo; cada producto se muestra una sola vez en los resultados. Las secciones de ofertas y novedades llevan al catálogo filtrado en lugar de duplicar tarjetas de producto.
- Filtros: texto, categoría, género, marca, precio máximo, talla, color, stock, calificación y orden por precio, popularidad, novedades o valoración.
- Ficha de producto en diálogo accesible: galería, talla/color, SKU, disponibilidad, descuento, guía de referencia y sugerencias. Las reseñas y calificaciones están marcadas como demostración.
- Las fotos de referencia de zapatos, pantalonetas, camisetas, gorras y accesorios se guardan localmente en `assets/products/`; no representan necesariamente cada SKU ficticio ni garantizan la autenticidad de una marca. Los 12 modelos de calzado añadidos tienen tallas 36–44; las nuevas pantalonetas y camisetas usan tallas de ropa acordes al género indicado; las gorras y los accesorios nuevos tienen talla única. Los productos añadidos tienen cuatro unidades iniciales por talla y precios de demostración editables desde el panel. Los créditos y licencias de las fotos descargadas están en `assets/products/ATTRIBUTION.txt`.
- Valores iniciales de envío e impuesto están centralizados en `catalog.js`: COP, impuesto ilustrativo del 19 %, tarifa estándar de $12.900, envío gratis desde $250.000 y alternativas demo. Confirma reglas tributarias y tarifas con profesionales/operadores antes de vender.
- Cupones iniciales: `RITMO10` y `BIENVENIDA`. Se pueden administrar desde el panel demo.
- Estados de pedido: recibido, pago pendiente, preparando, enviado, entregado, cancelado y devuelto. Estados de pago: pendiente, aprobado, rechazado y reembolsado.
- Las ventas, reportes CSV, clientes y notificaciones en esta demo no son datos comerciales reales. No se envían correos; las solicitudes de soporte se guardan en el archivo local.
- La política visible describe los límites de la demostración; reemplázala por términos, privacidad, cambios, devoluciones y tratamiento de datos revisados para tu operación.

## Variables de entorno

Copia `.env.example` y configura secretos únicamente en el servidor o en el almacén seguro del proveedor de despliegue. `.env` y `.data/` están excluidos de Git.

## Desplegar en Render

El archivo `render.yaml` configura un servicio web gratuito para ejecutar esta aplicación Node.js.

1. Sube este repositorio a GitHub y entra en <https://dashboard.render.com/>.
2. Crea una cuenta o inicia sesión, conecta GitHub y autoriza el acceso al repositorio `sitiocarrito`.
3. Selecciona **New** > **Blueprint**, elige el repositorio y confirma la creación del servicio.
4. Espera a que termine el despliegue y abre la URL `onrender.com` que muestra Render. La ruta `/api/health` permite comprobar que el servidor está activo.
5. El servicio inicia en modo de simulación. Para habilitar Mercado Pago, agrega `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` en **Environment** del servicio. Configura el webhook del proveedor en `https://TU-DOMINIO/api/mercadopago/webhook`; el servidor usa automáticamente la URL pública de Render para los enlaces de pago.
6. Para habilitar el panel administrativo, agrega `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` como variables del servicio. Genera una clave fuerte y única para cada secreto; no los guardes en GitHub.

El nivel gratuito puede suspender el servicio cuando está inactivo y su sistema de archivos no es persistente: los pedidos e inventario guardados en `.data/store.json` pueden perderse al reiniciar o desplegar. Esta configuración sirve para ejecutar y probar la demo, no para operar ventas reales. Antes de aceptar pagos reales, migra los datos a una base de datos persistente y completa los requisitos indicados en «Antes de producción».

## Antes de producción

Hace falta sustituir el almacenamiento JSON por una base de datos transaccional; implementar autenticación de clientes en servidor, verificación OAuth y recuperación por correo; completar los flujos de reembolso/devolución y expiración de reservas; configurar proveedor de envíos, correos, monitoreo y alertas; revisar impuestos, privacidad, seguridad, términos y accesibilidad; y realizar pruebas de concurrencia, carga, pagos y recuperación. El archivo local no está cifrado, no ofrece copias de seguridad ni está diseñado para múltiples instancias.
