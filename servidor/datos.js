const { urlBaseDatos } = require("./configuracion");
// SQLite se reserva para pruebas aisladas; la aplicación usa MongoDB.
const adaptador = urlBaseDatos ? require("./datos-mongodb") : require("./datos-sqlite");
// Un único contrato asíncrono: la lógica desconoce qué motor está usando.
module.exports = Object.fromEntries(Object.entries(adaptador).map(([nombre, operacion]) => [
    nombre, async (...argumentos) => operacion(...argumentos)
]));
