const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

test("P22 MongoDB: transacciones, conflictos simultáneos, rollback e itinerario persistente", {
    skip: !process.env.MONGODB_TEST_URL, timeout: 90000
}, () => {
    const uri = new URL(process.env.MONGODB_TEST_URL);
    assert.ok(["localhost","127.0.0.1"].includes(uri.hostname));
    assert.ok(uri.pathname.startsWith("/pruebas_"));
    function ejecutar(codigo) {
        const r = spawnSync(process.execPath,["-e",`(async()=>{
            const assert=require('node:assert/strict'),logica=require('./logica'),datos=require('./datos');
            const {MongoClient}=require('mongodb');const manual=new MongoClient(process.env.DATABASE_URL);
            try {await manual.connect();const db=manual.db();${codigo}}
            finally {await manual.close();await datos.cerrar();}
        })().catch(e=>{console.error(e.stack);process.exitCode=1;});`],{
            cwd:__dirname,timeout:40000,encoding:"utf8",env:{...process.env,DATABASE_URL:process.env.MONGODB_TEST_URL,NODE_ENV:"test"}
        });
        assert.equal(r.status,0,r.stderr);return r.stdout.trim();
    }
    const rutaId = ejecutar(`
        const prefijo='p22-'+require('node:crypto').randomUUID();
        async function cuenta(nombre,rol) {
            const u=await logica.registrarUsuario(nombre+'-'+prefijo+'@example.com','clave-prueba');
            await db.collection('usuarios').updateOne({id:u.id},{$set:{confirmado:true,rol}});return datos.buscarPorId(u.id);
        }
        const admin=await cuenta('admin','administrador'),cliente=await cuenta('cliente','cliente'),c1=await cuenta('conductor1','conductor'),c2=await cuenta('conductor2','conductor');
        async function vehiculo(n) {return logica.gestionarRecursos('vehiculos',admin,{matricula:'P'+admin.id+'V'+n,tipoVehiculo:'Tráiler',capacidad:80,unidadCapacidad:'m³',sede:'Yecla',activo:true,disponible:true});}
        async function conductor(usuarioId) {return logica.gestionarRecursos('conductores',admin,{usuarioId,sede:'Yecla',activo:true,disponible:true});}
        const v1=await vehiculo(1),v2=await vehiculo(2),r1=await conductor(c1.id),r2=await conductor(c2.id),solicitudes=[];
        for(let i=0;i<4;i++) {
            const {solicitud:s}=await logica.crearSolicitud({fabricante:'Fábrica',origen:'Industria 1',fecha:'2099-12-01',destinatario:'Tienda '+i,destino:'Entrega '+i,localidadEntrega:'Rubí',codigoPostalEntrega:'08191',contactoEntrega:{nombre:'Ana',telefono:'612345678'},contactoRecogida:{nombre:'Eva',telefono:'623456789'},mobiliario:[{descripcion:'Sofá',cantidad:2,unidad:'bultos'}]},prefijo+'-s'+i,cliente);
            solicitudes.push(await logica.revisarSolicitud(s.id,{accion:'aceptar',revision:0},admin));
        }
        const entrada={fecha:'2099-12-15',sede:'Yecla',vehiculoId:v1.id,conductorRecursoId:r1.id,solicitudes:[solicitudes[1].id,solicitudes[0].id]};
        const intentos=await Promise.allSettled([
            logica.planificarRuta(entrada,admin),
            logica.planificarRuta({...entrada,fecha:'2099-12-16',vehiculoId:v2.id,conductorRecursoId:r2.id},admin)]);
        assert.equal(intentos.filter(r=>r.status==='fulfilled').length,1);
        assert.equal(intentos.find(r=>r.status==='rejected').reason.estado,409);
        const ruta=intentos.find(r=>r.status==='fulfilled').value;
        assert.deepEqual(ruta.paradas.map(p=>p.solicitudId),entrada.solicitudes);
        for(const id of entrada.solicitudes) {
            const s=await datos.detalleSolicitud(cliente.id,id);assert.equal(s.estado,'planificada');assert.equal(s.rutaId,ruta.id);assert.equal(s.historial.length,3);
        }
        const libreV=ruta.vehiculoId===v1.id?v2:v1,libreC=ruta.conductorRecursoId===r1.id?r2:r1;
        for(const cambios of [{vehiculoId:ruta.vehiculoId,conductorRecursoId:libreC.id},{vehiculoId:libreV.id,conductorRecursoId:ruta.conductorRecursoId}]) {
            await assert.rejects(logica.planificarRuta({...entrada,...cambios,fecha:ruta.fecha,solicitudes:[solicitudes[2].id]},admin),{estado:409});
            assert.equal((await datos.detalleSolicitud(cliente.id,solicitudes[2].id)).estado,'aceptada');
        }
        const recursoActual=(await datos.listarRecursos('vehiculos')).find(r=>r.id===libreV.id);
        await logica.gestionarRecursos('vehiculos',admin,{...recursoActual,disponible:false},libreV.id);
        await assert.rejects(logica.planificarRuta({...entrada,fecha:'2099-12-17',vehiculoId:libreV.id,conductorRecursoId:libreC.id,solicitudes:[solicitudes[3].id]},admin),{estado:409});
        assert.equal((await datos.detalleSolicitud(cliente.id,solicitudes[3].id)).estado,'aceptada');
        assert.equal(await db.collection('rutas').countDocuments({responsableId:admin.id}),1);
        console.log(ruta.id);
    `);
    ejecutar(`
        const ruta=await datos.detalleRuta(${JSON.stringify(rutaId)});
        assert.equal(ruta.paradas.length,2);assert.equal(ruta.paradas[0].destinatario,'Tienda 1');
        assert.equal(ruta.paradas[0].contacto.telefono,'612345678');
        for(const p of ruta.paradas) assert.equal((await datos.detalleSolicitud(undefined,p.solicitudId)).rutaId,ruta.id);
    `);
});
