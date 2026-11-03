const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("migra perfiles antiguos sin perder cuentas, tokens o identidades y es idempotente", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfiles-migracion-"));
    const archivo = path.join(dir, "legado.sqlite");
    const db = new DatabaseSync(archivo);
    db.exec(`CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE,clave TEXT,
        activo INTEGER,rol TEXT DEFAULT 'usuario' CHECK(rol IN ('usuario','administrador')),confirmado INTEGER,eliminado INTEGER);
        INSERT INTO usuarios VALUES (7,'cliente@example.com','hash',1,'usuario',1,0),(8,'admin@example.com','hash',1,'administrador',1,0),
            (9,'pendiente@example.com','hash',0,'usuario',0,0),(10,'baja@example.com','hash',0,'usuario',1,1);
        CREATE TABLE confirmaciones (hash TEXT PRIMARY KEY,usuarioId INTEGER UNIQUE,caduca INTEGER);
        INSERT INTO confirmaciones VALUES ('token',9,9999999999999);
        CREATE TABLE identidades (sub TEXT PRIMARY KEY,usuarioId INTEGER UNIQUE);
        INSERT INTO identidades VALUES ('google-id',7);`);
    db.close();
    try {
        for (let i=0;i<2;i++) {
            const resultado = spawnSync(process.execPath, ["-e", `(async()=>{
                const assert=require('node:assert/strict'), datos=require('./datos');
                assert.equal((await datos.buscarPorId(7)).rol,'cliente');
                assert.equal((await datos.buscarPorId(8)).rol,'administrador');
                assert.equal((await datos.buscarPorId(7)).clave,'hash');
                assert.equal((await datos.buscarGoogle('google-id')).id,7);
                assert.equal((await datos.buscarPorId(10)).activo,false);
                if (${i}===0) assert.equal((await datos.confirmar('token')).id,9);
                await datos.asignarRol(7,'conductor');
                assert.equal((await datos.buscarPorId(7)).rol,'conductor');
                await datos.asignarRol(7,'cliente');
                await datos.cerrar();
            })().catch(e=>{console.error(e);process.exitCode=1})`], {
                cwd: __dirname, encoding: "utf8", env: { ...process.env, DATABASE_PATH: archivo }
            });
            assert.equal(resultado.status,0,resultado.stderr);
        }
    } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
