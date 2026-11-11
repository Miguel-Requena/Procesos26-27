// Esta capa usa el cliente API y actualiza la interfaz; no llama a fetch.
const estado = document.getElementById("estado");
const formularios = document.getElementById("formularios");
const panelSesion = document.getElementById("panel-sesion");
const mensaje = document.getElementById("mensaje");
const cerrar = document.getElementById("cerrar-sesion");
let vinculoGooglePendiente = false;
function prepararVinculoGoogle(pendiente) {
    vinculoGooglePendiente = pendiente;
    document.getElementById("login").querySelector('button[type="submit"]').textContent = pendiente ? "Entrar y vincular Google" : "Entrar en mi cuenta →";
    document.getElementById("cancelar-vinculo-google").hidden = !pendiente;
}
document.getElementById("cancelar-vinculo-google").addEventListener("click", () => {
    prepararVinculoGoogle(false);
    mensaje.textContent = "Puedes acceder con tu contraseña sin vincular Google.";
});

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
    cliente: { nombre: "Cliente", titulo: "Tu próximo destino empieza aquí.", descripcion: "Solicita una recogida y consulta tus transportes en un mismo lugar.", funciones: [] },
    conductor: { nombre: "Conductor", titulo: "Todo listo para tu próxima ruta.", descripcion: "Consulta tus rutas asignadas y los detalles de cada transporte.", funciones: [] },
    administrador: { nombre: "Administración", titulo: "Centro de operaciones", descripcion: "Coordina la actividad de Transdrakkar desde un mismo lugar.", funciones: ["Revisión de solicitudes de transporte", "Vehículos y conductores", "Planificación de rutas"] }
};
const enlacesPrivados = document.querySelectorAll(".navegacion-privada nav a");
function activarNavegacion(enlace) {
    for (const item of enlacesPrivados) {
        item.classList.toggle("nav-inicio", item === enlace);
        if (item === enlace) item.setAttribute("aria-current", "location");
        else item.removeAttribute("aria-current");
    }
}
for (const enlace of enlacesPrivados) enlace.addEventListener("click", () => activarNavegacion(enlace));
let versionPanel = 0;
let versionDatos = 0;
let rolActual;
const camionPanel = document.querySelector(".camion-marca").cloneNode(true);
document.getElementById("camion-panel").append(camionPanel);
function grupoEstado(valor) {
    const texto = String(valor || "").toLowerCase();
    if (["completada", "completado", "entregado", "entregada", "finalizada", "finalizado"].includes(texto)) return "completado";
    if (["pendiente", "pendiente_recogida", "asignada", "asignado"].includes(texto)) return "pendiente";
    if (["en_curso", "en_transito", "en_reparto"].includes(texto)) return "en-curso";
    return "otro";
}
function etiquetaEstado(valor) {
    if (!valor) return "Sin estado";
    if (valor === "pendiente_recogida") return "Pendiente de recogida";
    const texto = String(valor).replaceAll("_", " ");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}
function limpiarDatosPanel() {
    document.getElementById("resumen-total").textContent = "—";
    document.getElementById("metrica-segunda").textContent = "—";
    document.getElementById("metrica-tercera").textContent = "—";
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
                const email = document.createElement("strong");
                email.textContent = cuenta.email;
                const perfil = document.createElement("span");
                perfil.className = "perfil-cuenta";
                perfil.textContent = `${perfiles[cuenta.rol]?.nombre || cuenta.rol} · ${cuenta.activo ? "Cuenta activa" : "No disponible"}`;
                texto.append(email, perfil);
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
                const vacio = document.createElement("div");
                vacio.className = "estado-vacio";
                const icono = camionPanel.cloneNode(true);
                icono.classList.add("camion-vacio");
                const encabezado = document.createElement("strong");
                encabezado.textContent = rol === "cliente" ? "Tu próximo transporte empieza aquí" : tipos[i] === "rutas" ? "Todavía no hay rutas asignadas" : "No hay solicitudes por ahora";
                const ayuda = document.createElement("p");
                ayuda.textContent = rol === "cliente" ? "Crea tu primera solicitud e indica dónde debemos recoger tu mercancía." : rol === "conductor" ? "Cuando te asignen una ruta, podrás consultar aquí su recorrido y sus detalles." : "La actividad del equipo aparecerá aquí cuando esté disponible.";
                vacio.append(icono, encabezado, ayuda);
                if (rol === "cliente") {
                    const boton = document.createElement("button");
                    boton.type = "button";
                    boton.textContent = "Crear mi primera solicitud +";
                    boton.addEventListener("click", () => document.getElementById("abrir-solicitud").click());
                    vacio.append(boton);
                }
                bloque.append(vacio);
            }
            for (const registro of registros) {
                const ficha = document.createElement("article");
                ficha.className = "ficha-transporte";
                const nombre = document.createElement("h4");
                nombre.textContent = registro.referencia || registro.id;
                const detalle = document.createElement("p");
                detalle.textContent = tipos[i] === "solicitudes" && !registro.destino
                    ? `Recogida: ${registro.origen || "Dirección pendiente"}`
                    : `${registro.origen || "Origen pendiente"} → ${registro.destino || "Destino pendiente"}`;
                const datos = document.createElement("p");
                datos.className = "fecha-transporte";
                const fecha = /^\d{4}-\d{2}-\d{2}$/.test(registro.fecha || "") ? new Date(`${registro.fecha}T12:00:00`) : null;
                datos.textContent = fecha && !Number.isNaN(fecha.getTime()) ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(fecha) : registro.fecha || "Fecha pendiente";
                const insignia = document.createElement("span");
                insignia.className = `insignia-estado estado-${grupoEstado(registro.estado)}`;
                insignia.textContent = etiquetaEstado(registro.estado);
                ficha.append(nombre, insignia, detalle, datos);
                bloque.append(ficha);
            }
            document.getElementById("lista-transportes").append(bloque);
        }
        document.getElementById("resumen-total").textContent = respuestas.reduce((total, respuesta, i) => total + respuesta[tipos[i]].length, 0);
        const registros = respuestas.flatMap((respuesta, i) => respuesta[tipos[i]]);
        document.getElementById("metrica-segunda").textContent = rol === "administrador" ? respuestas[1].rutas.length : registros.filter(item => grupoEstado(item.estado) === "pendiente").length;
        document.getElementById("metrica-tercera").textContent = rol === "administrador" ? cuentas.usuarios.filter(cuenta => cuenta.activo && cuenta.rol === "conductor").length : registros.filter(item => grupoEstado(item.estado) === "completado").length;
        if (rol === "administrador") document.getElementById("resumen-total").textContent = respuestas[0].solicitudes.length;
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
    document.getElementById("acciones-cliente").hidden = true;
    restablecerSolicitud();
    limpiarDatosPanel();
    formularios.hidden = Boolean(usuario);
    document.querySelector(".intro-acceso").hidden = Boolean(usuario);
    panelSesion.hidden = true;
    document.body.classList.remove("sesion-activa");
    activarNavegacion(enlacesPrivados[0]);
    document.querySelector(".zona-acceso").prepend(estado, mensaje);
    document.getElementById("panel-funciones").replaceChildren();
    estado.textContent = usuario ? "Cargando tu espacio…" : "";
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
        estado.textContent = "";
        document.getElementById("cuenta-privada").textContent = panel.usuario.email;
        document.getElementById("avatar-privado").textContent = panel.usuario.email.charAt(0).toUpperCase();
        document.getElementById("cuenta-rol").textContent = perfil.nombre;
        document.getElementById("metrica-segunda-titulo").textContent = panel.rol === "administrador" ? "Rutas planificadas" : "Pendientes";
        document.getElementById("metrica-segunda-ayuda").textContent = panel.rol === "administrador" ? "Rutas disponibles en el sistema" : "Por recoger o iniciar";
        document.getElementById("metrica-tercera-titulo").textContent = panel.rol === "administrador" ? "Conductores activos" : "Completadas";
        document.getElementById("metrica-tercera-ayuda").textContent = panel.rol === "administrador" ? "Equipo habilitado para conducir" : "Transportes finalizados";
        document.getElementById("resumen-ayuda").textContent = panel.rol === "conductor" ? "Asignadas a tu cuenta" : panel.rol === "cliente" ? "Todas tus solicitudes" : "Solicitudes de todos los clientes";
        document.getElementById("nav-equipo").hidden = panel.rol !== "administrador";
        document.getElementById("nav-transportes").textContent = panel.rol === "cliente" ? "Mis solicitudes" : panel.rol === "conductor" ? "Mis rutas" : "Transportes";
        document.getElementById("titulo-transportes").textContent = document.getElementById("nav-transportes").textContent;
        document.getElementById("resumen-titulo").textContent = panel.rol === "cliente" ? "Mis solicitudes" : panel.rol === "conductor" ? "Mis rutas" : "Solicitudes recibidas";
        document.querySelector(".barra-privada").after(estado, mensaje);
        document.body.classList.add("sesion-activa");
        panelSesion.hidden = false;
        rolActual = panel.rol;
        document.getElementById("acciones-cliente").hidden = panel.rol !== "cliente";
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
                const vinculando = vinculoGooglePendiente;
                const { usuario } = await window.api.iniciarSesion(campos.get("email"), campos.get("clave"), vinculando);
                prepararVinculoGoogle(false);
                await mostrarUsuario(usuario);
                if (vinculando) mensaje.textContent = "Google se ha vinculado a tu cuenta. La próxima vez podrás entrar con Google o con tu contraseña.";
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
    if (acceso === "cuenta-existente") {
        seleccionarAcceso("login");
        prepararVinculoGoogle(true);
        mensaje.textContent = "Ya tienes una cuenta con ese correo. Introduce su correo y contraseña para vincular Google y conservar tus datos. Solo tendrás que hacerlo una vez.";
    }
    if (acceso === "caducado") mensaje.textContent = "El intento con Google ha caducado o no se ha podido validar. Vuelve a pulsar el botón de Google y completa el acceso en la misma pestaña.";
    if (acceso === "cancelado") mensaje.textContent = "Se ha cancelado el acceso con Google. Puedes volver a intentarlo o usar tu contraseña.";
    if (acceso === "cuenta-no-disponible") mensaje.textContent = "Esta cuenta no está disponible. Si está pendiente, confirma primero tu correo; si ya lo has confirmado, contacta con administración.";
    if (acceso === "google-no-disponible") mensaje.textContent = "No se ha podido conectar con Google. Inténtalo más tarde o entra con tu contraseña.";
    try {
        const disponible = Boolean((await window.api.servicios()).google);
        for (const id of ["google", "google-registro"]) document.getElementById(id).hidden = !disponible;
    }
    catch (error) { mensaje.textContent = error.message; }
}
let numeroMueble = 0;
let envioSolicitud = null;
let enviandoSolicitud = false;
const formularioSolicitud = document.getElementById("formulario-solicitud");
const seccionSolicitud = document.getElementById("nueva-solicitud");
const mensajeSolicitud = document.getElementById("mensaje-solicitud");
function agregarMueble(enfocar = false) {
    const lista = document.getElementById("lineas-mobiliario");
    if (lista.children.length >= 50) return;
    const numero = ++numeroMueble;
    const fila = document.createElement("div");
    fila.className = "linea-mueble";
    const campos = [["descripcion", "Mercancía", "text", 200], ["cantidad", "Cantidad", "number", null]];
    for (const [campo, titulo, tipo, maximo] of campos) {
        const grupo = document.createElement("div");
        const label = document.createElement("label");
        label.htmlFor = `mueble-${campo}-${numero}`;
        label.textContent = `${titulo} ${numero}`;
        const input = document.createElement("input");
        input.id = label.htmlFor; input.name = campo; input.type = tipo; input.required = true;
        if (maximo) { input.maxLength = maximo; input.placeholder = "Ej.: sillas, sofás o sillones"; }
        else { input.min = "1"; input.max = "999"; input.step = "1"; input.value = "1"; }
        grupo.append(label, input); fila.append(grupo);
    }
    const grupoUnidad = document.createElement("div");
    const labelUnidad = document.createElement("label");
    labelUnidad.htmlFor = `mueble-unidad-${numero}`; labelUnidad.textContent = `Formato ${numero}`;
    const unidad = document.createElement("select");
    unidad.id = labelUnidad.htmlFor; unidad.name = "unidad"; unidad.required = true;
    for (const [valor, texto] of [["bultos", "Bultos"], ["cajas", "Cajas"], ["unidades", "Unidades"]]) {
        const opcion = document.createElement("option"); opcion.value = valor; opcion.textContent = texto; unidad.append(opcion);
    }
    grupoUnidad.append(labelUnidad, unidad); fila.append(grupoUnidad);
    const quitar = document.createElement("button");
    quitar.type = "button"; quitar.className = "boton-secundario"; quitar.textContent = "Quitar";
    quitar.setAttribute("aria-label", `Quitar mercancía ${numero}`);
    quitar.addEventListener("click", () => {
        fila.remove();
        if (!lista.children.length) agregarMueble(true);
        else document.getElementById("agregar-mueble").focus();
        document.getElementById("agregar-mueble").disabled = false;
    });
    fila.append(quitar); lista.append(fila);
    document.getElementById("agregar-mueble").disabled = lista.children.length >= 50;
    if (enfocar) fila.querySelector("input").focus();
}
function restablecerSolicitud() {
    formularioSolicitud.reset(); seccionSolicitud.hidden = true; envioSolicitud = null;
    mensajeSolicitud.textContent = "";
    document.getElementById("lineas-mobiliario").replaceChildren(); numeroMueble = 0;
    agregarMueble();
}
document.getElementById("agregar-mueble").addEventListener("click", () => agregarMueble(true));
document.getElementById("abrir-solicitud").addEventListener("click", () => {
    if (rolActual !== "cliente") return;
    seccionSolicitud.hidden = false;
    document.getElementById("titulo-nueva-solicitud").focus();
});
document.getElementById("cancelar-solicitud").addEventListener("click", () => {
    seccionSolicitud.hidden = true;
    document.getElementById("abrir-solicitud").focus();
});
formularioSolicitud.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (enviandoSolicitud || rolActual !== "cliente") return;
    const campos = new FormData(formularioSolicitud);
    const datos = {
        fabricante: campos.get("fabricante"), origen: campos.get("origen"), fecha: campos.get("fecha"),
        contactoRecogida: { nombre: campos.get("recogidaNombre"), telefono: campos.get("recogidaTelefono") },
        mobiliario: [...document.querySelectorAll(".linea-mueble")].map(fila => ({ descripcion: fila.querySelector('[name="descripcion"]').value, cantidad: Number(fila.querySelector('[name="cantidad"]').value), unidad: fila.querySelector('[name="unidad"]').value })),
        observaciones: campos.get("observaciones")
    };
    const contenido = JSON.stringify(datos);
    if (!envioSolicitud || envioSolicitud.contenido !== contenido) {
        // getRandomValues también funciona al probar por HTTP en la red local.
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        envioSolicitud = { contenido, clave: Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("") };
    }
    const version = versionPanel;
    enviandoSolicitud = true;
    document.getElementById("campos-solicitud").disabled = true;
    document.getElementById("enviar-solicitud").disabled = true;
    document.getElementById("cancelar-solicitud").disabled = true;
    mensajeSolicitud.textContent = "Enviando tu solicitud…";
    try {
        const resultado = await window.api.crearSolicitud(datos, envioSolicitud.clave);
        if (version !== versionPanel) return;
        restablecerSolicitud();
        await cargarDatosPanel();
        if (version !== versionPanel) return;
        mensaje.textContent = `Solicitud ${resultado.solicitud.referencia} guardada. Está pendiente de recogida.`;
        document.getElementById("abrir-solicitud").focus();
    } catch (error) {
        if (version !== versionPanel) return;
        mensajeSolicitud.textContent = error.message;
        if ([401, 403].includes(error.estado)) await recuperarSesion();
    } finally {
        enviandoSolicitud = false;
        document.getElementById("campos-solicitud").disabled = false;
        document.getElementById("enviar-solicitud").disabled = false;
        document.getElementById("cancelar-solicitud").disabled = false;
    }
});
iniciar();
