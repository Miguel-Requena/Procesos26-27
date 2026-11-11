const { randomBytes, createHash } = require("node:crypto");
const datos = require("./datos");
const correo = require("./correo");
const logica = require("./logica");
const sesiones = require("./sesiones");
const hash = valor => createHash("sha256").update(valor).digest("hex");
function fallo(mensaje, estado = 503) { return Object.assign(new Error(mensaje), { estado }); }
function urlPublica() {
    const url = new URL(process.env.PUBLIC_URL || "http://localhost:3000");
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
        (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
        throw fallo("Configura PUBLIC_URL con el origen público HTTPS");
    }
    if (process.env.NODE_ENV === "production" && !process.env.PUBLIC_URL) throw fallo("Falta PUBLIC_URL");
    return url.origin;
}
function correoDisponible() { return correo.disponible(); }
function googleDisponible() { return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET); }
async function jsonExterno(url, opciones) {
    const respuesta = await fetch(url, { ...opciones, signal: AbortSignal.timeout(10000) });
    if (!respuesta.ok) throw fallo("El servicio externo no está disponible. Inténtalo más tarde.");
    return respuesta.json();
}
async function enviarConfirmacion(usuario) {
    if (!correoDisponible()) throw fallo("El envío de correo no está configurado. Contacta con el administrador.");
    const token = randomBytes(32).toString("hex");
    const enlace = `${urlPublica()}/?confirmacion=${token}`;
    await datos.guardarConfirmacion(usuario.id, hash(token), Date.now() + 24 * 60 * 60 * 1000);
    try {
        await correo.enviar({ to: usuario.email, subject: "Confirma tu cuenta",
            text: `Confirma tu cuenta abriendo este enlace (24 horas): ${enlace}` });
    } catch { throw fallo("No se pudo enviar el correo. Solicita un reenvío en unos minutos."); }
}
const intentos = new Map();
function limitar(clave) {
    const ahora = Date.now();
    for (const [k, caduca] of intentos) if (caduca <= ahora) intentos.delete(k);
    if (intentos.has(clave)) throw fallo("Espera un minuto antes de volver a intentarlo.", 429);
    if (intentos.size >= 10000) throw fallo("Demasiadas solicitudes. Inténtalo más tarde.", 429);
    intentos.set(clave, ahora + 60000);
}
const fallosLogin = new Map();
function claveLogin(ip, email) {
    return `${ip || "desconocida"}:${typeof email === "string" ? email.trim().toLowerCase() : ""}`;
}
function comprobarLogin(ip, email) {
    const ahora = Date.now();
    const clave = claveLogin(ip, email);
    const intento = fallosLogin.get(clave);
    if (intento?.caduca <= ahora) fallosLogin.delete(clave);
    if (intento && intento.cantidad >= 5) throw fallo("Demasiados intentos. Inténtalo de nuevo más tarde.", 429);
}
function registrarFalloLogin(ip, email) {
    const clave = claveLogin(ip, email);
    const ahora = Date.now();
    const intento = fallosLogin.get(clave);
    if (!intento || intento.caduca <= ahora) fallosLogin.set(clave, { cantidad: 1, caduca: ahora + 15 * 60 * 1000 });
    else intento.cantidad++;
}
function registrarLoginCorrecto(ip, email) { fallosLogin.delete(claveLogin(ip, email)); }
const cookieVinculo = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/login" });
function tokenVinculo(req) {
    return (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("google_vinculo="))?.slice(15);
}
async function completarVinculoGoogle(req, res, usuario) {
    const token = tokenVinculo(req);
    const pendiente = token && await datos.leerIntentoOAuth(hash(token));
    if (req.body?.vincularGoogle === true) {
        if (pendiente?.tipo !== "vinculo") throw fallo("La vinculación con Google ha caducado. Pulsa Continuar con Google para empezar de nuevo.", 409);
        if (logica.normalizarEmail(pendiente.perfil.email) !== usuario.email) throw fallo("Utiliza la contraseña de la cuenta que tiene el mismo correo que Google.", 409);
        const prueba = await datos.leerIntentoOAuth(hash(token), true);
        if (!prueba) throw fallo("La vinculación ya se ha utilizado. Vuelve a empezar con Google.", 409);
        await logica.vincularGoogle(prueba.perfil, usuario);
    }
    if (token) {
        await datos.leerIntentoOAuth(hash(token), true);
        res.clearCookie("google_vinculo", cookieVinculo());
    }
}
function instalar(app) {
    app.get("/api/servicios", (req, res) => res.json({ google: googleDisponible(), correo: correoDisponible() }));
    app.post("/api/confirmacion/reenviar", async (req, res, next) => {
        try {
            const email = logica.normalizarEmail(req.body?.email);
            limitar(hash(email));
            const usuario = await datos.buscarPorEmail(email);
            if (usuario && !usuario.confirmado && !usuario.eliminado) await enviarConfirmacion(usuario);
            res.json({ mensaje: "Si hay una cuenta pendiente, recibirás un correo de confirmación." });
        } catch (error) { next(error); }
    });
    app.post("/api/confirmacion", async (req, res, next) => {
        try {
            const token = req.body?.token;
            if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw fallo("Enlace de confirmación inválido o caducado. Solicita otro correo.", 400);
            const usuario = await datos.confirmar(hash(token));
            if (!usuario?.activo) throw fallo("Enlace de confirmación inválido o caducado. Solicita otro correo.", 400);
            res.json({ mensaje: "Cuenta confirmada. Ya puedes iniciar sesión." });
        } catch (error) { next(error); }
    });
    const opciones = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/oauth/google" };
    app.get("/api/oauth/google", async (req, res, next) => {
        try {
            if (!googleDisponible()) throw fallo("El acceso con Google no está configurado.");
            const ahora = Date.now();
            const state = randomBytes(32).toString("hex");
            const verifier = randomBytes(32).toString("base64url");
            await datos.guardarIntentoOAuth(hash(state), { tipo: "acceso", verifier }, ahora + 600000);
            res.cookie("oauth_state", state, { ...opciones, maxAge: 600000 });
            const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
            url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: `${urlPublica()}/api/oauth/google/callback`, response_type: "code", scope: "openid email", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
            res.redirect(url.href);
        } catch (error) { next(error); }
    });
    app.get("/api/oauth/google/callback", async (req, res) => {
        res.clearCookie("oauth_state", opciones);
        let perfil;
        try {
            const state = req.query.state;
            const cookie = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("oauth_state="))?.slice(12);
            if (typeof state !== "string" || cookie !== state) throw Object.assign(fallo("Acceso caducado", 400), { acceso: "caducado" });
            const pendiente = await datos.leerIntentoOAuth(hash(state), true);
            if (pendiente?.tipo !== "acceso") throw Object.assign(fallo("Acceso caducado", 400), { acceso: "caducado" });
            if (req.query.error || typeof req.query.code !== "string") throw Object.assign(fallo("Acceso cancelado", 400), { acceso: "cancelado" });
            const tokens = await jsonExterno("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, code: req.query.code, code_verifier: pendiente.verifier, grant_type: "authorization_code", redirect_uri: `${urlPublica()}/api/oauth/google/callback` }) });
            if (typeof tokens.access_token !== "string") throw fallo("Respuesta de Google inválida");
            perfil = await jsonExterno("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
            const usuario = await logica.entrarGoogle(perfil);
            await sesiones.crearSesion(req, res, usuario.id);
            res.redirect("/?acceso=correcto");
        } catch (error) {
            if (error.estado === 409 && perfil?.email_verified === true) {
                const ahora = Date.now();
                const token = randomBytes(32).toString("hex");
                await datos.guardarIntentoOAuth(hash(token), { tipo: "vinculo", perfil: { sub: perfil.sub, email: perfil.email, email_verified: true } }, ahora + 600000);
                res.cookie("google_vinculo", token, { ...cookieVinculo(), maxAge: 600000 });
                return res.redirect("/?acceso=cuenta-existente");
            }
            const acceso = error.acceso || (error.estado === 403 ? "cuenta-no-disponible" : error.estado === 503 ? "google-no-disponible" : "error");
            res.redirect(`/?acceso=${acceso}`);
        }
    });
}
module.exports = { instalar, enviarConfirmacion, correoDisponible, limitar, comprobarLogin, registrarFalloLogin, registrarLoginCorrecto, completarVinculoGoogle, urlPublica };
