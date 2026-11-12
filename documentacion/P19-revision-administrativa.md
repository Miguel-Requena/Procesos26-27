# P19 · Revisar solicitudes desde administración

Implementación de T54 (revisión y transiciones administrativas) y T55 (listado con filtros y permisos).

## Criterios de aceptación

1. El panel de administración lista solicitudes de todos los clientes y permite abrir su detalle completo. Los filtros se aplican en el servidor: estado y rango inclusivo de fecha solicitada (`desde`, `hasta`). Se validan fechas reales, orden del intervalo y estados permitidos. Hay carga, errores, actualización y resultado vacío con opción de limpiar filtros.
2. Permite asignar `Yecla`, `Rubí` o `Palma de Mallorca` como sede operativa. La sede es independiente del destino de transporte. Puede asignarse cuando está pendiente o aceptada. La aceptación puede realizarse con o sin sede; también se permite enviarla junto a la revisión.
3. Las solicitudes `pendiente` o `pendiente_recogida` pueden pasar a `aceptada` o `rechazada`. Rechazar exige motivo no vacío de hasta 1000 caracteres, visible en el detalle del cliente y en el historial. No se puede aceptar una cancelada, rechazar una ya aceptada ni revisar una planificada o en tránsito. La planificación y posteriores estados corresponden a P22/P23.
4. Cada operación valida el estado previo y el número de revisión. Guarda en el historial fecha de servidor, acción, estado anterior y resultante, responsable de administración y cambios de sede o motivo. La versión incrementa atómicamente. Una revisión antigua, duplicada o en conflicto responde 409 y la interfaz recarga los datos.
5. Los endpoints administrativos verifican sesión y perfil en cada petición. Clientes y conductores reciben 403; una sesión no válida recibe 401. Los cambios de rol o eliminación se aplican a sesiones abiertas. El cliente conserva su propio detalle de P18, con sede, motivo e historial, sin ids internos de administración.

## API

- `GET /api/administracion/solicitudes?estado=pendiente_recogida&desde=2099-12-01&hasta=2099-12-31`
- `GET /api/administracion/solicitudes/:id`: detalle completo y `revision` actual.
- `POST /api/administracion/solicitudes/:id/revision`: JSON con `accion` (`asignar_sede`, `aceptar`, `rechazar`), `revision`, `sedeOperativa` opcional (obligatoria para `asignar_sede`) y `motivo` obligatorio al rechazar.

200 devuelve datos públicos; 400 indica entrada inválida, 401/403 acceso no autorizado, 404 registro inexistente y 409 conflicto de estado o revisión. El responsable, la fecha, la transición y el estado resultante se fijan en el servidor. La API no admite sustituirlos mediante el cuerpo de la petición.

## Persistencia y concurrencia

MongoDB Atlas actualiza estado, sede, motivo, revisión e historial en una sola operación con filtro de estado y versión. La cancelación P18 incrementa también la versión, por lo que compite correctamente con una revisión administrativa. SQLite reproduce el comportamiento mediante transacciones para pruebas. La aceptación o rechazo no borra datos ni altera la clave de idempotencia del alta. No requiere memoria ni disco persistente en Cloud Run.

## Validación

Pruebas HTTP de permisos, filtros, fechas inválidas, tres sedes, motivo obligatorio, visibilidad al propietario, revocación de rol, manipulación de responsable, revisiones concurrentes y conflictos con cancelación. Integración MongoDB para sede, auditoría, motivos literales que comienzan por `$`, revisión concurrente y persistencia entre procesos. Navegador en escritorio y móvil con datos ficticios para filtros enviados al servidor, motivo obligatorio, sede, rechazo, actualización por conflicto y paneles restringidos por perfil.
