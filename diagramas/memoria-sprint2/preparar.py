from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

base = Path(__file__).parent
originales = base / 'originales'
salida = base / 'actualizados'
def leer(nombre): return (originales/nombre).read_text(encoding='utf-8')
def guardar(nombre, texto): (salida/nombre).write_text(texto, encoding='utf-8')
def figura(nombre, caption, label, ancho='0.95', alto='0.65'):
    recorte = ',trim=215bp 0bp 469bp 250bp,clip' if nombre == 'donetonic-sprint2-backlog.png' else ''
    return r'''\begin{center}
\begin{minipage}{\textwidth}
\centering
\includegraphics[width='''+ancho+r'''\textwidth,height='''+alto+r'''\textheight,keepaspectratio'''+recorte+r''']{figs/'''+nombre+r'''}
\captionsetup{hypcap=false}
\captionof{figure}{'''+caption+r'''}
\label{'''+label+r'''}
\end{minipage}
\end{center}
'''

# Se conserva íntegra la revisión histórica del Sprint 1.
desarrollo = leer('anexo-desarrollo.tex').split(r'\section{Evolución posterior recogida en el repositorio}')[0]
desarrollo = desarrollo.replace(r'\chapter{Desarrollo del Proyecto}',r'\chapter{Desarrollo del Proyecto}'+'\n'+r'\label{anexo:desarrollo}')
desarrollo = desarrollo.replace('La actualización se realiza a 5 de noviembre de 2026, diferenciando el primer sprint de las mejoras posteriores.', 'La actualización se realiza a 17 de noviembre de 2026, conservando las evidencias históricas del Sprint 1 y documentando por separado el cierre del Sprint 2.')
desarrollo += r'''
\clearpage
\raggedbottom
\section{Sprint 2: gestión del transporte de mobiliario}
\subsection{Planificación y alcance}
El objetivo del segundo incremento es conectar la solicitud del cliente con la revisión administrativa, la planificación desde la base de Yecla y la ejecución por el conductor. Se conservan la arquitectura por capas, la persistencia en MongoDB Atlas y el despliegue en Cloud Run. La interfaz adopta la identidad de TransDrakkar.

Las capturas aportadas el 17 de noviembre de 2026 identifican ocho PBI del Sprint 2: P15, P16, P17, P19, P21, P22, P23 y P24. Se mantienen los saltos de numeración de DoneTonic. El autor ha indicado que P18 no figura en este backlog; por tanto, no se le asignan estimación ni horas dentro del sprint, aunque la consulta y cancelación de solicitudes propias estén implementadas. Los gráficos muestran un eje de 0 a 21 días; no se deducen de él fechas de inicio y fin que no figuran en las capturas.

\subsection{Desarrollo del incremento}
El primer reto fue extender los permisos del prototipo de cuentas a tres perfiles. El servidor obtiene la identidad desde la sesión y verifica en cada petición que la cuenta sigue activa y autorizada. Los listados y detalles se limitan al propietario o conductor asignado; modificar el rol o el identificador en el navegador no amplía el acceso.

El segundo reto fue enlazar solicitud, revisión y planificación sin dejar datos incoherentes. La solicitud incorpora recogida, destinatario, dirección y contacto de entrega, fecha y mercancía. Administración acepta o rechaza con motivo y mantiene el historial. Las rutas agrupan solicitudes aceptadas en orden, asignan camión y conductor y conservan una copia de los datos operativos. La creación se realiza mediante transacción: los conflictos de vehículo, conductor o solicitud impiden guardar cambios parciales. Las solicitudes antiguas incompletas se identifican y no se rellenan con datos inventados.

El tercer reto fue mantener coherente el seguimiento de las entregas. El conductor abre el itinerario e inicia la ruta; cada parada admite entrega o incidencia con motivo. La incidencia puede resolverse como entregada. La última entrega completa la ruta y libera sus reservas. Las revisiones detectan cambios simultáneos y las claves de operación evitan duplicar eventos al reintentar. La interfaz no confirma una entrega cuando se pierde la respuesta del servidor.

El trabajo se integró en ramas específicas y solicitudes de integración, con comprobaciones previas. La planificación corresponde al PR 36, sus ajustes y la identidad de cuentas a los PR 37--39, la documentación al PR 40, la preparación inicial de P24 al PR 41 y la ejecución de entregas y validación completa al PR 42. P24 se preparó antes de P23 y se amplió después: no se consideró superado el tramo de entrega mientras no estuvo implementado.

\clearpage
\subsection{Revisión del Sprint 2}
La Tabla~\ref{tab:revision-sprint2-pbi} transcribe los ocho PBI y la dedicación visible. Se distingue la estimación mostrada por el icono de reloj de arena, cuya unidad no aparece confirmada en estas capturas, del tiempo registrado explícitamente en horas. No se calcula una desviación porcentual entre magnitudes de unidad no confirmada.

\begin{center}
\begin{minipage}{\textwidth}
\centering\small
\renewcommand{\arraystretch}{1.2}
\begin{tabular}{|p{0.08\textwidth}|p{0.48\textwidth}|p{0.16\textwidth}|p{0.15\textwidth}|}
\hline
\textbf{PBI} & \textbf{Descripción} & \textbf{Estimación visible} & \textbf{Tiempo (h)} \\ \hline
P15 & Identidad visual de TransDrakkar. & 4 & 2 \\ \hline
P16 & Paneles y permisos de cliente, conductor y administrador. & 10 & 4 \\ \hline
P17 & Solicitar transporte de mobiliario. & 7 & 3,5 \\ \hline
P19 & Revisar solicitudes desde administración. & 5 & 3 \\ \hline
P21 & Gestionar vehículos y conductores disponibles. & 6 & 2,5 \\ \hline
P22 & Planificar rutas y asignar vehículo y conductor. & 8 & 8 \\ \hline
P23 & Consultar ruta y actualizar entregas. & 6 & 2,3 \\ \hline
P24 & Validar y documentar el flujo completo. & 4 & 1,5 \\ \hline
\multicolumn{2}{|l|}{\textbf{Total transcrito}} & \textbf{50} & \textbf{26,8} \\ \hline
\end{tabular}
\captionsetup{hypcap=false}
\captionof{table}{Revisión del Sprint 2 según las dos capturas del backlog aportadas: estimación visible y horas registradas. P18 no figura en ese backlog.}
\label{tab:revision-sprint2-pbi}
\end{minipage}
\end{center}

Las Figuras~\ref{fig:s2-backlog} y~\ref{fig:s2-backlog-resto} constituyen la evidencia de la tabla. El panel de seguimiento indica 100\% completado y estimación pendiente cero. Esto documenta el cierre comunicado por el autor y el estado de la herramienta; la validación técnica se apoya además en pruebas identificadas.
'''
desarrollo += figura('donetonic-sprint2-backlog.png', 'Recorte de la vista parcial del backlog del Sprint 2 aportada el 17 de noviembre: P24, P23, P22, P21, P19 y P17, con estimaciones y horas registradas.', 'fig:s2-backlog', alto='0.43')
desarrollo += figura('donetonic-sprint2-backlog-resto.png', 'Continuación del backlog: P17, P16 y P15. P17 aparece en ambas capturas y solo se cuenta una vez.', 'fig:s2-backlog-resto', alto='0.28')
desarrollo += r'''
\subsection{Validación del incremento}
El PR 42 integra la revisión de cierre \texttt{885b380}. La ejecución de GitHub Actions del PR, identificada por el número \texttt{44078563639}, contiene 85 casos, sin fallos ni omisiones, con MongoDB real configurado como replica set. También se construyó y comprobó el contenedor. El informe JUnit queda como artefacto descargable de esa ejecución. La regresión local contiene 83 casos superados y dos integraciones MongoDB omitidas por falta de una instancia local; no se presentan esas omisiones como pruebas superadas.

El escenario T34 recorre por HTTP alta de solicitud, aceptación, recursos, ruta, incidencia, resolución y consulta del cliente. Se recuperan sesión, detalle e itinerario completado en otro proceso. Las pruebas MongoDB comprueban transacciones, rollback, reintentos simultáneos, conflictos y liberación de reservas. T35 añade permisos, fechas inválidas, duplicados, transiciones no autorizadas y fallos de red. La revisión visual utiliza dos paradas ficticias y comprueba el motivo obligatorio, las dos entregas y su historial desde el perfil cliente.

La revisión desplegada sirve la nueva interfaz de entregas y mantiene el endpoint operativo protegido: una petición sin sesión devuelve 401. No se modificaron datos de transporte reales para demostrar el cierre. La revisión funcional no acredita recepción real de correo, consentimiento Google ni un reinicio manual de Cloud Run.

\subsection{Retrospectiva y gráficos de seguimiento}
El burndown de la Figura~\ref{fig:s2-burndown} parte de 57 unidades de estimación, muestra aproximadamente 43 pendientes en el día 12 y alcanza cero en el día 21. La reducción se concentra en el tramo final. Esa forma describe el registro de cierres, pero no demuestra que todo el trabajo se realizase en esos últimos días. Una mejora del proceso consiste en registrar los cierres y tiempos al terminar cada tarea.
'''
desarrollo += figura('donetonic-sprint2-burndown.png',r'Burndown del Sprint 2: 100\% completado, cero estimación pendiente y final en el día 21. La unidad del eje vertical es la estimación de PBI mostrada por DoneTonic.','fig:s2-burndown',alto='0.58')
desarrollo += r'''
El burnup de la Figura~\ref{fig:s2-burnup} muestra aproximadamente 14 unidades completadas en el día 12 y 57 en el día 21. La línea discontinua denominada Trabajo Total se mantiene alrededor de 9 después del día 7, sin coincidir con el final de 57 de la serie real. Además, la suma de estimaciones de los ocho PBI transcritos es 50. Las capturas no permiten determinar la causa de estas diferencias de agregado o configuración. Por ello, se conservan las figuras originales y no se fuerza una conciliación ni se equiparan esos valores a horas. El indicador 100\% y el pendiente cero se interpretan como estado comunicado por la herramienta, no como explicación de su cálculo.
'''
desarrollo += figura('donetonic-sprint2-burnup.png','Burnup del Sprint 2. Se conserva la discrepancia visible entre la serie real, Trabajo Total y la suma de estimaciones de los PBI, sin corregir ni reconstruir el gráfico.','fig:s2-burnup',alto='0.58')
desarrollo += r'''
Como resultado positivo, el sprint entrega un flujo de transporte completo con separación de perfiles, historial y consistencia transaccional. Las incidencias de solicitudes antiguas incompletas y los conflictos de planificación se tradujeron en validaciones y mensajes concretos. La principal mejora de seguimiento es mantener alineados backlog y gráficos y registrar el esfuerzo con la misma fecha de corte. Se recomienda revisar la configuración de los agregados de DoneTonic antes de utilizar sus gráficos para comparar productividad o variación de alcance.
'''
guardar('anexo-desarrollo.tex',desarrollo)

cap = leer('04-descripción.tex')
inicio=cap.index('MiApp es un prototipo')
fin=cap.index(r'\section{Requisitos}')
cap=cap[:inicio]+'TransDrakkar es una aplicación web para gestionar el transporte de mobiliario desde la solicitud del cliente hasta la entrega. El estado descrito corresponde al cierre del Sprint 2, a 17 de noviembre de 2026. El incremento incluye perfiles de cliente, administrador y conductor, revisión de solicitudes, recursos, rutas y seguimiento de entregas. La confirmación de correo y el acceso con Google cuentan con implementación y pruebas simuladas; se distingue ese alcance de la validación real de los proveedores.\n\n'+cap[fin:]
rf=r'''\item RF-08. Presentar el acceso con la identidad visual de TransDrakkar (requisito de interfaz, P15).
\item RF-09. Proporcionar paneles y permisos de cliente, conductor y administrador (P16).
\item RF-10. Crear solicitudes con recogida y entrega completas, mercancía, fecha e idempotencia (P17).
\item RF-11. Consultar las solicitudes propias, su estado y su historial.
\item RF-12. Cancelar solicitudes propias mientras estén pendientes, conservando su historial.
\item RF-13. Revisar solicitudes desde administración, aceptar o rechazar con motivo (P19).
\item RF-14. Gestionar vehículos activos y disponibles para planificar (P21).
\item RF-15. Gestionar conductores vinculados a cuentas habilitadas (P21).
\item RF-16. Planificar rutas desde Yecla y asignar vehículo, conductor y paradas ordenadas sin conflictos (P22).
\item RF-17. Consultar el itinerario propio y registrar entregas o incidencias autorizadas (P23).
'''
cap=cap.replace(r'\end{itemize}',rf+r'\end{itemize}',1)
cap=cap.replace('MongoDB se utiliza para las cuentas de la aplicación y SQLite para pruebas aisladas.', 'MongoDB conserva cuentas, sesiones, solicitudes, recursos y rutas; SQLite se reserva para pruebas aisladas.')
cap=cap.replace('mientras que MongoDB Atlas almacena las cuentas.', 'mientras que MongoDB Atlas almacena los datos de acceso y transporte.')
cap=cap.replace('la presencia de estas colecciones no implica que todos los procesos de transporte estén terminados.', 'el cierre del Sprint 2 incorpora el recorrido completo de solicitud, revisión, planificación y entrega, con historial y permisos por perfil.')
cap=cap.replace('otros estados temporales, como OAuth y los límites de acceso, requieren su propia revisión.', 'aunque el estado de OAuth ya persiste en Atlas, los límites de acceso son por proceso y requieren revisión antes de ampliar instancias.')
cap=cap.replace('con el comportamiento del código disponible a 4 de noviembre de 2026.', 'con el comportamiento incorporado en P17 y conservado en la revisión de cierre del Sprint 2.')
cap=cap.replace('la fecha y las líneas de mercancía.', 'la fecha, las líneas de mercancía y los datos completos de destinatario, dirección y contacto de entrega.')
pos=cap.index(r'\clearpage'+'\n'+r'\section{Desarrollo del Proyecto}')
cap=cap[:pos]+r'''
\clearpage
\subsection{Diagrama de estados del transporte}
El diagrama de la Figura~\ref{fig:estados-transporte} resume el ciclo de cada solicitud y las transiciones permitidas al cerrar el Sprint 2. Complementa la secuencia de alta con los casos de revisión, planificación y entrega. El estado de la ruta agrupa el resultado de sus paradas: una incidencia abierta no libera reservas ni completa la ruta.
'''+figura('estados-transporte-sprint2.png','Estados de la solicitud y acciones autorizadas por perfil. La ruta solo se completa cuando todas sus paradas están entregadas.','fig:estados-transporte',alto='0.48')+r'''
El cliente solo cancela una solicitud pendiente. Administración acepta o rechaza con motivo y planifica las aceptadas. El conductor asignado inicia la ruta y comunica entregas o incidencias; una incidencia exige motivo y puede resolverse como entrega. No se permiten retornos desde un estado final. Las claves idempotentes y revisiones evitan duplicados y sobrescrituras, mientras las transacciones mantienen consistentes solicitudes, paradas y ruta.

\section{Desarrollo del Proyecto}
El Anexo~\ref{anexo:desarrollo} conserva la revisión histórica del Sprint 1 y desarrolla el cierre del Sprint 2. Este segundo incremento añade el proceso de transporte completo a la base de acceso. Los ocho PBI presentes en las capturas suman 50 de estimación visible y 26,8 horas registradas. Se separan ambas magnitudes porque la unidad de estimación no está confirmada en las capturas. El anexo explica las discrepancias con los gráficos de seguimiento de DoneTonic.

\section{TransDrakkar: guía de uso}
\subsection{Registro, confirmación y acceso}
Crear cuenta solicita nombre, primer apellido, correo y contraseña. La cuenta pública recibe perfil cliente y queda pendiente de confirmar el correo. La contraseña tiene un mínimo de seis caracteres y un máximo de 72 bytes; se almacena mediante bcrypt. El enlace de confirmación caduca a las 24 horas y es de un solo uso. Si el envío falla, el servicio informa del resultado y permite reintentar. El acceso con Google utiliza correo verificado y no vincula una cuenta local solo por coincidencia de dirección. La aplicación recupera sesiones vigentes al recargar y permite cerrarlas.

\subsection{Cliente: solicitud y seguimiento}
El cliente crea una solicitud con fabricante, origen en Yecla, contacto y fecha de recogida, mercancía y entrega final completa. Puede consultar solo sus solicitudes y abrir su detalle e historial. Mientras siguen pendientes puede cancelarlas. Un rechazo administrativo muestra su motivo. Durante la ejecución ve los estados en tránsito, incidencia y completada y los motivos registrados. Los datos antiguos incompletos se conservan y no se completan automáticamente.

\subsection{Administración: recursos y planificación}
Administración revisa y filtra solicitudes, acepta o rechaza con motivo y habilita cuentas de conductor. El catálogo guarda vehículos con matrícula única normalizada, capacidad con unidad, sede, actividad y disponibilidad; los conductores se vinculan a cuentas activas sin duplicarlas. Se conservan registros históricos al desactivar recursos.

Desde Planificar rutas se elige fecha, camión y conductor disponibles en Yecla y de 1 a 100 solicitudes aceptadas distintas. Se ordenan las paradas antes de guardar. Una solicitud no puede pertenecer a dos rutas activas y un vehículo o conductor no se reserva dos veces en la misma fecha. El itinerario permite revisar direcciones, contactos, mercancía y seguimiento de cada parada.

\subsection{Conductor: itinerario, entregas e incidencias}
El conductor pulsa Ver ruta y entregas en una ruta asignada. Se muestran paradas en orden, dirección, contactos y mercancía. Iniciar ruta pasa sus solicitudes a en tránsito. Cada parada permite Marcar entregada o Registrar incidencia con motivo obligatorio. Resolver como entregada cierra una incidencia; la última entrega completa la ruta y libera sus reservas. Solo se confirma éxito tras respuesta del servidor; un fallo de red ofrece reintentar sin duplicar el evento. Las rutas previas con itinerario completo también pueden ejecutarse.

\section{Pruebas y validación}
La ejecución CI \href{https://github.com/Miguel-Requena/Procesos26-27/actions/runs/44078563639}{44078563639 del PR 42} contiene 85 casos, sin fallos ni omisiones, e incluye MongoDB real con replica set y comprobación del contenedor. El artefacto JUnit conserva los resultados. La regresión local supera 83 casos y omite las dos integraciones MongoDB si no hay instancia disponible; se distingue ese resultado del remoto.

Las pruebas cubren autenticación y permisos, propiedad, fechas inválidas, duplicados, estados, revisiones obsoletas, concurrencia, rollback, persistencia entre procesos y liberación de reservas. El escenario T34 recorre por HTTP solicitud, aceptación, ruta, incidencia, entrega y consulta cliente. T35 comprueba negativos y reintentos tras perder la respuesta. La prueba visual con dos paradas ficticias comprueba la ejecución y su historial. El anexo de desarrollo identifica entradas y evidencias sin modificar operaciones reales de producción.

Las pruebas de correo y Google utilizan proveedores simulados y no acreditan recepción real o consentimiento. La persistencia comprobada entre procesos tampoco se presenta como reinicio manual de Cloud Run. Estos límites no deben confundirse con funciones de transporte pendientes.

\section{Despliegue y estado actual}
La aplicación se publica en \href{https://procesos26-27-gseerr4ika-no.a.run.app}{Google Cloud Run}, con MongoDB Atlas. Las ramas específicas y PR con CI satisfactoria se integran en main; Cloud Build construye y despliega automáticamente el contenedor. El cierre P23/P24 se integra mediante el \href{https://github.com/Miguel-Requena/Procesos26-27/pull/42}{PR 42}, commit de integración \texttt{885b380}. Se verificó disponibilidad de la interfaz desplegada de entregas y rechazo 401 de la API operativa sin sesión. Las credenciales se mantienen fuera del repositorio y de la memoria.
'''
guardar('04-descripción.tex',cap)

guardar('05-conclusiones.tex',r'''\chapter{Conclusiones y Trabajo Futuro}
\section{Conclusiones}
El cierre del Sprint 2 transforma el prototipo de cuentas en TransDrakkar, una aplicación de transporte de mobiliario con perfiles de cliente, administrador y conductor. El incremento conecta solicitud, revisión, planificación y entrega, incluyendo incidencias y consulta del historial. Se mantiene el desarrollo incremental: la base de acceso del Sprint 1 se conserva y el segundo sprint añade las operaciones logísticas.

La separación entre presentación, comunicación, API, lógica y persistencia permite concentrar reglas y comprobar permisos en el servidor. Las transacciones, índices de reserva, revisiones y claves idempotentes resuelven problemas de consistencia, concurrencia y reintentos. El historial permite explicar el recorrido de cada solicitud y mantener el seguimiento autorizado por perfil.

La integración mediante ramas y PR aporta trazabilidad y comprobaciones previas al despliegue. La revisión del PR 42 supera 85 casos en CI, con MongoDB real y contenedor, y se complementa con una ejecución visual sobre datos ficticios. El incremento está desplegado en Cloud Run. El resultado técnico se distingue del seguimiento: DoneTonic indica 100\% completado y cero pendiente, pero sus gráficos presentan discrepancias con las estimaciones de los PBI transcritos, que se hacen explícitas en el anexo.

El objetivo de desarrollar y documentar un producto por incrementos se concreta en dos sprints con requisitos, código, pruebas y evidencias. El alcance de transporte del Sprint 2 está implementado y validado; ello no implica certificar integraciones reales de correo/Google ni funcionalidades ajenas al alcance. Los registros aportados suman 26,8 horas para los ocho PBI del Sprint 2; no se comparan con la estimación como si su unidad estuviera confirmada.

\section{Trabajo Futuro}
\begin{itemize}
\item Ampliar la gestión operativa con edición o cancelación de rutas y correcciones administrativas, definiendo previamente sus estados, permisos y efectos sobre reservas e historial.
\item Incorporar mapas u optimización de recorridos y control de capacidad solo tras acordar unidades y medidas verificables; no convertir automáticamente bultos a peso o volumen sin datos suficientes.
\item Completar las evidencias reales de correo y Google, comprobar reinicio y caducidad en el entorno desplegado y revisar los límites por proceso antes de ampliar instancias. Mantener alineados los agregados de DoneTonic, los PBI y el registro de dedicación.
\end{itemize}
''')

req=leer('anexo-requisitos.tex').replace('a 5 de noviembre de 2026','al cierre del Sprint 2, a 17 de noviembre de 2026')
req=req.replace('mediante correo y contraseña','mediante nombre, primer apellido, correo y contraseña',1)
req=req.replace('con fabricante, dirección, contacto, fecha, mercancía y observaciones opcionales.', 'con fabricante, dirección y contacto de recogida, fecha, mercancía, destinatario, dirección y contacto de entrega y observaciones opcionales.')
req=req.replace('La consulta ampliada del detalle deberá completar la información necesaria para su seguimiento.', 'El detalle muestra recogida, entrega, mercancía e historial de estados y motivos.')
req=req.replace('Las condiciones y transiciones admitidas deberán concretarse antes de aceptar este requisito; no se deducen del título del PBI.', 'Solo se admite cancelar mientras esté pendiente; el reintento posterior devuelve conflicto y no duplica el historial.')
req=req.replace('Consultar y revisar las solicitudes desde administración para preparar su gestión operativa.', 'Consultar y filtrar solicitudes desde administración; aceptar o rechazar pendientes con motivo obligatorio en el rechazo y control de revisión.')
req=req.replace('Gestionar los vehículos disponibles para la planificación del transporte.', 'Gestionar vehículos con matrícula única normalizada, tipo, capacidad y unidad, sede, actividad y disponibilidad; conservar su historial al desactivarlos.')
req=req.replace('Gestionar la disponibilidad de conductores para planificar las rutas.', 'Gestionar conductores vinculados a cuentas activas habilitadas, con sede y disponibilidad, sin duplicar la cuenta en el catálogo.')
req=req.replace('Las restricciones de capacidad, disponibilidad y cambios de asignación se concretarán con los criterios del PBI.', 'Las rutas salen de Yecla y agrupan de 1 a 100 solicitudes aceptadas con entrega completa. Se ordenan las paradas y se impiden reservas activas incompatibles por solicitud o por vehículo/conductor y fecha. No se deduce capacidad de carga desde bultos ni se editan rutas en este alcance.')
req=req.replace('Permitir al conductor consultar su ruta asignada y actualizar el estado de las entregas autorizadas.', 'Permitir al conductor consultar solo su itinerario, iniciar la ruta, entregar paradas o registrar incidencias con motivo y resolverlas como entregadas. La última entrega completa la ruta y libera reservas. Revisiones y claves de operación controlan concurrencia y reintentos.')
req=req.replace('P24 corresponde a validar', 'La consulta y cancelación se conservan como RF-11/RF-12 por su trazabilidad previa a P18; el autor indica que P18 no figura en el backlog de cierre del Sprint 2, por lo que no se cuenta entre sus ocho PBI.\n\nP24 corresponde a validar')
req=req.replace('Conservar cuentas, sesiones y solicitudes en MongoDB.', 'Conservar cuentas, sesiones, solicitudes, recursos, rutas e historial en MongoDB, con transacciones para planificación y ejecución.')
req=req.split(r'\section{Estado de implementación y validación}')[0]+r'''\section{Estado de implementación y validación}
La revisión de cierre \texttt{885b380}, integrada mediante el PR 42, incorpora RF-08 a RF-17 junto con la base de acceso. P23 completa el itinerario y actualización operativa; P24 valida el flujo desde solicitud hasta entrega y consulta por el cliente. Las capturas de DoneTonic aportadas por el autor muestran el Sprint 2 al 100\% y pendiente cero. El anexo de desarrollo conserva su discrepancia de estimación respecto de la tabla de PBI.

La ejecución CI \texttt{44078563639} supera 85 casos sin fallos ni omisiones, con MongoDB real y contenedor. Las pruebas cubren reglas, API, permisos, rollback, reintentos, concurrencia, reservas y persistencia entre procesos; la revisión visual con datos ficticios completa la evidencia de uso. La disponibilidad desplegada de la interfaz y la protección de la API se comprobaron por HTTP. Las pruebas de proveedores simulados no acreditan recepción real de correo o consentimiento Google.
'''
guardar('anexo-requisitos.tex',req)

intro=leer('01-introduccion.tex').replace('proyecto MiApp','proyecto TransDrakkar').replace('prototipo web de gestión de usuarios','prototipo web de transporte de mobiliario con gestión de usuarios')
intro=intro.replace('    \\item Evaluar los resultados', '    \\item Conectar solicitud del cliente, revisión administrativa, planificación de rutas y entrega por conductor, con seguimiento e incidencias.\n    \\item Evaluar los resultados')
intro=intro.replace('conclusiones provisionales','conclusiones del cierre del Sprint 2').replace('los espacios para sus evidencias de DoneTonic','las evidencias de DoneTonic y su revisión')
guardar('01-introduccion.tex',intro)

propuesta=leer('03-propuesta.tex')
start=propuesta.index('La propuesta consiste')
end=propuesta.index(r'\section{Metodología}')
propuesta=propuesta[:start]+'La propuesta consiste en desarrollar TransDrakkar, una aplicación web para coordinar el transporte de mobiliario. El cliente solicita la recogida y consulta sus estados; administración revisa solicitudes, gestiona recursos y organiza rutas desde Yecla; el conductor consulta su itinerario y registra entregas o incidencias. El acceso, las sesiones y los permisos constituyen la base del primer incremento y el proceso logístico completa el segundo. Correo y Google disponen de implementación y pruebas simuladas, separadas de sus comprobaciones reales.\n'+propuesta[end:]
propuesta=propuesta.replace('proporciona la persistencia de las cuentas', 'proporciona persistencia de cuentas, sesiones y transporte, con transacciones para cambios relacionados')
guardar('03-propuesta.tex',propuesta)

ia=leer('anexo-usoIA.tex').replace('acceso y solicitud de recogida','acceso, solicitud de recogida y estados del transporte')
ia=ia.replace('Los requisitos del Sprint 2 desarrollan los títulos disponibles y señalan las capacidades cuya implementación o aceptación sigue pendiente.', 'Los requisitos del Sprint 2 se actualizan al cierre de su implementación y se conserva la separación entre evidencias históricas y resultados actuales. La asistencia también se utilizó para implementar y probar P23 y ampliar P24, incluidos los reintentos, transacciones y pruebas con datos ficticios; las reglas de estado fueron confirmadas por el autor.')
ia=ia.replace('Esta actualización documental no certifica pruebas reales de servicios externos ni la validación del flujo completo de transporte.', 'La ejecución CI 44078563639 verifica 85 casos y se completa con una prueba visual local del transporte. La revisión documental no certifica pruebas reales de proveedores externos. Las discrepancias de los gráficos de DoneTonic se conservan y explican, sin completar ni inventar los datos ausentes.')
guardar('anexo-usoIA.tex',ia)
guardar('opciones.tex',leer('opciones.tex').replace('Memoria del Proyecto MiApp','Memoria del Proyecto TransDrakkar'))

# Figura nativa reproducible; no se modifica ninguna captura aportada.
img=Image.new('RGB',(1600,720),'white');d=ImageDraw.Draw(img)
font=lambda s:ImageFont.truetype('C:/Windows/Fonts/arial.ttf',s)
f=font(25);small=font(21)
def caja(rect,texto,color='#edf4fb'):
    d.rounded_rectangle(rect,radius=18,fill=color,outline='#245176',width=3)
    x0,y0,x1,y1=rect
    d.multiline_text(((x0+x1)/2,(y0+y1)/2),texto,font=f,fill='#15354e',anchor='mm',align='center',spacing=8)
def flecha(puntos,label=None,xy=None):
    import math
    d.line(puntos,fill='#245176',width=4)
    a,b=puntos[-2],puntos[-1];ang=math.atan2(b[1]-a[1],b[0]-a[0]);r=13
    d.polygon([b,(b[0]-r*math.cos(ang-.5),b[1]-r*math.sin(ang-.5)),(b[0]-r*math.cos(ang+.5),b[1]-r*math.sin(ang+.5))],fill='#245176')
    if label:d.text(xy,label,font=small,fill='#24445e',anchor='mm',align='center')
d.text((800,38),'TransDrakkar · Estados de una solicitud de transporte',font=font(32),fill='#15354e',anchor='mm')
for x,t in [(40,'Pendiente de\nrecogida'),(355,'Aceptada'),(670,'Planificada'),(985,'En tránsito'),(1300,'Completada\n(entregada)')]:caja((x,150,x+255,250),t)
for a,b,l in [(295,355,'Aceptar'),(610,670,'Planificar'),(925,985,'Iniciar'),(1240,1300,'Entregar')]:flecha([(a,200),(b,200)],l,((a+b)/2,115))
caja((40,400,295,500),'Cancelada','#fbefef');caja((355,400,610,500),'Rechazada','#fbefef');caja((985,400,1240,500),'Con incidencia','#fff5df')
flecha([(167,250),(167,400)],'Cancelar\n(cliente)',(85,325))
flecha([(295,230),(482,300),(482,400)],'Rechazar con motivo\n(administración)',(600,335))
flecha([(1112,250),(1112,400)],'Incidencia\ncon motivo',(1215,330))
flecha([(1240,450),(1427,450),(1427,250)],'Resolver como\nentregada',(1410,535))
d.text((800,605),'Aceptar, rechazar y planificar: administración · Iniciar y entregar: conductor asignado',font=small,fill='#24445e',anchor='mm')
d.text((800,650),'La ruta se completa y libera reservas cuando todas sus paradas están entregadas.',font=f,fill='#15354e',anchor='mm')
img.save(base/'figs/estados-transporte-sprint2.png')
print('Preparados:',', '.join(p.name for p in salida.iterdir()))
