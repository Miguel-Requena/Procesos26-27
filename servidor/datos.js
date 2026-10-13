const { urlBaseDatos } = require("./configuracion");
const adaptador = urlBaseDatos ? require("./datos-postgres") : require("./datos-sqlite");
// Un único contrato asíncrono: la lógica desconoce qué motor está usando.
module.exports = Object.fromEntries(Object.entries(adaptador).map(([nombre, operacion]) => [
    nombre, async (...argumentos) => operacion(...argumentos)
]));
