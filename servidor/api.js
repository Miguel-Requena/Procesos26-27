const express = require("express");
const path = require("path");

const logica = require("./logica");
const sesiones = require("./sesiones");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "cliente")));
app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

function exigirSesion(req, res, next) {
    try {
        req.usuario = logica.obtenerUsuarioSesion(sesiones.obtenerUsuarioId(req));
        next();
    } catch {
        sesiones.cerrarSesion(req, res);
        res.status(401).json({ error: "Debes iniciar sesión" });
    }
}

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
        sesiones.crearSesion(req, res, usuario.id);

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

app.post("/api/logout", (req, res) => {
    sesiones.cerrarSesion(req, res);
    res.status(200).json({ mensaje: "Sesión cerrada correctamente" });
});

app.get("/api/sesion", (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const usuario = logica.obtenerUsuarioSesion(sesiones.obtenerUsuarioId(req));
        res.status(200).json({ usuario });
    } catch (error) {
        sesiones.cerrarSesion(req, res);
        res.status(401).json({ error: "Sesión no válida" });
    }
});

app.use("/api/usuarios", exigirSesion);

app.get("/api/usuarios", (req, res) => {
    res.status(200).json({ usuarios: logica.listarUsuarios() });
});

app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "El cuerpo de la petición debe ser JSON válido" });
    }
    console.error("Error no controlado:", error.message);
    res.status(500).json({ error: "No se pudo completar la operación" });
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
