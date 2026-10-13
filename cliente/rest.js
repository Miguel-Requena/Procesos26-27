// Esta capa solo se ocupa de HTTP. No conoce elementos de la interfaz.
window.api = {
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
        const datos = await respuesta.json();
        if (!respuesta.ok) {
            const error = new Error(datos.error || "No se pudo completar la petición");
            error.estado = respuesta.status;
            throw error;
        }
        return datos;
    },
    obtenerSesion() { return this.peticion("/sesion"); },
    registrar(email, clave) {
        return this.peticion("/registro", { method: "POST", body: JSON.stringify({ email, clave }) });
    },
    iniciarSesion(email, clave) {
        return this.peticion("/login", { method: "POST", body: JSON.stringify({ email, clave }) });
    },
    cerrarSesion() { return this.peticion("/logout", { method: "POST" }); }
};
