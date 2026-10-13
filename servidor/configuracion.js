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
        if (!["postgres:", "postgresql:"].includes(new URL(urlBaseDatos).protocol)) throw new Error();
    } catch { throw new Error("DATABASE_URL debe ser una conexión PostgreSQL válida"); }
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
