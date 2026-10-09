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
| Memoria del proceso | Datos de usuarios | Persistencia en memoria solicitada para el Hito 1 |
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

No se necesitan variables de entorno para ejecutar el esqueleto localmente. El puerto
de producción se toma de `PORT` y, si no existe, se usa el 3000.
En producción se configura `NODE_ENV=production` para que la cookie de sesión use
`Secure`; la aplicación debe servirse por HTTPS. Consulta `.env.example`.

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
usuarios en memoria y `servidor/logica.js` aplica las reglas y el hash bcrypt.

El registro normaliza el email y exige una contraseña de al menos 6 caracteres y
como máximo 72 bytes UTF-8, el límite de bcrypt. El login crea un token aleatorio
en una cookie HttpOnly y SameSite=Strict, con una duración de 8 horas. El token y
el usuario asociado se validan en el servidor. Recargar conserva la sesión;
cerrarla invalida el token aunque se vuelva a enviar la cookie anterior.

Las rutas de `/api/usuarios` requieren una sesión válida y devuelven 401 sin ella.
El registro, login y salud son públicos. Los permisos por rol se implementarán
en P5 (hito 3): en esta versión las rutas de usuarios son accesibles a cualquier
usuario autenticado. La confirmación por correo corresponde a P8 (hito 4).
Por ahora las cuentas locales se activan al registrarse.

Los usuarios y sesiones se pierden al reiniciar el servidor. La persistencia real
corresponde a P9. Esto permite probar la sesión entre recargas sin adelantar la
base de datos del hito 3.

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

Las instrucciones para acceder como administrador durante la evaluación se indicarán aquí.

Las credenciales de prueba no se publicarán en el repositorio.

## Autor

Miguel

## Asignatura

**Procesos de Ingeniería del Software — Curso 2026-2027**
