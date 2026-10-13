# Google Cloud Run con MongoDB Atlas

Proyecto Google: `procesos26-27` (743300312263). Servicio: `procesos26-27`.
Región del servicio ya creado: `europe-southwest1` (Madrid).
El despliegue anterior no se sustituye hasta comprobar la nueva revisión.

## Atlas

1. Crea la cuenta y un clúster **Free**. Elige, si está disponible en la capa
   gratuita, una región próxima a Madrid. No hace falta usar Cloud SQL.
2. Crea un usuario de base de datos para la aplicación con `readWrite` únicamente
   en `procesos26_27`. Este usuario de conexión no es el administrador de la app.
3. En **Connect → Drivers → Node.js**, obtén la URI `mongodb+srv://…` e incluye
   `/procesos26_27` antes de `?`. El nombre de base es obligatorio en esta versión.
   Usa el asistente para escapar caracteres especiales de la contraseña.
4. Configura Network Access para la salida del servidor. Cloud Run no tiene una
   IP de salida fija por defecto; restringir la lista a IP fija requiere configurar
   la salida de red correspondiente. No amplíes la lista de acceso sin revisar
   expresamente su alcance. No desactives TLS.

## Secretos en Google

Crea en Secret Manager el secreto `atlas-database-url` con la conexión completa.
No lo copies en GitHub, en `cloudbuild.yaml` ni en capturas. Concede a la cuenta
de ejecución de Cloud Run `Secret Manager Secret Accessor` sobre ese secreto.
En el servicio vincula `DATABASE_URL` a la última versión de ese secreto.
Configura también `NODE_ENV=production`. No uses secretos antiguos de Neon ni
`ADMIN_EMAIL`, `ADMIN_CLAVE` o `DATABASE_PATH` en el servicio.

## Compilación y despliegue continuo

`Dockerfile` construye cliente y servidor desde la raíz; `.dockerignore` excluye
secretos, archivos locales y pruebas. El proceso escucha en `0.0.0.0:$PORT`.

1. Comprueba la cuenta de facturación y los créditos del proyecto antes de ejecutar
   compilaciones o despliegues; los créditos no son un límite automático de gasto.
2. Habilita Cloud Build, Artifact Registry, Cloud Run y Secret Manager.
3. En Artifact Registry crea un repositorio Docker `procesos26-27` en Madrid.
4. Configura un activador de Cloud Build para el repositorio GitHub, rama `^main$`,
   archivo de configuración **cloudbuild.yaml** en la raíz.
5. La cuenta de compilación necesita escribir en ese repositorio de Artifact
   Registry, desplegar el servicio Cloud Run y actuar como su cuenta de ejecución.
   Concede solo estos permisos; no crees claves descargables de cuentas de servicio.
6. Integra las PR con CI en verde. El activador compila, sube la imagen y despliega
   automáticamente cada nuevo commit integrado.

Cloud Build mantiene acceso público, identidad e ingress según el servicio ya
configurado: el YAML no concede permisos públicos ni modifica IAM.
Para acceder al prototipo el servicio debe permitir acceso público e ingress Todo.
Configura facturación por solicitudes, CPU 1, memoria 512 MiB, mínimo 0 y máximo 1.
Las cuentas persisten en Atlas; las sesiones en memoria terminan al reiniciar o
escalar a cero y requieren volver a iniciar sesión.

## Confirmar al administrador desde Atlas

Registra primero la cuenta desde la URL de la aplicación. En Atlas abre
**Browse Collections → procesos26_27 → usuarios**, busca su email y edita:

```json
{
  "confirmado": true,
  "rol": "administrador"
}
```

Edita únicamente esos dos campos del documento existente; no sustituyas el
documento entero ni cambies `clave`, `_id`, `id` o `eliminado`. Guarda y vuelve
a iniciar sesión. Para un usuario normal basta con `confirmado: true`.
Por ahora esta aprobación es manual; no hay envío de correo ni OAuth.

## Verificación y entrega

- Salud 200; página principal accesible por HTTPS.
- Registro crea cuenta pendiente; login rechaza la cuenta antes de confirmar.
- Tras confirmar en Atlas, login y recarga funcionan; logout invalida la sesión.
- Usuario normal no lista ni consulta estados; administrador sí puede hacerlo.
- Usuario solo se elimina a sí mismo; administrador puede eliminar otras cuentas.
- Un eliminado no entra aunque se modifique de nuevo `confirmado` a true.
- Tras desplegar otra revisión, la cuenta sigue existiendo y puede volver a entrar.
- Logs incluyen actividad sin contraseñas, hashes ni conexiones.
- Un commit integrado dispara automáticamente una nueva revisión desde `main`.

Solo después actualiza la URL en `entrega.txt` y README. No se copian cuentas de
Neon automáticamente. Mantén el despliegue antiguo mientras verificas el nuevo.
