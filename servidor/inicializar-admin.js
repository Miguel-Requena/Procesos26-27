require("./configuracion");
const logica = require("./logica");
async function ejecutar() {
    const { ADMIN_EMAIL, ADMIN_CLAVE } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_CLAVE) throw new Error("Configura ADMIN_EMAIL y ADMIN_CLAVE en el entorno o en .env");
    const admin = await logica.inicializarAdministrador(ADMIN_EMAIL, ADMIN_CLAVE);
    require("./actividad").registrar("administrador_inicializado", { usuarioId: admin.id });
    console.log("Administrador inicializado. Las credenciales no se muestran ni se guardan en código.");
}
ejecutar().catch(() => {
    console.error("No se pudo inicializar el administrador. Comprueba las variables y que el email no pertenezca a un usuario normal o eliminado.");
    process.exitCode = 1;
});
