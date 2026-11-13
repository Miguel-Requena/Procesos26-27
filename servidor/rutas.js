const { randomUUID } = require("node:crypto");
const { hoyMadrid } = require("./solicitudes");
function error(mensaje, estado = 409) { return Object.assign(new Error(mensaje), { estado }); }
function validar(entrada) {
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw error("Introduce los datos de la ruta", 400);
    const { fecha, vehiculoId, conductorRecursoId, solicitudes } = entrada;
    if (typeof fecha !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0,10) !== fecha || fecha < hoyMadrid()) throw error("Selecciona una fecha válida desde hoy", 400);
    if ([vehiculoId, conductorRecursoId].some(id => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(id))) throw error("Selecciona vehículo y conductor", 400);
    if (!Array.isArray(solicitudes) || solicitudes.length < 1 || solicitudes.length > 100 || solicitudes.some(id => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) || new Set(solicitudes).size !== solicitudes.length) throw error("Selecciona entre 1 y 100 solicitudes distintas en orden de entrega", 400);
    if (entrada.sede !== "Yecla") throw error("Las rutas salen de la base de Yecla", 400);
    return { fecha, sede: "Yecla", vehiculoId, conductorRecursoId, solicitudes };
}
function construir(entrada, vehiculo, conductor, cuenta, solicitudes, responsableId) {
    if (!vehiculo?.activo || !vehiculo.disponible || vehiculo.tipo !== "vehiculos" || vehiculo.sede !== entrada.sede || !conductor?.activo || !conductor.disponible || conductor.tipo !== "conductores" || conductor.sede !== entrada.sede || !cuenta?.activo || cuenta.rol !== "conductor") throw error("El vehículo o el conductor ya no están disponibles en Yecla. Actualiza los recursos.");
    if (solicitudes.some(s => !s || s.estado !== "aceptada")) throw error("Todas las solicitudes deben seguir aceptadas y sin planificar");
    if (solicitudes.some(s => !s.destinatario || !s.destino || !s.localidadEntrega || !s.codigoPostalEntrega || !s.contactoEntrega?.telefono)) throw error("Hay solicitudes antiguas sin datos de entrega completos. Revísalas antes de planificar.");
    const id = randomUUID(), creadaEn = new Date().toISOString();
    return { id, referencia: `RT-${id.slice(0,8).toUpperCase()}`, fecha: entrada.fecha, sede: entrada.sede, origen: entrada.sede,
        destino: solicitudes.at(-1).localidadEntrega, estado: "planificada", activa: true, creadaEn, responsableId,
        vehiculoId: vehiculo.id, conductorRecursoId: conductor.id, conductorId: cuenta.id,
        vehiculo: { matricula: vehiculo.matricula, tipo: vehiculo.tipoVehiculo, capacidad: vehiculo.capacidad, unidadCapacidad: vehiculo.unidadCapacidad },
        conductor: { email: cuenta.email },
        paradas: solicitudes.map((s,i) => ({ orden: i+1, solicitudId: s.id, referencia: s.referencia, destinatario: s.destinatario,
            direccion: s.destino, localidad: s.localidadEntrega, codigoPostal: s.codigoPostalEntrega, contacto: s.contactoEntrega,
            mobiliario: s.mobiliario, observaciones: s.observaciones })) };
}
function planificada(solicitud, ruta) {
    return { ...solicitud, estado: "planificada", rutaId: ruta.id, revision: (solicitud.revision || 0)+1,
        historial: [...(solicitud.historial || []), { accion: "planificar", estadoAnterior: "aceptada", estado: "planificada", fecha: ruta.creadaEn, responsable: "Administración", responsableId: ruta.responsableId }] };
}
module.exports = { validar, construir, planificada, error };
