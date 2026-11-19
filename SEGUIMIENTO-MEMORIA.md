# Seguimiento de la memoria y diagramas — TransDrakkar

Actualizado: 19 de noviembre de 2026.

## Estado vigente e historial

La documentación actual se consulta desde el README y `documentacion/REQUISITOS-SPRINT-2.md`, `DECISIONES-DISENO.md`, `ESPECIFICACION-SPRINT-2.md` y `GUIA-EVALUACION.md`. El Word se regenera desde la especificación vigente mediante `crear_especificacion_sprint2.py`.

Las secciones inferiores anteriores al cierre son **registro histórico**, no tareas pendientes actuales. En particular, las frases sobre RF aún no incorporados, sesiones en memoria, MiApp o ausencia de actualización integral corresponden al estado de esas sesiones. El cierre del 17/11 y las fuentes de `diagramas/memoria-sprint2/actualizados/` prevalecen sobre ellas. P18 no se cuenta en los ocho PBI de cierre. El borrador Word del 5/11 queda sustituido por la versión 1.0.

La revisión del 19/11 añade sondeo automático de listados entre perfiles. No afirma haber modificado la sesión actual de Overleaf ni haber repetido pruebas reales de Google o correo. Los resultados de comprobaciones nuevas se registran en `documentacion/REVISION-19-11-2026.md`.


## Actualización de Overleaf al cierre del Sprint 2

Se ha leído y respaldado el contenido vigente de Overleaf antes de editar. Se actualizan introducción, propuesta, descripción, manual por perfiles, pruebas, despliegue, conclusiones, requisitos, desarrollo y uso de IA; el título pasa a TransDrakkar. Se conserva la revisión histórica del Sprint 1. Las notas inferiores de sesiones anteriores conservan su contexto y no sustituyen este estado actual.

El autor confirma que P18 no figura en el backlog de cierre. Se documentan los ocho PBI de las capturas: P15, P16, P17, P19, P21, P22, P23 y P24, con 50 de estimación visible y 26,8 horas registradas. No se interpreta la unidad de estimación como horas sin confirmación. Se incorpora la captura adicional de P15/P16. Consulta y cancelación siguen implementadas y documentadas, sin asignar P18 al sprint.

En `figs` de Overleaf se incorporan las cuatro capturas originales de DoneTonic y un diagrama nuevo de estados del transporte. Las diferencias entre 50 de la tabla, 57 del avance y 9 de Trabajo Total en el burnup se explican sin inventar su causa. El backlog grande se recorta solo en la presentación LaTeX para facilitar la lectura; el archivo de la captura se conserva íntegro.

Se identifican el PR 42, el cierre 885b380 y la ejecución CI 44078563639 con 85 casos sin fallos ni omisiones, distinguiendo pruebas locales, MongoDB real, revisión visual y límites de los proveedores simulados. Fuentes actualizadas, figuras y generador del diagrama se conservan en `diagramas/memoria-sprint2/`. Los respaldos originales y PDF completo son locales y se excluyen de Git. El PDF contiene elementos personales de la plantilla; no se publica como parte del repositorio.

## P23 y cierre técnico P24 — 17 de noviembre de 2026

Se implementa RF-17: itinerario propio, inicio, entrega, incidencia con motivo y resolución. El usuario confirma los estados y liberación al completar todas las paradas. T34 ya recorre el flujo completo y T35 añade concurrencia, reintentos y errores de red; se elimina el TODO previo. Documentos P23/P24 recogen pruebas, modelo, API y evidencias visuales con datos ficticios. La aceptación final del Sprint 2 corresponde al responsable; no se modifica DoneTonic ni Overleaf.

## Registro histórico P24 antes de P23 — 17 de noviembre de 2026

Se añaden pruebas integradas HTTP con datos ficticios para T34/T35: alta, aceptación, recursos, planificación, consulta por perfiles y persistencia entre procesos, además de negativos de permisos, fechas, duplicados y transiciones actuales. El [informe P24](documentacion/P24-validacion-flujo.md) recoge modelo, API, reproducción, demostración y límites. La entrega e incidencia y sus transiciones requieren P23: T34 y P24 no pueden darse por terminados. No se han actualizado DoneTonic ni la memoria de Overleaf. Los criterios CA24 del documento siguen siendo propuestas de revisión.

## Punto anterior al cierre (registro histórico del 5 de noviembre)

El último tema tratado ha sido identificar los requisitos funcionales (RF) del Sprint 2 a partir de las capturas de todos sus PBI. Se propuso una relación RF–PBI en el chat, pero **todavía no se ha incorporado a Overleaf**. El siguiente paso, si se solicita continuar, es revisar esa propuesta y añadir los requisitos del Sprint 2 a la memoria con su trazabilidad a los PBI.

## Proyecto y memoria

- Aplicación: TransDrakkar, transporte de mobiliario, con perfiles de cliente, conductor y administrador.
- Proyecto local: `C:\Users\7migu\Desktop\Procesos26-27`.
- Overleaf: https://www.overleaf.com/project/6ab5094dbc95efb41db2f7bd
- Capítulo principal: `chapters/04-descripción.tex`.
- Desarrollo y revisión de sprints: `chapters/a1-desarrollo.tex`.
- Conclusiones: `chapters/05-conclusiones.tex`.
- Figuras de Overleaf: carpeta `figs`.
- La memoria aún contiene texto antiguo que llama a la aplicación «MiApp» y describe principalmente la gestión de cuentas de octubre. No se ha hecho una actualización integral de la memoria al Sprint 2.
- Las copias locales de los capítulos son respaldos de las ediciones realizadas por el asistente. **Antes de editar Overleaf, leer su contenido actual para conservar los cambios posteriores del usuario.**

## Diagramas realizados e incorporados

Se crearon con PlantUML y se añadieron con explicaciones a «Arquitectura de la solución»:

1. **4.2.1. Diagrama de despliegue.** Navegador, contenedor Node.js/Express en Google Cloud Run, MongoDB Atlas y servicios Google OAuth/Gmail SMTP.
2. **4.2.2. Diagrama de secuencia: acceso del Sprint 1.** Inicio de sesión, validación de cuenta y contraseña, creación de sesión y recuperación del acceso. Se explica que es un caso de uso del Sprint 1 representado con la persistencia de la revisión actual, sin atribuir esa mejora al cierre histórico del sprint.
3. **4.2.3. Diagrama de secuencia: solicitud de recogida.** Caso P17 del Sprint 2: autorización, validación, guardado, clave de idempotencia y resultados 201, 200, 409 y errores.

### Corrección sobre sesiones

La primera versión del despliegue decía que las sesiones vivían en memoria y se perdían al reiniciar. Después se revisó el código y se encontró una revisión más reciente con sesiones persistentes:

- `servidor/sesiones.js` delega el almacenamiento en la capa de datos.
- MongoDB guarda hash SHA-256 del token, usuario y caducidad; existe un índice de caducidad.
- Duración de sesión: ocho horas.
- Un reinicio de Cloud Run no elimina una sesión vigente en Atlas; el navegador debe conservar la cookie y la cuenta debe seguir autorizada.
- Se corrigieron el diagrama, la explicación del capítulo y el trabajo futuro de las conclusiones.
- El README consultado seguía describiendo sesiones en memoria; no se actualizó en esta tarea. No asumir que su descripción es la más reciente sin contrastar el código.
- No se verificó en esta conversación el comportamiento real de la revisión desplegada en producción.

### Colocación de imágenes

El usuario detectó que las figuras flotantes pasaban al apartado siguiente. Se sustituyeron los entornos flotantes de los tres diagramas por bloques `center` + `minipage` con `captionof{figure}` y `captionsetup{hypcap=false}`. Se añadió `clearpage` antes de 4.2.1 para mantener juntos su título y diagrama. Se comprobó visualmente que el despliegue precede a 4.2.2.

Las imágenes que habían quedado en `chapters` se movieron a `figs`, renombrando las copias para evitar sobrescrituras. No se borraron de forma irreversible. El usuario ha podido modificar después el inventario de archivos.

## Tabla de revisión del Sprint 1

Se añadió a `a1-desarrollo.tex` una tabla con columnas **PBI, descripción, hito, estimación (h), real (h)**. Inicialmente era parcial; después se completó con los 12 PBI de las capturas. El usuario ajustó las horas reales y se conservaron al asignar hitos.

Últimos valores leídos y guardados:

| PBI | Descripción | Hito | Estimación (h) | Real (h) |
|---|---|---|---:|---:|
| P1 | Crear repositorio y estructura base | H1 | 7 | 1 |
| P2 | Configurar flujo de trabajo y CI/CD | H1 | 2 | 0,5 |
| P3 | Configurar entorno y secretos | H1 y H3 | 1 | 0,5 |
| P4 | Implementar gestión básica de usuarios | H1 | 10 | 1,5 |
| P5 | Implementar eliminación, roles y permisos | H1 y H3 | 1,5 | 0,5 |
| P6 | Implementar registro local seguro | H2 | 2 | 0,5 |
| P7 | Implementar inicio, cierre y persistencia de sesión | H2 | 8 | 2 |
| P9 | Implementar persistencia en base de datos | H3 | 3 | 1 |
| P10 | Implementar estructura y comunicación del frontend | H2 | 1 | 0,5 |
| P12 | Implementar pruebas automatizadas | H1 | 2 | 0,5 |
| P13 | Implementar logging, manejo de errores y documentación | H3 y H4 | 2 | 1 |
| P14 | Documentar el Sprint 1 | H4 | 1 | 0,5 |
| **Total** | | | **40,5** | **10,5** |

### Cuatro hitos aportados por el usuario

- **H1, semana 1: Esqueleto y backend.** Repositorio, ramas y PR, CI/CD desde el primer día, lógica de usuarios inicialmente en memoria, pruebas unitarias y API.
- **H2, semana 2: Frontend y sesión.** Presentación y comunicación separadas, registro y login locales con hash, logout, mantener sesión entre recargas y rutas protegidas.
- **H3, semana 3: Persistencia y roles.** Base de datos real sin modificar la lógica, secretos fuera del código, roles usuario/administrador y registro de actividad.
- **H4, semana 4: Servicios externos y cierre.** OAuth, confirmación por correo, feedback de errores, README y revisión final.

La asignación de hitos es por el contenido de los PBI. P3, P5 y P13 abarcan varios hitos. P7 se relaciona con mantener sesión entre recargas en H2; esto no debe confundirse con persistir datos tras reiniciar el servidor en H3. Los PBI mostrados no incluyen uno específico de OAuth o correo: no atribuir esas funciones al PBI de registro local ni dar H4 por completo únicamente por P13/P14.

La última compilación comprobada tras asignar hitos tenía **0 errores**. Quedaban avisos de plantilla/maquetación; no se afirmó que toda la memoria estuviera revisada.

## Sprint 2: PBI completos aportados

Las capturas contienen nueve PBI (los saltos de numeración son los de DoneTonic):

| PBI | Descripción | Estimación visible |
|---|---|---:|
| P15 | Personalizar el acceso con la identidad de TransDrakkar | 4 |
| P16 | Acceder como cliente, conductor o administrador | 10 |
| P17 | Solicitar transporte de mobiliario | 7 |
| P18 | Consultar y cancelar mis solicitudes de transporte | 5 |
| P19 | Revisar solicitudes desde administración | 5 |
| P21 | Gestionar vehículos y conductores disponibles | 6 |
| P22 | Planificar rutas y asignar vehículo y conductor | 8 |
| P23 | Consultar mi ruta y actualizar entregas | 6 |
| P24 | Validar y documentar el flujo de transporte completo | 4 |

No se aportaron en esas capturas los criterios de aceptación ni las tareas detalladas. Los títulos describen alcance planificado; no prueban que todas las funciones estén implementadas.

### Propuesta de RF del Sprint 2, aún solo en el chat

Se propusieron diez requisitos continuando los siete RF iniciales de la memoria:

| RF | Requisito propuesto | PBI |
|---|---|---|
| RF-08 | Mostrar el acceso con la identidad visual de TransDrakkar | P15 |
| RF-09 | Acceder como cliente, conductor o administrador, con permisos y panel correspondiente | P16 |
| RF-10 | Crear una solicitud de transporte de mobiliario | P17 |
| RF-11 | Consultar las solicitudes propias y su estado | P18 |
| RF-12 | Cancelar solicitudes propias según las condiciones establecidas | P18 |
| RF-13 | Consultar y revisar solicitudes desde administración | P19 |
| RF-14 | Gestionar vehículos disponibles | P21 |
| RF-15 | Gestionar conductores disponibles | P21 |
| RF-16 | Planificar rutas y asignar vehículo y conductor | P22 |
| RF-17 | Consultar la ruta asignada y actualizar el estado de las entregas | P23 |

- **P24 no añade una función nueva**: corresponde a validación y documentación.
- RF-08 es de identidad visual/interfaz. Si se clasifica como requisito no funcional o de interfaz en la asignatura, serían **9 RF y 1 requisito de interfaz**, y habría que ajustar la numeración antes de incorporarlos.
- Esta descomposición es una propuesta basada en títulos, no una especificación aprobada ni un conteo oficial. No convertir automáticamente cada tarea en un RF.

## DoneTonic: incidencia de sprint cerrado

El usuario marcó todo como hecho y dejó de ver el Sprint 1. Se indicó «Mostrar cerrados» en Backlog/Sprint Backlog, opción que aparecía en sus capturas. El usuario logró localizarlo, pero «Ir al tablero» devuelve «el board ya está cerrado».

Se sugirió consultar los PBI desde la tarjeta desplegada del sprint o exportar el backlog incluyendo todos los sprints. No se accedió a su sesión de DoneTonic ni se reabrió el sprint. No está comprobado que se pueda abrir el tablero cerrado directamente; no prometerlo. El usuario acabó aportando capturas de los PBI para completar la tabla.

## Archivos locales útiles

En `diagramas/`:

- `despliegue.puml`: fuente del despliegue corregida con sesiones persistentes.
- `despliegue-persistente.png`: imagen corregida usada en la memoria.
- `secuencia-login.puml` y `secuencia-login.png`: acceso/Sprint 1.
- `secuencia-recogida.puml` y `secuencia-recogida.png`: solicitud de recogida/Sprint 2.
- `capitulo-original.tex`: respaldo anterior a las primeras inserciones.
- `capitulo-con-diagramas.tex`: copia local tras las ediciones del capítulo.
- `anexo-desarrollo-tabla.tex`: copia local del anexo con hitos y horas reales leídas.
- `tabla-sprint1-hitos.png`: evidencia visual de la tabla con hitos.
- `despliegue-posicion-corregida.png`: evidencia de colocación.
- Otras capturas y versiones previas de las figuras se conservan en esta carpeta. `despliegue.png` es una versión anterior; usar la variante persistente para la memoria actual.

## Cómo continuar

1. Leer el contenido actual de Overleaf antes de modificarlo: el usuario edita allí entre turnos.
2. Si se pide incorporar los RF del Sprint 2, decidir la clasificación del requisito de identidad visual y añadir la lista con su relación RF–PBI.
3. Separar requisitos planificados de funcionalidades verificadas; contrastar el código si se documenta estado de implementación.
4. Compilar y revisar visualmente el PDF después de cambios, especialmente tablas y ubicación de imágenes.
5. No inferir horas, fechas, estados de cierre ni criterios de aceptación no aportados.

No se ha realizado ningún despliegue ni modificación del código de la aplicación como parte de este trabajo de memoria.
