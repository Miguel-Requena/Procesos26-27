from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

out = Path(__file__).parent / 'documentacion'
out.mkdir(exist_ok=True)
d = Document()
s = d.sections[0]
s.page_width, s.page_height = Cm(21), Cm(29.7)
s.top_margin = s.bottom_margin = Cm(2)
s.left_margin = s.right_margin = Cm(2.2)
for name in ['Normal', 'Title', 'Subtitle', 'Heading 1', 'Heading 2', 'Heading 3']:
    st = d.styles[name]
    st.font.name = 'Calibri'
    st.font.color.rgb = RGBColor(0,0,0)
d.styles['Normal'].font.size = Pt(10.5)
d.styles['Normal'].paragraph_format.space_after = Pt(6)
d.styles['Normal'].paragraph_format.line_spacing = 1.08
for name,size in [('Title',25),('Heading 1',17),('Heading 2',13),('Heading 3',11)]:
    d.styles[name].font.size=Pt(size)
    d.styles[name].paragraph_format.space_before=Pt(10)
    d.styles[name].paragraph_format.space_after=Pt(6)
d.core_properties.title='Especificación del Sprint 2 de TransDrakkar'
d.core_properties.author='Miguel Requena López'
def p(t): return d.add_paragraph(t)
def h(t): d.add_heading(t,1)
def sub(t): d.add_heading(t,2)
def page(): d.add_page_break()
def criteria(items):
    for ident,txt in items:
        q=d.add_paragraph(); q.add_run(ident+' ').bold=True; q.add_run(txt)
def table(headers,rows,widths):
    t=d.add_table(rows=1,cols=len(headers));t.autofit=False
    for c,w in zip(t.columns,widths): c.width=Cm(w)
    for c,txt in zip(t.rows[0].cells,headers): c.text=txt
    for row in rows:
        for c,txt in zip(t.add_row().cells,row):c.text=str(txt)
    for i,row in enumerate(t.rows):
        for c,w in zip(row.cells,widths):
            c.width=Cm(w)
            tcPr=c._tc.get_or_add_tcPr()
            borders=OxmlElement('w:tcBorders')
            for edge in ['top','left','bottom','right']:
                el=OxmlElement('w:'+edge);el.set(qn('w:val'),'single');el.set(qn('w:sz'),'4');el.set(qn('w:color'),'D9D9D9');borders.append(el)
            tcPr.append(borders)
            shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'E5EAF0' if i==0 else ('F5F7F9' if i%2==0 else 'FFFFFF'));tcPr.append(shade)
            margins=OxmlElement('w:tcMar')
            for edge in ['top','left','bottom','right']:
                el=OxmlElement('w:'+edge);el.set(qn('w:w'),'85');el.set(qn('w:type'),'dxa');margins.append(el)
            tcPr.append(margins)
            for q in c.paragraphs:
                q.paragraph_format.space_after=Pt(3)
                for r in q.runs:r.font.size=Pt(9.5);r.bold=i==0
    repeat=OxmlElement('w:tblHeader');t.rows[0]._tr.get_or_add_trPr().append(repeat)
    d.add_paragraph().paragraph_format.space_after=Pt(0)

d.add_paragraph('Especificación del Sprint 2', 'Title')
d.add_paragraph('TransDrakkar', 'Subtitle')
p('Versión 0.1 para revisión · 5 de noviembre de 2026')
p('Autor: Miguel Requena López · Procesos de Ingeniería del Software')
h('1 Objetivo y alcance')
p('El Sprint 2 amplía la base de acceso del primer sprint para gestionar el transporte de mobiliario de TransDrakkar. El incremento previsto conecta la solicitud de recogida del cliente con la revisión administrativa, la planificación de rutas y el seguimiento por el conductor.')
p('Este documento define el comportamiento esperado y pruebas de aceptación propuestas. La especificación debe revisarse antes de aprobarla como compromiso del sprint. La aceptación de cada PBI se registrará con sus pruebas y evidencias; describir un requisito no acredita que ya esté implementado.')
table(['PBI','Alcance','Estimación visible'],[
('P15','Identidad visual del acceso','4'),('P16','Perfiles y permisos','10'),('P17','Alta de solicitudes','7'),('P18','Consulta y cancelación propias','5'),('P19','Revisión administrativa','5'),('P21','Vehículos y conductores disponibles','6'),('P22','Planificación y asignaciones','8'),('P23','Ruta del conductor y entregas','6'),('P24','Validación y documentación del flujo','4'),('Total','','55')],[1.4,11.2,4])
p('La unidad de estas estimaciones y las fechas de inicio y cierre se confirmarán en DoneTonic. No se equiparan automáticamente a horas. Las decisiones pendientes de negocio se concentran en el apartado 8.')
sub('Actores y flujo previsto')
p('Cliente: solicita recogidas y consulta o cancela las propias. Administración: revisa solicitudes y organiza recursos y rutas. Conductor: consulta su asignación y comunica el resultado de las entregas. Flujo previsto: solicitud → revisión → planificación → ejecución → seguimiento.')

page();h('2 Identidad y perfiles de acceso')
sub('P15 Personalizar el acceso con TransDrakkar')
p('Como visitante, quiero reconocer la identidad de TransDrakkar en el acceso para utilizar el servicio con una presentación coherente. Trazabilidad: RF-08, requisito de interfaz.')
criteria([('CA15-01','Dada la página de acceso, al abrirla se muestran el nombre y los elementos visuales de TransDrakkar, sin referencias visibles al prototipo MiApp en ese flujo.'),('CA15-02','Los formularios de registro y acceso mantienen etiquetas y mensajes legibles en ordenador y móvil, sin ocultar sus acciones principales.'),('CA15-03','Al producirse un error de validación o de red, la interfaz informa del resultado y permite corregir o reintentar la operación.')])
sub('P16 Acceder según el perfil autorizado')
p('Como usuario autenticado, quiero acceder al panel de mi perfil para disponer de las operaciones autorizadas. Trazabilidad: RF-09 y ampliación de RF-05.')
p('Precondición: cuenta confirmada, activa y sesión vigente. La cuenta registrada públicamente recibe el perfil cliente. El servidor obtiene el perfil y el propietario desde la sesión; los valores enviados por el navegador no conceden permisos.')
criteria([('CA16-01','Al acceder como cliente, conductor o administrador se carga el panel correspondiente. Intentar abrir directamente un panel de otro perfil es rechazado por el servidor.'),('CA16-02','Una petición sin sesión vigente no obtiene datos privados. Una cuenta eliminada o no autorizada no recupera acceso mediante una cookie anterior.'),('CA16-03','Un cliente solo consulta sus solicitudes y un conductor solo sus rutas asignadas. Un identificador ajeno no revela datos y responde como un registro inexistente.'),('CA16-04','Administración puede cambiar entre cliente y conductor a una cuenta confirmada y disponible. La operación no modifica cuentas de administración ni confirma cuentas pendientes.'),('CA16-05','Modificar HTML, cabeceras, rol o propietario en una petición no amplía los permisos. Los cambios de perfil se aplican en la siguiente petición autorizada.')])
sub('Matriz de permisos prevista')
table(['Operación','Cliente','Conductor','Administración'],[('Crear solicitud','Sí','No','No'),('Consultar solicitudes','Propias','No','Todas'),('Cancelar solicitud','Propia y permitida','No','Por definir'),('Gestionar recursos y rutas','No','No','Sí'),('Consultar rutas','No','Asignadas','Todas'),('Actualizar entregas','No','Asignadas','Por definir')],[6.4,3.3,3.3,3.6])

page();h('3 Alta de solicitudes de recogida')
sub('P17 Solicitar recogida de mobiliario')
p('Como cliente, quiero solicitar una recogida en fábrica para que TransDrakkar pueda organizar su transporte. Trazabilidad: RF-10. La organización posterior de camiones se realiza desde la base de Yecla; este formulario no solicita destino ni contacto de entrega.')
table(['Dato','Obligatoriedad y validación'],[('Fabricante','Obligatorio, hasta 160 caracteres.'),('Dirección de recogida','Obligatoria, hasta 300 caracteres.'),('Contacto de recogida','Nombre hasta 120 caracteres y teléfono de 7 a 15 dígitos.'),('Fecha solicitada','Fecha real, formato AAAA-MM-DD, no anterior al día actual en Europe/Madrid.'),('Mercancía','Entre 1 y 50 líneas. Descripción hasta 200 caracteres, cantidad entera de 1 a 999 y unidad bultos, cajas o unidades.'),('Observaciones','Opcionales, hasta 2000 caracteres, para horario y acceso.')],[4.5,12.1])
p('El servidor genera identificador, referencia, cliente propietario, fecha de creación y estado inicial pendiente_recogida. No acepta que el cliente fije esos valores mediante campos adicionales.')
criteria([('CA17-01','Dado un cliente autorizado y datos válidos, al enviar el formulario se crea una solicitud persistente y se muestra su referencia.'),('CA17-02','Si falta un dato obligatorio, la fecha es anterior a hoy o una línea es inválida, se rechaza el alta sin guardar una solicitud incompleta. El formulario conserva los datos para corregirlos.'),('CA17-03','Un doble envío o reintento con la misma clave y contenido devuelve la solicitud original y no crea duplicados, incluso ante peticiones concurrentes.'),('CA17-04','Reutilizar la misma clave del cliente con otro contenido produce conflicto. Clientes distintos pueden emplear la misma clave sin compartir solicitudes.'),('CA17-05','Un fallo de almacenamiento informa de indisponibilidad y permite reintentar con la clave original. Cambiar los datos genera una nueva clave para el siguiente envío.')])
sub('Contrato actual de referencia')
p('POST /api/solicitudes exige sesión de cliente y cabecera Idempotency-Key de 16 a 80 caracteres admitidos. Responde 201 al crear, 200 al recuperar un envío idéntico y 409 ante reutilización incompatible. Los errores de validación responden 400. La clave y la huella interna no se incluyen en la respuesta pública.')

page();h('4 Consulta y revisión de solicitudes')
sub('P18 Consultar y cancelar mis solicitudes')
p('Como cliente, quiero consultar mis solicitudes y su estado, y cancelar las que lo permitan, para gestionar mis recogidas. Trazabilidad: RF-11 y RF-12.')
p('Flujo: abrir el listado propio, seleccionar una solicitud, consultar su información y, si procede, solicitar la cancelación y confirmar la acción. La política de cancelación y el estado resultante requieren la decisión D1 del apartado 8.')
criteria([('CA18-01','El listado contiene únicamente solicitudes del cliente autenticado. Si no existen, se muestra un estado vacío sin insertar registros de ejemplo.'),('CA18-02','Al abrir una solicitud propia se muestran su referencia, datos de recogida, mercancía, observaciones y estado según el contrato de detalle que se acuerde.'),('CA18-03','Consultar o cancelar una solicitud ajena se rechaza sin revelar su contenido, aunque se conozca su identificador.'),('CA18-04','Una cancelación permitida y confirmada se guarda y se refleja al recargar. Repetir la petición no genera efectos adicionales.'),('CA18-05','Si el estado cambia y deja de admitir cancelación antes de confirmarla, el servidor rechaza la operación sin sobrescribir el cambio concurrente. Se informa al cliente del resultado.')])
p('Dependencias: P16 y P17. La lectura básica existente no constituye aceptación del detalle ampliado ni de la cancelación.')
sub('P19 Revisar solicitudes desde administración')
p('Como administrador, quiero consultar y revisar las solicitudes para preparar las operaciones de transporte. Trazabilidad: RF-13.')
p('Flujo: consultar solicitudes, abrir una, comprobar su información y registrar la decisión administrativa admitida. El catálogo de decisiones, la información exigida y sus efectos sobre el estado se concretarán mediante D2.')
criteria([('CA19-01','Administración puede consultar el conjunto de solicitudes y el detalle necesario para revisarlas. Cliente y conductor no acceden a estas operaciones administrativas.'),('CA19-02','Al registrar una decisión válida se conserva la relación con la solicitud y se actualiza la información que corresponda según las transiciones aprobadas.'),('CA19-03','Una decisión no permitida para el estado actual se rechaza sin modificar la solicitud. Si la solicitud ya ha cambiado, se informa del conflicto.'),('CA19-04','La revisión deja evidencia del usuario responsable y del momento del cambio. La información que se mostrará al cliente se define junto con D2.')])
p('Dependencias: P16, P17 y contrato de estados compartido con P18 y P22.')

page();h('5 Recursos y planificación de rutas')
sub('P21 Gestionar vehículos y conductores disponibles')
p('Como administrador, quiero conocer y gestionar los recursos disponibles para planificar rutas viables. Trazabilidad: RF-14 y RF-15.')
p('La disponibilidad operativa del conductor es distinta de su perfil de acceso. La ficha mínima de vehículos, las unidades de capacidad y el criterio temporal de disponibilidad requieren D3.')
criteria([('CA21-01','Administración consulta y mantiene los recursos según los campos y operaciones aprobados. Los datos obligatorios o identificadores duplicados se validan antes de guardar.'),('CA21-02','Solo una cuenta habilitada como conductor puede utilizarse como conductor de una ruta. Convertir una cuenta en conductor no la marca automáticamente como disponible para cualquier fecha.'),('CA21-03','Un recurso no disponible no se ofrece como asignable para el periodo solicitado y el servidor vuelve a comprobarlo al guardar.'),('CA21-04','La modificación o baja de un recurso con asignaciones conserva la coherencia de las rutas y aplica la política de D3, sin eliminar silenciosamente su historial.')])
sub('P22 Planificar rutas y asignar recursos')
p('Como administrador, quiero planificar rutas y asignarles vehículo y conductor para organizar el transporte. Trazabilidad: RF-16.')
p('Flujo previsto: seleccionar operaciones elegibles, definir fecha y secuencia, elegir recursos disponibles, validar la propuesta y guardar la asignación. Debe concretarse cómo se relacionan las recogidas en fábrica, el paso por Yecla y las entregas finales antes de fijar el modelo de ruta.')
criteria([('CA22-01','Una ruta guardada queda vinculada a sus operaciones y a los recursos asignados, con referencia e información suficiente para su consulta posterior.'),('CA22-02','No se asigna una solicitud cancelada ni otra que no cumpla los estados de elegibilidad aprobados.'),('CA22-03','Al guardar, se comprueban disponibilidad y compatibilidad de recursos. Dos planificaciones concurrentes no pueden provocar una doble reserva incompatible según D3.'),('CA22-04','Si una validación falla, no se guarda una ruta parcial ni se modifica solo una parte de sus asignaciones.'),('CA22-05','Una ruta asignada aparece en el panel del conductor correspondiente y no en el de otros conductores. La política de replanificación se define mediante D4.')])
p('Dependencias: P19, P21 y decisiones D2, D3 y D4. La optimización automática de rutas, mapas y cálculo de distancias no se presuponen por el título del PBI.')

page();h('6 Ejecución y validación del incremento')
sub('P23 Consultar mi ruta y actualizar entregas')
p('Como conductor, quiero consultar mi ruta asignada y comunicar el resultado de las entregas para mantener actualizado el seguimiento. Trazabilidad: RF-17.')
criteria([('CA23-01','El conductor consulta únicamente sus rutas y los datos operativos autorizados para realizarlas. Conocer una referencia ajena no permite abrirla.'),('CA23-02','La ruta muestra las operaciones, el orden y la información de contacto necesarios según el contrato acordado en D4.'),('CA23-03','Solo el conductor asignado puede comunicar una transición permitida. Un estado desconocido o una transición inválida se rechaza sin alterar el registro.'),('CA23-04','Una actualización válida persiste y se refleja en las consultas autorizadas de administración y cliente según su ámbito.'),('CA23-05','Un fallo de red no muestra una entrega como confirmada por el servidor. El reintento evita duplicar eventos o aplicar dos veces una misma transición.')])
p('Los estados de entrega, incidencias, justificantes y permisos de corrección administrativa se fijan mediante D5. No se exige firma, fotografía ni geolocalización sin una decisión expresa de alcance.')
sub('P24 Validar y documentar el flujo completo')
p('Como responsable del proyecto, quiero comprobar y documentar el incremento para demostrar que los perfiles colaboran en un flujo coherente. Este PBI valida los requisitos anteriores y no añade por sí mismo una función de negocio.')
criteria([('CA24-01','Se ejecuta un escenario con cuentas de cliente, administrador y conductor: crear una recogida, revisarla, planificarla, asignarla y actualizar su ejecución conforme a los estados aprobados.'),('CA24-02','Se comprueba la cancelación permitida y se rechazan acceso ajeno, rol falsificado, datos inválidos, reintentos duplicados y asignaciones incompatibles.'),('CA24-03','Se comprueba que los datos guardados se mantienen tras reiniciar la aplicación con la base de datos disponible. Las pruebas aisladas utilizan datos desechables.'),('CA24-04','Se documentan versión o commit, entorno, entradas, resultado esperado y observado, evidencia y defectos. Un fallo o una prueba no ejecutada no se marca como superado.'),('CA24-05','Se actualizan instrucciones, memoria y trazabilidad. La revisión final recoge los PBI aceptados y los pendientes, sin sustituirlos por el estado actual del código.')])
sub('Condición propuesta de terminado')
p('Cada PBI requiere criterios revisados, implementación integrada, pruebas pertinentes satisfactorias y evidencia de revisión. El sprint completo requiere resolver las decisiones que afecten al flujo aceptado y ejecutar su recorrido de extremo a extremo. La disponibilidad real de correo y Google se comprueba aparte cuando forme parte del escenario de acceso.')

page();h('7 Datos y requisitos de calidad')
table(['Entidad','Información y relaciones'],[('Cuenta','Identificador, correo, perfil y estado. Su identidad procede de la sesión.'),('Solicitud','Referencia, cliente propietario, fabricante, origen, contacto, fecha, mercancía, observaciones y estado.'),('Vehículo','Identificador, características y disponibilidad acordadas en D3.'),('Ruta','Operaciones ordenadas, periodo, vehículo, conductor y estado según D4.'),('Actualización operativa','Operación afectada, transición, responsable y momento; datos adicionales según D5.')],[3.5,13.1])
criteria([('RNF-S2-01','El servidor aplica autenticación y autorización en cada operación y filtra por propietario o conductor antes de devolver información.'),('RNF-S2-02','Los datos operativos persisten en MongoDB. Las operaciones que cambian varios registros mantienen su coherencia ante fallos y concurrencia.'),('RNF-S2-03','La interfaz informa de carga, éxito, vacío y error, conserva entradas ante errores recuperables y se puede utilizar en móvil y ordenador.'),('RNF-S2-04','Las respuestas y registros no revelan contraseñas, tokens ni credenciales. La interfaz presenta solo los datos que necesita cada perfil.'),('RNF-S2-05','Se mantienen separadas presentación, comunicación, API, lógica y persistencia. Las pruebas cubren reglas y permisos con resultados reproducibles.')])
h('8 Decisiones pendientes para aprobar el alcance')
table(['ID','Decisión necesaria'],[('D1','Estados y plazo de cancelación, consecuencias y permisos de administración.'),('D2','Decisiones de revisión administrativa, motivos, transiciones y visibilidad para el cliente.'),('D3','Campos de vehículos, capacidad y unidades, disponibilidad temporal y tratamiento de recursos ya asignados.'),('D4','Modelo de recogida y entrega con paso por Yecla, datos de destino, secuencia, fechas, replanificación y conflictos.'),('D5','Estados de entrega e incidencias, transiciones permitidas y procedimiento de corrección.'),('D6','Unidad de estimación, calendario y compromiso final del Sprint 2 en DoneTonic.')],[1.3,15.3])
p('Base de trazabilidad: PBI P15 a P24 disponibles en el seguimiento del proyecto; RF-08 a RF-17 del anexo de requisitos; contratos actuales de la API y validación de solicitudes. Los criterios CA de este documento son propuestas para revisión, no transcripciones de criterios aprobados en DoneTonic.')

for element in list(d.styles.element.iter(qn('w:pBdr'))) + list(d.element.iter(qn('w:pBdr'))):
    element.getparent().remove(element)
d.save(out/'Especificacion-Sprint-2-TransDrakkar.docx')
print(out/'Especificacion-Sprint-2-TransDrakkar.docx')
