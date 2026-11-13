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
    if (!usuario?.activo || !["cliente", "conductor", "administrador"].includes(usuario.rol)) throw errorAcceso("Debes iniciar sesión", 401);
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

    if (!usuario || usuario.eliminado || !usuario.clave) {
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
async function entrarGoogle(perfil) {
    if (!perfil || perfil.email_verified !== true || typeof perfil.sub !== "string" || !perfil.sub) throw errorAcceso("Google no ha verificado tu correo", 401);
    let usuario = await datos.buscarGoogle(perfil.sub);
    if (!usuario) {
        const email = normalizarEmail(perfil.email);
        // No se vinculan cuentas existentes solo por coincidencia de correo.
        const existente = await datos.buscarPorEmail(email);
        if (existente && !existente.activo) throw errorAcceso("Cuenta no disponible", 403);
        if (existente) throw errorAcceso("Ya existe esa cuenta. Accede con tu contraseña para vincular Google.", 409);
        usuario = await datos.crear(email, "", true);
        await datos.vincularGoogle(usuario.id, perfil.sub);
    }
    if (!usuario.activo) throw errorAcceso("Cuenta no disponible", 403);
    return publico(usuario);
}

async function vincularGoogle(perfil, actor) {
    const usuario = await usuarioAutorizado(actor);
    if (perfil?.email_verified !== true || typeof perfil.sub !== "string" || !perfil.sub || normalizarEmail(perfil.email) !== usuario.email) {
        throw errorAcceso("Utiliza la contraseña de la cuenta que tiene el mismo correo que Google.", 409);
    }
    const identidad = await datos.buscarGoogle(perfil.sub);
    if (identidad && identidad.id !== usuario.id) throw errorAcceso("Esta identidad de Google ya está vinculada a otra cuenta.", 409);
    if (!await datos.vincularGoogle(usuario.id, perfil.sub)) throw errorAcceso("La cuenta ya tiene otra identidad de Google vinculada.", 409);
    return publico(usuario);
}

async function obtenerPanel(rol, actor) {
    const usuario = await usuarioAutorizado(actor);
    if (usuario.rol !== rol) throw errorAcceso("No tienes permiso para acceder a este panel", 403);
    return { usuario: publico(usuario), rol };
}

async function cambiarPerfilEquipo(id, rol, actor) {
    await exigirAdministrador(actor);
    if (!["cliente", "conductor"].includes(rol)) throw errorAcceso("Solo se permite habilitar conductores o devolverlos a cliente", 400);
    if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) throw errorAcceso("Usuario no encontrado", 404);
    const usuario = await datos.asignarPerfilEquipo(Number(id), rol);
    if (!usuario) throw errorAcceso("La cuenta debe estar confirmada, disponible y no ser de administración", 409);
    return publico(usuario);
}
async function consultarTransportes(tipo, actor, id) {
    const usuario = await usuarioAutorizado(actor);
    const rol = tipo === "solicitudes" ? "cliente" : tipo === "rutas" ? "conductor" : undefined;
    if (!rol || ![rol, "administrador"].includes(usuario.rol)) throw errorAcceso("No tienes permiso para consultar estos registros", 403);
    if (id !== undefined && (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(id))) throw errorAcceso("Registro no encontrado", 404);
    if (tipo === "solicitudes" && id !== undefined && usuario.rol === "cliente") {
        const solicitud = await datos.detalleSolicitud(usuario.id, id);
        if (!solicitud) throw errorAcceso("Registro no encontrado", 404);
        return require("./solicitudes").publica(solicitud);
    }
    const registros = await datos.consultarTransportes(tipo, usuario.rol === "administrador" ? undefined : usuario.id, id);
    if (id !== undefined && !registros.length) throw errorAcceso("Registro no encontrado", 404);
    return id === undefined ? registros : registros[0];
}

async function consultarSolicitudesAdministracion(filtros, actor, id) {
    await exigirAdministrador(actor);
    if (id !== undefined) {
        if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw errorAcceso("Registro no encontrado", 404);
        const registro = await datos.detalleSolicitud(undefined, id);
        if (!registro) throw errorAcceso("Registro no encontrado", 404);
        return require("./solicitudes").publica(registro, true);
    }
    return datos.listarSolicitudesAdministracion(require("./solicitudes").filtrosAdministracion(filtros));
}
async function revisarSolicitud(id, entrada, actor) {
    await exigirAdministrador(actor);
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw errorAcceso("Registro no encontrado", 404);
    const cambio = require("./solicitudes").revisionAdministrativa(entrada);
    if (!await datos.detalleSolicitud(undefined, id)) throw errorAcceso("Registro no encontrado", 404);
    const registro = await datos.revisarSolicitud(id, cambio, actor.id, new Date().toISOString());
    if (!registro) throw errorAcceso("La solicitud ha cambiado o su estado no permite esta acción. Actualiza el detalle antes de continuar.", 409);
    return require("./solicitudes").publica(registro, true);
}

async function listarUsuarios(actor) {
    await exigirAdministrador(actor);
    return (await datos.listar()).map(publico);
}
async function cancelarSolicitud(id, actor) {
    const usuario = await usuarioAutorizado(actor);
    if (usuario.rol !== "cliente") throw errorAcceso("Solo el cliente propietario puede cancelar una solicitud", 403);
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw errorAcceso("Registro no encontrado", 404);
    if (!await datos.detalleSolicitud(usuario.id, id)) throw errorAcceso("Registro no encontrado", 404);
    const solicitud = await datos.cancelarSolicitud(usuario.id, id, new Date().toISOString());
    if (!solicitud) throw errorAcceso("Solo se pueden cancelar solicitudes pendientes. Actualiza el detalle para consultar su estado actual.", 409);
    return require("./solicitudes").publica(solicitud);
}

async function obtenerUsuarioSesion(id) {
    const usuario = await usuarioAutorizado({ id });
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

async function crearSolicitud(entrada, claveEnvio, actor) {
    const usuario = await usuarioAutorizado(actor);
    if (usuario.rol !== "cliente") throw errorAcceso("Solo los clientes pueden crear solicitudes", 403);
    if (typeof claveEnvio !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(claveEnvio)) throw errorAcceso("Falta una clave de envío válida", 400);
    const contrato = require("./solicitudes");
    const contenido = contrato.validarSolicitud(entrada);
    const firma = contrato.huella(contenido);
    const existente = await datos.buscarSolicitudEnvio(usuario.id, claveEnvio);
    if (existente) {
        const resultado = contrato.comprobarReintento(existente, firma);
        return { solicitud: contrato.publica(resultado.registro), creada: false };
    }
    if (contenido.fecha < contrato.hoyMadrid()) throw errorAcceso("La fecha solicitada no puede ser anterior a hoy", 400);
    const id = require("node:crypto").randomUUID();
    const registro = { ...contenido, localidadRecogida: "Yecla", baseConsolidacion: "Yecla", id, referencia: `TD-${id.slice(0, 8).toUpperCase()}`, clienteId: usuario.id,
        estado: "pendiente_recogida", creadaEn: new Date().toISOString(), claveEnvio, huella: firma };
    registro.historial = [{ estado: registro.estado, fecha: registro.creadaEn }];
    const resultado = await datos.crearSolicitud(registro);
    return { solicitud: contrato.publica(resultado.registro), creada: resultado.creada };
}

async function gestionarRecursos(tipo, actor, entrada, id, asignables = false) {
    await exigirAdministrador(actor);
    if (!["vehiculos","conductores"].includes(tipo)) throw errorAcceso("Recurso inválido",400);
    const registros = await datos.listarRecursos(tipo);
    const cuentas = tipo === "conductores" ? await datos.listar() : [];
    const habilitado = r => r.activo && r.disponible && (tipo !== "conductores" || cuentas.some(u=>u.id===r.usuarioId && u.activo && u.rol==="conductor"));
    if (entrada === undefined) return registros.filter(r=>!asignables || habilitado(r)).map(r=>({...r,asignable:habilitado(r)}));
    if (!entrada || typeof entrada!=="object" || Array.isArray(entrada)) throw errorAcceso("Datos inválidos",400);
    const anterior = id === undefined ? undefined : registros.find(r=>r.id===id);
    if (id !== undefined && !anterior) throw errorAcceso("Recurso no encontrado",404);
    if (anterior && entrada.revision !== anterior.revision) throw errorAcceso("El recurso ha cambiado. Actualiza antes de guardar.",409);
    const texto = (campo,max=100) => { const v=entrada[campo]; if(typeof v!=="string" || !v.trim() || v.trim().length>max) throw errorAcceso(`Falta un valor válido para ${campo}`,400); return v.trim(); };
    for(const campo of ["activo","disponible"]) if(typeof entrada[campo]!=="boolean") throw errorAcceso(`Valor inválido para ${campo}`,400);
    const registro = {id:anterior?.id || require("node:crypto").randomUUID(),tipo,sede:texto("sede"),activo:entrada.activo,disponible:entrada.disponible,revision:(anterior?.revision ?? -1)+1};
    if(tipo === "vehiculos") {
        registro.matricula=texto("matricula",20).toUpperCase().replace(/[\s-]/g,"");
        if(!/^[A-Z0-9]{4,15}$/.test(registro.matricula)) throw errorAcceso("Matrícula inválida",400);
        registro.tipoVehiculo=texto("tipoVehiculo");
        if(typeof entrada.capacidad!=="number" || !Number.isFinite(entrada.capacidad) || entrada.capacidad<=0 || entrada.capacidad>1000000) throw errorAcceso("La capacidad debe ser mayor que cero",400);
        registro.capacidad=entrada.capacidad; registro.unidadCapacidad=texto("unidadCapacidad",20); registro.clave=registro.matricula;
    } else {
        if(!Number.isSafeInteger(entrada.usuarioId) || !(cuentas.some(u=>u.id===entrada.usuarioId && u.activo && u.rol==="conductor") || (anterior?.usuarioId===entrada.usuarioId && entrada.activo===false))) throw errorAcceso("Selecciona una cuenta activa con rol conductor",400);
        registro.usuarioId=entrada.usuarioId; registro.clave=String(registro.usuarioId);
    }
    registro.historial=[...(anterior?.historial || []),{fecha:new Date().toISOString(),responsableId:actor.id,accion:anterior ? "actualizacion" : "alta",activo:registro.activo,disponible:registro.disponible}];
    const guardado=await datos.guardarRecurso(registro,anterior?.revision);
    if(!guardado) throw errorAcceso("El recurso ha cambiado. Actualiza antes de guardar.",409);
    return guardado;
}

async function planificarRuta(entrada, actor) {
    await exigirAdministrador(actor);
    return datos.planificarRuta(require("./rutas").validar(entrada),actor.id);
}
async function consultarRutaAdministracion(id, actor) {
    await exigirAdministrador(actor);
    if(typeof id!=="string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw errorAcceso("Ruta no encontrada",404);
    const ruta=await datos.detalleRuta(id);
    if(!ruta) throw errorAcceso("Ruta no encontrada",404);
    return ruta;
}
module.exports = { planificarRuta, consultarRutaAdministracion, gestionarRecursos, consultarSolicitudesAdministracion, revisarSolicitud,
    cancelarSolicitud,
    crearSolicitud,
    cambiarPerfilEquipo, consultarTransportes,
    obtenerPanel,
    entrarGoogle,
    vincularGoogle,
    normalizarEmail,
    registrarUsuario,
    iniciarSesion,
    obtenerUsuarioSesion,
    listarUsuarios,
    comprobarUsuarioActivo,
    eliminarUsuario,
    limpiarUsuarios
};
