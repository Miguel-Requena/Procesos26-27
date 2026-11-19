# P21 · Vehículos y conductores disponibles

El panel administrativo permite registrar y editar camiones y conductores. Los camiones guardados se recuperan desde un desplegable por matrícula y sede. La matrícula se normaliza a mayúsculas sin espacios ni guiones y es única incluso entre recursos desactivados. Cada camión declara tipo, capacidad con unidad, sede, actividad y disponibilidad. Yecla aparece como sede inicial.

Los conductores se vinculan a cuentas activas con rol conductor; una cuenta no puede duplicarse en el catálogo. El cambio de rol o la baja de la cuenta impide que el conductor siga siendo asignable.

Desactivar conserva el identificador, los datos y el historial de cambios. No se eliminan recursos ni se modifican asignaciones anteriores. Las actualizaciones usan una revisión para evitar sobrescrituras concurrentes.

API exclusiva de administración: GET y POST /api/administracion/vehiculos y /api/administracion/conductores; PUT sobre /:id para actualizar el registro completo con revisión. GET con ?asignables=true solo devuelve recursos activos, disponibles y con cuenta habilitada en el caso de conductores. Este catálogo se consumirá en la planificación de rutas de P22.

Persistencia: MongoDB en la aplicación, con índices únicos por tipo y clave y por identificador; SQLite para pruebas aisladas con el mismo contrato. Las pruebas cubren normalización, duplicados concurrentes, revisión, disponibilidad, desactivación, roles y API. Validación local: 60 pruebas correctas y una de MongoDB omitida. No se ha validado visualmente en navegador ni publicado esta versión.
