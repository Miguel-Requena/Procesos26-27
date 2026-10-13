const configuracion = require("./configuracion");
const datos = require("./datos");
const actividad = require("./actividad");
async function arrancar() {
    // Comprueba el almacenamiento antes de aceptar peticiones.
    await datos.listar();
    const app = require("./api");
    app.listen(configuracion.puerto, "0.0.0.0", () => {
        actividad.registrar("servidor_iniciado", { puerto: configuracion.puerto });
        console.log(`Servidor ejecutándose en el puerto ${configuracion.puerto}`);
    });
}
arrancar().catch(async error => {
    console.error("No se pudo iniciar el servidor. Revisa la conexión y las variables de entorno.");
    if (error.codigo) console.error("Diagnóstico de conexión:", error.codigo);
    await datos.cerrar();
    process.exitCode = 1;
});
