# Monitor de Caídas e Intermitencias CRM - UPC 🚨
### Documentación Técnica y Manual de Arquitectura Operacional

Este documento unifica y detalla los aspectos técnicos, la arquitectura de software, las reglas de negocio y las integraciones de Inteligencia Artificial (IA) que componen la plataforma del **Monitor de Caídas e Intermitencias CRM** de la UPC. Está diseñado para que desarrolladores, administradores de sistemas y analistas de datos entiendan el funcionamiento interno tras la refactorización modular.

---

## 📌 Tabla de Contenidos
1. [Introducción y Propósito](#1-introducción-y-propósito)
2. [Stack Tecnológico y Arquitectura](#2-stack-tecnológico-y-arquitectura)
3. [Lógica de Negocio y Fórmulas Analíticas](#3-lógica-de-negocio-y-fórmulas-analíticas)
4. [Módulo de Inteligencia Artificial (Analista IA CRM)](#4-módulo-de-inteligencia-artificial-analista-ia-crm)
5. [Heurísticas de Diagnóstico Inteligente](#5-heurísticas-de-diagnóstico-inteligente)
6. [Mapeo Inteligente de Columnas (Fuzzy Matching)](#6-mapeo-inteligente-de-columnas-fuzzy-matching)
7. [Estructura del Repositorio (Refactorizado)](#7-estructura-del-repositorio-refactorizado)
8. [Instrucciones de Uso y Despliegue](#8-instrucciones-de-uso-y-despliegue)
9. [Guía para Desarrolladores (Mantenimiento)](#9-guía-para-desarrolladores-mantenimiento)

---

## 1. Introducción y Propósito

En los flujos de admisión comercial de la UPC, el **tiempo de respuesta inicial** (SLA de contacto) ante un prospecto digital (lead) es el factor más determinante en la conversión de ventas. Si un lead generado a través de campañas de marketing no se registra inmediatamente en el CRM por problemas de sincronización, la probabilidad de contacto efectivo cae drásticamente.

El **Monitor de Caídas e Intermitencias CRM** es un panel analítico interactivo diseñado para automatizar las auditorías operacionales de ingesta de leads. Al subir archivos históricos en bruto exportados del CRM (Excel o CSV), el sistema analiza cronológicamente la separación temporal entre los registros para:
*   Identificar ventanas de inactividad técnica (brechas o gaps) superiores a 5 minutos.
*   Estimar el impacto comercial mediante la pérdida proyectada de leads.
*   Determinar patrones temporales críticos y canales/fuentes vulnerables.
*   Proporcionar un índice de salud operacional y recomendaciones mediante IA en tiempo real.

---

## 2. Stack Tecnológico y Arquitectura

La plataforma sigue un paradigma de **Arquitectura Frontend Zero-Server** (Client-Side Only). Toda la ingesta, limpieza, ordenamiento cronológico, cálculo de brechas operacionales, renderizado de gráficos y llamadas a la API de IA ocurren directamente en el navegador del usuario.

### Ventajas de este Diseño:
1.  **Privacidad Absoluta:** La información de los leads se procesa localmente en memoria y **nunca** se sube ni se almacena en servidores externos de bases de datos.
2.  **Portabilidad Extrema:** La aplicación es autocontenida y se puede ejecutar localmente sin dependencias de red en el backend.

### Stack de Componentes:
*   **Tailwind CSS (v3 via CDN):** Estructura responsiva de diseño moderno con colores institucionales de la UPC (Rojo `#D50000` y Oscuros).
*   **Chart.js (v4 via CDN):** Motor interactivo para renderizar gráficos de tendencia lineal diaria, distribución de severidad por barras e impacto operacional por canal.
*   **PapaParse (v5 via CDN):** Parser para la carga ultrarrápida de CSVs, adaptado para manejar codificaciones automáticas (UTF-8 y Windows-1252/ANSI).
*   **SheetJS / XLSX (via CDN):** Motor utilizado para procesar hojas de cálculo Excel (`.xlsx` y `.xls`), resolviendo tipos de datos de fecha serializados.
*   **html2pdf.js (via CDN):** Herramienta que exporta reportes a documentos PDF formateados en el cliente.

---

## 3. Lógica de Negocio y Fórmulas Analíticas

El análisis de ingesta se rige bajo reglas de negocio automatizadas basadas en auditorías reales. Para una especificación formal completa de las fórmulas de Uptime comercial, estimación de leads perdidos e índice de salud global (Health Score), consulte el documento dedicado:
👉 [logic_and_formulas.txt](file:///c:/Users/yry/Downloads/Antigravity/Monitoreo-Caidas-CRM/Documentacion/logic_and_formulas.txt)

---

## 4. Módulo de Inteligencia Artificial (Analista IA CRM)

El monitor incorpora un asistente conversacional avanzado ("YiminIA CRM") impulsado por la API de **Google Gemini 2.5 Pro** que funciona mediante RAG (Retrieval-Augmented Generation) local.

### ⚙️ Automatización y Configuración de la API Key:
*   **Configuración de Clave:** Para hacer uso del chatbot, el usuario debe colocar su propia API Key de Gemini. El sistema no incluye claves preconfiguradas por motivos de seguridad.
*   **Modelo Utilizado:** Por defecto `gemini-2.5-pro` debido a su alta ventana de contexto y capacidad de razonamiento lógico sobre datos tabulares agregados.
*   **Personalización:** El usuario puede ingresar su clave o seleccionar el modelo haciendo clic en el engranaje ⚙️ del chat.

### 🧠 Arquitectura de Contexto RAG:
Cuando se procesa el archivo Excel/CSV, el frontend genera dinámicamente un objeto JSON compacto que contiene:
1.  **Metadatos:** Nombre del archivo, total de leads cargados, Uptime comercial real, tiempo caído acumulado y leads potencialmente afectados.
2.  **Mapeos:** Proporciones de errores, duplicados e inválidos.
3.  **Patrones:** Distribución de incidentes por severidades, patrones por día de la semana, distribución por hora del día, fallas por canal y la lista detallada de los peores 10 incidentes.

Este JSON estructurado se inyecta como un **System Prompt** en cada llamada a Gemini, garantizando que las respuestas de la IA se basen estrictamente en la data cargada.

---

## 5. Heurísticas de Diagnóstico Inteligente

El sistema cuenta con un motor heurístico local que estima probabilísticamente la causa raíz de los incidentes (Saturación de Webhook, fallas en la WhatsApp API, caídas del servidor CRM, integraciones con Landings o problemas de calidad del dato de entrada). Los criterios específicos se encuentran enumerados en [logic_and_formulas.txt](file:///c:/Users/yry/Downloads/Antigravity/Monitoreo-Caidas-CRM/Documentacion/logic_and_formulas.txt).

---

## 6. Mapeo Inteligente de Columnas (Fuzzy Matching)

Para que el usuario no tenga que renombrar las columnas de su archivo exportado antes de subirlo, el cargador utiliza un diccionario de sinónimos en español para mapear cabeceras. Soporta los siguientes nombres comunes:

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

## 7. Estructura del Repositorio (Refactorizado)

El repositorio se compone de archivos organizados de forma limpia y modular:

```
Monitoreo-Caidas-CRM/
├── dashboard_crm.html       # Estructura de la interfaz de usuario y layout principal
├── css/
│   └── styles.css           # Estilos personalizados, modo ejecutivo y estilos de impresión
├── js/
│   └── main.js              # Lógica principal, detección de incidentes, gráficos y chatbot IA
├── assets/
│   └── icon-upc.ico         # Icono institucional de la UPC
└── Documentacion/
    ├── README-CRM.md        # Esta guía de documentación unificada (Este archivo)
    └── logic_and_formulas.txt # Especificación detallada de fórmulas y heurísticas
```

---

## 8. Instrucciones de Uso y Despliegue

### Requisitos:
*   Cualquier navegador moderno (Google Chrome, Microsoft Edge, Firefox o Safari) con JavaScript habilitado.
*   Conexión a internet activa para descargar librerías CDN y conectarse a la API de Gemini de Google.

### Despliegue:
1.  Descarga o clona la carpeta del proyecto en tu máquina local.
2.  Haz doble clic sobre [dashboard_crm.html](../dashboard_crm.html) para abrir la aplicación.
3.  Arrastra el archivo de leads CRM hacia la zona de carga o haz clic en "Seleccionar Archivo".

### Uso Avanzado en la Interfaz:
*   **Modo Ejecutivo (Comité):** Haz clic en "Vista Ejecutiva" en la cabecera superior. Las secciones técnicas (gráficos de distribución y paneles de mapeo) se ocultarán y los KPIs principales se ajustarán simétricamente.
*   **Exportar PDF:** Presiona "Exportar PDF" en la cabecera del monitor para generar un PDF de grado profesional.
*   **Modal de Reporte Ejecutivo:** Presiona "Generar Informe Ejecutivo" en el panel lateral de la IA para redactar un informe formal completo exportable a **PDF** o a un documento de **MS Word (.doc)**.

---

## 9. Guía para Desarrolladores (Mantenimiento)

### ¿Cómo actualizar el diseño y CSS?
Todos los tokens y variables de colores principales están parametrizados en `:root` dentro de [css/styles.css](file:///c:/Users/yry/Downloads/Antigravity/Monitoreo-Caidas-CRM/css/styles.css).

### ¿Cómo modificar los prompts y lógica de IA?
1.  Busca la función `triggerAutoInsight()` en [js/main.js](file:///c:/Users/yry/Downloads/Antigravity/Monitoreo-Caidas-CRM/js/main.js) para cambiar las directivas que generan el insight rápido de tendencias.
2.  Busca la función `generateExecutiveReport()` en [js/main.js](file:///c:/Users/yry/Downloads/Antigravity/Monitoreo-Caidas-CRM/js/main.js) para alterar la estructura del informe ejecutivo formal de Word/PDF.

---
Módulo de Analítica y Auditoría Operacional &bull; UPC 2026
