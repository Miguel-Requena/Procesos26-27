process.env.GMAIL_USER="pruebas@example.com";
process.env.GMAIL_APP_PASSWORD="prueba-simulada";
require("./correo").enviar=async()=>{};
const test=require("node:test"),assert=require("node:assert/strict"),{once}=require("node:events");
const datos=require("./datos"),logica=require("./logica"),ayudas=require("./ayudas-pruebas.cjs"),app=require("./api");
let servidor,base;
test.before(async()=>{servidor=app.listen(0,"127.0.0.1");await once(servidor,"listening");base=`http://127.0.0.1:${servidor.address().port}`;});
test.after(()=>new Promise(resolve=>servidor.close(resolve)));
test.beforeEach(()=>datos.limpiar());
function registrar(datos) {return fetch(base+"/api/registro",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(datos)});}

test("El registro público exige nombre y primer apellido, incluso sin validación del navegador",async()=>{
    const entrada={email:"registro@example.com",clave:"clave-prueba",nombre:"Ana",primerApellido:"García"};
    for(const cambios of [{nombre:undefined},{primerApellido:undefined},{nombre:" "},{primerApellido:12},{nombre:"a".repeat(101)},{primerApellido:{valor:"García"}},{nombre:"Ana\u0000"}]) {
        const r=await registrar({...entrada,...cambios});assert.equal(r.status,400);assert.match((await r.json()).error,/Nombre|apellido/);
    }
    assert.equal(await datos.buscarPorEmail(entrada.email),undefined);
    // Corregir datos no consume el límite de envío de correo.
    const r=await registrar({...entrada,nombre:" Ana María ",primerApellido:" de la Cruz ",rol:"administrador"});assert.equal(r.status,201);
    const {usuario}=await r.json();assert.equal(usuario.nombre,"Ana María");assert.equal(usuario.primerApellido,"de la Cruz");
    assert.equal(usuario.rol,"cliente");assert.equal(usuario.activo,false);assert.equal(usuario.clave,undefined);
    assert.equal((await datos.buscarPorId(usuario.id)).nombre,"Ana María");
    await datos.configurarCuentaPrueba(usuario.id);
    const login=await logica.iniciarSesion(entrada.email,entrada.clave);assert.equal(login.primerApellido,"de la Cruz");
    assert.equal((await logica.obtenerUsuarioSesion(usuario.id)).nombre,"Ana María");
});
test("El nombre de la cuenta se utiliza automáticamente en los conductores sin inventar nombres antiguos",async()=>{
    const admin=await ayudas.administrador("admin@example.com","clave-prueba");
    const usuario=await logica.registrarUsuario("conductor@example.com","clave-prueba",{nombre:"Miguel",primerApellido:"Requena"});
    await datos.configurarCuentaPrueba(usuario.id,true,"conductor");
    const recurso=await logica.gestionarRecursos("conductores",admin,{usuarioId:usuario.id,sede:"Yecla",activo:true,disponible:true});
    assert.equal(recurso.nombre,"Miguel Requena");
    assert.equal((await logica.gestionarRecursos("conductores",admin))[0].nombre,"Miguel Requena");
    const antigua=await ayudas.registrarConfirmado("antigua@example.com","clave-prueba","conductor");
    const sinNombre=await logica.gestionarRecursos("conductores",admin,{usuarioId:antigua.id,sede:"Yecla",activo:true,disponible:true});assert.equal(sinNombre.nombre,"");
    assert.equal((await logica.iniciarSesion(antigua.email,"clave-prueba")).id,antigua.id);
});
test("Google guarda los datos de identidad y rechaza nuevas cuentas sin apellido",async()=>{
    const perfil={sub:"identidad-nueva",email:"google@example.com",email_verified:true,given_name:"Ana",family_name:"García"};
    const usuario=await logica.entrarGoogle(perfil);assert.equal(usuario.nombre,"Ana");assert.equal(usuario.primerApellido,"García");
    assert.equal((await logica.entrarGoogle({sub:perfil.sub,email:perfil.email,email_verified:true})).id,usuario.id);
    await assert.rejects(logica.entrarGoogle({...perfil,sub:"sin-apellido",email:"incompleta@example.com",family_name:undefined}),{estado:400,acceso:"datos-personales"});
    assert.equal(await datos.buscarPorEmail("incompleta@example.com"),undefined);
});
