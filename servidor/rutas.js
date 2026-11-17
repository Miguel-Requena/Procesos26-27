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
function entregaCompleta(s) {
    return [s?.destinatario,s?.destino,s?.localidadEntrega,s?.codigoPostalEntrega,s?.contactoEntrega?.telefono].every(v=>typeof v === "string" && Boolean(v.trim()));
}
function construir(entrada, vehiculo, conductor, cuenta, solicitudes, responsableId) {
    if (!vehiculo?.activo || !vehiculo.disponible || vehiculo.tipo !== "vehiculos" || vehiculo.sede !== entrada.sede || !conductor?.activo || !conductor.disponible || conductor.tipo !== "conductores" || conductor.sede !== entrada.sede || !cuenta?.activo || cuenta.rol !== "conductor") throw error("El vehículo o el conductor ya no están disponibles en Yecla. Actualiza los recursos.");
    if (solicitudes.some(s => !s || s.estado !== "aceptada")) throw error("Todas las solicitudes deben seguir aceptadas y sin planificar");
    const incompleta = solicitudes.find(s => !entregaCompleta(s));
    if (incompleta) throw error(`La solicitud ${incompleta.referencia || incompleta.id} no tiene los datos de entrega completos. Usa una solicitud con destinatario, dirección, localidad, código postal y contacto de entrega.`);
    const id = randomUUID(), creadaEn = new Date().toISOString();
    return { id, referencia: `RT-${id.slice(0,8).toUpperCase()}`, fecha: entrada.fecha, sede: entrada.sede, origen: entrada.sede,
        destino: solicitudes.at(-1).localidadEntrega, estado: "planificada", activa: true, creadaEn, responsableId,
        vehiculoId: vehiculo.id, conductorRecursoId: conductor.id, conductorId: cuenta.id,
        vehiculo: { matricula: vehiculo.matricula, tipo: vehiculo.tipoVehiculo, capacidad: vehiculo.capacidad, unidadCapacidad: vehiculo.unidadCapacidad },
        conductor: { nombre: [cuenta.nombre,cuenta.primerApellido].filter(Boolean).join(" ") || conductor.nombre || "", email: cuenta.email },
        paradas: solicitudes.map((s,i) => ({ orden: i+1, solicitudId: s.id, referencia: s.referencia, destinatario: s.destinatario,
            direccion: s.destino, localidad: s.localidadEntrega, codigoPostal: s.codigoPostalEntrega, contacto: s.contactoEntrega,
            mobiliario: s.mobiliario, observaciones: s.observaciones })) };
}
function planificada(solicitud, ruta) {
    return { ...solicitud, estado: "planificada", rutaId: ruta.id, revision: (solicitud.revision || 0)+1,
        historial: [...(solicitud.historial || []), { accion: "planificar", estadoAnterior: "aceptada", estado: "planificada", fecha: ruta.creadaEn, responsable: "Administración", responsableId: ruta.responsableId }] };
}
function validarActualizacion(entrada) {
    if (!entrada || !["iniciar", "entregar", "incidencia"].includes(entrada.accion)) throw error("Acción de entrega inválida",400);
    if (!Number.isSafeInteger(entrada.revision) || entrada.revision < 0) throw error("Actualiza el itinerario antes de guardar",400);
    if (typeof entrada.clave !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(entrada.clave)) throw error("Identificador de operación inválido",400);
    if (entrada.accion !== "iniciar" && (typeof entrada.solicitudId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(entrada.solicitudId))) throw error("Selecciona una parada válida",400);
    const motivo = typeof entrada.motivo === "string" ? entrada.motivo.trim() : "";
    if (entrada.accion === "incidencia" && (!motivo || motivo.length > 1000)) throw error("Indica el motivo de la incidencia (máximo 1000 caracteres)",400);
    return {accion:entrada.accion,revision:entrada.revision,clave:entrada.clave,...(entrada.accion !== "iniciar" ? {solicitudId:entrada.solicitudId} : {}),...(entrada.accion === "incidencia" ? {motivo} : {})};
}
function actualizar(ruta, solicitudes, entrada, conductorId) {
    if (!ruta || ruta.conductorId !== conductorId) throw error("Ruta no encontrada",404);
    const huella = JSON.stringify({accion:entrada.accion,solicitudId:entrada.solicitudId,motivo:entrada.motivo});
    const anterior = (ruta.operaciones || []).find(o=>o.clave===entrada.clave);
    if (anterior) {
        if (anterior.huella !== huella) throw error("La operación ya se utilizó con otros datos");
        return {ruta,solicitudes:[],repetida:true};
    }
    if ((ruta.revision || 0) !== entrada.revision) throw error("La ruta ha cambiado. Actualiza el itinerario.");
    if (!ruta.paradas?.length || solicitudes.some(s=>!s || s.rutaId !== ruta.id)) throw error("La ruta no tiene un itinerario operativo válido");
    const fecha = new Date().toISOString();
    const siguiente = structuredClone(ruta);
    siguiente.revision = (ruta.revision || 0)+1;
    const afectadas = [];
    if (entrada.accion === "iniciar") {
        if (ruta.estado !== "planificada") throw error("Solo se puede iniciar una ruta planificada");
        siguiente.estado = "en_transito";
        siguiente.paradas.forEach(p=>p.estado="en_transito");
        afectadas.push(...solicitudes);
    } else {
        if (ruta.estado !== "en_transito") throw error("Inicia la ruta antes de registrar entregas o incidencias");
        const parada = siguiente.paradas.find(p=>p.solicitudId===entrada.solicitudId);
        if (!parada || !["en_transito","incidencia"].includes(parada.estado)) throw error("Esta parada no admite esa transición");
        if (entrada.accion === "incidencia" && parada.estado === "incidencia") throw error("La parada ya tiene una incidencia; puedes resolverla como entregada");
        parada.estado = entrada.accion === "entregar" ? "completada" : "incidencia";
        parada.actualizadaEn = fecha;
        if (entrada.motivo) parada.motivoIncidencia = entrada.motivo;
        afectadas.push(solicitudes.find(s=>s.id===parada.solicitudId));
        if (siguiente.paradas.every(p=>p.estado === "completada")) { siguiente.estado="completada"; siguiente.activa=false; siguiente.completadaEn=fecha; }
    }
    const cambios = afectadas.map(s=>{
        const estado = entrada.accion === "iniciar" ? "en_transito" : entrada.accion === "entregar" ? "completada" : "incidencia";
        if (!s || !(entrada.accion === "iniciar" ? ["planificada"] : ["en_transito","incidencia"]).includes(s.estado)) throw error("La solicitud ha cambiado. Actualiza el itinerario.");
        return {...s,estado,revision:(s.revision || 0)+1,historial:[...(s.historial || []),{accion:entrada.accion,estadoAnterior:s.estado,estado,fecha,responsable:"Conductor",responsableId:conductorId,...(entrada.motivo ? {motivo:entrada.motivo} : {})}]};
    });
    siguiente.operaciones = [...(ruta.operaciones || []),{clave:entrada.clave,huella,fecha}];
    return {ruta:siguiente,solicitudes:cambios};
}
function publicaConductor(ruta) {
    const {operaciones,responsableId,conductorId,conductorRecursoId,...publica} = ruta;
    return {...publica,revision:ruta.revision || 0,conductor:{nombre:ruta.conductor?.nombre || ""}};
}
module.exports = { entregaCompleta, validar, construir, planificada, error, validarActualizacion, actualizar, publicaConductor };
