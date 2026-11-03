const test = require("node:test");
const assert = require("node:assert/strict");
const sesiones = require("./sesiones");

function respuesta() {
    return {
        cookie(nombre, token, opciones) { this.token = token; this.opciones = opciones; },
        clearCookie(nombre, opciones) { this.borrada = nombre; this.opciones = opciones; }
    };
}

test("crea una sesión con cookie HttpOnly y la invalida al cerrar", async () => {
    const res = respuesta();
    await sesiones.crearSesion({ headers: {} }, res, 7);
    const req = { headers: { cookie: `otra=valor; sesion=${res.token}` } };
    assert.equal(await sesiones.obtenerUsuarioId(req), 7);
    assert.equal(res.opciones.httpOnly, true);
    assert.equal(res.opciones.sameSite, "strict");
    await sesiones.cerrarSesion(req, res);
    assert.equal(await sesiones.obtenerUsuarioId(req), undefined);
    assert.equal(res.borrada, "sesion");
});

test("un nuevo login rota el token e invalida el anterior", async () => {
    const res = respuesta();
    await sesiones.crearSesion({ headers: {} }, res, 7);
    const anterior = { headers: { cookie: `sesion=${res.token}` } };
    await sesiones.crearSesion(anterior, res, 7);
    assert.equal(await sesiones.obtenerUsuarioId(anterior), undefined);
    const actual = { headers: { cookie: `sesion=${res.token}` } };
    assert.equal(await sesiones.obtenerUsuarioId(actual), 7);
    await sesiones.cerrarSesion(actual, res);
});

test("rechaza tokens inventados y sesiones caducadas", async (t) => {
    assert.equal(await sesiones.obtenerUsuarioId({ headers: { cookie: "sesion=inventada" } }), undefined);
    t.mock.timers.enable({ apis: ["Date"], now: 1000 });
    const res = respuesta();
    await sesiones.crearSesion({ headers: {} }, res, 7);
    const req = { headers: { cookie: `sesion=${res.token}` } };
    t.mock.timers.tick(res.opciones.maxAge + 1);
    assert.equal(await sesiones.obtenerUsuarioId(req), undefined);
});
