const bcrypt = require("bcrypt");

const datos = require("./datos");

function publico(usuario) {
    return { id: usuario.id, email: usuario.email, activo: usuario.activo, rol: usuario.rol };
}
function errorAcceso(mensaje, estado) {
    const error = new Error(mensaje);
    error.estado = estado;
    return error;
}
async function usuarioAutorizado(actor) {
    const usuario = actor && await datos.buscarPorId(actor.id);
    if (!usuario?.activo) throw errorAcceso("Debes iniciar sesión", 401);
    return usuario;
}
async function exigirAdministrador(actor) {
    if ((await usuarioAutorizado(actor)).rol !== "administrador") throw errorAcceso("Esta operación requiere un administrador", 403);
}

function normalizarEmail(email) {
    if (typeof email !== "string") throw new Error("EMAIL_INVALIDO");
    const normalizado = email.trim().toLowerCase();
    const partes = normalizado.split("@");
    const dominio = partes[1];
    if (partes.length !== 2 || !partes[0] || !dominio || /\s/.test(normalizado) ||
        !dominio.includes(".") || dominio.startsWith(".") || dominio.endsWith(".")) {
        throw new Error("EMAIL_INVALIDO");
    }
    return normalizado;
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
    const usuarioExistente = await datos.buscarPorEmail(email);

    if (usuarioExistente) {
        throw new Error("Ya existe un usuario con ese email");
    }

    const claveHash = await bcrypt.hash(clave, 10);

    const usuario = await datos.crear(email, claveHash);

    return publico(usuario);
}

async function iniciarSesion(email, clave) {
    if (!email || !clave) {
        throw new Error("Email y clave son obligatorios");
    }

    email = normalizarEmail(email);
    validarClave(clave);
    const usuario = await datos.buscarPorEmail(email);

    if (!usuario || usuario.eliminado) {
        throw new Error("Credenciales incorrectas");
    }

    const claveCorrecta = await bcrypt.compare(
        clave,
        usuario.clave
    );

    if (!claveCorrecta) {
        throw new Error("Credenciales incorrectas");
    }

    if (!usuario.activo) throw new Error("Cuenta pendiente de confirmación");

    return publico(usuario);
}

async function listarUsuarios(actor) {
    await exigirAdministrador(actor);
    return (await datos.listar()).map(publico);
}

async function obtenerUsuarioSesion(id) {
    const usuario = await datos.buscarPorId(id);
    if (!usuario || !usuario.activo) throw new Error("Sesión no válida");
    return publico(usuario);
}

async function comprobarUsuarioActivo(id, actor) {
    await exigirAdministrador(actor);
    const usuario = await datos.buscarPorId(id);

    if (!usuario) {
        throw new Error("Usuario no encontrado");
    }

    return usuario.activo;
}

async function eliminarUsuario(id, actor) {
    const solicitante = await usuarioAutorizado(actor);
    if (solicitante.rol !== "administrador" && solicitante.id !== Number(id)) {
        throw errorAcceso("Solo puedes eliminar tu propia cuenta", 403);
    }
    const usuario = await datos.desactivar(id);

    return publico(usuario);
}

async function limpiarUsuarios() {
    await datos.limpiar();
}

module.exports = {
    normalizarEmail,
    registrarUsuario,
    iniciarSesion,
    obtenerUsuarioSesion,
    listarUsuarios,
    comprobarUsuarioActivo,
    eliminarUsuario,
    limpiarUsuarios
};
