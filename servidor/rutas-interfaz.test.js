const test = require("node:test"), assert = require("node:assert/strict");
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");

// Ejecuta el controlador real y sus eventos contra un DOM mínimo, sin cuentas ni red reales.
function interfaz(errorGuardado, incompleta = false) {
    class Elemento {
        constructor() { this.value=""; this.children=[]; this.eventos={}; this.open=false; }
        append(...elementos) { this.children.push(...elementos); }
        replaceChildren(...elementos) { this.children=elementos; this.value=""; }
        addEventListener(nombre,accion) { this.eventos[nombre]=accion; }
        setAttribute() {}
        querySelectorAll() { return []; }
        focus() { this.enfocado=true; }
        showModal() { this.open=true; }
        close() { this.open=false; }
        reset() {}
    }
    const nodos=new Map(), nodo=id=>{ if(!nodos.has(id)) nodos.set(id,new Elemento());return nodos.get(id); };
    const form=nodo("form-ruta");form.elements=Object.fromEntries(["fecha","vehiculoId","conductorRecursoId"].map(k=>[k,new Elemento()]));
    const envios=[];
    const window={api:{
        listarSolicitudesAdministracion:async()=>({solicitudes:[{id:"s1",referencia:"TD-1",destino:"Entrega 1",entregaCompleta:!incompleta},{id:"s2",referencia:"TD-2",destino:"Entrega 2",entregaCompleta:incompleta!=="todas"}]}),
        consultarTransportes:async()=>({rutas:[]}),
        peticion:async(ruta,opciones)=>{
            if(opciones?.method==="POST") {
                envios.push(JSON.parse(opciones.body));
                if(errorGuardado) throw Object.assign(new Error(errorGuardado),{estado:409});
                return {ruta:{id:"r1"}};
            }
            if(ruta.includes("vehiculos")) return {vehiculos:[{id:"v1",sede:"Yecla",matricula:"1234ABC",capacidad:80,unidadCapacidad:"m³"}]};
            if(ruta.includes("conductores")) return {conductores:[{id:"c1",usuarioId:3,sede:"Yecla",nombre:"Miguel",email:"no-mostrar@example.com"}]};
            return {ruta:{referencia:"RT-1",fecha:"2099-12-15",sede:"Yecla",vehiculo:{matricula:"1234ABC"},conductor:{nombre:"Miguel"},paradas:[]}};
        }
    }};
    const contextoRest = {window:{}, setTimeout, clearTimeout};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../cliente/rest.js"),"utf8"),contextoRest);
    Object.assign(window.api, Object.fromEntries(Object.entries(contextoRest.window.api).filter(([nombre])=>["listarRecursos","guardarRecurso","detalleRutaAdministracion","planificarRuta","detalleRutaConductor","actualizarEntrega"].includes(nombre))));
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../cliente/rutas.js"),"utf8"),{
        window,document:{getElementById:nodo,createElement:()=>new Elemento()},Intl,Date,cargarDatosPanel:async()=>{}
    });
    return {window,nodo,form,envios};
}
const terminarCarga=()=>new Promise(resolve=>setImmediate(resolve));
async function preparar(i) {
    i.window.rutasPanel.actualizar("administrador");await terminarCarga();
    i.form.elements.fecha.value="2099-12-15";i.form.elements.vehiculoId.value="v1";i.form.elements.conductorRecursoId.value="c1";
}
test("Guardar planificación incluye la solicitud seleccionada sin exigir Añadir parada",async()=>{
    const i=interfaz();await preparar(i);
    const opciones=i.form.elements.conductorRecursoId.children.map(c=>c.textContent);
    assert.ok(opciones.includes("Miguel"));assert.ok(!opciones.some(c=>c?.includes("@")));
    i.nodo("solicitud-para-ruta").value="s1";
    await i.form.eventos.submit({preventDefault(){}});
    assert.equal(i.envios.length,1);assert.deepEqual(i.envios[0].solicitudes,["s1"]);
});
test("Guardar añade la selección al final de las paradas existentes sin duplicar",async()=>{
    const i=interfaz();await preparar(i);
    i.nodo("solicitud-para-ruta").value="s2";i.nodo("agregar-parada").eventos.click();
    i.nodo("solicitud-para-ruta").value="s1";await i.form.eventos.submit({preventDefault(){}});
    assert.deepEqual(i.envios[0].solicitudes,["s2","s1"]);
});
test("Guardar sin selección muestra el aviso junto al botón y enfoca el mensaje",async()=>{
    const i=interfaz();await preparar(i);await i.form.eventos.submit({preventDefault(){}});
    assert.equal(i.envios.length,0);assert.match(i.nodo("resultado-planificacion").textContent,/Selecciona una solicitud/);
    assert.equal(i.nodo("resultado-planificacion").enfocado,true);
});
test("Los errores de entrega aparecen junto al botón sin perder las paradas",async()=>{
    const i=interfaz("Faltan datos de entrega");await preparar(i);
    i.nodo("solicitud-para-ruta").value="s1";await i.form.eventos.submit({preventDefault(){}});
    assert.equal(i.nodo("resultado-planificacion").textContent,"Faltan datos de entrega");
    assert.equal(i.nodo("resultado-planificacion").enfocado,true);
    assert.equal(i.nodo("paradas-ruta").children.length,1);
});

test("Las solicitudes incompletas están deshabilitadas y explican por qué no se pueden planificar",async()=>{
    const i=interfaz(undefined,true);await preparar(i);
    const opcion=i.nodo("solicitud-para-ruta").children.find(o=>o.value==="s1");assert.equal(opcion.disabled,true);
    assert.match(i.nodo("aviso-solicitudes-incompletas").textContent,/TD-1.*faltan datos de entrega/);
    assert.equal(i.nodo("aviso-solicitudes-incompletas").hidden,false);
    i.nodo("solicitud-para-ruta").value="s1";await i.form.eventos.submit({preventDefault(){}});
    assert.equal(i.envios.length,0);assert.match(i.nodo("resultado-planificacion").textContent,/TD-1.*datos de entrega/);
});

test("Si todas las solicitudes están incompletas, Guardar explica el problema real",async()=>{
    const i=interfaz(undefined,"todas");await preparar(i);
    await i.form.eventos.submit({preventDefault(){}});
    assert.equal(i.envios.length,0);
    assert.match(i.nodo("resultado-planificacion").textContent,/No hay solicitudes con datos de entrega completos/);
});
