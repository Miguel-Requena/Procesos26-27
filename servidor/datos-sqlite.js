const { DatabaseSync } = require("node:sqlite");
const { createHash } = require("node:crypto");
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
// Sustituye la restricción antigua sin perder ids, cuentas ni confirmaciones.
if (!db.prepare("SELECT sql FROM sqlite_master WHERE name='usuarios'").get().sql.includes("'conductor'")) {
    db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE usuarios_perfiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, clave TEXT NOT NULL,
            activo INTEGER NOT NULL CHECK(activo IN (0,1)),
            rol TEXT NOT NULL DEFAULT 'cliente' CHECK(rol IN ('cliente','conductor','administrador')),
            confirmado INTEGER NOT NULL DEFAULT 0 CHECK(confirmado IN (0,1)),
            eliminado INTEGER NOT NULL DEFAULT 0 CHECK(eliminado IN (0,1))
        );
        INSERT INTO usuarios_perfiles SELECT id,email,clave,activo,
            CASE WHEN rol='usuario' THEN 'cliente' ELSE rol END,confirmado,eliminado FROM usuarios;
        DROP TABLE usuarios;
        ALTER TABLE usuarios_perfiles RENAME TO usuarios;
        COMMIT;`);
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
db.exec(`CREATE TABLE IF NOT EXISTS sesiones (
    token TEXT PRIMARY KEY, usuarioId INTEGER NOT NULL, caduca INTEGER NOT NULL
); CREATE INDEX IF NOT EXISTS sesiones_caduca ON sesiones(caduca);`);
db.exec("CREATE TABLE IF NOT EXISTS intentos_oauth (id TEXT PRIMARY KEY, contenido TEXT NOT NULL, caduca INTEGER NOT NULL)");
function guardarIntentoOAuth(id, contenido, caduca) {
    db.prepare("DELETE FROM intentos_oauth WHERE caduca<=?").run(Date.now());
    db.prepare("INSERT INTO intentos_oauth VALUES (?,?,?)").run(id, JSON.stringify(contenido), caduca);
}
function leerIntentoOAuth(id, consumir = false) {
    const fila = db.prepare(consumir ? "DELETE FROM intentos_oauth WHERE id=? AND caduca>? RETURNING contenido" : "SELECT contenido FROM intentos_oauth WHERE id=? AND caduca>?").get(id, Date.now());
    return fila ? JSON.parse(fila.contenido) : undefined;
}
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
function vincularGoogle(id, sub) {
    const usuario = buscarPorId(id);
    if (!usuario?.activo) return false;
    db.prepare("INSERT OR IGNORE INTO identidades VALUES (?, ?)").run(sub, id);
    return db.prepare("SELECT usuarioId FROM identidades WHERE sub=?").get(sub)?.usuarioId === id;
}
function desactivar(id) {
    if (!buscarPorId(id)) throw new Error("Usuario no encontrado");
    db.prepare("UPDATE usuarios SET activo = 0, eliminado = 1 WHERE id = ?").run(Number(id));
    return buscarPorId(id);
}
function asignarRol(id, rol) {
    if (!["cliente", "conductor", "administrador"].includes(rol)) throw new Error("Rol inválido");
    const resultado = db.prepare("UPDATE usuarios SET rol=? WHERE id=? AND confirmado=1 AND eliminado=0").run(rol, Number(id));
    if (!resultado.changes) throw new Error("Usuario no encontrado");
    return buscarPorId(id);
}
db.exec(`CREATE TABLE IF NOT EXISTS transportes (
    tipo TEXT NOT NULL CHECK(tipo IN ('solicitudes','rutas')), id TEXT NOT NULL,
    propietarioId INTEGER NOT NULL, referencia TEXT, origen TEXT, destino TEXT, fecha TEXT, estado TEXT,
    PRIMARY KEY(tipo,id));`);
function asignarPerfilEquipo(id, rol) {
    if (!["cliente", "conductor"].includes(rol)) throw new Error("Rol inválido");
    const resultado = db.prepare("UPDATE usuarios SET rol=? WHERE id=? AND confirmado=1 AND eliminado=0 AND rol IN ('cliente','conductor')").run(rol, Number(id));
    return resultado.changes ? buscarPorId(id) : undefined;
}
function consultarTransportes(tipo, propietarioId, id) {
    if (!["solicitudes", "rutas"].includes(tipo)) throw new Error("Recurso inválido");
    const condiciones = ["tipo=?"], parametros = [tipo];
    if (propietarioId !== undefined) { condiciones.push("propietarioId=?"); parametros.push(propietarioId); }
    if (id !== undefined) { condiciones.push("id=?"); parametros.push(id); }
    return db.prepare(`SELECT id,referencia,origen,destino,fecha,estado FROM transportes WHERE ${condiciones.join(" AND ")} ORDER BY id`).all(...parametros).map(fila => {
        if (tipo !== "solicitudes") return fila;
        const detalle = detalleSolicitud(propietarioId, fila.id);
        return { ...fila, ...(detalle.localidadEntrega ? { localidadEntrega: detalle.localidadEntrega, codigoPostalEntrega: detalle.codigoPostalEntrega } : {}) };
    });
}
function configurarTransportePrueba(tipo, registro) {
    if (process.env.NODE_ENV !== "test") throw new Error("Operación exclusiva de pruebas");
    db.prepare("INSERT INTO transportes VALUES (?,?,?,?,?,?,?,?)").run(tipo, registro.id,
        registro.clienteId ?? registro.conductorId, registro.referencia, registro.origen, registro.destino ?? null, registro.fecha, registro.estado);
}
db.exec(`CREATE TABLE IF NOT EXISTS solicitudes_detalles (
    id TEXT PRIMARY KEY, clienteId INTEGER NOT NULL, claveEnvio TEXT NOT NULL, contenido TEXT NOT NULL,
    UNIQUE(clienteId, claveEnvio));`);
db.exec("CREATE TABLE IF NOT EXISTS historial_solicitudes (id TEXT PRIMARY KEY, contenido TEXT NOT NULL)");
function detalleSolicitud(clienteId, id) {
    const resumen = db.prepare("SELECT id,referencia,origen,destino,fecha,estado FROM transportes WHERE tipo='solicitudes' AND id=?" + (clienteId === undefined ? "" : " AND propietarioId=?")).get(...(clienteId === undefined ? [id] : [id, clienteId]));
    if (!resumen) return undefined;
    const detalle = db.prepare("SELECT contenido FROM solicitudes_detalles WHERE id=?").get(id);
    const historial = db.prepare("SELECT contenido FROM historial_solicitudes WHERE id=?").get(id);
    return { ...(detalle ? JSON.parse(detalle.contenido) : {}), ...resumen, ...(historial ? JSON.parse(historial.contenido) : {}) };
}
function cancelarSolicitud(clienteId, id, fecha) {
    db.exec("BEGIN IMMEDIATE");
    try {
        const anterior = detalleSolicitud(clienteId, id);
        const cambio = db.prepare("UPDATE transportes SET estado='cancelada' WHERE tipo='solicitudes' AND id=? AND propietarioId=? AND estado IN ('pendiente','pendiente_recogida')").run(id, clienteId);
        if (!cambio.changes) { db.exec("COMMIT"); return undefined; }
        const registro = { ...anterior, estado: "cancelada", canceladaEn: fecha, revision: (anterior.revision || 0) + 1,
            historial: [...(anterior.historial || []), { estado: "cancelada", estadoAnterior: anterior.estado, fecha }] };
        db.prepare("INSERT INTO historial_solicitudes VALUES (?,?) ON CONFLICT(id) DO UPDATE SET contenido=excluded.contenido").run(id, JSON.stringify({ historial: registro.historial, canceladaEn: fecha, revision: registro.revision, sedeOperativa: registro.sedeOperativa, motivoRechazo: registro.motivoRechazo }));
        const guardada = db.prepare("SELECT contenido FROM solicitudes_detalles WHERE id=? AND clienteId=?").get(id, clienteId);
        if (guardada) db.prepare("UPDATE solicitudes_detalles SET contenido=? WHERE id=? AND clienteId=?").run(JSON.stringify({ ...JSON.parse(guardada.contenido), ...registro }), id, clienteId);
        db.exec("COMMIT");
        return registro;
    } catch (error) { db.exec("ROLLBACK"); throw error; }
}
function listarSolicitudesAdministracion(filtros) {
    const clausulas = ["tipo='solicitudes'"], valores = [];
    for (const [campo, operador, valor] of [["estado", "=", filtros.estado], ["fecha", ">=", filtros.desde], ["fecha", "<=", filtros.hasta]]) {
        if (valor) { clausulas.push(`${campo}${operador}?`); valores.push(valor); }
    }
    return db.prepare(`SELECT id,referencia,origen,destino,fecha,estado FROM transportes WHERE ${clausulas.join(" AND ")} ORDER BY fecha,id`).all(...valores).map(fila => {
        const registro = detalleSolicitud(undefined, fila.id);
        return { ...fila, localidadEntrega: registro.localidadEntrega, codigoPostalEntrega: registro.codigoPostalEntrega, motivoRechazo: registro.motivoRechazo, revision: registro.revision || 0 };
    });
}
function revisarSolicitud(id, cambio, responsableId, fecha) {
    db.exec("BEGIN IMMEDIATE");
    try {
        const anterior = detalleSolicitud(undefined, id);
        const permitidos = ["pendiente", "pendiente_recogida"];
        if (!anterior || !permitidos.includes(anterior.estado) || (anterior.revision || 0) !== cambio.revision) { db.exec("COMMIT"); return undefined; }
        const estado = cambio.accion === "aceptar" ? "aceptada" : "rechazada";
        const evento = { accion: cambio.accion, estadoAnterior: anterior.estado, estado, fecha, responsable: "Administración", responsableId,
            ...(cambio.motivoRechazo ? { motivo: cambio.motivoRechazo } : {}) };
        const metadatos = { revision: cambio.revision + 1, historial: [...(anterior.historial || []), evento],
            sedeOperativa: anterior.sedeOperativa, motivoRechazo: cambio.motivoRechazo || anterior.motivoRechazo };
        db.prepare("UPDATE transportes SET estado=? WHERE tipo='solicitudes' AND id=?").run(estado, id);
        db.prepare("INSERT INTO historial_solicitudes VALUES (?,?) ON CONFLICT(id) DO UPDATE SET contenido=excluded.contenido").run(id, JSON.stringify(metadatos));
        const guardada = db.prepare("SELECT contenido FROM solicitudes_detalles WHERE id=?").get(id);
        if (guardada) db.prepare("UPDATE solicitudes_detalles SET contenido=? WHERE id=?").run(JSON.stringify({ ...JSON.parse(guardada.contenido), ...metadatos, estado }), id);
        db.exec("COMMIT"); return { ...anterior, ...metadatos, estado };
    } catch (error) { db.exec("ROLLBACK"); throw error; }
}
function buscarSolicitudEnvio(clienteId, claveEnvio) {
    const fila = db.prepare("SELECT contenido FROM solicitudes_detalles WHERE clienteId=? AND claveEnvio=?").get(clienteId, claveEnvio);
    return fila ? JSON.parse(fila.contenido) : undefined;
}
function hashSesion(token) { return createHash("sha256").update(token).digest("hex"); }
function crearSesion(token, usuarioId, caduca) {
    db.prepare("INSERT OR REPLACE INTO sesiones (token, usuarioId, caduca) VALUES (?, ?, ?)")
        .run(hashSesion(token), usuarioId, caduca);
}
function buscarSesion(token) {
    const fila = db.prepare("SELECT usuarioId FROM sesiones WHERE token=? AND caduca>?").get(hashSesion(token), Date.now());
    return fila?.usuarioId;
}
function eliminarSesion(token) {
    db.prepare("DELETE FROM sesiones WHERE token=?").run(hashSesion(token));
}
function crearSolicitud(registro) {
    db.exec("BEGIN IMMEDIATE");
    try {
        const existente = buscarSolicitudEnvio(registro.clienteId, registro.claveEnvio);
        if (existente) {
            const resultado = require("./solicitudes").comprobarReintento(existente, registro.huella);
            db.exec("COMMIT");
            return resultado;
        }
        db.prepare("INSERT INTO solicitudes_detalles VALUES (?,?,?,?)").run(registro.id, registro.clienteId, registro.claveEnvio, JSON.stringify(registro));
        db.prepare("INSERT INTO transportes VALUES (?,?,?,?,?,?,?,?)").run("solicitudes", registro.id, registro.clienteId, registro.referencia, registro.origen, registro.destino ?? null, registro.fecha, registro.estado);
        db.exec("COMMIT");
        return { registro, creada: true };
    } catch (error) { db.exec("ROLLBACK"); throw error; }
}
function limpiar() {
    if (process.env.NODE_ENV !== "test") throw new Error("Solo se puede limpiar la base de datos durante las pruebas");
    db.exec("DELETE FROM historial_solicitudes; DELETE FROM intentos_oauth; DELETE FROM solicitudes_detalles; DELETE FROM transportes; DELETE FROM confirmaciones; DELETE FROM identidades; DELETE FROM sesiones; DELETE FROM usuarios; DELETE FROM sqlite_sequence WHERE name = 'usuarios';");
}
function configurarCuentaPrueba(id, confirmado = true, rol = "cliente") {
    if (process.env.NODE_ENV !== "test") throw new Error("Operación exclusiva de pruebas");
    if (!["cliente", "conductor", "administrador"].includes(rol)) throw new Error("Rol inválido");
    db.prepare("UPDATE usuarios SET confirmado = ?, rol = ? WHERE id = ?").run(Number(confirmado), rol, Number(id));
    return buscarPorId(id);
}
function cerrar() { db.close(); }
module.exports = { listarSolicitudesAdministracion, revisarSolicitud, detalleSolicitud, cancelarSolicitud, guardarIntentoOAuth, leerIntentoOAuth, buscarSolicitudEnvio, crearSolicitud, crearSesion, buscarSesion, eliminarSesion, asignarPerfilEquipo, consultarTransportes, asignarRol, guardarConfirmacion, confirmar, buscarGoogle, vincularGoogle, buscarPorEmail, buscarPorId, listar, crear, desactivar, limpiar, cerrar,
    ...(process.env.NODE_ENV === "test" ? { configurarCuentaPrueba, configurarTransportePrueba } : {}) };
