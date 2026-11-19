# Guía de evaluación del Sprint 2

Usar la URL del [README](../README.md) y las cuentas de cliente, administración y conductor entregadas por canal privado. No usar datos personales reales. Registrar fecha, versión desplegada, entradas, resultado esperado/observado y evidencia. Esta guía propone pasos; no presenta como ejecutadas las pruebas que haga el evaluador.

## Documentación y cinco requisitos

La [lista de RF](REQUISITOS-SPRINT-2.md) responde a la pregunta 4; las [decisiones](DECISIONES-DISENO.md) permiten revisar motivos y alternativas. Los informes P18 a P24 amplían modelo y contratos. Revisar tres PR del Sprint 2 con cambios de código y comprobar en al menos dos cambios de README o documentación.

### RF-10

Cliente crea una solicitud con fabricante, recogida, fecha desde hoy en Madrid, mercancía y todos los datos de entrega. Se muestra referencia y persiste una sola solicitud. Un reintento con la misma clave y contenido no duplica.

### RF-12

Cliente cancela otra solicitud propia pendiente, confirma y consulta historial. Repetir devuelve conflicto. Una aceptada o ajena no se cancela.

### RF-13

Administración filtra, acepta la primera solicitud y rechaza otra con motivo. Cliente consulta el motivo. No se revisa de nuevo una solicitud que dejó de estar pendiente.

### RF-16

Administración usa vehículo y recurso conductor activos/disponibles en Yecla; añade dos solicitudes aceptadas completas, ordena y guarda. Ambas quedan planificadas; un recurso reservado ese día o una solicitud ya planificada provoca conflicto sin cambios parciales.

### RF-17

Conductor asignado abre itinerario, inicia, registra una incidencia con motivo, resuelve como entregada y entrega la última parada. Ruta completada, historial coherente y recursos liberados. Otro conductor no puede abrir el detalle.


En preguntas 8/9 contar solo los RF probados de principio a fin. Anotar los fallos concretos, no convertir la existencia de un test en una prueba manual superada.

## Sesión y persistencia

Entrar, recargar y confirmar que la sesión continúa. Crear una solicitud, cerrar sesión y cerrar la ventana; volver a entrar y comprobar datos y estado. Tras logout no debe poder consultarse la API privada con la sesión anterior. No confundir recarga con reinicio del servidor. Las pruebas entre procesos y MongoDB están en P24 y CI.

## Dos usuarios sin recargar

Usar dos perfiles de navegador con cuentas distintas (dos pestañas del mismo perfil comparten cookie). Dejar el panel de cliente abierto, visible y sin editar, mientras administración acepta o rechaza su solicitud. Esperar cinco segundos más el tiempo de red: el estado cambia sin F5 ni pulsar Actualizar. Repetir dejando el panel del conductor abierto mientras administración le asigna una ruta; después el cliente observa el resultado de una entrega.

El sondeo se pausa en pestañas ocultas, mientras hay un diálogo abierto o un campo en edición. Cerrar el diálogo o terminar de editar permite el siguiente ciclo. Un detalle abierto y los selectores de planificación conservan su contenido y disponen de actualización explícita. Comprobar que no se pierden formularios, filtros ni claves de reintento. Desconectar la red: no mostrar éxito falso, conservar la última vista y reintentar la actualización. Cerrar sesión con una lectura pendiente no debe volver a pintar datos privados.

## Validaciones y respuestas HTTP

Una incidencia sin motivo, fecha pasada o solicitud no elegible debe dar un mensaje claro. Con herramientas de desarrollo, copiar una petición válida de los datos ficticios y modificar un solo campo: fecha pasada, revisión obsoleta o identificador ajeno. Esperar 400, 401, 403, 404 o 409 según el caso y comprobar ausencia de cambios al volver a consultar. No probar contra datos operativos ajenos.

Revisar las respuestas de sesión, listados y detalles: sin hashes, tokens, conexiones ni información de otras solicitudes. Los contactos autorizados de un itinerario no son un fallo de privacidad; un cliente no debe recibir otras paradas de esa ruta. Buscar el mensaje de error en la lógica y revisar que `fetch` solo aparece en comunicación.

## Evidencias y límites

P24 distingue las pruebas SQLite, MongoDB y visuales históricas. Para esta revisión ejecutar `npm test` y guardar su resultado real; MongoDB se omite localmente sin `MONGODB_TEST_URL` y debe comprobarse en CI. Correo y Google requieren pruebas reales separadas. No afirmar compatibilidad móvil sin comprobar registro, solicitud, planificación y entregas en un ancho móvil y sin desbordamiento que oculte acciones.

La demo `node servidor/demo-p24.cjs` es local y desechable; sus credenciales están en P24 y no sirven para producción. La demo prepara solicitudes ya planificadas: para evaluar RF-10/RF-13/RF-16 hay que recorrer también alta, revisión y planificación. La valoración de usabilidad y legibilidad requiere revisar las pantallas y el código, no solo esta guía.
