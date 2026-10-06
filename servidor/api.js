const express = require("express");

const {
    registrarUsuario,
    iniciarSesion
} = require("./logica");

const app = express();

app.use(express.json());

app.post("/api/registro", async (req, res) => {
    try {
        const { email, clave } = req.body;

        const usuario = await registrarUsuario(email, clave);

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

        const usuario = await iniciarSesion(email, clave);

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

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});