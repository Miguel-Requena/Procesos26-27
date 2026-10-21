const test = require("node:test");
const assert = require("node:assert/strict");
const logica = require("./logica");
const datos = require("./datos");
test.beforeEach(() => logica.limpiarUsuarios());

test("el registro queda pendiente y una cuenta sin confirmar no puede entrar", async () => {
    const cuenta = await logica.registrarUsuario("admin@example.com", "clave-prueba");
    assert.equal(cuenta.activo, false);
    assert.equal(cuenta.rol, "usuario");
    await assert.rejects(logica.iniciarSesion(cuenta.email, "clave-prueba"), { message: "Cuenta pendiente de confirmación" });
    await datos.configurarCuentaPrueba(cuenta.id, false, "administrador");
    await assert.rejects(logica.iniciarSesion(cuenta.email, "clave-prueba"), { message: "Cuenta pendiente de confirmación" });
    await assert.rejects(logica.listarUsuarios(cuenta), { estado: 401 });
    await datos.configurarCuentaPrueba(cuenta.id, true, "administrador");
    const admin = await logica.iniciarSesion(cuenta.email, "clave-prueba");
    assert.equal(admin.rol, "administrador");
    assert.equal((await logica.listarUsuarios(admin)).length, 1);
});

test("revocar confirmación o rol se aplica a una sesión existente, y confirmar no restaura una cuenta eliminada", async () => {
    const cuenta = await logica.registrarUsuario("admin@example.com", "clave-prueba");
    await datos.configurarCuentaPrueba(cuenta.id, true, "administrador");
    const admin = await logica.iniciarSesion(cuenta.email, "clave-prueba");
    await datos.configurarCuentaPrueba(admin.id, true, "usuario");
    await assert.rejects(logica.listarUsuarios(admin), { estado: 403 });
    await datos.configurarCuentaPrueba(admin.id, false, "administrador");
    await assert.rejects(logica.obtenerUsuarioSesion(admin.id));
    await datos.configurarCuentaPrueba(admin.id, true, "administrador");
    await logica.eliminarUsuario(admin.id, admin);
    await datos.configurarCuentaPrueba(admin.id, true, "administrador");
    await assert.rejects(logica.iniciarSesion(admin.email, "clave-prueba"), { message: "Credenciales incorrectas" });
});
