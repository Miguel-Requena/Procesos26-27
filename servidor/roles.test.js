const test = require("node:test");
const assert = require("node:assert/strict");
const logica = require("./logica");
const datos = require("./datos");
test.beforeEach(() => logica.limpiarUsuarios());
test("un usuario normal no puede listar, consultar estados ni eliminar otra cuenta, aunque falsifique su rol", async () => {
    const ana = await logica.registrarUsuario("ana@example.com", "secreto");
    const otro = await logica.registrarUsuario("otro@example.com", "secreto");
    assert.equal(ana.rol, "usuario");
    const falsoAdmin = { ...ana, rol: "administrador" };
    await assert.rejects(() => logica.listarUsuarios(falsoAdmin), { estado: 403 });
    await assert.rejects(() => logica.comprobarUsuarioActivo(ana.id, falsoAdmin), { estado: 403 });
    await assert.rejects(() => logica.eliminarUsuario(otro.id, falsoAdmin), { estado: 403 });
    assert.equal((await datos.buscarPorId(otro.id)).activo, true);
    assert.equal((await logica.eliminarUsuario(ana.id, ana)).activo, false);
    await assert.rejects(logica.iniciarSesion(ana.email, "secreto"));
});
test("el administrador lista email, rol y estado, consulta y elimina cualquier cuenta", async () => {
    const admin = await logica.inicializarAdministrador("admin@example.com", "clave-admin");
    const otro = await logica.registrarUsuario("otro@example.com", "secreto");
    const usuarios = await logica.listarUsuarios(admin);
    assert.equal(usuarios.length, 2);
    assert.deepEqual(Object.keys(usuarios[0]).sort(), ["activo", "email", "id", "rol"]);
    assert.equal(await logica.comprobarUsuarioActivo(otro.id, admin), true);
    await logica.eliminarUsuario(otro.id, admin);
    assert.equal(await logica.comprobarUsuarioActivo(otro.id, admin), false);
    assert.equal((await logica.eliminarUsuario(admin.id, admin)).activo, false);
    await assert.rejects(() => logica.listarUsuarios(admin), { estado: 401 });
});
test("inicializar admin es idempotente y no promociona cuentas normales ni cambia contraseñas existentes", async () => {
    const admin = await logica.inicializarAdministrador("admin@example.com", "clave-admin");
    assert.deepEqual(await logica.inicializarAdministrador(admin.email, "otra-clave"), admin);
    await logica.iniciarSesion(admin.email, "clave-admin");
    await assert.rejects(logica.iniciarSesion(admin.email, "otra-clave"));
    await logica.registrarUsuario("normal@example.com", "secreto");
    await assert.rejects(logica.inicializarAdministrador("normal@example.com", "secreto"));
});
