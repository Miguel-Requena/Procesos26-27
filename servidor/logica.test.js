const test = require("node:test");
const assert = require("node:assert/strict");

const {
    registrarUsuario,
    listarUsuarios,
    comprobarUsuarioActivo,
    eliminarUsuario,
    limpiarUsuarios
} = require("./logica");

test.beforeEach(() => {
    limpiarUsuarios();
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
