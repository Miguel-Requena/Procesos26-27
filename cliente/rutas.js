(() => {
    const seccion = document.getElementById("planificacion-rutas"), form = document.getElementById("form-ruta");
    const estado = document.getElementById("estado-planificacion"), selector = document.getElementById("solicitud-para-ruta");
    const lista = document.getElementById("paradas-ruta"), dialog = document.getElementById("itinerario-ruta");
    const partesFecha = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(p=>[p.type,p.value]));
    form.elements.fecha.min = `${partesFecha.year}-${partesFecha.month}-${partesFecha.day}`;
    let version = 0, versionDetalle = 0, solicitudes = [], rutas = [], vehiculos = [], conductores = [], elegidas = [], administracion = false, guardando = false;
    const opcion = (valor, texto) => { const o = document.createElement("option"); o.value = valor; o.textContent = texto; return o; };
    const entrega = s => [s.destino, s.codigoPostalEntrega, s.localidadEntrega].filter(Boolean).join(", ");
    function controles() {
        for (const control of seccion.querySelectorAll("input, select, button")) control.disabled = guardando;
    }
    function recursos() {
        const fecha = form.elements.fecha.value;
        const ocupadas = rutas.filter(r => r.fecha === fecha && !["cancelada", "finalizada", "completada"].includes(r.estado));
        const anteriorV = form.elements.vehiculoId.value, anteriorC = form.elements.conductorRecursoId.value;
        form.elements.vehiculoId.replaceChildren(opcion("", "Seleccionar camión disponible"));
        form.elements.conductorRecursoId.replaceChildren(opcion("", "Seleccionar conductor disponible"));
        for (const v of vehiculos.filter(v => v.sede === "Yecla" && !ocupadas.some(r => r.vehiculoId === v.id))) form.elements.vehiculoId.append(opcion(v.id, `${v.matricula} · ${v.capacidad} ${v.unidadCapacidad}`));
        for (const c of conductores.filter(c => c.sede === "Yecla" && !ocupadas.some(r => r.conductorId === c.usuarioId))) form.elements.conductorRecursoId.append(opcion(c.id, c.email));
        form.elements.vehiculoId.value = anteriorV; form.elements.conductorRecursoId.value = anteriorC;
    }
    function paradas() {
        selector.replaceChildren(opcion("", "Seleccionar solicitud aceptada")); lista.replaceChildren();
        for (const s of solicitudes.filter(s => !elegidas.includes(s.id))) selector.append(opcion(s.id, `${s.referencia} · ${entrega(s)}`));
        elegidas.forEach((id, indice) => {
            const s = solicitudes.find(s => s.id === id), li = document.createElement("li"), texto = document.createElement("p");
            texto.textContent = `${s.referencia} · ${entrega(s)}`; li.append(texto);
            for (const [etiqueta, accion, deshabilitado] of [
                ["Subir", () => { [elegidas[indice-1],elegidas[indice]] = [id,elegidas[indice-1]]; }, indice === 0],
                ["Bajar", () => { [elegidas[indice+1],elegidas[indice]] = [id,elegidas[indice+1]]; }, indice === elegidas.length-1],
                ["Quitar", () => { elegidas.splice(indice,1); }, false]
            ]) {
                const boton = document.createElement("button"); boton.type = "button"; boton.className = "boton-secundario";
                boton.textContent = etiqueta; boton.disabled = deshabilitado; boton.setAttribute("aria-label", `${etiqueta} parada ${indice+1}`);
                boton.addEventListener("click", () => { accion(); paradas(); }); li.append(boton);
            }
            lista.append(li);
        });
    }
    async function detalle(id) {
        const carga = ++versionDetalle, vista = version, contenido = document.getElementById("contenido-itinerario");
        contenido.textContent = "Cargando itinerario…"; if (!dialog.open) dialog.showModal();
        try {
            const { ruta } = await window.api.peticion(`/administracion/rutas/${encodeURIComponent(id)}`);
            if (carga !== versionDetalle || vista !== version || !administracion) return;
            contenido.replaceChildren();
            const cabecera = document.createElement("p"); cabecera.textContent = `${ruta.referencia} · ${ruta.fecha} · Salida: ${ruta.sede} · ${ruta.vehiculo.matricula} · ${ruta.conductor.email}`; contenido.append(cabecera);
            const orden = document.createElement("ol");
            for (const p of ruta.paradas) {
                const li = document.createElement("li"), direccion = document.createElement("p"), contacto = document.createElement("p");
                direccion.textContent = `${p.referencia} · ${p.destinatario} · ${p.direccion}, ${p.codigoPostal} ${p.localidad}`;
                contacto.textContent = `${p.contacto.nombre} · ${p.contacto.telefono}`; li.append(direccion,contacto);
                for (const m of p.mobiliario || []) { const mercancia = document.createElement("p"); mercancia.textContent = `${m.cantidad} ${m.unidad} · ${m.descripcion}`; li.append(mercancia); }
                if (p.observaciones) { const nota = document.createElement("p"); nota.textContent = p.observaciones; li.append(nota); }
                orden.append(li);
            }
            contenido.append(orden);
        } catch (error) { if (carga === versionDetalle && vista === version) contenido.textContent = error.message; }
    }
    async function cargar(conservar = false) {
        const carga = ++version;
        if (!administracion) return;
        estado.textContent = "Cargando planificación…";
        form.hidden = true; document.getElementById("lista-rutas-planificadas").replaceChildren();
        try {
            const [v,c,u,s,r] = await Promise.all([
                window.api.peticion("/administracion/vehiculos?asignables=true"), window.api.peticion("/administracion/conductores?asignables=true"),
                window.api.listarUsuarios(), window.api.listarSolicitudesAdministracion({estado:"aceptada"}), window.api.consultarTransportes("rutas")
            ]);
            if (carga !== version || !administracion) return;
            vehiculos = v.vehiculos; conductores = c.conductores.map(c => ({...c,email:u.usuarios.find(u=>u.id===c.usuarioId)?.email || "Conductor"}));
            solicitudes = s.solicitudes; rutas = r.rutas;
            elegidas = conservar ? elegidas.filter(id => solicitudes.some(s=>s.id===id)) : [];
            recursos(); paradas();
            const contenedor = document.getElementById("lista-rutas-planificadas");
            for (const ruta of rutas) {
                const p = document.createElement("p"), boton = document.createElement("button");
                p.textContent = `${ruta.referencia} · ${ruta.fecha} · ${ruta.estado} `;
                boton.textContent = "Ver itinerario"; boton.type = "button"; boton.className = "boton-secundario";
                boton.addEventListener("click", () => detalle(ruta.id)); p.append(boton); contenedor.append(p);
            }
            if (!rutas.length) contenedor.textContent = "Todavía no hay rutas planificadas.";
            estado.textContent = !solicitudes.length ? "No hay solicitudes aceptadas para planificar." : !vehiculos.some(v=>v.sede==="Yecla") || !conductores.some(c=>c.sede==="Yecla") ? "Registra un camión y un conductor disponibles en Yecla para planificar." : "Añade las solicitudes en el orden de entrega.";
            form.hidden = false;
        } catch (error) { if (carga === version) estado.textContent = error.message; }
    }
    form.elements.fecha.addEventListener("change", recursos);
    document.getElementById("agregar-parada").addEventListener("click", () => { if (selector.value && !elegidas.includes(selector.value)) { elegidas.push(selector.value); paradas(); } });
    document.getElementById("actualizar-planificacion").addEventListener("click", () => cargar(true));
    document.getElementById("cerrar-itinerario").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => { ++versionDetalle; });
    form.addEventListener("submit", async evento => {
        evento.preventDefault(); if (guardando || !administracion) return;
        if (!elegidas.length) { estado.textContent = "Añade al menos una parada."; return; }
        const vista = version, entrada = {fecha:form.elements.fecha.value,sede:"Yecla",vehiculoId:form.elements.vehiculoId.value,conductorRecursoId:form.elements.conductorRecursoId.value,solicitudes:[...elegidas]};
        guardando = true; controles(); estado.textContent = "Guardando planificación…";
        try {
            const {ruta} = await window.api.peticion("/administracion/rutas", {method:"POST",body:JSON.stringify(entrada)});
            if (vista !== version || !administracion) return;
            elegidas = []; await cargar(); estado.textContent = "Ruta planificada. Sus solicitudes ya figuran como planificadas.";
            await cargarDatosPanel(); if (administracion) detalle(ruta.id);
        } catch (error) {
            if (vista !== version || !administracion) return;
            if (error.estado === 409) await cargar(true);
            estado.textContent = error.message;
        } finally { guardando = false; controles(); paradas(); }
    });
    window.rutasPanel = { actualizar(rol) {
        administracion = rol === "administrador"; seccion.hidden = !administracion;
        if (administracion) cargar(true);
        else { ++version; ++versionDetalle; elegidas = []; solicitudes = []; rutas = []; vehiculos = []; conductores = []; form.reset(); lista.replaceChildren(); document.getElementById("lista-rutas-planificadas").replaceChildren(); if (dialog.open) dialog.close(); }
    } };
})();
