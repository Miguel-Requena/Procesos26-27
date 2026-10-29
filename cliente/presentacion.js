// Esta capa usa el cliente API y actualiza la interfaz; no llama a fetch.
const estado = document.getElementById("estado");
const formularios = document.getElementById("formularios");
const panelSesion = document.getElementById("panel-sesion");
const mensaje = document.getElementById("mensaje");
const cerrar = document.getElementById("cerrar-sesion");

function seleccionarAcceso(tipo) {
    for (const opcion of ["login", "registro"]) {
        document.getElementById(`seccion-${opcion}`).hidden = opcion !== tipo;
        document.getElementById(`ver-${opcion}`).setAttribute("aria-pressed", String(opcion === tipo));
    }
}
for (const tipo of ["login", "registro"]) {
    document.getElementById(`ver-${tipo}`).addEventListener("click", () => seleccionarAcceso(tipo));
}

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
                mensaje.textContent = "Cuenta creada. Revisa tu correo y confirma la cuenta antes de entrar.";
                document.getElementById("login-email").value = campos.get("email");
                seleccionarAcceso("login");
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

document.getElementById("reenviar").addEventListener("submit", async evento => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const boton = formulario.querySelector("button");
    boton.disabled = true;
    try { mensaje.textContent = (await window.api.reenviar(new FormData(formulario).get("email"))).mensaje; }
    catch (error) { mensaje.textContent = error.message; }
    finally { boton.disabled = false; }
});
async function iniciar() {
    const parametros = new URLSearchParams(location.search);
    const token = parametros.get("confirmacion");
    const acceso = parametros.get("acceso");
    history.replaceState(null, "", location.pathname);
    await recuperarSesion();
    if (token) {
        try { mensaje.textContent = (await window.api.confirmar(token)).mensaje; }
        catch (error) { mensaje.textContent = error.message; }
    }
    if (acceso === "error") mensaje.textContent = "No se pudo completar el acceso con Google. Inténtalo de nuevo.";
    if (acceso === "cuenta-existente") mensaje.textContent = "Ya existe esa cuenta. Accede con tu contraseña.";
    try { document.getElementById("google").hidden = !(await window.api.servicios()).google; }
    catch (error) { mensaje.textContent = error.message; }
}
iniciar();
