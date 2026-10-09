// Esta capa usa el cliente API y actualiza la interfaz; no llama a fetch.
async function recuperarSesion() {
    const estado = document.getElementById("estado");
    try {
        const { usuario } = await window.api.obtenerSesion();
        estado.textContent = `Sesión iniciada: ${usuario.email}`;
    } catch (error) {
        estado.textContent = error.estado === 401
            ? "Inicia sesión para utilizar la aplicación."
            : `No se pudo recuperar la sesión: ${error.message}`;
    }
}

recuperarSesion();
