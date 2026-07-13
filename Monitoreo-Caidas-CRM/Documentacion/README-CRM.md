# Monitor de Caídas e Intermitencias CRM - UPC 🚨
### Documentación Técnica y Manual de Arquitectura Operacional

Este documento unifica y detalla los aspectos técnicos, la arquitectura de software, las reglas de negocio y las integraciones de Inteligencia Artificial (RAG) que componen la plataforma del **Monitor de Caídas e Intermitencias CRM** de la UPC. Está diseñado para que desarrolladores, administradores de sistemas y analistas de datos entiendan el funcionamiento interno y puedan dar soporte o extender la herramienta.

---

## 📌 Tabla de Contenidos
1. [Introducción y Propósito](#1-introducción-y-propósito)
2. [Stack Tecnológico y Arquitectura](#2-stack-tecnológico-y-arquitectura)
3. [Lógica de Negocio y Fórmulas Analíticas](#3-lógica-de-negocio-y-fórmulas-analíticas)
4. [Módulo de Inteligencia Artificial (Analista IA CRM)](#4-módulo-de-inteligencia-artificial-analista-ia-crm)
5. [Heurísticas de Diagnóstico Inteligente](#5-heurísticas-de-diagnóstico-inteligente)
6. [Mapeo Inteligente de Columnas (Fuzzy Matching)](#6-mapeo-inteligente-de-columnas-fuzzy-matching)
7. [Estructura del Repositorio](#7-estructura-del-repositorio)
8. [Instrucciones de Uso y Despliegue](#8-instrucciones-de-uso-y-despliegue)
9. [Guía para Desarrolladores (Mantenimiento)](#9-guía-para-desarrolladores-mantenimiento)

---

## 1. Introducción y Propósito

En los flujos de admisión comercial de la UPC, el **tiempo de respuesta inicial** (SLA de contacto) ante un prospecto digital (lead) es el factor más determinante en la conversión de ventas. Si un lead generado a través de campañas de marketing (redes sociales, formularios, WhatsApp) no se registra inmediatamente en el CRM por problemas de sincronización, la probabilidad de contacto efectivo cae drásticamente.

El **Monitor de Caídas e Intermitencias CRM** es un panel analítico interactivo diseñado para automatizar las auditorías operacionales de ingesta de leads. Al subir archivos históricos en bruto exportados del CRM (Excel o CSV), el sistema analiza cronológicamente la separación temporal entre los registros para:
*   Identificar ventanas de inactividad técnica (brechas o gaps) superiores a 5 minutos.
*   Estimar el impacto comercial mediante la pérdida proyectada de leads.
*   Determinar patrones temporales críticos y canales/fuentes vulnerables.
*   Proporcionar un índice de salud operacional y recomendaciones mediante IA en tiempo real.

---

## 2. Stack Tecnológico y Arquitectura

La plataforma sigue un paradigma de **Arquitectura Frontend Zero-Server** (Client-Side Only). Toda la ingesta, limpieza, ordenamiento cronológico, cálculo de brechas operacionales, renderizado de gráficos y llamadas a la API de IA ocurren directamente en el navegador del usuario.

### Ventajas de este Diseño:
1.  **Privacidad Absoluta:** La información de los leads (datos altamente sensibles que incluyen códigos y marcas de tiempo) se procesa localmente en memoria y **nunca** se sube ni se almacena en servidores externos de bases de datos.
2.  **Portabilidad Extrema:** La aplicación es autocontenida y se puede ejecutar localmente sin dependencias de red en el backend (no requiere Node.js, PHP, Apache o bases de datos).

### Stack de Componentes:
*   **Tailwind CSS (v3 via CDN):** Estructura responsiva de diseño moderno (Glassmorphism, transiciones fluidas y modo ejecutivo), adaptada a la paleta cromática institucional de la UPC (Rojo `#D50000` y Oscuros).
*   **Chart.js (v4 via CDN):** Motor interactivo para renderizar gráficos de tendencia lineal diaria, distribución de severidad por barras horizontales e impacto operacional por canal.
*   **PapaParse (v5 via CDN):** Parser de alta fidelidad para la carga ultrarrápida de CSVs, adaptado para manejar codificaciones problemáticas (como UTF-8 con o sin BOM y Windows-1252/ANSI).
*   **SheetJS / XLSX (v0.18 via CDN):** Motor utilizado para desempaquetar las hojas de cálculo binarias de Excel (`.xlsx` y `.xls`), procesando de forma nativa los tipos de datos de fecha serializados de Microsoft Excel.
*   **html2pdf.js (via CDN):** Herramienta que combina `html2canvas` y `jsPDF` en el cliente para exportar la vista actual o informes a documentos PDF formateados en A4 vertical.

---

## 3. Lógica de Negocio y Fórmulas Analíticas

El análisis de ingesta se rige bajo reglas de negocio automatizadas basadas en auditorías reales:

### A. Detección y Clasificación de Severidad de Brechas
Una brecha o *gap* operacional se activa cuando transcurren **más de 5 minutos** entre el timestamp de creación de un lead y el inmediatamente posterior. Los incidentes se clasifican según su duración:
*   **Baja (🟢):** De 5 a 10 minutos. Microcortes de red o latencia de procesamiento habitual.
*   **Media (🟡):** De 10 a 20 minutos. Retrasos moderados en cola o saturación intermedia.
*   **Alta (🟠):** De 20 a 40 minutos. Problemas considerables de latencia, concurrencia o caída parcial del servicio de sincronización.
*   **Crítica (🔴):** Superior a 40 minutos. Caídas del middleware, tokens de APIs vencidos o fallas en el servidor web.

### B. Disponibilidad CRM (Business-Hours Uptime)
En lugar de promediar las caídas sobre las 24 horas del día (lo cual distorsionaría el uptime debido al comportamiento inactivo natural de las noches y madrugadas), se calcula la disponibilidad comercial acotada al horario comercial activo de marketing y admisiones de la UPC (**Lunes a Viernes 9:00 AM a 9:00 PM, Sábados 9:00 AM a 7:00 PM, Domingos no laborables**):

$$\text{Disponibilidad CRM} = \left( 1 - \frac{\text{Duración de fallas ocurridas en Horario Comercial (min)}}{\text{Total de minutos del período comercial hábil}} \right) \times 100$$

### C. Oportunidades en Riesgo (% Acotado)
Para evitar porcentajes inconsistentes superiores al 100%, se calcula la proporción de prospectos que cayeron en ventanas de falla sobre la **capacidad potencial total** de leads (leads reales sanos + proyección de leads perdidos):

$$\text{Oportunidades en Riesgo (\%)} = \left( \frac{\text{Oportunidades Afectadas Est.}}{\text{Leads Procesados} + \text{Oportunidades Afectadas Est.}} \right) \times 100$$

### D. Índice de Salud CRM (Score Global)
Para simplificar la toma de decisiones gerenciales, se calcula un score global ponderado de `0 a 100` basado en cuatro métricas operacionales reales del código:

1.  **Disponibilidad comercial (40% del peso):** Basado en el porcentaje de uptime comercial ($40 \times \text{Disponibilidad} / 100$).
2.  **Incidentes Críticos (30% del peso):** Se deducen 10 puntos por cada incidente crítico (>40 min), con un puntaje mínimo de 0.
3.  **Tiempo Caído Acumulado (20% del peso):** Penaliza de forma proporcional según las horas caídas acumuladas. Un total de 24 horas (1440 minutos) caídas equivale a 0 puntos en esta sección ($20 \times (1 - \text{Minutos Caídos} / 1440)$).
4.  **Frecuencia entre Leads (10% del peso):** Si la frecuencia promedio en periodo estable supera los 5 minutos, se resta 0.5 puntos por cada minuto de exceso ($10 - (\text{Frecuencia Promedio} - 5) \times 0.5$).

El score resultante se etiqueta visualmente bajo la siguiente escala:
*   `90 - 100` = Excelente (🟢)
*   `75 - 89` = Bueno (🟢)
*   `60 - 74` = Atención (🟡)
*   `40 - 59` = Riesgo (🟡)
*   `0 - 39` = Crítico (🔴)

---

## 4. Módulo de Inteligencia Artificial (Analista IA CRM)

El monitor incorpora un asistente conversacional avanzado ("YiminIA CRM") impulsado por la API de **Google Gemini 2.5 Pro** que funciona mediante RAG (Retrieval-Augmented Generation) local.

### ⚙️ Automatización y Carga de la API Key:
*   **Clave Preconfigurada:** Para facilitar un uso inmediato sin configuración previa, el sistema inicializa y almacena de forma automática en el navegador (`localStorage`) la clave: `AQ.Ab8RN6LjnDg6eTbs7yFJgjSoUSCTeBPOojVtiiL0I473ex4eTQ`.
*   **Modelo Utilizado:** Por defecto `gemini-2.5-pro` debido a su alta ventana de contexto y capacidad de razonamiento lógico sobre datos tabulares agregados.
*   **Personalización:** El usuario puede cambiar la clave o el modelo haciendo clic en el engranaje ⚙️ del chat.

### 🧠 Arquitectura de Contexto RAG:
Cuando se procesa el archivo Excel/CSV, el frontend genera dinámicamente un objeto JSON compacto que contiene:
1.  **Metadatos:** Nombre del archivo, total de leads cargados, Uptime comercial real, tiempo caído acumulado y leads potencialmente afectados.
2.  **Mapeos:** Proporciones de errores, duplicados e inválidos.
3.  **Patrones:** Distribución de incidentes por severidades, patrones por día de la semana, distribución por hora del día, fallas por canal y la lista detallada de los peores 10 incidentes con sus marcas de tiempo y leads afectados.

Este JSON estructurado se inyecta como un **System Prompt** en cada llamada a Gemini, lo que garantiza que las respuestas de la IA se basen estrictamente en la data cargada del CRM.

### 💬 Acciones Rápidas Disponibles:
*   **📋 Resumir Dashboard:** Genera una síntesis ejecutiva estructurada del período.
*   **🚨 Hallazgos Críticos:** Identifica las caídas operativas más largas y los peores incidentes de la data.
*   **💼 Riesgos Comerciales:** Analiza el impacto comercial y la pérdida de leads a nivel de conversiones.
*   **⚙️ Recomendaciones TI:** Desarrolla un plan de acción técnico de infraestructura y middleware.
*   **🧠 Generar Informe Ejecutivo (Modal):** Llama a Gemini para redactar un informe ejecutivo formal completo formateado en HTML semántico nativo, el cual cuenta con opciones de exportación directa a **PDF** o a un documento de **MS Word (.doc)**.

---

## 5. Heurísticas de Diagnóstico Inteligente

Para complementar el análisis, el frontend ejecuta un motor de reglas heurísticas locales que estima de forma probabilística (Alta 🔴, Media 🟡, Baja 🟢, Ninguna ⚪) la causa raíz de las intermitencias operacionales:

1.  **Saturación de Webhook:** Evalúa si hay incidentes acumulados de severidad media/alta concentrados específicamente durante el horario pico comercial de marketing (9:00 AM a 7:00 PM), sugiriendo congestión en las colas del middleware.
2.  **API WhatsApp:** Analiza si los incidentes se concentran mayoritariamente en el canal WhatsApp. Confianza alta si WhatsApp representa más del 40% de los incidentes totales.
3.  **Problema CRM:** Monitorea la estabilidad global del sistema. Confianza alta si la disponibilidad comercial cae del 90% o si se registran más de 3 fallas de severidad crítica.
4.  **Integración Landing:** Compara si la fuente más afectada o el origen principal de las intermitencias corresponde a orígenes Web o formularios del Landing Page institucional.
5.  **Error de Segmentación:** Audita la calidad de los datos importados. Confianza alta si la tasa de calidad de datos (leads válidos versus duplicados, nulos y marcas de tiempo corruptas) es inferior al 95%.

---

## 6. Mapeo Inteligente de Columnas (Fuzzy Matching)

Para que el usuario no tenga que renombrar las columnas de su archivo exportado antes de subirlo, el cargador utiliza una función de normalización y diccionario de sinónimos en español para mapear cabeceras. Soporta los siguientes nombres comunes:

| Propiedad Interna | Nombre Mapeado Final | Expresiones del CRM Soportadas |
| :--- | :--- | :--- |
| `campana` | **Campaña** | Campaña de referencia, campana, campaña |
| `codigoPersona` | **Código de Persona** | Cod persona, Código de Persona, Cod. persona (contacto) (contacto) |
| `estado` | **Estado** | Sub estado, Estado |
| `fecha` | **Fecha** | Fecha de creación, fecha de creacion, fecha |
| `hora` | **Hora** | Hora |
| `periodo` | **Periodo** | Periodo (campaña de referencia) (campaña), periodo |
| `fuenteOrigen` | **Fuente Origen** | Fuente de origen (referente a) (contacto), fuente origen |
| `unidadNegocio` | **Unidad de Negocio** | Unidad de negocio (campaña de referencia), unidad de negocio |
| `direccion` | **Dirección** | Dirección, direccion |
| `canal` | **Canal** | Template Data HSM, canal |
| `segmento` | **Segmento** | Segmento |
| `codCampana` | **Cód de Campaña** | Código de campaña (campaña de referencia), cod de campaña |
| `idChattigo` | **ID Chattigo** | Chattigo conversation id, id chattigo |

---

## 7. Estructura del Repositorio

El repositorio se compone de archivos del lado del cliente organizados de forma limpia:

```bash
Detección-Caídas-CRM/
│
├── crm.html               # Estructura del DOM, layouts responsivos, modales y lógica JavaScript
├── styles.css             # Clases del sistema de diseño, variables de severidad y reglas de impresión PDF
│
├── Data/
│   └── UPC-MEDICINA-Y-EPE-SEM-22.xlsx  # Dataset de prueba de leads del CRM para validaciones
│
└── Documentación/
    └── README.md          # Esta guía de documentación unificada
```

---

## 8. Instrucciones de Uso y Despliegue

### Requisitos:
*   Cualquier navegador moderno (Google Chrome, Microsoft Edge, Firefox o Safari) con JavaScript habilitado.
*   Una conexión a internet activa únicamente para descargar las librerías CDN (Tailwind, PapaParse, XLSX, Chart.js, html2pdf) y conectarse a la API de Gemini de Google.

### Despliegue:
1.  Descarga o clona la carpeta del proyecto en tu máquina local.
2.  Haz doble clic sobre [crm.html](../crm.html) para abrir la aplicación.
3.  Arrastra el archivo `UPC-MEDICINA-Y-EPE-SEM-22.xlsx` desde la carpeta `/Data` hacia la zona punteada, o haz clic en "Seleccionar Archivo".
4.  El dashboard procesará las filas al instante y mostrará todas las visualizaciones operativas.

### Uso Avanzado en la Interfaz:
*   **Modo Ejecutivo (Comité):** Haz clic en "Vista Ejecutiva" en la cabecera superior. Las secciones técnicas (tabla de incidentes, gráficos de distribución y paneles de mapeo) se ocultarán automáticamente y el grid de KPIs principales se ajustará simétricamente para presentar un resumen limpio y simplificado.
*   **Filtros de Tabla:** Puedes buscar leads específicos en el buscador de la tabla detallada o filtrar incidentes de campañas o canales en particular mediante los menús desplegables.
*   **Ordenamiento:** Haz clic en cualquier cabecera de la tabla de incidentes (por ejemplo, en *Duración*) para ordenar cronológicamente de forma ascendente o descendente.
*   **Exportar PDF:** Presiona "Exportar PDF" en la cabecera del monitor. Se generará un PDF de grado profesional optimizado para A4 vertical que oculta los widgets interactivos.
*   **Modal de Reporte Ejecutivo:** Presiona "Generar Informe Ejecutivo" en el panel lateral de la IA, lo que abrirá un modal de análisis completo. Utiliza los botones inferiores para descargar el informe en un documento de Microsoft Word `.doc` o PDF listo para enviar por correo.

---

## 9. Guía para Desarrolladores (Mantenimiento)

### ¿Cómo actualizar el diseño y CSS?
Todos los tokens y variables de colores principales están parametrizados en `:root` dentro de [styles.css](../styles.css). Si deseas cambiar los colores de severidad o el color corporativo del Rojo UPC, modifica los valores hexadecimales de las variables `--upc-red`, `--sev-critica`, `--sev-alta`, etc.

### ¿Cómo modificar los prompts y lógica de IA?
Si deseas mejorar o cambiar la redacción de los reportes automatizados de Gemini:
1.  Busca la función `triggerAutoInsight()` en [crm.html](../crm.html) para cambiar las directivas del sistema que generan el insight de 3 líneas del gráfico de tendencias.
2.  Busca la función `generateExecutiveReport()` en [crm.html](../crm.html) para cambiar la estructura, secciones o responsable del informe ejecutivo formal de Word/PDF.

### Cuidado con los tags de HTML en Strings de JavaScript:
Si declaras código HTML dentro de un string o plantilla literal de JavaScript dentro del tag `<script>` (por ejemplo, en la exportación a Word de `exportReportToWord()`), **recuerda siempre escapar las barras de las etiquetas de cierre** como `<\/style>`, `<\/head>`, `<\/body>` y `<\/html>`. De lo contrario, el parser del navegador cerrará el tag `<script>` prematuramente y romperá la visualización de la página.

---
Módulo de Analítica y Auditoría Operacional & bull; UPC 2026
