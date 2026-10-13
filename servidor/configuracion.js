const fs = require("node:fs");
const path = require("node:path");

const archivo = path.join(__dirname, "..", ".env");
if (process.env.NODE_ENV !== "test" && fs.existsSync(archivo)) process.loadEnvFile(archivo);
const puerto = Number(process.env.PORT || 3000);
if (!Number.isInteger(puerto) || puerto < 0 || puerto > 65535) throw new Error("PORT debe ser un puerto válido");
const rutaBaseDatos = process.env.DATABASE_PATH || path.join(__dirname, "almacenamiento", "usuarios.sqlite");
const urlBaseDatos = process.env.DATABASE_URL || "";
if (urlBaseDatos) {
    try {
        const conexion = new URL(urlBaseDatos);
        if (!["mongodb:", "mongodb+srv:"].includes(conexion.protocol)) throw new Error();
        if (!conexion.pathname || conexion.pathname === "/") throw new Error();
        if (process.env.NODE_ENV === "production" &&
            (conexion.searchParams.get("tls") === "false" || conexion.searchParams.get("ssl") === "false" ||
            conexion.searchParams.get("tlsInsecure") === "true" || conexion.searchParams.get("tlsAllowInvalidCertificates") === "true" ||
            conexion.searchParams.get("tlsAllowInvalidHostnames") === "true")) throw new Error();
    } catch { throw new Error("DATABASE_URL debe ser una conexión MongoDB válida con nombre de base de datos y TLS en producción"); }
}
if (!urlBaseDatos && process.env.NODE_ENV !== "test") {
    throw new Error("Configura DATABASE_URL para conectar con MongoDB Atlas");
}
if (rutaBaseDatos === ":memory:") throw new Error("DATABASE_PATH debe apuntar a un archivo persistente");
if (!urlBaseDatos && process.env.RENDER && !process.env.RENDER_DISK_PATH) {
    throw new Error("SQLite en Render requiere un disco persistente; configura almacenamiento antes de desplegar");
}
if (!urlBaseDatos && process.env.RENDER_DISK_PATH) {
    const relativa = path.relative(path.resolve(process.env.RENDER_DISK_PATH), path.resolve(rutaBaseDatos));
    if (relativa.startsWith("..") || path.isAbsolute(relativa)) throw new Error("DATABASE_PATH debe estar dentro del disco persistente");
}
module.exports = { puerto, rutaBaseDatos, urlBaseDatos };
