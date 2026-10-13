const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const datos = require("./datos");

const {
    registrarUsuario,
    iniciarSesion,
    listarUsuarios,
    comprobarUsuarioActivo,
    eliminarUsuario,
    limpiarUsuarios
} = require("./logica");

test.beforeEach(() => {
    limpiarUsuarios();
});

test("guarda un hash bcrypt y permite login con el email normalizado", async () => {
    await registrarUsuario(" Ana@Example.com ", "secreto");
    const almacenado = datos.buscarPorEmail("ana@example.com");
    assert.notEqual(almacenado.clave, "secreto");
    assert.equal(await bcrypt.compare("secreto", almacenado.clave), true);
    const usuario = await iniciarSesion("ANA@example.com", "secreto");
    assert.equal(usuario.email, "ana@example.com");
    assert.equal(Object.hasOwn(usuario, "clave"), false);
});

test("rechaza datos inválidos, clave incorrecta y login de cuentas eliminadas", async () => {
    await assert.rejects(registrarUsuario("sin-arroba", "secreto"));
    await assert.rejects(registrarUsuario("ana@example.com", "abc"));
    await assert.rejects(registrarUsuario("ana@example.com", "á".repeat(37)));
    await assert.rejects(registrarUsuario({}, "secreto"));
    await registrarUsuario("ana@example.com", "secreto");
    await assert.rejects(iniciarSesion("ana@example.com", "incorrecta"));
    eliminarUsuario(1);
    await assert.rejects(iniciarSesion("ana@example.com", "secreto"));
});

test("dos registros concurrentes del mismo email solo crean una cuenta", async () => {
    const resultados = await Promise.allSettled([
        registrarUsuario("ana@example.com", "secreto"),
        registrarUsuario("ANA@example.com", "secreto")
    ]);
    assert.equal(resultados.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(listarUsuarios().length, 1);
});

test("registra y lista usuarios sin exponer la clave", async () => {
    const usuario = await registrarUsuario("ana@example.com", "secreto");

    assert.deepEqual(usuario, {
        id: 1,
        email: "ana@example.com",
        activo: true
    });
    assert.deepEqual(listarUsuarios(), [usuario]);
    assert.equal(Object.hasOwn(usuario, "clave"), false);
});

test("comprueba el estado activo y lo cambia al eliminar", async () => {
    const usuario = await registrarUsuario("bruno@example.com", "secreto");

    assert.equal(comprobarUsuarioActivo(usuario.id), true);
    const eliminado = eliminarUsuario(usuario.id);
    assert.equal(eliminado.activo, false);
    assert.equal(comprobarUsuarioActivo(usuario.id), false);
});

test("rechaza usuarios duplicados y usuarios inexistentes", async () => {
    await registrarUsuario("carmen@example.com", "secreto");

    await assert.rejects(
        registrarUsuario("carmen@example.com", "otra-clave"),
        { message: "Ya existe un usuario con ese email" }
    );
    assert.throws(
        () => comprobarUsuarioActivo(999),
        { message: "Usuario no encontrado" }
    );
    assert.throws(
        () => eliminarUsuario(999),
        { message: "Usuario no encontrado" }
    );
});
