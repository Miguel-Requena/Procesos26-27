# Sprint 1 · Arquitectura base

**Periodo planificado:** del 29 de septiembre al 27 de octubre de 2026.

El objetivo era conectarlo todo desde el navegador hasta el almacenamiento con una separación clara entre presentación, API y lógica. El incremento incorporó gestión de cuentas, registro, acceso, permisos y despliegue.

| Hito | PBI relacionados | Resultado |
| --- | --- | --- |
| H1 · Esqueleto y backend | P1, P2, P3, P4, P5, P12 | Repositorio, CI/CD, primeras operaciones de usuarios y pruebas. |
| H2 · Frontend y sesión | P6, P7, P10 | Registro local, inicio y cierre de sesión, recuperación al recargar y cliente HTTP separado. |
| H3 · Persistencia y roles | P3, P5, P9, P13 | MongoDB para cuentas, configuración de secretos, permisos y registro de actividad. |
| H4 · Servicios externos y documentación | P13, P14 | Confirmación por correo, acceso con Google y documentación. |

Los PBI asociados a cada hito se agrupan por su contenido. El informe histórico recoge **40,5 h estimadas y 10,5 h de dedicación registrada** para doce PBI. Las capturas corresponden a distintos momentos de la revisión del 27 de octubre. La sesión se mantenía en memoria en esta etapa y pasó a MongoDB el 3 de noviembre.

## Retrospectiva

La separación por capas y los adaptadores permitieron incorporar MongoDB manteniendo las reglas de negocio. El seguimiento debía relacionar cada PBI con su criterio de aceptación, su cambio en Git y su prueba, y registrar la dedicación al terminar cada tarea. El código y las pruebas simuladas de los proveedores se complementan con verificaciones en el entorno desplegado.

Fuentes y evidencias en el [informe original](anexos/Documentacion-Sprint-1-TransDrakkar.pdf) y el [seguimiento de la memoria](../SEGUIMIENTO-MEMORIA.md).
