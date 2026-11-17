# Transdrakkar · Procesos26-27

Aplicación web para gestionar solicitudes de transporte de mobiliario, vehículos, conductores y planificación de rutas. Desarrollada con Node.js 24, Express, JavaScript, bcrypt y MongoDB Atlas.

- **Aplicación:** [Transdrakkar · Área privada](https://procesos26-27-gseerr4ika-no.a.run.app).
- **Repositorio:** [Miguel-Requena/Procesos26-27](https://github.com/Miguel-Requena/Procesos26-27).

Estado documentado: **17 de noviembre de 2026**. P15–P19, P21 y P22 están implementados e integrados. La aplicación está desplegada en Google Cloud Run.

## Funcionalidades y perfiles

| Perfil | Funciones disponibles |
| --- | --- |
| Cliente | Crear solicitudes de recogida con entrega completa, consultar sus solicitudes y su historial, cancelar las que siguen pendientes y consultar el motivo de un rechazo. |
| Administrador | Revisar solicitudes, filtrar por estado y fecha solicitada, aceptar o rechazar, habilitar perfiles de conductor, gestionar vehículos y conductores y planificar rutas con itinerario ordenado. |
| Conductor | Acceder a su panel y consultar el resumen de las rutas que tiene asignadas. |

El servidor valida sesión, rol y propiedad en cada operación. El registro no permite elegir roles ni concederse permisos administrativos. La consulta del itinerario completo desde el panel de conductor y la actualización de entregas corresponden a **P23**, todavía pendiente. La validación y documentación del flujo completo corresponde a **P24**.

### P15–P16: identidad visual, perfiles y permisos

La interfaz utiliza la identidad de Transdrakkar y dispone de paneles separados para cliente, conductor y administración. Las antiguas cuentas con rol `usuario` se migran a `cliente`; los administradores se conservan.

Administración puede habilitar como conductores las cuentas confirmadas de cliente y devolverlas al perfil cliente desde «Perfiles del equipo». Las cuentas pendientes, eliminadas o de administración no se modifican desde esa acción. Cambiar el HTML o enviar otro rol en una petición no concede acceso.

### P17–P19: solicitudes, cancelación y revisión

El flujo logístico es **fábrica en Yecla → base de Yecla → dirección de entrega del destinatario**.

El cliente indica fabricante, dirección de recogida, fecha solicitada, contacto de recogida, mercancía y observaciones. También debe completar destinatario, dirección de entrega, localidad, código postal de cinco dígitos y contacto de entrega. El servidor fija `localidadRecogida` y `baseConsolidacion` en `Yecla`. Rubí/Barcelona, Palma y Castellón son zonas de las rutas de salida y no sustituyen la dirección indicada por el cliente.

- **P17:** alta validada e idempotente mediante `Idempotency-Key`, para evitar duplicados al reenviar el mismo formulario. La fecha solicitada no puede ser anterior a hoy en Madrid.
- **P18:** listado y detalle de las solicitudes propias; cancelación con confirmación únicamente mientras están pendientes. Cancelar conserva los datos y el historial.
- **P19:** listado administrativo con filtros por estado y rango de fecha solicitada; aceptación o rechazo de pendientes. Rechazar exige un motivo visible al cliente. Se guardan fecha, responsable y estados anterior y resultante, y se controla la revisión para evitar sobrescrituras concurrentes.

La revisión administrativa no cambia la base ni la dirección de entrega. La antigua acción `asignar_sede` ya no se admite; sus eventos históricos se conservan.

Las solicitudes antiguas mantienen los datos que tenían: los campos ausentes se muestran como pendientes y no se rellenan automáticamente. Si faltan datos de entrega, no se pueden planificar. Aparecen deshabilitadas en el selector y se identifican sus referencias con un aviso. Para probar la planificación, debe utilizarse una solicitud con entrega completa creada desde la cuenta de cliente.

### P21: vehículos y conductores disponibles

Administración dispone de un catálogo reutilizable de camiones y conductores:

- Vehículos con matrícula única, tipo, capacidad declarada con unidad, sede y estados activo/disponible. Las matrículas se normalizan a mayúsculas sin espacios ni guiones y se recuperan desde un desplegable.
- Conductores vinculados a una cuenta activa con rol conductor, sin duplicar la misma cuenta en el catálogo. Tienen sede y estados activo/disponible.
- El nombre del conductor se obtiene del nombre y primer apellido de su cuenta: no se vuelve a pedir en el formulario del recurso. Los nombres antiguos guardados se conservan como alternativa para las cuentas sin identidad; si no existe ninguno, aparece «Nombre pendiente».
- La desactivación conserva el recurso, el historial y las asignaciones anteriores. Los cambios usan revisión para detectar actualizaciones simultáneas.

Solo son asignables los recursos activos y disponibles. Un cambio de rol o la baja de la cuenta del conductor impide asignarlo a nuevas rutas. Registrar una cuenta con rol conductor y añadirla al catálogo de recursos son pasos distintos.

### P22: planificación de rutas

Desde «Planificar rutas», administración elige una fecha de salida desde hoy, un vehículo y un conductor disponibles en **Yecla** y entre 1 y 100 solicitudes aceptadas distintas. Las paradas se pueden subir, bajar o quitar antes de guardar. La solicitud que quede seleccionada también se incorpora al final al guardar, aunque no se haya pulsado «Añadir parada».

El servidor aplica estas reglas:

- Un vehículo y una cuenta de conductor no pueden asignarse a dos rutas activas en la misma fecha.
- Una solicitud no puede estar simultáneamente en dos rutas activas y debe seguir aceptada y tener los datos de entrega completos.
- Crear la ruta y cambiar todas sus solicitudes a `planificada` es una operación atómica: si hay conflicto o error, no se guarda una planificación parcial.
- El itinerario conserva el orden, las direcciones, los contactos, la mercancía y los recursos tal como estaban al planificar. Se puede consultar desde administración.

MongoDB utiliza transacciones e índices únicos; las pruebas con SQLite utilizan una transacción y reservas con restricciones únicas. Los errores se muestran también junto al botón de guardar.

P22 no incluye mapas, optimización automática, modificación/cancelación de rutas ni finalización de entregas. La capacidad declarada del camión se muestra para la elección administrativa, pero no se convierte automáticamente la mercancía expresada en bultos, cajas o unidades a kg o m³.

## Registro, confirmación y Google

Crear cuenta pide **nombre, primer apellido, correo y contraseña**. Nombre y primer apellido son obligatorios, admiten hasta 100 caracteres y se validan también en servidor. El registro crea una cuenta de **cliente** pendiente de confirmación, con contraseña almacenada mediante bcrypt. Las cuentas antiguas sin nombre conservan su acceso.

Gmail SMTP envía un enlace de confirmación de un solo uso que caduca en 24 horas. Hasta confirmarlo no se permite entrar. El reenvío invalida el enlace anterior; si el envío falla, la cuenta permanece pendiente y se puede solicitar otro correo. Sin configurar el servicio de correo no se crea la cuenta. Los tokens se almacenan como SHA-256 y no se devuelven en la API.

Google utiliza Authorization Code con PKCE y `state` ligado a una cookie HttpOnly durante 10 minutos. Se solicitan los ámbitos `openid email profile`; el servidor exige correo verificado e identifica la cuenta por `sub`. Las nuevas cuentas obtienen nombre y apellido del perfil. Si Google no los facilita, se pide utilizar el formulario antes de vincular Google.

Si el correo ya existe, se solicita la contraseña de esa misma cuenta para vincular Google una sola vez, conservando su identidad, rol y solicitudes. La vinculación usa una prueba verificada de un solo uso, ligada al navegador y válida durante 10 minutos. Se puede continuar solo con contraseña. Google no concede una contraseña local ni privilegios administrativos. Los botones de Google aparecen cuando están configuradas sus credenciales.

## Arquitectura y almacenamiento

| Componente | Responsabilidad |
| --- | --- |
| `cliente/index.html`, `estilos.css`, fuentes e imágenes | Estructura e identidad visual. |
| `cliente/presentacion.js`, `cliente/rutas.js` | Interfaz, formularios y planificación. |
| `cliente/rest.js` | Peticiones HTTP a la API. |
| `servidor/api.js`, `externos.js` | Endpoints y acceso a proveedores externos. |
| `servidor/logica.js`, `solicitudes.js`, `rutas.js` | Reglas de acceso, validación y negocio. |
| `servidor/datos.js`, `datos-mongodb.js` | Contrato asíncrono y persistencia de la aplicación. |
| `servidor/datos-sqlite.js` | Persistencia para pruebas aisladas. |
| `servidor/sesiones.js`, `correo.js`, `actividad.js` | Sesiones, correo y registro de actividad. |

MongoDB conserva cuentas, confirmaciones, sesiones, intentos OAuth, solicitudes, recursos y rutas. Las solicitudes usan `id` de texto y `clienteId` numérico; las rutas usan `id` de texto y `conductorId` numérico. Los identificadores públicos admiten letras, números, guiones y guiones bajos, con un máximo de 80 caracteres.

SQLite se utiliza exclusivamente en pruebas; la aplicación requiere MongoDB. La planificación necesita un **replica set compatible con transacciones**, como MongoDB Atlas. Un MongoDB local independiente sin replica set no permite probar la planificación atómica.

## Ejecución local

Requisitos: **Node.js 24**, npm y MongoDB Atlas o una instancia local configurada como replica set.

Copia [`.env.example`](.env.example) a `.env` en la raíz y configura `DATABASE_URL` con una URI que incluya el nombre de la base de datos. Para desarrollo utiliza `NODE_ENV=development` y `PUBLIC_URL=http://localhost:3000`. El entorno del proceso prevalece sobre `.env`.

```powershell
Copy-Item .env.example .env
npm.cmd --prefix servidor ci
npm.cmd start
```

Abre [http://localhost:3000](http://localhost:3000). También se puede entrar en `servidor` y ejecutar allí `npm.cmd ci` y `npm.cmd start`. En otros sistemas puede utilizarse `npm` en lugar de `npm.cmd`.

Para probar el registro y su confirmación se necesitan las variables de correo. Para utilizar Google se necesita un cliente OAuth web con la URL de retorno `/api/oauth/google/callback` del entorno correspondiente. Consulta la [guía de despliegue y proveedores](DESPLIEGUE-GOOGLE-CLOUD.md).

### Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP; por defecto, 3000. |
| `NODE_ENV` | En producción activa cookies Secure y TLS a MongoDB. |
| `DATABASE_URL` | Conexión MongoDB con nombre de base de datos. |
| `PUBLIC_URL` | Origen público HTTPS sin ruta; en desarrollo admite HTTP localhost. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Cliente OAuth web de Google. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Remitente y contraseña de aplicación de Gmail. |
| `DATABASE_PATH` | Archivo SQLite exclusivo de pruebas. |
| `MONGODB_TEST_URL` | MongoDB local desechable para integración, con base `pruebas_*`. |

No se usan `ADMIN_EMAIL` ni `ADMIN_CLAVE`. Las credenciales de la aplicación y la conexión a MongoDB son distintas. No se deben incluir `.env`, contraseñas, conexiones, bases de datos ni logs en el repositorio.

## Administración de perfiles y sesiones

Para habilitar conductores puede utilizarse «Perfiles del equipo» desde una cuenta administrativa. Para asignar administración, se requiere una cuenta registrada y confirmada y acceso de confianza al servidor y a su base:

```powershell
node servidor/asignar-perfil.js correo-del-equipo@example.com conductor
node servidor/asignar-perfil.js correo-de-administracion@example.com administrador
```

El comando admite `cliente`, `conductor` y `administrador`; no crea cuentas ni confirma correos. Rechaza cuentas pendientes o eliminadas. También puede gestionarse el rol directamente en Atlas por el responsable de la base. No existe un endpoint público de promoción a administrador.

El servidor consulta la cuenta en cada petición: revocar un rol o eliminar una cuenta invalida su acceso incluso con sesión abierta. Un cliente o conductor solo puede eliminar su propia cuenta; administración puede gestionar otras cuentas. La eliminación lógica impide volver a entrar.

Las sesiones duran 8 horas, usan cookies HttpOnly/SameSite y persisten en MongoDB con el token almacenado como hash. Los intentos OAuth y las pruebas de vinculación persisten, caducan a los 10 minutos y se consumen atómicamente una sola vez. Reiniciar Cloud Run o escalar a cero no pierde estos datos. Los límites de envío y login son por proceso y el despliegue mantiene un máximo de una instancia. Los logs de aplicación omiten correos, claves y tokens.

## API

Las rutas privadas requieren sesión y comprueban el perfil en servidor. Los detalles de solicitudes ajenas responden 404 igual que los inexistentes.

| Método y ruta | Uso / permiso |
| --- | --- |
| `POST /api/prueba/email` | Normalización de correo. |
| `POST /api/registro` | `nombre`, `primerApellido`, `email`, `clave`; alta de cliente pendiente y correo de confirmación. |
| `POST /api/confirmacion` | Confirmación mediante token. |
| `POST /api/confirmacion/reenviar` | Reenvío con respuesta genérica y límite por minuto. |
| `GET /api/servicios` | Disponibilidad de proveedores sin revelar credenciales. |
| `GET /api/oauth/google`, `GET /api/oauth/google/callback` | Acceso y vinculación con Google. |
| `POST /api/login`, `POST /api/logout`, `GET /api/sesion` | Inicio, cierre y consulta de sesión. |
| `GET /api/panel/:rol` | Panel del perfil de la sesión. |
| `GET /api/usuarios`, `GET /api/usuarios/:id/activo` | Listado de cuentas y estado; administración. |
| `PATCH /api/usuarios/:id/perfil` | Habilitar conductor o volver a cliente; administración. |
| `DELETE /api/usuarios/:id` | Baja lógica por el titular o administración. |
| `POST /api/solicitudes` | Alta de cliente con cabecera `Idempotency-Key`. |
| `GET /api/solicitudes`, `GET /api/solicitudes/:id` | Listado y detalle de solicitudes; propietario o administración. |
| `POST /api/solicitudes/:id/cancelacion` | Cancelación de una solicitud propia pendiente. |
| `GET /api/administracion/solicitudes` | Filtros `estado`, `desde`, `hasta`; incluye `entregaCompleta` sin exponer contactos en el resumen. |
| `GET /api/administracion/solicitudes/:id` | Detalle administrativo. |
| `POST /api/administracion/solicitudes/:id/revision` | `accion`, `revision` y `motivo` al rechazar; administración. |
| `GET /api/administracion/vehiculos`, `POST /api/administracion/vehiculos` | Consulta y alta de vehículos. |
| `PUT /api/administracion/vehiculos/:id` | Actualización completa con `revision`. |
| `GET /api/administracion/conductores`, `POST /api/administracion/conductores` | Consulta y alta de recursos conductor. |
| `PUT /api/administracion/conductores/:id` | Actualización completa con `revision`. |
| `GET /api/rutas`, `GET /api/rutas/:id` | Resumen de rutas; conductor asignado o administración. |
| `POST /api/administracion/rutas` | Planificación atómica con `fecha`, `sede`, `vehiculoId`, `conductorRecursoId`, `solicitudes` en orden. |
| `GET /api/administracion/rutas/:id` | Itinerario completo; administración. |
| `GET /api/salud` | Comprobación de acceso a la base de datos. |

Las operaciones de `/api/administracion/*` son exclusivas de administración. Los listados de vehículos y conductores admiten `?asignables=true` para devolver solo recursos habilitados; los conflictos de reserva por fecha se comprueban al planificar.

## Pruebas y CI

```powershell
npm.cmd test
```

También puede ejecutarse desde `servidor`. Las pruebas locales usan SQLite temporal y correo simulado, sin cargar `.env` ni modificar las cuentas de la aplicación. Cubren registro e identidad, contraseñas, duplicados, roles, propiedad, sesiones, confirmación, OAuth, solicitudes, revisión, recursos, orden de paradas, conflictos concurrentes, rollback y regresiones del controlador de planificación.

Las dos pruebas de integración MongoDB se omiten si falta `MONGODB_TEST_URL`. Solo admiten una conexión local y una base desechable con nombre `pruebas_*`. Para ejecutarlas localmente debe configurarse un replica set y esa variable.

[GitHub Actions](.github/workflows/ci.yml) instala dependencias, arranca MongoDB como replica set, ejecuta las pruebas —incluidas las transacciones y la persistencia entre procesos— y construye el contenedor para comprobar `/api/salud` y la página principal. Las pruebas simuladas no acreditan la recepción real del correo ni el consentimiento real de Google.

## Despliegue, entrega y flujo de trabajo

Google Cloud Run sirve cliente y servidor, MongoDB Atlas conserva los datos y Secret Manager almacena los secretos. Cloud Build compila y despliega automáticamente los commits integrados en `main` según [`cloudbuild.yaml`](cloudbuild.yaml). La configuración y los pasos de verificación están en [DESPLIEGUE-GOOGLE-CLOUD.md](DESPLIEGUE-GOOGLE-CLOUD.md).

[`entrega.txt`](entrega.txt) contiene los enlaces públicos de la aplicación y el repositorio. Las cuentas y contraseñas de evaluación se entregan en un TXT privado, excluido de Git; no se publican en este README. Las cuentas de prueba con correos de ejemplo sirven para acceder con contraseña, pero no representan buzones de correo reales.

El flujo del repositorio es: crear una rama `codex/` antes de editar, realizar el cambio, verificarlo, abrir una pull request y esperar CI correcto antes de integrarla en `main`. No se hacen commits directamente en `main`. Las instrucciones están en [AGENTS.md](AGENTS.md).

## Documentación relacionada

- [P18: consulta y cancelación](documentacion/P18-consulta-cancelacion.md).
- [P19: revisión administrativa](documentacion/P19-revision-administrativa.md).
- [P21: catálogo de vehículos y conductores](documentacion/P21-recursos.md).
- [P22: planificación e itinerarios](documentacion/P22-rutas.md).
- [P24: validación del flujo, evidencias y dependencia de P23](documentacion/P24-validacion-flujo.md).
- [Registro con nombre y primer apellido](documentacion/REGISTRO-IDENTIDAD.md).
- [Guía de despliegue y servicios](DESPLIEGUE-GOOGLE-CLOUD.md).

Los documentos de cada PBI pueden conservar notas de validación de su implementación inicial. Este README describe el estado conjunto actual y las limitaciones que siguen pendientes.
