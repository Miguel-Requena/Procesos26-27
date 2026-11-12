const { createHash } = require("node:crypto");
function invalido(mensaje) { return Object.assign(new Error(mensaje), { estado: 400 }); }
function texto(valor, nombre, maximo, opcional = false) {
    if (opcional && valor === undefined) return "";
    if (typeof valor !== "string" || (!opcional && !valor.trim()) || valor.trim().length > maximo || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(valor)) {
        throw invalido(`${nombre}: introduce un texto válido de hasta ${maximo} caracteres.`);
    }
    return valor.trim();
}
function contacto(valor, nombre) {
    const resultado = { nombre: texto(valor?.nombre, `Contacto de ${nombre}`, 120), telefono: texto(valor?.telefono, `Teléfono de ${nombre}`, 30) };
    if (!/^[+\d\s().-]+$/.test(resultado.telefono) || resultado.telefono.replace(/\D/g, "").length < 7 || resultado.telefono.replace(/\D/g, "").length > 15) throw invalido(`Teléfono de ${nombre}: introduce entre 7 y 15 dígitos.`);
    return resultado;
}
function validarSolicitud(entrada) {
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw invalido("Introduce los datos de la solicitud.");
    const fecha = texto(entrada.fecha, "Fecha solicitada", 10);
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) throw invalido("Introduce una fecha solicitada válida.");
    if (!Array.isArray(entrada.mobiliario) || entrada.mobiliario.length < 1 || entrada.mobiliario.length > 50) throw invalido("Añade entre 1 y 50 líneas de mobiliario.");
    return {
        fabricante: texto(entrada.fabricante, "Fabricante", 160),
        origen: texto(entrada.origen, "Dirección de recogida", 300),
        contactoRecogida: contacto(entrada.contactoRecogida, "recogida"),
        fecha,
        mobiliario: entrada.mobiliario.map(item => {
            if (!Number.isInteger(item?.cantidad) || item.cantidad < 1 || item.cantidad > 999) throw invalido("Cada cantidad debe ser un número entero entre 1 y 999.");
            if (!["bultos", "cajas", "unidades"].includes(item.unidad)) throw invalido("Selecciona bultos, cajas o unidades para cada línea de mercancía.");
            return { descripcion: texto(item.descripcion, "Mercancía", 200), cantidad: item.cantidad, unidad: item.unidad };
        }),
        observaciones: texto(entrada.observaciones, "Observaciones de acceso", 2000, true)
    };
}
function hoyMadrid() {
    const partes = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const valores = Object.fromEntries(partes.map(p => [p.type, p.value]));
    return `${valores.year}-${valores.month}-${valores.day}`;
}
function huella(datos) { return createHash("sha256").update(JSON.stringify(datos)).digest("hex"); }
function comprobarReintento(registro, firma) {
    if (registro.huella !== firma) throw Object.assign(new Error("Este envío ya se utilizó con otros datos. Actualiza el formulario antes de enviar una nueva solicitud."), { estado: 409 });
    return { registro, creada: false };
}
function publica(registro, administracion = false) {
    const { id, referencia, fabricante, origen, destino, fecha, estado, contactoRecogida, mobiliario, observaciones, creadaEn, canceladaEn, historial, sedeOperativa, motivoRechazo, revision = 0 } = registro;
    return { id, referencia, fabricante, origen, destino, fecha, estado, contactoRecogida, mobiliario, observaciones, creadaEn, canceladaEn, sedeOperativa, motivoRechazo, ...(administracion ? { revision } : {}),
        historial: historial?.map(({ estado, estadoAnterior, fecha, responsable, responsableId, accion, sede, sedeAnterior, motivo }) => ({ estado, estadoAnterior, fecha, responsable, accion, sede, sedeAnterior, motivo, ...(administracion ? { responsableId } : {}) })) };
}
module.exports = { validarSolicitud, hoyMadrid, huella, comprobarReintento, publica };

const estados = ["pendiente", "pendiente_recogida", "aceptada", "rechazada", "planificada", "asignada", "en_transito", "en_curso", "completada", "cancelada"];
const sedes = ["Yecla", "Rubí", "Palma de Mallorca"];
function filtrosAdministracion(entrada) {
    if (Object.keys(entrada).some(k => !["estado", "desde", "hasta"].includes(k))) throw invalido("Filtro no válido.");
    const salida = {};
    if (entrada.estado !== undefined && entrada.estado !== "") {
        if (!estados.includes(entrada.estado)) throw invalido("Selecciona un estado válido.");
        salida.estado = entrada.estado;
    }
    for (const campo of ["desde", "hasta"]) {
        const valor = entrada[campo];
        if (valor === undefined || valor === "") continue;
        if (typeof valor !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(valor) || !Number.isFinite(Date.parse(valor)) || new Date(valor).toISOString().slice(0,10) !== valor) throw invalido("Introduce fechas válidas para el filtro.");
        salida[campo] = valor;
    }
    if (salida.desde && salida.hasta && salida.desde > salida.hasta) throw invalido("La fecha inicial no puede ser posterior a la final.");
    return salida;
}
function revisionAdministrativa(entrada) {
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw invalido("Introduce una revisión válida.");
    if (!["asignar_sede", "aceptar", "rechazar"].includes(entrada.accion)) throw invalido("Acción de revisión no válida.");
    if (!Number.isSafeInteger(entrada.revision) || entrada.revision < 0) throw invalido("Actualiza el detalle antes de revisar la solicitud.");
    const resultado = { accion: entrada.accion, revision: entrada.revision };
    if (entrada.sedeOperativa !== undefined) {
        if (!sedes.includes(entrada.sedeOperativa)) throw invalido("Selecciona Yecla, Rubí o Palma de Mallorca.");
        resultado.sedeOperativa = entrada.sedeOperativa;
    }
    if (entrada.accion === "asignar_sede" && !resultado.sedeOperativa) throw invalido("Selecciona una sede operativa.");
    if (entrada.accion === "rechazar") resultado.motivoRechazo = texto(entrada.motivo, "Motivo del rechazo", 1000);
    return resultado;
}
module.exports.filtrosAdministracion = filtrosAdministracion;
module.exports.revisionAdministrativa = revisionAdministrativa;
