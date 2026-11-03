const datos = require("./datos");
const { normalizarEmail } = require("./logica");

async function main() {
    const [email, rol, ...extra] = process.argv.slice(2);
    if (extra.length || !email || !["cliente", "conductor", "administrador"].includes(rol)) {
        throw new Error("Uso: node servidor/asignar-perfil.js correo perfil (cliente, conductor o administrador)");
    }
    const usuario = await datos.buscarPorEmail(normalizarEmail(email));
    if (!usuario?.activo) throw new Error("La cuenta debe existir, estar confirmada y no estar eliminada");
    await datos.asignarRol(usuario.id, rol);
    console.log(`Perfil actualizado: ${rol}. Se aplicará también a las sesiones abiertas.`);
}
main().catch(error => {
    console.error(error.estado === 503 ? "Base de datos no disponible. Revisa la configuración." : error.message);
    process.exitCode = 1;
}).finally(() => datos.cerrar());
