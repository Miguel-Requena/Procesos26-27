process.env.GMAIL_USER = "pruebas@example.com";
process.env.GMAIL_APP_PASSWORD = "prueba-simulada";
require("./correo").enviar = async () => {};
const ayudas = require("./ayudas-pruebas.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const app = require("./api");
const logica = require("./logica");

let servidor;
let base;
test.before(async () => {
    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => new Promise(resolve => servidor.close(resolve)));
test.beforeEach(() => logica.limpiarUsuarios());

async function login(email = "ana@example.com", administrador = false) {
    if (administrador) await ayudas.administrador(email, "clave-prueba");
    else await ayudas.registrarConfirmado(email, "clave-prueba");
    const res = await fetch(`${base}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, clave: "clave-prueba" })
    });
    assert.equal(res.status, 200);
    return res.headers.get("set-cookie").split(";")[0];
}

test("recupera el usuario con la misma cookie en peticiones sucesivas", async () => {
    const cookie = await login();
    for (let i = 0; i < 2; i++) {
        const res = await fetch(`${base}/api/sesion`, { headers: { cookie } });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("cache-control"), "no-store");
        assert.equal((await res.json()).usuario.email, "ana@example.com");
    }
});

test("logout invalida el token incluso si se vuelve a enviar la cookie antigua", async () => {
    const cookie = await login();
    const logout = await fetch(`${base}/api/logout`, { method: "POST", headers: { cookie } });
    assert.equal(logout.status, 200);
    const res = await fetch(`${base}/api/sesion`, { headers: { cookie } });
    assert.equal(res.status, 401);
});

test("rechaza consultas de sesión anónimas, falsificadas y de usuarios eliminados", async () => {
    assert.equal((await fetch(`${base}/api/sesion`)).status, 401);
    assert.equal((await fetch(`${base}/api/sesion`, { headers: { cookie: "sesion=falsa" } })).status, 401);
    const cookie = await login();
    await logica.eliminarUsuario(1, { id: 1 });
    assert.equal((await fetch(`${base}/api/sesion`, { headers: { cookie } })).status, 401);
});

test("las tres rutas de usuarios rechazan peticiones sin sesión o con token falso", async () => {
    for (const cookie of ["", "sesion=inventada"]) {
        for (const [ruta, method] of [["/usuarios", "GET"], ["/usuarios/1/activo", "GET"], ["/usuarios/1", "DELETE"]]) {
            const res = await fetch(`${base}/api${ruta}`, { method, headers: { cookie } });
            assert.equal(res.status, 401);
        }
    }
});

test("permite peticiones de administrador y rechaza el acceso tras logout", async () => {
    const cookie = await login("admin@example.com", true);
    const usuarios = await fetch(`${base}/api/usuarios`, { headers: { cookie } });
    assert.equal(usuarios.status, 200);
    assert.equal((await usuarios.json()).usuarios.length, 1);
    const activo = await fetch(`${base}/api/usuarios/1/activo`, { headers: { cookie } });
    assert.equal(activo.status, 200);
    assert.deepEqual(await activo.json(), { activo: true });
    await fetch(`${base}/api/logout`, { method: "POST", headers: { cookie } });
    assert.equal((await fetch(`${base}/api/usuarios`, { headers: { cookie } })).status, 401);
});

test("eliminar una cuenta invalida su acceso a las rutas protegidas", async () => {
    const cookie = await login();
    const res = await fetch(`${base}/api/usuarios/1`, { method: "DELETE", headers: { cookie } });
    assert.equal(res.status, 200);
    assert.equal((await fetch(`${base}/api/usuarios`, { headers: { cookie } })).status, 401);
});

test("registro público y login fallido devuelven JSON sin claves ni cookies de sesión", async () => {
    const res = await fetch(`${base}/api/registro`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com", clave: "secreto", confirmado: true, activo: true, rol: "administrador" })
    });
    assert.equal(res.status, 201);
    const usuario = (await res.json()).usuario;
    assert.equal(Object.hasOwn(usuario, "clave"), false);
    assert.equal(usuario.activo, false);
    assert.equal(usuario.rol, "cliente");
    const pendiente = await fetch(`${base}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com", clave: "secreto" })
    });
    assert.equal(pendiente.status, 401);
    assert.equal(pendiente.headers.get("set-cookie"), null);
    const loginIncorrecto = await fetch(`${base}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com", clave: "incorrecta" })
    });
    assert.equal(loginIncorrecto.status, 401);
    assert.equal(loginIncorrecto.headers.get("set-cookie"), null);
    assert.equal((await fetch(`${base}/api/salud`)).status, 200);
});

test("el servidor impide escalar roles y aplicar operaciones administrativas a usuarios normales", async () => {
    const registro = await fetch(`${base}/api/registro`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "roles@example.com", clave: "clave-prueba", rol: "administrador" })
    });
    assert.equal((await registro.json()).usuario.rol, "cliente");
    await require("./datos").configurarCuentaPrueba(1);
    const entrada = await fetch(`${base}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "roles@example.com", clave: "clave-prueba" })
    });
    const cookie = entrada.headers.get("set-cookie").split(";")[0];
    const otro = await ayudas.registrarConfirmado("otro@example.com", "clave-prueba");
    for (const [ruta, method] of [["/usuarios", "GET"], ["/usuarios/1/activo", "GET"], [`/usuarios/${otro.id}`, "DELETE"]]) {
        assert.equal((await fetch(`${base}/api${ruta}`, { method, headers: { cookie } })).status, 403);
    }
    const adminCookie = await login("admin@example.com", true);
    assert.equal((await fetch(`${base}/api/usuarios`, { headers: { cookie: adminCookie } })).status, 200);
    assert.equal((await fetch(`${base}/api/usuarios/${otro.id}`, { method: "DELETE", headers: { cookie: adminCookie } })).status, 200);
});

test("cada perfil solo accede a su panel, incluso con un rol falsificado en cabeceras", async () => {
    const datos = require("./datos");
    for (const rol of ["cliente", "conductor", "administrador"]) {
        const usuario = await ayudas.registrarConfirmado(`${rol}@example.com`, "clave-prueba", rol);
        const entrada = await fetch(`${base}/api/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: usuario.email, clave: "clave-prueba", rol: "administrador" })
        });
        const cookie = entrada.headers.get("set-cookie").split(";")[0];
        for (const destino of ["cliente", "conductor", "administrador"]) {
            const respuesta = await fetch(`${base}/api/panel/${destino}`, { headers: { cookie, "x-rol": destino } });
            assert.equal(respuesta.status, destino === rol ? 200 : 403);
            const cuerpo = await respuesta.json();
            if (destino === rol) {
                assert.equal(cuerpo.usuario.id, usuario.id);
                assert.equal(cuerpo.rol, rol);
                assert.equal(Object.hasOwn(cuerpo.usuario, "clave"), false);
            }
        }
        if (rol !== "administrador") assert.equal((await fetch(`${base}/api/usuarios`, { headers: { cookie } })).status, 403);
        const nuevoRol = rol === "cliente" ? "conductor" : "cliente";
        await datos.asignarRol(usuario.id, nuevoRol);
        assert.equal((await fetch(`${base}/api/panel/${rol}`, { headers: { cookie } })).status, 403);
        assert.equal((await fetch(`${base}/api/panel/${nuevoRol}`, { headers: { cookie } })).status, 200);
        await logica.eliminarUsuario(usuario.id, usuario);
        assert.equal((await fetch(`${base}/api/panel/${nuevoRol}`, { headers: { cookie } })).status, 401);
    }
    for (const rol of ["cliente", "conductor", "administrador"]) {
        assert.equal((await fetch(`${base}/api/panel/${rol}`)).status, 401);
        assert.equal((await fetch(`${base}/api/panel/${rol}`, { headers: { cookie: "sesion=falsa" } })).status, 401);
    }
});

test("solo administración habilita conductores confirmados y no puede promover administradores desde la web", async () => {
    const datos = require("./datos");
    const admin = await ayudas.administrador("jefe@example.com", "clave-prueba");
    const cliente = await ayudas.registrarConfirmado("equipo@example.com", "clave-prueba");
    const pendiente = await logica.registrarUsuario("pendiente@example.com", "clave-prueba");
    async function cookie(email) {
        const res = await fetch(`${base}/api/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,clave:"clave-prueba"}) });
        return res.headers.get("set-cookie").split(";")[0];
    }
    const cookieAdmin = await cookie(admin.email), cookieCliente = await cookie(cliente.email);
    async function cambiar(id, rol, sesion) {
        return fetch(`${base}/api/usuarios/${id}/perfil`, { method:"PATCH", headers:{"Content-Type":"application/json",cookie:sesion}, body:JSON.stringify({rol}) });
    }
    assert.equal((await cambiar(cliente.id,"conductor","")).status,401);
    assert.equal((await cambiar(cliente.id,"conductor",cookieCliente)).status,403);
    assert.equal((await cambiar(cliente.id,"administrador",cookieAdmin)).status,400);
    assert.equal((await cambiar(pendiente.id,"conductor",cookieAdmin)).status,409);
    assert.equal((await cambiar(admin.id,"cliente",cookieAdmin)).status,409);
    const cambio = await cambiar(cliente.id,"conductor",cookieAdmin);
    assert.equal(cambio.status,200);
    assert.equal((await cambio.json()).usuario.rol,"conductor");
    assert.equal((await datos.buscarPorId(cliente.id)).rol,"conductor");
    assert.equal((await fetch(`${base}/api/panel/conductor`,{headers:{cookie:cookieCliente}})).status,200);
    assert.equal((await fetch(`${base}/api/panel/cliente`,{headers:{cookie:cookieCliente}})).status,403);
    assert.equal((await cambiar(cliente.id,"cliente",cookieAdmin)).status,200);
    await logica.eliminarUsuario(cliente.id,admin);
    assert.equal((await cambiar(cliente.id,"conductor",cookieAdmin)).status,409);
    await datos.asignarRol(admin.id,"cliente");
    assert.equal((await cambiar(pendiente.id,"conductor",cookieAdmin)).status,403);
});

test("solicitudes y rutas se filtran en servidor y sus detalles no revelan otros propietarios", async () => {
    const datos = require("./datos"), cookies = {};
    const perfiles = ["cliente","cliente","conductor","conductor","administrador"];
    for (let i=0;i<perfiles.length;i++) {
        const u = await ayudas.registrarConfirmado(`cuenta${i}@example.com`,"clave-prueba",perfiles[i]);
        const entrada=await fetch(`${base}/api/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:u.email,clave:"clave-prueba"})});
        cookies[i]=entrada.headers.get("set-cookie").split(";")[0];
    }
    for (const [tipo,propietario,ids] of [["solicitudes","clienteId",[1,2]],["rutas","conductorId",[3,4]]]) {
        for (let i=0;i<2;i++) await datos.configurarTransportePrueba(tipo,{
            id:`registro-${i}`, [propietario]:ids[i], referencia:`REF-${i}`,origen:"Yecla",destino:"Rubí",fecha:"2026-11-10",estado:"pendiente"
        });
        const propio=tipo==="solicitudes" ? 0 : 2;
        async function get(ruta,sesion=cookies[propio]) {return fetch(`${base}/api/${tipo}${ruta}`,{headers:{cookie:sesion}});}
        const lista=await get("?clienteId=2&conductorId=4&rol=administrador");
        assert.equal(lista.status,200);
        assert.deepEqual((await lista.json())[tipo].map(r=>r.id),["registro-0"]);
        const detalle=await get("/registro-0");
        assert.equal(detalle.status,200);
        const cuerpo=await detalle.json();
        assert.deepEqual(Object.keys(cuerpo.registro).sort(),["destino","estado","fecha","id","origen","referencia"]);
        assert.equal((await get("/registro-1")).status,404);
        assert.equal((await get("/inexistente")).status,404);
        assert.equal((await get("",cookies[tipo==="solicitudes" ? 2 : 0])).status,403);
        assert.equal((await get("","")).status,401);
        assert.equal((await get("","sesion=falsa")).status,401);
        const todos=await get("",cookies[4]);
        assert.equal((await todos.json())[tipo].length,2);
        assert.equal((await get("/registro-1",cookies[4])).status,200);
    }
    await datos.asignarRol(1,"conductor");
    assert.equal((await fetch(`${base}/api/solicitudes`,{headers:{cookie:cookies[0]}})).status,403);
    await logica.eliminarUsuario(3,{id:3});
    assert.equal((await fetch(`${base}/api/rutas`,{headers:{cookie:cookies[2]}})).status,401);
});
