(() => {
    const dialog = document.createElement("dialog"); dialog.id="ruta-conductor";
    dialog.setAttribute("aria-labelledby","titulo-ruta-conductor");
    const titulo=document.createElement("h3"); titulo.id="titulo-ruta-conductor"; titulo.textContent="Mi ruta y entregas";
    const cerrar=document.createElement("button"); cerrar.type="button"; cerrar.textContent="Cerrar"; cerrar.className="boton-secundario";
    const mensaje=document.createElement("p"); mensaje.setAttribute("role","status"); mensaje.setAttribute("aria-live","polite");
    const contenido=document.createElement("div");
    dialog.append(titulo,cerrar,mensaje,contenido); document.body.append(dialog);
    let conductor=false, version=0, ruta, pendiente, guardando=false;
    const texto=(padre,valor)=>{const p=document.createElement("p");p.textContent=valor;padre.append(p);};
    const estado=s=>({planificada:"Planificada",en_transito:"En tránsito",completada:"Entregada",incidencia:"Con incidencia"}[s] || s);
    function boton(padre,etiqueta,accion) {
        const b=document.createElement("button"); b.type="button"; b.className="boton-secundario"; b.textContent=etiqueta;
        b.addEventListener("click",accion); padre.append(b); return b;
    }
    function pintar() {
        contenido.replaceChildren();
        texto(contenido,`${ruta.referencia} · ${ruta.fecha} · Salida: ${ruta.sede} · ${ruta.vehiculo?.matricula || "Vehículo pendiente"}`);
        texto(contenido,`Estado de la ruta: ${ruta.estado === "completada" ? "Completada" : estado(ruta.estado)}`);
        if (!ruta.paradas?.length) {texto(contenido,"Esta ruta antigua no tiene un itinerario completo. Contacta con administración.");return;}
        if (ruta.estado === "planificada") boton(contenido,"Iniciar ruta",()=>guardar({accion:"iniciar"}));
        if (ruta.estado === "completada") texto(contenido,"Todas las entregas están completadas. Vehículo y conductor liberados para esta fecha.");
        const lista=document.createElement("ol");
        for(const p of ruta.paradas) {
            const li=document.createElement("li");
            texto(li,`${p.referencia} · ${p.destinatario}`);
            texto(li,`${p.direccion}, ${p.codigoPostal} ${p.localidad}`);
            texto(li,`${p.contacto?.nombre || "Contacto"} · ${p.contacto?.telefono || "Teléfono pendiente"}`);
            for(const m of p.mobiliario || []) texto(li,`${m.cantidad} ${m.unidad} · ${m.descripcion}`);
            if (p.observaciones) texto(li,p.observaciones);
            texto(li,`Estado: ${estado(p.estado || "planificada")}`);
            if (p.motivoIncidencia) texto(li,`Incidencia registrada: ${p.motivoIncidencia}`);
            if (ruta.estado === "en_transito" && ["en_transito","incidencia"].includes(p.estado)) {
                boton(li,p.estado === "incidencia" ? "Resolver como entregada" : "Marcar entregada",()=>guardar({accion:"entregar",solicitudId:p.solicitudId}));
                if (p.estado !== "incidencia") {
                    const label=document.createElement("label"), motivo=document.createElement("textarea");
                    motivo.id=`incidencia-${p.solicitudId}`; motivo.maxLength=1000; label.htmlFor=motivo.id; label.textContent="Motivo de la incidencia";
                    li.append(label,motivo);
                    boton(li,"Registrar incidencia",()=>{
                        if (!motivo.value.trim()) {mensaje.textContent="Indica el motivo de la incidencia.";motivo.focus();return;}
                        guardar({accion:"incidencia",solicitudId:p.solicitudId,motivo:motivo.value.trim()});
                    });
                }
            }
            lista.append(li);
        }
        contenido.append(lista);
    }
    async function guardar(entrada) {
        if (guardando || pendiente || !conductor) return;
        pendiente={...entrada,revision:ruta.revision,clave:crypto.randomUUID()};
        await enviar();
    }
    async function enviar() {
        if (guardando || !pendiente || !conductor) return;
        const vista=version, id=ruta.id; guardando=true;
        for(const b of contenido.querySelectorAll("button, textarea")) b.disabled=true;
        mensaje.replaceChildren(); mensaje.textContent="Guardando; espera la confirmación del servidor…";
        try {
            const respuesta=await window.api.peticion(`/conductor/rutas/${encodeURIComponent(id)}/actualizaciones`,{method:"POST",body:JSON.stringify(pendiente)});
            if (vista !== version || !conductor) return;
            ruta=respuesta.ruta; pendiente=undefined; pintar(); mensaje.textContent="Actualización confirmada y guardada.";
            await cargarDatosPanel();
        } catch(error) {
            if (vista !== version || !conductor) return;
            mensaje.textContent=error.estado ? error.message : "No se ha podido confirmar el resultado. Reintenta la misma operación para comprobarlo sin duplicarla.";
            if (!error.estado || error.estado >= 500) boton(mensaje,"Reintentar operación",enviar);
            else {pendiente=undefined;boton(mensaje,"Actualizar itinerario",()=>abrir(id));}
        } finally {if(vista === version) guardando=false;}
    }
    async function abrir(id) {
        if (!conductor || guardando) return;
        const vista=++version; pendiente=undefined; ruta=undefined;
        contenido.replaceChildren(); mensaje.replaceChildren(); mensaje.textContent="Cargando itinerario…";
        if(!dialog.open) dialog.showModal();
        try {
            const respuesta=await window.api.peticion(`/conductor/rutas/${encodeURIComponent(id)}`);
            if(vista !== version || !conductor) return;
            ruta=respuesta.ruta; pintar(); mensaje.textContent="";
        } catch(error) {if(vista===version) mensaje.textContent=error.message;}
    }
    cerrar.addEventListener("click",()=>{if(!guardando) dialog.close();});
    dialog.addEventListener("cancel",evento=>{if(guardando) evento.preventDefault();});
    dialog.addEventListener("close",()=>{++version;contenido.replaceChildren();mensaje.replaceChildren();ruta=undefined;pendiente=undefined;guardando=false;});
    window.entregasPanel={abrir,actualizar(rol){
        conductor=rol === "conductor";
        if(!conductor) {++version;guardando=false;pendiente=undefined;ruta=undefined;contenido.replaceChildren();mensaje.replaceChildren();if(dialog.open)dialog.close();}
    }};
})();
