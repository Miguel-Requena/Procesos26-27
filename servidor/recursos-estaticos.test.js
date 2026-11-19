const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Los recursos locales referenciados por HTML y CSS existen y las fuentes conservan licencia', () => {
    const cliente = path.join(__dirname, '../cliente');
    for (const nombre of ['index.html', 'estilos.css']) {
        const contenido = fs.readFileSync(path.join(cliente, nombre), 'utf8');
        const rutas = nombre.endsWith('.html')
            ? [...contenido.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m => m[1])
            : [...contenido.matchAll(/url\(["']?([^\s)'" ]+)["']?\)/g)].map(m => m[1]);
        for (const ruta of rutas) {
            if (/^(?:#|\/|[a-z]+:)/i.test(ruta)) continue;
            const destino = path.resolve(cliente, ruta.split(/[?#]/)[0]);
            assert.ok(destino.startsWith(cliente + path.sep), `Recurso fuera del cliente: ${ruta}`);
            assert.ok(fs.existsSync(destino), `${nombre} referencia un archivo inexistente: ${ruta}`);
        }
    }
    for (const licencia of ['OFL-Manrope.txt', 'OFL-DM-Serif-Display.txt']) {
        assert.match(fs.readFileSync(path.join(cliente, 'fuentes', licencia), 'utf8'), /SIL OPEN FONT LICENSE/i);
    }
});
