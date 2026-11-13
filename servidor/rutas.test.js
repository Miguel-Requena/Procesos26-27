const test = require("node:test");
const assert = require("node:assert/strict");
const datos = require("./datos"), logica = require("./logica"), ayudas = require("./ayudas-pruebas.cjs");
test.beforeEach(() => datos.limpiar());
async function escenario() {
    const admin = await ayudas.registrarConfirmado("admin@example.com","clave-prueba","administrador");
    const cliente = await ayudas.registrarConfirmado("cliente@example.com","clave-prueba");
    const conductor = await ayudas.registrarConfirmado("conductor@example.com","clave-prueba","conductor");
    const conductor2 = await ayudas.registrarConfirmado("conductor2@example.com","clave-prueba","conductor");
    const crearVehiculo = matricula => logica.gestionarRecursos("vehiculos",admin,{matricula,tipoVehiculo:"Tráiler",capacidad:80,unidadCapacidad:"m³",sede:"Yecla",activo:true,disponible:true});
    const crearConductor = usuarioId => logica.gestionarRecursos("conductores",admin,{usuarioId,sede:"Yecla",activo:true,disponible:true});
    const vehiculo = await crearVehiculo("1234ABC"), vehiculo2 = await crearVehiculo("5678DEF");
    const recurso = await crearConductor(conductor.id), recurso2 = await crearConductor(conductor2.id);
    const solicitudes = [];
    for (let i=0;i<3;i++) {
        const {solicitud:s} = await logica.crearSolicitud({fabricante:"Fábrica",origen:"Calle Fábrica 1",fecha:"2099-12-01",destinatario:`Tienda ${i}`,destino:`Calle Entrega ${i}`,localidadEntrega:"Rubí",codigoPostalEntrega:"08191",contactoEntrega:{nombre:"Ana",telefono:"612345678"},contactoRecogida:{nombre:"Eva",telefono:"623456789"},mobiliario:[{descripcion:"Sofá",cantidad:2,unidad:"bultos"}],observaciones:"Avisar antes"},`p22-solicitud-00000${i}`,cliente);
        solicitudes.push(await logica.revisarSolicitud(s.id,{accion:"aceptar",revision:0},admin));
    }
    const entrada = {fecha:"2099-12-15",sede:"Yecla",vehiculoId:vehiculo.id,conductorRecursoId:recurso.id,solicitudes:[solicitudes[1].id,solicitudes[0].id]};
    return {admin,cliente,conductor,conductor2,vehiculo,vehiculo2,recurso,recurso2,solicitudes,entrada};
}
test("P22: ruta con orden, recursos guardados e historial consistente; conserva fotos de los datos",async()=>{
    const e=await escenario(),ruta=await logica.planificarRuta({...e.entrada,estado:"finalizada",conductorId:999},e.admin);
    assert.equal(ruta.estado,"planificada"); assert.equal(ruta.sede,"Yecla"); assert.equal(ruta.conductorId,e.conductor.id);
    assert.deepEqual(ruta.paradas.map(p=>p.solicitudId),e.entrada.solicitudes);
    assert.deepEqual(ruta.paradas.map(p=>p.orden),[1,2]);assert.equal(ruta.vehiculo.matricula,"1234ABC");
    for (const id of e.entrada.solicitudes) {
        const s=await datos.detalleSolicitud(e.cliente.id,id);
        assert.equal(s.estado,"planificada");assert.equal(s.rutaId,ruta.id);assert.equal(s.revision,2);
        assert.equal(s.historial.at(-1).estadoAnterior,"aceptada");assert.equal(s.historial.at(-1).responsableId,e.admin.id);
    }
    const propias=await logica.consultarTransportes("rutas",e.conductor);assert.equal(propias.length,1);
    assert.equal((await logica.consultarTransportes("rutas",e.conductor2)).length,0);
    await logica.gestionarRecursos("vehiculos",e.admin,{...e.vehiculo,matricula:"9999ZZZ",activo:false},e.vehiculo.id);
    const detalle=await logica.consultarRutaAdministracion(ruta.id,e.admin);
    assert.equal(detalle.vehiculo.matricula,"1234ABC");assert.equal(detalle.paradas[0].contacto.telefono,"612345678");
    assert.equal((await logica.consultarTransportes("solicitudes",e.cliente)).filter(s=>s.estado==="planificada").length,2);
});
test("P22: vehículo y conductor no se repiten en la fecha; un fallo no altera otras solicitudes",async()=>{
    const e=await escenario();await logica.planificarRuta(e.entrada,e.admin);
    const restante=e.solicitudes[2].id;
    for (const cambios of [{conductorRecursoId:e.recurso2.id},{vehiculoId:e.vehiculo2.id}]) {
        await assert.rejects(logica.planificarRuta({...e.entrada,...cambios,solicitudes:[restante]},e.admin),{estado:409});
        assert.equal((await datos.detalleSolicitud(undefined,restante)).estado,"aceptada");
        assert.equal((await logica.consultarTransportes("rutas",e.admin)).length,1);
    }
    const otra=await logica.planificarRuta({...e.entrada,fecha:"2099-12-16",solicitudes:[restante]},e.admin);assert.equal(otra.fecha,"2099-12-16");
});
test("P22: solicitudes y recursos concurrentes solo permiten un ganador y no dejan planificación parcial",async()=>{
    const e=await escenario();
    const resultados=await Promise.allSettled([
        logica.planificarRuta(e.entrada,e.admin),
        logica.planificarRuta({...e.entrada,fecha:"2099-12-16",vehiculoId:e.vehiculo2.id,conductorRecursoId:e.recurso2.id},e.admin)
    ]);
    assert.equal(resultados.filter(r=>r.status==="fulfilled").length,1);assert.equal(resultados.find(r=>r.status==="rejected").reason.estado,409);
    const ruta=resultados.find(r=>r.status==="fulfilled").value;
    for (const id of e.entrada.solicitudes) assert.equal((await datos.detalleSolicitud(undefined,id)).rutaId,ruta.id);
    assert.equal((await datos.detalleSolicitud(undefined,e.solicitudes[2].id)).estado,"aceptada");
});
test("P22: valida fecha, paradas, sede y permisos incluso después de revocar un rol",async()=>{
    const e=await escenario();
    for (const cambios of [{fecha:"2099-02-30"},{fecha:"2020-01-01"},{sede:"Rubí"},{solicitudes:[]},{solicitudes:[e.solicitudes[0].id,e.solicitudes[0].id]},{vehiculoId:{$ne:null}},{solicitudes:[{$ne:null}]}]) await assert.rejects(logica.planificarRuta({...e.entrada,...cambios},e.admin),{estado:400});
    for (const actor of [e.cliente,e.conductor]) {
        await assert.rejects(logica.planificarRuta(e.entrada,actor),{estado:403});
        await assert.rejects(logica.consultarRutaAdministracion("inventada",actor),{estado:403});
    }
    await assert.rejects(logica.consultarRutaAdministracion("inventada",e.admin),{estado:404});
    await datos.asignarRol(e.admin.id,"cliente");await assert.rejects(logica.planificarRuta(e.entrada,e.admin),{estado:403});
});
test("P22: dos administradores no reservan el mismo camión simultáneamente",async()=>{
    const e=await escenario();
    const resultados=await Promise.allSettled([
        logica.planificarRuta({...e.entrada,solicitudes:[e.solicitudes[0].id]},e.admin),
        logica.planificarRuta({...e.entrada,conductorRecursoId:e.recurso2.id,solicitudes:[e.solicitudes[1].id]},e.admin)
    ]);
    assert.equal(resultados.filter(r=>r.status==="fulfilled").length,1);
    assert.equal(resultados.find(r=>r.status==="rejected").reason.estado,409);
    const estados=await Promise.all(e.solicitudes.map(s=>datos.detalleSolicitud(undefined,s.id)));
    assert.equal(estados.filter(s=>s.estado==="planificada").length,1);
    assert.equal(estados.filter(s=>s.estado==="aceptada").length,2);
});
test("P22: rechaza recursos inactivos, no disponibles, de otra sede o con cuenta revocada",async()=>{
    const e=await escenario();
    for (const cambios of [{activo:false},{disponible:false},{sede:"Rubí"}]) {
        const actual=(await datos.listarRecursos("vehiculos"))[0];
        await logica.gestionarRecursos("vehiculos",e.admin,{...actual,...cambios},actual.id);
        await assert.rejects(logica.planificarRuta(e.entrada,e.admin),{estado:409});
        const modificado=(await datos.listarRecursos("vehiculos"))[0];await logica.gestionarRecursos("vehiculos",e.admin,{...modificado,activo:true,disponible:true,sede:"Yecla"},modificado.id);
    }
    await datos.asignarRol(e.conductor.id,"cliente");await assert.rejects(logica.planificarRuta(e.entrada,e.admin),{estado:409});
    await datos.asignarRol(e.conductor.id,"conductor");await datos.desactivar(e.conductor.id);await assert.rejects(logica.planificarRuta(e.entrada,e.admin),{estado:409});
    assert.equal((await logica.consultarTransportes("rutas",e.admin)).length,0);
});
test("P22: solicitud pendiente o inexistente impide toda la ruta",async()=>{
    const e=await escenario();
    await datos.configurarTransportePrueba("solicitudes",{id:"pendiente",clienteId:e.cliente.id,referencia:"ANTIGUA",origen:"Yecla",destino:"Rubí",fecha:"2099-12-15",estado:"pendiente_recogida"});
    for (const id of ["pendiente","inexistente"]) await assert.rejects(logica.planificarRuta({...e.entrada,solicitudes:[e.solicitudes[0].id,id]},e.admin),{estado:409});
    assert.equal((await datos.detalleSolicitud(undefined,e.solicitudes[0].id)).estado,"aceptada");
    assert.equal((await logica.consultarTransportes("rutas",e.admin)).length,0);
});
test("P22: endpoints protegidos permiten guardar y consultar el itinerario ordenado",async()=>{
    const e=await escenario(),app=require("./api"),{once}=require("node:events"),server=app.listen(0,"127.0.0.1");await once(server,"listening");
    const base=`http://127.0.0.1:${server.address().port}/api`;
    try {
        assert.equal((await fetch(base+"/administracion/rutas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e.entrada)})).status,401);
        async function login(email) {
            const r=await fetch(base+"/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,clave:"clave-prueba"})});return r.headers.getSetCookie().find(c=>c.startsWith("sesion=")).split(";")[0];
        }
        const headers={cookie:await login(e.admin.email),"Content-Type":"application/json"};
        const r=await fetch(base+"/administracion/rutas",{method:"POST",headers,body:JSON.stringify(e.entrada)});assert.equal(r.status,201);const {ruta}=await r.json();
        const detalle=await fetch(base+"/administracion/rutas/"+ruta.id,{headers});assert.equal(detalle.status,200);assert.deepEqual((await detalle.json()).ruta.paradas.map(p=>p.solicitudId),e.entrada.solicitudes);
        const otro={cookie:await login(e.cliente.email),"Content-Type":"application/json"};
        assert.equal((await fetch(base+"/administracion/rutas/"+ruta.id,{headers:otro})).status,403);
        assert.equal((await fetch(base+"/administracion/rutas",{method:"POST",headers:otro,body:JSON.stringify(e.entrada)})).status,403);
    } finally { await new Promise(resolve=>server.close(resolve)); }
});
