const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function comunicacion() {
    const cola = new Map(); let siguiente = 0;
    const contexto = { window: {}, setTimeout(accion, demora) {
        assert.equal(demora, 5000); cola.set(++siguiente, accion); return siguiente;
    }, clearTimeout(id) { cola.delete(id); } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../cliente/rest.js'), 'utf8'), contexto);
    return { api: contexto.window.api, cola, async ciclo() {
        const [id, accion] = cola.entries().next().value;
        cola.delete(id); await accion();
    } };
}

test('Actualización: pausa en edición/oculto, recupera errores y nunca solapa consultas', async () => {
    const c = comunicacion(); let disponible = false, lecturas = 0, fallos = 0;
    const recibidos = [];
    const detener = c.api.observar(async () => {
        lecturas++; assert.equal(c.cola.size, 0);
        if (lecturas === 1) throw new Error('Sin red');
        return { estado: 'aceptada' };
    }, datos => recibidos.push(datos.estado), { disponible: () => disponible, fallo: () => fallos++ });
    await c.ciclo(); assert.equal(lecturas, 0);
    disponible = true;
    await c.ciclo(); assert.equal(fallos, 1); assert.equal(c.cola.size, 1);
    await c.ciclo(); assert.deepEqual(recibidos, ['aceptada']);
    detener(); assert.equal(c.cola.size, 0);
});

test('Actualización: logout descarta una respuesta pendiente y no reprograma', async () => {
    const c = comunicacion(); let completar, recibidos = 0;
    const detener = c.api.observar(() => new Promise(resolve => { completar = resolve; }), () => recibidos++);
    const pendiente = c.ciclo();
    detener(); completar({ privado: true }); await pendiente;
    assert.equal(recibidos, 0); assert.equal(c.cola.size, 0);
});

test('Actualización: abrir un formulario durante la lectura descarta su aplicación', async () => {
    const c = comunicacion(); let completar, disponible = true, recibidos = 0;
    const detener = c.api.observar(() => new Promise(resolve => { completar = resolve; }), () => recibidos++, { disponible: () => disponible });
    const pendiente = c.ciclo(); disponible = false;
    completar({ estado: 'completada' }); await pendiente;
    assert.equal(recibidos, 0); assert.equal(c.cola.size, 1); detener();
});

test('Presentación mantiene URLs y transporte fuera de los componentes', () => {
    for (const archivo of ['presentacion.js', 'rutas.js', 'entregas.js']) {
        const codigo = fs.readFileSync(path.join(__dirname, '../cliente', archivo), 'utf8');
        assert.doesNotMatch(codigo, /\bfetch\s*\(|api\.peticion\(|\/administracion\/|\/conductor\/rutas\//);
    }
});
