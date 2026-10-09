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

async function login(email = "ana@example.com") {
    await logica.registrarUsuario(email, "clave-prueba");
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
    logica.eliminarUsuario(1);
    assert.equal((await fetch(`${base}/api/sesion`, { headers: { cookie } })).status, 401);
});
