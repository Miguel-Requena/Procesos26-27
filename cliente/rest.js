// Esta capa solo se ocupa de HTTP. No conoce elementos de la interfaz.
window.api = {
    async peticion(ruta, opciones = {}) {
        const respuesta = await fetch(`/api${ruta}`, {
            credentials: "same-origin",
            ...opciones,
            headers: { "Content-Type": "application/json", ...opciones.headers }
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) {
            const error = new Error(datos.error || "No se pudo completar la petición");
            error.estado = respuesta.status;
            throw error;
        }
        return datos;
    },
    obtenerSesion() { return this.peticion("/sesion"); }
};
