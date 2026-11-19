# Sprint 2 · Gestión del transporte de mobiliario

El objetivo fue completar el flujo desde la solicitud del cliente hasta la entrega, con administración a cargo de la revisión y planificación y el conductor a cargo de la ejecución.

| PBI de cierre | Resultado | Trazabilidad |
| --- | --- | --- |
| P15 | Identidad visual de TransDrakkar. | [RF-08](requisitos.md#rf-08) |
| P16 | Paneles y permisos por perfil. | [RF-09](requisitos.md#rf-09) |
| P17 | Alta de una solicitud con recogida y entrega completas. | [RF-10](requisitos.md#rf-10) |
| P19 | Revisión administrativa con aceptación o rechazo motivado. | [RF-13](requisitos.md#rf-13) |
| P21 | Catálogo de vehículos y conductores. | [RF-14](requisitos.md#rf-14) y [RF-15](requisitos.md#rf-15) |
| P22 | Planificación de rutas con itinerario ordenado y reservas. | [RF-16](requisitos.md#rf-16) |
| P23 | Inicio de ruta, entregas e incidencias. | [RF-17](requisitos.md#rf-17) |
| P24 | Validación del flujo completo con pruebas y evidencias. | [Informe P24](anexos/P24-validacion-flujo.md) |

El backlog de cierre recoge **50 unidades de estimación visible y 26,8 h registradas** para estos ocho PBI. La consulta y cancelación están implementadas y tienen [trazabilidad previa en P18](anexos/P18-consulta-cancelacion.md).

## Validación

El [informe P24](anexos/P24-validacion-flujo.md) reúne la demostración con datos ficticios, pruebas HTTP y comprobaciones de persistencia, concurrencia y permisos. La [revisión del 19 de noviembre](anexos/REVISION-19-11-2026.md) recoge la actualización automática de listados entre perfiles y su verificación posterior. Para reproducir la evaluación manual, consulta la [guía de evaluación](anexos/GUIA-EVALUACION.md).

## Especificación y evidencias

- [Especificación vigente en Markdown](anexos/ESPECIFICACION-SPRINT-2.md) y [versión Word](anexos/Especificacion-Sprint-2-TransDrakkar.docx).
- [Revisión de solicitudes](anexos/P19-revision-administrativa.md), [recursos](anexos/P21-recursos.md), [planificación](anexos/P22-rutas.md) y [entregas](anexos/P23-entregas.md).
- [Identidad en el registro](anexos/REGISTRO-IDENTIDAD.md) y [evidencias de revisión del borrador](anexos/qa-sprint2/LEEME.md).
