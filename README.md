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

## Registro e inicio de sesión

El registro permite iniciar sesión inmediatamente con correo y contraseña.
La confirmación por correo y la aprobación manual se han aplazado.
Las cuentas nuevas se guardan con `rol: "usuario"`, `confirmado: true` y
`eliminado: false`; la contraseña se almacena como hash bcrypt.

Para disponer de un administrador, registra primero su cuenta y en Atlas abre
**Browse Collections / Data Explorer → procesos26_27 → usuarios**. Busca su email
y cambia únicamente `rol` al texto **administrador**. Guarda el documento y vuelve
a iniciar sesión. No cambies el hash, el ID ni `eliminado`.
No hay ruta pública de promoción: enviar un rol en el registro no concede permisos.

Solo el administrador lista y consulta estados; puede eliminar cualquier cuenta.
Un usuario normal solo elimina la suya. Un eliminado no puede iniciar sesión.
El servidor valida sesión y rol en cada operación. Envía al profesor las
credenciales de revisión por separado, nunca en GitHub.

## Pruebas

```powershell
cd servidor
npm.cmd test
```

Las pruebas locales usan archivos SQLite temporales y no conectan con la base
real aunque exista `.env`. Comprueban hashes, duplicados, cuentas pendientes,
login inmediato, roles falsificados, eliminación, recuperación de sesión y logs.
CI usa además un MongoDB 8 desechable para probar persistencia entre procesos,
roles editando documentos y restricciones. La prueba MongoDB se omite en
local si no se define `MONGODB_TEST_URL`; solo acepta un servidor local y una base
cuyo nombre empiece por `pruebas_`, nunca Atlas.

## Variables y secretos

Nombres de la aplicación: `PORT`, `NODE_ENV`, `DATABASE_URL`.
`DATABASE_PATH` se reserva para SQLite en pruebas; `MONGODB_TEST_URL` para CI.
No se usan `ADMIN_EMAIL` ni `ADMIN_CLAVE`: el rol administrador se edita en Atlas.
No subas `.env`, credenciales, bases ni logs al repositorio.

Las sesiones están en memoria: recargar la página conserva la cookie, pero
reiniciar o escalar a cero termina las sesiones. Los usuarios permanecen en Atlas.
Los logs incluyen fechas, operaciones, resultados e IDs, sin correos, hashes,
contraseñas, cookies ni cadenas de conexión.

## API

- `POST /api/registro`: email y clave; permite entrar inmediatamente.
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
`main`, con `cloudbuild.yaml` en la raíz. Consulta [la guía de despliegue](DESPLIEGUE-GOOGLE-CLOUD.md).

Se usa GitHub Flow: rama por cambio, pruebas locales, PR, CI en verde, revisión e
integración por el alumno. Las tareas de DoneTonic se verifican antes de marcarlas
Hecho. La fecha de entrega usa el último commit de `main`, no las ramas pendientes.
