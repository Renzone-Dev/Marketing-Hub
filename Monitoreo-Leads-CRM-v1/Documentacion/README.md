# 📊 Dashboard Analítico de Leads (v1)
### Documentación Técnica y Manual de Arquitectura Operacional

Este documento detalla los aspectos técnicos, la arquitectura de software, las reglas de negocio y las integraciones de Inteligencia Artificial (IA) que componen la plataforma del **Dashboard Analítico de Leads (v1)** de la UPC, tras su refactorización en carpetas independientes.

---

## 📌 Estructura del Proyecto Refactorizado

El proyecto ha sido reorganizado bajo una estructura limpia y estándar para facilitar el mantenimiento y desarrollo continuo:

```
Monitoreo-Leads-CRM-v1/
├── index.html               # Interfaz de usuario y estructura del DOM
├── css/
│   └── styles.css           # Estilos visuales y clases personalizadas
├── js/
│   └── main.js              # Lógica de procesamiento de datos, gráficos e IA
├── assets/
│   ├── icon-upc.ico         # Icono institucional de la UPC (Copiar a esta carpeta)
│   └── upc.png              # Logo institucional de la UPC (Copiar a esta carpeta)
└── Documentacion/
    ├── README.md            # Esta guía técnica (Este archivo)
    └── logic_and_formulas.txt # Especificación matemática y lógica detallada
```

---

## 🎯 ¿Qué resuelve este dashboard?

El **Dashboard Traffic UPC** es una herramienta analítica autónoma (frontend zero-server) diseñada para visualizar el flujo de entrada de leads y prospectos. Resuelve tres necesidades críticas:
1.  **Monitoreo de Volumen:** Diferencia los leads totales (esfuerzo bruto) de los leads únicos (alcance real de personas individuales deduplicadas cronológicamente).
2.  **Timing y Canal:** Identifica los canales más productivos (WhatsApp, SMS, Web, etc.) y la estacionalidad temporal (día de la semana, número de semana ISO y franjas horarias).
3.  **Insights Automatizados e IA:** Genera frases ejecutivas estadísticas e integra la API de **Google Gemini 2.5 Flash** para proporcionar insights analíticos avanzados de negocio en tiempo real.

---

## 📂 Fuentes de Datos y Fórmulas

El sistema está optimizado para procesar los datos de manera 100% local en memoria.
Para consultar la especificación matemática completa de la deduplicación por marca de tiempo (`_timestamp`) y los promedios dinámicos, diríjase al documento de fórmulas:
👉 [logic_and_formulas.txt](file:///c:/Users/yry/Downloads/Antigravity/Monitoreo-Leads-CRM-v1/Documentacion/logic_and_formulas.txt)

---

## ⚙️ Integración con IA (Google Gemini 2.5 Flash)

El botón **"Yimini IA"** utiliza el modelo cognitivo `gemini-2.5-flash` para emitir análisis estratégicos.
*   **Configuración de Clave:** El usuario debe colocar su propia API Key de Gemini en el archivo [js/main.js](file:///c:/Users/yry/Downloads/Antigravity/Monitoreo-Leads-CRM-v1/js/main.js) para habilitar esta funcionalidad.
*   **Respaldo (Fallback):** En caso de no configurar la API Key, desconexión o fallo en la API, el sistema autogenera 6 conclusiones locales analíticas basadas en el volumen filtrado.

---

## 👤 Mantenimiento y Actualizaciones

*   **Estilos:** Los colores corporativos (Rojo UPC `#D50000`) y layouts de impresión PDF se editan en [css/styles.css](file:///c:/Users/yry/Downloads/Antigravity/Monitoreo-Leads-CRM-v1/css/styles.css).
*   **Lógica:** Para cambiar los prompts del asistente virtual o añadir nuevos formatos de importación de leads, modifique [js/main.js](file:///c:/Users/yry/Downloads/Antigravity/Monitoreo-Leads-CRM-v1/js/main.js).

*Última actualización: Julio 2026*
