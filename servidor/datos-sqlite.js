const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const { rutaBaseDatos } = require("./configuracion");
fs.mkdirSync(path.dirname(path.resolve(rutaBaseDatos)), { recursive: true });
const db = new DatabaseSync(rutaBaseDatos);
db.exec(`PRAGMA journal_mode=WAL;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        clave TEXT NOT NULL,
        activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1))
    );`);
// Migración compatible con las bases creadas antes de introducir roles.
if (!db.prepare("PRAGMA table_info(usuarios)").all().some(columna => columna.name === "rol")) {
    db.exec("ALTER TABLE usuarios ADD COLUMN rol TEXT NOT NULL DEFAULT 'usuario' CHECK(rol IN ('usuario', 'administrador'))");
}
for (const campo of ["confirmado", "eliminado"]) {
    if (!db.prepare("PRAGMA table_info(usuarios)").all().some(columna => columna.name === campo)) {
        db.exec(`ALTER TABLE usuarios ADD COLUMN ${campo} INTEGER NOT NULL DEFAULT 0 CHECK(${campo} IN (0, 1))`);
        db.exec(campo === "confirmado" ? "UPDATE usuarios SET confirmado = activo" : "UPDATE usuarios SET eliminado = 1 - activo");
    }
}
function convertir(fila) {
    return fila ? { ...fila, confirmado: Boolean(fila.confirmado), eliminado: Boolean(fila.eliminado),
        activo: fila.confirmado === 1 && fila.eliminado === 0 } : undefined;
}
function buscarPorEmail(email) { return convertir(db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email)); }
function buscarPorId(id) { return convertir(db.prepare("SELECT * FROM usuarios WHERE id = ?").get(Number(id))); }
function listar() { return db.prepare("SELECT * FROM usuarios ORDER BY id").all().map(convertir); }
function crear(email, claveHash, confirmado = false) {
    try {
        const resultado = db.prepare("INSERT INTO usuarios (email, clave, activo, confirmado) VALUES (?, ?, ?, ?)").run(email, claveHash, Number(confirmado), Number(confirmado));
        return buscarPorId(resultado.lastInsertRowid);
    } catch (error) {
        if (error.errcode === 2067) throw new Error("Ya existe un usuario con ese email");
        throw error;
    }
}
db.exec(`CREATE TABLE IF NOT EXISTS confirmaciones (
    hash TEXT PRIMARY KEY, usuarioId INTEGER NOT NULL UNIQUE, caduca INTEGER NOT NULL
); CREATE TABLE IF NOT EXISTS identidades (sub TEXT PRIMARY KEY, usuarioId INTEGER NOT NULL UNIQUE);`);
function guardarConfirmacion(usuarioId, hash, caduca) {
    db.prepare("INSERT INTO confirmaciones VALUES (?, ?, ?) ON CONFLICT(usuarioId) DO UPDATE SET hash=excluded.hash, caduca=excluded.caduca").run(hash, usuarioId, caduca);
}
function confirmar(hash) {
    db.exec("BEGIN IMMEDIATE");
    try {
        const token = db.prepare("DELETE FROM confirmaciones WHERE hash = ? AND caduca > ? RETURNING usuarioId").get(hash, Date.now());
        if (token) db.prepare("UPDATE usuarios SET confirmado=1, activo=1 WHERE id=? AND eliminado=0").run(token.usuarioId);
        db.exec("COMMIT");
        return token ? buscarPorId(token.usuarioId) : undefined;
    } catch (error) { db.exec("ROLLBACK"); throw error; }
}
function buscarGoogle(sub) {
    const identidad = db.prepare("SELECT usuarioId FROM identidades WHERE sub=?").get(sub);
    return identidad ? buscarPorId(identidad.usuarioId) : undefined;
}
function vincularGoogle(id, sub) { db.prepare("INSERT INTO identidades VALUES (?, ?)").run(sub, id); }
function desactivar(id) {
    if (!buscarPorId(id)) throw new Error("Usuario no encontrado");
    db.prepare("UPDATE usuarios SET activo = 0, eliminado = 1 WHERE id = ?").run(Number(id));
    return buscarPorId(id);
}
function limpiar() {
    if (process.env.NODE_ENV !== "test") throw new Error("Solo se puede limpiar la base de datos durante las pruebas");
    db.exec("DELETE FROM confirmaciones; DELETE FROM identidades; DELETE FROM usuarios; DELETE FROM sqlite_sequence WHERE name = 'usuarios';");
}
function configurarCuentaPrueba(id, confirmado = true, rol = "usuario") {
    if (process.env.NODE_ENV !== "test") throw new Error("Operación exclusiva de pruebas");
    if (!["usuario", "administrador"].includes(rol)) throw new Error("Rol inválido");
    db.prepare("UPDATE usuarios SET confirmado = ?, rol = ? WHERE id = ?").run(Number(confirmado), rol, Number(id));
    return buscarPorId(id);
}
function cerrar() { db.close(); }
module.exports = { guardarConfirmacion, confirmar, buscarGoogle, vincularGoogle, buscarPorEmail, buscarPorId, listar, crear, desactivar, limpiar, cerrar,
    ...(process.env.NODE_ENV === "test" ? { configurarCuentaPrueba } : {}) };
