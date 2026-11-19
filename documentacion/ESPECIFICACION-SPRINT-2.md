# Especificación vigente del Sprint 2 de TransDrakkar

Versión 1.0. Revisión documental del 19 de noviembre de 2026. Autor: Miguel Requena López. Esta especificación sustituye como referencia actual al borrador 0.1 del 5 de noviembre. Describe el comportamiento implementado y sus límites; la aceptación académica y los estados del tablero corresponden al responsable.

## Alcance y trazabilidad

El incremento conecta cliente, administración y conductor: solicitud de transporte de mobiliario, revisión, planificación desde la base de Yecla, ejecución y consulta de resultados. Conserva registro, confirmación, Google, sesiones y permisos del Sprint 1.

El backlog de cierre contiene P15, P16, P17, P19, P21, P22, P23 y P24: ocho PBI y 50 unidades de estimación visible. P18 no forma parte de ese backlog según la aclaración del autor. Consulta y cancelación siguen implementadas como RF-11/RF-12 por su trazabilidad previa. P24 es validación y documentación, no un RF independiente. Las unidades no se identifican automáticamente con horas. Las diferencias respecto de gráficos de DoneTonic se conservan explicadas en la memoria.

La lista de referencia para identificadores, estado y evidencias es REQUISITOS-SPRINT-2.md. Las decisiones D1 a D10 y sus alternativas están en DECISIONES-DISENO.md. GUIA-EVALUACION.md propone cinco RF y las pruebas manuales que debe ejecutar el revisor.

## Actores y permisos

El alta pública crea clientes pendientes de confirmación. El rol y la identidad proceden de la sesión del servidor. Administración habilita cuentas confirmadas como conductores y gestiona recursos, solicitudes y rutas. Habilitar el perfil conductor y crear el recurso operativo son operaciones distintas. Un conductor solo consulta y ejecuta las rutas asignadas; un cliente solo consulta sus solicitudes.

Las peticiones sin sesión devuelven 401; los perfiles sin permiso, 403. Un registro ajeno responde 404 igual que uno inexistente. La baja lógica o revocación de perfil tiene efecto en las siguientes peticiones, aunque la cookie todavía exista. No hay endpoint público de promoción a administrador.

## Solicitudes y revisión

RF-10 exige fabricante, dirección y contacto de recogida, fecha solicitada, mercancía y todos los datos de entrega: destinatario, dirección, localidad, código postal de cinco dígitos y contacto. Observaciones son opcionales. La fecha no es anterior a hoy en Europe/Madrid. El flujo logístico es fábrica en Yecla, base de Yecla y dirección de entrega indicada por el cliente.

El servidor fija propietario, identificador, referencia y estado pendiente_recogida. POST /api/solicitudes usa Idempotency-Key: 201 al crear, 200 al repetir la misma clave y contenido, 409 ante contenido incompatible. Los campos adicionales no conceden permisos ni permiten imponer estados.

RF-11 muestra detalle e historial propios. RF-12 permite cancelar únicamente mientras la solicitud está pendiente; conserva datos e historial y rechaza repeticiones o cambios concurrentes. RF-13 permite a administración filtrar por estado y fecha, aceptar o rechazar pendientes. Rechazar exige motivo visible al cliente. Revisión y responsable quedan registrados. La revisión no cambia la base ni inventa datos faltantes de solicitudes antiguas.

## Recursos y planificación

RF-14 gestiona vehículos con matrícula normalizada única, tipo, capacidad con unidad, sede y actividad/disponibilidad. RF-15 vincula recursos conductor a cuentas activas habilitadas, sin duplicados. Nombre y apellido se obtienen de la cuenta; se conservan alternativas históricas para cuentas antiguas sin identidad. La baja conserva historial.

RF-16 planifica desde Yecla, con fecha desde hoy, vehículo y conductor activos/disponibles y entre 1 y 100 solicitudes aceptadas distintas con entrega completa. Administración ordena las paradas; la solicitud seleccionada se incorpora al guardar si aún no estaba añadida. El itinerario conserva direcciones, contactos, mercancía y recursos tal como estaban al planificar.

Una solicitud solo pertenece a una ruta activa; vehículo y cuenta conductor no tienen dos reservas activas en la misma fecha. La ruta y el cambio de todas las solicitudes a planificada se guardan atómicamente. Conflictos o fallos no dejan planificación parcial. MongoDB requiere replica set y utiliza transacciones e índices únicos; SQLite se usa solo en pruebas aisladas.

No se convierte automáticamente mercancía expresada en bultos, cajas o unidades a kg o m³. No se incluyen mapas, optimización automática, edición ni cancelación de rutas.

## Ejecución y estados

RF-17 permite al conductor asignado ver itinerario y paradas ordenadas, iniciar ruta, entregar o registrar una incidencia con motivo de 1 a 1000 caracteres. Una incidencia puede resolverse como entregada y conserva el motivo en el historial. No se impone completar paradas en orden.

La solicitud sigue pendiente_recogida → aceptada → planificada → en_transito → completada. Desde pendiente puede cancelarse o rechazarse. Desde en_transito puede pasar a incidencia y después a completada. No se admiten transiciones arbitrarias ni correcciones administrativas de entregas en este alcance.

La ruta se completa al entregar todas las paradas y libera reservas de vehículo y conductor para esa fecha. Una incidencia abierta mantiene la ruta activa. Revisiones y claves de operación evitan sobrescrituras y eventos duplicados tras reintentar. La interfaz muestra éxito solo después de confirmación del servidor. Cliente y administración consultan estado e historial según su ámbito.

## Actualización y calidad

El panel consulta cambios cada cinco segundos de forma secuencial mientras está visible, sin edición de campos ni diálogos abiertos. Actualiza listados y métricas cuando cambia su contenido, conserva filtros y pausa el sondeo en pestañas ocultas. Los detalles y selectores de planificación conservan borradores y mantienen actualización explícita. Un fallo de red conserva la última vista y se reintenta; logout descarta respuestas pendientes. No es entrega instantánea ni sustituye la confirmación de una escritura.

HTTP se concentra en cliente/rest.js; presentación gestiona interfaz, las rutas traducen HTTP y la lógica valida reglas y permisos. MongoDB persiste cuentas, sesiones y operaciones; sesiones de ocho horas con hash del token. Secretos fuera del repositorio y respuestas limitadas al ámbito de cada perfil.

## Verificación y aceptación

P24 documenta entradas, resultados y evidencias del flujo completo; las suites cubren permisos, reglas, idempotencia, concurrencia, rollback y persistencia entre procesos. Ejecutar npm test; las integraciones MongoDB necesitan MONGODB_TEST_URL local desechable o CI con replica set. El resultado de cada ejecución debe registrarse sin reutilizar como actual una cifra histórica.

Antes de aceptar: probar cinco RF de principio a fin, sesión y persistencia tras salir y volver, dos cuentas sin recargar, una petición inválida directa a la API y ausencia de datos indebidos en respuestas. Revisar también móvil, vacíos, carga, errores y confirmaciones. Correo y Google requieren comprobaciones reales separadas; sus dobles de prueba no acreditan recepción ni consentimiento.

Los contratos completos y pasos de reproducción se mantienen en README.md, P18-consulta-cancelacion.md, P19-revision-administrativa.md, P21-recursos.md, P22-rutas.md, P23-entregas.md y P24-validacion-flujo.md. No quedan decisiones de comportamiento remitidas al borrador antiguo; la aceptación y los resultados reales del entorno publicado deben anotarse por separado.
