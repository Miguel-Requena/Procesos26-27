# P22 · Planificar rutas y asignar recursos

Administración planifica desde la base de Yecla, elige fecha, camión y conductor disponibles y añade solicitudes aceptadas en el orden de entrega. Puede subir, bajar o quitar paradas antes de guardar. El itinerario conserva las direcciones, contactos y mercancía de cada solicitud, la matrícula y la cuenta del conductor tal como estaban al planificar.

La fecha no puede ser anterior a hoy en Madrid. Una ruta contiene entre 1 y 100 solicitudes distintas. Las solicitudes antiguas sin datos completos de entrega requieren revisión antes de planificar. El servidor impide recursos inactivos, no disponibles, de otra sede o con cuenta de conductor revocada. No infiere capacidad de carga a partir de bultos: la capacidad declarada y las unidades de mercancía no permiten convertir automáticamente la carga.

Una solicitud solo puede estar en una ruta activa. Un vehículo y una cuenta de conductor solo pueden reservarse una vez por fecha. Crear la ruta y pasar todas sus solicitudes de aceptada a planificada es una operación atómica. Si falla una validación o hay conflicto, no cambia ninguna solicitud ni se guarda la ruta parcial. Cada solicitud conserva historial y aumenta su revisión.

MongoDB usa transacciones con lectura snapshot y escritura majority, índices únicos para reservas de vehículo, conductor y solicitudes en rutas activas. Las escrituras de coordinación en los recursos y la cuenta detectan cambios concurrentes de disponibilidad. Requiere un replica set, como MongoDB Atlas; CI configura un replica set local desechable. SQLite aplica una transacción inmediata y tablas de reservas con restricciones únicas. No existe modificación o cancelación de rutas en P22; la liberación de reservas al finalizar o cancelar se implementará con ese ciclo de vida.

API exclusiva de administración:

- POST /api/administracion/rutas: fecha, sede Yecla, vehiculoId, conductorRecursoId y solicitudes (identificadores en orden).
- GET /api/administracion/rutas/:id: itinerario completo.
- GET /api/rutas conserva los permisos existentes y permite al conductor ver el resumen de sus rutas asignadas.

Pruebas: validaciones, permisos, revocación, orden, conservación del itinerario, recursos por fecha, conflictos concurrentes y rollback. La integración con MongoDB comprueba transacciones concurrentes y persistencia entre procesos. Verificación visual local con dos solicitudes ficticias: selección, reordenación, guardado, estados planificados y consulta del itinerario.

## Corrección de guardado y nombres de conductor

Guardar planificación incorpora al final la solicitud que quede seleccionada, aunque no se haya pulsado Añadir parada. Los errores se muestran también junto al botón y reciben el foco. Las solicitudes sin dirección muestran Datos de entrega pendientes; el servidor identifica la solicitud incompleta al rechazar su planificación.

Administración puede completar Nombre del conductor en el catálogo de recursos. Ese nombre se utiliza en el selector y se conserva en el itinerario al planificar. Los registros antiguos muestran Nombre pendiente hasta completarlo; el nombre no se deduce del correo. La cuenta vinculada sigue identificándose por correo al gestionar el recurso. Se mantienen compatibles los recursos existentes y las rutas anteriores.
