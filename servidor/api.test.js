const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const app = require("./api");
const logica = require("./logica");

let servidor;
let base;
test.before(async () => {
    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => new Promise(resolve => servidor.close(resolve)));
test.beforeEach(() => logica.limpiarUsuarios());

async function login(email = "ana@example.com", administrador = false) {
    if (administrador) await logica.inicializarAdministrador(email, "clave-prueba");
    else await logica.registrarUsuario(email, "clave-prueba");
    const res = await fetch(`${base}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, clave: "clave-prueba" })
    });
    assert.equal(res.status, 200);
    return res.headers.get("set-cookie").split(";")[0];
}

test("recupera el usuario con la misma cookie en peticiones sucesivas", async () => {
    const cookie = await login();
    for (let i = 0; i < 2; i++) {
        const res = await fetch(`${base}/api/sesion`, { headers: { cookie } });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("cache-control"), "no-store");
        assert.equal((await res.json()).usuario.email, "ana@example.com");
    }
});

test("logout invalida el token incluso si se vuelve a enviar la cookie antigua", async () => {
    const cookie = await login();
    const logout = await fetch(`${base}/api/logout`, { method: "POST", headers: { cookie } });
    assert.equal(logout.status, 200);
    const res = await fetch(`${base}/api/sesion`, { headers: { cookie } });
    assert.equal(res.status, 401);
});

test("rechaza consultas de sesión anónimas, falsificadas y de usuarios eliminados", async () => {
    assert.equal((await fetch(`${base}/api/sesion`)).status, 401);
    assert.equal((await fetch(`${base}/api/sesion`, { headers: { cookie: "sesion=falsa" } })).status, 401);
    const cookie = await login();
    logica.eliminarUsuario(1, { id: 1 });
    assert.equal((await fetch(`${base}/api/sesion`, { headers: { cookie } })).status, 401);
});

test("las tres rutas de usuarios rechazan peticiones sin sesión o con token falso", async () => {
    for (const cookie of ["", "sesion=inventada"]) {
        for (const [ruta, method] of [["/usuarios", "GET"], ["/usuarios/1/activo", "GET"], ["/usuarios/1", "DELETE"]]) {
            const res = await fetch(`${base}/api${ruta}`, { method, headers: { cookie } });
            assert.equal(res.status, 401);
        }
    }
});

test("permite peticiones de administrador y rechaza el acceso tras logout", async () => {
    const cookie = await login("admin@example.com", true);
    const usuarios = await fetch(`${base}/api/usuarios`, { headers: { cookie } });
    assert.equal(usuarios.status, 200);
    assert.equal((await usuarios.json()).usuarios.length, 1);
    const activo = await fetch(`${base}/api/usuarios/1/activo`, { headers: { cookie } });
    assert.equal(activo.status, 200);
    assert.deepEqual(await activo.json(), { activo: true });
    await fetch(`${base}/api/logout`, { method: "POST", headers: { cookie } });
    assert.equal((await fetch(`${base}/api/usuarios`, { headers: { cookie } })).status, 401);
});

test("eliminar una cuenta invalida su acceso a las rutas protegidas", async () => {
    const cookie = await login();
    const res = await fetch(`${base}/api/usuarios/1`, { method: "DELETE", headers: { cookie } });
    assert.equal(res.status, 200);
    assert.equal((await fetch(`${base}/api/usuarios`, { headers: { cookie } })).status, 401);
});

test("registro público y login fallido devuelven JSON sin claves ni cookies de sesión", async () => {
    const res = await fetch(`${base}/api/registro`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com", clave: "secreto" })
    });
    assert.equal(res.status, 201);
    assert.equal(Object.hasOwn((await res.json()).usuario, "clave"), false);
    const loginIncorrecto = await fetch(`${base}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com", clave: "incorrecta" })
    });
    assert.equal(loginIncorrecto.status, 401);
    assert.equal(loginIncorrecto.headers.get("set-cookie"), null);
    assert.equal((await fetch(`${base}/api/salud`)).status, 200);
});

test("el servidor impide escalar roles y aplicar operaciones administrativas a usuarios normales", async () => {
    const registro = await fetch(`${base}/api/registro`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com", clave: "clave-prueba", rol: "administrador" })
    });
    assert.equal((await registro.json()).usuario.rol, "usuario");
    const entrada = await fetch(`${base}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com", clave: "clave-prueba" })
    });
    const cookie = entrada.headers.get("set-cookie").split(";")[0];
    const otro = await logica.registrarUsuario("otro@example.com", "clave-prueba");
    for (const [ruta, method] of [["/usuarios", "GET"], ["/usuarios/1/activo", "GET"], [`/usuarios/${otro.id}`, "DELETE"]]) {
        assert.equal((await fetch(`${base}/api${ruta}`, { method, headers: { cookie } })).status, 403);
    }
    const adminCookie = await login("admin@example.com", true);
    assert.equal((await fetch(`${base}/api/usuarios`, { headers: { cookie: adminCookie } })).status, 200);
    assert.equal((await fetch(`${base}/api/usuarios/${otro.id}`, { method: "DELETE", headers: { cookie: adminCookie } })).status, 200);
});
