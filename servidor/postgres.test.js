const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

// Solo CI proporciona una base PostgreSQL desechable; nunca se lee el .env real.
test("PostgreSQL conserva cuentas entre procesos y aplica las mismas reglas de permisos", {
    skip: !process.env.POSTGRES_TEST_URL, timeout: 60000
}, () => {
    const email = `persistencia-${Date.now()}@example.com`;
    const adminEmail = `admin-${Date.now()}@example.com`;
    function ejecutar(codigo) {
        const resultado = spawnSync(process.execPath, ["-e", `(async () => {
            const assert = require('node:assert/strict');
            const logica = require('./logica');
            const datos = require('./datos');
            try { ${codigo} } finally { await datos.cerrar(); }
        })().catch(() => { console.error('Falló la comprobación PostgreSQL'); process.exitCode = 1; })`], {
            cwd: __dirname, timeout: 25000, encoding: "utf8",
            env: { ...process.env, DATABASE_URL: process.env.POSTGRES_TEST_URL, NODE_ENV: "test" }
        });
        assert.equal(resultado.status, 0, resultado.stderr);
    }
    ejecutar(`await logica.registrarUsuario(${JSON.stringify(email)}, 'clave-prueba');
        await logica.inicializarAdministrador(${JSON.stringify(adminEmail)}, 'clave-admin');`);
    ejecutar(`const usuario = await logica.iniciarSesion(${JSON.stringify(email)}, 'clave-prueba');
        const admin = await logica.iniciarSesion(${JSON.stringify(adminEmail)}, 'clave-admin');
        assert.equal(usuario.rol, 'usuario');
        assert.equal(admin.rol, 'administrador');
        await assert.rejects(logica.registrarUsuario(usuario.email, 'clave-prueba'));
        await assert.rejects(logica.listarUsuarios(usuario), { estado: 403 });
        await assert.rejects(logica.eliminarUsuario(admin.id, usuario), { estado: 403 });
        assert.equal(await logica.comprobarUsuarioActivo(usuario.id, admin), true);
        assert.equal(Object.hasOwn((await logica.listarUsuarios(admin))[0], 'clave'), false);
        await logica.eliminarUsuario(usuario.id, admin);`);
    ejecutar(`await assert.rejects(logica.iniciarSesion(${JSON.stringify(email)}, 'clave-prueba'));
        const admin = await logica.iniciarSesion(${JSON.stringify(adminEmail)}, 'clave-admin');
        await logica.eliminarUsuario(admin.id, admin);`);
});
