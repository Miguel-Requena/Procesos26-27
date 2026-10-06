const bcrypt = require("bcrypt");

const usuarios = [];

async function registrarUsuario(email, clave) {
    if (!email || !clave) {
        throw new Error("Email y clave son obligatorios");
    }

    const usuarioExistente = usuarios.find(
        usuario => usuario.email === email
    );

    if (usuarioExistente) {
        throw new Error("Ya existe un usuario con ese email");
    }

    const claveHash = await bcrypt.hash(clave, 10);

    const usuario = {
        id: usuarios.length + 1,
        email: email,
        clave: claveHash
    };

    usuarios.push(usuario);

    return {
        id: usuario.id,
        email: usuario.email
    };
}

async function iniciarSesion(email, clave) {
    if (!email || !clave) {
        throw new Error("Email y clave son obligatorios");
    }

    const usuario = usuarios.find(
        usuario => usuario.email === email
    );

    if (!usuario) {
        throw new Error("Credenciales incorrectas");
    }

    const claveCorrecta = await bcrypt.compare(
        clave,
        usuario.clave
    );

    if (!claveCorrecta) {
        throw new Error("Credenciales incorrectas");
    }

    return {
        id: usuario.id,
        email: usuario.email
    };
}

module.exports = {
    registrarUsuario,
    iniciarSesion
};