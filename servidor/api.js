const configuracion = require("./configuracion");
const express = require("express");
const path = require("path");

const logica = require("./logica");
const sesiones = require("./sesiones");
const actividad = require("./actividad");

const externos = require("./externos");
const app = express();

app.use(actividad.middleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "cliente")));
app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

externos.instalar(app);
async function exigirSesion(req, res, next) {
    try {
        req.usuario = await logica.obtenerUsuarioSesion(await sesiones.obtenerUsuarioId(req));
        next();
    } catch (error) {
        if (error.estado === 503) return res.status(503).json({ error: "Servicio temporalmente no disponible. Inténtalo más tarde." });
        await sesiones.cerrarSesion(req, res);
        res.status(401).json({ error: "Debes iniciar sesión" });
    }
}

app.get("/api/salud", async (req, res) => {
    try {
        await require("./datos").listar();
        res.status(200).json({ estado: "ok" });
    } catch { res.status(503).json({ error: "Base de datos no disponible" }); }
});

app.post("/api/prueba/email", (req, res) => {
    try {
        res.status(200).json({ email: logica.normalizarEmail(req.body?.email) });
    } catch (error) {
        res.status(400).json({ error: error.estado === 503 ? "Servicio temporalmente no disponible. Inténtalo más tarde." : error.message });
    }
});

app.post("/api/registro", async (req, res) => {
    try {
        const { email, clave } = req.body || {};
        if (!externos.correoDisponible()) throw Object.assign(new Error("El envío de correo no está configurado. Contacta con el administrador."), { estado: 503 });
        externos.urlPublica();
        externos.limitar(logica.normalizarEmail(email));
        const usuario = await logica.registrarUsuario(email, clave);
        await externos.enviarConfirmacion(usuario);
        req.usuarioActividad = usuario.id;

        res.status(201).json({
            mensaje: "Cuenta creada. Revisa tu correo para confirmarla antes de entrar.",
            usuario: usuario
        });

    } catch (error) {
        res.status(error.estado || 400).json({
            error: error.estado === 503 ? "Servicio temporalmente no disponible. Inténtalo más tarde." : error.message
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, clave } = req.body || {};
        externos.comprobarLogin(req.ip, email);
        const usuario = await logica.iniciarSesion(email, clave);
        await externos.completarVinculoGoogle(req, res, usuario);
        req.usuarioActividad = usuario.id;
        await sesiones.crearSesion(req, res, usuario.id);
        externos.registrarLoginCorrecto(req.ip, email);

        res.status(200).json({
            mensaje: "Inicio de sesión correcto",
            usuario: usuario
        });

    } catch (error) {
        if (error.estado !== 503 && error.estado !== 429) externos.registrarFalloLogin(req.ip, req.body?.email);
        if (error.estado === 429) return res.status(429).json({ error: error.message });
        res.status(error.estado || 401).json({
            error: error.estado === 503 ? "Servicio temporalmente no disponible. Inténtalo más tarde." : error.message
        });
    }
});

app.post("/api/logout", async (req, res, next) => {
    try {
        req.usuarioActividad = await sesiones.obtenerUsuarioId(req);
        await sesiones.cerrarSesion(req, res);
        res.status(200).json({ mensaje: "Sesión cerrada correctamente" });
    } catch (error) { next(error); }
});

app.get("/api/sesion", async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const usuario = await logica.obtenerUsuarioSesion(await sesiones.obtenerUsuarioId(req));
        req.usuarioActividad = usuario.id;
        res.status(200).json({ usuario });
    } catch (error) {
        if (error.estado === 503) return res.status(503).json({ error: "Servicio temporalmente no disponible. Inténtalo más tarde." });
        await sesiones.cerrarSesion(req, res);
        res.status(401).json({ error: "Sesión no válida" });
    }
});

for (const rol of ["cliente", "conductor", "administrador"]) {
    app.get(`/api/panel/${rol}`, exigirSesion, async (req, res) => {
        try { res.json(await logica.obtenerPanel(rol, req.usuario)); }
        catch (error) { res.status(error.estado || 500).json({ error: error.estado ? error.message : "No se pudo cargar el panel" }); }
    });
}

app.post("/api/solicitudes", exigirSesion, async (req, res) => {
    try {
        const resultado = await logica.crearSolicitud(req.body, req.get("Idempotency-Key"), req.usuario);
        res.status(resultado.creada ? 201 : 200).json(resultado);
    } catch (error) {
        res.status(error.estado || 500).json({ error: error.estado === 503 ? "Servicio temporalmente no disponible. Inténtalo más tarde." : error.estado ? error.message : "No se pudo guardar la solicitud" });
    }
});

for (const tipo of ["solicitudes", "rutas"]) {
    app.get(`/api/${tipo}`, exigirSesion, async (req, res) => {
        try { res.json({ [tipo]: await logica.consultarTransportes(tipo, req.usuario) }); }
        catch (error) { res.status(error.estado || 500).json({ error: error.estado ? error.message : "No se pudo consultar el transporte" }); }
    });
    app.get(`/api/${tipo}/:id`, exigirSesion, async (req, res) => {
        try { res.json({ registro: await logica.consultarTransportes(tipo, req.usuario, req.params.id) }); }
        catch (error) { res.status(error.estado || 500).json({ error: error.estado ? error.message : "No se pudo consultar el transporte" }); }
    });
}

app.post("/api/solicitudes/:id/cancelacion", exigirSesion, async (req, res) => {
    try { res.json({ solicitud: await logica.cancelarSolicitud(req.params.id, req.usuario) }); }
    catch (error) { res.status(error.estado || 500).json({ error: error.estado ? error.message : "No se pudo cancelar la solicitud" }); }
});

app.use("/api/usuarios", exigirSesion);
app.patch("/api/usuarios/:id/perfil", async (req, res) => {
    try { res.json({ usuario: await logica.cambiarPerfilEquipo(req.params.id, req.body?.rol, req.usuario) }); }
    catch (error) { res.status(error.estado || 500).json({ error: error.estado ? error.message : "No se pudo cambiar el perfil" }); }
});


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
        res.status(error.estado || 404).json({ error: error.estado === 503 ? "Servicio temporalmente no disponible. Inténtalo más tarde." : error.message });
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
        res.status(error.estado || 404).json({ error: error.estado === 503 ? "Servicio temporalmente no disponible. Inténtalo más tarde." : error.message });
    }
});

app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: "El cuerpo de la petición debe ser JSON válido" });
    res.status(error.estado || 500).json({ error: error.estado ? error.message : "No se pudo completar la operación" });
});

if (require.main === module) {
    const PORT = configuracion.puerto;
    app.listen(PORT, () => {
        actividad.registrar("servidor_iniciado", { puerto: PORT });
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
}

module.exports = app;
