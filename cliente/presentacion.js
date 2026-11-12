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
let filtrosAdministracion = {};
const camionPanel = document.querySelector(".camion-marca").cloneNode(true);
document.getElementById("camion-panel").append(camionPanel);
function grupoEstado(valor) {
    const texto = String(valor || "").toLowerCase();
    if (["completada", "completado", "entregado", "entregada", "finalizada", "finalizado"].includes(texto)) return "completado";
    if (["pendiente", "pendiente_recogida", "asignada", "asignado"].includes(texto)) return "pendiente";
    if (["en_curso", "en_transito", "en_reparto"].includes(texto)) return "en-curso";
    if (["cancelada", "rechazada"].includes(texto)) return "cancelada";
    if (texto === "aceptada") return "completado";
    return "otro";
}
function resumenEntrega(registro) {
    return [registro.destino, registro.codigoPostalEntrega, registro.localidadEntrega].filter(Boolean).join(", ") || "Datos de entrega pendientes";
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
            ...tipos.map(tipo => rol === "administrador" && tipo === "solicitudes" ? window.api.listarSolicitudesAdministracion(filtrosAdministracion) : window.api.consultarTransportes(tipo))
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
                if (rol === "administrador" && tipos[i] === "solicitudes" && Object.keys(filtrosAdministracion).length) {
                    encabezado.textContent = "No hay solicitudes que coincidan con los filtros";
                    ayuda.textContent = "Prueba otras fechas o limpia los filtros para consultar todas las solicitudes.";
                }
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
                if (tipos[i] === "solicitudes" && ["cliente", "administrador"].includes(rol)) {
                    detalle.textContent = `${registro.origen || "Origen pendiente"} → ${resumenEntrega(registro)}`;
                    const ver = document.createElement("button");
                    ver.type = "button"; ver.className = "boton-secundario ver-solicitud";
                    ver.textContent = "Ver detalle →";
                    ver.setAttribute("aria-label", `Ver detalle de ${registro.referencia || registro.id}`);
                    ver.addEventListener("click", () => abrirDetalleSolicitud(registro.id));
                    ficha.append(ver);
                }
                bloque.append(ficha);
            }
            document.getElementById("lista-transportes").append(bloque);
        }
        document.getElementById("resumen-total").textContent = respuestas.reduce((total, respuesta, i) => total + respuesta[tipos[i]].length, 0);
        const registros = respuestas.flatMap((respuesta, i) => respuesta[tipos[i]]);
        document.getElementById("metrica-segunda").textContent = rol === "administrador" ? respuestas[1].rutas.length : registros.filter(item => grupoEstado(item.estado) === "pendiente").length;
        document.getElementById("metrica-tercera").textContent = rol === "administrador" ? cuentas.usuarios.filter(cuenta => cuenta.activo && cuenta.rol === "conductor").length : registros.filter(item => grupoEstado(item.estado) === "completado").length;
        if (rol === "administrador") {
            document.getElementById("resumen-total").textContent = respuestas[0].solicitudes.length;
            document.getElementById("resumen-ayuda").textContent = Object.keys(filtrosAdministracion).length ? "Según los filtros de estado y fecha" : "Solicitudes de todos los clientes";
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
const dialogoSolicitud = document.getElementById("detalle-solicitud");
const estadoDetalle = document.getElementById("estado-detalle-solicitud");
const contenidoDetalle = document.getElementById("contenido-detalle-solicitud");
const confirmarCancelacion = document.getElementById("confirmar-cancelacion");
let idDetalleSolicitud, versionDetalle = 0, cancelandoSolicitud = false, revisandoSolicitud = false;
const formularioRevision = document.getElementById("revision-administrativa");
function cerrarDetalleSolicitud() {
    versionDetalle++;
    idDetalleSolicitud = undefined;
    if (dialogoSolicitud.open) dialogoSolicitud.close();
    contenidoDetalle.replaceChildren();
    estadoDetalle.textContent = "";
}
function controlesDetalle(cargando) {
    for (const id of ["actualizar-detalle-solicitud", "solicitar-cancelacion", "confirmar-cancelacion-boton", "mantener-solicitud"]) document.getElementById(id).disabled = cargando;
    for (const campo of formularioRevision.querySelectorAll("button, input, select, textarea")) campo.disabled = cargando;
    contenidoDetalle.setAttribute("aria-busy", String(cargando));
}
function mostrarDetalleSolicitud(registro) {
    contenidoDetalle.replaceChildren();
    document.getElementById("titulo-detalle-solicitud").textContent = registro.referencia || registro.id;
    const insignia = document.createElement("span");
    insignia.className = `insignia-estado estado-${grupoEstado(registro.estado)}`;
    insignia.textContent = etiquetaEstado(registro.estado);
    contenidoDetalle.append(insignia);
    const datos = document.createElement("dl"); datos.className = "datos-solicitud";
    const campo = (nombre, valor) => {
        const titulo = document.createElement("dt"), texto = document.createElement("dd");
        titulo.textContent = nombre; texto.textContent = valor || "No disponible"; datos.append(titulo, texto);
    };
    campo("Referencia", registro.referencia || registro.id);
    campo("Origen / recogida", registro.origen);
    campo("Base de consolidación", "Yecla");
    campo("Destinatario", registro.destinatario || "Datos de entrega pendientes");
    campo("Entrega final", registro.destino || "Datos de entrega pendientes");
    campo("Localidad de entrega", registro.localidadEntrega || "Datos de entrega pendientes");
    campo("Código postal de entrega", registro.codigoPostalEntrega || "Datos de entrega pendientes");
    campo("Contacto de entrega", registro.contactoEntrega ? `${registro.contactoEntrega.nombre} · ${registro.contactoEntrega.telefono}` : "Datos de entrega pendientes");
    campo("Fecha solicitada", registro.fecha);
    campo("Fabricante", registro.fabricante);
    if (registro.motivoRechazo) campo("Motivo del rechazo", registro.motivoRechazo);
    campo("Contacto de recogida", registro.contactoRecogida ? `${registro.contactoRecogida.nombre} · ${registro.contactoRecogida.telefono}` : null);
    campo("Observaciones", registro.observaciones || "Sin observaciones");
    contenidoDetalle.append(datos);
    const encabezado = document.createElement("h4"); encabezado.textContent = "Mercancía"; contenidoDetalle.append(encabezado);
    const mercancia = document.createElement("ul"); mercancia.className = "mercancia-detalle";
    for (const item of registro.mobiliario || []) {
        const fila = document.createElement("li"); fila.textContent = `${item.cantidad} ${item.unidad || "unidades"} · ${item.descripcion}`; mercancia.append(fila);
    }
    if (!mercancia.children.length) { const fila = document.createElement("li"); fila.textContent = "Sin detalle de mercancía en esta solicitud."; mercancia.append(fila); }
    contenidoDetalle.append(mercancia);
    const titulo = document.createElement("h4"); titulo.textContent = "Historial"; contenidoDetalle.append(titulo);
    const historial = document.createElement("ol"); historial.className = "historial-detalle";
    const eventos = registro.historial?.length ? registro.historial : registro.creadaEn ? [{ estado: "pendiente_recogida", fecha: registro.creadaEn }] : [];
    for (const evento of eventos) {
        const fila = document.createElement("li");
        const fecha = new Date(evento.fecha);
        fila.textContent = `${etiquetaHistorial(evento)} · ${Number.isNaN(fecha.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" }).format(fecha)}`;
        historial.append(fila);
    }
    if (!historial.children.length) { const fila = document.createElement("li"); fila.textContent = "Sin cambios registrados."; historial.append(fila); }
    contenidoDetalle.append(historial);
    const pendiente = ["pendiente", "pendiente_recogida"].includes(registro.estado);
    formularioRevision.hidden = rolActual !== "administrador" || !["pendiente", "pendiente_recogida"].includes(registro.estado);
    formularioRevision.dataset.revision = registro.revision || 0;
    document.getElementById("revision-motivo").value = "";
    document.getElementById("revision-motivo").setCustomValidity("");
    for (const boton of formularioRevision.querySelectorAll('button[value="aceptar"], button[value="rechazar"]')) boton.hidden = !pendiente;
    document.getElementById("revision-motivo").hidden = !pendiente;
    document.querySelector('label[for="revision-motivo"]').hidden = !pendiente;
    document.getElementById("solicitar-cancelacion").hidden = !pendiente || rolActual !== "cliente";
    if (!pendiente && rolActual === "cliente") { const nota = document.createElement("p"); nota.className = "ayuda"; nota.textContent = registro.estado === "cancelada" ? "Solicitud cancelada. Sus datos y su historial se conservan." : "Esta solicitud ya no está pendiente y no se puede cancelar."; contenidoDetalle.append(nota); }
    dialogoSolicitud.scrollTop = 0;
    document.getElementById("titulo-detalle-solicitud").focus({ preventScroll: true });
}
function etiquetaHistorial(evento) {
    const transicion = evento.accion === "asignar_sede" ? `Asignación anterior de sede (histórica): ${evento.sede}` : evento.estadoAnterior ? `${etiquetaEstado(evento.estadoAnterior)} → ${etiquetaEstado(evento.estado)}` : etiquetaEstado(evento.estado);
    return `${transicion}${evento.responsable ? " · " + evento.responsable : ""}${evento.responsableId ? " #" + evento.responsableId : ""}${evento.motivo ? " · " + evento.motivo : ""}`;
}
async function cargarDetalleSolicitud() {
    const version = versionPanel, peticion = ++versionDetalle, id = idDetalleSolicitud;
    if (!id || !["cliente", "administrador"].includes(rolActual)) return;
    confirmarCancelacion.hidden = true;
    formularioRevision.hidden = true;
    document.getElementById("solicitar-cancelacion").hidden = true;
    contenidoDetalle.replaceChildren(); controlesDetalle(true); estadoDetalle.textContent = "Cargando solicitud…";
    try {
        const { registro } = await (rolActual === "administrador" ? window.api.detalleSolicitudAdministracion(id) : window.api.detalleSolicitud(id));
        if (version !== versionPanel || peticion !== versionDetalle) return;
        mostrarDetalleSolicitud(registro); estadoDetalle.textContent = "Detalle actualizado.";
    } catch (error) {
        if (version !== versionPanel || peticion !== versionDetalle) return;
        estadoDetalle.textContent = error.message;
    } finally { if (version === versionPanel && peticion === versionDetalle) controlesDetalle(false); }
}
function abrirDetalleSolicitud(id) {
    idDetalleSolicitud = id;
    document.getElementById("etiqueta-detalle").textContent = rolActual === "administrador" ? "REVISIÓN / ADMINISTRACIÓN" : "MI SOLICITUD";
    document.getElementById("titulo-detalle-solicitud").textContent = "Detalle de la solicitud";
    if (!dialogoSolicitud.open) dialogoSolicitud.showModal();
    cargarDetalleSolicitud();
}
dialogoSolicitud.addEventListener("close", () => { if (!dialogoSolicitud.open) { versionDetalle++; idDetalleSolicitud = undefined; } });
document.getElementById("cerrar-detalle-solicitud").addEventListener("click", cerrarDetalleSolicitud);
document.getElementById("actualizar-detalle-solicitud").addEventListener("click", cargarDetalleSolicitud);
document.getElementById("solicitar-cancelacion").addEventListener("click", () => {
    confirmarCancelacion.hidden = false;
    document.getElementById("mantener-solicitud").focus();
});
document.getElementById("mantener-solicitud").addEventListener("click", () => {
    confirmarCancelacion.hidden = true;
    document.getElementById("solicitar-cancelacion").focus();
});
document.getElementById("confirmar-cancelacion-boton").addEventListener("click", async () => {
    if (cancelandoSolicitud || !idDetalleSolicitud || rolActual !== "cliente") return;
    const version = versionPanel, peticion = versionDetalle, id = idDetalleSolicitud;
    cancelandoSolicitud = true; controlesDetalle(true); estadoDetalle.textContent = "Cancelando solicitud…";
    try {
        const { solicitud } = await window.api.cancelarSolicitud(id);
        if (version !== versionPanel) return;
        await cargarDatosPanel();
        if (version !== versionPanel || peticion !== versionDetalle) return;
        confirmarCancelacion.hidden = true; mostrarDetalleSolicitud(solicitud);
        estadoDetalle.textContent = "Solicitud cancelada. Se conserva su historial.";
    } catch (error) {
        if (version !== versionPanel || peticion !== versionDetalle) return;
        if (error.estado === 409) {
            await cargarDatosPanel();
            if (version !== versionPanel || peticion !== versionDetalle) return;
            await cargarDetalleSolicitud();
        }
        if (version === versionPanel && id === idDetalleSolicitud) estadoDetalle.textContent = error.message;
    } finally {
        cancelandoSolicitud = false;
        if (version === versionPanel && id === idDetalleSolicitud) controlesDetalle(false);
    }
});

document.getElementById("filtros-administracion").addEventListener("submit", evento => {
    evento.preventDefault();
    if (rolActual !== "administrador") return;
    filtrosAdministracion = Object.fromEntries([["estado", "filtro-estado"], ["desde", "filtro-desde"], ["hasta", "filtro-hasta"]].map(([clave, id]) => [clave, document.getElementById(id).value]).filter(([,valor]) => valor));
    cargarDatosPanel();
});
document.getElementById("limpiar-filtros").addEventListener("click", () => {
    document.getElementById("filtros-administracion").reset(); filtrosAdministracion = {};
    if (rolActual === "administrador") cargarDatosPanel();
});
document.getElementById("revision-motivo").addEventListener("input", evento => evento.target.setCustomValidity(""));
formularioRevision.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (revisandoSolicitud || rolActual !== "administrador" || !idDetalleSolicitud) return;
    const accion = evento.submitter?.value;
    const motivo = document.getElementById("revision-motivo");
    if (accion === "rechazar" && !motivo.value.trim()) { estadoDetalle.textContent = "Indica el motivo del rechazo que verá el cliente."; motivo.focus(); return; }
    const datos = { accion, revision: Number(formularioRevision.dataset.revision), ...(accion === "rechazar" ? { motivo: motivo.value } : {}) };
    const version = versionPanel, peticion = versionDetalle, id = idDetalleSolicitud;
    revisandoSolicitud = true; controlesDetalle(true); estadoDetalle.textContent = "Guardando revisión…";
    try {
        const { solicitud } = await window.api.revisarSolicitud(id, datos);
        if (version !== versionPanel) return;
        await cargarDatosPanel();
        if (version !== versionPanel || peticion !== versionDetalle) return;
        mostrarDetalleSolicitud(solicitud); estadoDetalle.textContent = "Revisión guardada. El cliente puede consultar el resultado.";
    } catch (error) {
        if (version !== versionPanel || peticion !== versionDetalle) return;
        if (error.estado === 409) { await cargarDatosPanel(); if (version !== versionPanel || peticion !== versionDetalle) return; await cargarDetalleSolicitud(); }
        if (version === versionPanel && id === idDetalleSolicitud) estadoDetalle.textContent = error.message;
    } finally { revisandoSolicitud = false; if (version === versionPanel && id === idDetalleSolicitud) controlesDetalle(false); }
});

document.getElementById("actualizar-panel").addEventListener("click", cargarDatosPanel);
async function mostrarUsuario(usuario) {
    const version = ++versionPanel;
    rolActual = undefined;
    filtrosAdministracion = {};
    document.getElementById("filtros-administracion").reset();
    document.getElementById("filtros-administracion").hidden = true;
    document.getElementById("acciones-cliente").hidden = true;
    cerrarDetalleSolicitud();
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
        document.getElementById("filtros-administracion").hidden = panel.rol !== "administrador";
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
        destinatario: campos.get("destinatario"), destino: campos.get("destino"), localidadEntrega: campos.get("localidadEntrega"), codigoPostalEntrega: campos.get("codigoPostalEntrega"),
        contactoEntrega: { nombre: campos.get("entregaNombre"), telefono: campos.get("entregaTelefono") },
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
