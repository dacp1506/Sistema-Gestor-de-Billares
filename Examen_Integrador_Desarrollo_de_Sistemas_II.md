**UPDS  |  DESARROLLO DE SISTEMAS II** 

### **UNIVERSIDAD PRIVADA DOMINGO SAVIO** 

# **EXAMEN PRÁCTICO INTEGRADOR** 

_90% práctico  |  10% teórico  |  Evaluación individual presencial en laboratorio_ 

|**Datos del examen**|**Información**|
|---|---|
|Asignatura|Desarrollo de Sistemas II|
|Modalidad|Individual, presencial, en laboratorio de computación 208|
|Duración sugerida|180 minutos (3 horas)|
|Puntaje|100 puntos: 90 prácticos + 10 teóricos|
|Tecnología|Stack y herramientas aprobadas durante la asignatura|
|Caso|LabCare: gestión de solicitudes de mantenimiento de equipos|



|Estudiante: __________________________________________________   C.I.: _____________________   Fecha: __________________________|
|---|
|**INSTRUCCIÓN PRINCIPAL**|
|Construya una solución funcional para el caso entregado. No se evaluará únicamente que el código compile: debe demostrar el flujo<br>completo, validar datos, probar escenarios correctos e incorrectos y explicar sus decisiones técnicas.|



## **1. Propósito y alcance del examen** 

El examen verifica si el estudiante puede resolver individualmente un requerimiento nuevo aplicando los conocimientos trabajados durante el semestre: modelado, diseño de datos, arquitectura MVC, operaciones CRUD, integración de interfaz, validaciones, pruebas, control de versiones y documentación técnica. 

El caso es independiente del proyecto semestral. Se permite reutilizar la configuración general o una plantilla técnica autorizada por el docente, pero no presentar el proyecto del semestre como si fuera la solución del examen. 

El examen se centra en una funcionalidad vertical completa: desde el requerimiento hasta la persistencia en base de datos y la interacción desde la interfaz. 

## **2. Escenario: LabCare (Gestión de Laboratorio)** 

La institución ficticia LabCare administra laboratorios de computación. Actualmente, los reportes de fallas en equipos se registran por mensajes y hojas de cálculo, por lo que se pierden solicitudes y no se conoce con claridad su estado. Se solicita implementar un módulo web que permita registrar, consultar, actualizar y controlar solicitudes de mantenimiento. 

El sistema será utilizado por personal de laboratorio y responsables de soporte. Para este examen se implementará el módulo de solicitudes; el catálogo de equipos se consulta desde la base de datos. 

## **3. Datos del dominio** 

|**Entidad**|**Atributos mínimos**|**Reglas**||
|---|---|---|---|
|Equipo|id, codigo, nombre, ubicacion, estado|codigo es único. El estudiante pue<br>tabla y cargar los datos semilla.|de crear la|
||id, codigo_solicitud, equipo_id, solicitante,|codigo_solicitud<br>es<br>único;|equipo_id|
|Solicitud|descripcion,<br>prioridad,<br>estado,|referencia<br>a<br>Equipo;<br>activo|<br>permite|
||fecha_registro, fecha_actualizacion, activo|eliminación lógica.||



Datos semilla de equipos (utilice estos registros): 

|**Código**|**Nombre**|**Ubicación**|**Estado**|
|---|---|---|---|
|EQ-001|Computadora de escritorio|Laboratorio 1|OPERATIVO|
|EQ-002|Proyector multimedia|Aula 204|OPERATIVO|
|EQ-003|Router de laboratorio|Laboratorio de Redes|OPERATIVO|
|EQ-004|Impresora de oficina|Secretaría|OPERATIVO|



Examen práctico integrador  •  1 

**UPDS  |  DESARROLLO DE SISTEMAS II** 

## **4. Requerimientos funcionales obligatorios** 

|**ID**|**Requerimiento**|
|---|---|
|RF-01|Listar solicitudes activas mostrando código, equipo, solicitante,<br>prioridad, estado y fecha de registro.|
|RF-02|Registrar una solicitud seleccionando un equipo existente e<br>ingresando solicitante, descripción y prioridad.|
|RF-03|Consultar una solicitud por su identificador y mostrar sus datos<br>completos.|
|RF-04|Editar los datos descriptivos de una solicitud existente.|
|RF-05|Cambiar el estado de una solicitud respetando el flujo permitido.|
|RF-06|Realizar eliminación lógica: la solicitud deja de aparecer en el listado<br>habitual, pero no se borra físicamente de la base de datos.|
|RF-07|Buscar por código de solicitud, solicitante o nombre del equipo.|
|RF-08|Filtrar por prioridad y estado.|
|RF-09|Mostrar mensajes claros de éxito, validación y error.|
|RF-10|Mantener los datos después de cerrar o recargar la aplicación,<br>utilizando la base de datos.|



## **5. Reglas de negocio y validaciones** 

|**Campo / regla**|**Condición obligatoria**|
|---|---|
|Equipo|Debe existir en la tabla de equipos y estar disponible para ser<br>seleccionado.|
|Solicitante|Obligatorio; mínimo 3 caracteres después de eliminar espacios al<br>inicio y al final.|
|Descripción|Obligatoria; mínimo 10 caracteres después de eliminar espacios<br>externos.|
|Prioridad|Solo admite BAJA, MEDIA o ALTA.|
|Estado inicial|Toda solicitud nueva inicia en PENDIENTE.|
|Código|Se genera automáticamente y debe ser único. Formato recomendado:<br>SOL-AAAAMMDD-XXX o equivalente.|
|Transición 1|PENDIENTE puede pasar a EN_PROCESO o CANCELADA.|
|Transición 2|EN_PROCESO puede pasar a RESUELTA o CANCELADA.|
|Estados finales|RESUELTA y CANCELADA no pueden regresar a PENDIENTE ni a<br>EN_PROCESO.|
|Eliminación lógica|No se elimina físicamente el registro. Se cambia activo a false y se<br>excluye del listado normal.|



#### **IMPORTANTE** 

Las validaciones deben existir en el backend. Validar solamente en HTML o JavaScript no es suficiente. La interfaz puede repetir las validaciones para mejorar la experiencia, pero el servidor debe proteger la integridad de los datos. 

## **6. Requerimientos técnicos** 

- Utilizar el lenguaje, framework y motor de base de datos utilizado durante el módulo. 

- Organizar la solución siguiendo MVC o la variante MVC/API aprobada: modelos, controladores, rutas/acciones, vistas o frontend y configuración. 

- Usar consultas parametrizadas u ORM para acceder a la base de datos; no concatenar datos de usuario en sentencias SQL. 

- Gestionar errores sin mostrar al usuario trazas internas, contraseñas ni detalles sensibles. 

- No guardar credenciales directamente en el repositorio. Utilizar variables de entorno o el mecanismo de configuración del framework. 

- La interfaz puede ser una vista del servidor (por ejemplo, Razor u otra tecnología aprobada) o un frontend separado que consuma el backend. 

- La solución debe poder ejecutarse localmente en su equipo de cómputo. También se exige publicar en un GITHUB. 

Examen práctico integrador  •  2 

**UPDS  |  DESARROLLO DE SISTEMAS II** 

## **7. Secuencia de trabajo obligatoria** 

### **Fase 1. Preparación y análisis (minutos 0–20)** 

1. Lea el escenario completo antes de abrir el editor. Identifique usuario principal, problema y alcance: módulo de solicitudes de mantenimiento. 

2. Cree una carpeta de examen con nombre identificable y abra el proyecto o plantilla autorizada en el editor. 

3. Compruebe que el entorno de desarrollo y el motor de base de datos estén disponibles. Ejecute el proyecto base si trabajará modificando un proyecto anterior. 

4. Redacte en un archivo ANALISIS.md el actor principal, al menos cinco requerimientos funcionales y las reglas de negocio que implementará. 

5. Elabore un diagrama UML simplificado de casos de uso para el actor Personal de laboratorio: registrar, listar, consultar detalle, editar, cambiar estado, buscar/filtrar y eliminar lógicamente. Luego dibuje un diagrama C4 de contenedores o un esquema equivalente de arquitectura MVC (interfaz/vista, backend/controladores, modelos/servicios y base de datos). Señale dónde se ejecutan las validaciones. 

Entregable de fase: ANALISIS.md, diagrama UML de casos de uso y esquema C4/MVC. Mantenga los diagramas breves y represente la solución que realmente implementará. 

### **Fase 2. Diseño y configuración de base de datos (minutos 20–40)** 

6. Conecte el proyecto al motor de base de datos aprobado. Utilice el gestor disponible en su equipo o las herramientas del framework. 

7. Cree la tabla Equipo con clave primaria, código único, nombre, ubicación y estado. Si el docente entrega una tabla ya creada, verifique su estructura. 

8. Cree la tabla Solicitud con clave primaria, código único, clave foránea equipo_id, solicitante, descripción, prioridad, estado, fechas y campo activo. 

9. Defina restricciones: NOT NULL donde corresponda, UNIQUE para los códigos, FOREIGN KEY entre Solicitud y Equipo y valores controlados para prioridad/estado cuando el motor lo permita. 

10. Inserte los cuatro equipos semilla. Compruebe que se pueden consultar desde la base de datos. 

11. Guarde el script SQL o la migración utilizada dentro del proyecto. No guarde contraseñas reales dentro del archivo. Entregable de fase: migración o script SQL ejecutable, relación entre tablas y evidencia de los datos semilla. 

### **Fase 3. Backend bajo MVC (minutos 40–95)** 

Implemente las operaciones del módulo. Los nombres exactos de rutas pueden ajustarse al framework, pero las acciones y resultados deben ser equivalentes. 

|**Acción**|**Ruta / acción sugerida**|**Resultado esperado**|
|---|---|---|
|Listar|GET /solicitudes o acción Index|Devuelve solicitudes activas; permite búsqueda<br>y filtros.|
|Detalle|GET /solicitudes/{id} o Details(id)|Devuelve una solicitud; si no existe, responde<br>con not found.|
|Crear|POST /solicitudes o Create(model)|Valida,<br>genera<br>código,<br>guarda<br>estado<br>PENDIENTE y devuelve confirmación.|
|Actualizar|PUT /solicitudes/{id} o Edit(id)|Actualiza solo la solicitud indicada y conserva<br>campos de sistema.|
|Cambiar estado|PATCH<br>/solicitudes/{id}/estado<br>o<br>acción<br>equivalente|Verifica transición permitida antes de actualizar.|
|Eliminar lógico|DELETE /solicitudes/{id} o Delete(id)|Cambia activo=false; no ejecuta DELETE físico.|



12. Organice carpetas y clases de acuerdo con la estructura MVC del framework. Evite colocar toda la lógica en una sola página o controlador. 

13. Cree el modelo o entidad Equipo y Solicitud. Configure tipos, claves y relación. 

14. Implemente el acceso a datos mediante ORM o repositorio/servicio según lo trabajado en su Proyecto en clase. 

15. Implemente el listado de solicitudes activas, incluyendo los datos relacionados del equipo. 

16. Implemente el detalle por ID y gestione el caso de identificador inexistente. 

17. Implemente el registro. El backend debe validar todos los campos, asignar el estado inicial y generar un código único. 

18. Implemente la edición por ID. No permita que una edición cambie el ID, código ni fecha original de creación. 

19. Implemente el cambio de estado comprobando el flujo permitido. Rechace cualquier transición no autorizada por las reglas del caso. 

20. Implemente eliminación lógica. El registro debe mantenerse en la base de datos con activo=false. 

21. Implemente búsqueda y filtros. Deben funcionar sin distinguir mayúsculas/minúsculas cuando corresponda. 

Examen práctico integrador  •  3 

**UPDS  |  DESARROLLO DE SISTEMAS II** 

22. Retorne mensajes y códigos de estado coherentes. En una API REST, utilice como referencia 200/201 para éxito, 400 para datos inválidos, 404 para recurso inexistente y 409 para conflicto de estado o duplicidad. 

23. Pruebe las acciones desde Postman, Swagger, navegador o cliente de pruebas disponible antes de conectarlas a la interfaz. 

Entregable de fase: backend ejecutable con operaciones equivalentes a CRUD, reglas de estado y consultas verificadas. 

### **Fase 4. Frontend e integración (minutos 95–130)** 

24. Cree una pantalla principal con título, formulario y listado de solicitudes. La navegación debe ser comprensible. 

25. En el formulario de registro, permita seleccionar un equipo existente, escribir el nombre del solicitante y la descripción, y elegir prioridad. 

26. Muestre en el listado código, equipo, solicitante, prioridad, estado y fecha. Incluya acciones para ver detalle, editar, cambiar estado y eliminar lógicamente. 

27. Conecte cada acción con el backend. Si usa frontend separado, consuma la API; si usa MVC con vistas del servidor, invoque las acciones correspondientes. 

28. Implemente búsqueda y filtros por texto, prioridad y estado. Deben actualizar el listado correctamente. 

29. Muestre mensajes cuando una operación sea exitosa o falle. No muestre una confirmación de éxito antes de que el servidor responda. 

30. Implemente una confirmación antes de la eliminación lógica y una advertencia cuando la transición de estado no esté permitida. 

31. Compruebe que la pantalla se pueda utilizar en la resolución del equipo de laboratorio y que no existan errores visibles de interfaz. 

Entregable de fase: pantalla integrada que permite completar el flujo de registro, consulta, edición, cambio de estado y eliminación lógica. 

### **Fase 5. Pruebas, depuración y seguridad básica (minutos 130–155)** 

Ejecute los casos de prueba de la sección 8. Registre resultado real y evidencia. Si una prueba falla, corrija y vuelva a ejecutar la prueba y las relacionadas. 

- Compruebe validaciones en backend aunque el navegador permita enviar datos incorrectos. 

- Use parámetros u ORM; no construya consultas SQL concatenando texto ingresado por el usuario. 

- Muestre datos de usuario como texto seguro; no permita que entradas se interpreten como HTML o JavaScript. 

- No revele rutas físicas, trazas, credenciales ni detalles internos en los mensajes al usuario. 

- Compruebe que un error de una solicitud no deje la pantalla en un estado inconsistente. 

### **Fase 6. Git, documentación y entrega (minutos 155–180)** 

32. Inicialice Git. 

33. Cree una rama individual con formato examen/apellido-nombre. 

34. Realice commits pequeños y descriptivos. Ejemplos: feat: agrega registro de solicitudes; feat: valida transiciones de estado; test: documenta escenarios de solicitudes. 

35. Compruebe git status y git log. No incluya carpetas de compilación, secretos, archivos temporales o bases de datos con información sensible. 

36. Actualice README.md con nombre del sistema, tecnologías, requisitos, pasos exactos para ejecutar y funcionalidades implementadas. 

37. Compruebe que otra persona podría seguir el README para abrir el proyecto en el mismo entorno de laboratorio. 

- Suba a GitHub el repositorio y comparta el enlace con el docente. También entregue las evidencias en formato PDF. 

## **8. Matriz de pruebas obligatoria** 

|**ID**|**Acción / datos**|**Resultado esperado**|**Resultado real / estado**|
|---|---|---|---|
|CP-01|Registrar solicitud con datos válidos y<br>equipo existente.|Se crea una solicitud PENDIENTE, con<br>código único y persistencia.||
|CP-02|Solicitante vacío o con menos de 3<br>caracteres.|El backend rechaza el registro; no se<br>guarda.||
|CP-03|Descripción vacía o con menos de 10<br>caracteres.|El backend rechaza el registro; no se<br>guarda.||
|CP-04|Prioridad distinta de BAJA, MEDIA o<br>ALTA.|El backend rechaza el valor.||
|CP-05|Seleccionar equipo inexistente.|El sistema rechaza la operación y no<br>crea solicitud huérfana.||
|CP-06|Editar una solicitud existente.|Se actualiza únicamente el registro<br>seleccionado.||



Examen práctico integrador  •  4 

**UPDS  |  DESARROLLO DE SISTEMAS II** 

|**ID**|**Acción / datos**|**Resultado esperado**|**Resultado real / estado**|
|---|---|---|---|
|CP-07|Cambiar PENDIENTE a EN_PROCESO.|La transición se acepta.||
|CP-08|Cambiar RESUELTA a PENDIENTE.|La transición se rechaza y el estado no<br>cambia.||
|CP-09|Eliminar lógicamente una solicitud.|Desaparece del listado activo, pero<br>permanece en la base de datos.||
|CP-10|Buscar por solicitante/equipo y filtrar<br>prioridad/estado.|El listado muestra solo coincidencias<br>válidas.||
|CP-11|Consultar o editar un ID inexistente.|Se informa que el recurso no existe;<br>no se produce error no controlado.||
|CP-12|Recargar la aplicación después de<br>registrar.|Los datos siguen disponibles desde la<br>base de datos.||



Marque cada caso como APROBADO, RECHAZADO o NO EJECUTADO. No escriba APROBADO si no ejecutó la prueba. 

## **9. Entregables que debe presentar** 

- Proyecto fuente completo, organizado y ejecutable. 

- Script SQL o migraciones y relación de tablas. 

- Archivo ANALISIS.md con actor, alcance, requerimientos y reglas; diagrama UML de casos de uso y esquema C4/MVC. 

- Archivo README.md con instrucciones de ejecución. 

- Matriz de pruebas completada y evidencia de al menos seis casos, incluyendo pruebas negativas. 

- Historial Git con commits identificables; enlace GitHub si está disponible. 

- Capturas de la aplicación y de la base de datos que evidencien persistencia en formato PDF cargado a la Plataforma Moodle. 

- Registro de uso de IA, si se utilizó, con prompts principales y explicación de cómo se verificaron las sugerencias. 

#### **NOMBRE SUGERIDO DE ENTREGA** 

DSII_ExamenIntegrador_ApellidoNombre.zip  |  El proyecto debe contener los archivos fuente y documentación. No comprima carpetas temporales o dependencias descargables que puedan reconstruirse. 

## **10. Uso de herramientas de inteligencia artificial** 

El uso de asistentes de IA está permitido. Si está permitido, pero se considera una herramienta de apoyo, no un sustituto de la comprensión técnica. 

- Puede solicitar explicación de errores, alternativas de implementación, revisión de código o casos de prueba. 

- Debe revisar y ejecutar las sugerencias antes de integrarlas. 

- Debe poder explicar cualquier fragmento que incorpore. 

- No debe compartir credenciales, datos personales ni información sensible. 

- Debe registrar herramienta, prompt, resumen de sugerencia, cambio realizado y prueba que confirmó su funcionamiento. 

- Registro breve de IA (si corresponde): 

|**Herramienta y prompt resumido**<br>**Sugerencia recibida**<br>**Qué verifiqué / decisión**|
|---|



## **11. Evaluación: 90 puntos prácticos** 

|**Criterio**|**Puntos**|**Qué se observa**|
|---|---|---|
|1. Análisis y diseño de solución|8|Identifica actor, alcance y reglas; presenta UML<br>de casos de uso y C4/MVC coherentes con la<br>solución implementada.|
|2. Base de datos|10|Tablas, claves, relación, restricciones, datos<br>semilla, script o migración ejecutable.|
|||Modelo y separación MVC; acciones CRUD;|
|3. Backend MVC y lógica|22|generación<br>de<br>código;<br>flujo<br>de<br>estados;<br>búsqueda/filtros; respuestas y errores.|



Examen práctico integrador  •  5 

**UPDS  |  DESARROLLO DE SISTEMAS II** 

|**Criterio**|**Puntos**|**Qué se observa**|
|---|---|---|
|4. Frontend e integración|18|Listado,<br>formulario,<br>selección<br>de<br>equipo,<br>edición,<br>estado,<br>eliminación<br>lógica,<br>búsqueda/filtros y conexión real al backend.|
|5. Validaciones, errores y seguridad|10|Validación de servidor, consultas seguras,<br>manejo de errores, protección de datos y<br>mensajes claros.|
|6. Pruebas y depuración|10|Matriz ejecutada, pruebas válidas/negativas,<br>correcciones y evidencia.|
|7. Git y documentación|12|Rama y commits claros, proyecto ordenado,<br>README e instrucciones reproducibles.|
|**TOTAL PRÁCTICO**|**90**||



## **12. Evaluación teórica: 10 puntos** 

Responda con claridad. Cada pregunta vale 2 puntos. Se evaluará precisión técnica y capacidad de relacionar el concepto con el caso LabCare. 

**1. Explique la responsabilidad de Modelo, Vista y Controlador dentro de MVC. Indique qué componente debería validar una regla de negocio y por qué.** 

**2. ¿Qué diferencia existe entre POST, PUT y PATCH? Mencione una operación de LabCare que corresponda a cada método.** 

**3. ¿Por qué las validaciones del frontend no sustituyen a las validaciones del backend? Dé un ejemplo del examen.** 

**4. ¿Qué es una prueba negativa? Escriba un caso de prueba negativo para el cambio de estado de una solicitud.** 

**5. ¿Qué significa utilizar IA de forma responsable en desarrollo? Mencione una forma concreta de verificar una sugerencia generada por IA.** 

## **13. Declaración del estudiante** 

Declaro que el código presentado fue desarrollado y comprendido por mí durante el tiempo de examen. Si utilicé herramientas de IA, su uso se encuentra registrado y puedo explicar y verificar las sugerencias incorporadas. 

Firma: ________________________________________________ 

Examen práctico integrador  •  6 

