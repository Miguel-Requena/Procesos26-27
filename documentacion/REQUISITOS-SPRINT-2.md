# Requisitos y estado del Sprint 2

Revisión del 19 de noviembre de 2026. Este es el índice vigente para evaluar el incremento de TransDrakkar. Describe implementación y evidencia, sin sustituir la aceptación del responsable ni acreditar por sí mismo una prueba en producción.

**Hecho** significa que el comportamiento tiene implementación y pruebas identificadas. **Parcial** indica alcance pendiente y **pendiente** ausencia de implementación. Las comprobaciones reales de Google, correo y dos navegadores se registran aparte en la [guía de evaluación](GUIA-EVALUACION.md).

## RF-08

Mostrar identidad TransDrakkar y formularios coherentes. Requisito de interfaz.

- **PBI:** P15.
- **Estado:** Hecho.
- **Evidencia:** `cliente/index.html`, `cliente/estilos.css`; inspección visual del acceso.

## RF-09

Paneles y permisos de cliente, conductor y administrador; el registro no concede privilegios.

- **PBI:** P16.
- **Estado:** Hecho.
- **Evidencia:** `servidor/roles.test.js`, `perfiles-migracion.test.js`; API de paneles.

## RF-10

Crear solicitudes completas con recogida en Yecla y destinatario, dirección y contacto de entrega; fecha desde hoy en Madrid y reintentos idempotentes.

- **PBI:** P17.
- **Estado:** Hecho.
- **Evidencia:** `servidor/solicitudes.test.js`, `flujo-p24.test.js`; POST `/api/solicitudes`.

## RF-11

Consultar solicitudes propias, su estado e historial sin exponer otras solicitudes de la ruta.

- **PBI:** Trazabilidad previa P18.
- **Estado:** Hecho.
- **Evidencia:** `servidor/solicitudes.test.js`, `flujo-p24.test.js`; GET `/api/solicitudes/:id`.

## RF-12

Cancelar solo solicitudes propias pendientes, conservando historial y rechazando repeticiones o conflictos.

- **PBI:** Trazabilidad previa P18.
- **Estado:** Hecho.
- **Evidencia:** `servidor/solicitudes.test.js`; [P18](P18-consulta-cancelacion.md).

## RF-13

Filtrar y revisar solicitudes desde administración; aceptar o rechazar pendientes con motivo y revisión.

- **PBI:** P19.
- **Estado:** Hecho.
- **Evidencia:** `servidor/revision-solicitudes.test.js`; [P19](P19-revision-administrativa.md).

## RF-14

Gestionar vehículos con matrícula única normalizada, capacidad con unidad, sede y disponibilidad; baja sin perder historial.

- **PBI:** P21.
- **Estado:** Hecho.
- **Evidencia:** `servidor/recursos.test.js`; [P21](P21-recursos.md).

## RF-15

Gestionar recursos conductor vinculados a cuentas activas habilitadas, sin duplicados y con disponibilidad.

- **PBI:** P21.
- **Estado:** Hecho.
- **Evidencia:** `servidor/recursos.test.js`, `registro-identidad.test.js`; [P21](P21-recursos.md).

## RF-16

Planificar de 1 a 100 solicitudes aceptadas con entrega completa, ordenando paradas y reservando recursos de Yecla sin conflictos ni escrituras parciales.

- **PBI:** P22.
- **Estado:** Hecho.
- **Evidencia:** `servidor/rutas.test.js`, `rutas-mongodb.test.js`, `rutas-interfaz.test.js`; [P22](P22-rutas.md).

## RF-17

El conductor asignado consulta su itinerario, inicia, entrega o registra incidencia con motivo; resolverla y completar la última entrega libera reservas.

- **PBI:** P23.
- **Estado:** Hecho.
- **Evidencia:** `servidor/flujo-p24.test.js`, `entregas-interfaz.test.js`, `rutas-mongodb.test.js`; [P23](P23-entregas.md).


P24 valida y documenta los requisitos anteriores; no añade otro RF. El backlog de cierre contiene ocho PBI: P15, P16, P17, P19, P21, P22, P23 y P24, con **50 unidades de estimación visible**. P18 mantiene trazabilidad de funciones existentes, pero no se cuenta en ese backlog. No se equiparan unidades a horas ni se reconcilian artificialmente con los gráficos de DoneTonic.

## Calidad y límites

Las reglas y permisos se aplican en servidor. MongoDB conserva datos y sesiones; planificación y ejecución emplean transacciones. El sondeo del panel consulta cambios cada cinco segundos cuando la página está visible y no se está editando ni hay un diálogo abierto. Conserva los filtros; los detalles y selectores de planificación se actualizan con sus controles explícitos para no perder borradores.

No se incluyen mapas, optimización automática, conversión de bultos a capacidad, firma/fotos/geolocalización, cancelación de rutas ni corrección administrativa de entregas. No se publica ninguna contraseña de evaluación.

Las pruebas automáticas aisladas se ejecutan con `npm test`. Las integraciones MongoDB requieren el replica set de CI o una base local desechable `pruebas_*`. Los resultados históricos del cierre están en [P24](P24-validacion-flujo.md); deben distinguirse de la ejecución de esta revisión.
