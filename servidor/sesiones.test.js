const test = require("node:test");
const assert = require("node:assert/strict");
const sesiones = require("./sesiones");

function respuesta() {
    return {
        cookie(nombre, token, opciones) { this.token = token; this.opciones = opciones; },
        clearCookie(nombre, opciones) { this.borrada = nombre; this.opciones = opciones; }
    };
}

test("crea una sesión con cookie HttpOnly y la invalida al cerrar", () => {
    const res = respuesta();
    sesiones.crearSesion({ headers: {} }, res, 7);
    const req = { headers: { cookie: `otra=valor; sesion=${res.token}` } };
    assert.equal(sesiones.obtenerUsuarioId(req), 7);
    assert.equal(res.opciones.httpOnly, true);
    assert.equal(res.opciones.sameSite, "strict");
    sesiones.cerrarSesion(req, res);
    assert.equal(sesiones.obtenerUsuarioId(req), undefined);
    assert.equal(res.borrada, "sesion");
});

test("un nuevo login rota el token e invalida el anterior", () => {
    const res = respuesta();
    sesiones.crearSesion({ headers: {} }, res, 7);
    const anterior = { headers: { cookie: `sesion=${res.token}` } };
    sesiones.crearSesion(anterior, res, 7);
    assert.equal(sesiones.obtenerUsuarioId(anterior), undefined);
    const actual = { headers: { cookie: `sesion=${res.token}` } };
    assert.equal(sesiones.obtenerUsuarioId(actual), 7);
    sesiones.cerrarSesion(actual, res);
});

test("rechaza tokens inventados y sesiones caducadas", (t) => {
    assert.equal(sesiones.obtenerUsuarioId({ headers: { cookie: "sesion=inventada" } }), undefined);
    t.mock.timers.enable({ apis: ["Date"], now: 1000 });
    const res = respuesta();
    sesiones.crearSesion({ headers: {} }, res, 7);
    const req = { headers: { cookie: `sesion=${res.token}` } };
    t.mock.timers.tick(res.opciones.maxAge + 1);
    assert.equal(sesiones.obtenerUsuarioId(req), undefined);
});
