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
| Pendiente | Backend | Pendiente |
| Pendiente | Frontend | Pendiente |
| Pendiente | Base de datos | Pendiente |
| GitHub | Control de versiones | Gestión del repositorio, ramas y Pull Requests |
| Pendiente | CI/CD | Ejecución automática de pruebas y despliegue |

## Ejecución en local

> Esta sección se completará cuando esté disponible la primera versión ejecutable del proyecto.

```bash
# Pendiente
```

## Pruebas

Las pruebas del proyecto serán automatizadas y podrán ejecutarse mediante un único comando.

```bash
# Pendiente
```

## Variables de entorno

Las claves y secretos necesarios para ejecutar la aplicación no se almacenarán en el repositorio.

El proyecto incluirá un archivo `.env.example` con las variables necesarias sin sus valores reales.

```env
# Pendiente
```

## Despliegue

La aplicación se desplegará automáticamente en un proveedor cloud mediante el pipeline de CI/CD.

**URL de producción:** Pendiente

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
