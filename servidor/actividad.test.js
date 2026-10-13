const test = require("node:test");
const assert = require("node:assert/strict");
const { registrar } = require("./actividad");
test("el log registra fecha, resultado e identificadores pero descarta secretos y contenido libre", () => {
    let texto = "";
    registrar("login", { estado: 401, usuarioId: 2, clave: "secreto", token: "cookie-secreta", email: "privado@example.com", error: "postgres://clave", objetivoId: "\nsecreto" }, { write: valor => { texto += valor; } });
    const entrada = JSON.parse(texto);
    assert.equal(entrada.evento, "login");
    assert.equal(entrada.resultado, "rechazado");
    assert.equal(entrada.estado, 401);
    assert.equal(entrada.usuarioId, 2);
    assert.equal(Number.isNaN(Date.parse(entrada.fecha)), false);
    assert.equal(texto.includes("secreto"), false);
    assert.equal(texto.includes("privado"), false);
    assert.equal(texto.trim().split("\n").length, 1);
});
