const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

// Solo una base local desechable cuyo nombre identifica expresamente las pruebas.
test("MongoDB conserva cuentas y confirmación manual entre procesos y aplica permisos", {
    skip: !process.env.MONGODB_TEST_URL, timeout: 90000
}, () => {
    const uri = new URL(process.env.MONGODB_TEST_URL);
    assert.ok(["localhost", "127.0.0.1"].includes(uri.hostname));
    assert.ok(uri.pathname.startsWith("/pruebas_"));
    const email = `usuario-${Date.now()}@example.com`;
    const adminEmail = `admin-${Date.now()}@example.com`;
    const duplicado = `duplicado-${Date.now()}@example.com`;
    function ejecutar(codigo) {
        const resultado = spawnSync(process.execPath, ["-e", `(async () => {
            const assert = require('node:assert/strict');
            const logica = require('./logica');
            const datos = require('./datos');
            const { MongoClient } = require('mongodb');
            const manual = new MongoClient(process.env.DATABASE_URL);
            try { await manual.connect(); const usuarios = manual.db().collection('usuarios'); ${codigo} }
            finally { await datos.cerrar(); await manual.close(); }
        })().catch(() => { console.error('Falló la comprobación MongoDB'); process.exitCode = 1; })`], {
            cwd: __dirname, timeout: 25000, encoding: "utf8",
            env: { ...process.env, DATABASE_URL: process.env.MONGODB_TEST_URL, NODE_ENV: "test" }
        });
        assert.equal(resultado.status, 0, resultado.stderr);
    }
    ejecutar(`const pendiente = await logica.registrarUsuario(${JSON.stringify(email)}, 'clave-prueba');
        assert.equal(pendiente.activo, false);
        await assert.rejects(logica.iniciarSesion(pendiente.email, 'clave-prueba'));
        await logica.registrarUsuario(${JSON.stringify(adminEmail)}, 'clave-admin');
        await usuarios.updateOne({email: ${JSON.stringify(email)}}, {$set: {confirmado: true, rol: 'usuario'}});
        await usuarios.updateOne({email: ${JSON.stringify(adminEmail)}}, {$set: {confirmado: true, rol: 'administrador'}});
        await datos.guardarIntentoOAuth('oauth-' + pendiente.id, {tipo:'acceso', verifier:'prueba-persistida'}, Date.now()+60000);
        await datos.guardarIntentoOAuth('caducado-' + pendiente.id, {tipo:'acceso'}, Date.now()-1);`);
    ejecutar(`const usuario = await logica.iniciarSesion(${JSON.stringify(email)}, 'clave-prueba');
        const admin = await logica.iniciarSesion(${JSON.stringify(adminEmail)}, 'clave-admin');
        assert.equal(admin.rol, 'administrador');
        assert.equal(usuario.rol, 'cliente');
        const lecturas = await Promise.all([datos.leerIntentoOAuth('oauth-' + usuario.id, true), datos.leerIntentoOAuth('oauth-' + usuario.id, true)]);
        assert.equal(lecturas.filter(Boolean).length, 1);
        assert.equal(lecturas.find(Boolean).verifier, 'prueba-persistida');
        assert.equal(await datos.leerIntentoOAuth('caducado-' + usuario.id), undefined);
        assert.equal((await usuarios.findOne({id: usuario.id})).rol, 'cliente');
        await datos.asignarRol(usuario.id, 'conductor');
        assert.equal((await logica.obtenerPanel('conductor', usuario)).rol, 'conductor');
        await assert.rejects(logica.obtenerPanel('cliente', usuario), {estado: 403});
        await datos.asignarRol(usuario.id, 'cliente');
        const asignado = await logica.cambiarPerfilEquipo(usuario.id, 'conductor', admin);
        assert.equal(asignado.rol, 'conductor');
        const identidadGoogle = { sub: 'mongo-google-' + usuario.id, email: usuario.email, email_verified: true };
        await assert.rejects(logica.entrarGoogle(identidadGoogle), {estado: 409});
        await logica.vincularGoogle(identidadGoogle, usuario);
        assert.equal((await logica.entrarGoogle(identidadGoogle)).id, usuario.id);
        assert.equal((await logica.entrarGoogle(identidadGoogle)).rol, 'conductor');
        assert.equal(await datos.vincularGoogle(usuario.id, 'otra-google-' + usuario.id), false);
        assert.equal(await datos.vincularGoogle(admin.id, identidadGoogle.sub), false);
        await assert.rejects(logica.cambiarPerfilEquipo(admin.id, 'cliente', admin), {estado: 409});
        await manual.db().collection('rutas').insertMany([
            {id:'ruta-' + usuario.id, conductorId:usuario.id, referencia:'Propia', origen:'Yecla', destino:'Rubi', estado:'pendiente', secreto:'interno'},
            {id:'ruta-ajena-' + usuario.id, conductorId:admin.id, referencia:'Ajena'}
        ]);
        const rutas = await logica.consultarTransportes('rutas', usuario);
        assert.equal(rutas.length,1);
        assert.equal(rutas[0].referencia,'Propia');
        assert.equal(Object.hasOwn(rutas[0],'secreto'),false);
        await assert.rejects(logica.consultarTransportes('rutas', usuario, 'ruta-ajena-' + usuario.id), {estado:404});
        await logica.cambiarPerfilEquipo(usuario.id, 'cliente', admin);
        await assert.rejects(logica.consultarTransportes('rutas', usuario), {estado:403});
        const entrada = { fabricante:'Fabricante de Yecla', origen:'Yecla', fecha:'2099-12-15',
            destinatario:'Tienda destino',destino:'Calle Destino 10',localidadEntrega:'Rubí',codigoPostalEntrega:'08191',contactoEntrega:{nombre:'Eva',telefono:'623456789'},contactoRecogida:{nombre:'Ana',telefono:'612345678'},
            mobiliario:[{descripcion:'Sofá',cantidad:2,unidad:'unidades'}], observaciones:'Con ascensor' };
        const resultados = await Promise.all([logica.crearSolicitud(entrada,'mongo-envio-12345678',usuario),logica.crearSolicitud(entrada,'mongo-envio-12345678',usuario)]);
        assert.equal(resultados.filter(r=>r.creada).length,1);
        assert.equal(resultados[0].solicitud.id,resultados[1].solicitud.id);
        assert.equal(await manual.db().collection('solicitudes').countDocuments({clienteId:usuario.id,claveEnvio:'mongo-envio-12345678'}),1);
        await assert.rejects(logica.crearSolicitud({...entrada,fabricante:'Otro fabricante'},'mongo-envio-12345678',usuario),{estado:409});
        assert.equal((await logica.consultarTransportes('solicitudes',usuario)).length,1);
        assert.equal((await datos.buscarSolicitudEnvio(usuario.id,'mongo-envio-12345678')).mobiliario[0].cantidad,2);
        const idSolicitud = resultados[0].solicitud.id;
        const detallePropio = await logica.consultarTransportes('solicitudes', usuario, idSolicitud);
        assert.equal(detallePropio.contactoRecogida.nombre, entrada.contactoRecogida.nombre);
        assert.equal(detallePropio.clienteId, undefined);
        await assert.rejects(logica.cancelarSolicitud(idSolicitud, admin), {estado:403});
        const cancelaciones = await Promise.allSettled([logica.cancelarSolicitud(idSolicitud, usuario), logica.cancelarSolicitud(idSolicitud, usuario)]);
        assert.equal(cancelaciones.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(cancelaciones.find(r => r.status === 'rejected').reason.estado, 409);
        assert.equal(await manual.db().collection('solicitudes').countDocuments({id:idSolicitud}),1);
        const cancelada = await logica.consultarTransportes('solicitudes', usuario, idSolicitud);
        assert.equal(cancelada.estado,'cancelada');
        assert.equal(cancelada.historial.length,2);
        assert.equal(cancelada.historial[1].estadoAnterior,'pendiente_recogida');
        assert.equal((await datos.buscarSolicitudEnvio(usuario.id,'mongo-envio-12345678')).estado,'cancelada');
        const paraRevisar = (await logica.crearSolicitud(entrada,'mongo-p19-12345678',usuario)).solicitud;
        const motivo = '$estado: sin capacidad en la fecha solicitada';
        const revisiones = await Promise.allSettled([
            logica.revisarSolicitud(paraRevisar.id,{accion:'rechazar',revision:0,motivo},admin),
            logica.revisarSolicitud(paraRevisar.id,{accion:'rechazar',revision:0,motivo},admin)]);
        assert.equal(revisiones.filter(r=>r.status==='fulfilled').length,1);
        assert.equal(revisiones.find(r=>r.status==='rejected').reason.estado,409);
        const revisada = await logica.consultarTransportes('solicitudes',usuario,paraRevisar.id);
        assert.equal(revisada.motivoRechazo,motivo);
        assert.equal(revisada.historial.at(-1).motivo,motivo);
        assert.equal(revisada.historial.at(-1).responsableId,undefined);
        const filtradas = await logica.consultarSolicitudesAdministracion({estado:'rechazada',desde:entrada.fecha,hasta:entrada.fecha},admin);
        assert.ok(filtradas.some(s=>s.id===paraRevisar.id));
        assert.equal(await logica.comprobarUsuarioActivo(usuario.id, admin), true);
        assert.equal(Object.hasOwn((await logica.listarUsuarios(admin))[0], 'clave'), false);
        const intentos = await Promise.allSettled([logica.registrarUsuario(${JSON.stringify(duplicado)}, 'clave-prueba'),
            logica.registrarUsuario(${JSON.stringify(duplicado)}, 'clave-prueba')]);
        assert.equal(intentos.filter(r => r.status === 'fulfilled').length, 1);
        await assert.rejects(logica.listarUsuarios({...usuario, rol: 'administrador'}), {estado: 403});
        await assert.rejects(logica.eliminarUsuario(admin.id, usuario), {estado: 403});
        await logica.eliminarUsuario(usuario.id, admin);`);
    ejecutar(`await assert.rejects(logica.iniciarSesion(${JSON.stringify(email)}, 'clave-prueba'));
        await usuarios.updateOne({email: ${JSON.stringify(email)}}, {$set: {confirmado: true}});
        await assert.rejects(logica.iniciarSesion(${JSON.stringify(email)}, 'clave-prueba'));
        const admin = await logica.iniciarSesion(${JSON.stringify(adminEmail)}, 'clave-admin');
        const anterior = await datos.buscarPorEmail(${JSON.stringify(email)});
        assert.equal((await datos.buscarSolicitudEnvio(anterior.id,'mongo-envio-12345678')).observaciones,'Con ascensor');
        assert.equal((await datos.buscarSolicitudEnvio(anterior.id,'mongo-envio-12345678')).estado,'cancelada');
        assert.equal((await datos.buscarSolicitudEnvio(anterior.id,'mongo-envio-12345678')).historial.length,2);
        const revisada = await datos.buscarSolicitudEnvio(anterior.id,'mongo-p19-12345678');
        assert.equal(revisada.estado,'rechazada');
        assert.equal(revisada.baseConsolidacion,'Yecla');
        assert.equal(revisada.destino,'Calle Destino 10');
        assert.equal(revisada.historial.length,2);
        await logica.eliminarUsuario(admin.id, admin);`);
});
