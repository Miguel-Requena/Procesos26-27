const { randomBytes } = require("node:crypto");
const datos = require("./datos");
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

async function invalidarSesion(req) {
    const token = tokenDePeticion(req);
    if (token) await datos.eliminarSesion(token);
}

async function crearSesion(req, res, usuarioId) {
    await invalidarSesion(req);
    const ahora = Date.now();
    const token = randomBytes(32).toString("hex");
    await datos.crearSesion(token, usuarioId, ahora + DURACION_MS);
    res.cookie(NOMBRE_COOKIE, token, { ...opcionesCookie(), maxAge: DURACION_MS });
}

async function obtenerUsuarioId(req) {
    const token = tokenDePeticion(req);
    return token ? datos.buscarSesion(token) : undefined;
}

async function cerrarSesion(req, res) {
    await invalidarSesion(req);
    res.clearCookie(NOMBRE_COOKIE, opcionesCookie());
}

module.exports = { crearSesion, obtenerUsuarioId, cerrarSesion };
