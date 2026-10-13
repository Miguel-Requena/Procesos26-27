const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
test("los usuarios, hashes y eliminaciones sobreviven a procesos independientes sin cambiar la lógica", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "persistencia-"));
    function ejecutar(codigo) {
        const resultado = spawnSync(process.execPath, ["-e", codigo], {
            cwd: __dirname, env: { ...process.env, DATABASE_PATH: path.join(directorio, "real.sqlite") }, encoding: "utf8"
        });
        assert.equal(resultado.status, 0, resultado.stderr);
        return resultado.stdout.trim();
    }
    try {
        ejecutar("require('./logica').inicializarAdministrador('persistencia@example.com', 'clave-prueba').then(() => console.log('ok'))");
        assert.equal(ejecutar("require('./logica').iniciarSesion('persistencia@example.com', 'clave-prueba').then(u => console.log(u.email))"), "persistencia@example.com");
        ejecutar("require('./logica').eliminarUsuario(1, { id: 1 })");
        assert.equal(ejecutar("process.stdout.write(JSON.stringify(require('./datos').buscarPorId(1).activo))"), "false");
        ejecutar("require('./logica').iniciarSesion('persistencia@example.com', 'clave-prueba').then(() => process.exit(1)).catch(() => console.log('rechazado'))");
    } finally { fs.rmSync(directorio, { recursive: true, force: true }); }
});
