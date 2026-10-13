# Despliegue en Google Cloud Run

Proyecto: `procesos26-27` (número `743300312263`).

Cloud Run ejecuta la imagen del Dockerfile de la raíz. La imagen incluye frontend
y backend del mismo origen, usa Node 24 y escucha en `0.0.0.0` y en el `PORT`
asignado por Cloud Run. `.dockerignore` excluye secretos, bases locales y logs.

## Configuración del servicio

- Nombre: `procesos26-27`.
- Región recomendada: `us-east1`, próxima a la base de Neon en Ohio.
- Contenedor: Dockerfile de la raíz, contexto de compilación la raíz completa.
- Puerto: 8080 (Cloud Run configura `PORT`).
- CPU: 1; memoria: 512 MiB; facturación basada en solicitudes.
- Mínimo de instancias: 0; máximo: 1.
- Variable `NODE_ENV`: `production`.
- `DATABASE_URL`: referencia a un secreto de Secret Manager con la conexión de Neon.
- No configurar `DATABASE_PATH`: el disco del contenedor no conserva cuentas.
- URL pública para la interfaz; la API mantiene sus comprobaciones de sesión y rol.

El máximo de una instancia mantiene las sesiones en memoria en un único proceso.
Al escalar a cero o desplegar otra revisión las sesiones terminan, pero las cuentas
persisten en Neon. Si se necesitan varias instancias hay que externalizar sesiones.

## Primer administrador

`npm start` ejecuta `servidor/arrancar.js`. Si recibe `ADMIN_EMAIL` y
`ADMIN_CLAVE`, crea el primer administrador en la base indicada por `DATABASE_URL`.
Configura `ADMIN_EMAIL` en el entorno y `ADMIN_CLAVE` como referencia a un secreto
de Secret Manager. Elige un correo que no pertenezca a una cuenta normal existente;
el inicializador no promociona cuentas normales ni cambia contraseñas existentes.

Tras comprobar que puedes iniciar sesión y listar usuarios, retira ambas variables
de inicialización del servicio: el administrador y su hash ya están en PostgreSQL.
Entrega las credenciales de revisión por separado, nunca en el repositorio.
El acceso público de Cloud Run permite abrir la interfaz, mientras el servidor
comprueba la sesión y el rol para cada operación protegida.

## Comprobación antes de entregar

- `/api/salud` responde 200 y la raíz muestra la interfaz.
- Registro, login, recarga y logout funcionan en HTTPS.
- Sin sesión, `/api/usuarios` devuelve 401; con usuario normal, devuelve 403.
- El administrador puede listar y comprobar estados; un usuario solo puede
  eliminarse a sí mismo. Una cuenta eliminada no puede iniciar sesión.
- Después de desplegar una nueva revisión, las cuentas persisten en Neon y
  puedes volver a iniciar sesión. Las sesiones anteriores pueden terminar.
- Los logs de Cloud Run muestran actividad sin contraseñas ni tokens.
- Un cambio integrado en `main` dispara la compilación y despliega otra revisión.

Esta versión cubre el registro local de los hitos 1 a 3. La confirmación por correo
y OAuth del Hito 4 todavía no están implementados: las cuentas locales se activan
al registrarse. El estado final definido en 4.2 requiere completar esa confirmación.

## Despliegue continuo

En Cloud Run configura el despliegue desde GitHub con Cloud Build, selecciona
`Miguel-Requena/Procesos26-27` y el Dockerfile de la raíz. Usa inicialmente la rama
de esta PR; después de integrar todas las PR selecciona `main` para desplegar cada
cambio integrado. Los permisos del servicio de compilación se conceden desde la
consola, sin subir claves de cuentas de servicio al repositorio.

La cuenta de facturación del proyecto debe ser la que tiene los créditos de
estudiantes. Comprueba su saldo antes de desplegar: la cuota gratuita y los
créditos no equivalen a un límite automático de gasto.

Mantén el prototipo de Render hasta comprobar registro, login, recarga, logout,
restricciones y persistencia en la URL de Cloud Run. Solo entonces actualiza la
primera línea de `entrega.txt` y la URL del README.
