const logica = require("./logica");
const datos = require("./datos");
async function registrarConfirmado(email, clave, rol = "usuario") {
    const usuario = await logica.registrarUsuario(email, clave);
    await datos.configurarCuentaPrueba(usuario.id, true, rol);
    return logica.obtenerUsuarioSesion(usuario.id);
}
function administrador(email, clave) { return registrarConfirmado(email, clave, "administrador"); }
module.exports = { registrarConfirmado, administrador };
