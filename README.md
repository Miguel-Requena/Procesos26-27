# Gestión de usuarios — Procesos26-27

Aplicación por capas con Node.js 24, Express, bcrypt y MongoDB Atlas.
`cliente/presentacion.js` gestiona el DOM, `cliente/rest.js` realiza HTTP,
`servidor/api.js` expone rutas, `logica.js` aplica reglas y `datos.js` selecciona
persistencia. SQLite se reserva para pruebas aisladas.

## Ejecución

Copia `.env.example` a `.env` en la raíz. Configura DATABASE_URL con una URI de
MongoDB que incluya el nombre de base de datos (local o Atlas).

```powershell
cd servidor
npm.cmd ci
npm.cmd start
```

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
