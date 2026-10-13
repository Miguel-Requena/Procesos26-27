# SaaS User Management Application

Proyecto desarrollado para la asignatura **Procesos de Ingeniería del Software**, curso 2026-2027.

## Descripción

El objetivo del proyecto es diseñar e implementar la estructura base de una aplicación tipo SaaS (Software as a Service) con gestión de usuarios.

La aplicación seguirá una arquitectura cliente-servidor organizada en capas y permitirá gestionar usuarios, autenticación, sesiones y diferentes roles.

## Arquitectura

El proyecto estará dividido en frontend y backend.

### Backend

El backend estará organizado en tres capas:

- **API:** recibe las peticiones del cliente.
- **Lógica de negocio:** contiene las reglas y operaciones de la aplicación.
- **Acceso a datos:** gestiona la comunicación con la base de datos.

### Frontend

El frontend estará dividido en:

- **Presentación:** interfaz gráfica de la aplicación.
- **Cliente API:** comunicación con el backend.

El frontend no accederá directamente a la base de datos. Toda comunicación se realizará mediante la API del backend.

## Funcionalidades

Durante el Sprint 1 se implementarán:

- Registro de usuarios.
- Confirmación de cuenta mediante correo electrónico.
- Inicio de sesión con email y contraseña.
- Inicio de sesión mediante OAuth.
- Cierre de sesión.
- Persistencia de sesión entre recargas.
- Roles de usuario y administrador.
- Listado de usuarios.
- Consulta del estado de los usuarios.
- Eliminación de usuarios.
- Persistencia mediante base de datos.
- Pruebas unitarias automatizadas.
- Registro de actividad del sistema.
- Manejo de errores.

## Tecnologías

> Esta sección se completará a medida que se seleccionen las tecnologías del proyecto.

| Tecnología | Uso | Justificación |
|---|---|---|
| Node.js + Express | Backend y API REST | Ligero y suficiente para el esqueleto inicial |
| HTML | Frontend mínimo | Permite validar el despliegue desde el primer día |
| JavaScript y Fetch | Presentación y cliente API separados | Permite formularios y recuperación de sesión sin añadir un framework |
| bcrypt | Hash de contraseñas | Almacena contraseñas con un hash diseñado para este uso |
| SQLite (node:sqlite) | Datos locales | Conserva cuentas entre reinicios sin instalar un servidor de base de datos |
| PostgreSQL + pg + Neon | Datos en cloud | Conserva cuentas fuera del disco efímero de Render Free |
| GitHub | Control de versiones | Gestión del repositorio, ramas y Pull Requests |
| GitHub Actions + Render | CI/CD | Pruebas en cada cambio y despliegue en `main` |

## Ejecución en local

> Esta sección se completará cuando esté disponible la primera versión ejecutable del proyecto.

```bash
cd servidor
npm install
npm start
```

La aplicación estará disponible en `http://localhost:3000`. La página mínima se sirve
desde `cliente/index.html`.

## Pruebas

Las pruebas del proyecto serán automatizadas y podrán ejecutarse mediante un único comando.

```bash
cd servidor
npm test
```

## Variables de entorno

Las claves y secretos necesarios para ejecutar la aplicación no se almacenarán en el repositorio.

El proyecto incluirá un archivo `.env.example` con las variables necesarias sin sus valores reales.

En local se usan valores por defecto para el puerto y la ruta de SQLite. El puerto
de producción se toma de `PORT` y, si no existe, se usa el 3000.
En producción se configura `NODE_ENV=production` para que la cookie de sesión use
`Secure`; la aplicación debe servirse por HTTPS. Consulta `.env.example`, que se
carga automáticamente al copiarlo como `.env` en la raíz.

## Despliegue

La aplicación se desplegará automáticamente en un proveedor cloud mediante el pipeline de CI/CD.

**URL de producción:** la URL asignada por Render al crear el servicio a partir de
`render.yaml`.

Para activar el despliegue automático, crea un servicio web en Render usando este
repositorio, genera un Deploy Hook y guárdalo en GitHub como secreto
`RENDER_DEPLOY_HOOK`. El workflow `.github/workflows/cd.yml` lo invocará en cada push
a `main`; hasta entonces el workflow deja constancia de que falta esa configuración.

### API del Hito 1

- `POST /api/registro` con `{ "email": "...", "clave": "..." }`
- `POST /api/login` con `{ "email": "...", "clave": "..." }`
- `POST /api/logout` invalida la sesión y elimina su cookie.
- `GET /api/sesion` recupera el usuario autenticado o devuelve 401.
- `GET /api/usuarios`
- `GET /api/usuarios/:id/activo`
- `DELETE /api/usuarios/:id`
- `GET /api/salud`

### Estado del Hito 2

La página incluye registro, login y cierre de sesión. `cliente/rest.js` realiza
las peticiones HTTP; `cliente/presentacion.js` gestiona los formularios y el DOM.
El backend sirve ambos desde el mismo origen. `servidor/datos.js` almacena los
usuarios en SQLite desde el Hito 3 y `servidor/logica.js` aplica las reglas y el hash bcrypt.

El registro normaliza el email y exige una contraseña de al menos 6 caracteres y
como máximo 72 bytes UTF-8, el límite de bcrypt. El login crea un token aleatorio
en una cookie HttpOnly y SameSite=Strict, con una duración de 8 horas. El token y
el usuario asociado se validan en el servidor. Recargar conserva la sesión;
cerrarla invalida el token aunque se vuelva a enviar la cookie anterior.

Las rutas de `/api/usuarios` requieren una sesión válida y devuelven 401 sin ella.
El registro, login y salud son públicos. Desde el Hito 3 el listado y la consulta
del estado requieren rol administrador; la eliminación admite administrador o
la propia cuenta. La confirmación por correo corresponde a P8 (hito 4).
Por ahora las cuentas locales se activan al registrarse.

En el Hito 2 los usuarios y sesiones estaban en memoria. El Hito 3 conserva
usuarios y roles en SQLite; las sesiones se siguen invalidando al reiniciar.

### Seguimiento de tareas del Hito 2

Cada rama depende de la anterior. Los PR se revisan e integran en este orden;
después de integrar el anterior, la base del siguiente PR se cambia a `main`.

| PBI / tarea | Rama | Cambio |
|---|---|---|
| P7 / T5 | `tarea-5-cierre-sesion` | Creación e invalidación de sesiones |
| P7 / T6 | `tarea-6-sesion-entre-recargas` | Recuperación de la sesión al cargar |
| P6 / T10 | `tarea-10-registro-local-seguro` | Validación y almacenamiento con hash |
| P10 / T11 | `tarea-11-interfaz-cliente-api` | Formularios y comunicación separados |
| P7 / T12 | `tarea-12-rutas-protegidas` | Protección de rutas y pruebas HTTP |

En DoneTonic las tareas pasan a Verificando mientras se revisan sus PR. Se
marcan Hecho después de integrar con CI en verde y comprobar el resultado.

## Flujo de trabajo

El proyecto utiliza **GitHub Flow**.

Para cada funcionalidad o corrección:

1. Crear una nueva rama desde `main`.
2. Desarrollar los cambios en dicha rama.
3. Ejecutar las pruebas automatizadas.
4. Crear un Pull Request.
5. Comprobar que el CI finaliza correctamente.
6. Integrar los cambios en `main`.
7. Desplegar automáticamente la nueva versión.

## Acceso de administrador

Las credenciales de prueba no se publicarán en el repositorio.

Para crear el primer administrador configura `ADMIN_EMAIL` y `ADMIN_CLAVE` en
el `.env` ignorado o en el entorno, y ejecuta `npm.cmd run admin` desde `servidor`.
Después inicia sesión en la interfaz con esas credenciales. El script guarda solo
el hash, no muestra la contraseña y no promociona cuentas normales ya existentes.
Si la cuenta ya es administradora, no modifica su contraseña. Elimina `ADMIN_CLAVE`
del entorno cuando hayas terminado; envía las credenciales al profesor por separado.

## Configuración del Hito 3

Requiere Node.js 24. Copia `.env.example` a `.env` en la raíz para la configuración
local. El archivo no se sube a Git; las variables del entorno tienen prioridad.
Variables: `PORT`, `NODE_ENV`, `DATABASE_PATH`, `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_CLAVE`.
En cloud se introducen en el panel del proveedor, nunca en el código ni en YAML.
No publiques valores reales, bases de datos o logs.

Render gratuito no conserva archivos al reiniciar. En Render configura
`DATABASE_URL` con la conexión PostgreSQL de Neon, como variable secreta.
Si no existe `DATABASE_URL`, se usa SQLite local; SQLite en Render requiere
un disco persistente y el servidor rechaza usar allí un archivo efímero.

La capa de datos selecciona el adaptador SQLite o PostgreSQL. Ambos exponen las
mismas operaciones asíncronas, y la lógica espera sus resultados con `await`, sin
conocer el motor ni incluir SQL. Las reglas de usuarios y permisos son las mismas.
La primera sustitución de memoria por SQLite se hizo sin cambiar la lógica;
el despliegue remoto introduce la espera asíncrona necesaria para PostgreSQL.
Por defecto la base se crea en `servidor/almacenamiento/usuarios.sqlite`; configura
`DATABASE_PATH` para otra ubicación. Guarda usuarios y hashes, y las eliminaciones
son lógicas. Al reiniciar se conservan las cuentas, aunque las sesiones en memoria
terminan y hay que iniciar sesión de nuevo. `npm test` usa bases temporales separadas,
nunca la de desarrollo, y comprueba la persistencia entre procesos independientes.

`npm start` ejecuta `arrancar.js`, comprueba la base de datos y crea el primer
administrador si se han configurado `ADMIN_EMAIL` y `ADMIN_CLAVE`. Esto permite
inicializarlo también en Render Free, sin necesitar una terminal remota.
Las cuentas de SQLite local y Neon son independientes: no se copian automáticamente.

El CI añade PostgreSQL 18 desechable y ejecuta la misma prueba de persistencia y
permisos contra ese motor. En local esa prueba se omite si no hay una conexión
`POSTGRES_TEST_URL` a una base exclusivamente de pruebas. Nunca introduzcas ahí
la conexión de Neon real. Las pruebas locales siempre aíslan SQLite aunque el
entorno de la aplicación tenga configurado `DATABASE_URL`.

Los registros públicos siempre crean el rol `usuario`, aunque el cliente envíe
otro. Solo `administrador` puede listar y consultar estados. El administrador
puede eliminar cualquier cuenta y un usuario solo la propia. Las restricciones
se verifican en la lógica y el servidor responde 403 al acceso prohibido; una
cuenta eliminada no puede iniciar sesión ni usar sus sesiones anteriores.
La confirmación de correo y OAuth siguen pendientes para el Hito 4: las cuentas
locales se activan al registrarse en esta versión provisional.

El módulo `actividad.js` emite líneas JSON a la salida del servidor: fecha, evento,
resultado HTTP e identificadores numéricos. Registra altas, login correcto o fallido,
logout, consultas, eliminaciones, accesos rechazados e inicio del servidor y del
administrador. No registra emails, contraseñas, hashes, cookies, tokens, cuerpos,
cabeceras ni cadenas de conexión. En local los logs aparecen en la terminal; en
cloud se consultan en el panel del proveedor. No se suben archivos de log a Git.

## Autor

Miguel

## Asignatura

**Procesos de Ingeniería del Software — Curso 2026-2027**
