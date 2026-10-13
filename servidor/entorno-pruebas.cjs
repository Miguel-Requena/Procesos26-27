const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
process.env.NODE_ENV = "test";
process.env.RENDER = "";
process.env.RENDER_DISK_PATH = "";
// Cada proceso usa su propio archivo; las pruebas nunca borran cuentas reales.
const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "procesos-pruebas-"));
process.env.DATABASE_PATH = path.join(directorio, "usuarios.sqlite");
process.on("exit", () => {
    try { fs.rmSync(directorio, { recursive: true, force: true }); } catch { /* Windows mantiene SQLite abierto hasta terminar el proceso. */ }
});
