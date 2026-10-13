# Gestión de usuarios — Procesos26-27

Aplicación por capas: `cliente/presentacion.js` gestiona formularios y DOM;
`cliente/rest.js` realiza HTTP; `servidor/api.js` expone la API;
`servidor/logica.js` aplica reglas y bcrypt; `servidor/datos.js` selecciona
el adaptador de acceso a datos. El navegador nunca accede directamente a Atlas.

## Tecnologías

| Tecnología | Motivo |
|---|---|
| Node.js 24 + Express | API y servidor de la interfaz en un mismo origen |
| HTML, CSS y JavaScript + Fetch | Presentación y comunicación separadas |
| bcrypt | Hash seguro de contraseñas |
| MongoDB + controlador oficial | Persistencia real local o en Atlas sin SQL en la lógica |
| MongoDB Atlas | Base de datos externa para el servidor de Google Cloud |
| SQLite | Solo pruebas locales aisladas sin credenciales ni servicios externos |
| GitHub Actions | Pruebas en cada push y pull request, incluido MongoDB real en CI |
| Google Cloud Run + Cloud Build | Despliegue del contenedor y automatización desde GitHub |

## Ejecutar en local

Requiere Node.js 24. Copia `.env.example` a `.env` en la raíz y configura
`DATABASE_URL` con la conexión de Atlas, incluyendo el nombre de la base
`procesos26_27` en la URL. El archivo `.env` se ignora en Git.
También puedes usar MongoDB local con `mongodb://localhost:27017/procesos26_27`.

```powershell
cd servidor
npm.cmd ci
npm.cmd start
```

Abre http://localhost:3000. Usa `Ctrl+C` en esa terminal para detenerlo.
`PORT` permite configurar otro puerto; `NODE_ENV=production` habilita cookies
Secure y TLS a MongoDB. Las variables del entorno tienen prioridad sobre `.env`.

## Registro, confirmación manual y administrador

Esta versión confirma las cuentas manualmente en Atlas; la confirmación por
correo y OAuth se implementarán más adelante.

1. Registra la cuenta desde la web con correo y contraseña. Se guarda el hash,
   `rol: "usuario"`, `confirmado: false` y `eliminado: false`.
2. En Atlas abre **Browse Collections / Data Explorer → procesos26_27 → usuarios**.
3. Busca el documento por su email. Para aprobar una cuenta cambia `confirmado`
   al booleano **true**, sin comillas. Para el administrador cambia también
   `rol` al texto **administrador**. Guarda el documento.
4. Inicia sesión en la aplicación con ese correo y contraseña.

No hay ruta pública de confirmación o promoción: enviar `rol`, `activo` o
`confirmado` en el registro no concede permisos. No cambies el hash `clave`,
`id`, `_id` ni `eliminado` al confirmar. La cuenta eliminada sigue sin poder entrar.
El estado activo se calcula como `confirmado === true && eliminado === false`.
La sesión consulta de nuevo el documento y el rol en cada operación protegida.

Solo el administrador puede listar y consultar estados. Puede eliminar cualquier
cuenta; un usuario normal solo la suya. Sin sesión se devuelve 401; sin rol, 403.
Entrega al profesor las credenciales de revisión por separado, nunca en GitHub.

## Pruebas

```powershell
cd servidor
npm.cmd test
```

Las pruebas locales usan archivos SQLite temporales y no conectan con la base
real aunque exista `.env`. Comprueban hashes, duplicados, cuentas pendientes,
confirmación, roles falsificados, eliminación, recuperación de sesión y logs.
CI usa además un MongoDB 8 desechable para probar persistencia entre procesos,
confirmación editando documentos y restricciones. La prueba MongoDB se omite en
local si no se define `MONGODB_TEST_URL`; solo acepta un servidor local y una base
cuyo nombre empiece por `pruebas_`, nunca Atlas.

## Variables y secretos

Nombres de la aplicación: `PORT`, `NODE_ENV`, `DATABASE_URL`.
`DATABASE_PATH` se reserva para SQLite en pruebas; `MONGODB_TEST_URL` para CI.
No se usan `ADMIN_EMAIL` ni `ADMIN_CLAVE`: la confirmación y el rol se editan en Atlas.
No subas `.env`, credenciales, bases ni logs al repositorio.

Las sesiones están en memoria: recargar la página conserva la cookie, pero
reiniciar o escalar a cero termina las sesiones. Los usuarios permanecen en Atlas.
Los logs incluyen fechas, operaciones, resultados e IDs, sin correos, hashes,
contraseñas, cookies ni cadenas de conexión.

## API

- `POST /api/registro`: email y clave; crea cuenta pendiente.
- `POST /api/login`: email y clave; solo cuenta confirmada y no eliminada.
- `POST /api/logout` y `GET /api/sesion`.
- `GET /api/usuarios` y `GET /api/usuarios/:id/activo`: administrador.
- `DELETE /api/usuarios/:id`: administrador o titular de la cuenta.
- `GET /api/salud`: comprueba conexión con la base.

## Despliegue y entrega

Migración a Google Cloud pendiente de conectar la nueva cuenta de Atlas y
comprobar el servicio. El prototipo anterior está en
https://procesos26-27.onrender.com; usa la base anterior, no esta nueva versión.
No se trasladan automáticamente las cuentas de Neon o SQLite a Atlas.
La URL de Cloud Run y `entrega.txt` se actualizarán cuando el nuevo despliegue
esté verificado. Configura Cloud Build para desplegar cada cambio integrado en
`main`, con la imagen de la raíz del repositorio.

Se usa GitHub Flow: rama por cambio, pruebas locales, PR, CI en verde, revisión e
integración por el alumno. Las tareas de DoneTonic se verifican antes de marcarlas
Hecho. La fecha de entrega usa el último commit de `main`, no las ramas pendientes.
