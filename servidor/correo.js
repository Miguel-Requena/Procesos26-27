const nodemailer = require("nodemailer");
function disponible() { return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD); }
async function enviar(mensaje) {
    const transporte = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
        logger: false, debug: false
    });
    const resultado = await transporte.sendMail({ ...mensaje, from: process.env.GMAIL_USER });
    if (!resultado.accepted?.length) throw new Error("Correo no aceptado");
}
module.exports = { disponible, enviar };
