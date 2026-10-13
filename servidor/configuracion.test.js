const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
function cargar(extra) {
    return spawnSync(process.execPath, ["-e", "require('./configuracion')"], {
        cwd: __dirname, env: { ...process.env, NODE_ENV: "test", RENDER: "", RENDER_DISK_PATH: "", ...extra }, encoding: "utf8"
    });
}
test("rechaza puertos inválidos y almacenamiento en memoria", () => {
    assert.notEqual(cargar({ PORT: "incorrecto" }).status, 0);
    assert.notEqual(cargar({ DATABASE_PATH: ":memory:" }).status, 0);
    assert.equal(cargar({ PORT: "3000" }).status, 0);
});
test("no permite SQLite en Render sin almacenamiento persistente", () => {
    assert.notEqual(cargar({ RENDER: "true" }).status, 0);
    assert.notEqual(cargar({ RENDER_DISK_PATH: "/datos", DATABASE_PATH: "/fuera/usuarios.sqlite" }).status, 0);
    assert.equal(cargar({ RENDER_DISK_PATH: "/datos", DATABASE_PATH: "/datos/usuarios.sqlite" }).status, 0);
});
test("Render admite MongoDB externo y rechaza cadenas inválidas sin mostrar secretos", () => {
    assert.equal(cargar({ RENDER: "true", DATABASE_URL: "mongodb://localhost/pruebas" }).status, 0);
    const resultado = cargar({ DATABASE_URL: "https://secreto-invalido" });
    assert.notEqual(resultado.status, 0);
    assert.equal(resultado.stderr.includes("secreto-invalido"), false);
});
