// Almacenamiento en memoria del hito 2. La lógica accede mediante estas operaciones.
const usuarios = [];
let siguienteId = 1;

function buscarPorEmail(email) { return usuarios.find(usuario => usuario.email === email); }
function buscarPorId(id) { return usuarios.find(usuario => usuario.id === Number(id)); }
function listar() { return usuarios.slice(); }
function crear(email, claveHash) {
    if (buscarPorEmail(email)) throw new Error("Ya existe un usuario con ese email");
    const usuario = { id: siguienteId++, email, clave: claveHash, activo: true };
    usuarios.push(usuario);
    return usuario;
}
function desactivar(id) {
    const usuario = buscarPorId(id);
    if (!usuario) throw new Error("Usuario no encontrado");
    usuario.activo = false;
    return usuario;
}
function limpiar() { usuarios.length = 0; siguienteId = 1; }

module.exports = { buscarPorEmail, buscarPorId, listar, crear, desactivar, limpiar };
