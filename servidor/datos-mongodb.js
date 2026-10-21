const { MongoClient } = require("mongodb");
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
        rol: documento.rol, confirmado: documento.confirmado === true,
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
        await usuarios.createIndex({ email: 1 }, { unique: true });
        await usuarios.createIndex({ id: 1 }, { unique: true });
        await usuarios.createIndex({ googleSub: 1 }, { unique: true, sparse: true });
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
        const documento = { id: contador.valor, email, clave: claveHash, rol: "usuario",
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
async function vincularGoogle(id, sub) { return ejecutar(() => usuarios.updateOne({ id, googleSub: { $exists: false } }, { $set: { googleSub: sub } })); }
async function desactivar(id) {
    if (!Number.isSafeInteger(Number(id))) throw new Error("Usuario no encontrado");
    return ejecutar(async () => {
        const documento = await usuarios.findOneAndUpdate({ id: Number(id) },
            { $set: { eliminado: true } }, { returnDocument: "after", includeResultMetadata: false });
        if (!documento) throw new Error("Usuario no encontrado");
        return convertir(documento);
    });
}
async function limpiar() { throw new Error("No se permite limpiar la base MongoDB de la aplicación"); }
async function cerrar() { await client.close(); }
module.exports = { guardarConfirmacion, confirmar, buscarGoogle, vincularGoogle, buscarPorEmail, buscarPorId, listar, crear, desactivar, limpiar, cerrar };
