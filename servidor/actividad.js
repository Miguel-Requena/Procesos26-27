const eventos = new Set(["registro", "login", "logout", "consulta_sesion", "listado_usuarios", "consulta_estado", "eliminacion_usuario", "peticion_api", "servidor_iniciado", "administrador_inicializado"]);
function registrar(evento, campos = {}, salida = process.stdout) {
    if (!eventos.has(evento)) evento = "peticion_api";
    const entrada = { fecha: new Date().toISOString(), evento };
    // Lista cerrada de campos: nunca se serializa req, cuerpo, cabeceras ni errores SQL.
    for (const campo of ["estado", "usuarioId", "objetivoId", "puerto"]) {
        if (Number.isSafeInteger(campos[campo])) entrada[campo] = campos[campo];
    }
    entrada.resultado = campos.estado >= 400 ? "rechazado" : "correcto";
    salida.write(JSON.stringify(entrada) + "\n");
}
function middleware(req, res, next) {
    const rutas = [
        ["POST", /^\/api\/registro\/?$/, "registro"],
        ["POST", /^\/api\/login\/?$/, "login"],
        ["POST", /^\/api\/logout\/?$/, "logout"],
        ["GET", /^\/api\/sesion\/?$/, "consulta_sesion"],
        ["GET", /^\/api\/usuarios\/?$/, "listado_usuarios"],
        ["GET", /^\/api\/usuarios\/[^/]+\/activo\/?$/, "consulta_estado"],
        ["DELETE", /^\/api\/usuarios\/[^/]+\/?$/, "eliminacion_usuario"]
    ];
    const ruta = rutas.find(([metodo, patron]) => req.method === metodo && patron.test(req.path));
    if (req.path.startsWith("/api/") && req.path !== "/api/salud") {
        res.on("finish", () => {
            const objetivo = /^\/api\/usuarios\/(\d+)(?:\/activo)?\/?$/.exec(req.path);
            registrar(ruta?.[2] || "peticion_api", {
                estado: res.statusCode,
                usuarioId: req.usuario?.id || req.usuarioActividad,
                objetivoId: objetivo ? Number(objetivo[1]) : undefined
            });
        });
    }
    next();
}
module.exports = { registrar, middleware };
