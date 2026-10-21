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
        await usuarios.updateOne({email: ${JSON.stringify(email)}}, {$set: {confirmado: true}});
        await usuarios.updateOne({email: ${JSON.stringify(adminEmail)}}, {$set: {confirmado: true, rol: 'administrador'}});`);
    ejecutar(`const usuario = await logica.iniciarSesion(${JSON.stringify(email)}, 'clave-prueba');
        const admin = await logica.iniciarSesion(${JSON.stringify(adminEmail)}, 'clave-admin');
        assert.equal(admin.rol, 'administrador');
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
