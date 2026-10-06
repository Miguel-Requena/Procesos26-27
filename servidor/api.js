const express = require("express");
const path = require("path");

const logica = require("./logica");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "cliente")));

app.get("/api/salud", (req, res) => {
    res.status(200).json({ estado: "ok" });
});

app.post("/api/registro", async (req, res) => {
    try {
        const { email, clave } = req.body;

        const usuario = await logica.registrarUsuario(email, clave);

        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            usuario: usuario
        });

    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, clave } = req.body;

        const usuario = await logica.iniciarSesion(email, clave);

        res.status(200).json({
            mensaje: "Inicio de sesión correcto",
            usuario: usuario
        });

    } catch (error) {
        res.status(401).json({
            error: error.message
        });
    }
});

app.get("/api/usuarios", (req, res) => {
    res.status(200).json({ usuarios: logica.listarUsuarios() });
});

app.get("/api/usuarios/:id/activo", (req, res) => {
    try {
        const activo = logica.comprobarUsuarioActivo(req.params.id);
        res.status(200).json({ activo: activo });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

app.delete("/api/usuarios/:id", (req, res) => {
    try {
        const usuario = logica.eliminarUsuario(req.params.id);
        res.status(200).json({
            mensaje: "Usuario eliminado correctamente",
            usuario: usuario
        });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
}

module.exports = app;