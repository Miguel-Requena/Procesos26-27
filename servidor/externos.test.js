const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { once } = require("node:events");
const datos = require("./datos");
const logica = require("./logica");
const app = require("./api");
const digest = t => createHash("sha256").update(t).digest("hex");
let servidor, base;
test.before(async () => { servidor = app.listen(0, "127.0.0.1"); await once(servidor, "listening"); base = `http://127.0.0.1:${servidor.address().port}`; });
test.after(() => new Promise(resolve => servidor.close(resolve)));
test.beforeEach(() => datos.limpiar());
async function confirmar(token) { return fetch(`${base}/api/confirmacion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }); }
test("confirmación HTTP: hash persistido, token de un solo uso y login posterior", async () => {
    const usuario = await logica.registrarUsuario("pendiente@example.com", "secreto");
    const token = "a".repeat(64);
    await datos.guardarConfirmacion(usuario.id, digest(token), Date.now()+10000);
    assert.equal((await confirmar(token)).status, 200);
    assert.equal((await logica.iniciarSesion(usuario.email, "secreto")).id, usuario.id);
    assert.equal((await confirmar(token)).status, 400);
});
test("tokens caducados, sustituidos y de cuentas eliminadas no dan acceso", async () => {
    const usuario = await logica.registrarUsuario("pendiente@example.com", "secreto");
    const token = "a".repeat(64), nuevo = "b".repeat(64);
    await datos.guardarConfirmacion(usuario.id, digest(token), Date.now()-1);
    assert.equal((await confirmar(token)).status, 400);
    await datos.guardarConfirmacion(usuario.id, digest(token), Date.now()+10000);
    await datos.guardarConfirmacion(usuario.id, digest(nuevo), Date.now()+10000);
    assert.equal((await confirmar(token)).status, 400);
    await datos.configurarCuentaPrueba(usuario.id, true);
    await logica.eliminarUsuario(usuario.id, usuario);
    assert.equal((await confirmar(nuevo)).status, 400);
    await assert.rejects(logica.obtenerUsuarioSesion(usuario.id));
});
test("Google no vincula por email, exige correo verificado y conserva la identidad estable", async () => {
    await assert.rejects(logica.entrarGoogle({ sub: "1", email: "google@example.com", email_verified: false }));
    const perfil = { sub: "1", email: "google@example.com", email_verified: true };
    const usuario = await logica.entrarGoogle(perfil);
    assert.equal(usuario.rol, "cliente");
    assert.equal((await logica.entrarGoogle({ ...perfil, email: "cambio@example.com" })).id, usuario.id);
    await assert.rejects(logica.iniciarSesion(usuario.email, "secreto"));
    await assert.rejects(logica.entrarGoogle({ ...perfil, sub: "otro" }), { estado: 409 });
    await logica.eliminarUsuario(usuario.id, usuario);
    await assert.rejects(logica.entrarGoogle(perfil), { estado: 403 });
});
test("callback OAuth exige state y cookie y no crea sesión con respuestas falsificadas", async () => {
    const res = await fetch(`${base}/api/oauth/google/callback?state=falso&code=falso`, { redirect: "manual" });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/?acceso=caducado");
    assert.ok(!res.headers.get("set-cookie").includes("sesion="));
});

test("OAuth completo: PKCE, cookie, intercambio de código y rechazo de repetición", async () => {
    process.env.GOOGLE_CLIENT_ID = "cliente-prueba";
    process.env.GOOGLE_CLIENT_SECRET = "secreto-prueba";
    process.env.PUBLIC_URL = base;
    const real = global.fetch;
    global.fetch = async (url, opciones) => {
        if (String(url) === "https://oauth2.googleapis.com/token") {
            assert.equal(opciones.body.get("client_secret"), "secreto-prueba");
            assert.ok(opciones.body.get("code_verifier"));
            return { ok: true, json: async () => ({ access_token: "acceso-prueba" }) };
        }
        if (String(url) === "https://openidconnect.googleapis.com/v1/userinfo") return { ok: true, json: async () => ({ sub: "google-prueba", email: "oauth@example.com", email_verified: true }) };
        return real(url, opciones);
    };
    try {
        const inicio = await fetch(`${base}/api/oauth/google`, { redirect: "manual" });
        assert.equal(inicio.status, 302);
        const destino = new URL(inicio.headers.get("location"));
        assert.equal(destino.searchParams.get("code_challenge_method"), "S256");
        const cookie = inicio.headers.get("set-cookie").split(";")[0];
        const callback = `${base}/api/oauth/google/callback?code=codigo&state=${destino.searchParams.get("state")}`;
        const respuesta = await fetch(callback, { redirect: "manual", headers: { cookie } });
        assert.equal(respuesta.headers.get("location"), "/?acceso=correcto");
        const sesionCookie = respuesta.headers.getSetCookie().find(x => x.startsWith("sesion=")).split(";")[0];
        assert.equal((await fetch(`${base}/api/sesion`, { headers: { cookie: sesionCookie } })).status, 200);
        const repetida = await fetch(callback, { redirect: "manual", headers: { cookie } });
        assert.equal(repetida.headers.get("location"), "/?acceso=caducado");
    } finally {
        global.fetch = real;
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;
        delete process.env.PUBLIC_URL;
    }
});

async function conGoogleSimulado(perfil, ejecutar) {
    const anteriores = Object.fromEntries(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "PUBLIC_URL"].map(k => [k, process.env[k]]));
    Object.assign(process.env, { GOOGLE_CLIENT_ID: "cliente-prueba", GOOGLE_CLIENT_SECRET: "secreto-prueba", PUBLIC_URL: base });
    const real = global.fetch;
    global.fetch = async (url, opciones) => {
        if (String(url) === "https://oauth2.googleapis.com/token") return { ok: true, json: async () => ({ access_token: "prueba" }) };
        if (String(url) === "https://openidconnect.googleapis.com/v1/userinfo") return { ok: true, json: async () => perfil };
        return real(url, opciones);
    };
    try {
        const inicio = await fetch(`${base}/api/oauth/google`, { redirect: "manual" });
        const destino = new URL(inicio.headers.get("location"));
        const cookie = inicio.headers.getSetCookie().find(c => c.startsWith("oauth_state=")).split(";")[0];
        const resultado = await fetch(`${base}/api/oauth/google/callback?code=prueba&state=${destino.searchParams.get("state")}`, { redirect: "manual", headers: { cookie } });
        await ejecutar(resultado);
    } finally {
        global.fetch = real;
        for (const [k,v] of Object.entries(anteriores)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
}
async function loginVinculo(email, clave, cookie, vincularGoogle = true) {
    return fetch(`${base}/api/login`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ email, clave, vincularGoogle }) });
}
test("cuenta existente: Google exige contraseña, conserva perfil e id y permite accesos posteriores", async () => {
    const cuenta = await logica.registrarUsuario("equipo@example.com", "secreto");
    await datos.configurarCuentaPrueba(cuenta.id, true);
    await datos.asignarRol(cuenta.id, "conductor");
    const otra = await logica.registrarUsuario("otra@example.com", "secreto");
    await datos.configurarCuentaPrueba(otra.id, true);
    const perfil = { sub: "vinculo-equipo", email: cuenta.email, email_verified: true };
    await conGoogleSimulado(perfil, async resultado => {
        assert.equal(resultado.headers.get("location"), "/?acceso=cuenta-existente");
        assert.ok(!resultado.headers.getSetCookie().some(c => c.startsWith("sesion=")));
        const cabecera = resultado.headers.getSetCookie().find(c => c.startsWith("google_vinculo="));
        assert.match(cabecera, /HttpOnly/); assert.match(cabecera, /Path=\/api\/login/);
        const cookie = cabecera.split(";")[0];
        assert.equal((await loginVinculo(cuenta.email, "incorrecta", cookie)).status, 401);
        assert.equal((await loginVinculo(otra.email, "secreto", cookie)).status, 409);
        assert.equal(await datos.buscarGoogle(perfil.sub), undefined);
        const respuesta = await loginVinculo(cuenta.email, "secreto", cookie);
        assert.equal(respuesta.status, 200);
        const { usuario } = await respuesta.json();
        assert.equal(usuario.id, cuenta.id); assert.equal(usuario.rol, "conductor");
        assert.equal((await logica.entrarGoogle(perfil)).id, cuenta.id);
        assert.equal((await logica.iniciarSesion(cuenta.email, "secreto")).id, cuenta.id);
        assert.equal((await loginVinculo(cuenta.email, "secreto", cookie)).status, 409);
    });
});
test("la vinculación rechaza tokens falsos o caducados y permite continuar sin vincular", async () => {
    const cuenta = await logica.registrarUsuario("sin-vinculo@example.com", "secreto");
    await datos.configurarCuentaPrueba(cuenta.id, true);
    assert.equal((await loginVinculo(cuenta.email, "secreto", "google_vinculo=falso")).status, 409);
    const perfil = { sub: "sin-vinculo", email: cuenta.email, email_verified: true };
    await conGoogleSimulado(perfil, async resultado => {
        const cookie = resultado.headers.getSetCookie().find(c => c.startsWith("google_vinculo=")).split(";")[0];
        const ahora = Date.now;
        try {
            Date.now = () => ahora() + 600001;
            assert.equal((await loginVinculo(cuenta.email, "secreto", cookie)).status, 409);
        } finally { Date.now = ahora; }
        assert.equal((await loginVinculo(cuenta.email, "secreto", cookie, false)).status, 200);
        assert.equal(await datos.buscarGoogle(perfil.sub), undefined);
    });
});
test("no sustituye otra identidad ni vincula correos no verificados o cuentas no disponibles", async () => {
    const cuenta = await logica.registrarUsuario("protegida@example.com", "secreto");
    await datos.configurarCuentaPrueba(cuenta.id, true);
    const actor = await logica.iniciarSesion(cuenta.email, "secreto");
    const perfil = { sub: "identidad-original", email: cuenta.email, email_verified: true };
    await assert.rejects(logica.vincularGoogle({ ...perfil, email_verified: false }, actor), { estado: 409 });
    await logica.vincularGoogle(perfil, actor);
    await logica.vincularGoogle(perfil, actor);
    await assert.rejects(logica.vincularGoogle({ ...perfil, sub: "otra-identidad" }, actor), { estado: 409 });
    await logica.eliminarUsuario(cuenta.id, actor);
    await assert.rejects(logica.vincularGoogle(perfil, actor), { estado: 401 });
});
