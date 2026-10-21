const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const correo = require("./correo");
test("Gmail usa TLS, la clave de aplicacion y el remitente configurado", async () => {
    const original = nodemailer.createTransport;
    process.env.GMAIL_USER = "remitente@example.com";
    process.env.GMAIL_APP_PASSWORD = "clave-simulada";
    nodemailer.createTransport = opciones => {
        assert.equal(opciones.host, "smtp.gmail.com");
        assert.equal(opciones.secure, true);
        assert.equal(opciones.port, 465);
        assert.equal(opciones.auth.pass, "clave-simulada");
        return { sendMail: async mensaje => {
            assert.equal(mensaje.from, "remitente@example.com");
            assert.equal(mensaje.to, "destino@example.com");
            return { accepted: [mensaje.to] };
        } };
    };
    try {
        assert.equal(correo.disponible(), true);
        await correo.enviar({ to: "destino@example.com", from: "falso@example.com", text: "Confirmacion" });
        delete process.env.GMAIL_APP_PASSWORD;
        assert.equal(correo.disponible(), false);
    } finally { nodemailer.createTransport = original; delete process.env.GMAIL_USER; delete process.env.GMAIL_APP_PASSWORD; }
});
