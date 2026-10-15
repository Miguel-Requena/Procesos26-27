const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { normalizarEmail } = require("./logica");
const app = require("./api");

test("variante2: normaliza espacios exteriores y mayúsculas", () => {
    assert.equal(normalizarEmail(" Ana@X.com "), "ana@x.com");
    assert.equal(normalizarEmail("\tANA@Sub.X.COM\n"), "ana@sub.x.com");
    assert.equal(normalizarEmail("a@x..com"), "a@x..com");
});

test("variante2: rechaza formatos inválidos y tipos incorrectos", () => {
    for (const email of [undefined, null, 42, {}, [], "", "  ", "ana", "@x.com",
        "ana@@x.com", "ana@", "ana@x", "ana@.x.com", "ana@x.com.",
        "a na@x.com", "ana@x .com", "ana@x.\tcom"]) {
        assert.throws(() => normalizarEmail(email), { message: "EMAIL_INVALIDO" });
    }
});

test("variante2: endpoint público devuelve el contrato JSON sin sesión", async () => {
    const servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    try {
        const url = `http://127.0.0.1:${servidor.address().port}/api/prueba/email`;
        for (const [body, estado, esperado] of [
            [{ email: " Ana@X.com " }, 200, { email: "ana@x.com" }],
            [{ email: "ana@.x.com" }, 400, { error: "EMAIL_INVALIDO" }],
            [{ email: "ana@x.com." }, 400, { error: "EMAIL_INVALIDO" }],
            [{}, 400, { error: "EMAIL_INVALIDO" }],
            [{ email: 12 }, 400, { error: "EMAIL_INVALIDO" }]
        ]) {
            const respuesta = await fetch(url, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            assert.equal(respuesta.status, estado);
            assert.match(respuesta.headers.get("content-type"), /application\/json/);
            assert.deepEqual(await respuesta.json(), esperado);
        }
        const sinCuerpo = await fetch(url, { method: "POST" });
        assert.equal(sinCuerpo.status, 400);
        assert.deepEqual(await sinCuerpo.json(), { error: "EMAIL_INVALIDO" });
    } finally {
        await new Promise(resolve => servidor.close(resolve));
    }
});
