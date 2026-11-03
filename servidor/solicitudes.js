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
        origen: texto(entrada.origen, "Dirección de recogida", 300),
        destino: texto(entrada.destino, "Dirección de entrega", 300),
        contactoRecogida: contacto(entrada.contactoRecogida, "recogida"),
        contactoEntrega: contacto(entrada.contactoEntrega, "entrega"), fecha,
        mobiliario: entrada.mobiliario.map(item => {
            if (!Number.isInteger(item?.cantidad) || item.cantidad < 1 || item.cantidad > 999) throw invalido("Cada cantidad debe ser un número entero entre 1 y 999.");
            return { descripcion: texto(item.descripcion, "Mobiliario", 200), cantidad: item.cantidad };
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
function publica(registro) {
    const { id, referencia, origen, destino, fecha, estado, contactoRecogida, contactoEntrega, mobiliario, observaciones, creadaEn } = registro;
    return { id, referencia, origen, destino, fecha, estado, contactoRecogida, contactoEntrega, mobiliario, observaciones, creadaEn };
}
module.exports = { validarSolicitud, hoyMadrid, huella, comprobarReintento, publica };
