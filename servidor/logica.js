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
function usuarioAutorizado(actor) {
    const usuario = actor && datos.buscarPorId(actor.id);
    if (!usuario?.activo) throw errorAcceso("Debes iniciar sesión", 401);
    return usuario;
}
function exigirAdministrador(actor) {
    if (usuarioAutorizado(actor).rol !== "administrador") throw errorAcceso("Esta operación requiere un administrador", 403);
}

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

    return publico(usuario);
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

    return publico(usuario);
}

function listarUsuarios(actor) {
    exigirAdministrador(actor);
    return datos.listar().map(publico);
}

function obtenerUsuarioSesion(id) {
    const usuario = datos.buscarPorId(id);
    if (!usuario || !usuario.activo) throw new Error("Sesión no válida");
    return publico(usuario);
}

function comprobarUsuarioActivo(id, actor) {
    exigirAdministrador(actor);
    const usuario = datos.buscarPorId(id);

    if (!usuario) {
        throw new Error("Usuario no encontrado");
    }

    return usuario.activo;
}

function eliminarUsuario(id, actor) {
    const solicitante = usuarioAutorizado(actor);
    if (solicitante.rol !== "administrador" && solicitante.id !== Number(id)) {
        throw errorAcceso("Solo puedes eliminar tu propia cuenta", 403);
    }
    const usuario = datos.desactivar(id);

    return publico(usuario);
}

async function inicializarAdministrador(email, clave) {
    email = normalizarEmail(email);
    const existente = datos.buscarPorEmail(email);
    if (existente && (!existente.activo || existente.rol !== "administrador")) {
        throw new Error("El email ya pertenece a otra cuenta; no se promociona automáticamente");
    }
    if (existente) return publico(existente);
    const nuevo = await registrarUsuario(email, clave);
    return publico(datos.promoverAdministrador(nuevo.id));
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
    limpiarUsuarios,
    inicializarAdministrador
};
