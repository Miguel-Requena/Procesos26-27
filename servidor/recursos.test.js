const test=require("node:test");
const assert=require("node:assert/strict");
const datos=require("./datos"),logica=require("./logica"),ayudas=require("./ayudas-pruebas.cjs");
test.beforeEach(()=>datos.limpiar());
const camion={matricula:"1234 abc",tipoVehiculo:"Tráiler",capacidad:80,unidadCapacidad:"m³",sede:"Yecla",activo:true,disponible:true};
test("P21: catálogo, matrícula normalizada, duplicados concurrentes y cambios con versión",async()=>{
 const admin=await ayudas.registrarConfirmado("admin@example.com","clave-prueba","administrador");
 const resultados=await Promise.allSettled([logica.gestionarRecursos("vehiculos",admin,camion),logica.gestionarRecursos("vehiculos",admin,{...camion,matricula:"1234-ABC"})]);
 assert.equal(resultados.filter(r=>r.status==="fulfilled").length,1);
 assert.equal(resultados.find(r=>r.status==="rejected").reason.estado,409);
 const r=(await logica.gestionarRecursos("vehiculos",admin))[0];assert.equal(r.matricula,"1234ABC");
 const cambios=await Promise.allSettled([logica.gestionarRecursos("vehiculos",admin,{...r,disponible:false},r.id),logica.gestionarRecursos("vehiculos",admin,{...r,activo:false},r.id)]);
 assert.equal(cambios.filter(r=>r.status==="fulfilled").length,1);
 assert.equal((await logica.gestionarRecursos("vehiculos",admin,undefined,undefined,true)).length,0);
 const guardado=(await logica.gestionarRecursos("vehiculos",admin))[0];assert.equal(guardado.id,r.id);assert.equal(guardado.historial.length,2);
});
test("P21: permisos, validación y cuenta de conductor habilitada",async()=>{
 const admin=await ayudas.registrarConfirmado("admin@example.com","clave-prueba","administrador");
 const cliente=await ayudas.registrarConfirmado("cliente@example.com","clave-prueba");
 const conductor=await ayudas.registrarConfirmado("conductor@example.com","clave-prueba","conductor");
 for(const actor of [cliente,conductor]) await assert.rejects(logica.gestionarRecursos("vehiculos",actor),{estado:403});
 for(const entrada of [{...camion,capacidad:0},{...camion,sede:""},{...camion,activo:"true"},{...camion,matricula:"!!!"}]) await assert.rejects(logica.gestionarRecursos("vehiculos",admin,entrada),{estado:400});
 const recurso={usuarioId:cliente.id,sede:"Yecla",activo:true,disponible:true};
 await assert.rejects(logica.gestionarRecursos("conductores",admin,recurso),{estado:400});
 recurso.usuarioId=conductor.id;
 await logica.gestionarRecursos("conductores",admin,recurso);
 await assert.rejects(logica.gestionarRecursos("conductores",admin,recurso),{estado:409});
 assert.equal((await logica.gestionarRecursos("conductores",admin,undefined,undefined,true)).length,1);
 await datos.asignarRol(conductor.id,"cliente");
 assert.equal((await logica.gestionarRecursos("conductores",admin,undefined,undefined,true)).length,0);
 assert.equal((await logica.gestionarRecursos("conductores",admin)).length,1);
 await datos.asignarRol(admin.id,"cliente");
 await assert.rejects(logica.gestionarRecursos("vehiculos",admin),{estado:403});
});

test("P21: endpoints autentican y guardan el catálogo administrativo",async()=>{
 const app=require("./api"),{once}=require("node:events");
 const server=app.listen(0,"127.0.0.1");await once(server,"listening");
 const base=`http://127.0.0.1:${server.address().port}/api`;
 try {
  assert.equal((await fetch(base+"/administracion/vehiculos")).status,401);
  await ayudas.registrarConfirmado("admin@example.com","clave-prueba","administrador");
  const login=await fetch(base+"/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"admin@example.com",clave:"clave-prueba"})});
  const cookie=login.headers.getSetCookie().find(c=>c.startsWith("sesion=")).split(";")[0];
  const headers={cookie,"Content-Type":"application/json"};
  const alta=await fetch(base+"/administracion/vehiculos",{method:"POST",headers,body:JSON.stringify(camion)});assert.equal(alta.status,201);
  const r=(await alta.json()).recurso;
  const cambio=await fetch(base+"/administracion/vehiculos/"+r.id,{method:"PUT",headers,body:JSON.stringify({...r,disponible:false})});assert.equal(cambio.status,200);
  const lista=await fetch(base+"/administracion/vehiculos?asignables=true",{headers});assert.deepEqual((await lista.json()).vehiculos,[]);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
