const { randomBytes } = require("node:crypto");

const sesiones = new Map();
const DURACION_MS = 8 * 60 * 60 * 1000;
const NOMBRE_COOKIE = "sesion";

function tokenDePeticion(req) {
    const cookies = (req.headers.cookie || "").split(";");
    const cookie = cookies.find(valor => valor.trim().startsWith(`${NOMBRE_COOKIE}=`));
    return cookie ? cookie.trim().slice(NOMBRE_COOKIE.length + 1) : undefined;
}

function opcionesCookie() {
    return {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/"
    };
}

function invalidarSesion(req) {
    sesiones.delete(tokenDePeticion(req));
}

function crearSesion(req, res, usuarioId) {
    invalidarSesion(req);
    const ahora = Date.now();
    for (const [token, sesion] of sesiones) {
        if (sesion.caduca <= ahora) sesiones.delete(token);
    }
    const token = randomBytes(32).toString("hex");
    sesiones.set(token, { usuarioId, caduca: ahora + DURACION_MS });
    res.cookie(NOMBRE_COOKIE, token, { ...opcionesCookie(), maxAge: DURACION_MS });
}

function obtenerUsuarioId(req) {
    const token = tokenDePeticion(req);
    const sesion = sesiones.get(token);
    if (!sesion) return undefined;
    if (sesion.caduca <= Date.now()) {
        sesiones.delete(token);
        return undefined;
    }
    return sesion.usuarioId;
}

function cerrarSesion(req, res) {
    invalidarSesion(req);
    res.clearCookie(NOMBRE_COOKIE, opcionesCookie());
}

module.exports = { crearSesion, obtenerUsuarioId, cerrarSesion };
