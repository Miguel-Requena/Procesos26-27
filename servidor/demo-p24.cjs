// Demostración local desechable: nunca carga .env ni conecta a MongoDB/producción.
require("./entorno-pruebas.cjs");
const logica=require("./logica"),ayudas=require("./ayudas-pruebas.cjs");
(async()=>{
    const admin=await ayudas.registrarConfirmado("admin-p24@example.com","clave-prueba","administrador");
    const cliente=await ayudas.registrarConfirmado("cliente-p24@example.com","clave-prueba");
    const conductor=await ayudas.registrarConfirmado("conductor-p24@example.com","clave-prueba","conductor");
    const v=await logica.gestionarRecursos("vehiculos",admin,{matricula:"2424PBI",tipoVehiculo:"Camión",capacidad:80,unidadCapacidad:"m³",sede:"Yecla",activo:true,disponible:true});
    const c=await logica.gestionarRecursos("conductores",admin,{usuarioId:conductor.id,nombre:"Conductor de demostración",sede:"Yecla",activo:true,disponible:true});
    const solicitudes=[];
    for(let i=1;i<=2;i++) {
        const {solicitud}=await logica.crearSolicitud({fabricante:"Fábrica ficticia P24",origen:"Calle Ficticia 1, Yecla",fecha:"2099-12-01",destinatario:`Tienda ficticia ${i}`,destino:`Calle Entrega ${i}`,localidadEntrega:"Albacete",codigoPostalEntrega:"02001",contactoRecogida:{nombre:"Ana ficticia",telefono:"612345678"},contactoEntrega:{nombre:"Eva ficticia",telefono:"623456789"},mobiliario:[{descripcion:"Sofá ficticio",cantidad:2,unidad:"bultos"}],observaciones:"Avisar antes de llegar"},`demo-p24-solicitud-0000${i}`,cliente);
        solicitudes.push((await logica.revisarSolicitud(solicitud.id,{accion:"aceptar",revision:0},admin)).id);
    }
    await logica.planificarRuta({fecha:"2099-12-15",sede:"Yecla",vehiculoId:v.id,conductorRecursoId:c.id,solicitudes},admin);
    require("./api").listen(3087,"127.0.0.1",()=>console.log("Demo ficticia: http://127.0.0.1:3087 · cuentas *@example.com · contraseña exclusiva: clave-prueba"));
})().catch(e=>{console.error(e);process.exitCode=1;});
