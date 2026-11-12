const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('./api');
const datos = require('./datos');
const logica = require('./logica');
const ayudas = require('./ayudas-pruebas.cjs');
let servidor, base;
test.before(async()=>{servidor=app.listen(0,'127.0.0.1');await once(servidor,'listening');base=`http://127.0.0.1:${servidor.address().port}`;});
test.after(()=>new Promise(r=>servidor.close(r)));
test.beforeEach(()=>datos.limpiar());
async function cuenta(email,rol='cliente') {
 const usuario=await ayudas.registrarConfirmado(email,'clave-prueba',rol);
 const res=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,clave:'clave-prueba'})});
 return {usuario,cookie:res.headers.getSetCookie().find(c=>c.startsWith('sesion=')).split(';')[0]};
}
function peticion(actor,ruta='',datos) {
 return fetch(base+'/api/administracion/solicitudes'+ruta,{method:datos?'POST':'GET',headers:{'Content-Type':'application/json',...(actor?{cookie:actor.cookie}:{})},...(datos?{body:JSON.stringify(datos)}:{})});
}
async function solicitud(actor,clave='p19-prueba-12345678') {
 return (await logica.crearSolicitud({fabricante:'Fábrica',origen:'Yecla',fecha:'2099-12-15',contactoRecogida:{nombre:'Ana',telefono:'612345678'},mobiliario:[{descripcion:'Sofá',cantidad:2,unidad:'bultos'}],observaciones:'Avisar antes'},clave,actor.usuario)).solicitud;
}
test('P19: endpoints exclusivos de administración y revocación de permisos en sesión abierta',async()=>{
 const admin=await cuenta('admin@example.com','administrador');
 for(const actor of [undefined,await cuenta('cliente@example.com'),await cuenta('conductor@example.com','conductor')]) {
  const esperado=actor?403:401;
  assert.equal((await peticion(actor)).status,esperado);
  assert.equal((await peticion(actor,'/no-existe')).status,esperado);
  assert.equal((await peticion(actor,'/no-existe/revision',{accion:'aceptar',revision:0})).status,esperado);
 }
 await datos.configurarCuentaPrueba(admin.usuario.id,true,'cliente');
 assert.equal((await peticion(admin)).status,403);
 await datos.desactivar(admin.usuario.id);
 assert.equal((await peticion(admin)).status,401);
});
test('P19: filtros combinados de estado y fecha, límites inclusivos y parámetros no válidos',async()=>{
 const admin=await cuenta('admin@example.com','administrador'),cliente=await cuenta('cliente@example.com');
 for(const [id,estado,fecha] of [['a','pendiente_recogida','2099-12-15'],['b','aceptada','2099-12-15'],['c','pendiente_recogida','2099-12-16']]) await datos.configurarTransportePrueba('solicitudes',{id,clienteId:cliente.usuario.id,referencia:id,origen:'Yecla',destino:'Rubí',estado,fecha});
 const res=await peticion(admin,'?estado=pendiente_recogida&desde=2099-12-15&hasta=2099-12-15');assert.equal(res.status,200);
 assert.deepEqual((await res.json()).solicitudes.map(r=>r.id),['a']);
 assert.equal((await (await peticion(admin,'?desde=2099-12-17')).json()).solicitudes.length,0);
 for(const filtro of ['estado=inventado','desde=2099-02-30','desde=2099-12-16&hasta=2099-12-15','estado[$ne]=x','desde[$gt]=x','clienteId=1','estado=aceptada&estado=rechazada']) assert.equal((await peticion(admin,'?'+filtro)).status,400,filtro);
 assert.equal((await peticion(admin,'/no-existe')).status,404);
});
test('P19: asignación de las tres sedes con control de versión, fecha y responsable',async()=>{
 const admin=await cuenta('admin@example.com','administrador'),cliente=await cuenta('cliente@example.com');const r=await solicitud(cliente);
 let revision=0;
 for(const sedeOperativa of ['Yecla','Rubí','Palma de Mallorca']) {
  const respuesta=await peticion(admin,`/${r.id}/revision`,{accion:'asignar_sede',revision,sedeOperativa,responsableId:999});assert.equal(respuesta.status,200);
  const {solicitud:actual}=await respuesta.json();assert.equal(actual.sedeOperativa,sedeOperativa);assert.equal(actual.estado,'pendiente_recogida');assert.equal(actual.revision,++revision);
  const evento=actual.historial.at(-1);assert.equal(evento.responsableId,admin.usuario.id);assert.ok(evento.fecha);assert.equal(evento.accion,'asignar_sede');
 }
 assert.equal((await peticion(admin,`/${r.id}/revision`,{accion:'aceptar',revision:0})).status,409);
 for(const sedeOperativa of ['Madrid',null,{$ne:null}]) assert.equal((await peticion(admin,`/${r.id}/revision`,{accion:'asignar_sede',revision,sedeOperativa})).status,400);
});
test('P19: rechazo exige motivo visible al propietario, conserva historial y no revela ids administrativos',async()=>{
 const admin=await cuenta('admin@example.com','administrador'),cliente=await cuenta('cliente@example.com');const r=await solicitud(cliente);
 for(const motivo of ['', ' ', 'x'.repeat(1001), {$ne:null}]) assert.equal((await peticion(admin,`/${r.id}/revision`,{accion:'rechazar',revision:0,motivo})).status,400);
 const motivo='$or <img src=x onerror=alert(1)> Sin capacidad en la fecha solicitada';
 const respuesta=await peticion(admin,`/${r.id}/revision`,{accion:'rechazar',revision:0,motivo,sedeOperativa:'Rubí'});assert.equal(respuesta.status,200);
 const detalle=await logica.consultarTransportes('solicitudes',cliente.usuario,r.id);assert.equal(detalle.estado,'rechazada');assert.equal(detalle.motivoRechazo,motivo);assert.equal(detalle.sedeOperativa,'Rubí');assert.equal(detalle.historial.at(-1).responsable,'Administración');assert.equal(detalle.historial.at(-1).responsableId,undefined);
 assert.equal(detalle.clienteId,undefined);assert.equal(detalle.huella,undefined);
 await assert.rejects(logica.cancelarSolicitud(r.id,cliente.usuario),{estado:409});
 assert.equal((await peticion(admin,`/${r.id}/revision`,{accion:'aceptar',revision:1})).status,409);
});
test('P19: revisiones concurrentes y cancelación del cliente no se sobrescriben',async()=>{
 const admin=await cuenta('admin@example.com','administrador'),cliente=await cuenta('cliente@example.com');const r=await solicitud(cliente);
 const resultados=await Promise.all([peticion(admin,`/${r.id}/revision`,{accion:'aceptar',revision:0}),peticion(admin,`/${r.id}/revision`,{accion:'rechazar',revision:0,motivo:'Sin capacidad'})]);
 assert.deepEqual(resultados.map(r=>r.status).sort(),[200,409]);
 const detalle=(await (await peticion(admin,`/${r.id}`)).json()).registro;assert.equal(detalle.historial.length,2);
 const otra=await solicitud(cliente,'p19-segunda-12345678');
 const carrera=await Promise.allSettled([logica.revisarSolicitud(otra.id,{accion:'aceptar',revision:0},admin.usuario),logica.cancelarSolicitud(otra.id,cliente.usuario)]);
 assert.equal(carrera.filter(r=>r.status==='fulfilled').length,1);assert.equal(carrera.find(r=>r.status==='rejected').reason.estado,409);
});
test('P19: aceptar permite asignar sede después; estados posteriores o cancelados no admiten revisión',async()=>{
 const admin=await cuenta('admin@example.com','administrador'),cliente=await cuenta('cliente@example.com');const r=await solicitud(cliente);
 assert.equal((await peticion(admin,`/${r.id}/revision`,{accion:'aceptar',revision:0})).status,200);
 assert.equal((await peticion(admin,`/${r.id}/revision`,{accion:'asignar_sede',revision:1,sedeOperativa:'Yecla'})).status,200);
 for(const estado of ['planificada','en_transito','cancelada','completada','rechazada']) {
  await datos.configurarTransportePrueba('solicitudes',{id:estado,clienteId:cliente.usuario.id,referencia:estado,origen:'Yecla',destino:'Rubí',fecha:'2099-12-15',estado});
  for(const accion of ['asignar_sede','aceptar','rechazar']) assert.equal((await peticion(admin,`/${estado}/revision`,{accion,revision:0,sedeOperativa:'Yecla',motivo:'Sin capacidad'})).status,409);
 }
});
