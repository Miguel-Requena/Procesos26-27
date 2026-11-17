const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { spawnSync } = require("node:child_process");
const datos = require("./datos");
const ayudas = require("./ayudas-pruebas.cjs");
const app = require("./api");
let servidor, base;

test.before(async () => {
    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    base = `http://127.0.0.1:${servidor.address().port}/api`;
});
test.after(() => new Promise(resolve => servidor.close(resolve)));
test.beforeEach(() => datos.limpiar());

const contenido = () => ({
    fabricante: "Fábrica ficticia P24", origen: "Calle Ficticia 1, Yecla", fecha: "2099-12-01",
    destinatario: "Tienda ficticia P24", destino: "Calle Entrega 2", localidadEntrega: "Rubí", codigoPostalEntrega: "08191",
    contactoRecogida: { nombre: "Ana ficticia", telefono: "612345678" },
    contactoEntrega: { nombre: "Eva ficticia", telefono: "623456789" },
    mobiliario: [{ descripcion: "Sofá ficticio", cantidad: 2, unidad: "bultos" }], observaciones: "Datos desechables P24"
});
async function pedir(ruta, cookie, cuerpo, estado = 200, cabeceras = {}) {
    const res = await fetch(base + ruta, {
        method: cuerpo === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...cabeceras },
        ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) })
    });
    assert.equal(res.status, estado, `${ruta}: ${res.status}, esperado ${estado}`);
    return res.json();
}
async function cuenta(nombre, rol = "cliente") {
    const usuario = await ayudas.registrarConfirmado(`${nombre}@example.com`, "clave-prueba", rol);
    const res = await fetch(base + "/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: usuario.email, clave: "clave-prueba" })
    });
    assert.equal(res.status, 200);
    return { usuario, cookie: res.headers.getSetCookie().find(c => c.startsWith("sesion=")).split(";")[0] };
}
async function escenario() {
    const cliente = await cuenta("cliente-p24"), otro = await cuenta("otro-p24");
    const admin = await cuenta("admin-p24", "administrador"), conductor = await cuenta("conductor-p24", "conductor");
    const ajeno = await cuenta("conductor-ajeno-p24", "conductor");
    const { recurso: vehiculo } = await pedir("/administracion/vehiculos", admin.cookie, {
        matricula: "2424PBI", tipoVehiculo: "Camión", capacidad: 80, unidadCapacidad: "m³", sede: "Yecla", activo: true, disponible: true
    }, 201);
    const { recurso } = await pedir("/administracion/conductores", admin.cookie, {
        usuarioId: conductor.usuario.id, sede: "Yecla", activo: true, disponible: true
    }, 201);
    const clave = { "Idempotency-Key": "p24-envio-ficticio-0001" };
    const { solicitud } = await pedir("/solicitudes", cliente.cookie, contenido(), 201, clave);
    const ruta = { fecha: "2099-12-15", sede: "Yecla", vehiculoId: vehiculo.id, conductorRecursoId: recurso.id, solicitudes: [solicitud.id] };
    return { cliente, otro, admin, conductor, ajeno, solicitud, ruta, clave };
}

test("P24 T34: solicitud → aceptación → ruta → incidencia → entrega → consulta y persistencia", async () => {
    const e = await escenario();
    await pedir(`/administracion/solicitudes/${e.solicitud.id}/revision`, e.admin.cookie, { accion: "aceptar", revision: 0 });
    const { ruta } = await pedir("/administracion/rutas", e.admin.cookie, e.ruta, 201);
    const { rutas } = await pedir("/rutas", e.conductor.cookie);
    assert.deepEqual(rutas.map(r => r.id), [ruta.id]);
    assert.deepEqual((await pedir("/rutas", e.ajeno.cookie)).rutas, []);
    let { registro } = await pedir(`/solicitudes/${e.solicitud.id}`, e.cliente.cookie);
    assert.equal(registro.estado, "planificada");
    assert.equal((await datos.detalleSolicitud(e.cliente.usuario.id, registro.id)).rutaId, ruta.id);
    assert.deepEqual(registro.historial.map(h => h.estado), ["pendiente_recogida", "aceptada", "planificada"]);
    const actualizar = (accion,revision,extra={})=>pedir(`/conductor/rutas/${ruta.id}/actualizaciones`,e.conductor.cookie,{accion,revision,clave:`p24-operacion-${accion}-00001`,...extra});
    const {ruta: operativa}=await pedir(`/conductor/rutas/${ruta.id}`,e.conductor.cookie);
    assert.equal(operativa.conductorId,undefined); assert.equal(operativa.operaciones,undefined);
    await actualizar("iniciar",0);
    await actualizar("incidencia",1,{solicitudId:registro.id,motivo:"Destinatario ausente ficticio"});
    const incidencia=(await pedir(`/solicitudes/${registro.id}`,e.cliente.cookie)).registro;
    assert.equal(incidencia.estado,"incidencia"); assert.equal(incidencia.historial.at(-1).motivo,"Destinatario ausente ficticio");
    await actualizar("entregar",2,{solicitudId:registro.id});
    await actualizar("entregar",2,{solicitudId:registro.id}); // Reintento tras perder la respuesta.
    registro=(await pedir(`/solicitudes/${registro.id}`,e.cliente.cookie)).registro;
    assert.equal(registro.estado,"completada");
    assert.deepEqual(registro.historial.map(h=>h.estado),["pendiente_recogida","aceptada","planificada","en_transito","incidencia","completada"]);
    const { ruta: itinerario } = await pedir(`/administracion/rutas/${ruta.id}`, e.admin.cookie);
    assert.equal(itinerario.estado,"completada"); assert.equal(itinerario.activa,false);
    assert.equal(itinerario.paradas[0].solicitudId, registro.id);
    assert.equal(itinerario.paradas[0].contacto.telefono, contenido().contactoEntrega.telefono);
    // Otro proceso abre la misma BD y arranca una nueva instancia HTTP. Sin el preload que crea una BD nueva.
    const codigo = `
        const {once}=require('node:events');
        (async()=>{
            const app=require('./api'),d=require('./datos');
            const s=app.listen(0,'127.0.0.1');await once(s,'listening');
            try {
                const r=await fetch('http://127.0.0.1:'+s.address().port+'/api/solicitudes/'+process.env.P24_SOLICITUD,{headers:{cookie:process.env.P24_COOKIE}});
                require('node:assert/strict').equal(r.status,200);
                const solicitud=(await r.json()).registro;
                const ruta=await d.detalleRuta(process.env.P24_RUTA);
                console.log(JSON.stringify({solicitud,ruta}));
            } finally {await new Promise(r=>s.close(r));await d.cerrar();}
        })().catch(e=>{console.error(e);process.exitCode=1});`;
    const reinicio = spawnSync(process.execPath, ["-e", codigo], {
        cwd: __dirname, encoding: "utf8", timeout: 15000,
        env: { ...process.env, P24_SOLICITUD: registro.id, P24_RUTA: ruta.id, P24_COOKIE: e.cliente.cookie }
    });
    assert.equal(reinicio.status, 0, reinicio.stderr);
    const persistido = JSON.parse(reinicio.stdout.trim().split(/\r?\n/).at(-1));
    assert.deepEqual(persistido.solicitud, registro);
    assert.deepEqual(persistido.ruta, itinerario);
});

test("P24 T35: permisos, rol falsificado, fechas, duplicados y transiciones inválidas sin cambios parciales", async () => {
    const e = await escenario(), id = e.solicitud.id;
    await pedir("/solicitudes", undefined, contenido(), 401, e.clave);
    await pedir(`/solicitudes/${id}`, e.otro.cookie, undefined, 404);
    await pedir(`/solicitudes/${id}/cancelacion`, e.otro.cookie, {}, 404);
    await pedir(`/administracion/solicitudes/${id}/revision`, e.cliente.cookie, { accion: "aceptar", revision: 0, rol: "administrador" }, 403);
    const repetida = await pedir("/solicitudes", e.cliente.cookie, contenido(), 200, e.clave);
    assert.equal(repetida.solicitud.id, id);
    await pedir("/solicitudes", e.cliente.cookie, { ...contenido(), fabricante: "Distinta" }, 409, e.clave);
    await pedir("/administracion/rutas", e.admin.cookie, e.ruta, 409); // Pendiente, aún no aceptada.
    await pedir(`/administracion/solicitudes/${id}/revision`, e.admin.cookie, { accion: "completar", revision: 0 }, 400);
    await pedir(`/administracion/solicitudes/${id}/revision`, e.admin.cookie, { accion: "aceptar", revision: 0 });
    await pedir(`/administracion/solicitudes/${id}/revision`, e.admin.cookie, { accion: "aceptar", revision: 0 }, 409);
    for (const cambios of [{ fecha: "2020-01-01" }, { fecha: "2099-02-30" }, { solicitudes: [id, id] }]) {
        await pedir("/administracion/rutas", e.admin.cookie, { ...e.ruta, ...cambios }, 400);
    }
    assert.deepEqual((await pedir("/rutas", e.admin.cookie)).rutas, []);
    assert.equal((await pedir(`/solicitudes/${id}`, e.cliente.cookie)).registro.estado, "aceptada");
    const { ruta } = await pedir("/administracion/rutas", e.admin.cookie, e.ruta, 201);
    await pedir("/administracion/rutas", e.admin.cookie, e.ruta, 409);
    await pedir(`/solicitudes/${id}/cancelacion`, e.cliente.cookie, {}, 409);
    await pedir(`/rutas/${ruta.id}`, e.ajeno.cookie, undefined, 404);
    assert.equal((await pedir("/rutas", e.admin.cookie)).rutas.length, 1);
    const { solicitud: cancelable } = await pedir("/solicitudes", e.cliente.cookie, contenido(), 201, { "Idempotency-Key": "p24-envio-cancelable-002" });
    assert.equal((await pedir(`/solicitudes/${cancelable.id}/cancelacion`, e.cliente.cookie, {})).solicitud.estado, "cancelada");
    await pedir(`/solicitudes/${cancelable.id}/cancelacion`, e.cliente.cookie, {}, 409);
    const cancelada = (await pedir(`/solicitudes/${cancelable.id}`, e.cliente.cookie)).registro;
    assert.equal(cancelada.historial.filter(h => h.estado === "cancelada").length, 1);
});

test("P23 T36/T37: autorización, transiciones, concurrencia y liberación de reservas",async()=>{
    const e=await escenario(),id=e.solicitud.id;
    await pedir(`/administracion/solicitudes/${id}/revision`,e.admin.cookie,{accion:"aceptar",revision:0});
    const {ruta}=await pedir("/administracion/rutas",e.admin.cookie,e.ruta,201);
    const url=`/conductor/rutas/${ruta.id}`, operacion={accion:"iniciar",revision:0,clave:"p23-inicio-ruta-00001"};
    await pedir(url,undefined,undefined,401);
    for(const actor of [e.cliente,e.admin]) {
        await pedir(url,actor.cookie,undefined,403);
        await pedir(url+"/actualizaciones",actor.cookie,operacion,403);
    }
    await pedir(url,e.ajeno.cookie,undefined,404);
    await pedir(url+"/actualizaciones",e.ajeno.cookie,operacion,404);
    const cambio=(entrada,estado=200)=>pedir(url+"/actualizaciones",e.conductor.cookie,entrada,estado);
    await cambio({...operacion,accion:"entregar",solicitudId:id},409);
    await cambio({...operacion,accion:"inventada"},400);
    await cambio({...operacion,accion:"incidencia",solicitudId:id,motivo:" "},400);
    await cambio(operacion);
    await cambio(operacion); // Mismo evento, aunque la revisión haya avanzado.
    await cambio({...operacion,accion:"entregar",solicitudId:id},409);
    await cambio({...operacion,clave:"p23-otro-inicio-00002"},409);
    await cambio({accion:"entregar",solicitudId:"ajena",revision:1,clave:"p23-parada-ajena-0001"},409);
    const concurrentes=await Promise.all([
        fetch(base+url+"/actualizaciones",{method:"POST",headers:{cookie:e.conductor.cookie,"Content-Type":"application/json"},body:JSON.stringify({accion:"entregar",revision:1,solicitudId:id,clave:"p23-concurrente-entrega-01"})}),
        fetch(base+url+"/actualizaciones",{method:"POST",headers:{cookie:e.conductor.cookie,"Content-Type":"application/json"},body:JSON.stringify({accion:"incidencia",revision:1,solicitudId:id,motivo:"Ausente",clave:"p23-concurrente-incidencia-01"})})
    ]);
    assert.deepEqual(concurrentes.map(r=>r.status).sort(),[200,409]);
    let actual=(await pedir(url,e.conductor.cookie)).ruta;
    if(actual.estado !== "completada") {
        await cambio({accion:"entregar",revision:actual.revision,solicitudId:id,clave:"p23-resolver-incidencia-01"});
    }
    actual=(await pedir(url,e.conductor.cookie)).ruta;
    assert.equal(actual.activa,false);
    assert.equal((await pedir(`/solicitudes/${id}`,e.cliente.cookie)).registro.historial.filter(h=>h.accion==="iniciar").length,1);
    const {solicitud:nueva}=await pedir("/solicitudes",e.cliente.cookie,contenido(),201,{"Idempotency-Key":"p23-liberacion-reserva-0001"});
    await pedir(`/administracion/solicitudes/${nueva.id}/revision`,e.admin.cookie,{accion:"aceptar",revision:0});
    await pedir("/administracion/rutas",e.admin.cookie,{...e.ruta,solicitudes:[nueva.id]},201);
    await datos.asignarRol(e.conductor.usuario.id,"cliente");
    await pedir(url,e.conductor.cookie,undefined,403);
});
