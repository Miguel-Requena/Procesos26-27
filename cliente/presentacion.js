// Esta capa usa el cliente API y actualiza la interfaz; no llama a fetch.
const estado = document.getElementById("estado");
const formularios = document.getElementById("formularios");
const panelSesion = document.getElementById("panel-sesion");
const mensaje = document.getElementById("mensaje");
const cerrar = document.getElementById("cerrar-sesion");

function mostrarUsuario(usuario) {
    formularios.hidden = Boolean(usuario);
    panelSesion.hidden = !usuario;
    estado.textContent = usuario
        ? `Sesión iniciada: ${usuario.email}`
        : "Inicia sesión para utilizar la aplicación.";
}

async function recuperarSesion() {
    try {
        const { usuario } = await window.api.obtenerSesion();
        mostrarUsuario(usuario);
    } catch (error) {
        mostrarUsuario(null);
        if (error.estado !== 401) mensaje.textContent = error.message;
    }
}

for (const tipo of ["registro", "login"]) {
    const formulario = document.getElementById(tipo);
    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();
        const boton = formulario.querySelector("button");
        boton.disabled = true;
        mensaje.textContent = "";
        const campos = new FormData(formulario);
        try {
            if (tipo === "registro") {
                await window.api.registrar(campos.get("email"), campos.get("clave"));
                mensaje.textContent = "Cuenta creada. Ya puedes iniciar sesión.";
                document.getElementById("login-email").value = campos.get("email");
                document.getElementById("login-clave").focus();
            } else {
                const { usuario } = await window.api.iniciarSesion(campos.get("email"), campos.get("clave"));
                mostrarUsuario(usuario);
            }
            formulario.reset();
        } catch (error) {
            mensaje.textContent = error.message;
        } finally {
            boton.disabled = false;
        }
    });
}

cerrar.addEventListener("click", async () => {
    cerrar.disabled = true;
    mensaje.textContent = "";
    try {
        await window.api.cerrarSesion();
        mostrarUsuario(null);
        mensaje.textContent = "Has cerrado la sesión.";
    } catch (error) {
        mensaje.textContent = error.message;
    } finally {
        cerrar.disabled = false;
    }
});

recuperarSesion();
