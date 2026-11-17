# P24 · Validación del flujo — T34 y T35

Numeración según las capturas de DoneTonic: T34 prepara datos ficticios y ejecuta solicitud → aceptación → ruta → entrega → consulta cliente con persistencia; T35 automatiza negativos y documenta modelo, API, demostración, CI y limitaciones. Los criterios CA24 del documento de Sprint 2 son propuestas de revisión.

**P24 y T34 no están terminados:** la entrega e incidencia dependen de P23. T35 cubre las reglas actuales; deberá ampliarse con las transiciones operativas cuando existan. No se han modificado estados en DoneTonic ni datos de producción.

## Entorno y reproducción

Base revisada: `bf150d5`; rama `codex/p24-validacion-flujo`. La versión exacta validada en CI corresponde al SHA de la ejecución del PR. Ejecución local del 17/11/2026: Windows, Node.js 24.21.0, npm 11.19.0, SQLite temporal, HTTP local y correo simulado.

Desde `servidor`:

```powershell
node --require ./entorno-pruebas.cjs --test flujo-p24.test.js
```

Regresión desde la raíz: `npm test`. Las pruebas nuevas entran automáticamente en este comando y en CI. GitHub Actions conserva el informe JUnit `resultados-pruebas`, incluidos fallos, omisiones y pendientes. No confundir resultados locales con resultados remotos.

El escenario crea administrador, cliente, otro cliente, conductor y otro conductor con correos `example.com`, contraseña exclusiva de pruebas y confirmación simulada. Prepara camión `2424PBI`, recurso de conductor de Yecla y solicitudes completas con mercancía, dirección y contactos ficticios. Utiliza fechas de diciembre de 2099. Cada proceso usa una BD temporal desechable; no carga `.env` ni necesita cuentas reales.

## Modelo y estados

Cuenta → solicitud por `clienteId`; cuenta → recurso conductor por `usuarioId`; ruta → conductor por `conductorId` y → vehículo por `vehiculoId`. Las paradas guardan `solicitudId`, orden, mercancía, dirección y contacto. La solicitud conserva internamente `rutaId`, revisión e historial. La respuesta del cliente incluye estado e historial, sin revisión ni identificadores internos de responsables o ruta.

Flujo actual: `pendiente_recogida → aceptada → planificada`. Una pendiente admite cancelación o rechazo administrativo con motivo. Revisar exige la revisión vigente; cancelar de nuevo devuelve 409 sin repetir eventos. Entregas, incidencias y liberación de reservas por finalización siguen pendientes de P23.

## Evidencias automatizadas

`servidor/flujo-p24.test.js` ejecuta por HTTP las operaciones con sesiones reales locales; solo el alta inicial y confirmación de cuentas usan el ayudante de pruebas.

| Caso | API | Esperado y observado en la ejecución focalizada |
|---|---|---|
| Alta completa y reintento idéntico | POST `/api/solicitudes` con `Idempotency-Key` | 201; reintento 200 y mismo ID |
| Datos distintos con misma clave | POST solicitudes | 409 |
| Recursos ficticios | POST `/api/administracion/vehiculos` y `/conductores` | 201 |
| Aceptación | POST `/api/administracion/solicitudes/:id/revision` | 200; historial coherente |
| Planificar pendiente | POST `/api/administracion/rutas` | 409 |
| Planificar aceptada / repetir | POST rutas administrativas | 201 / 409; una sola ruta |
| Fecha pasada, imposible o paradas duplicadas | POST rutas administrativas | 400; sin ruta parcial, solicitud sigue aceptada |
| Resumen asignado y ruta ajena | GET `/api/rutas` y `/api/rutas/:id` | Solo conductor asignado; ajena 404 |
| Estado del cliente | GET `/api/solicitudes/:id` | Planificada e historial pendiente → aceptada → planificada |
| Persistencia entre procesos | Nueva instancia HTTP, misma BD y cookie | Detalle del cliente e itinerario idénticos; sesión persistida |
| Sin sesión / solicitud ajena | Alta / detalle y cancelación | 401 / 404 |
| Rol administrador enviado por cliente | POST revisión | 403 |
| Acción desconocida / revisión obsoleta | POST revisión | 400 / 409 |
| Cancelación planificada | POST `/api/solicitudes/:id/cancelacion` | 409 |
| Cancelación pendiente y repetición | POST cancelación | 200 / 409; un solo evento |
| Entrega e incidencia → consulta cliente | Requiere P23 | TODO explícito; no ejecutado ni superado |

Resultado focalizado: 3 casos, **2 superados, 0 fallos y 1 TODO**. El TODO representa una dependencia pendiente; el comando termina correctamente sin acreditar el flujo completo.

Regresión local del 17/11/2026: **83 casos, 80 superados, 0 fallos, 2 omitidos (MongoDB) y 1 TODO (P23)**. No equivale a un resultado de CI con MongoDB.

La persistencia arranca otra instancia HTTP en otro proceso con la misma BD y sesión, sin caché compartida. La primera instancia permanece abierta; no se acredita con ello un reinicio de Cloud Run. `mongodb.test.js` y `rutas-mongodb.test.js` comprueban el adaptador de producción, persistencia y transacciones; requieren `MONGODB_TEST_URL` local, base `pruebas_*` y replica set, y se omiten si falta esa variable. CI los ejecuta con MongoDB real. `rutas.test.js` amplía conflictos de camión/conductor, concurrencia y rollback; las suites de solicitudes y revisión amplían permisos, validaciones y transiciones.

## Demostración manual para revisión

1. En entorno de prueba MongoDB replica set, entrar como cliente confirmado y crear solicitud con recogida, destinatario, dirección, localidad, código postal, contactos y mercancía completos. Anotar referencia.
2. Como administrador, aceptar esa referencia; comprobar vehículo y conductor habilitados y disponibles en Yecla.
3. Planificar en fecha futura libre; revisar orden, contactos, dirección, matrícula y conductor en el itinerario.
4. Como conductor asignado, comprobar el resumen. Otro conductor no debe verlo.
5. Como cliente propietario, comprobar estado e historial. Otro cliente no debe acceder por ID.
6. Reiniciar la aplicación conservando MongoDB y repetir consultas. Registrar versión, entorno, referencia, esperado, observado y evidencia.
7. Tras P23, registrar entrega e incidencia con las transiciones acordadas y consultar el resultado como cliente; comprobar reservas conforme al ciclo de vida implementado.

Esta demostración manual y su reinicio MongoDB no se han ejecutado en este cambio. No usar la solicitud antigua incompleta TD-32996F85. No publicar claves, cookies, datos personales ni URI de Atlas. Correo real, consentimiento Google y revisión visual se comprueban por separado.

## Trazabilidad y limitaciones

T34 → CA24-01 parcial y bloqueado por P23; CA24-03 con persistencia local automatizada y MongoDB según CI. T35 → CA24-02 para reglas actuales, CA24-04 con resultados y límites, CA24-05 con documentación y memoria. El recorrido cubre RF-10 a RF-16; RF-17 sigue pendiente.

No se ha observado un defecto funcional nuevo en el tramo validado. Faltan entrega/incidencias y sus negativos, demostración visual, reinicio manual MongoDB y aceptación humana. No hay mapas, optimización, edición/cancelación de rutas ni conversión de bultos a capacidad del camión. Un resultado omitido o pendiente no se considera superado.
