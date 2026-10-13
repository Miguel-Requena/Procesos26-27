# Despliegue en Google Cloud Run

Proyecto: `procesos26-27` (número `743300312263`).

Cloud Run ejecuta la imagen del Dockerfile de la raíz. La imagen incluye frontend
y backend del mismo origen, usa Node 24 y escucha en `0.0.0.0` y en el `PORT`
asignado por Cloud Run. `.dockerignore` excluye secretos, bases locales y logs.

## Configuración del servicio

- Nombre: `procesos26-27`.
- Región recomendada: `us-east1`, próxima a la base de Neon en Ohio.
- Contenedor: Dockerfile de la raíz, contexto de compilación la raíz completa.
- Puerto: 8080 (Cloud Run configura `PORT`).
- CPU: 1; memoria: 512 MiB; facturación basada en solicitudes.
- Mínimo de instancias: 0; máximo: 1.
- Variable `NODE_ENV`: `production`.
- `DATABASE_URL`: referencia a un secreto de Secret Manager con la conexión de Neon.
- No configurar `DATABASE_PATH`: el disco del contenedor no conserva cuentas.
- URL pública para la interfaz; la API mantiene sus comprobaciones de sesión y rol.

El máximo de una instancia mantiene las sesiones en memoria en un único proceso.
Al escalar a cero o desplegar otra revisión las sesiones terminan, pero las cuentas
persisten en Neon. Si se necesitan varias instancias hay que externalizar sesiones.

## Despliegue continuo

En Cloud Run configura el despliegue desde GitHub con Cloud Build, selecciona
`Miguel-Requena/Procesos26-27` y el Dockerfile de la raíz. Usa inicialmente la rama
de esta PR; después de integrar todas las PR selecciona `main` para desplegar cada
cambio integrado. Los permisos del servicio de compilación se conceden desde la
consola, sin subir claves de cuentas de servicio al repositorio.

La cuenta de facturación del proyecto debe ser la que tiene los créditos de
estudiantes. Comprueba su saldo antes de desplegar: la cuota gratuita y los
créditos no equivalen a un límite automático de gasto.

Mantén el prototipo de Render hasta comprobar registro, login, recarga, logout,
restricciones y persistencia en la URL de Cloud Run. Solo entonces actualiza la
primera línea de `entrega.txt` y la URL del README.
