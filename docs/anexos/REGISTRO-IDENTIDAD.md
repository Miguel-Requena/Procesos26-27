# Nombre y primer apellido en el registro

Crear cuenta pide nombre, primer apellido, correo y contraseña. Nombre y primer apellido son obligatorios en el formulario y en POST /api/registro, se validan como texto no vacío de hasta 100 caracteres sin caracteres de control y se normalizan los espacios. La confirmación de correo y los permisos no cambian.

La identidad se guarda en la cuenta. MongoDB conserva los campos nombre y primerApellido; SQLite añade columnas con valores vacíos para cuentas anteriores. No se deducen nombres del correo ni se bloquea el acceso de cuentas antiguas sin identidad. Las operaciones internas de creación siguen siendo compatibles con cuentas legadas; el registro público siempre valida ambos campos.

El formulario de conductores no pide nombre: lo obtiene de nombre y primer apellido de la cuenta seleccionada. El catálogo y las nuevas rutas priorizan siempre la identidad de la cuenta. Los nombres ya guardados para cuentas antiguas sin identidad se conservan como alternativa compatible; no se vuelven a pedir en el formulario.

Google solicita también el ámbito profile. Las nuevas cuentas guardan given_name y family_name. Si Google no los facilita, se indica que hay que utilizar el formulario de registro antes de vincular Google; no se crea una cuenta incompleta. Las cuentas Google ya existentes conservan su acceso.

Pruebas de validación HTTP, persistencia, sesión, permisos, compatibilidad y nombres de conductor. CI comprueba también la persistencia de nombre y apellido entre procesos con MongoDB real.
