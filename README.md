# Documentación Técnica y de Mejoras: Dashboard Traffic UPC

Este documento resume la funcionalidad principal, correcciones y mejoras de diseño que se han implementado en el proyecto **Dashboard Analítico de Leads (Monitor de Captación de Tráfico - CRM)**.

## Visión General: ¿Para qué sirve este Dashboard?

El **Dashboard Traffic UPC** es una herramienta analítica web autónoma (HTML, CSS, JS) diseñada para visualizar y analizar el rendimiento diario de la captación de leads en el CRM institucional. Su objetivo principal es permitir a los líderes y analistas de marketing tomar decisiones estratégicas basadas en datos en tiempo real.

**Principales Casos de Uso:**

- **Monitoreo de Volumen:** Controlar cuántos leads totales ingresan y qué porcentaje corresponde a tráfico orgánico/directo (_Inbound_) versus esfuerzos de contacto saliente (_Outbound_).
- **Análisis de Rendimiento por Canal y Campaña:** Identificar qué campañas de marketing o canales (WhatsApp, Email, etc.) están generando el mayor volumen de registros.
- **Identificación de Patrones (Estacionalidad semanal):** Conocer qué días de la semana atraen más tráfico cruzado con la dirección (Inbound/Outbound) a través de un mapa de calor/tabla dinámica, permitiendo optimizar el presupuesto publicitario.
- **Insights Automatizados:** Generar frases descriptivas dinámicas que resumen el comportamiento de la data filtrada al instante.

## 1. Actualizaciones Recientes

> [!NOTE]
> **Selección Múltiple de Filtros con Interfaz Personalizada (Dropdowns)**
> Se modernizó el sistema de filtrado permitiendo elegir 1, 2 o múltiples opciones simultáneas en los selectores de Campaña, Canal, Segmento, Fecha y Semana. Para mantener una interfaz limpia sin dependencias de terceros, se desarrolló un componente desplegable propio con Tailwind CSS que incluye casillas de verificación (checkboxes) e indicadores de selección resumidos.

> [!NOTE]
> **Nuevo Análisis de Concentración por Hora**
> Se añadió un Gráfico de Dispersión (Scatter Chart) que permite visualizar en qué horas del día los leads ingresan al CRM. El parser de CSV fue adaptado para limpiar y extraer eficientemente el formato numérico o de texto horario (`14:30` o similares) alojado en la columna "Hora".

> [!NOTE]
> **Mejora Visual: Gráfico de Torta (Pie) para Top Campañas**
> Se cambió la representación visual del bloque "Top Campañas" de un gráfico de barras horizontales a un gráfico de torta (Pie Chart), permitiendo una mejor visualización de la proporción que cada campaña representa respecto al top 5 total. Además, se le aplicó la paleta de colores institucional.

> [!NOTE]
> **Nuevo Gráfico de Análisis por Canal**
> Se integró un nuevo bloque gráfico llamado **"Comparativa por Canal"** que acompaña a la sección de "Top Campañas". Este gráfico de barras horizontales permite visualizar y comparar rápidamente el volumen de captación de leads distribuido por los distintos canales de comunicación (ej. WhatsApp, Email, SMS, Facebook). Esta gráfica complementa el análisis de campañas aportando visibilidad directa sobre las herramientas de contacto más efectivas.

## 2. Correcciones Estructurales y de Datos

> [!IMPORTANT]
> Se solucionaron errores críticos que impedían la carga y lectura correcta de las bases de datos exportadas desde Excel.

- **Manejo Dinámico de Codificación (Encoding):**
  - Se reemplazó el lector tradicional de texto por `FileReader.readAsArrayBuffer()`.
  - Se implementó un sistema inteligente con `TextDecoder` que intenta leer el archivo primero en `UTF-8`. Si detecta caracteres corruptos, hace un _fallback_ automático a `windows-1252` (ANSI).
- **Normalización Robusta de Columnas (PapaParse):**
  - Para evitar que variaciones en los nombres de las columnas rompan el dashboard, se añadió un proceso de limpieza.
  - Se eliminan espacios extra, se quitan tildes usando `.normalize("NFD")` y se pasa todo a minúsculas antes de mapear.
  - **Manejo de Horas Vacías:** Se añadió una validación estricta al parsear la columna "Hora". Las celdas vacías ahora son explícitamente ignoradas en lugar de ser interpretadas como el número cero. Esto previene un pico falso de datos a las "0:00 hrs" que distorsionaba el KPI de "Mejor Horario" y el Diagrama de Dispersión.

- **Optimización de Rendimiento (Renderizado de Filtros):**
  - Se solucionó un problema crítico que congelaba la página web al cargar archivos que contenían miles de opciones únicas (como fechas u horas).
  - Se cambió la lógica de inyección HTML de los filtros desplegables. En lugar de forzar al navegador a redibujar el elemento múltiples veces en un bucle (`innerHTML +=`), ahora el código concatena el texto en memoria y lo inyecta una sola vez. Esto asegura que la página ya no se quede en blanco, acelerando los tiempos de carga masiva.

## 3. Nuevas Funcionalidades (Filtros Avanzados Multi-Selección)

Se ampliaron las capacidades de filtrado interactivo. Ahora el usuario puede segmentar la data seleccionando múltiples valores al mismo tiempo, cruzando hasta 7 variables:

- Campañas (Multi-select)
- Canales (Multi-select)
- Segmentos (Multi-select)
- **Fechas** (Multi-select)
- **Semanas** (Multi-select)
- **Horas** (Multi-select)
- **Dirección** (Selección Única)

> [!NOTE]
> **Filtros en Cascada (Dinámicos)**
> Los filtros ahora son inteligentes y dependientes. Al seleccionar un valor en cualquiera de los filtros (por ejemplo, una Campaña específica), las opciones de los demás filtros (Canal, Segmento, Fecha, etc.) se actualizan automáticamente para mostrar **solo los datos que están disponibles** bajo esa selección. Esto evita que el usuario vea opciones vacías o sin resultados, mejorando la experiencia de exploración de datos. Además, se implementó un botón **"Limpiar Filtros"** que restablece todos los selectores a su estado global original de forma simultánea.

Todos los gráficos, tarjetas (KPIs) y la tabla cruzada responden inmediatamente a la combinación de estos 6 selectores.

## 4. Rediseño UX/UI Minimalista

> [!TIP]
> El dashboard pasó de un diseño tosco con bordes pesados a una interfaz plana, moderna y profesional, alineada con tendencias corporativas de UI.

- **Tarjetas y Contenedores (Cards):**
  - Se añadieron bordes sutiles grises, bordes redondeados suaves y sombras ligeras.
- **Tipografía:**
  - Se implementó la fuente **Inter** de Google Fonts para garantizar limpieza y legibilidad.
- **Gráficos (Chart.js):**
  - Se eliminó el "ruido visual" quitando las líneas de cuadrícula (grid) de los fondos.
  - Se afinó la paleta de colores para usar el rojo de la marca (UPC) y grises sofisticados.
- **Feedback Visual (Loader Animado):**
  - Se agregó una pantalla de carga superpuesta (overlay con un spinner animado en CSS) que informa al usuario mientras se procesan los datos del archivo CSV o JSON. Esto mejora significativamente la experiencia del usuario, evitando clics accidentales o confusión durante el tiempo de procesamiento.

## 5. Lógica de Cálculo y Fórmulas del Dashboard

- **Total de Leads (KPI):** Conteo de valores únicos de la columna `Cod Persona` para evitar data duplicada.
- **Porcentajes de Inbound / Outbound:** Clasificación estricta mediante limpieza de strings.
- **Día de mayor rendimiento (Mejor Día):** Moda estadística por iteración cruzada del día con mayor volumen.
- **Horario de mayor rendimiento (Mejor Horario):** Moda estadística por iteración cruzada de las horas (mostrada en formato `XX:00 hrs`).
- **Tablas Dinámicas (Pivot Tables) y Detalle:**
  - **Dirección vs Día de la Semana:** Intersección fija que cuenta leads únicos por día para evaluar el rendimiento micro (intrasemanal).
  - **Dirección vs Semana (Registros Totales):** Intersección dinámica que escanea los datos activos, identifica las semanas existentes, las ordena numéricamente y autogenera las columnas correspondientes para comparar la evolución macro del volumen Inbound/Outbound (incluyendo duplicados para coincidir con el total global).
  - **Detalle de Registros (Inbound / Outbound):** Tabla detallada que agrupa la información basada en la intersección de Campaña, Canal, Segmento, Semana y Dirección, sumando el total absoluto de registros/filas.

> [!IMPORTANT]
> **Lógicas de agrupación y comparación de totales entre las tablas del Dashboard:**
> Las tablas están estructuradas para brindar diferentes perspectivas analíticas, lo que influye en sus totales generales:
> 
> 1. **Tabla "Dirección vs Día de la Semana (Leads Únicos)" (Total intermedio):**
>    - **Lógica de cálculo:** Agrupa y cuenta leads únicos (`Cod Persona`) **por cada día individual** para evaluar el rendimiento diario (micro).
>    - **Efecto en el total:** Si un usuario interactúa el martes y el jueves, se contabiliza 1 el martes y 1 el jueves. Al sumar las columnas diarias para calcular el *Total General*, este usuario se sumará dos veces.
> 
> 2. **Tabla "Dirección vs Semana (Registros Totales)" (Total global/más alto):**
>    - **Lógica de cálculo:** Agrupa y cuenta el **volumen total de registros** por cada semana.
>    - **Efecto en el total:** No aplica restricciones de unicidad por código de persona, permitiendo medir y comparar el flujo real bruto de leads generados semana tras semana (incluyendo reintentos o campañas simultáneas). Su *Total General* coincide perfectamente con el del "Detalle de Registros".
> 
> 3. **Tabla "Detalle de Registros (Inbound / Outbound)" (Total global/más alto):**
>    - **Lógica de cálculo:** Agrupa de manera granular por Campaña, Canal, Segmento, Semana y Dirección, sumando el total absoluto de registros/filas del archivo CSV.
>    - **Efecto en el total:** Al igual que la tabla semanal, no desduplica leads. Coincide exactamente con el total de "Dirección vs Semana (Registros Totales)".

## 6. Capacidades y Límites de Carga

Dado que el dashboard procesa toda la información de manera local en el navegador del usuario (Client-Side) a través de JavaScript, no existe un límite preestablecido por un servidor. La capacidad de procesamiento depende directamente de la memoria RAM y el procesador de la computadora:

- **Rendimiento Óptimo (Recomendado):** Para una carga y aplicación de filtros fluida e instantánea, se sugiere utilizar archivos de hasta **100,000 filas** (aprox. 15 MB).
- **Límite Máximo Práctico:** El sistema puede procesar archivos de hasta **500,000 a 1,000,000 de filas** (aprox. 100 MB a 150 MB). Con este volumen de datos, el navegador puede experimentar ligeros congelamientos temporales mientras se procesa la información en la memoria. Superar este límite podría ocasionar que la pestaña colapse por falta de memoria.

## 7. Exportación a PDF y Ajuste del Filtro de Dirección

> [!NOTE]
> **Impacto Global del Filtro de Dirección**
> Se ajustó la lógica del selector de "Dirección" (Inbound/Outbound) para que opere de manera global sobre todo el dashboard (KPIs, gráficos e insights). Adicionalmente, se programó un comportamiento especial en la tabla cruzada ("Dirección vs Día de la Semana") para que al seleccionar una dirección, la tabla oculte por completo la fila contraria en lugar de mostrarla en ceros, garantizando una visualización enfocada y limpia.

> [!NOTE]
> **Exportación Visual Avanzada (PDF Reports en A4 Vertical)**
> Se integró y re-configuró la librería `html2pdf.js` junto a `chartjs-plugin-datalabels` para generar reportes ejecutivos listos para producción y orientados a impresión:
> - **Data Labels Dinámicas con Retardo:** Los gráficos se mantienen minimalistas en el visor, pero al exportar revelan automáticamente las etiquetas numéricas para que el reporte impreso sea explícito. Estas etiquetas permanecen visibles por 10 segundos tras la exportación y luego desaparecen automáticamente, brindando contexto temporal y limpieza visual.
> - **Estructura Inteligente Anti-Cortes:** Se eliminaron reglas CSS globales (como clases `.export-mode` que generaban bugs de colapso) y se optó por un control programático mediante JavaScript. Ahora, al exportar, se inyecta dinámicamente `page-break-inside: avoid` a nivel _inline_ en todas las tarjetas, tablas y gráficos (canvas), y se refuerza con la configuración `pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }` del motor PDF, garantizando que ninguna gráfica o tabla se parta a la mitad entre dos hojas físicas.
> - **Optimización para Layout A4 Vertical (Portrait):** Para lograr que el diseño de escritorio (de 2 columnas para gráficos y 4 para KPIs) se acomode de forma legible y elegante en una hoja vertical (A4), el script ahora bloquea temporalmente el contenedor principal a un ancho fijo de `800px`. A continuación, utiliza un temporizador (`setTimeout` de 500ms) para dar tiempo a que los motores internos de `Chart.js` recalculen sus dimensiones y se re-dibujen a esta nueva escala antes de hacer la captura fotográfica del documento. Tras exportarse, se activa una función `cleanupExport` que purga todos los anchos forzados, devolviendo la vista web a su estado 100% responsivo original.

> [!TIP]
> **Modal de Instrucciones de Formato de Datos**
> Se añadió un botón informativo (icono "?") junto al botón "Cargar CSV". Al pulsarlo, despliega un modal o ventana superpuesta que orienta al usuario indicándole las 9 columnas obligatorias que debe tener el archivo CSV (incluyendo la recién incorporada columna "Hora"), además de dar recomendaciones de limpieza de datos (formato de fechas, evitar celdas vacías, etc.), mejorando la adopción y disminuyendo la fricción al cargar archivos nuevos.

---

**Estado Actual:** Proyecto estabilizado, tolerante a errores de exportación, interactivo y con una presentación ejecutiva óptima, integrando analítica completa de campañas y canales, y capacidad de reporte exportable.

## 8. Integración con IA Generativa (Google Gemini)

> [!TIP]
> **Botón "Yimini IA" y Análisis Cognitivo**
> Se integró la API de Google Gemini directamente en el frontend para ofrecer análisis de datos avanzados y conclusiones estratégicas con un solo clic.

- **Generación de Insights Inteligentes:** Al hacer clic en el botón "Yimini IA" (el cual ha sido dotado de un efecto visual pulsante `animate-glow-pulse` para fomentar la interacción), el dashboard compila un set completo de datos que incluye horas, segmentos, días, canales y campañas. Este prompt instruye a la IA para emitir **5 insights estratégicos breves de alto impacto** orientados a acciones de negocio.
- **Seguridad y Ofuscación de API Key:** Dado que el dashboard ha sido concebido para alojarse de forma pública (ej. GitHub Pages) sin un servidor backend, la clave de la API de Gemini se ha protegido mediante un mecanismo de ofuscación de strings (inversión de cadenas). Esto previene que bots automatizados de rastreo detecten y extraigan la llave al analizar el código fuente público.
- **Actualización de Modelo de IA:** Se modificó la petición interna de la API para conectarse específicamente al modelo de última generación **`gemini-2.5-flash`**, ya que este es el modelo asignado y optimizado por los servidores de Google para las nuevas API Keys, garantizando compatibilidad total (evitando el error HTTP 404).
- **Sistema de Respaldo (Fallback Automático Expandido):** Si la API de Gemini no responde por problemas de red o límite de cuota, el sistema incluye un mecanismo de _fallback_ robusto. La función `generateInsights()` ahora evalúa automáticamente hasta 6 conclusiones estadísticas clásicas locales (Tráfico dominante, Día clave, Hora punta, Mejor Campaña, Canal Estrella y Segmento principal), garantizando que la lectura analítica siempre brinde valor.

## 9. Nuevas Vistas y Mejoras de Usabilidad

> [!NOTE]
> **Búsqueda Inteligente en Filtros Desplegables**
> Se integraron barras de búsqueda en tiempo real dentro de los filtros de "Campaña", "Canal" y "Segmento". Esta mejora facilita enormemente la selección de opciones en listas largas (como los segmentos). La búsqueda es insensible a mayúsculas y acentos (utilizando normalización NFD), y su estado se mantiene estable sin importar la actualización cruzada de los filtros en cascada. El botón "Limpiar Filtros" también borra el contenido de estas búsquedas.

> [!NOTE]
> **Promedios Dinámicos en Tablas Cruzadas (Disclaimers)**
> Se añadieron pequeños textos informativos (disclaimers) debajo de las tablas cruzadas de "Dirección vs Día" y "Dirección vs Semana". Estos textos calculan de manera automática y matemática el **promedio diario de leads únicos y el promedio semanal de registros**, desglosándolo entre Inbound y Outbound, según los filtros activos.

> [!NOTE]
> **Nueva Tabla: Detalle de Registros (Inbound / Outbound)**
> Se creó una vista tubular especializada para auditar en profundidad los registros. Esta tabla agrupa la información basándose en la intersección de Campaña, Canal, Segmento, Semana y Dirección, calculando automáticamente el total de registros consolidados. 
> - **Limpieza de Datos Visual:** Se programó una función para limpiar los nombres de los segmentos, eliminando sufijos numéricos (ej. `- 314`) y mejorando la legibilidad. Se omitieron columnas innecesarias como "Fecha" y "Hora" de esta vista para mantener un análisis enfocado.
> - **Ordenamiento Interactivo Excel-like:** Se implementó lógica de ordenamiento directo en los encabezados de las columnas. Al hacer clic en cualquier encabezado (Campaña, Registros, etc.), la tabla se ordena automáticamente ascendente o descendente, mostrando flechas indicadoras (`▲` / `▼`).
> - **Fila de Totales Dinámica:** La tabla cuenta con un pie de tabla fijado en la parte inferior (sticky footer) que suma en tiempo real todos los registros mostrados, brindando visibilidad instantánea del volumen total bajo el filtro actual.

> [!NOTE]
> **Evolución Semanal en Insights Estratégicos**
> Se añadió un nuevo motor de análisis temporal en la sección de Insights locales. Cuando el dashboard detecta al menos dos semanas de historial en la base de datos cargada, calcula automáticamente el porcentaje de crecimiento o caída en la captación de leads (aplicado independientemente para esfuerzos Inbound y Outbound) entre la última y la penúltima semana, redactando la variación como un apunte ejecutivo.
