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
        await usuarios.updateOne({email: ${JSON.stringify(adminEmail)}}, {$set: {confirmado: true, rol: 'administrador'}});`);
    ejecutar(`const usuario = await logica.iniciarSesion(${JSON.stringify(email)}, 'clave-prueba');
        const admin = await logica.iniciarSesion(${JSON.stringify(adminEmail)}, 'clave-admin');
        assert.equal(admin.rol, 'administrador');
        assert.equal(usuario.rol, 'cliente');
        assert.equal((await usuarios.findOne({id: usuario.id})).rol, 'cliente');
        await datos.asignarRol(usuario.id, 'conductor');
        assert.equal((await logica.obtenerPanel('conductor', usuario)).rol, 'conductor');
        await assert.rejects(logica.obtenerPanel('cliente', usuario), {estado: 403});
        await datos.asignarRol(usuario.id, 'cliente');
        const asignado = await logica.cambiarPerfilEquipo(usuario.id, 'conductor', admin);
        assert.equal(asignado.rol, 'conductor');
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
        await logica.eliminarUsuario(admin.id, admin);`);
});
