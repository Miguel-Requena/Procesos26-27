const test=require("node:test"),assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
function interfaz(responder) {
    class Elemento {
        constructor(tag){this.tag=tag;this.children=[];this.eventos={};this.value="";this.open=false;this._texto="";}
        set textContent(v){this._texto=v;this.children=[];} get textContent(){return this._texto;}
        append(...v){this.children.push(...v);} replaceChildren(...v){this.children=v;this._texto="";}
        addEventListener(nombre,accion){this.eventos[nombre]=accion;} setAttribute(){} focus(){}
        showModal(){this.open=true;} close(){this.open=false;this.eventos.close?.();}
        querySelectorAll(){return this.children.flatMap(c=>[c,...c.querySelectorAll()]).filter(c=>["button","textarea"].includes(c.tag));}
    }
    const body=new Elemento("body"),envios=[];
    const ruta={id:"r1",referencia:"RT-1",fecha:"2099-12-15",sede:"Yecla",estado:"planificada",revision:0,vehiculo:{matricula:"2424PBI"},paradas:[{solicitudId:"s1",referencia:"TD-1",estado:"planificada",contacto:{},mobiliario:[]}]};
    const window={api:{peticion:async(url,opciones)=>{
        if(!opciones) return {ruta:structuredClone(ruta)};
        const entrada=JSON.parse(opciones.body);envios.push(entrada);
        return responder(entrada,envios.length,ruta);
    }}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../cliente/entregas.js"),"utf8"),{window,document:{body,createElement:t=>new Elemento(t)},crypto:require("node:crypto"),cargarDatosPanel:async()=>{}});
    const todos=n=>[n,...n.children.flatMap(todos)];
    const boton=texto=>todos(body).find(e=>e.tag==="button"&&e.textContent===texto);
    return {window,envios,body,boton,todos};
}
test("P23 CA23-05: respuesta perdida conserva clave y revisión; no confirma éxito sin servidor",async()=>{
    const i=interfaz((entrada,intento,ruta)=>{
        if(intento===1) throw new Error("Red interrumpida tras guardar");
        return {ruta:{...ruta,estado:"en_transito",revision:1}};
    });
    i.window.entregasPanel.actualizar("conductor");await i.window.entregasPanel.abrir("r1");
    await i.boton("Iniciar ruta").eventos.click();
    assert.equal(i.todos(i.body).some(e=>e.textContent==="Actualización confirmada y guardada."),false);
    assert.ok(i.boton("Reintentar operación"));
    await i.boton("Reintentar operación").eventos.click();
    assert.deepEqual(i.envios[0],i.envios[1]);
    assert.ok(i.todos(i.body).some(e=>e.textContent==="Actualización confirmada y guardada."));
});
test("P23: cerrar sesión descarta una respuesta pendiente y limpia datos operativos",async()=>{
    let completar;
    const i=interfaz(()=>new Promise(resolve=>{completar=resolve;}));
    i.window.entregasPanel.actualizar("conductor");await i.window.entregasPanel.abrir("r1");
    const pendiente=i.boton("Iniciar ruta").eventos.click();
    i.window.entregasPanel.actualizar(undefined);
    completar({ruta:{id:"r1",estado:"en_transito",revision:1}});await pendiente;
    assert.equal(i.body.children[0].open,false);
    assert.equal(i.todos(i.body).some(e=>e.textContent.includes("RT-1")),false);
    assert.equal(i.todos(i.body).some(e=>e.textContent==="Actualización confirmada y guardada."),false);
});
