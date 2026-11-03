const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { spawnSync } = require("node:child_process");
const app = require("./api");
const ayudas = require("./ayudas-pruebas.cjs");
const datos = require("./datos");
const logica = require("./logica");
let servidor, base;
test.before(async () => {
    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => new Promise(resolve => servidor.close(resolve)));
test.beforeEach(() => logica.limpiarUsuarios());
const contenido = () => ({ fabricante: "Muebles de Yecla", origen: "Calle Uno 1, Yecla, 30510", fecha: "2099-12-15",
    contactoRecogida: { nombre: "Ana", telefono: "+34 612 345 678" },
    mobiliario: [{ descripcion: "Sofá", cantidad: 2, unidad: "unidades" }, { descripcion: "Sillas", cantidad: 8, unidad: "cajas" }], observaciones: "Segunda planta, con ascensor" });
async function cuenta(email, rol = "cliente") {
    const usuario = await ayudas.registrarConfirmado(email, "clave-prueba", rol);
    const res = await fetch(`${base}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, clave: "clave-prueba" }) });
    return { usuario, cookie: res.headers.get("set-cookie").split(";")[0] };
}
function enviar(cookie, entrada = contenido(), clave = "envio-prueba-12345678") {
    return fetch(`${base}/api/solicitudes`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": clave, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(entrada) });
}
test("el alta asigna propietario y estado desde sesión, persiste todo y mantiene las consultas aisladas", async () => {
    const ana = await cuenta("ana@example.com"), otra = await cuenta("otra@example.com");
    const res = await enviar(ana.cookie, { ...contenido(), clienteId: otra.usuario.id, estado: "aceptada", id: "inventado" });
    assert.equal(res.status, 201);
    const { solicitud, creada } = await res.json();
    assert.equal(creada, true); assert.equal(solicitud.estado, "pendiente_recogida");
    assert.notEqual(solicitud.id, "inventado");
    assert.equal(solicitud.destino, undefined); assert.equal(solicitud.contactoEntrega, undefined);
    assert.equal(solicitud.huella, undefined); assert.equal(solicitud.claveEnvio, undefined);
    const guardada = await datos.buscarSolicitudEnvio(ana.usuario.id, "envio-prueba-12345678");
    assert.equal(guardada.clienteId, ana.usuario.id);
    for (const campo of Object.keys(contenido())) assert.deepEqual(guardada[campo], contenido()[campo]);
    assert.equal((await logica.consultarTransportes("solicitudes", ana.usuario)).length, 1);
    assert.equal((await logica.consultarTransportes("solicitudes", otra.usuario)).length, 0);
    await assert.rejects(logica.consultarTransportes("solicitudes", otra.usuario, solicitud.id), { estado: 404 });
    const proceso = spawnSync(process.execPath, ["-e", `const d=require('./datos');(async()=>{const r=await d.buscarSolicitudEnvio(${ana.usuario.id},'envio-prueba-12345678');require('node:assert/strict').equal(r.mobiliario[0].cantidad,2);await d.cerrar()})().catch(()=>process.exitCode=1)`], { cwd: __dirname, env: process.env, encoding: "utf8" });
    assert.equal(proceso.status, 0, proceso.stderr);
});
test("doble envío concurrente y reintento conservan una solicitud; cambiar datos con la misma clave responde 409", async () => {
    const ana = await cuenta("ana@example.com");
    const respuestas = await Promise.all([enviar(ana.cookie), enviar(ana.cookie)]);
    assert.deepEqual(respuestas.map(r => r.status).sort(), [200, 201]);
    const cuerpos = await Promise.all(respuestas.map(r => r.json()));
    assert.equal(cuerpos[0].solicitud.id, cuerpos[1].solicitud.id);
    assert.equal((await enviar(ana.cookie)).status, 200);
    assert.equal((await enviar(ana.cookie, { ...contenido(), fabricante: "Otra fábrica" })).status, 409);
    assert.equal((await logica.consultarTransportes("solicitudes", ana.usuario)).length, 1);
    const otra = await cuenta("otra@example.com");
    assert.equal((await enviar(otra.cookie)).status, 201);
});
test("rechaza anónimos, conductores, administradores y permisos revocados en sesiones abiertas", async () => {
    assert.equal((await enviar()).status, 401);
    for (const rol of ["conductor", "administrador"]) {
        const actor = await cuenta(`${rol}@example.com`, rol);
        assert.equal((await enviar(actor.cookie)).status, 403);
    }
    const ana = await cuenta("ana@example.com");
    await datos.asignarRol(ana.usuario.id, "conductor");
    assert.equal((await enviar(ana.cookie)).status, 403);
    await datos.desactivar(ana.usuario.id);
    assert.equal((await enviar(ana.cookie)).status, 401);
});
test("valida fechas reales no pasadas, contactos, límites y cantidades sin guardar solicitudes inválidas", async () => {
    const ana = await cuenta("ana@example.com");
    const errores = [{ fecha: "2027-02-30" }, { fecha: "2020-01-01" }, { fecha: "no-fecha" }, { origen: " " }, { fabricante: "x".repeat(161) }, { fabricante: " " }, { origen: "x".repeat(301) },
        { contactoRecogida: { nombre: "Ana", telefono: "hola" } }, { contactoRecogida: null },
        { mobiliario: [] }, { mobiliario: Array(51).fill({ descripcion: "Sillas", cantidad: 8, unidad: "cajas" }) },
        ...[0, -1, 1.5, "2", 1000].map(cantidad => ({ mobiliario: [{ descripcion: "Mesa", cantidad, unidad: "bultos" }] })),
        { mobiliario: [{ descripcion: "", cantidad: 1, unidad: "bultos" }] }, { mobiliario: [{ descripcion: "Sillas", cantidad: 1, unidad: "palets" }] }, { observaciones: "x".repeat(2001) }];
    for (const cambio of errores) assert.equal((await enviar(ana.cookie, { ...contenido(), ...cambio })).status, 400, JSON.stringify(cambio));
    assert.equal((await enviar(ana.cookie, contenido(), "corta")).status, 400);
    assert.equal((await logica.consultarTransportes("solicitudes", ana.usuario)).length, 0);
    const res = await enviar(ana.cookie, { ...contenido(), origen: "  Yecla  ", observaciones: undefined });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).solicitud.origen, "Yecla");
});
