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
function convertir(fila) { return fila ? { ...fila, activo: Boolean(fila.activo) } : undefined; }
function buscarPorEmail(email) { return convertir(db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email)); }
function buscarPorId(id) { return convertir(db.prepare("SELECT * FROM usuarios WHERE id = ?").get(Number(id))); }
function listar() { return db.prepare("SELECT * FROM usuarios ORDER BY id").all().map(convertir); }
function crear(email, claveHash) {
    try {
        const resultado = db.prepare("INSERT INTO usuarios (email, clave) VALUES (?, ?)").run(email, claveHash);
        return buscarPorId(resultado.lastInsertRowid);
    } catch (error) {
        if (error.errcode === 2067) throw new Error("Ya existe un usuario con ese email");
        throw error;
    }
}
function desactivar(id) {
    if (!buscarPorId(id)) throw new Error("Usuario no encontrado");
    db.prepare("UPDATE usuarios SET activo = 0 WHERE id = ?").run(Number(id));
    return buscarPorId(id);
}
function limpiar() {
    if (process.env.NODE_ENV !== "test") throw new Error("Solo se puede limpiar la base de datos durante las pruebas");
    db.exec("DELETE FROM usuarios; DELETE FROM sqlite_sequence WHERE name = 'usuarios';");
}
function promoverAdministrador(id) {
    if (!buscarPorId(id)?.activo) throw new Error("Usuario no encontrado o eliminado");
    db.prepare("UPDATE usuarios SET rol = 'administrador' WHERE id = ?").run(Number(id));
    return buscarPorId(id);
}
function cerrar() { db.close(); }
module.exports = { buscarPorEmail, buscarPorId, listar, crear, desactivar, limpiar, promoverAdministrador, cerrar };
