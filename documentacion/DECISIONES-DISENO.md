# Decisiones de diseño del Sprint 2

Estado vigente a 19 de noviembre de 2026. Cada decisión relaciona una regla con su motivo, alternativa y coste. Las decisiones históricas pendientes de la especificación del 5 de noviembre quedan sustituidas, en cuanto al comportamiento implementado, por este documento y los informes P18 a P24.

## D1 Cancelación

Solo el cliente propietario cancela mientras la solicitud está pendiente. Conservamos estado e historial para poder explicar qué ocurrió.

**Alternativas y consecuencias:** Borrar la solicitud perdería trazabilidad; permitir cancelar una ruta ya planificada exigiría coordinar reservas y otras paradas. Queda fuera de alcance.

**Evidencia:** `servidor/solicitudes.js`, P18.

## D2 Revisión

Administración acepta o rechaza pendientes; rechazo con motivo y revisión para impedir sobrescrituras.

**Alternativas y consecuencias:** La última escritura sin revisión es más sencilla, pero puede ocultar una decisión concurrente. El usuario debe volver a consultar ante 409.

**Evidencia:** `servidor/solicitudes.js`, P19.

## D3 Recursos

Vehículo y cuenta conductor se reservan por fecha de ruta activa; matrícula y cuenta vinculada no se duplican.

**Alternativas y consecuencias:** Reservas por intervalos horarios permiten más utilización, pero requieren horarios y reglas que el alcance no define. No inferimos kg o m³ desde bultos.

**Evidencia:** `servidor/rutas.js`, `datos-mongodb.js`, P21/P22.

## D4 Itinerario

La ruta sale de Yecla y conserva una copia ordenada de direcciones, contactos, mercancía y recursos al planificar.

**Alternativas y consecuencias:** Leer siempre las fichas actuales podría cambiar el itinerario histórico. La copia aumenta almacenamiento y no incorpora automáticamente cambios posteriores.

**Evidencia:** `servidor/rutas.js`, P22.

## D5 Entregas

Iniciar pasa a tránsito; una incidencia requiere motivo; puede resolverse como entregada. La última entrega completa la ruta y libera reservas.

**Alternativas y consecuencias:** Permitir estados arbitrarios o volver atrás simplificaría correcciones, pero exigiría reglas de auditoría y reservas adicionales. No hay corrección administrativa en este alcance.

**Evidencia:** P23 y `servidor/flujo-p24.test.js`.

## D6 Fuente de seguimiento

Se conservan ocho PBI y 50 unidades visibles, sin interpretar las estimaciones como horas. P18 queda como trazabilidad previa.

**Alternativas y consecuencias:** Forzar una equivalencia con los valores 57 o 9 de gráficos sin conocer su configuración inventaría información. Las discrepancias se explican en la memoria.

**Evidencia:** `diagramas/memoria-sprint2/LEEME.md`.

## D7 Reintentos

Clave idempotente y revisión de datos para no duplicar solicitudes ni eventos tras perder una respuesta.

**Alternativas y consecuencias:** Deshabilitar solo el botón no protege frente a reenvíos HTTP o respuestas perdidas. El contrato debe conservar clave y contenido al reintentar.

**Evidencia:** `servidor/solicitudes.js`, `rutas.js`, pruebas de interfaz.

## D8 Atomicidad

Transacciones MongoDB e índices únicos coordinan ruta, solicitudes y reservas.

**Alternativas y consecuencias:** Actualizaciones independientes podrían dejar rutas parciales o reservas dobles. El coste es requerir replica set y gestionar conflictos/reintentos. SQLite solo sirve a pruebas aisladas.

**Evidencia:** `servidor/datos-mongodb.js`, `rutas-mongodb.test.js`.

## D9 Sesiones

MongoDB almacena hash del token y caducidad; se relee la cuenta para aplicar revocaciones.

**Alternativas y consecuencias:** La memoria del proceso perdería sesiones al reiniciar o escalar. Persistir añade consultas y gestión de expiración.

**Evidencia:** `servidor/sesiones.js`, `sesiones.test.js`.

## D10 Actualización entre perfiles

Sondeo secuencial cada cinco segundos desde comunicación; presentación aplica cambios solo si cambia el listado y no hay edición o diálogo.

**Alternativas y consecuencias:** WebSocket/SSE reducen latencia, pero añaden conexiones persistentes y coordinación. El sondeo añade peticiones y latencia de hasta un ciclo más red. Ocultar la pestaña lo pausa. No se reemplazan borradores ni se confirma una escritura por adelantado.

**Evidencia:** `cliente/rest.js`, `presentacion.js`, `servidor/actualizacion.test.js`.


## Fronteras de capas

`cliente/rest.js` concentra HTTP. Presentación dibuja datos y gestiona interacción; no decide permisos. Las rutas HTTP del Sprint 2 delegan reglas en `servidor/logica.js`, `solicitudes.js` y `rutas.js`; los adaptadores de datos resuelven persistencia. Las validaciones de forma HTTP no sustituyen las reglas del servidor. Ningún documento o prueba simulada acredita por sí solo recepción real de correo o consentimiento de Google.
