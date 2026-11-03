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

const perfiles = {
    cliente: { nombre: "Cliente", titulo: "Tu espacio de cliente", descripcion: "Prepara tus próximos transportes con Transdrakkar.", funciones: ["Solicitudes de transporte de mobiliario", "Consulta y seguimiento de tus solicitudes"] },
    conductor: { nombre: "Conductor", titulo: "Tu espacio de conductor", descripcion: "Un espacio para organizar tu jornada de transporte.", funciones: ["Rutas y paradas asignadas", "Registro de entregas e incidencias"] },
    administrador: { nombre: "Administración", titulo: "Centro de operaciones", descripcion: "Coordina la actividad de Transdrakkar desde un mismo lugar.", funciones: ["Revisión de solicitudes de transporte", "Vehículos y conductores", "Planificación de rutas"] }
};
let versionPanel = 0;
let versionDatos = 0;
let rolActual;
function limpiarDatosPanel() {
    document.getElementById("lista-cuentas").replaceChildren();
    document.getElementById("lista-transportes").replaceChildren();
    document.getElementById("cuentas-equipo").hidden = true;
    document.getElementById("estado-panel").textContent = "";
}
async function cargarDatosPanel() {
    const version = versionPanel, carga = ++versionDatos, rol = rolActual;
    limpiarDatosPanel();
    if (!rol) return;
    const estadoPanel = document.getElementById("estado-panel");
    estadoPanel.textContent = "Cargando datos…";
    const tipos = rol === "administrador" ? ["solicitudes", "rutas"] : [rol === "cliente" ? "solicitudes" : "rutas"];
    try {
        const [cuentas, ...respuestas] = await Promise.all([
            rol === "administrador" ? window.api.listarUsuarios() : null,
            ...tipos.map(tipo => window.api.consultarTransportes(tipo))
        ]);
        if (version !== versionPanel || carga !== versionDatos) return;
        if (cuentas) {
            document.getElementById("cuentas-equipo").hidden = false;
            for (const cuenta of cuentas.usuarios) {
                const fila = document.createElement("div");
                fila.className = "cuenta-equipo";
                const texto = document.createElement("p");
                texto.textContent = `${cuenta.email} · ${cuenta.rol}${cuenta.activo ? "" : " · No disponible"}`;
                fila.append(texto);
                if (cuenta.activo && ["cliente", "conductor"].includes(cuenta.rol)) {
                    const boton = document.createElement("button");
                    const siguiente = cuenta.rol === "cliente" ? "conductor" : "cliente";
                    boton.type = "button";
                    boton.textContent = siguiente === "conductor" ? "Habilitar conductor" : "Volver a cliente";
                    boton.setAttribute("aria-label", `${boton.textContent}: ${cuenta.email}`);
                    boton.addEventListener("click", async () => {
                        boton.disabled = true;
                        mensaje.textContent = "";
                        try {
                            await window.api.cambiarPerfil(cuenta.id, siguiente);
                            if (version !== versionPanel) return;
                            await cargarDatosPanel();
                            mensaje.textContent = "Perfil actualizado correctamente.";
                        } catch (error) {
                            if (version !== versionPanel) return;
                            await cargarDatosPanel();
                            mensaje.textContent = error.message;
                        } finally { boton.disabled = false; }
                    });
                    fila.append(boton);
                }
                document.getElementById("lista-cuentas").append(fila);
            }
        }
        for (let i = 0; i < tipos.length; i++) {
            const bloque = document.createElement("section");
            const titulo = document.createElement("h4");
            titulo.textContent = tipos[i] === "solicitudes" ? (rol === "cliente" ? "Mis solicitudes" : "Solicitudes") : (rol === "conductor" ? "Mis rutas" : "Rutas");
            bloque.append(titulo);
            const registros = respuestas[i][tipos[i]];
            if (!registros.length) {
                const vacio = document.createElement("p");
                vacio.textContent = tipos[i] === "solicitudes" ? "No hay solicitudes disponibles." : "No hay rutas asignadas disponibles.";
                bloque.append(vacio);
            }
            for (const registro of registros) {
                const ficha = document.createElement("article");
                ficha.className = "ficha-transporte";
                const nombre = document.createElement("h4");
                nombre.textContent = registro.referencia || registro.id;
                const detalle = document.createElement("p");
                detalle.textContent = `${registro.origen || "Origen pendiente"} → ${registro.destino || "Destino pendiente"}`;
                const datos = document.createElement("p");
                datos.textContent = `${registro.fecha || "Fecha pendiente"} · ${registro.estado || "Sin estado"}`;
                ficha.append(nombre, detalle, datos);
                bloque.append(ficha);
            }
            document.getElementById("lista-transportes").append(bloque);
        }
        estadoPanel.textContent = "Datos actualizados.";
    } catch (error) {
        if (version !== versionPanel || carga !== versionDatos) return;
        limpiarDatosPanel();
        estadoPanel.textContent = error.message;
        if ([401, 403].includes(error.estado)) {
            mensaje.textContent = "Tu sesión o tus permisos han cambiado. Recarga la página para actualizar tu acceso.";
        }
    }
}
document.getElementById("actualizar-panel").addEventListener("click", cargarDatosPanel);
async function mostrarUsuario(usuario) {
    const version = ++versionPanel;
    rolActual = undefined;
    limpiarDatosPanel();
    formularios.hidden = Boolean(usuario);
    document.querySelector(".intro-acceso").hidden = Boolean(usuario);
    panelSesion.hidden = true;
    document.getElementById("panel-funciones").replaceChildren();
    estado.textContent = usuario ? "Cargando tu espacio…" : "Inicia sesión para utilizar la aplicación.";
    if (!usuario) return;
    // El servidor comprueba el perfil de la cuenta en cada petición.
    try {
        const panel = await window.api.obtenerPanel(usuario.rol);
        if (version !== versionPanel) return;
        const perfil = perfiles[panel.rol];
        if (!perfil) throw new Error("Perfil no disponible. Contacta con administración.");
        document.getElementById("perfil-etiqueta").textContent = perfil.nombre;
        document.getElementById("panel-titulo").textContent = perfil.titulo;
        document.getElementById("panel-descripcion").textContent = perfil.descripcion;
        for (const texto of perfil.funciones) {
            const elemento = document.createElement("li");
            elemento.textContent = texto;
            document.getElementById("panel-funciones").append(elemento);
        }
        estado.textContent = `Sesión iniciada: ${panel.usuario.email}`;
        panelSesion.hidden = false;
        rolActual = panel.rol;
        await cargarDatosPanel();
    } catch (error) {
        if (version !== versionPanel) return;
        formularios.hidden = false;
        document.querySelector(".intro-acceso").hidden = false;
        estado.textContent = "No se pudo cargar tu espacio. Vuelve a iniciar sesión.";
        mensaje.textContent = error.message;
    }
}

async function recuperarSesion() {
    try {
        const { usuario } = await window.api.obtenerSesion();
        await mostrarUsuario(usuario);
    } catch (error) {
        await mostrarUsuario(null);
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
                await mostrarUsuario(usuario);
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
        await mostrarUsuario(null);
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
