const configuracion = require("./configuracion");
const express = require("express");
const path = require("path");

const logica = require("./logica");
const sesiones = require("./sesiones");
const actividad = require("./actividad");

const app = express();

app.use(actividad.middleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "cliente")));
app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

async function exigirSesion(req, res, next) {
    try {
        req.usuario = await logica.obtenerUsuarioSesion(sesiones.obtenerUsuarioId(req));
        next();
    } catch {
        sesiones.cerrarSesion(req, res);
        res.status(401).json({ error: "Debes iniciar sesión" });
    }
}

app.get("/api/salud", async (req, res) => {
    try {
        await require("./datos").listar();
        res.status(200).json({ estado: "ok" });
    } catch { res.status(503).json({ error: "Base de datos no disponible" }); }
});

app.post("/api/registro", async (req, res) => {
    try {
        const { email, clave } = req.body;

        const usuario = await logica.registrarUsuario(email, clave);
        req.usuarioActividad = usuario.id;

        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            usuario: usuario
        });

    } catch (error) {
        res.status(error.estado || 400).json({
            error: error.message
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, clave } = req.body;

        const usuario = await logica.iniciarSesion(email, clave);
        req.usuarioActividad = usuario.id;
        sesiones.crearSesion(req, res, usuario.id);

        res.status(200).json({
            mensaje: "Inicio de sesión correcto",
            usuario: usuario
        });

    } catch (error) {
        res.status(error.estado || 401).json({
            error: error.message
        });
    }
});

app.post("/api/logout", (req, res) => {
    req.usuarioActividad = sesiones.obtenerUsuarioId(req);
    sesiones.cerrarSesion(req, res);
    res.status(200).json({ mensaje: "Sesión cerrada correctamente" });
});

app.get("/api/sesion", async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const usuario = await logica.obtenerUsuarioSesion(sesiones.obtenerUsuarioId(req));
        req.usuarioActividad = usuario.id;
        res.status(200).json({ usuario });
    } catch (error) {
        sesiones.cerrarSesion(req, res);
        res.status(401).json({ error: "Sesión no válida" });
    }
});

app.use("/api/usuarios", exigirSesion);

app.get("/api/usuarios", async (req, res) => {
    try {
        res.status(200).json({ usuarios: await logica.listarUsuarios(req.usuario) });
    } catch (error) { res.status(error.estado || 500).json({ error: error.estado ? error.message : "No se pudo completar la operación" }); }
});

app.get("/api/usuarios/:id/activo", async (req, res) => {
    try {
        const activo = await logica.comprobarUsuarioActivo(req.params.id, req.usuario);
        res.status(200).json({ activo: activo });
    } catch (error) {
        res.status(error.estado || 404).json({ error: error.message });
    }
});

app.delete("/api/usuarios/:id", async (req, res) => {
    try {
        const usuario = await logica.eliminarUsuario(req.params.id, req.usuario);
        res.status(200).json({
            mensaje: "Usuario eliminado correctamente",
            usuario: usuario
        });
    } catch (error) {
        res.status(error.estado || 404).json({ error: error.message });
    }
});

app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: "El cuerpo de la petición debe ser JSON válido" });
    res.status(500).json({ error: "No se pudo completar la operación" });
});

if (require.main === module) {
    const PORT = configuracion.puerto;
    app.listen(PORT, () => {
        actividad.registrar("servidor_iniciado", { puerto: PORT });
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
}

module.exports = app;
