# Portal de Reservas del Quincho

Aplicación web para organizar el uso del quincho o salón común de un edificio. Centraliza las reservas, evita superposiciones y permite a la administración gestionar residentes, reglas y disponibilidad desde un único panel.

## Qué incluye

- Calendario de disponibilidad visible sin iniciar sesión.
- Dos turnos diarios configurados: mediodía (12:00 h) y noche (20:00 h).
- Registro e inicio de sesión para residentes mediante DNI, departamento y contraseña.
- Registro con nombre completo, email y teléfono de contacto.
- Reserva y cancelación de turnos según el plazo definido por la administración.
- Prioridad mensual: la primera reserva confirmada de cada residente tiene prioridad; las siguientes se registran en lista de espera.
- Reglamento visible y aceptación obligatoria antes de registrarse o reservar.
- Panel exclusivo para administración: reservas, asistencia, multas, residentes, contraseñas, reglamento, plazos, exportación mensual a Excel y registro de actividad.
- Diseño adaptable para computadora, tablet y celular.
- PWA instalable: el portal explica los pasos correctos desde Safari en iPhone/iPad y Chrome en Android.
- Notificaciones para multas y para residentes anotados en lista de espera cuando se libera ese turno.

## PWA y notificaciones

El botón **Instalar app** aparece dentro del portal. En iOS muestra los pasos de Safari: Compartir → **Agregar a pantalla de inicio**. En Android usa el diálogo nativo de Chrome cuando está disponible y, si no, explica cómo agregarla desde el menú.

Para activar los avisos, el residente inicia sesión y toca el ícono de campana. La autorización se solicita solamente en ese momento. Las multas y los turnos liberados se guardan en el portal; con la configuración VAPID también llegan como notificaciones aunque la app esté cerrada.

Antes de desplegar esta versión, aplicá el esquema actualizado y definí estas variables de entorno, usando un correo de contacto real:

```sh
npx web-push generate-vapid-keys
VAPID_SUBJECT=mailto:administracion@tu-edificio.com
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

No publiques la clave privada. Las nuevas tablas `notifications` y `push_subscriptions` están incluidas en `db/schema.sql`.

## Guía rápida para residentes

1. Abrí el enlace del portal.
2. En el calendario, elegí el día y verificá que el turno de mediodía o noche figure como **Disponible**.
3. Si es tu primera vez, seleccioná **Crear una cuenta**, completá tus datos y aceptá el reglamento. Si ya tenés una cuenta, elegí **Ingresar**.
4. Seleccioná **Reservar mediodía** o **Reservar noche**, revisá el resumen y aceptá el reglamento.
5. Confirmá la reserva. Podés consultarla desde **Mis reservas**.

Para cancelar, ingresá a **Mis reservas** y presioná **Cancelar reserva**. La opción solo aparece mientras se cumpla el plazo de cancelación configurado por la administración.

## Guía rápida para administración

Iniciá sesión con la cuenta de administración y abrí **Administración** en el menú lateral.

- **Reservas:** consultá, buscá y filtrá reservas; creá una reserva en nombre de un residente; bloqueá un turno; cancelá o desbloqueá una operación; exportá el listado a CSV.
- **Residentes:** buscá usuarios, corregí datos, suspendé o reactivá cuentas, cambiá permisos y restablecé contraseñas.
- **Reglamento y plazos:** editá las normas que ven los residentes, definí la anticipación máxima (1 a 365 días) y el límite de cancelación (0 a 168 horas).
- **Actividad:** revisá las últimas 100 acciones realizadas en el portal.
- **Asistencia y multas:** marcá quién asistió y enviá una multa con descripción asociada a su reserva. El registro aparece en la exportación mensual de Excel.

Al restablecer una contraseña, asigná una contraseña temporal segura al residente. La persona deberá cambiarla al volver a ingresar.

## Entrega y puesta en marcha

Antes de habilitar el portal para residentes, la administración debería:

1. Ingresar con las credenciales iniciales entregadas por el proveedor.
2. Cambiar inmediatamente la contraseña temporal de administración.
3. Revisar y personalizar el reglamento, la anticipación de reserva y el plazo de cancelación.
4. Realizar una reserva de prueba y cancelarla para validar el flujo.
5. Compartir el enlace del portal y el mensaje de bienvenida incluido en [MANUAL_USUARIO.md](MANUAL_USUARIO.md).

> Las credenciales iniciales se entregan de forma privada. No las publiques en este archivo ni las envíes a grupos abiertos.

## Manual completo y mensaje para compradores

Encontrá las instrucciones detalladas y un texto listo para copiar y enviar en [MANUAL_USUARIO.md](MANUAL_USUARIO.md).

## Soporte

Para problemas de acceso, el residente debe contactar a la administración del edificio. La administración puede restablecer la contraseña desde el panel de Residentes.
