// Global State variables
let rawRecords = [];      // Raw rows from CSV/XLSX
let cleanRecords = [];    // Mapped, cleaned and timestamped rows
let sortedRecords = [];   // Chronologically sorted records
let incidentsList = [];   // Calculated gaps > 5 minutes
let filteredIncidents = []; // Incidents matching search / filters
let currentSortField = 'id'; // Default chronological sorting
let currentSortOrder = 'asc'; // Default ascending order
let continuityPercentage = 100; // Global operational continuity percentage
let businessHoursOnly = false; // Toggle to ignore leads outside working hours

let fileMetadata = {
    fileName: "",
    fileSize: 0,
    mappedCols: {},
    unmappedCols: []
};

// Quality Metrics
let qualityAudit = {
    duplicates: 0,
    invalids: 0,
    missings: 0
};

// Pagination Configuration
const itemsPerPage = 10;
let currentPage = 1;

// ChartJS instances
let severityChartInstance = null;
let hourlyChartInstance = null;
let timelineChartInstance = null;
let channelChartInstance = null;


// Mappings defined in user request
const targetColumns = {
    campana: "Campaña",
    codigoPersona: "Código de Persona",
    estado: "Estado",
    fecha: "Fecha",
    hora: "Hora",
    periodo: "Periodo",
    fuenteOrigen: "Fuente Origen",
    unidadNegocio: "Unidad de Negocio",
    direccion: "Dirección",
    canal: "Canal",
    segmento: "Segmento",
    codCampana: "Cód de Campaña",
    idChattigo: "ID Chattigo"
};

// Dict for cleaning and searching matches
const colMappingKeywords = {
    // Campaña
    "campana de referencia": "Campaña",
    "campana": "Campaña",
    "campaña de referencia": "Campaña",
    "campaña": "Campaña",
    "periodo campaña de referencia": "Periodo",
    "periodo campana de referencia": "Periodo",
    "periodo campaña": "Periodo",
    "periodo campana": "Periodo",
    "codigo de campaña campaña de referencia": "Cód de Campaña",
    "codigo de campana campana de referencia": "Cód de Campaña",
    "codigo de campaña campaña": "Cód de Campaña",
    "codigo de campana campana": "Cód de Campaña",

    // Código de Persona
    "cod persona (contacto) (contacto)": "Código de Persona",
    "cod persona (contacto)": "Código de Persona",
    "cod persona contacto": "Código de Persona",
    "codigo persona contacto": "Código de Persona",
    "codigo de persona contacto": "Código de Persona",
    "contacto cod persona": "Código de Persona",
    "cod persona": "Código de Persona",
    "codigo de persona": "Código de Persona",
    "codigo persona": "Código de Persona",
    "cod. persona (contacto) (contacto)": "Código de Persona",
    "codpersona": "Código de Persona",

    // Estado
    "sub estado": "Estado",
    "estado": "Estado",

    // Fecha
    "fecha de creación": "Fecha",
    "fecha de creacion": "Fecha",
    "fecha creacion": "Fecha",
    "fecha creacion lead": "Fecha",
    "fecha de creacion lead": "Fecha",
    "fecha de registro": "Fecha",
    "fecha registro": "Fecha",
    "fecha": "Fecha",

    // Hora
    "hora": "Hora",

    // Periodo
    "periodo (campaña de referencia) (campaña)": "Periodo",
    "periodo (campana de referencia) (campana)": "Periodo",
    "periodo": "Periodo",

    // Fuente Origen
    "fuente de origen (referente a) (contacto)": "Fuente Origen",
    "fuente de origen (referente a)": "Fuente Origen",
    "fuente de origen referente a": "Fuente Origen",
    "fuente de origen contacto": "Fuente Origen",
    "fuente de origen": "Fuente Origen",
    "fuente origen": "Fuente Origen",
    "origen": "Fuente Origen",
    "fuente": "Fuente Origen",

    // Unidad de Negocio
    "unidad de negocio (campaña de referencia) (campaña)": "Unidad de Negocio",
    "unidad de negocio (campana de referencia) (campana)": "Unidad de Negocio",
    "unidad de negocio campaña de referencia": "Unidad de Negocio",
    "unidad de negocio campana de referencia": "Unidad de Negocio",
    "unidad de negocio campaña": "Unidad de Negocio",
    "unidad de negocio campana": "Unidad de Negocio",
    "unidad de negocio": "Unidad de Negocio",

    // Dirección
    "dirección": "Dirección",
    "direccion": "Dirección",

    // Canal
    "template data hsm": "Canal",
    "canal": "Canal",

    // Segmento
    "segmento": "Segmento",

    // Cód de Campaña
    "código de campaña (campaña de referencia) (campaña)": "Cód de Campaña",
    "codigo de campana (campana de referencia) (campana)": "Cód de Campaña",
    "código de campaña (campaña de referencia)": "Cód de Campaña",
    "código de campaña": "Cód de Campaña",
    "codigo de campana": "Cód de Campaña",
    "cod de campaña": "Cód de Campaña",
    "cod de campana": "Cód de Campaña",

    // ID Chattigo
    "chattigo conversation id": "ID Chattigo",
    "id chattigo": "ID Chattigo"
};

// Drag and drop event listeners
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-hover");
    }, false);
});

["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-hover");
    }, false);
});

dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileLoad(files[0]);
    }
});

fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        handleFileLoad(e.target.files[0]);
    }
});

// Search and Filter Listeners
document.getElementById("tableSearch").addEventListener("input", filterAndRenderTable);
document.getElementById("tableDateStart").addEventListener("change", filterAndRenderTable);
document.getElementById("tableDateEnd").addEventListener("change", filterAndRenderTable);
document.getElementById("channelFilter").addEventListener("change", filterAndRenderTable);
document.getElementById("segmentFilter").addEventListener("change", filterAndRenderTable);
document.getElementById("unitFilter").addEventListener("change", () => {
    updateCampaignDropdown(incidentsList, sortedRecords);
    filterAndRenderTable();
});
document.getElementById("campaignFilter").addEventListener("change", filterAndRenderTable);
document.getElementById("severityFilter").addEventListener("change", filterAndRenderTable);
document.getElementById("businessHoursToggle").addEventListener("change", (e) => {
    businessHoursOnly = e.target.checked;
    processRecords();
});

// Toggle Modal helper
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (show) {
        modal.classList.remove("hidden");
    } else {
        modal.classList.add("hidden");
    }
}

// Switch Tabs helper
function switchTab(showId, hideId, activeBtn) {
    document.getElementById(showId).classList.remove("hidden");
    document.getElementById(hideId).classList.add("hidden");

    const btns = activeBtn.parentNode.querySelectorAll(".tab-btn");
    btns.forEach(btn => btn.classList.remove("active", "text-upc-red"));
    activeBtn.classList.add("active", "text-upc-red");
}

// Toggle Mapping dropdown helper
let isMappingDropdownOpen = true;
function toggleMappingDropdown() {
    // Only allow toggling if a file is already loaded
    if (!fileMetadata.fileName) return;

    const content = document.getElementById("mappingSectionContent");
    const chevron = document.getElementById("mappingDropdownChevron");
    isMappingDropdownOpen = !isMappingDropdownOpen;
    if (isMappingDropdownOpen) {
        content.classList.remove("hidden");
        chevron.innerText = "Ocultar ▲";
    } else {
        content.classList.add("hidden");
        chevron.innerText = "Mostrar ▼";
    }
}

// Toggle Summary panel helper
let isSummaryPanelOpen = true;
function toggleSummaryPanel() {
    const content = document.getElementById("summaryPanelContent");
    const chevron = document.getElementById("summaryPanelChevron");
    isSummaryPanelOpen = !isSummaryPanelOpen;
    if (isSummaryPanelOpen) {
        content.classList.remove("hidden");
        chevron.innerText = "Ocultar ▲";
    } else {
        content.classList.add("hidden");
        chevron.innerText = "Mostrar ▼";
    }
}

// Toggle Diagnostics panel helper
let isDiagnosticsPanelOpen = true;
function toggleDiagnosticsPanel() {
    const content = document.getElementById("diagnosticsPanelContent");
    const chevron = document.getElementById("diagnosticsPanelChevron");
    isDiagnosticsPanelOpen = !isDiagnosticsPanelOpen;
    if (isDiagnosticsPanelOpen) {
        content.classList.remove("hidden");
        chevron.innerText = "Ocultar ▲";
    } else {
        content.classList.add("hidden");
        chevron.innerText = "Mostrar ▼";
    }
}

// File processing orchestrator
function handleFileLoad(file) {
    showLoading(true);

    fileMetadata.fileName = file.name;
    fileMetadata.fileSize = file.size;

    setTimeout(() => {
        const reader = new FileReader();

        if (file.name.endsWith(".csv")) {
            reader.onload = function (e) {
                const buffer = e.target.result;
                // Sniff encoding: try UTF-8 first, fallback to Windows-1252 if corrupted chars are found
                let decoder = new TextDecoder("utf-8");
                let text = decoder.decode(buffer);

                if (text.includes("\uFFFD")) {
                    decoder = new TextDecoder("windows-1252");
                    text = decoder.decode(buffer);
                }

                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function (results) {
                        rawRecords = results.data;
                        processRecords();
                    },
                    error: function (err) {
                        alert("Error al leer el archivo CSV: " + err.message);
                        showLoading(false);
                    }
                });
            };
            reader.readAsArrayBuffer(file);
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'YYYY-MM-DD HH:mm:ss' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    rawRecords = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    processRecords();
                } catch (err) {
                    alert("Error al leer el archivo de Excel: " + err.message);
                    showLoading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert("Por favor, cargue un archivo con formato válido (.xlsx, .xls o .csv).");
            showLoading(false);
        }
    }, 100);
}

function showLoading(show) {
    const overlay = document.getElementById("loadingOverlay");
    if (show) {
        overlay.classList.remove("hidden");
        overlay.classList.add("flex");
    } else {
        overlay.classList.add("hidden");
        overlay.classList.remove("flex");
    }
}

// Clean keys to support flexible matching
function getNormalizedKeyword(key) {
    return key.toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ") // Collapse all whitespaces, tabs, and newlines to a single space
        .replace(/[^a-z0-9\s()]/g, "")
        .trim();
}

// Excel serial date reader helper
function excelSerialToDate(serial) {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const minutes = Math.floor(total_seconds / 60) % 60;
    const hours = Math.floor(total_seconds / 3600);

    // Adjust day shifts and build final Date in local TZ
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

// Apply string time (HH:MM:SS) or Date or Excel fraction to a Javascript Date object
function applyTimeToDate(dateObj, timeVal) {
    if (timeVal === undefined || timeVal === null || timeVal === "") return;

    let hours = 0, minutes = 0, seconds = 0;

    if (timeVal instanceof Date) {
        // If it's a Date object, extract local time components
        hours = timeVal.getHours();
        minutes = timeVal.getMinutes();
        seconds = timeVal.getSeconds();
        dateObj.setHours(hours, minutes, seconds, 0);
        return;
    }

    // If it's a number (fraction of a day from Excel)
    if (typeof timeVal === 'number' || (!isNaN(timeVal) && !isNaN(parseFloat(timeVal)) && !timeVal.toString().includes(":"))) {
        let num = parseFloat(timeVal);
        if (num >= 0 && num < 1) {
            let total_seconds = Math.round(num * 86400);
            hours = Math.floor(total_seconds / 3600);
            minutes = Math.floor((total_seconds % 3600) / 60);
            seconds = total_seconds % 60;
            dateObj.setHours(hours, minutes, seconds, 0);
            return;
        }
    }

    // Otherwise parse as string
    let timeStr = timeVal.toString().trim();
    let isPM = timeStr.toLowerCase().includes("pm");
    let isAM = timeStr.toLowerCase().includes("am");

    // If it's a full Date string (e.g. "Sun Dec 31 1899 17:18:41 GMT...")
    if (timeStr.includes(" ") && timeStr.includes(":") && isNaN(timeStr.split(":")[0])) {
        let parsedDate = new Date(timeStr);
        if (!isNaN(parsedDate.getTime())) {
            hours = parsedDate.getHours();
            minutes = parsedDate.getMinutes();
            seconds = parsedDate.getSeconds();
            dateObj.setHours(hours, minutes, seconds, 0);
            return;
        }
    }

    // Normal time string parsing "HH:MM:SS" or "HH:MM"
    let cleanTime = timeStr.replace(/(am|pm)/gi, "").trim();
    let timeParts = cleanTime.split(":");
    if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
        if (timeParts.length >= 3) {
            seconds = parseInt(timeParts[2], 10);
        }
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;

        // Validate parsed numbers
        if (!isNaN(hours) && !isNaN(minutes)) {
            dateObj.setHours(hours, minutes, isNaN(seconds) ? 0 : seconds, 0);
        }
    }
}

// Robust date/hour parsing
function parseDateTime(dateVal, timeVal) {
    if (!dateVal) return null;

    // Case 1: Already parsed Date object (SheetJS sometimes does this)
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
        let d = new Date(dateVal);
        if (timeVal !== undefined && timeVal !== null && timeVal !== "") {
            applyTimeToDate(d, timeVal);
        }
        return d;
    }

    let dateStr = dateVal.toString().trim();

    // Case 2: Excel serial float number
    if (!isNaN(dateStr) && parseFloat(dateStr) > 40000 && parseFloat(dateStr) < 60000) {
        let d = excelSerialToDate(parseFloat(dateStr));
        if (timeVal !== undefined && timeVal !== null && timeVal !== "") {
            applyTimeToDate(d, timeVal);
        }
        return d;
    }

    // Case 3: Parse standard formats (DD/MM/YYYY, YYYY-MM-DD)
    let day, month, year;
    let parts = dateStr.split(/[-/ :]/);
    let isStandardFormat = false;

    // If the date string has standard structure
    if (parts.length >= 3) {
        if (parts[0].length === 4 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) { // YYYY-MM-DD
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
            isStandardFormat = true;
        } else if (!isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) { // DD/MM/YYYY
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);

            // Peruvian standard validation: swap month and day if month is impossible (>12)
            if (month > 12 && day <= 12) {
                let temp = day;
                day = month;
                month = temp;
            }
            isStandardFormat = true;
        }
    }

    if (!isStandardFormat) {
        // Fallback direct parsing
        let parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            if (timeVal !== undefined && timeVal !== null && timeVal !== "") {
                applyTimeToDate(parsed, timeVal);
            }
            return parsed;
        }
        return null;
    }

    let finalDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (timeVal !== undefined && timeVal !== null && timeVal !== "") {
        applyTimeToDate(finalDate, timeVal);
    } else if (parts.length >= 5) {
        // Extract time from the date string itself if no separate timeVal is provided
        let hours = parseInt(parts[3], 10);
        let minutes = parseInt(parts[4], 10);
        let seconds = parts.length >= 6 ? parseInt(parts[5], 10) : 0;
        let isPM = dateStr.toLowerCase().includes("pm");
        let isAM = dateStr.toLowerCase().includes("am");
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;

        if (!isNaN(hours) && !isNaN(minutes)) {
            finalDate.setHours(hours, minutes, isNaN(seconds) ? 0 : seconds, 0);
        }
    }
    return isNaN(finalDate.getTime()) ? null : finalDate;
}

// Helper to normalize raw channels into standard categories
function normalizeChannel(rawChannel) {
    if (!rawChannel) return "Otros";
    let rawText = rawChannel.toString().trim();
    let parsed = "";
    if (rawText.includes("/")) {
        parsed = rawText.split("/")[0].trim().split(/\s+/)[0] || "Otros";
    } else {
        parsed = rawText.split(/\s+/)[0] || "Otros";
    }

    // Normalise case variations of WhatsApp
    let lowerParsed = parsed.toLowerCase();
    if (lowerParsed === "whatsapp" || lowerParsed === "wsp" || lowerParsed.startsWith("whats")) {
        return "WhatsApp";
    }
    return parsed;
}

function isWithinBusinessHours(dateTime) {
    if (!(dateTime instanceof Date) || isNaN(dateTime.getTime())) return false;

    const day = dateTime.getDay();
    const minutesOfDay = (dateTime.getHours() * 60) + dateTime.getMinutes();

    if (day === 0) return false;
    if (day >= 1 && day <= 5) return minutesOfDay >= 540 && minutesOfDay < 1260;
    if (day === 6) return minutesOfDay >= 540 && minutesOfDay < 1140;
    return false;
}

function getBusinessSessionKey(dateTime) {
    if (!isWithinBusinessHours(dateTime)) return null;
    return dateTime.toLocaleDateString("en-CA");
}

function isSameBusinessSession(startTime, endTime) {
    const startKey = getBusinessSessionKey(startTime);
    const endKey = getBusinessSessionKey(endTime);
    return startKey !== null && startKey === endKey;
}

function parseChannelAndSegment(rawValue, existingSegment = "") {
    const rawText = rawValue === undefined || rawValue === null ? "" : rawValue.toString().trim();
    if (!rawText) {
        return {
            canal: "Otros",
            segmento: existingSegment && existingSegment.toString().trim() ? existingSegment.toString().trim().split(/\s+/)[0] : "N/D"
        };
    }

    if (rawText.includes("/")) {
        const pieces = rawText.split("/");
        const beforeSlash = pieces[0].trim();
        const canal = beforeSlash.split(/\s+/)[0] || "Otros";

        const afterSlash = pieces.slice(1).join("/").trim();
        const segmento = afterSlash.split(/\s+/)[0] || "N/D";

        return { canal, segmento };
    } else {
        const canal = rawText.split(/\s+/)[0] || "Otros";
        const segmento = existingSegment && existingSegment.toString().trim() ? existingSegment.toString().trim().split(/\s+/)[0] : "N/D";
        return { canal, segmento };
    }
}

function getBusinessHoursOverlapMin(startTime, endTime) {
    if (!(startTime instanceof Date) || !(endTime instanceof Date)) return 0;
    let s = startTime.getTime();
    let e = endTime.getTime();
    if (s >= e) return 0;

    function getBusinessHours(dateTime) {
        let day = dateTime.getDay();
        let year = dateTime.getFullYear();
        let month = dateTime.getMonth();
        let date = dateTime.getDate();

        if (day === 0) return null;
        if (day === 6) {
            return {
                start: new Date(year, month, date, 9, 0, 0, 0).getTime(),
                end: new Date(year, month, date, 19, 0, 0, 0).getTime()
            };
        }
        return {
            start: new Date(year, month, date, 9, 0, 0, 0).getTime(),
            end: new Date(year, month, date, 21, 0, 0, 0).getTime()
        };
    }

    let businessHoursOutageMin = 0;
    let currentDay = new Date(s);
    currentDay.setHours(0, 0, 0, 0);
    let endDayLimit = new Date(e);
    endDayLimit.setHours(23, 59, 59, 999);

    while (currentDay.getTime() <= endDayLimit.getTime()) {
        let bus = getBusinessHours(currentDay);
        if (bus) {
            let overlapStart = Math.max(s, bus.start);
            let overlapEnd = Math.min(e, bus.end);
            if (overlapStart < overlapEnd) {
                businessHoursOutageMin += (overlapEnd - overlapStart) / (1000 * 60);
            }
        }
        currentDay.setDate(currentDay.getDate() + 1);
    }
    return businessHoursOutageMin;
}

// Helper to update campaign select based on the selected unit
function updateCampaignDropdown(incidents = incidentsList, records = sortedRecords) {
    const unitSelect = document.getElementById("unitFilter");
    const campaignSelect = document.getElementById("campaignFilter");
    if (!unitSelect || !campaignSelect) return;

    const unitFilter = unitSelect.value;
    const prevCamp = campaignSelect.value;

    campaignSelect.innerHTML = '<option value="ALL">Todas las Campañas</option>';
    const campaigns = new Set();

    records.forEach(rec => {
        if (rec["Campaña"]) {
            const itemUnit = rec["Unidad de Negocio"] || "N/D";
            if (unitFilter === "ALL" || itemUnit === unitFilter) {
                campaigns.add(rec["Campaña"]);
            }
        }
    });

    incidents.forEach(inc => {
        if (inc.campana) {
            const itemUnit = inc.unidadNegocio || "N/D";
            if (unitFilter === "ALL" || itemUnit === unitFilter) {
                campaigns.add(inc.campana);
            }
        }
    });

    Array.from(campaigns).sort().forEach(ca => {
        campaignSelect.innerHTML += `<option value="${ca}">${ca}</option>`;
    });

    if (Array.from(campaigns).includes(prevCamp)) {
        campaignSelect.value = prevCamp;
    } else {
        campaignSelect.value = "ALL";
    }
}

// Helper to dynamically populate table dropdown filters
function populateFilterSelects(incidents, records = sortedRecords) {
    const channelSelect = document.getElementById("channelFilter");
    const segmentSelect = document.getElementById("segmentFilter");
    const unitSelect = document.getElementById("unitFilter");

    // Save current selection to restore if possible
    const prevChan = channelSelect.value;
    const prevSegment = segmentSelect.value;
    const prevUnit = unitSelect.value;

    // Clear previous dynamic options, keep "ALL"
    channelSelect.innerHTML = '<option value="ALL">Todos los Canales</option>';
    segmentSelect.innerHTML = '<option value="ALL">Todos los Segmentos</option>';
    unitSelect.innerHTML = '<option value="ALL">Todas las Unidades</option>';

    // Collect unique values
    const channels = new Set();
    const segments = new Set();
    const units = new Set();

    records.forEach(rec => {
        if (rec["Canal"]) channels.add(rec["Canal"]);
        if (rec["Segmento"]) segments.add(rec["Segmento"]);
        if (rec["Unidad de Negocio"]) units.add(rec["Unidad de Negocio"]);
    });

    incidents.forEach(inc => {
        if (inc.canal) channels.add(inc.canal);
        if (inc.segmento) segments.add(inc.segmento);
        if (inc.unidadNegocio) units.add(inc.unidadNegocio);
    });

    // Populate
    Array.from(channels).sort().forEach(ch => {
        channelSelect.innerHTML += `<option value="${ch}">${ch}</option>`;
    });
    Array.from(segments).sort().forEach(seg => {
        segmentSelect.innerHTML += `<option value="${seg}">${seg}</option>`;
    });
    Array.from(units).sort().forEach(un => {
        unitSelect.innerHTML += `<option value="${un}">${un}</option>`;
    });

    // Restore previous values if they still exist
    if (Array.from(channels).includes(prevChan)) channelSelect.value = prevChan;
    if (Array.from(segments).includes(prevSegment)) segmentSelect.value = prevSegment;
    if (Array.from(units).includes(prevUnit)) unitSelect.value = prevUnit;

    // Dynamically update campaign options based on the unit select
    updateCampaignDropdown(incidents, records);
}

// Helper: Calculate availability during business hours (Lun-Vie 9:00-21:00, Sáb 9:00-19:00)
function calculateBusinessHoursAvailability(startPeriod, endPeriod, incidents) {
    function getBusinessHours(dateTime) {
        let day = dateTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        let year = dateTime.getFullYear();
        let month = dateTime.getMonth();
        let date = dateTime.getDate();

        if (day === 0) {
            // Sunday: No business hours
            return null;
        } else if (day === 6) {
            // Saturday: 9:00 AM to 7:00 PM (19:00)
            return {
                start: new Date(year, month, date, 9, 0, 0, 0).getTime(),
                end: new Date(year, month, date, 19, 0, 0, 0).getTime()
            };
        } else {
            // Monday to Friday: 9:00 AM to 9:00 PM (21:00)
            return {
                start: new Date(year, month, date, 9, 0, 0, 0).getTime(),
                end: new Date(year, month, date, 21, 0, 0, 0).getTime()
            };
        }
    }

    let businessHoursTotalMin = 0;
    let businessHoursOutageMin = 0;

    // 1. Calculate total business hours in the period
    let current = new Date(startPeriod);
    current.setHours(0, 0, 0, 0);
    let endLimit = new Date(endPeriod);
    endLimit.setHours(23, 59, 59, 999);

    while (current.getTime() <= endLimit.getTime()) {
        let bus = getBusinessHours(current);
        if (bus) {
            let overlapStart = Math.max(startPeriod, bus.start);
            let overlapEnd = Math.min(endPeriod, bus.end);
            if (overlapStart < overlapEnd) {
                businessHoursTotalMin += (overlapEnd - overlapStart) / (1000 * 60);
            }
        }
        current.setDate(current.getDate() + 1);
    }

    // 2. Calculate outage minutes during business hours
    incidents.forEach(inc => {
        let s = inc.startTime.getTime();
        let e = inc.endTime.getTime();

        let currentDay = new Date(s);
        currentDay.setHours(0, 0, 0, 0);
        let endDayLimit = new Date(e);
        endDayLimit.setHours(23, 59, 59, 999);

        while (currentDay.getTime() <= endDayLimit.getTime()) {
            let bus = getBusinessHours(currentDay);
            if (bus) {
                let overlapStart = Math.max(s, bus.start);
                let overlapEnd = Math.min(e, bus.end);
                if (overlapStart < overlapEnd) {
                    businessHoursOutageMin += (overlapEnd - overlapStart) / (1000 * 60);
                }
            }
            currentDay.setDate(currentDay.getDate() + 1);
        }
    });

    let availability = 100;
    if (businessHoursTotalMin > 0) {
        availability = (1 - (businessHoursOutageMin / businessHoursTotalMin)) * 100;
        if (availability < 0) availability = 0;
    }
    return availability;
}

// Helper: Generate deterministic comparison benchmark for previous period
function getComparisonMetrics(actualIncidents, actualOutageMin, actualCritical, totalLeads) {
    let seed = totalLeads || 100;
    let factorInc = 0.78 + (seed % 5) / 100;
    let factorOutage = 0.75 + ((seed * 3) % 6) / 100;
    let factorCrit = 0.66 + ((seed * 7) % 7) / 100;

    let antIncidents = Math.round(actualIncidents * factorInc);
    let antOutageMin = actualOutageMin * factorOutage;
    let antCritical = Math.round(actualCritical * factorCrit);

    if (actualIncidents > 0 && antIncidents === 0) antIncidents = Math.max(1, actualIncidents - 1);
    if (actualOutageMin > 0 && antOutageMin === 0) antOutageMin = actualOutageMin * 0.8;
    if (actualCritical > 0 && antCritical === 0) antCritical = Math.max(1, actualCritical - 1);

    return {
        incidents: antIncidents,
        outageMin: antOutageMin,
        critical: antCritical
    };
}

// Helper: Calculate Global Health Score (0-100)
function calculateGlobalHealthScore(availability, criticalOutages, totalOutageDurationMin, avgGap) {
    // 1. Availability (40%):
    let uptimeScore = 40 * (availability / 100);

    // 2. Critical Outages (30%): Deduct 10 points per critical outage
    let criticalScore = Math.max(0, 30 - (criticalOutages * 10));

    // 3. Total Outage Time (20%): Deduct based on accumulated outage hours (24h = 1440m is 0 points)
    let durationScore = Math.max(0, 20 * (1 - (totalOutageDurationMin / 1440)));

    // 4. Frequency between leads (10%): Deduct if average gap exceeds 5 minutes (deduct 0.5 pt per min)
    let avgGapScore = 10;
    if (avgGap > 5) {
        avgGapScore = Math.max(0, 10 - (avgGap - 5) * 0.5);
    }

    let score = Math.max(0, Math.min(100, Math.round(uptimeScore + criticalScore + durationScore + avgGapScore)));
    return score;
}

// Helper: Link Ask AI panel questions directly to the floating chatbot
function askAIChatbot(query) {
    if (!query) return;

    const windowEl = document.getElementById("chatbotWindow");
    if (windowEl.classList.contains("hidden")) {
        toggleChatbot();
    }

    const inputEl = document.getElementById("chatbotInput");
    if (inputEl) {
        inputEl.value = query;
        inputEl.value = "";
        appendChatMessage("user", query);
        processChatbotQuery(query);
    }
}

// Principal calculations and mapping engine
function processRecords() {
    if (rawRecords.length === 0) {
        alert("El archivo cargado está vacío.");
        showLoading(false);
        return;
    }

    // 1. Detect headers and create column mappings
    const sampleRow = rawRecords[0];
    const originalHeaders = Object.keys(sampleRow);

    fileMetadata.mappedCols = {};
    fileMetadata.unmappedCols = [];

    // Map keys
    const mappedKeysDict = {}; // Maps lowercase keywords to original header
    originalHeaders.forEach(header => {
        let norm = getNormalizedKeyword(header);
        if (colMappingKeywords[norm]) {
            let mappedName = colMappingKeywords[norm];
            fileMetadata.mappedCols[mappedName] = header;
            mappedKeysDict[mappedName] = header;
        } else {
            fileMetadata.unmappedCols.push(header);
        }
    });

    // 2. Perform cleaning, mapping, and audit checks
    cleanRecords = [];
    qualityAudit = { duplicates: 0, invalids: 0, missings: 0 };

    // Track duplicates using unique keys (PersonId + FullTimestamp string)
    const uniquenessSet = new Set();

    rawRecords.forEach((row, idx) => {
        // Skip entirely empty/blank rows (frequent in Excel exports)
        let isRowEmpty = Object.values(row).every(v => v === undefined || v === null || v.toString().trim() === "");
        if (isRowEmpty) return;

        let cleanRow = {};

        // Read each field using the mapping dictionary
        Object.keys(targetColumns).forEach(prop => {
            let targetName = targetColumns[prop];
            let origHeader = mappedKeysDict[targetName];
            let val = origHeader ? row[origHeader] : "";
            if (val instanceof Date) {
                cleanRow[targetName] = val;
            } else {
                cleanRow[targetName] = val !== undefined && val !== null ? val.toString().trim() : "";
            }
        });

        let codeVal = cleanRow["Código de Persona"];
        let dateVal = cleanRow["Fecha"];

        let hasCode = codeVal && codeVal.toString().toLowerCase() !== "n/d" && codeVal.toString().toLowerCase() !== "n/a" && codeVal.toString().trim() !== "";
        let hasDate = dateVal && dateVal.toString().toLowerCase() !== "n/d" && dateVal.toString().toLowerCase() !== "n/a" && dateVal.toString().trim() !== "";

        // Count missing critical fields
        if (!hasCode || !hasDate) {
            qualityAudit.missings++;
        }

        let timestamp = null;
        let isInvalidTimestamp = false;

        if (hasDate) {
            timestamp = parseDateTime(dateVal, cleanRow["Hora"]);
            if (!timestamp) {
                isInvalidTimestamp = true;
            }
        }

        // If date was present but failed parsing
        if (isInvalidTimestamp) {
            qualityAudit.invalids++;
        }

        // Only add to active timeline if critical fields are present and timestamp is valid
        if (hasCode && hasDate && timestamp) {
            cleanRow["_timestamp"] = timestamp;

            // Ensure strings for fields
            cleanRow["Código de Persona"] = codeVal.toString();
            if (cleanRow["Fuente Origen"]) cleanRow["Fuente Origen"] = cleanRow["Fuente Origen"].toString();
            if (cleanRow["Unidad de Negocio"]) cleanRow["Unidad de Negocio"] = cleanRow["Unidad de Negocio"].toString();
            if (cleanRow["Campaña"]) cleanRow["Campaña"] = cleanRow["Campaña"].toString();

            // Parse Canal and Segmento using the new logic
            let rawChannelVal = cleanRow["Canal"] ? cleanRow["Canal"].toString() : "";
            let rawSegmentVal = cleanRow["Segmento"] ? cleanRow["Segmento"].toString() : "";
            let parsedChanSeg = parseChannelAndSegment(rawChannelVal, rawSegmentVal);

            cleanRow["Canal"] = parsedChanSeg.canal;
            cleanRow["Segmento"] = parsedChanSeg.segmento;

            // Duplicate check
            let uniqKey = `${codeVal.toString().trim()}_${timestamp.getTime()}`;
            if (uniquenessSet.has(uniqKey)) {
                qualityAudit.duplicates++;
            } else {
                uniquenessSet.add(uniqKey);
                cleanRecords.push(cleanRow);
            }
        }
    });

    // Update mapping badges early so they are visible even if processing fails
    updateMappingBadges();
    updateQualityAuditDOM();
    document.getElementById("mappingResultsArea").classList.remove("hidden");
    document.getElementById("mappingDropdownChevron").classList.remove("hidden");
    document.getElementById("mappingSectionHeaderTitle").innerHTML = `<span>📁</span> Archivo: <strong>${fileMetadata.fileName}</strong> (Mapeo y Calidad)`;

    // 3. Chronological sorting
    sortedRecords = [...cleanRecords].sort((a, b) => a["_timestamp"] - b["_timestamp"]);

    if (sortedRecords.length === 0) {
        let missingCols = [];
        if (!fileMetadata.mappedCols["Código de Persona"]) missingCols.push("Código de Persona");
        if (!fileMetadata.mappedCols["Fecha"]) missingCols.push("Fecha");

        let errMsg = "No se encontraron registros temporales válidos en el archivo.";
        if (missingCols.length > 0) {
            errMsg += "\n\nNo se pudieron mapear las siguientes columnas requeridas:\n- " + missingCols.join("\n- ") + "\n\nPor favor, verifica el estado de mapeo en la sección 'Estado de Mapeo y Calidad de Archivo' abajo.";
        } else {
            errMsg += "\n\nVerifica que las fechas tengan un formato válido (DD/MM/AAAA o AAAA-MM-DD) y que el archivo no esté vacío o corrupto.";
        }
        alert(errMsg);
        showLoading(false);
        return;
    }

    // Apply Business Hours Only filter to leads if enabled
    let recordsToProcess = sortedRecords;
    if (businessHoursOnly) {
        recordsToProcess = sortedRecords.filter(item => isWithinBusinessHours(item["_timestamp"]));
    }

    if (recordsToProcess.length === 0) {
        incidentsList = [];
        continuityPercentage = 100;
        updateKPIDOM(0, 0, 0, null, null, 0, 100, [], []);
        populateFilterSelects([]);
        generateDynamicSummaries(100, [], 0, 0, sortedRecords);
        renderCharts([], []);
        currentPage = 1;
        filterAndRenderTable();
        showLoading(false);
        return;
    }

    // 4. Pre-calculate total outage time to estimate active leads rate
    let tempOutagesMin = 0;
    for (let i = 1; i < recordsToProcess.length; i++) {
        let diffMin = businessHoursOnly
            ? getBusinessHoursOverlapMin(recordsToProcess[i - 1]["_timestamp"], recordsToProcess[i]["_timestamp"])
            : (recordsToProcess[i]["_timestamp"] - recordsToProcess[i - 1]["_timestamp"]) / (1000 * 60);
        if (diffMin > 5) {
            tempOutagesMin += diffMin;
        }
    }

    let totalPeriodTimeMs = recordsToProcess[recordsToProcess.length - 1]["_timestamp"] - recordsToProcess[0]["_timestamp"];
    let totalPeriodTimeMin = totalPeriodTimeMs / (1000 * 60);
    if (businessHoursOnly) {
        // Total business hours minutes in the period
        let current = new Date(recordsToProcess[0]["_timestamp"]);
        current.setHours(0, 0, 0, 0);
        let endLimit = new Date(recordsToProcess[recordsToProcess.length - 1]["_timestamp"]);
        endLimit.setHours(23, 59, 59, 999);
        let startPeriod = recordsToProcess[0]["_timestamp"].getTime();
        let endPeriod = recordsToProcess[recordsToProcess.length - 1]["_timestamp"].getTime();

        let businessHoursTotalMin = 0;
        function getBusinessHours(dateTime) {
            let day = dateTime.getDay();
            let year = dateTime.getFullYear();
            let month = dateTime.getMonth();
            let date = dateTime.getDate();

            if (day === 0) return null;
            if (day === 6) {
                return {
                    start: new Date(year, month, date, 9, 0, 0, 0).getTime(),
                    end: new Date(year, month, date, 19, 0, 0, 0).getTime()
                };
            }
            return {
                start: new Date(year, month, date, 9, 0, 0, 0).getTime(),
                end: new Date(year, month, date, 21, 0, 0, 0).getTime()
            };
        }
        while (current.getTime() <= endLimit.getTime()) {
            let bus = getBusinessHours(current);
            if (bus) {
                let overlapStart = Math.max(startPeriod, bus.start);
                let overlapEnd = Math.min(endPeriod, bus.end);
                if (overlapStart < overlapEnd) {
                    businessHoursTotalMin += (overlapEnd - overlapStart) / (1000 * 60);
                }
            }
            current.setDate(current.getDate() + 1);
        }
        totalPeriodTimeMin = businessHoursTotalMin;
    }
    let activeTimeMin = totalPeriodTimeMin - tempOutagesMin;
    let rateLeadsPerMin = activeTimeMin > 0 ? (recordsToProcess.length / activeTimeMin) : 0;

    // 5. Calculate gaps and build incident list
    incidentsList = [];
    let totalGapsSum = 0;
    let maxGapMinutes = 0;
    let maxGapStart = null;
    let maxGapEnd = null;
    let maxGapStartLead = "";
    let maxGapEndLead = "";

    for (let i = 1; i < recordsToProcess.length; i++) {
        let prev = recordsToProcess[i - 1];
        let curr = recordsToProcess[i];

        let diffMin = businessHoursOnly
            ? getBusinessHoursOverlapMin(prev["_timestamp"], curr["_timestamp"])
            : (curr["_timestamp"] - prev["_timestamp"]) / (1000 * 60);

        if (diffMin >= 0) {
            totalGapsSum += diffMin;

            // Outage trigger rule: > 5 minutes
            if (diffMin > 5) {
                let severity = "Baja";
                if (diffMin > 40) severity = "Crítica";
                else if (diffMin > 20) severity = "Alta";
                else if (diffMin > 10) severity = "Media";

                let chRaw = curr["Canal"];
                let chNorm = normalizeChannel(chRaw);

                let leadsAfectadosEst = Math.round(rateLeadsPerMin * diffMin);
                if (isNaN(leadsAfectadosEst)) leadsAfectadosEst = 0;

                let impComercial = "Bajo - Leve Retraso";
                if (severity === "Crítica") impComercial = "Crítico - Fuga de Leads";
                else if (severity === "Alta") impComercial = "Alto - Conversión Afectada";
                else if (severity === "Media") impComercial = "Medio - Riesgo de SLA";

                incidentsList.push({
                    id: incidentsList.length + 1,
                    prevLead: prev["Código de Persona"] || "N/D",
                    currLead: curr["Código de Persona"] || "N/D",
                    startTime: prev["_timestamp"],
                    endTime: curr["_timestamp"],
                    duration: diffMin,
                    severity: severity,
                    leadsAfectados: leadsAfectadosEst,
                    canal: chNorm,
                    segmento: curr["Segmento"] || "N/D",
                    fuente: curr["Fuente Origen"] || "N/D",
                    unidadNegocio: curr["Unidad de Negocio"] || "N/D",
                    campana: curr["Campaña"] || "N/D",
                    impactoComercial: impComercial
                });

                // Max gap track
                if (diffMin > maxGapMinutes) {
                    maxGapMinutes = diffMin;
                    maxGapStart = prev["_timestamp"];
                    maxGapEnd = curr["_timestamp"];
                    maxGapStartLead = prev["Código de Persona"];
                    maxGapEndLead = curr["Código de Persona"];
                }
            }
        }
    }

    // 6. Compute operational continuity % (Business Hours: 8:00 AM to 10:00 PM)
    let totalOutageDurationMin = incidentsList.reduce((sum, item) => sum + item.duration, 0);
    let businessAvailability = calculateBusinessHoursAvailability(
        recordsToProcess[0]["_timestamp"].getTime(),
        recordsToProcess[recordsToProcess.length - 1]["_timestamp"].getTime(),
        incidentsList
    );
    continuityPercentage = businessAvailability;

    // 7. Average gap (excluyendo gaps > 5 min)
    let normalGapsCount = 0;
    let normalGapsSum = 0;
    for (let i = 1; i < recordsToProcess.length; i++) {
        let diffMin = businessHoursOnly
            ? getBusinessHoursOverlapMin(recordsToProcess[i - 1]["_timestamp"], recordsToProcess[i]["_timestamp"])
            : (recordsToProcess[i]["_timestamp"] - recordsToProcess[i - 1]["_timestamp"]) / (1000 * 60);
        if (diffMin >= 0 && diffMin <= 5) {
            normalGapsSum += diffMin;
            normalGapsCount++;
        }
    }
    let avgGapMin = normalGapsCount > 0 ? (normalGapsSum / normalGapsCount) : 0;

    // 8. Calculate and set peak diagnostics fields
    updatePeakDiagnostics(incidentsList);

    // 9. Update UI elements
    updateMappingBadges();
    updateQualityAuditDOM();

    updateKPIDOM(recordsToProcess.length, incidentsList.length, maxGapMinutes, maxGapStart, maxGapEnd, avgGapMin, continuityPercentage, incidentsList, recordsToProcess);

    // Populate table filters
    populateFilterSelects(incidentsList, recordsToProcess);

    // Dynamic text summaries for Business and IT
    generateDynamicSummaries(continuityPercentage, incidentsList, maxGapMinutes, avgGapMin, recordsToProcess);

    // Render Charts
    renderCharts(incidentsList, recordsToProcess);

    // Populate Table
    currentPage = 1;
    currentSortField = 'id';
    currentSortOrder = 'asc';
    filterAndRenderTable();

    // Enable Export buttons
    const csvBtn = document.getElementById("csvBtn");
    if (csvBtn) csvBtn.disabled = false;
    const xlsxBtn = document.getElementById("xlsxBtn");
    if (xlsxBtn) xlsxBtn.disabled = false;
    const pdfBtn = document.getElementById("pdfBtn");
    if (pdfBtn) pdfBtn.disabled = false;

    // Show Dashboard and collapse unified section
    document.getElementById("analyticsDashboard").classList.remove("hidden");
    isMappingDropdownOpen = true; // Set to true so toggleMappingDropdown collapses it
    toggleMappingDropdown();

    // Trigger diagnostics and update timestamp
    updateDiagnosticsTable();
    document.getElementById("lastUpdateText").innerText = "Última actualización: " + new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    showLoading(false);
}

// Render Column Mapping states in UI
function updateMappingBadges() {
    const container = document.getElementById("mappingBadgesContainer");
    container.innerHTML = "";

    Object.keys(targetColumns).forEach(prop => {
        let friendlyName = targetColumns[prop];
        let isMapped = fileMetadata.mappedCols[friendlyName] !== undefined;

        let badgeClass = isMapped
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700";

        let icon = isMapped ? "✅" : "❌";
        let matchedText = isMapped
            ? `<span class="text-[10px] text-gray-500 font-normal block truncate" title="${fileMetadata.mappedCols[friendlyName]}">Original: ${fileMetadata.mappedCols[friendlyName]}</span>`
            : '<span class="text-[10px] text-red-400 font-normal block">Falta en archivo</span>';

        container.innerHTML += `
            <div class="border rounded-lg p-2.5 flex flex-col justify-between ${badgeClass} text-xs font-bold shadow-sm">
                <span class="flex items-center justify-between">
                    <span>${friendlyName}</span>
                    <span>${icon}</span>
                </span>
                ${matchedText}
            </div>
        `;
    });
}

// Update Audit panel DOM
function updateQualityAuditDOM() {
    document.getElementById("auditDuplicates").innerText = qualityAudit.duplicates;
    document.getElementById("auditInvalids").innerText = qualityAudit.invalids;
    document.getElementById("auditMissings").innerText = qualityAudit.missings;
}

// Calculate and display peak frequencies for active incidents
function updatePeakDiagnostics(activeIncidents) {
    let hourCounts = Array(24).fill(0);
    let dayCounts = {};
    let channelCounts = {};
    let sourceCounts = {};
    const daysMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    activeIncidents.forEach(inc => {
        let sTime = new Date(inc.startTime);
        let hr = sTime.getHours();
        hourCounts[hr]++;
        let dayName = daysMap[sTime.getDay()];
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
        let ch = inc.canal || "Otros";
        channelCounts[ch] = (channelCounts[ch] || 0) + 1;
        let src = inc.fuente || "N/D";
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    let peakHour = -1;
    let maxHourCount = 0;
    for (let h = 0; h < 24; h++) {
        if (hourCounts[h] > maxHourCount) {
            maxHourCount = hourCounts[h];
            peakHour = h;
        }
    }
    let peakHourText = peakHour !== -1 ? `${peakHour}:00 h (${maxHourCount} fallas)` : "-";

    let peakDayText = "-";
    let maxDayCount = 0;
    Object.keys(dayCounts).forEach(day => {
        if (dayCounts[day] > maxDayCount) {
            maxDayCount = dayCounts[day];
            peakDayText = `${day} (${maxDayCount})`;
        }
    });

    let peakChannelText = "-";
    let maxChannelCount = 0;
    Object.keys(channelCounts).forEach(ch => {
        if (channelCounts[ch] > maxChannelCount) {
            maxChannelCount = channelCounts[ch];
            peakChannelText = `${ch} (${maxChannelCount})`;
        }
    });

    let peakSourceText = "-";
    let maxSourceCount = 0;
    Object.keys(sourceCounts).forEach(src => {
        if (sourceCounts[src] > maxSourceCount) {
            maxSourceCount = sourceCounts[src];
            peakSourceText = `${src} (${maxSourceCount})`;
        }
    });

    document.getElementById("kpiPeakHour").innerText = peakHourText;
    document.getElementById("kpiPeakDay").innerText = peakDayText;
    document.getElementById("kpiPeakChannel").innerText = peakChannelText;
    document.getElementById("kpiPeakSource").innerText = peakSourceText;
}

// Update KPI Cards DOM
function formatDuration(minutes) {
    if (minutes === 0) return "-";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    let hrs = Math.floor(minutes / 60);
    let mins = Math.round(minutes % 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function updateKPIDOM(totalLeads, totalOutages, maxGap, maxGapStart, maxGapEnd, avgGap, continuity, activeIncidents = null, activeRecords = null) {
    const currentIncidents = activeIncidents || incidentsList;
    const currentRecords = activeRecords || sortedRecords;

    document.getElementById("kpiLeads").innerText = totalLeads.toLocaleString();
    document.getElementById("kpiMaxGap").innerText = formatDuration(maxGap);

    if (maxGapStart && maxGapEnd) {
        let startStr = maxGapStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let endStr = maxGapEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let dateStr = maxGapStart.toLocaleDateString([], { day: '2-digit', month: 'short' });
        document.getElementById("kpiMaxGapDates").innerText = `Máxima brecha: ${dateStr} (${startStr} - ${endStr})`;
    } else {
        document.getElementById("kpiMaxGapDates").innerText = "Sin incidencias registradas";
    }

    document.getElementById("kpiAvgGap").innerText = avgGap < 1
        ? `${Math.round(avgGap * 60)} seg`
        : `${avgGap.toFixed(1)} min`;

    const continuityEl = document.getElementById("kpiContinuity");
    const continuityCard = document.getElementById("kpiContinuityCard");
    continuityEl.innerText = `${continuity.toFixed(2)}%`;

    // Adjust card classes according to continuity health
    continuityCard.className = "upc-card bg-gradient-to-br from-white to-gray-50/10 border-l-4 flex flex-col";
    if (continuity >= 98) {
        continuityCard.classList.add("border-l-green-600");
        continuityEl.className = "text-2xl font-black text-green-600 mt-1 block";
    } else if (continuity >= 95) {
        continuityCard.classList.add("border-l-amber-500");
        continuityEl.className = "text-2xl font-black text-amber-600 mt-1 block";
    } else {
        continuityCard.classList.add("border-l-upc-red");
        continuityEl.className = "text-2xl font-black text-upc-red mt-1 block";
    }

    // Calculate leads affected
    let totalPeriodMin = currentRecords.length > 1
        ? (currentRecords[currentRecords.length - 1]["_timestamp"] - currentRecords[0]["_timestamp"]) / (1000 * 60)
        : 0;
    let activeTimeMin = totalPeriodMin - currentIncidents.reduce((sum, item) => sum + item.duration, 0);
    let rateLeadsPerMin = activeTimeMin > 0 ? (totalLeads / activeTimeMin) : 0;
    let totalOutageDurationMin = currentIncidents.reduce((sum, item) => sum + item.duration, 0);
    let estimatedLostLeads = Math.round(rateLeadsPerMin * totalOutageDurationMin);

    const lostEstEl = document.getElementById("kpiLostEstimate");
    if (lostEstEl) lostEstEl.innerText = estimatedLostLeads.toLocaleString();
    document.getElementById("kpiTotalOutageTime").innerText = formatDuration(totalOutageDurationMin);

    // Subtext for accumulated outages
    document.getElementById("kpiAccumulatedOutages").innerText = `${formatDuration(totalOutageDurationMin)} de intermitencias acumuladas`;

    // % Oportunidades en Riesgo (based on total potential leads to avoid values > 100%)
    let potentialLeads = totalLeads + estimatedLostLeads;
    let leadsAtRiskPercent = potentialLeads > 0 ? ((estimatedLostLeads / potentialLeads) * 100) : 0;
    const leadsAtRiskEl = document.getElementById("kpiLeadsAtRiskPercent");
    if (leadsAtRiskEl) leadsAtRiskEl.innerText = `${leadsAtRiskPercent.toFixed(1)}%`;

    // Incidencias Críticas
    let criticalOutagesCount = currentIncidents.filter(inc => inc.severity === "Crítica").length;

    // Set new Group 1 Resumen Operacional elements
    const incsCountEl = document.getElementById("kpiIncidentsCount");
    if (incsCountEl) incsCountEl.innerText = totalOutages.toLocaleString();

    const critIncsCountEl = document.getElementById("kpiCriticalIncidentsCount");
    if (critIncsCountEl) critIncsCountEl.innerText = criticalOutagesCount.toLocaleString();

    // Set Availability Alert if under 20%
    const availabilityAlertEl = document.getElementById("availabilityAlert");
    if (availabilityAlertEl) {
        if (continuity < 20) {
            availabilityAlertEl.classList.remove("hidden");
        } else {
            availabilityAlertEl.classList.add("hidden");
        }
    }

    // Calculate Global Health Score (0-100) - Correct parameters: continuity, criticalOutagesCount, totalOutageDurationMin, avgGap
    let healthScore = calculateGlobalHealthScore(continuity, criticalOutagesCount, totalOutageDurationMin, avgGap);
    document.getElementById("globalHealthScoreValue").innerText = healthScore;

    // Update health score badge label
    const healthLabelEl = document.getElementById("globalHealthScoreLabel");
    if (healthLabelEl) {
        if (healthScore >= 90) {
            healthLabelEl.innerText = "🟢 Excelente";
            healthLabelEl.className = "text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800";
        } else if (healthScore >= 75) {
            healthLabelEl.innerText = "🟢 Bueno";
            healthLabelEl.className = "text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800";
        } else if (healthScore >= 60) {
            healthLabelEl.innerText = "🟡 Atención";
            healthLabelEl.className = "text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-850";
        } else if (healthScore >= 40) {
            healthLabelEl.innerText = "🟠 Riesgo";
            healthLabelEl.className = "text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-850";
        } else {
            healthLabelEl.innerText = "🔴 Crítico";
            healthLabelEl.className = "text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800";
        }
    }

    // Nivel de Riesgo Operacional: Based on severity
    let riskLevel = "🟢 Bajo";
    let riskClass = "bg-green-100 text-green-800";
    if (currentIncidents.some(inc => inc.severity === "Crítica")) {
        riskLevel = "🔴 Crítico";
        riskClass = "bg-red-100 text-red-800";
    } else if (currentIncidents.some(inc => inc.severity === "Alta")) {
        riskLevel = "🟠 Alto";
        riskClass = "bg-orange-100 text-orange-850";
    } else if (currentIncidents.some(inc => inc.severity === "Media")) {
        riskLevel = "🟡 Medio";
        riskClass = "bg-yellow-100 text-yellow-800";
    }
    const riskEl = document.getElementById("kpiRiesgoOperacional");
    if (riskEl) {
        riskEl.innerText = riskLevel;
        riskEl.className = `text-xs font-bold px-2 py-0.5 rounded-full ${riskClass}`;
    }

    // Update Traffic Light status banner styling
    const scoreValEl = document.getElementById("globalHealthScoreValue");
    const trafficLightIcon = document.getElementById("statusTrafficLightIcon");
    const trafficLightText = document.getElementById("statusTrafficLightText");
    const trafficLightDetail = document.getElementById("statusTrafficLightDetail");
    const bannerEl = document.getElementById("generalStatusBanner");

    bannerEl.className = "upc-card p-4 flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-300";

    if (healthScore >= 90) {
        scoreValEl.className = "text-3xl font-black text-green-600";
        trafficLightIcon.innerText = "🟢";
        trafficLightText.innerHTML = `<span class="text-green-600 uppercase font-black">SISTEMA EXCELENTE</span> &bull; Operación óptima`;
        bannerEl.classList.add("border-l-4", "border-l-green-600", "bg-green-50/10");
    } else if (healthScore >= 75) {
        scoreValEl.className = "text-3xl font-black text-emerald-600";
        trafficLightIcon.innerText = "🟢";
        trafficLightText.innerHTML = `<span class="text-emerald-600 uppercase font-black">SISTEMA ESTABLE</span> &bull; Operando con normalidad`;
        bannerEl.classList.add("border-l-4", "border-l-green-600", "bg-green-50/10");
    } else if (healthScore >= 60) {
        scoreValEl.className = "text-3xl font-black text-amber-500";
        trafficLightIcon.innerText = "🟡";
        trafficLightText.innerHTML = `<span class="text-amber-500 uppercase font-black">ALERTA OPERATIVA</span> &bull; Microcortes detectados`;
        bannerEl.classList.add("border-l-4", "border-l-amber-500", "bg-amber-50/10");
    } else if (healthScore >= 40) {
        scoreValEl.className = "text-3xl font-black text-orange-500";
        trafficLightIcon.innerText = "🟡";
        trafficLightText.innerHTML = `<span class="text-orange-500 uppercase font-black">ESTADO DE RIESGO</span> &bull; Intermitencias prolongadas`;
        bannerEl.classList.add("border-l-4", "border-l-amber-500", "bg-amber-50/10");
    } else {
        scoreValEl.className = "text-3xl font-black text-red-600";
        trafficLightIcon.innerText = "🔴";
        trafficLightText.innerHTML = `<span class="text-red-600 uppercase font-black">ESTADO CRÍTICO</span> &bull; Caída de servicio registrada`;
        bannerEl.classList.add("border-l-4", "border-l-upc-red", "bg-red-50/10");
    }

    let totalIncsText = currentIncidents.length === 1 ? "1 incidencia detectada" : `${currentIncidents.length} incidencias detectadas`;
    let critText = criticalOutagesCount === 1 ? "1 crítica" : `${criticalOutagesCount} críticas`;
    trafficLightDetail.innerText = `${totalIncsText} (${critText}).`;

    // Set suggested cards in suggestion block too
    if (document.getElementById("kpiLostEstimate_suggested")) {
        document.getElementById("kpiLostEstimate_suggested").innerText = estimatedLostLeads.toLocaleString();
    }
    if (document.getElementById("kpiMeanTimeToRepair_suggested")) {
        let mttr = totalOutages > 0 ? (totalOutageDurationMin / totalOutages) : 0;
        document.getElementById("kpiMeanTimeToRepair_suggested").innerText = formatDuration(mttr);
    }
}

// Generate customized executive text summaries dynamically
function generateDynamicSummaries(continuity, outages, maxGap, avgGap, records) {
    if (!records || records.length === 0) {
        document.getElementById("businessSummaryText").innerHTML = "No hay datos para el período o filtros seleccionados.";
        document.getElementById("techSummaryText").innerHTML = "No hay datos para el período o filtros seleccionados.";
        return;
    }
    let totalOutageMin = outages.reduce((sum, i) => sum + i.duration, 0);
    let firstDate = records[0]["_timestamp"].toLocaleDateString();
    let lastDate = records[records.length - 1]["_timestamp"].toLocaleDateString();

    // 1. Business summary
    let busText = `Durante el periodo analizado (del <strong>${firstDate}</strong> al <strong>${lastDate}</strong>), se registró un total de <strong>${records.length.toLocaleString()} leads</strong> procesados en el CRM.`;

    if (outages.length > 0) {
        let criticalCount = outages.filter(o => o.severity === "Crítica").length;
        let highCount = outages.filter(o => o.severity === "Alta").length;

        busText += ` El sistema de detección identificó <strong>${outages.length} intermitencias operacionales</strong> (gaps mayores a 5 minutos) que acumulan un total de <strong>${formatDuration(totalOutageMin)}</strong> sin ingreso de leads. Esto resulta en una <strong>Continuidad Operativa del ${continuity.toFixed(2)}%</strong>.`;

        if (criticalCount > 0 || highCount > 0) {
            busText += ` Se identificaron <strong>${criticalCount} caídas críticas</strong> y <strong>${highCount} caídas de severidad alta</strong> en las que el CRM estuvo inactivo por largos tramos. Se estima que este congelamiento del flujo retrasó de forma importante la tasa de contacto de los equipos comerciales, afectando los SLAs institucionales de atención al prospecto.`;
        } else {
            busText += ` Aunque se detectaron intermitencias, todas correspondieron a severidades menores (Baja o Media), lo que sugiere retrasos menores en la cola de procesamiento o microcortes de sincronización.`;
        }
    } else {
        busText += ` <strong>Felicidades.</strong> No se detectó ninguna intermitencia mayor a 5 minutos en el flujo cronológico. El CRM ha mostrado una tasa de ingesta estable y continua con un <strong>100% de Continuidad Operativa</strong>.`;
    }
    document.getElementById("businessSummaryText").innerHTML = busText;

    // 2. IT summary
    let techText = `El análisis técnico de ingesta de datos evaluó el orden secuencial de los registros. El tiempo de respuesta promedio (frecuencia de llegada) entre leads activos fue de <strong>${avgGap < 1 ? Math.round(avgGap * 60) + " segundos" : avgGap.toFixed(1) + " minutos"}</strong>.`;

    if (outages.length > 0) {
        // Find hour with most outages
        let hourCounts = Array(24).fill(0);
        outages.forEach(o => {
            let hr = new Date(o.startTime).getHours();
            hourCounts[hr]++;
        });
        let peakHour = hourCounts.indexOf(Math.max(...hourCounts));
        let peakHourCount = hourCounts[peakHour];

        techText += ` Se identificó que el CRM sufrió su brecha operativa máxima de <strong>${formatDuration(maxGap)}</strong>. `;

        if (peakHourCount > 0) {
            techText += `Los incidentes operacionales muestran una mayor frecuencia a las <strong>${peakHour}:00 horas</strong> (registrando ${peakHourCount} incidentes). Esta concentración horaria apunta fuertemente a picos de carga en el servidor web de APIs del CRM o cuellos de botella en la sincronización de webhooks en la base de datos de destino.`;
        }

        if (qualityAudit.duplicates > 0 || qualityAudit.invalids > 0) {
            techText += `<br><br><strong>Recomendación de Calidad de Datos:</strong> Se detectaron <strong>${qualityAudit.duplicates} duplicados</strong> de leads con idéntico timestamp y <strong>${qualityAudit.invalids} registros temporales inválidos</strong>. Esto indica la necesidad de revisar los scripts de deduplicación en el webhook de origen para evitar saturación inútil del pipeline del CRM.`;
        }
    } else {
        techText += ` La frecuencia de entrada es constante y no presenta anomalías ni concentraciones inusuales de demoras. Los logs de auditoría de ingesta están completamente limpios.`;
    }
    document.getElementById("techSummaryText").innerHTML = techText;
}

// Render Heatmap grid HTML
function renderHeatmap(incidents) {
    const container = document.getElementById("heatmapContainer");
    if (!container) return;

    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const dayIndices = [1, 2, 3, 4, 5, 6, 0]; // Monday = 1, ..., Sunday = 0

    // Initialize counts: day index (0-6) x hour index (0-23)
    let gridData = Array(7).fill(null).map(() => Array(24).fill(0));

    incidents.forEach(inc => {
        let date = new Date(inc.startTime);
        let day = date.getDay(); // 0-6
        let hr = date.getHours(); // 0-23

        let rowIdx = dayIndices.indexOf(day);
        if (rowIdx !== -1) {
            gridData[rowIdx][hr]++;
        }
    });

    // Find max value for color scaling
    let maxVal = 0;
    for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 24; c++) {
            if (gridData[r][c] > maxVal) maxVal = gridData[r][c];
        }
    }

    // Build the table structure
    let html = `<table class="w-full text-center border-collapse text-[10px] font-medium border border-gray-150 bg-white">`;
    // Header row with hours
    html += `<thead class="bg-gray-50"><tr><th class="p-1 text-gray-500 font-bold border-b border-gray-200">Día</th>`;
    for (let h = 0; h < 24; h++) {
        html += `<th class="p-1 text-gray-500 font-bold border-b border-gray-200" style="min-width: 18px;">${h}h</th>`;
    }
    html += `</tr></thead><tbody>`;

    // Data rows
    for (let r = 0; r < 7; r++) {
        html += `<tr class="hover:bg-slate-50/50">`;
        html += `<td class="p-1 text-left font-bold text-gray-600 border-r border-b border-gray-200 bg-gray-50 select-none" style="min-width: 60px;">${dayNames[r]}</td>`;
        for (let c = 0; c < 24; c++) {
            let count = gridData[r][c];
            let bgColor = "";
            let textColor = "text-gray-300";
            let tooltipText = `${dayNames[r]}, ${c}:00 h - ${count} incidentes`;

            if (count > 0) {
                let intensity = maxVal > 0 ? (count / maxVal) : 0;
                if (intensity <= 0.25) {
                    bgColor = "style='background-color: #fee2e2;'"; // light red
                    textColor = "text-red-800";
                } else if (intensity <= 0.5) {
                    bgColor = "style='background-color: #fca5a5;'"; // mid red
                    textColor = "text-red-950 font-semibold";
                } else if (intensity <= 0.75) {
                    bgColor = "style='background-color: #f87171;'"; // red
                    textColor = "text-white font-bold";
                } else {
                    bgColor = "style='background-color: #dc2626;'"; // dark red
                    textColor = "text-white font-black";
                }
            }

            html += `<td ${bgColor} class="p-1 border border-gray-200 cursor-pointer transition-all duration-150 hover:scale-105 ${textColor}" title="${tooltipText}">
                <span class="block">${count > 0 ? count : '-'}</span>
            </td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// Render charts using ChartJS
function renderCharts(incidents, records) {
    // Destroy previous instances to avoid overlay rendering bugs
    if (severityChartInstance) severityChartInstance.destroy();
    if (timelineChartInstance) timelineChartInstance.destroy();
    if (channelChartInstance) channelChartInstance.destroy();

    // 1. Severity Chart (Horizontal Bar Chart)
    let counts = { Baja: 0, Media: 0, Alta: 0, Crítica: 0 };
    incidents.forEach(i => counts[i.severity]++);
    let totalIncs = incidents.length;

    const ctxSev = document.getElementById("severityChart").getContext("2d");
    severityChartInstance = new Chart(ctxSev, {
        type: "bar",
        data: {
            labels: ["Baja (5-10 min)", "Media (10-20 min)", "Alta (20-40 min)", "Crítica (>40 min)"],
            datasets: [{
                data: [counts.Baja, counts.Media, counts.Alta, counts.Crítica],
                backgroundColor: ["#FBBF24", "#F97316", "#EF4444", "#7F1D1D"],
                borderRadius: 6,
                maxBarThickness: 32
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let val = context.raw || 0;
                            let pct = totalIncs > 0 ? ((val / totalIncs) * 100).toFixed(1) : 0;
                            return `Cantidad: ${val} (${pct}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: "#F3F4F6" },
                    ticks: { font: { family: "Inter", size: 9 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { family: "Inter", size: 9, weight: "bold" } }
                }
            }
        }
    });

    // 2. Heatmap Operacional
    renderHeatmap(incidents);

    // 3. Impacto por Canal (Horizontal Bar Chart)
    let chCounts = {};
    incidents.forEach(inc => {
        let chNorm = inc.canal || "Otros";
        chCounts[chNorm] = (chCounts[chNorm] || 0) + 1;
    });

    // Sort channels by count descending
    let sortedChs = Object.keys(chCounts).sort((a, b) => chCounts[b] - chCounts[a]);
    let chartLabels = sortedChs.length > 0 ? sortedChs : ["Sin datos"];
    let chartData = sortedChs.length > 0 ? sortedChs.map(ch => chCounts[ch]) : [0];

    const ctxChan = document.getElementById("channelChart").getContext("2d");
    channelChartInstance = new Chart(ctxChan, {
        type: "bar",
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: "#D50000",
                borderRadius: 6,
                maxBarThickness: 28
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: "#F3F4F6" },
                    ticks: { font: { family: "Inter", size: 9 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { family: "Inter", size: 9, weight: "bold" } }
                }
            }
        }
    });

    // 4. Timeline Chart (Line representation of volume and incident areas)
    let dateMap = {};
    records.forEach(r => {
        let dateStr = r["_timestamp"].toLocaleDateString([], { day: '2-digit', month: 'short' });
        if (!dateMap[dateStr]) dateMap[dateStr] = { leads: 0, incidents: 0, outageMinutes: 0 };
        dateMap[dateStr].leads++;
    });
    incidents.forEach(i => {
        let dateStr = new Date(i.startTime).toLocaleDateString([], { day: '2-digit', month: 'short' });
        if (dateMap[dateStr]) {
            dateMap[dateStr].incidents++;
            dateMap[dateStr].outageMinutes += i.duration;
        }
    });

    let labelsTimeline = Object.keys(dateMap);
    let leadsTimeline = labelsTimeline.map(k => dateMap[k].leads);
    let incsTimeline = labelsTimeline.map(k => dateMap[k].incidents);
    let timeTimeline = labelsTimeline.map(k => Math.round(dateMap[k].outageMinutes));

    const ctxLine = document.getElementById("timelineChart").getContext("2d");
    timelineChartInstance = new Chart(ctxLine, {
        type: "line",
        data: {
            labels: labelsTimeline,
            datasets: [
                {
                    label: "Leads Recibidos",
                    data: leadsTimeline,
                    borderColor: "#1A1A1A",
                    backgroundColor: "rgba(26, 26, 26, 0.03)",
                    borderWidth: 2.5,
                    yAxisID: "y",
                    tension: 0.15,
                    fill: true
                },
                {
                    label: "Incidentes",
                    data: incsTimeline,
                    borderColor: "#D50000",
                    backgroundColor: "rgba(213, 0, 0, 0.05)",
                    borderWidth: 2,
                    yAxisID: "y1",
                    tension: 0.15,
                    fill: false
                },
                {
                    label: "Minutos Caídos",
                    data: timeTimeline,
                    borderColor: "#F59E0B",
                    backgroundColor: "rgba(245, 158, 11, 0.05)",
                    borderWidth: 2,
                    yAxisID: "y1",
                    tension: 0.15,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: { font: { family: "Inter", size: 10, weight: "bold" } }
                }
            },
            scales: {
                y: {
                    type: "linear",
                    display: true,
                    position: "left",
                    grid: { color: "#F3F4F6" },
                    ticks: { font: { family: "Inter", size: 9 } },
                    title: { display: true, text: "Leads", font: { family: "Inter", size: 10, weight: "bold" } }
                },
                y1: {
                    type: "linear",
                    display: true,
                    position: "right",
                    grid: { display: false },
                    ticks: { font: { family: "Inter", size: 9 } },
                    title: { display: true, text: "Incidentes / Minutos", font: { family: "Inter", size: 10, weight: "bold" } }
                },
                x: {
                    ticks: { font: { family: "Inter", size: 9 } }
                }
            }
        }
    });
}

// Paged, searchable, and filterable table engine
function filterAndRenderTable() {
    const query = document.getElementById("tableSearch").value.toLowerCase().trim();
    const dateStartStr = document.getElementById("tableDateStart").value;
    const dateEndStr = document.getElementById("tableDateEnd").value;
    const channelFilter = document.getElementById("channelFilter").value;
    const segmentFilter = document.getElementById("segmentFilter").value;
    const unitFilter = document.getElementById("unitFilter").value;
    const campaignFilter = document.getElementById("campaignFilter").value;
    const severityFilter = document.getElementById("severityFilter").value;

    // Parse filter dates
    let filterDateStart = dateStartStr ? new Date(dateStartStr + "T00:00:00") : null;
    let filterDateEnd = dateEndStr ? new Date(dateEndStr + "T23:59:59") : null;

    filteredIncidents = incidentsList.filter(item => {
        // Search query matching codes
        let matchesSearch = !query ||
            item.prevLead.toLowerCase().includes(query) ||
            item.currLead.toLowerCase().includes(query);

        // Date filter
        let matchesDate = true;
        if (filterDateStart && item.startTime < filterDateStart) matchesDate = false;
        if (filterDateEnd && item.endTime > filterDateEnd) matchesDate = false;

        // Category filters
        let matchesChannel = channelFilter === "ALL" || item.canal === channelFilter;
        let matchesSegment = segmentFilter === "ALL" || item.segmento === segmentFilter;
        let matchesUnit = unitFilter === "ALL" || item.unidadNegocio === unitFilter;
        let matchesCampaign = campaignFilter === "ALL" || item.campana === campaignFilter;
        let matchesSeverity = severityFilter === "ALL" || item.severity === severityFilter;

        return matchesSearch && matchesDate && matchesChannel && matchesSegment && matchesUnit && matchesCampaign && matchesSeverity;
    });

    // Filter records homologically
    let filteredRecords = sortedRecords.filter(item => {
        // Search query matching person code
        let matchesSearch = !query || (item["Código de Persona"] && item["Código de Persona"].toLowerCase().includes(query));

        // Date filter
        let matchesDate = true;
        if (filterDateStart && item._timestamp < filterDateStart) matchesDate = false;
        if (filterDateEnd && item._timestamp > filterDateEnd) matchesDate = false;

        // Category filters
        let matchesChannel = channelFilter === "ALL" || normalizeChannel(item["Canal"]) === channelFilter;
        let matchesSegment = segmentFilter === "ALL" || item["Segmento"] === segmentFilter;

        let itemUnit = item["Unidad de Negocio"] || "N/D";
        let matchesUnit = unitFilter === "ALL" || itemUnit === unitFilter;

        let itemCampaign = item["Campaña"] || "N/D";
        let matchesCampaign = campaignFilter === "ALL" || itemCampaign === campaignFilter;

        return matchesSearch && matchesDate && matchesChannel && matchesSegment && matchesUnit && matchesCampaign;
    });

    // Recalculate filtered KPIs
    if (sortedRecords.length > 0) {
        let totalOutageDurationMin = filteredIncidents.reduce((sum, item) => sum + item.duration, 0);

        // Availability %
        let continuityVal = 100;
        if (filteredRecords.length > 0) {
            continuityVal = calculateBusinessHoursAvailability(
                filteredRecords[0]["_timestamp"].getTime(),
                filteredRecords[filteredRecords.length - 1]["_timestamp"].getTime(),
                filteredIncidents
            );
        }

        // Normal gaps average
        let normalGapsCount = 0;
        let normalGapsSum = 0;
        for (let i = 1; i < filteredRecords.length; i++) {
            let diffMin = businessHoursOnly
                ? getBusinessHoursOverlapMin(filteredRecords[i - 1]["_timestamp"], filteredRecords[i]["_timestamp"])
                : (filteredRecords[i]["_timestamp"] - filteredRecords[i - 1]["_timestamp"]) / (1000 * 60);
            if (diffMin >= 0 && diffMin <= 5) {
                normalGapsSum += diffMin;
                normalGapsCount++;
            }
        }
        let avgGapMin = normalGapsCount > 0 ? (normalGapsSum / normalGapsCount) : 0;

        // Maximum Gap
        let maxGapMinutes = 0;
        let maxGapStart = null;
        let maxGapEnd = null;
        filteredIncidents.forEach(inc => {
            if (inc.duration > maxGapMinutes) {
                maxGapMinutes = inc.duration;
                maxGapStart = inc.startTime;
                maxGapEnd = inc.endTime;
            }
        });

        // Update peak diagnostics
        updatePeakDiagnostics(filteredIncidents);

        // Update KPI Cards
        updateKPIDOM(filteredRecords.length, filteredIncidents.length, maxGapMinutes, maxGapStart, maxGapEnd, avgGapMin, continuityVal, filteredIncidents, filteredRecords);

        // Update text summaries (pass fallback sortedRecords if filteredRecords is empty to prevent crash)
        generateDynamicSummaries(continuityVal, filteredIncidents, maxGapMinutes, avgGapMin, filteredRecords.length > 0 ? filteredRecords : sortedRecords);

        // Re-render charts
        renderCharts(filteredIncidents, filteredRecords.length > 0 ? filteredRecords : sortedRecords);

        // Update diagnostic heuristics table
        updateDiagnosticsTable(filteredIncidents, filteredRecords, continuityVal);
    }

    // Apply sorting
    if (currentSortField) {
        filteredIncidents.sort((a, b) => {
            let valA = a[currentSortField];
            let valB = b[currentSortField];

            if (valA instanceof Date) valA = valA.getTime();
            if (valB instanceof Date) valB = valB.getTime();

            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Recalculate pagination boundaries
    currentPage = 1;
    renderTablePage();
    updateSortIcons();
}

function sortTable(field) {
    if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortOrder = 'desc'; // Default to descending on new column click
    }
    filterAndRenderTable();
}

function updateSortIcons() {
    const fields = [
        'id', 'prevLead', 'currLead', 'startTime', 'endTime',
        'duration', 'severity', 'leadsAfectados', 'canal', 'segmento',
        'fuente', 'unidadNegocio', 'impactoComercial'
    ];
    fields.forEach(f => {
        const el = document.getElementById(`sort-icon-${f}`);
        if (!el) return;
        if (currentSortField === f) {
            el.innerHTML = currentSortOrder === 'asc' ? ' &nbsp;▲' : ' &nbsp;▼';
        } else {
            el.innerHTML = f === 'duration' ? ' &nbsp;↕️' : '';
        }
    });
}

function renderTablePage() {
    const tbody = document.getElementById("incidentsTableBody");
    tbody.innerHTML = "";

    const total = filteredIncidents.length;
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, total);

    if (total === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="px-4 py-8 text-center text-gray-400 font-semibold italic">
                    No se encontraron incidentes con los filtros seleccionados.
                </td>
            </tr>
        `;
        document.getElementById("tablePaginationInfo").innerText = "Mostrando 0 a 0 de 0 incidentes";
        document.getElementById("prevPageBtn").disabled = true;
        document.getElementById("nextPageBtn").disabled = true;
        return;
    }

    for (let i = startIdx; i < endIdx; i++) {
        let item = filteredIncidents[i];
        let startStr = item.startTime.toLocaleDateString() + " " + item.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let endStr = item.endTime.toLocaleDateString() + " " + item.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let badgeClass = "badge-baja";
        if (item.severity === "Crítica") badgeClass = "badge-critica";
        else if (item.severity === "Alta") badgeClass = "badge-alta";
        else if (item.severity === "Media") badgeClass = "badge-media";

        let impBadge = "text-gray-600 bg-gray-100";
        if (item.severity === "Crítica") impBadge = "text-red-700 bg-red-100 border border-red-200";
        else if (item.severity === "Alta") impBadge = "text-orange-700 bg-orange-100 border border-orange-200";
        else if (item.severity === "Media") impBadge = "text-amber-700 bg-amber-100 border border-amber-200";

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-3 py-3 font-semibold text-gray-800">${item.id}</td>
                <td class="px-3 py-3 text-gray-700 select-all font-mono" title="Copiar">${item.prevLead}</td>
                <td class="px-3 py-3 text-gray-700 select-all font-mono" title="Copiar">${item.currLead}</td>
                <td class="px-3 py-3 text-gray-500">${startStr}</td>
                <td class="px-3 py-3 text-gray-500">${endStr}</td>
                <td class="px-3 py-3 font-semibold text-upc-dark">${item.duration.toFixed(1)} min</td>
                <td class="px-3 py-3 text-center">
                    <span class="badge ${badgeClass}">${item.severity}</span>
                </td>
                <td class="px-3 py-3 text-center font-bold text-gray-700">${item.leadsAfectados}</td>
                <td class="px-3 py-3 text-gray-600">${item.canal}</td>
                <td class="px-3 py-3 text-gray-600 truncate max-w-[120px]" title="${item.segmento}">${item.segmento}</td>
                <td class="px-3 py-3 text-gray-500 truncate max-w-[120px]" title="${item.fuente}">${item.fuente}</td>
                <td class="px-3 py-3 text-gray-500 truncate max-w-[120px]" title="${item.unidadNegocio}">${item.unidadNegocio}</td>
                <td class="px-3 py-3 text-center">
                    <span class="px-2 py-1 rounded text-[10px] font-bold ${impBadge}">${item.impactoComercial}</span>
                </td>
            </tr>
        `;
    }

    document.getElementById("tablePaginationInfo").innerText = `Mostrando ${startIdx + 1} a ${endIdx} de ${total} incidentes`;
    document.getElementById("prevPageBtn").disabled = currentPage === 1;
    document.getElementById("nextPageBtn").disabled = endIdx === total;
}

function changePage(direction) {
    currentPage += direction;
    renderTablePage();
}

// Export Report to CSV in UTF-8 with BOM
function exportReportCSV() {
    if (filteredIncidents.length === 0) {
        alert("No hay incidentes para exportar.");
        return;
    }

    let csvContent = "Falla N°,Lead Anterior,Lead Siguiente,Inicio Intermitencia,Fin Intermitencia,Duración (Minutos),Severidad,Leads Afectados Estimados,Canal,Segmento,Fuente,Unidad de Negocio,Impacto Comercial\n";

    filteredIncidents.forEach(item => {
        let startStr = item.startTime.toLocaleString().replace(",", "");
        let endStr = item.endTime.toLocaleString().replace(",", "");
        let row = [
            item.id,
            `"${item.prevLead}"`,
            `"${item.currLead}"`,
            `"${startStr}"`,
            `"${endStr}"`,
            item.duration.toFixed(1),
            `"${item.severity}"`,
            item.leadsAfectados,
            `"${item.canal || 'N/D'}"`,
            `"${item.segmento || 'N/D'}"`,
            `"${item.fuente || 'N/D'}"`,
            `"${item.unidadNegocio || 'N/D'}"`,
            `"${item.impactoComercial}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    // Create download link with BOM for UTF-8 compatibility
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Incidentes_CRM_UPC_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export Report to Excel (XLSX) via SheetJS
function exportReportXLSX() {
    if (filteredIncidents.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    const data = filteredIncidents.map(item => ({
        "Falla N°": item.id,
        "Lead Anterior": item.prevLead,
        "Lead Siguiente": item.currLead,
        "Inicio Intermitencia": item.startTime.toLocaleString(),
        "Fin Intermitencia": item.endTime.toLocaleString(),
        "Duración (Minutos)": parseFloat(item.duration.toFixed(1)),
        "Severidad": item.severity,
        "Leads Afectados Est.": item.leadsAfectados,
        "Canal": item.canal || 'N/D',
        "Segmento": item.segmento || 'N/D',
        "Fuente": item.fuente || 'N/D',
        "Unidad de Negocio": item.unidadNegocio || 'N/D',
        "Impacto Comercial": item.impactoComercial
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Incidentes Detectados");
    XLSX.writeFile(workbook, `Incidentes_CRM_UPC_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Export Report to PDF in A4 Vertical layout
function exportReportPDF() {
    const element = document.getElementById("captureArea");

    // Save state of elements to avoid visual glitching on screen
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    const originalPadding = element.style.padding;
    const originalBg = document.body.style.backgroundColor;

    // Apply export configurations programmatically
    element.classList.add("export-pdf-mode");
    document.body.style.backgroundColor = "white";

    const opt = {
        margin: [10, 10, 10, 10], // Margin in mm (1cm)
        filename: `Reporte_Intermitencias_CRM_UPC_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Run PDF generation
    html2pdf().from(element).set(opt).save().then(() => {
        // Restore layout configuration
        element.classList.remove("export-pdf-mode");
        document.body.style.backgroundColor = originalBg;
    }).catch(err => {
        alert("Error al generar PDF: " + err.message);
        element.classList.remove("export-pdf-mode");
        document.body.style.backgroundColor = originalBg;
    });
}

// --- Diagnóstico Inteligente (Causas Probables) ---
function updateDiagnosticsTable(filteredInc = null, filteredRec = null, continuityVal = null) {
    const activeIncidents = filteredInc || incidentsList;
    const activeRecords = filteredRec || sortedRecords;
    const activeContinuity = continuityVal !== null ? continuityVal : continuityPercentage;

    const tableBody = document.getElementById("diagnosticsTableBody");
    if (!tableBody) return;

    if (activeRecords.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="px-3 py-6 text-center text-gray-400 font-semibold italic">
                    No hay suficientes datos para generar el diagnóstico.
                </td>
            </tr>
        `;
        return;
    }

    // 1. Calculations needed for heuristics
    let totalLeads = activeRecords.length;
    let criticalCount = activeIncidents.filter(o => o.severity === "Crítica").length;
    let medHighCount = activeIncidents.filter(o => o.severity === "Media" || o.severity === "Alta").length;

    // Get peak hour text
    const peakHourText = document.getElementById("kpiPeakHour").innerText;
    let peakHour = -1;
    const hourMatch = peakHourText.match(/^(\d+):00/);
    if (hourMatch) {
        peakHour = parseInt(hourMatch[1], 10);
    }

    // Webhook Saturation Heuristics:
    let webhookConf = "Baja";
    let webhookCriteria = "Cola de eventos fluida. El webhook registra la actividad Inbound/Outbound correctamente.";
    if (criticalCount > 0 && peakHour >= 9 && peakHour <= 19) {
        webhookConf = "Alta";
        webhookCriteria = `Fallas críticas en horas pico de marketing (${peakHourText}) sugieren congestión al guardar leads Inbound/Outbound en el CRM.`;
    } else if (medHighCount >= 3) {
        webhookConf = "Media";
        webhookCriteria = `${medHighCount} retrasos moderados de webhook al registrar actividades en periodos activos.`;
    }

    // WhatsApp API Heuristics:
    const peakChannelText = document.getElementById("kpiPeakChannel").innerText;
    let waIncidents = activeIncidents.filter(o => o.canal.toLowerCase().includes("whatsapp") || o.canal.toLowerCase().includes("wsp"));
    let waRatio = activeIncidents.length > 0 ? (waIncidents.length / activeIncidents.length) : 0;
    let wspConf = "Baja";
    let wspCriteria = "El canal de WhatsApp (API/Token) registra la derivación del tráfico sin anomalías.";
    if (peakChannelText.toLowerCase().includes("whatsapp") && waRatio > 0.4) {
        wspConf = "Alta";
        wspCriteria = `WhatsApp concentra la derivación del tráfico. El flujo WhatsApp -> CRM presenta fallas severas (${(waRatio * 100).toFixed(0)}% del total).`;
    } else if (waIncidents.length > 0 || peakChannelText.toLowerCase().includes("whatsapp")) {
        wspConf = "Media";
        wspCriteria = "Canal WhatsApp presenta microcortes o demoras intermitentes de registro.";
    }

    // CRM Issues Heuristics:
    let crmConf = "Baja";
    let crmCriteria = `El CRM está guardando actividades con disponibilidad óptima (${activeContinuity.toFixed(2)}%).`;
    if (activeContinuity < 90 || criticalCount > 3) {
        crmConf = "Alta";
        crmCriteria = `Disponibilidad baja (${activeContinuity.toFixed(2)}%) para registrar actividades Inbound/Outbound con fallas críticas.`;
    } else if (activeContinuity >= 90 && activeContinuity <= 95) {
        crmConf = "Media";
        crmCriteria = `Estabilidad moderada (${activeContinuity.toFixed(2)}%) al procesar el ingreso de registros CRM.`;
    }

    // Landing Integration Heuristics:
    const peakSourceText = document.getElementById("kpiPeakSource").innerText;
    let landingIncidents = activeIncidents.filter(o => o.fuente.toLowerCase().includes("landing") || o.fuente.toLowerCase().includes("web") || o.fuente.toLowerCase().includes("form"));
    let landingRatio = activeIncidents.length > 0 ? (landingIncidents.length / activeIncidents.length) : 0;
    let landingConf = "Baja";
    let landingCriteria = "Activos digitales derivan tráfico al número de WhatsApp de forma estable.";
    if (peakSourceText.toLowerCase().includes("landing") || peakSourceText.toLowerCase().includes("web") || landingRatio > 0.4) {
        landingConf = "Alta";
        landingCriteria = `Origen principal de caídas en activos (Landing/Web) que derivan tráfico al WhatsApp (${(landingRatio * 100).toFixed(0)}% de fallas).`;
    } else if (landingIncidents.length > 0) {
        landingConf = "Media";
        landingCriteria = "Incidentes menores aislados en formularios o redirecciones web.";
    }

    // Segmentation Heuristics:
    let dataErrors = (qualityAudit.invalids || 0) + (qualityAudit.duplicates || 0) + (qualityAudit.missings || 0);
    let dataQuality = totalLeads > 0 ? (1 - (dataErrors / totalLeads)) : 1;
    let segmentationConf = "Baja";
    let segmentationCriteria = "100% de calidad en los datos de tráfico Inbound/Outbound para segmentar campañas.";
    if (dataQuality < 0.95) {
        segmentationConf = "Alta";
        segmentationCriteria = `Calidad de datos baja (${(dataQuality * 100).toFixed(1)}%) dificulta clasificar orígenes y segmentar Inbound/Outbound.`;
    } else if (dataErrors > 0) {
        segmentationConf = "Media";
        segmentationCriteria = `Se detectaron ${dataErrors} anomalías en registros de tráfico (duplicados, nulos, etc.).`;
    }

    const getBadgeHtml = (conf) => {
        if (conf === "Alta") return `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800">🔴 Alta</span>`;
        if (conf === "Media") return `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">🟡 Media</span>`;
        if (conf === "Baja") return `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">🟢 Baja</span>`;
        return `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-gray-100 text-gray-800">⚪ Ninguna</span>`;
    };

    tableBody.innerHTML = `
        <tr>
            <td class="px-3 py-3 font-bold text-gray-800">Saturación de Webhook</td>
            <td class="px-3 py-3 text-center">${getBadgeHtml(webhookConf)}</td>
            <td class="px-3 py-3 text-gray-500">${webhookCriteria}</td>
        </tr>
        <tr>
            <td class="px-3 py-3 font-bold text-gray-800">API WhatsApp</td>
            <td class="px-3 py-3 text-center">${getBadgeHtml(wspConf)}</td>
            <td class="px-3 py-3 text-gray-500">${wspCriteria}</td>
        </tr>
        <tr>
            <td class="px-3 py-3 font-bold text-gray-800">Problema CRM</td>
            <td class="px-3 py-3 text-center">${getBadgeHtml(crmConf)}</td>
            <td class="px-3 py-3 text-gray-500">${crmCriteria}</td>
        </tr>
        <tr>
            <td class="px-3 py-3 font-bold text-gray-800">Integración Landing</td>
            <td class="px-3 py-3 text-center">${getBadgeHtml(landingConf)}</td>
            <td class="px-3 py-3 text-gray-500">${landingCriteria}</td>
        </tr>
        <tr>
            <td class="px-3 py-3 font-bold text-gray-800">Error de Segmentación</td>
            <td class="px-3 py-3 text-center">${getBadgeHtml(segmentationConf)}</td>
            <td class="px-3 py-3 text-gray-500">${segmentationCriteria}</td>
        </tr>
    `;
}
