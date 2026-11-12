const { MongoClient } = require("mongodb");
const { createHash } = require("node:crypto");
const { urlBaseDatos } = require("./configuracion");
const client = new MongoClient(urlBaseDatos, {
    maxPoolSize: 5, serverSelectionTimeoutMS: 15000,
    ...(process.env.NODE_ENV === "production" ? { tls: true } : {})
});
const db = client.db();
const usuarios = db.collection("usuarios");
let inicializacion;
function convertir(documento) {
    if (!documento) return undefined;
    return { id: documento.id, email: documento.email, clave: documento.clave,
        rol: documento.rol === "usuario" ? "cliente" : documento.rol, confirmado: documento.confirmado === true,
        eliminado: documento.eliminado === true,
        activo: documento.confirmado === true && documento.eliminado === false };
}
function errorBaseDatos(causa) {
    const error = new Error("No se pudo acceder a la base de datos");
    error.estado = 503;
    error.codigo = causa?.code === 18 ? "AUTENTICACION_MONGODB" : "CONEXION_MONGODB_NO_DISPONIBLE";
    return error;
}
async function inicializar() {
    if (!inicializacion) inicializacion = (async () => {
        await client.connect();
        await usuarios.updateMany({ rol: "usuario" }, { $set: { rol: "cliente" } });
        await usuarios.createIndex({ email: 1 }, { unique: true });
        await usuarios.createIndex({ id: 1 }, { unique: true });
        for (const [coleccion, propietario] of [["solicitudes", "clienteId"], ["rutas", "conductorId"]]) {
            await db.collection(coleccion).createIndex({ id: 1 }, { unique: true, sparse: true });
            await db.collection(coleccion).createIndex({ [propietario]: 1 });
        }
        await db.collection("solicitudes").createIndex({ clienteId: 1, claveEnvio: 1 },
            { unique: true, partialFilterExpression: { claveEnvio: { $type: "string" } } });
        await db.collection("solicitudes").createIndex({ estado: 1, fecha: 1 });
        await usuarios.createIndex({ googleSub: 1 }, { unique: true, sparse: true });
        await db.collection("sesiones").createIndex({ token: 1 }, { unique: true });
        await db.collection("sesiones").createIndex({ caduca: 1 }, { expireAfterSeconds: 0 });
        await db.collection("intentos_oauth").createIndex({ caduca: 1 }, { expireAfterSeconds: 0 });
        // Se crea una única vez; las altas incrementan el contador atómicamente.
        await db.collection("contadores").updateOne({ _id: "usuarios" },
            { $setOnInsert: { valor: 0 } }, { upsert: true });
    })().catch(causa => { inicializacion = undefined; throw errorBaseDatos(causa); });
    await inicializacion;
}
async function ejecutar(operacion) {
    await inicializar();
    try { return await operacion(); }
    catch (causa) {
        if (causa.estado) throw causa;
        if (causa.code === 11000) throw new Error("Ya existe un usuario con ese email");
        if (causa.message === "Usuario no encontrado") throw causa;
        throw errorBaseDatos(causa);
    }
}
async function buscarPorEmail(email) {
    return ejecutar(async () => convertir(await usuarios.findOne({ email })));
}
async function buscarPorId(id) {
    if (!Number.isSafeInteger(Number(id))) return undefined;
    return ejecutar(async () => convertir(await usuarios.findOne({ id: Number(id) })));
}
async function listar() {
    return ejecutar(async () => (await usuarios.find().sort({ id: 1 }).toArray()).map(convertir));
}
async function crear(email, claveHash, confirmado = false) {
    return ejecutar(async () => {
        const contador = await db.collection("contadores").findOneAndUpdate(
            { _id: "usuarios" }, { $inc: { valor: 1 } },
            { returnDocument: "after", includeResultMetadata: false });
        const documento = { id: contador.valor, email, clave: claveHash, rol: "cliente",
            confirmado, eliminado: false };
        await usuarios.insertOne(documento);
        return convertir(documento);
    });
}
async function guardarConfirmacion(id, hash, caduca) {
    return ejecutar(() => usuarios.updateOne({ id, eliminado: false }, { $set: { confirmacionHash: hash, confirmacionCaduca: caduca } }));
}
async function confirmar(hash) {
    return ejecutar(async () => convertir(await usuarios.findOneAndUpdate(
        { confirmacionHash: hash, confirmacionCaduca: { $gt: Date.now() }, eliminado: false },
        { $set: { confirmado: true }, $unset: { confirmacionHash: "", confirmacionCaduca: "" } },
        { returnDocument: "after", includeResultMetadata: false })));
}
async function buscarGoogle(sub) { return ejecutar(async () => convertir(await usuarios.findOne({ googleSub: sub }))); }
async function vincularGoogle(id, sub) {
    return ejecutar(async () => {
        try {
            const resultado = await usuarios.updateOne({ id, confirmado: true, eliminado: false,
                $or: [{ googleSub: { $exists: false } }, { googleSub: sub }] }, { $set: { googleSub: sub } });
            return resultado.matchedCount === 1;
        } catch (error) { if (error.code === 11000) return false; throw error; }
    });
}
async function desactivar(id) {
    if (!Number.isSafeInteger(Number(id))) throw new Error("Usuario no encontrado");
    return ejecutar(async () => {
        const documento = await usuarios.findOneAndUpdate({ id: Number(id) },
            { $set: { eliminado: true } }, { returnDocument: "after", includeResultMetadata: false });
        if (!documento) throw new Error("Usuario no encontrado");
        return convertir(documento);
    });
}
async function asignarRol(id, rol) {
    if (!["cliente", "conductor", "administrador"].includes(rol)) throw new Error("Rol inválido");
    return ejecutar(async () => {
        const documento = await usuarios.findOneAndUpdate({ id: Number(id), confirmado: true, eliminado: false },
            { $set: { rol } }, { returnDocument: "after", includeResultMetadata: false });
        if (!documento) throw new Error("Usuario no encontrado");
        return convertir(documento);
    });
}
async function asignarPerfilEquipo(id, rol) {
    if (!["cliente", "conductor"].includes(rol)) throw new Error("Rol inválido");
    return ejecutar(async () => convertir(await usuarios.findOneAndUpdate(
        { id: Number(id), confirmado: true, eliminado: false, rol: { $in: ["cliente", "conductor"] } },
        { $set: { rol } }, { returnDocument: "after", includeResultMetadata: false })));
}
async function consultarTransportes(tipo, propietarioId, id) {
    const propietario = tipo === "solicitudes" ? "clienteId" : "conductorId";
    if (!["solicitudes", "rutas"].includes(tipo)) throw new Error("Recurso inválido");
    const filtro = { ...(propietarioId === undefined ? {} : { [propietario]: propietarioId }), ...(id === undefined ? {} : { id }) };
    // Proyección cerrada: no se devuelven campos internos o contactos ajenos.
    return ejecutar(() => db.collection(tipo).find(filtro, { projection: {
        _id: 0, id: 1, referencia: 1, origen: 1, destino: 1, fecha: 1, estado: 1, sedeOperativa: 1, motivoRechazo: 1
    } }).sort({ id: 1 }).toArray());
}
async function detalleSolicitud(clienteId, id) {
    return ejecutar(() => db.collection("solicitudes").findOne({ id, ...(clienteId === undefined ? {} : { clienteId }) }));
}
async function cancelarSolicitud(clienteId, id, fecha) {
    return ejecutar(() => db.collection("solicitudes").findOneAndUpdate(
        { id, clienteId, estado: { $in: ["pendiente", "pendiente_recogida"] } },
        [{ $set: { estado: "cancelada", canceladaEn: fecha, revision: { $add: [{ $ifNull: ["$revision", 0] }, 1] },
            historial: { $concatArrays: [{ $ifNull: ["$historial", []] },
                [{ estado: "cancelada", estadoAnterior: "$estado", fecha }]] } } }],
        { returnDocument: "after" }));
}
async function listarSolicitudesAdministracion(filtros) {
    const consulta = { ...(filtros.estado ? { estado: filtros.estado } : {}),
        ...(filtros.desde || filtros.hasta ? { fecha: { ...(filtros.desde ? { $gte: filtros.desde } : {}), ...(filtros.hasta ? { $lte: filtros.hasta } : {}) } } : {}) };
    return ejecutar(() => db.collection("solicitudes").find(consulta, { projection: { _id:0, id:1, referencia:1, origen:1, destino:1, fecha:1, estado:1, sedeOperativa:1, motivoRechazo:1, revision:1 } }).sort({ fecha:1, id:1 }).toArray());
}
async function revisarSolicitud(id, cambio, responsableId, fecha) {
    const permitidos = cambio.accion === "asignar_sede" ? ["pendiente", "pendiente_recogida", "aceptada"] : ["pendiente", "pendiente_recogida"];
    const evento = { accion: cambio.accion, estadoAnterior: "$estado", estado: cambio.accion === "aceptar" ? "aceptada" : cambio.accion === "rechazar" ? "rechazada" : "$estado", fecha, responsable: "Administración", responsableId,
        ...(cambio.sedeOperativa ? { sede: cambio.sedeOperativa, sedeAnterior: { $ifNull: ["$sedeOperativa", null] } } : {}),
        ...(cambio.motivoRechazo ? { motivo: { $literal: cambio.motivoRechazo } } : {}) };
    return ejecutar(() => db.collection("solicitudes").findOneAndUpdate(
        { id, estado: { $in: permitidos }, $expr: { $eq: [{ $ifNull: ["$revision", 0] }, cambio.revision] } },
        [{ $set: { estado: evento.estado, revision: cambio.revision + 1,
            ...(cambio.sedeOperativa ? { sedeOperativa: cambio.sedeOperativa } : {}),
            ...(cambio.motivoRechazo ? { motivoRechazo: { $literal: cambio.motivoRechazo } } : {}),
            historial: { $concatArrays: [{ $ifNull: ["$historial", []] }, [evento]] } } }],
        { returnDocument: "after" }));
}
async function buscarSolicitudEnvio(clienteId, claveEnvio) {
    return ejecutar(() => db.collection("solicitudes").findOne({ clienteId, claveEnvio }, { projection: { _id: 0 } }));
}
function hashSesion(token) { return createHash("sha256").update(token).digest("hex"); }
async function crearSesion(token, usuarioId, caduca) {
    return ejecutar(async () => {
        await db.collection("sesiones").deleteOne({ token: hashSesion(token) });
        await db.collection("sesiones").insertOne({ token: hashSesion(token), usuarioId, caduca: new Date(caduca) });
    });
}
async function buscarSesion(token) {
    return ejecutar(async () => {
        const sesion = await db.collection("sesiones").findOne({ token: hashSesion(token), caduca: { $gt: new Date() } });
        return sesion?.usuarioId;
    });
}
async function eliminarSesion(token) {
    return ejecutar(() => db.collection("sesiones").deleteOne({ token: hashSesion(token) }));
}
async function guardarIntentoOAuth(id, contenido, caduca) {
    return ejecutar(() => db.collection("intentos_oauth").insertOne({ _id: id, contenido, caduca: new Date(caduca) }));
}
async function leerIntentoOAuth(id, consumir = false) {
    return ejecutar(async () => {
        const filtro = { _id: id, caduca: { $gt: new Date(Date.now()) } };
        const registro = consumir ? await db.collection("intentos_oauth").findOneAndDelete(filtro) : await db.collection("intentos_oauth").findOne(filtro);
        return registro?.contenido;
    });
}
async function crearSolicitud(registro) {
    return ejecutar(async () => {
        try {
            await db.collection("solicitudes").insertOne({ ...registro });
            return { registro, creada: true };
        } catch (error) {
            if (error.code !== 11000) throw error;
            const existente = await db.collection("solicitudes").findOne({ clienteId: registro.clienteId, claveEnvio: registro.claveEnvio });
            if (!existente) throw error;
            return require("./solicitudes").comprobarReintento(existente, registro.huella);
        }
    });
}
async function limpiar() { throw new Error("No se permite limpiar la base MongoDB de la aplicación"); }
async function cerrar() { await client.close(); }
module.exports = { listarSolicitudesAdministracion, revisarSolicitud, detalleSolicitud, cancelarSolicitud, guardarIntentoOAuth, leerIntentoOAuth, buscarSolicitudEnvio, crearSolicitud, crearSesion, buscarSesion, eliminarSesion, asignarPerfilEquipo, consultarTransportes, asignarRol, guardarConfirmacion, confirmar, buscarGoogle, vincularGoogle, buscarPorEmail, buscarPorId, listar, crear, desactivar, limpiar, cerrar };
