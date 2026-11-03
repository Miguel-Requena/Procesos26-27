# Gestión de usuarios — Procesos26-27

Aplicación por capas con Node.js 24, Express, bcrypt y MongoDB Atlas.
`cliente/presentacion.js` gestiona el DOM, `cliente/rest.js` realiza HTTP,
`servidor/api.js` expone rutas, `logica.js` aplica reglas y `datos.js` selecciona
persistencia. SQLite se reserva para pruebas aisladas.

## Ejecución

Copia `.env.example` a `.env` en la raíz. Configura DATABASE_URL con una URI de
MongoDB que incluya el nombre de base de datos (local o Atlas).

```powershell
npm.cmd --prefix servidor ci
npm.cmd start
```

También puedes entrar en `servidor` y ejecutar allí `npm.cmd ci` y `npm.cmd start`.

Abre http://localhost:3000. Requiere Node.js 24. El entorno prevalece sobre `.env`.
En producción usa NODE_ENV=production para cookies Secure y TLS a MongoDB.

## Registro, confirmación y Google

El registro crea una cuenta pendiente con contraseña bcrypt y rol usuario.
Gmail SMTP envía un enlace de un solo uso que caduca en 24 horas. Hasta confirmarlo
no se permite entrar. El reenvío invalida el enlace anterior; si falla el envío,
la cuenta permanece pendiente y se puede solicitar otro correo. Los tokens se
almacenan como SHA-256 y no se devuelven en la API. Las cuentas ya confirmadas
conservan su estado. Sin configurar correo, el registro devuelve 503 sin crear cuenta.

Google usa Authorization Code con PKCE y state ligado a cookie HttpOnly, válido
10 minutos. El servidor consulta el perfil y exige email verificado; identifica
la cuenta por sub. Un email ya registrado debe entrar con contraseña: no se
vinculan cuentas automáticamente. Google no concede contraseña local ni rol admin.
El botón aparece cuando se configuran las credenciales.

## Variables

- PORT, NODE_ENV, DATABASE_URL: servidor y MongoDB.
- PUBLIC_URL: origen HTTPS público sin ruta; en desarrollo permite HTTP localhost.
- GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET: cliente OAuth web.
- GMAIL_USER y GMAIL_APP_PASSWORD: cuenta remitente y contraseña de aplicación (no la habitual).
- DATABASE_PATH: archivo SQLite exclusivo de pruebas.
- MONGODB_TEST_URL: MongoDB local desechable de CI con base `pruebas_*`.

No subas `.env`, secretos, bases ni logs. En Cloud Run guarda claves en Secret
Manager. No se usan ADMIN_EMAIL ni ADMIN_CLAVE.

## Roles y sesiones

Para crear un administrador, registra y confirma su correo. En Atlas modifica
solo `rol` a `administrador` en `procesos26_27.usuarios` y vuelve a iniciar sesión.
El servidor comprueba sesión y rol en cada operación; el registro ignora roles
y estados enviados por el cliente. Un usuario solo elimina su cuenta; el admin
puede listar, consultar estados y eliminar otras cuentas. El eliminado no puede entrar.

Las sesiones duran 8 horas y viven en memoria, igual que state OAuth y límites
de envío. Reiniciar o escalar a cero obliga a entrar de nuevo. Mantener máximo
una instancia; varias requieren almacenamiento compartido. Los usuarios y tokens
de confirmación persisten en MongoDB. El límite de solicitudes por correo es un
minuto por proceso. Los logs de aplicación omiten correos, claves y tokens.

## API

- POST /api/prueba/email: normaliza email; 400 EMAIL_INVALIDO si no es válido.
- POST /api/registro: email y clave; crea cuenta pendiente y envía correo.
- POST /api/confirmacion: token del enlace; confirma una única vez.
- POST /api/confirmacion/reenviar: email; respuesta genérica y límite por minuto.
- GET /api/servicios: disponibilidad de proveedores sin credenciales.
- GET /api/oauth/google y /api/oauth/google/callback: acceso externo.
- POST /api/login: email y clave; solo cuenta confirmada y no eliminada.
- POST /api/logout y GET /api/sesion.
- GET /api/usuarios y /api/usuarios/:id/activo: administrador.
- DELETE /api/usuarios/:id: administrador o titular.
- GET /api/salud: comprueba conexión a la base.

La interfaz muestra errores de red, formularios, correo y OAuth. Las respuestas
no incluyen errores internos de proveedores ni credenciales.

## Pruebas

```powershell
cd servidor
npm.cmd test
```

Usan SQLite temporal y correo simulado, sin cargar `.env`. Cubren hashes,
duplicados, roles falsificados, sesiones, eliminación, confirmación de un solo
uso, caducidad, sustitución de tokens y rechazo de callbacks OAuth falsificados.
GitHub Actions prueba además persistencia con MongoDB local desechable; esa
prueba se omite en local si falta MONGODB_TEST_URL. Las pruebas simuladas no
acreditan recepción real del correo ni consentimiento de Google.

## Despliegue y entrega

URL: https://procesos26-27-gseerr4ika-no.a.run.app

Cloud Run sirve cliente y servidor; Atlas guarda las cuentas. Cloud Build
compila y despliega commits de main mediante cloudbuild.yaml. Consulta la
[guía de servicios y despliegue](DESPLIEGUE-GOOGLE-CLOUD.md#hito-4).

Estado del hito 4: código preparado; faltan alta de proveedores, credenciales,
remitente, despliegue y prueba real de ambos servicios. La revisión anterior
estaba desplegada; no se ha verificado este hito en producción.
`entrega.txt` contiene URL y repositorio. Envía credenciales del revisor por
separado. GitHub Flow: rama, pruebas, PR, CI y revisión antes de integrar main.
No marcar el hito como terminado hasta completar la comprobación pública.

### Sprint 2: perfiles de acceso

El registro con contraseña y el alta mediante Google crean cuentas de **cliente**. Las cuentas antiguas con rol `usuario` se migran a `cliente` al inicializar el almacenamiento; los administradores se conservan. Hay tres paneles protegidos: `/api/panel/cliente`, `/api/panel/conductor` y `/api/panel/administrador`. Cada uno admite únicamente su perfil. El servidor consulta la cuenta en cada petición: cambiar HTML, cabeceras o el rol enviado al login no concede permisos.

Los paneles muestran el espacio de cada perfil; las solicitudes, rutas y entregas se implementarán en los siguientes PBIs. No muestran datos operativos compartidos.

Para asignar un perfil al equipo, primero debe registrar y confirmar su cuenta. Desde una terminal de confianza en la raíz del proyecto, con el `.env` habitual:

```powershell
node servidor/asignar-perfil.js correo-del-equipo@example.com conductor
node servidor/asignar-perfil.js correo-de-administracion@example.com administrador
```

Este procedimiento requiere acceso local al servidor y su base de datos. No hay selector público de roles ni endpoint de promoción. Para retirar permisos se usa el mismo comando con `cliente`. Los cambios se aplican a la siguiente petición incluso con una sesión abierta; recarga la página para cargar el nuevo panel. El comando no crea cuentas ni confirma correos y rechaza cuentas pendientes o eliminadas. No se asignan perfiles reales automáticamente.

### P16: habilitación de conductores y consulta por propietario

Administración dispone de un listado de cuentas en su panel. Puede convertir cuentas confirmadas y disponibles de cliente a conductor y devolver conductores a cliente. `PATCH /api/usuarios/:id/perfil` solo acepta esos dos roles, vuelve a comprobar al administrador y no modifica cuentas de administración, pendientes o eliminadas. Las cuentas de administración siguen gestionándose desde la terminal de confianza. Este endpoint no confirma correos.

`GET /api/solicitudes` y `GET /api/solicitudes/:id` solo permiten cliente propietario o administrador. `GET /api/rutas` y `GET /api/rutas/:id` solo permiten conductor asignado o administrador. El filtro se aplica en la base de datos a partir de la sesión, sin aceptar propietario o perfil de la petición. Un detalle ajeno responde 404 igual que uno inexistente. La proyección pública solo contiene id, referencia, origen, destino, fecha y estado.

Contrato inicial de lectura para los siguientes PBIs: MongoDB usa las colecciones `solicitudes` (`id` de texto y `clienteId` numérico) y `rutas` (`id` de texto y `conductorId` numérico); ambas admiten referencia, origen, destino, fecha y estado. Los ids admiten letras, números, guiones y guiones bajos (máximo 80). P17 y P22 incorporarán las altas y los restantes campos de negocio. La app muestra listas vacías si no hay registros: no inserta datos de demostración en MongoDB. SQLite replica este contrato únicamente en pruebas. Los datos ficticios se cargan mediante una función exclusiva del entorno de pruebas.


### P17: solicitud de recogida al fabricante

El panel de cliente ofrece **Nueva solicitud** para pedir una recogida en fábrica. Se indican fabricante (hasta 160 caracteres), dirección de recogida (hasta 300), contacto (nombre de hasta 120 caracteres y teléfono de 7–15 dígitos), fecha solicitada de recogida y entre 1 y 50 líneas de mercancía (descripción de hasta 200 caracteres, cantidad entera de 1 a 999 y formato `bultos`, `cajas` o `unidades`). Las observaciones de horario y acceso son opcionales (hasta 2000 caracteres). La fecha debe existir y no ser anterior al día actual en Europe/Madrid. La organización de los camiones se realiza después en la base de Yecla; no se pide destino ni contacto de entrega en esta fase.

`POST /api/solicitudes` requiere sesión de cliente confirmado y activo y cabecera `Idempotency-Key` (16–80 letras, números, guiones o guiones bajos). El JSON contiene `fabricante`, `origen`, `contactoRecogida` (objeto con `nombre` y `telefono`), `fecha` (AAAA-MM-DD), `mobiliario` (lista de `{descripcion,cantidad,unidad}`) y `observaciones`. El servidor fija id, referencia, clienteId, estado `pendiente_recogida` y creadaEn; ignora propietario, estado, destino o contacto de entrega enviados por el navegador. La respuesta contiene `solicitud` y `creada`: 201 al crear y 200 al repetir un envío ya guardado. Los registros anteriores no se migran ni se borran; los listados siguen mostrando su información disponible.

La clave se conserva al reintentar sin modificar los datos y se renueva tras el éxito o al cambiar el contenido. Un índice único de MongoDB por cliente y clave impide duplicados incluso en peticiones concurrentes; reutilizar una clave con otros datos responde 409. La clave y su huella persisten y no se exponen en la respuesta pública. Clientes diferentes pueden utilizar la misma clave. Una nueva clave permite una solicitud independiente con el mismo contenido. La prevención cubre doble envío y reintentos del formulario, no identifica automáticamente solicitudes parecidas ni recupera un borrador tras recargar la página.

MongoDB guarda todos los datos en `solicitudes`. SQLite replica el alta de resumen y detalles en una transacción exclusivamente para pruebas. Los listados mantienen la proyección reducida y el aislamiento de P16; el detalle ampliado y la cancelación se abordarán en P18. El formulario conserva los datos ante errores y avisa del resultado sin insertar ejemplos en la base habitual.
