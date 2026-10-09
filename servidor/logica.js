const bcrypt = require("bcrypt");

const datos = require("./datos");

function normalizarEmail(email) {
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new Error("Introduce un email válido");
    }
    return email.trim().toLowerCase();
}

function validarClave(clave) {
    if (typeof clave !== "string" || clave.length < 6 || Buffer.byteLength(clave, "utf8") > 72) {
        throw new Error("La clave debe tener al menos 6 caracteres y como máximo 72 bytes");
    }
}

async function registrarUsuario(email, clave) {
    if (!email || !clave) {
        throw new Error("Email y clave son obligatorios");
    }

    email = normalizarEmail(email);
    validarClave(clave);
    const usuarioExistente = datos.buscarPorEmail(email);

    if (usuarioExistente) {
        throw new Error("Ya existe un usuario con ese email");
    }

    const claveHash = await bcrypt.hash(clave, 10);

    const usuario = datos.crear(email, claveHash);

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

    email = normalizarEmail(email);
    validarClave(clave);
    const usuario = datos.buscarPorEmail(email);

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
    return datos.listar().map(usuario => ({
        id: usuario.id,
        email: usuario.email,
        activo: usuario.activo
    }));
}

function obtenerUsuarioSesion(id) {
    const usuario = datos.buscarPorId(id);
    if (!usuario || !usuario.activo) throw new Error("Sesión no válida");
    return { id: usuario.id, email: usuario.email, activo: usuario.activo };
}

function comprobarUsuarioActivo(id) {
    const usuario = datos.buscarPorId(id);

    if (!usuario) {
        throw new Error("Usuario no encontrado");
    }

    return usuario.activo;
}

function eliminarUsuario(id) {
    const usuario = datos.desactivar(id);

    return {
        id: usuario.id,
        email: usuario.email,
        activo: usuario.activo
    };
}

function limpiarUsuarios() {
    datos.limpiar();
}

module.exports = {
    registrarUsuario,
    iniciarSesion,
    obtenerUsuarioSesion,
    listarUsuarios,
    comprobarUsuarioActivo,
    eliminarUsuario,
    limpiarUsuarios
};
