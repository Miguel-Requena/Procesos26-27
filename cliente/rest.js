// Esta capa solo se ocupa de HTTP. No conoce elementos de la interfaz.
window.api = {
    // Sondeo secuencial: nunca solapa consultas ni entrega respuestas tras detenerlo.
    observar(consultar, recibir, { intervalo = 5000, disponible = () => true, fallo = () => {} } = {}) {
        let activo = true, temporizador;
        async function consultarAhora() {
            try {
                if (activo && disponible()) {
                    const datos = await consultar();
                    if (activo && disponible()) await recibir(datos);
                }
            } catch (error) { if (activo) fallo(error); }
            finally { if (activo) temporizador = setTimeout(consultarAhora, intervalo); }
        }
        temporizador = setTimeout(consultarAhora, intervalo);
        return () => { activo = false; clearTimeout(temporizador); };
    },
    async peticion(ruta, opciones = {}) {
        let respuesta;
        try {
            respuesta = await fetch(`/api${ruta}`, {
                credentials: "same-origin",
                ...opciones,
                headers: { "Content-Type": "application/json", ...opciones.headers }
            });
        } catch {
            throw new Error("No se pudo conectar con el servidor. Inténtalo de nuevo.");
        }
        let datos;
        try { datos = await respuesta.json(); }
        catch { throw new Error("El servidor no pudo responder. Inténtalo más tarde."); }
        if (!respuesta.ok) {
            const error = new Error(datos.error || "No se pudo completar la petición");
            error.estado = respuesta.status;
            throw error;
        }
        return datos;
    },
    crearSolicitud(datos, claveEnvio) { return this.peticion("/solicitudes", { method: "POST", headers: { "Idempotency-Key": claveEnvio }, body: JSON.stringify(datos) }); },
    listarUsuarios() { return this.peticion("/usuarios"); },
    listarRecursos(tipo, asignables = false) { return this.peticion(`/administracion/${tipo}${asignables ? '?asignables=true' : ''}`); },
    guardarRecurso(tipo, id, entrada) { return this.peticion(`/administracion/${tipo}${id ? '/' + encodeURIComponent(id) : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(entrada) }); },
    detalleRutaAdministracion(id) { return this.peticion(`/administracion/rutas/${encodeURIComponent(id)}`); },
    planificarRuta(entrada) { return this.peticion('/administracion/rutas', { method: 'POST', body: JSON.stringify(entrada) }); },
    detalleRutaConductor(id) { return this.peticion(`/conductor/rutas/${encodeURIComponent(id)}`); },
    actualizarEntrega(id, entrada) { return this.peticion(`/conductor/rutas/${encodeURIComponent(id)}/actualizaciones`, { method: 'POST', body: JSON.stringify(entrada) }); },
    cambiarPerfil(id, rol) { return this.peticion(`/usuarios/${encodeURIComponent(id)}/perfil`, { method: "PATCH", body: JSON.stringify({ rol }) }); },
    consultarTransportes(tipo) { return this.peticion(`/${tipo}`); },
    detalleSolicitud(id) { return this.peticion(`/solicitudes/${encodeURIComponent(id)}`); },
    cancelarSolicitud(id) { return this.peticion(`/solicitudes/${encodeURIComponent(id)}/cancelacion`, { method: "POST" }); },
    listarSolicitudesAdministracion(filtros = {}) { return this.peticion(`/administracion/solicitudes?${new URLSearchParams(filtros)}`); },
    detalleSolicitudAdministracion(id) { return this.peticion(`/administracion/solicitudes/${encodeURIComponent(id)}`); },
    revisarSolicitud(id, datos) { return this.peticion(`/administracion/solicitudes/${encodeURIComponent(id)}/revision`, { method: "POST", body: JSON.stringify(datos) }); },
    servicios() { return this.peticion("/servicios"); },
    confirmar(token) { return this.peticion("/confirmacion", { method: "POST", body: JSON.stringify({ token }) }); },
    reenviar(email) { return this.peticion("/confirmacion/reenviar", { method: "POST", body: JSON.stringify({ email }) }); },
    obtenerPanel(rol) { return this.peticion(`/panel/${encodeURIComponent(rol)}`); },
    obtenerSesion() { return this.peticion("/sesion"); },
    registrar(email, clave, nombre, primerApellido) {
        return this.peticion("/registro", { method: "POST", body: JSON.stringify({ email, clave, nombre, primerApellido }) });
    },
    iniciarSesion(email, clave, vincularGoogle = false) {
        return this.peticion("/login", { method: "POST", body: JSON.stringify({ email, clave, vincularGoogle }) });
    },
    cerrarSesion() { return this.peticion("/logout", { method: "POST" }); }
};
