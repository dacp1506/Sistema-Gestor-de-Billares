UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

GUÍA PRÁCTICA PASO A PASO

ACTIVIDAD ACADÉMICA N.º 3
Desarrollo y creación del frontend de la aplicación web propuesta

Desarrollo de Sistemas II  |  Ingeniería de Sistemas  |  Séptimo semestre

PROPÓSITO DE ESTA GUÍA  Te orienta para construir las interfaces reales de la aplicación web diseñada en la Actividad 1 y
conectarlas con el backend y las operaciones CRUD implementadas en la Actividad 2. En esta etapa convertirás el prototipo en
pantallas funcionales, con navegación, formularios, listados, validaciones y comunicación con el servidor.

¿Qué debes entregar al finalizar?

• El frontend implementado con las pantallas principales de la aplicación, coherentes con el prototipo aprobado en la

Actividad 1.

• Navegación funcional entre las secciones y formularios del sistema.
• Integración real con el backend de la Actividad 2 para consultar, registrar, actualizar y eliminar o desactivar

información.

• Interfaces con validaciones, mensajes de éxito y error, estados de carga y presentación de datos vacíos.
• Diseño adaptable a los tamaños de pantalla definidos para el proyecto y una experiencia de uso consistente.
• Código fuente actualizado en GitHub y un documento PDF con capturas, explicación y evidencias de funcionamiento.

REGLA PRINCIPAL  El proyecto continúa siendo individual y es el mismo aprobado en la Actividad 1. No diseñes una aplicación
diferente ni reemplaces el backend de la Actividad 2. El frontend debe consumir los servicios o utilizar las vistas del mismo
sistema.

Documento de orientación para el desarrollo del Entregable 3

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 1

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

ANTES DE COMENZAR: entiende qué vas a construir
En la Actividad 1 definiste qué problema resolverá tu aplicación, quién la utilizará, qué funciones tendrá, cómo se organizará
y qué datos necesita. En la Actividad 2 construiste el backend y comprobaste operaciones CRUD. Ahora debes desarrollar la
parte que verá y utilizará la persona: el frontend.

Concepto

Frontend

Backend

Integración

Componente

Qué significa en esta actividad

Parte visual e interactiva de la aplicación: pantallas, menús, formularios, tablas, botones y mensajes.

Parte del sistema que procesa solicitudes, aplica reglas y accede a la base de datos. Ya fue trabajada en la
Actividad 2.

Comunicación entre el frontend y el backend para enviar datos y recibir resultados.

Elemento reutilizable de la interfaz, por ejemplo un botón, menú, campo, tabla o cuadro de confirmación.

Ruta de pantalla

Dirección interna que permite abrir una sección de la aplicación, por ejemplo /productos o /clientes.

Estado de interfaz

Información que determina qué se muestra: cargando, datos disponibles, sin registros, guardado o error.

Diseño adaptable / responsive

Ajuste de la interfaz para que pueda utilizarse en distintos anchos de pantalla.

DIFERENCIA IMPORTANTE  El prototipo de Figma de la Actividad 1 era una representación visual. En esta actividad construirás
las pantallas con código y harás que los botones y formularios trabajen con datos reales. Una pantalla que solo parece
funcionar, pero utiliza datos escritos manualmente y no se comunica con el backend, todavía no está integrada.

Comprueba qué arquitectura utiliza tu proyecto

Antes de crear carpetas o instalar un framework, revisa el diagrama C4 de contenedores y la matriz tecnológica aprobada.
Hay dos formas frecuentes de organizar la presentación. Debes seguir únicamente la que corresponda a tu proyecto.

Alternativa

Cómo trabaja

Qué debes desarrollar

Frontend separado + API REST

El frontend se ejecuta como proyecto independiente
y envía solicitudes HTTP al backend. El backend
responde normalmente con datos JSON.

Construir las pantallas en el proyecto frontend,
configurar la URL de la API y consumir sus endpoints.

MVC con vistas del servidor

El backend MVC también entrega las páginas o
vistas. El navegador solicita una ruta y el servidor
devuelve HTML, además de procesar formularios.

Construir o completar las vistas, plantillas y elementos
visuales dentro de la estructura MVC aprobada.

NO MEZCLES ARQUITECTURAS  Si tu backend fue construido como API REST y el proyecto tiene frontend separado, no
inventes vistas del servidor que no corresponden. Si tu solución utiliza vistas MVC generadas por el servidor, no crees otro
frontend independiente sin aprobación.

Ejemplo que se utilizará en esta guía

Para explicar los pasos se utilizará el ejemplo “Café Aroma”, una cafetería ficticia empleada en la Actividad 1 y la Actividad
2. Se trabajará con el módulo Productos. Los nombres de pantallas, campos y rutas son ilustrativos: reemplázalos por los
que corresponden a tu propia aplicación.

Elemento del ejemplo

Definición

Módulo

Pantallas

Campos

Productos

Listado de productos, formulario de registro y formulario de edición.

Nombre, categoría, precio y stock.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 2

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

Elemento del ejemplo

Definición

Acciones

Backend

Consultar, registrar, modificar y eliminar o desactivar.

Endpoints CRUD implementados y probados en la Actividad 2.

PASO 1. Recupera y revisa los resultados de las actividades anteriores
No comiences programando las pantallas desde cero. Primero identifica qué parte del sistema ya existe y qué debe
mostrarse en el frontend.

1.1 Abre la documentación y el prototipo de la Actividad 1

¿Qué lograrás? Recuperar los nombres, requisitos, usuarios, pantallas y reglas de la aplicación que fueron aprobados.
¿Dónde dirigirte? Abre el PDF de la Actividad 1, el archivo o enlace de Figma y la documentación que contiene los
requerimientos funcionales.
1. Localiza el nombre exacto del proyecto y el proceso que administra.
2. Busca los requerimientos funcionales del módulo que vas a presentar en el frontend.
3. Abre el prototipo de Figma y revisa los marcos o pantallas diseñados para ese módulo.
4. Anota qué información aparece en cada pantalla: títulos, campos, columnas, botones, filtros y mensajes.
5. Identifica qué actor utilizará cada pantalla y qué acciones tiene permitido realizar.
6. Registra las observaciones del docente y aplica las correcciones aprobadas antes de programar.
Guarda como evidencia: Lista de pantallas, actores, requerimientos y campos que se implementarán. Enlace al prototipo
de Figma.

1.2 Revisa qué operaciones funcionan en el backend

¿Qué lograrás? Conocer exactamente qué operaciones ofrece el backend y qué datos espera recibir o devuelve.
¿Dónde dirigirte? Abre el proyecto de la Actividad 2 en Visual Studio Code y revisa su documento de entrega, rutas,
controladores y pruebas de endpoints.
1. Identifica el módulo CRUD que implementarás primero.
2. Anota las rutas reales del backend y el método HTTP utilizado por cada operación.
3. Revisa los nombres exactos de los campos que recibe el backend; por ejemplo, nombre, precio, stock e id_categoria.
4. Observa qué respuesta devuelve el servidor cuando la operación funciona y cuando existe un error.
5. Comprueba si el backend devuelve datos JSON, una página HTML o una redirección.
6. No cambies nombres de campos en el frontend sin comprender cómo se relacionan con el modelo y el backend.
Guarda como evidencia: Tabla de endpoints y campos reales del módulo, con ejemplos de solicitud y respuesta.

Operación

Método y ruta ilustrativa

Qué necesita el frontend

Listar productos

GET /api/productos

Solicitar los productos y mostrar la lista.

Consultar uno

GET /api/productos/{id}

Cargar los datos del registro seleccionado.

Registrar

Actualizar

POST /api/productos

Enviar los campos del formulario.

PUT o PATCH /api/productos/{id}

Enviar los cambios del registro.

Eliminar / desactivar

DELETE /api/productos/{id}

Solicitar confirmación y ejecutar la acción aprobada.

IMPORTANTE  Las direcciones anteriores son ejemplos. Utiliza las rutas que realmente implementaste en la Actividad 2. Si tu
backend usa vistas MVC y formularios tradicionales, registra las rutas de página y las acciones del servidor en lugar de copiar
las rutas de una API.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 3

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

1.3 Comprueba los endpoints antes de conectarlos a la interfaz

¿Qué lograrás? Evitar confundir un error del backend con un error del frontend.
¿Dónde dirigirte? Utiliza la herramienta con la que probaste el backend en la Actividad 2, por ejemplo Postman, Swagger,
Thunder Client o la herramienta aprobada.
1. Inicia el servicio backend y asegúrate de que la base de datos esté disponible.
2. Abre la herramienta de pruebas y selecciona una solicitud GET del módulo.
3. Ejecuta la solicitud y verifica que recibes datos de prueba o una colección vacía válida.
4. Prueba una solicitud POST con datos válidos y comprueba que el servidor confirma el registro.
5. Prueba una actualización y una eliminación o desactivación con registros de prueba.
6. Anota la dirección base del backend, los métodos, las rutas y los códigos de respuesta obtenidos.
Guarda como evidencia: Capturas de las solicitudes probadas y una tabla con los resultados reales. No incluyas
contraseñas ni tokens en las capturas.

PASO 2. Prepara tu entorno de trabajo
En este paso dejarás listos los proyectos y servicios necesarios. No instales herramientas adicionales sin revisar primero
qué tecnología fue aprobada.

2.1 Abre el proyecto y organiza una copia de trabajo

¿Qué lograrás? Trabajar sobre el repositorio correcto y conservar el historial de cambios.
¿Dónde dirigirte? Abre Visual Studio Code. Selecciona File > Open Folder (Archivo > Abrir carpeta) y elige la carpeta del
proyecto que corresponde a tu arquitectura.
1. Abre la carpeta raíz del proyecto. Si frontend y backend están separados, identifica ambas carpetas.
2. Abre la sección Source Control (Control de código fuente) para revisar si existen cambios pendientes.
3. Antes de modificar archivos, guarda o confirma los cambios de la Actividad 2 que ya estén terminados.
4. Crea una rama de trabajo para el frontend cuando el flujo de Git del proyecto lo permita; por ejemplo, feature/frontend.
5. Si el docente solicitó trabajar directamente en la rama principal, sigue esa indicación.
6. Verifica que el repositorio y el proyecto puedan abrirse sin errores.
Guarda como evidencia: Captura de la estructura local del proyecto y evidencia del estado del repositorio antes de
comenzar.

2.2 Inicia la base de datos y el backend

¿Qué lograrás? Asegurar que el frontend tenga un servicio disponible al cual conectarse.
¿Dónde dirigirte? Dirígete al gestor de base de datos y al terminal integrado de Visual Studio Code. Los comandos
dependen del stack aprobado.
1. Inicia el motor o servicio de base de datos utilizado por tu proyecto, si requiere iniciarse manualmente.
2. Comprueba que la base de datos contiene las tablas y registros de prueba del módulo.
3. Abre la carpeta del backend y ejecuta el procedimiento de inicio indicado por su framework.
4. Observa la terminal: comprueba que el servidor inicia sin errores y anota la dirección local que informa.
5. Abre el navegador o la herramienta de pruebas y consulta un endpoint de verificación o una ruta conocida.
6. Mantén el backend y la base de datos activos mientras trabajas en la integración.
Guarda como evidencia: Captura del backend iniciado y de una respuesta válida. Oculta información privada de conexión.

NO SUPONGAS UN COMANDO  No copies comandos de Node.js, .NET, Python u otra tecnología si no corresponden a tu
proyecto. Abre el README del backend o la documentación oficial del framework aprobado y utiliza el comando de inicio
indicado allí.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 4

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

PASO 3. Crea o recupera el proyecto frontend

3.1 Comprueba si el frontend ya existe

¿Qué lograrás? Evitar crear dos proyectos de interfaz para una misma aplicación.
¿Dónde dirigirte? En el Explorador de archivos de Visual Studio Code, revisa las carpetas del repositorio y el diagrama C4 de
contenedores.
1. Busca una carpeta de frontend, cliente, web o una estructura equivalente.
2. Si existe, abre su README y revisa el framework, la versión y el procedimiento para iniciar el proyecto.
3. Si el frontend ya está creado, instala o recupera sus dependencias usando el gestor aprobado.
4. Ejecuta el proyecto y abre la dirección local que indique la terminal.
5. Comprueba que se muestra la pantalla inicial, aunque todavía sea una página básica.
6. Si no existe, pasa al siguiente apartado y crea el proyecto solo con la herramienta aprobada.
Guarda como evidencia: Captura del proyecto frontend abierto y de la pantalla inicial funcionando.

3.2 Crea el proyecto cuando todavía no exista

¿Qué lograrás? Generar la estructura inicial del frontend sin alterar el backend existente.
¿Dónde dirigirte? Consulta la matriz tecnológica aprobada en la Actividad 1 y las indicaciones del docente. En Visual Studio
Code abre Terminal > New Terminal (Nuevo terminal).
1. Confirma el lenguaje, framework, versión y herramienta de construcción autorizados para el curso.
2. Consulta el comando de creación en la documentación oficial de esa tecnología o en la plantilla entregada por el

docente.

3. Sitúate en la carpeta raíz indicada para el proyecto; no crees el frontend dentro de la carpeta del backend si la

arquitectura lo separa.

4. Ejecuta el comando de creación correspondiente y responde las opciones que solicite el asistente.
5. Abre la carpeta generada en Visual Studio Code y localiza el archivo de instrucciones o configuración del proyecto.
6. Instala las dependencias indicadas y ejecuta el comando de desarrollo del framework.
7. Abre la dirección local que aparece en la terminal y confirma que se muestra la aplicación inicial.

ATENCIÓN  No existe un único comando válido para todos los frameworks. La guía no impone React, Vue, Angular, JavaScript
ni otro stack. Utiliza exclusivamente la tecnología aprobada para tu proyecto.

Guarda como evidencia: Carpeta frontend creada, configuración del proyecto y captura de la aplicación inicial abierta en el
navegador.

PASO 4. Organiza el código del frontend
Una estructura ordenada facilita encontrar las pantallas, componentes, rutas y funciones de comunicación con el backend.

4.1 Crea una estructura comprensible

¿Qué lograrás? Separar las partes de la interfaz para no concentrar toda la aplicación en un único archivo.
¿Dónde dirigirte? En el Explorador de Visual Studio Code, revisa las carpetas generadas por tu framework. Crea las
carpetas que falten siguiendo sus convenciones.
1. Identifica dónde se ubican las páginas o vistas principales.
2. Identifica dónde se guardan los componentes reutilizables, como botones, campos, tablas y menús.
3. Crea o identifica una carpeta para servicios o funciones que se comuniquen con la API, si tu arquitectura la utiliza.
4. Crea o identifica una carpeta para recursos visuales como imágenes, iconos y logotipos.
5. Mantén los estilos globales separados de los estilos específicos de cada página cuando el framework lo permita.
6. Agrupa por módulo si el proyecto crece: productos, clientes, citas, inventario u otros módulos reales.
Guarda como evidencia: Captura del árbol de carpetas y una explicación breve de la responsabilidad de cada carpeta.

Carpeta / elemento
orientativo

Responsabilidad

Ejemplo

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 5

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

Carpeta / elemento
orientativo

pages / views

components

services / api

routes

Responsabilidad

Ejemplo

Pantallas completas a las que llega el usuario.

ProductosPage, ClientesPage

Elementos visuales reutilizables.

Menu, Button, FormField, DataTable

Solicitudes al backend y tratamiento de respuestas.

productoService

Definición de las rutas o direcciones de las
pantallas.

/productos, /clientes

styles / assets

Estilos, imágenes, iconos y recursos visuales.

variables.css, logo.svg

layouts

Estructura común que rodea las páginas.

MainLayout, AdminLayout

NOTA  Los nombres de carpetas son una organización orientativa, no una obligación. Algunos frameworks utilizan nombres
distintos o generan su propia estructura. Respeta las convenciones oficiales de la tecnología seleccionada.

PASO 5. Convierte el prototipo de Figma en una interfaz real

5.1 Abre el prototipo y define las reglas visuales

¿Qué lograrás? Mantener coherencia entre el diseño aprobado y la aplicación que verá el usuario.
¿Dónde dirigirte? Abre figma.com, inicia sesión y selecciona el archivo del prototipo creado en la Actividad 1.
1. Revisa los colores principales y secundarios del proyecto.
2. Identifica el tipo de letra, tamaños de títulos, textos, etiquetas y botones.
3. Observa la separación entre elementos, el ancho de los formularios y la alineación de las tablas.
4. Identifica los iconos, imágenes y logotipo que se utilizarán.
5. Anota qué elementos se repiten en varias pantallas para convertirlos en componentes reutilizables.
6. No agregues colores, botones o secciones que cambien el sentido del sistema sin una justificación.
Guarda como evidencia: Tabla o breve ficha de colores, tipografía, componentes y capturas de referencia del prototipo.

5.2 Define estilos globales

¿Qué lograrás? Establecer una apariencia coherente y evitar que cada pantalla tenga un diseño diferente.
¿Dónde dirigirte? Abre el archivo global de estilos o el sistema de diseño que utilice el framework aprobado.
1. Define los colores para fondo, texto, encabezados, acciones principales, alertas y bordes.
2. Establece tamaños legibles para títulos, subtítulos, etiquetas y texto general.
3. Define el espaciado entre secciones, campos y botones.
4. Mantén un estilo coherente para botones principales, secundarios y acciones de riesgo.
5. Define cómo se mostrarán los mensajes de éxito, advertencia y error.
6. Comprueba que el texto y los botones tengan contraste suficiente sobre su fondo.
Guarda como evidencia: Archivo de estilos globales y captura de una pantalla que muestre los estilos aplicados.

EJEMPLO ADAPTABLE  En Café Aroma, el botón “Nuevo producto” puede utilizar el color principal; “Cancelar” puede ser
secundario; y “Eliminar” debe distinguirse como una acción de riesgo. No utilices el mismo estilo para todas las acciones.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 6

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

PASO 6. Construye la estructura general de la aplicación

6.1 Implementa el encabezado y la zona de contenido

¿Qué lograrás? Crear una estructura común que se mantenga mientras el usuario cambia de módulo.
¿Dónde dirigirte? Abre la carpeta de componentes o layouts en Visual Studio Code y crea los elementos que correspondan
a tu framework.
1. Construye un encabezado con el nombre o logotipo de la aplicación.
2. Incluye información del usuario o sesión solo si el sistema realmente utiliza autenticación.
3. Crea un área central para mostrar las pantallas del sistema.
4. Si el prototipo incluye un menú lateral o superior, constrúyelo con las opciones aprobadas.
5. Agrega un pie de página únicamente si aporta información útil al usuario.
6. Comprueba que el contenido no quede oculto detrás del menú ni se salga de los límites de la pantalla.
Guarda como evidencia: Captura del layout principal mostrando encabezado, menú y área de contenido.

6.2 Construye el menú de navegación

¿Qué lograrás? Permitir que el usuario llegue a los módulos sin tener que escribir direcciones manualmente.
¿Dónde dirigirte? Revisa los actores, módulos y prototipo de la Actividad 1. Implementa las opciones en el componente de
navegación.
1. Escribe el nombre de cada opción con palabras que el usuario comprenda.
2. Incluye solamente los módulos definidos en el alcance del proyecto.
3. Asocia cada opción con la ruta o vista que le corresponde.
4. Marca visualmente la opción que está activa cuando el framework lo permita.
5. Comprueba que cada enlace abra la pantalla esperada.
6. No muestres opciones que todavía no existen o que el usuario no debe utilizar.
Guarda como evidencia: Capturas del menú y de la navegación hacia las principales secciones.

PASO 7. Configura las rutas y la navegación entre pantallas

7.1 Define las rutas del frontend

¿Qué lograrás? Asignar una dirección interna a cada pantalla principal.
¿Dónde dirigirte? Revisa la documentación del framework. Abre el archivo o módulo donde se definen las rutas de la
aplicación.
1. Identifica la ruta inicial o página de inicio.
2. Define una ruta para cada módulo incluido en el alcance, por ejemplo /productos.
3. Si existe una pantalla de edición, define cómo identificar el registro seleccionado, por ejemplo /productos/15/editar.
4. Asocia cada ruta con su página o vista correspondiente.
5. Define una respuesta para rutas inexistentes: una pantalla de “No encontrado” o una redirección apropiada.
6. Prueba cada ruta desde la barra de direcciones del navegador y desde el menú.
Guarda como evidencia: Tabla de rutas implementadas y capturas de navegación.

Ruta ilustrativa

Acceso principal

Pantalla

Inicio / panel

/

Listado de productos

/productos

Nuevo producto

/productos/nuevo

Editar producto

No encontrado

/productos/15/editar

Ruta no existente

Opción Inicio del menú.

Opción Productos.

Botón Nuevo producto.

Acción Editar de una fila.

Página de error controlada.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 7

ATENCIÓN  Las rutas indicadas son ejemplos. Usa la estructura de navegación que recomienda el framework y evita rutas
duplicadas o inconsistentes. Una ruta de frontend no reemplaza el endpoint del backend: cumplen funciones diferentes.

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

PASO 8. Conecta el frontend con el backend
Este paso es central cuando tu arquitectura separa el frontend de una API REST. Si tu solución utiliza vistas MVC generadas
por el servidor, aplica la alternativa indicada al final del paso.

8.1 Configura la dirección del backend

¿Qué lograrás? Indicar al frontend dónde debe enviar las solicitudes.
¿Dónde dirigirte? Abre la carpeta de configuración del frontend y revisa cómo el framework maneja variables de entorno o
configuración por ambiente.
1. Identifica la dirección local del backend que comprobaste en el Paso 1.
2. Define una variable de configuración para la URL base del backend, utilizando el nombre y mecanismo que exige tu

framework.

3. No escribas la dirección del servidor repetida en cada pantalla; centraliza esa configuración.
4. Separa la dirección de desarrollo de la dirección que se utilizará cuando el sistema se publique.
5. Comprueba que el frontend puede acceder al backend desde el navegador.
6. No incluyas contraseñas, tokens privados ni claves secretas en variables que se envían al navegador.
Guarda como evidencia: Captura de la configuración de la URL base, ocultando datos privados si existieran.

8.2 Organiza las solicitudes HTTP en un servicio

¿Qué lograrás? Evitar que cada pantalla tenga copias diferentes del código que consulta o modifica datos.
¿Dónde dirigirte? Abre o crea la carpeta services, api o la estructura equivalente recomendada por tu framework.
1. Crea un servicio para el módulo que implementarás primero; por ejemplo, productoService.
2. Agrega una función para listar registros mediante GET.
3. Agrega una función para consultar un registro por su identificador, si el backend lo ofrece.
4. Agrega una función para registrar mediante POST.
5. Agrega una función para actualizar mediante PUT o PATCH.
6. Agrega una función para eliminar o desactivar mediante DELETE u otra ruta definida por el backend.
7. Centraliza la conversión y lectura de respuestas, errores y códigos HTTP según la tecnología utilizada.
Guarda como evidencia: Archivo del servicio de comunicación con el backend y una breve explicación de cada función.

EJEMPLO DE FLUJO  Pantalla Productos → productoService → solicitud HTTP → endpoint del backend → controlador/modelo →
base de datos → respuesta del backend → pantalla Productos.

8.3 Comprueba la comunicación y revisa CORS cuando corresponda

¿Qué lograrás? Confirmar que el navegador puede comunicarse con el backend y detectar problemas de configuración.
¿Dónde dirigirte? Inicia frontend y backend. Abre la aplicación en el navegador y utiliza las herramientas de desarrollo
(F12).
1. Abre la pestaña Network (Red) y ejecuta una acción que consulte datos.
2. Busca la solicitud enviada al backend y revisa la dirección, el método y el estado de respuesta.
3. Abre la pestaña Console (Consola) y revisa si aparece un mensaje de error.
4. Si el navegador bloquea la solicitud por CORS, revisa la configuración del backend y permite únicamente los orígenes

necesarios para el entorno de desarrollo.

5. No soluciones un problema CORS desactivando la seguridad del navegador ni permitiendo cualquier origen en

producción.

6. Repite la solicitud hasta obtener una respuesta válida y comprensible.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 8

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

ATENCIÓN  CORS es una política de seguridad del navegador. Solo debes configurarla si frontend y backend se sirven desde
orígenes diferentes y la arquitectura lo requiere.

Guarda como evidencia: Captura de una solicitud exitosa en Network y, cuando corresponda, de la configuración CORS
aprobada.

SI UTILIZAS MVC CON VISTAS DEL SERVIDOR  No necesitas crear un cliente HTTP hacia una API separada si las vistas y
acciones están dentro del mismo backend. En ese caso, enlaza los formularios con las rutas y controladores MVC, conserva la
validación del servidor y verifica que la vista reciba los datos correctos.

PASO 9. Construye la pantalla de listado (READ)

9.1 Crea la pantalla del listado

¿Qué lograrás? Mostrar los registros existentes de la base de datos en una pantalla comprensible.
¿Dónde dirigirte? Abre la carpeta pages, views o la ubicación correspondiente y crea la pantalla del módulo seleccionado.
1. Agrega el título del módulo, por ejemplo “Productos”.
2. Incluye una breve descripción cuando ayude a entender la pantalla.
3. Construye una tabla o lista con las columnas que realmente necesita el usuario.
4. Incluye una acción visible para registrar un nuevo elemento.
5. Agrega columnas de acciones para editar o eliminar, si esos permisos están definidos.
6. Evita mostrar identificadores técnicos o datos internos que no aporten valor al usuario.
Guarda como evidencia: Captura del listado maquetado y relación entre las columnas y los campos de la base de datos.

Columna del ejemplo

Dato mostrado

Observación

Producto

Categoría

Precio

Stock

Acciones

nombre

Texto comprensible para el usuario.

nombre de categoría

Mostrar la descripción, no solo el identificador, si el backend entrega ese
dato.

precio

stock

Mostrar con formato monetario coherente.

Indicar la cantidad disponible.

Editar / Eliminar

Botones visibles y con etiquetas claras.

9.2 Carga los datos reales desde el backend

¿Qué lograrás? Reemplazar los registros escritos manualmente por datos que provienen de la aplicación.
¿Dónde dirigirte? Abre la pantalla del listado y el servicio del módulo. Utiliza el mecanismo de carga de datos recomendado
por tu framework.
1. Cuando la pantalla se inicia, ejecuta la función del servicio que consulta la colección.
2. Recibe la respuesta del backend y verifica la estructura de los datos.
3. Guarda los registros en el estado o mecanismo de datos que utilice tu framework.
4. Recorre la colección y presenta una fila o elemento visual por cada registro.
5. Comprueba que los valores mostrados correspondan a los datos guardados en la base de datos.
6. Actualiza la lista después de una operación que cambie los datos, utilizando el método apropiado.
Guarda como evidencia: Captura del listado con registros reales obtenidos del backend. Conserva datos ficticios para la
demostración.

NO USES DATOS FIJOS COMO RESULTADO FINAL  Puedes utilizar registros de ejemplo para maquetar una pantalla, pero la
entrega debe demostrar que los registros se obtienen del backend. Si cambias un dato en la base de datos y la pantalla nunca
refleja ese cambio, todavía no existe integración real.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 9

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

9.3 Incorpora una pantalla de reportes cuando el proyecto lo requiera

¿Qué lograrás? Facilitar la consulta de información resumida o filtrada cuando exista un requerimiento de reportes en la
Actividad 1.
¿Dónde dirigirte? Revisa los requerimientos funcionales y las operaciones del backend. Si el sistema no contempla
reportes, no agregues este apartado como una función nueva.
1. Identifica qué información necesita consultar el usuario y con qué propósito.
2. Define los filtros que realmente necesita el proceso, por ejemplo un rango de fechas, categoría o estado.
3. Diseña la pantalla con campos de filtro, botón Consultar y un área para presentar el resultado.
4. Conecta la consulta con el endpoint o la acción MVC que prepara los datos del reporte.
5. Muestra los totales y resultados que devuelve el servidor; no inventes cifras ni calcules información crítica de forma

distinta a las reglas del backend.

6. Si el proyecto requiere exportar PDF o Excel, utiliza la función o herramienta aprobada para generar el archivo y permite

que el usuario lo descargue.

7. Comprueba que el reporte respete los filtros elegidos y que el resultado pueda explicarse.

ATENCIÓN  No es obligatorio crear reportes adicionales si no forman parte de los requerimientos aprobados. Implementa
únicamente los informes que correspondan al alcance real del proyecto.

Guarda como evidencia: Captura de la pantalla de consulta y, si corresponde, una evidencia del reporte generado. El
informe formal de pruebas se desarrollará en la Actividad 4.

PASO 10. Construye el formulario de registro (CREATE)

10.1 Diseña el formulario para registrar información

¿Qué lograrás? Permitir que el usuario introduzca datos nuevos respetando el modelo de la Actividad 1.
¿Dónde dirigirte? Abre el prototipo de Figma y revisa los campos definidos para el formulario. Luego crea la vista o
componente correspondiente.
1. Coloca un título que indique claramente la acción, por ejemplo “Registrar producto”.
2. Agrega un campo por cada dato que el usuario debe proporcionar.
3. Utiliza el tipo de control adecuado: texto, número, fecha, lista desplegable o casilla, según el dato.
4. Muestra qué campos son obligatorios y cuáles son opcionales.
5. Incluye botones Guardar y Cancelar con acciones distintas.
6. No solicites al usuario que escriba un identificador que genera automáticamente la base de datos.
7. Utiliza los campos relacionados con catálogos mediante listas que muestren nombres comprensibles.
Guarda como evidencia: Captura del formulario vacío y tabla que relacione cada campo visual con el atributo
correspondiente.

Campo visual

Control sugerido

Regla ilustrativa

Nombre

Categoría

Precio

Stock

Texto

Obligatorio; no aceptar solo espacios.

Lista desplegable

Seleccionar una categoría existente.

Número decimal

Obligatorio y mayor que cero.

Número entero

Obligatorio e igual o mayor que cero.

10.2 Valida y envía el registro al backend

¿Qué lograrás? Enviar los datos del formulario y mostrar el resultado de la operación.
¿Dónde dirigirte? Abre el componente o controlador de formulario y vincula el evento de envío a la función de creación del
servicio.
1. Cuando el usuario presione Guardar, evita que el formulario se envíe de manera accidental por el comportamiento

predeterminado del navegador, si tu framework lo requiere.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 10

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

2. Lee los valores introducidos y verifica los campos obligatorios.
3. Comprueba el formato y los límites de los datos numéricos, fechas o identificadores relacionados.
4. Si existen errores, muestra un mensaje junto al campo y no envíes la solicitud.
5. Si los datos son válidos, llama al servicio que realiza la solicitud POST o la acción MVC correspondiente.
6. Mientras se procesa la solicitud, desactiva temporalmente el botón Guardar o muestra un indicador para evitar envíos

repetidos.

7. Si el backend confirma el registro, muestra un mensaje de éxito y actualiza el listado o vuelve a la pantalla

correspondiente.

8. Si el backend rechaza el registro, conserva los datos introducidos cuando sea seguro hacerlo y explica el error.
Guarda como evidencia: Captura de un registro realizado desde la interfaz y evidencia de que aparece en el listado y en la
base de datos.

VALIDACIÓN EN DOS LADOS  La interfaz puede comprobar campos para ayudar al usuario, pero el backend debe validar
nuevamente los datos. No confíes en el frontend como única barrera de seguridad o integridad.

PASO 11. Construye la edición de registros (UPDATE)

11.1 Abre el formulario con los datos existentes

¿Qué lograrás? Permitir que el usuario modifique un registro sin tener que volver a escribir todos sus datos.
¿Dónde dirigirte? En el listado del módulo, agrega o habilita una acción “Editar” por cada registro.
1. Al seleccionar Editar, identifica el registro mediante su identificador único.
2. Abre la ruta o vista de edición correspondiente.
3. Solicita al backend el registro seleccionado, si todavía no tienes sus datos disponibles.
4. Completa los campos del formulario con los valores actuales.
5. Muestra el nombre o identificador del elemento que se está modificando para evitar confusiones.
6. Mantén las mismas reglas de validación definidas para el registro nuevo.
Guarda como evidencia: Captura de la pantalla de edición con los datos de un registro existente.

11.2 Guarda los cambios y verifica la actualización

¿Qué lograrás? Enviar únicamente los cambios permitidos y comprobar que persisten.
¿Dónde dirigirte? En el formulario de edición, vincula el botón Guardar cambios con la función de actualización del servicio
o con la acción MVC.
1. Lee los datos modificados y ejecuta las validaciones de la interfaz.
2. Identifica el registro mediante el identificador correcto.
3. Envía la solicitud PUT o PATCH, según la ruta implementada en la Actividad 2, o utiliza el mecanismo MVC

correspondiente.

4. Muestra un indicador mientras el backend procesa la actualización.
5. Si la operación funciona, informa al usuario y actualiza la información visible.
6. Vuelve al listado o permite continuar editando, de acuerdo con la navegación diseñada.
7. Recarga la pantalla o consulta nuevamente el registro para comprobar que el cambio quedó guardado.
Guarda como evidencia: Captura antes y después de la modificación y evidencia de persistencia del dato actualizado.

COMPROBACIÓN  No basta con cambiar el texto de la pantalla. Cierra o recarga la vista y vuelve a consultar el registro: el
nuevo valor debe provenir del backend y permanecer guardado en la base de datos.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 11

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

PASO 12. Construye la acción de eliminación o desactivación (DELETE)

12.1 Diseña una confirmación antes de eliminar

¿Qué lograrás? Evitar que el usuario borre información importante por un clic accidental.
¿Dónde dirigirte? En cada fila del listado, agrega la acción que corresponda a la regla de negocio definida en la Actividad 2.
1. Utiliza un botón o enlace con la etiqueta “Eliminar” o “Desactivar”.
2. Antes de ejecutar la acción, muestra un cuadro de confirmación.
3. Identifica claramente qué registro se pretende eliminar o desactivar.
4. Ofrece las opciones Confirmar y Cancelar.
5. Si el usuario cancela, cierra el cuadro sin modificar la información.
6. Si el usuario confirma, ejecuta la función correspondiente del servicio o la acción MVC.
Guarda como evidencia: Captura del cuadro de confirmación y del resultado cuando el usuario cancela.

12.2 Ejecuta la operación y actualiza la pantalla

¿Qué lograrás? Reflejar el resultado real de la operación en la interfaz.
¿Dónde dirigirte? Conecta la confirmación con el endpoint o la ruta real del backend.
1. Envía la solicitud DELETE o la acción de desactivación, según se definió en el backend.
2. Evita ejecutar la operación dos veces mientras la primera solicitud está pendiente.
3. Si el backend confirma la operación, retira el registro de la lista o actualiza su estado.
4. Muestra un mensaje que explique qué ocurrió.
5. Si existe una restricción por relaciones, presenta el mensaje del backend de forma comprensible.
6. No ocultes el error ni elimines restricciones de integridad para que la operación parezca exitosa.
Guarda como evidencia: Captura de la confirmación, del resultado y del listado actualizado.

REGLA DE NEGOCIO  Si un registro está relacionado con otros datos, es posible que no deba eliminarse físicamente. Utiliza la
eliminación lógica o desactivación cuando así lo definió el diseño aprobado. La interfaz debe reflejar esa regla.

PASO 13. Mejora los estados, mensajes y comportamiento de la interfaz

13.1 Atiende los estados de carga, vacío y error

¿Qué lograrás? Evitar que el usuario vea una pantalla en blanco o crea que la aplicación se quedó bloqueada.
¿Dónde dirigirte? Revisa las pantallas que consultan información y los formularios que realizan solicitudes al backend.
1. Mientras se consultan los datos, muestra un texto o indicador como “Cargando productos…”.
2. Si la consulta termina y no existen registros, presenta un mensaje como “Todavía no hay productos registrados”.
3. Si hay registros, muestra el listado normal.
4. Si el servidor no responde, informa que no se pudo conectar y ofrece una acción para intentar nuevamente.
5. Si el registro no existe, muestra un mensaje claro y permite volver al listado.
6. Si el usuario no tiene permiso para una operación, informa que la acción no está autorizada.
7. No presentes mensajes técnicos extensos ni rutas internas al usuario final.
Guarda como evidencia: Capturas de al menos tres estados: cargando, listado vacío y error controlado.

13.2 Mejora los formularios y la interacción

¿Qué lograrás? Hacer que las acciones sean claras, predecibles y fáciles de corregir.
¿Dónde dirigirte? Revisa cada formulario y cada tabla desde la perspectiva de una persona que nunca utilizó el sistema.
1. Utiliza etiquetas visibles para los campos; no dependas únicamente del texto de ejemplo dentro del campo.
2. Muestra los errores junto al campo correspondiente y utiliza mensajes concretos.
3. Mantén el texto introducido cuando se produce un error de validación, siempre que sea seguro.
4. Deshabilita botones mientras se procesa una operación para evitar envíos repetidos.
5. Utiliza textos claros en botones: “Guardar”, “Cancelar”, “Editar”, “Volver”.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 12

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

6. Comprueba que los mensajes de éxito no desaparezcan antes de que el usuario pueda leerlos.
Guarda como evidencia: Capturas de los formularios con validaciones y mensajes comprensibles.

PASO 14. Adapta la interfaz a distintos dispositivos y considera la
accesibilidad

14.1 Comprueba el diseño responsive

¿Qué lograrás? Asegurar que la aplicación pueda utilizarse en los tamaños de pantalla definidos para el proyecto.
¿Dónde dirigirte? Abre la aplicación en el navegador. Utiliza la opción de herramientas de desarrollo (F12) y activa la vista
de dispositivo o Device Toolbar.
1. Prueba primero el diseño en una ventana de escritorio.
2. Reduce el ancho de la ventana y observa si el menú, las tablas y los formularios se ajustan.
3. Prueba un tamaño similar al de una tableta y otro similar al de un teléfono.
4. Comprueba que los botones no queden fuera de la pantalla y que los campos puedan utilizarse.
5. Si la tabla no cabe, utiliza una alternativa adecuada: desplazamiento horizontal controlado, tarjetas o columnas

prioritarias.

6. Ajusta el diseño en los estilos del proyecto y repite la comprobación.
Guarda como evidencia: Capturas de la misma pantalla en escritorio y en un ancho reducido.

14.2 Comprueba aspectos básicos de accesibilidad

¿Qué lograrás? Facilitar el uso del sistema a personas con distintas condiciones de visión, movimiento o interacción.
¿Dónde dirigirte? Revisa los formularios, botones, menús, colores y mensajes en el navegador.
1. Comprueba que los campos tengan etiquetas asociadas y que indiquen su propósito.
2. Verifica que se pueda recorrer el formulario utilizando la tecla Tab.
3. Comprueba que el foco del teclado sea visible.
4. No uses solo el color para explicar un error o un estado; agrega texto o un icono acompañado de una etiqueta.
5. Utiliza textos alternativos para imágenes que transmiten información.
6. Comprueba que los botones tengan nombres comprensibles y no sean únicamente iconos ambiguos.
Guarda como evidencia: Lista de comprobación de accesibilidad y capturas de los ajustes principales.

IMPORTANTE  No es necesario convertir esta actividad en una auditoría profesional de accesibilidad. Debes aplicar buenas
prácticas básicas y corregir problemas evidentes que impidan utilizar las pantallas.

PASO 15. Integra y verifica el recorrido completo del usuario
En esta actividad debes comprobar que las pantallas se comunican correctamente con el backend. El plan formal de
pruebas, el informe de pruebas y el despliegue se desarrollarán con mayor profundidad en la Actividad 4.

15.1 Ejecuta un recorrido funcional desde la interfaz

¿Qué lograrás? Verificar que el usuario pueda completar el proceso sin recurrir directamente a Postman ni modificar la
base de datos manualmente.
¿Dónde dirigirte? Inicia la base de datos, el backend y el frontend. Abre la aplicación en el navegador con una sesión o
usuario de prueba cuando corresponda.
1. Entra al módulo desde el menú principal.
2. Consulta el listado y comprueba que los datos coinciden con el backend.
3. Registra un dato nuevo utilizando el formulario de la interfaz.
4. Regresa al listado y comprueba que el nuevo registro aparece.
5. Abre la edición, modifica un campo y guarda los cambios.
6. Vuelve a consultar el registro y comprueba que el cambio persiste.
7. Ejecuta la eliminación o desactivación y verifica el resultado.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 13

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

8. Repite el recorrido con al menos un dato inválido para comprobar que el usuario recibe una explicación.
Guarda como evidencia: Capturas secuenciales del recorrido y una tabla con los resultados obtenidos desde la interfaz.

Acción de usuario

Qué debe ocurrir en pantalla

Qué se debe comprobar en backend

Abrir listado

Aparecen los datos disponibles.

La solicitud de consulta llega al endpoint o controlador.

Guardar registro válido

Se muestra confirmación y el dato aparece.

El backend guarda el registro en la base de datos.

Guardar dato inválido

Se presenta el error y no se confirma el registro.

El servidor rechaza el dato incorrecto.

Editar registro

Se muestran los datos actuales y luego el cambio.

La actualización persiste.

Eliminar / desactivar

Se solicita confirmación y se refleja el resultado.

Se aplica la regla de eliminación definida.

15.2 Revisa la trazabilidad con los requerimientos

¿Qué lograrás? Comprobar que cada pantalla y acción responde a una necesidad identificada en la Actividad 1.
¿Dónde dirigirte? Abre la tabla de requerimientos funcionales de la Actividad 1 y compárala con el frontend terminado.
1. Selecciona cada requerimiento que se implementa en esta actividad.
2. Identifica qué pantalla permite cumplirlo.
3. Identifica qué acción del usuario lo activa.
4. Relaciona la acción con el endpoint o controlador del backend.
5. Registra si el requerimiento está implementado, parcialmente implementado o pendiente.
6. No declares terminado un requerimiento si solo existe un botón sin operación real.
Guarda como evidencia: Matriz de trazabilidad actualizada: requerimiento, pantalla, acción, backend y estado.

PASO 16. Actualiza GitHub y organiza la entrega

16.1 Guarda y respalda los cambios

¿Qué lograrás? Conservar el código frontend y su integración en el repositorio del proyecto.
¿Dónde dirigirte? Abre la pestaña Source Control de Visual Studio Code o utiliza la terminal integrada.
1. Revisa los archivos modificados y comprueba que no existan archivos temporales innecesarios.
2. Verifica que los archivos de configuración con claves privadas o contraseñas no estén incluidos en el repositorio.
3. Comprueba que exista un archivo de instrucciones actualizado, por ejemplo README.md.
4. Agrega los archivos del frontend y los cambios necesarios de integración.
5. Escribe un mensaje de commit claro, por ejemplo “Implementa frontend del módulo productos”.
6. Realiza el commit y envía los cambios al repositorio remoto según el flujo de ramas del proyecto.
7. Abre GitHub y confirma que los archivos y el commit aparecen correctamente.
Guarda como evidencia: URL del repositorio actualizado, captura del commit y estructura de carpetas.

16.2 Actualiza el README del proyecto

¿Qué lograrás? Permitir que otra persona pueda comprender y ejecutar el frontend.
¿Dónde dirigirte? Abre README.md en Visual Studio Code y completa o actualiza la documentación.
1. Escribe el nombre y objetivo de la aplicación.
2. Describe la arquitectura: frontend separado y API REST, o MVC con vistas del servidor.
3. Indica la tecnología y versión que realmente utilizaste.
4. Explica los requisitos previos y el procedimiento de instalación e inicio.
5. Indica cómo configurar la dirección del backend o las variables de entorno sin publicar secretos.
6. Enumera los módulos y pantallas implementados.
7. Incluye el enlace a documentación adicional o capturas cuando corresponda.
Guarda como evidencia: README actualizado y verificable. No escribas instrucciones de instalación que no hayas
probado.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 14

PASO 17. Prepara el documento PDF y las evidencias
El documento debe demostrar qué construiste, cómo se conecta con el backend y qué resultados puedes comprobar. No
entregues únicamente capturas sueltas ni un conjunto de archivos sin explicación.

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

17.1 Organiza el informe de la Actividad 3

¿Qué lograrás? Presentar el resultado con un orden que facilite la revisión del docente.
¿Dónde dirigirte? Abre Word y crea un documento nuevo. Utiliza títulos claros, capturas legibles y tablas breves.
1. Incluye una portada con nombre del proyecto, estudiante, materia, actividad y fecha.
2. Describe brevemente el objetivo del frontend y su relación con las actividades anteriores.
3. Explica la arquitectura de presentación que utiliza el proyecto.
4. Muestra la estructura de carpetas y explica la función de los elementos principales.
5. Presenta las pantallas y la navegación implementadas.
6. Explica cómo se conecta el frontend con el backend y muestra las rutas o acciones utilizadas.
7. Incluye evidencias de consulta, registro, actualización y eliminación o desactivación.
8. Agrega ejemplos de validaciones, mensajes, carga, errores y diseño responsive.
9. Incluye el enlace al repositorio GitHub y una conclusión sobre el estado alcanzado.
Guarda como evidencia: Documento final revisado y exportado a PDF.

17.2 Verifica las capturas y archivos

¿Qué lograrás? Asegurar que el docente pueda abrir y comprobar la entrega.
¿Dónde dirigirte? Abre el PDF exportado y el repositorio desde el navegador.
1. Comprueba que las capturas no estén cortadas y que el texto se pueda leer.
2. Verifica que las imágenes correspondan al proyecto real y no a ejemplos de la guía.
3. Confirma que los enlaces funcionen y que el repositorio permita el acceso requerido.
4. Comprueba que el PDF se abra correctamente en otro visor.
5. Ordena los archivos con nombres claros y evita incluir claves, contraseñas o datos personales sensibles.
6. Conserva los archivos fuente del proyecto; el PDF no reemplaza el código.
Guarda como evidencia: PDF final, URL GitHub y carpeta de evidencias ordenada.

ENTREGA FINAL: organiza los archivos
La Actividad 3 se entrega con el frontend implementado e integrado con el backend de la Actividad 2. Organiza el material en
el siguiente orden sugerido:

Orden

Contenido

Qué debes verificar

1

2

3

4

5

6

7

8

9

Portada

Nombre del proyecto, estudiante, materia, actividad y fecha.

Continuidad del proyecto

Mismo tema, módulos y prototipo aprobados en la Actividad 1.

Arquitectura frontend

Estructura del código

Diseño e interfaces

Navegación

Alternativa utilizada, tecnología aprobada y organización general.

Carpetas, páginas, componentes, servicios, rutas y estilos.

Pantallas implementadas y relación con el prototipo Figma.

Menús, rutas y enlaces funcionando.

Integración backend

Solicitudes, endpoints o acciones MVC y datos reales.

Operaciones CRUD desde la interfaz

Consulta, registro, actualización y eliminación o desactivación.

Experiencia de usuario

Validaciones, carga, vacío, errores, mensajes y diseño responsive.

10

Repositorio y conclusión

URL GitHub, commits, README, limitaciones y trabajo pendiente.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 15

UPDS  |  INGENIERÍA DE SISTEMAS  |  SÉPTIMO SEMESTRE

Lista de comprobación antes de enviar

☐  El proyecto continúa siendo el mismo de la Actividad 1 y utiliza el backend de la Actividad 2.

☐  La arquitectura frontend corresponde al C4 y a la tecnología aprobada.

☐  El prototipo de Figma se utilizó como referencia para las pantallas.

☐  La estructura del código separa páginas, componentes, servicios y estilos según el framework.

☐  El encabezado, menú y navegación permiten llegar a las secciones implementadas.

☐  El listado muestra datos reales obtenidos del backend o del controlador MVC.

☐  El formulario registra datos mediante el backend y muestra el resultado.

☐  La edición carga datos existentes y persiste los cambios.

☐  La eliminación o desactivación respeta las reglas del negocio y solicita confirmación.

☐  Los campos tienen validaciones y mensajes comprensibles.

☐  La aplicación maneja estados de carga, lista vacía y errores de conexión.

☐  La interfaz se puede utilizar en los tamaños de pantalla considerados.

☐  Las solicitudes al backend funcionan y no existen errores importantes en consola.

☐  El repositorio GitHub contiene el código actualizado y no expone secretos.

☐  El PDF contiene capturas reales, explicación y enlace verificable al repositorio.

Errores frecuentes que debes evitar

• Crear un frontend diferente al proyecto aprobado o cambiar el alcance sin autorización.
• Presentar datos escritos manualmente como si provinieran de la base de datos, o cambiar campos y rutas sin revisar el

backend.

• Colocar todas las pantallas, estilos y solicitudes en un único archivo difícil de mantener.
• Permitir envíos repetidos o dejar una pantalla en blanco cuando existen errores o no hay registros.
• Usar el color como único indicador de error o estado, sin mensajes comprensibles.
• Eliminar restricciones del backend o subir claves, tokens, contraseñas o archivos .env a GitHub.
• Entregar capturas de una interfaz sin demostrar que las acciones funcionan realmente.

RESULTADO ESPERADO  Al terminar esta actividad tendrás el frontend de tu misma aplicación web, conectado al backend de
la Actividad 2. Desde la interfaz se podrán consultar, registrar, modificar y eliminar o desactivar datos, según los
requerimientos aprobados. Puedes utilizar IA como apoyo, pero debes comprender, verificar y explicar el código que entregas.
En la Actividad 4 desarrollarás el plan formal de pruebas, el informe, la corrección de defectos y el despliegue.

Desarrollo de Sistemas II  •  Guía práctica del estudiante  |  Página 16

