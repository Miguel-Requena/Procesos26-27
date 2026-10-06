const bcrypt = require("bcrypt");

const usuarios = [];
let siguienteId = 1;

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
        id: siguienteId++,
        email: email,
        clave: claveHash,
        activo: true
    };

    usuarios.push(usuario);

    return {
        id: usuario.id,
        email: usuario.email,
        activo: usuario.activo
    };
}

async function iniciarSesion(email, clave) {
    if (!email || !clave) {
        throw new Error("Email y clave son obligatorios");
    }

    const usuario = usuarios.find(
        usuario => usuario.email === email
    );

    if (!usuario || !usuario.activo) {
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
        email: usuario.email,
        activo: usuario.activo
    };
}

function listarUsuarios() {
    return usuarios.map(usuario => ({
        id: usuario.id,
        email: usuario.email,
        activo: usuario.activo
    }));
}

function comprobarUsuarioActivo(id) {
    const usuario = usuarios.find(usuario => usuario.id === Number(id));

    if (!usuario) {
        throw new Error("Usuario no encontrado");
    }

    return usuario.activo;
}

function eliminarUsuario(id) {
    const usuario = usuarios.find(usuario => usuario.id === Number(id));

    if (!usuario) {
        throw new Error("Usuario no encontrado");
    }

    usuario.activo = false;

    return {
        id: usuario.id,
        email: usuario.email,
        activo: usuario.activo
    };
}

function limpiarUsuarios() {
    usuarios.length = 0;
    siguienteId = 1;
}

module.exports = {
    registrarUsuario,
    iniciarSesion,
    listarUsuarios,
    comprobarUsuarioActivo,
    eliminarUsuario,
    limpiarUsuarios
};