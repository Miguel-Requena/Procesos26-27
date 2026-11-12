# P18 · Consultar y cancelar mis solicitudes de transporte

Implementación de T44 (listado y detalle del cliente) y T45 (cancelación de solicitudes pendientes).

## Criterios y comportamiento

1. El cliente consulta solo sus solicitudes. El listado muestra referencia, origen, destino, fecha y estado. «Ver detalle» añade fabricante, contacto de recogida, mercancía, observaciones e historial. Un destino aún no planificado se identifica como pendiente: P17 no solicita un destino al crear la recogida.
2. Se conservan el estado vacío del listado y los avisos de carga y error. El detalle permite volver a consultar mediante «Actualizar detalle» y muestra errores sin conservar datos de una solicitud anterior.
3. Solo el cliente propietario puede cancelar, con confirmación explícita. Los estados admitidos son `pendiente_recogida` y el estado legado `pendiente`. Los estados planificados, asignados, en tránsito, finalizados, cancelados y desconocidos se rechazan. El servidor comprueba el estado en la actualización atómica, aunque el navegador tenga información antigua.
4. Cancelar cambia el estado a `cancelada`, guarda `canceladaEn` y añade una entrada al historial con el estado anterior y la fecha. No se borra el registro ni se modifica su mercancía. Repetir la cancelación devuelve 409 y no duplica el historial. Repetir el alta original con la misma clave de idempotencia devuelve la solicitud ya cancelada.
5. Tras cancelar se actualizan el listado y los indicadores. «Actualizar detalle» recupera los cambios posteriores. Si la cancelación encuentra un conflicto de estado, se recargan listado y detalle.

## API y permisos

- `GET /api/solicitudes`: resumen filtrado por el cliente de la sesión.
- `GET /api/solicitudes/:id`: detalle completo del cliente propietario. El acceso administrativo previo de P16 conserva su proyección de resumen; P18 no implementa revisión administrativa (P19).
- `POST /api/solicitudes/:id/cancelacion`: sin campos de negocio; propietario y transición se obtienen y validan en el servidor. Respuesta 200 con `solicitud`; 401 sin sesión válida; 403 para otros perfiles; 404 para registro ajeno, inexistente o identificador inválido; 409 si no está pendiente.

Las respuestas excluyen propietario, claves de idempotencia, huellas y campos internos. Los valores se presentan como texto, sin interpretar HTML.

## Persistencia y Cloud Run

MongoDB Atlas actualiza estado e historial en una única operación condicional sobre `id`, `clienteId` y estado pendiente. No depende de la memoria o del disco de Cloud Run. Las solicitudes antiguas se conservan y siguen siendo consultables aunque no tengan todos los datos de P17. SQLite replica el contrato y usa una transacción para las pruebas.

## Verificación

Pruebas HTTP de detalle completo, registros ajenos, roles y sesiones revocadas; estados no cancelables, cancelación concurrente, persistencia entre procesos, conservación de historial e idempotencia del alta. La prueba de integración con MongoDB real comprueba el consumo concurrente y que no se borra la solicitud. Pruebas de navegador con datos ficticios en escritorio y móvil para detalle, confirmación, mantener solicitud, cancelación y conflicto con planificación.
