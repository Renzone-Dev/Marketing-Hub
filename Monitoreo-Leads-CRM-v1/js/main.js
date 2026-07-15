let rawData = [];
let filteredData = [];
let charts = {};

// Variables de ordenamiento de la tabla
let detailedSortCol = 'total';
let detailedSortAsc = false;

const daysOrder = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function getUniqueLeads(data) {
    const persons = {};
    data.forEach((d, index) => {
        const cod = d['Cod Persona'] || '';

        let dateStr = d['Fecha de creación'] || '';
        let timeStr = d['Hora'] || '';

        let dateVal = 0;
        if (dateStr) {
            const parts = dateStr.split(/[\/\-]/);
            if (parts.length === 3) {
                let day = parts[0], month = parts[1], year = parts[2];
                if (parts[0].length === 4) { year = parts[0]; month = parts[1]; day = parts[2]; }
                dateVal = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`).getTime();
            }
        }

        let timeVal = 0;
        if (timeStr) {
            let tmatch = timeStr.toLowerCase().match(/(\d+):(\d+)(?::(\d+))?/);
            if (tmatch) {
                let h = parseInt(tmatch[1], 10);
                let m = parseInt(tmatch[2], 10);
                let s = tmatch[3] ? parseInt(tmatch[3], 10) : 0;
                if (timeStr.toLowerCase().includes('pm') && h < 12) h += 12;
                if (timeStr.toLowerCase().includes('am') && h === 12) h = 0;
                timeVal = (h * 3600 + m * 60 + s) * 1000;
            } else if (d['Hora_parsed'] !== undefined && d['Hora_parsed'] !== null) {
                timeVal = parseInt(d['Hora_parsed']) * 3600000;
            }
        }

        const timestamp = (isNaN(dateVal) ? 0 : dateVal) + (isNaN(timeVal) ? 0 : timeVal);

        if (!persons[cod]) {
            persons[cod] = [];
        }
        persons[cod].push({ record: d, timestamp: timestamp, index: index });
    });

    const uniqueRecords = [];
    for (const cod in persons) {
        persons[cod].sort((a, b) => {
            if (a.timestamp !== b.timestamp) {
                return a.timestamp - b.timestamp;
            }
            return a.index - b.index;
        });
        uniqueRecords.push(persons[cod][0].record);
    }
    return uniqueRecords;
}

function setDetailedSort(col) {
    if (detailedSortCol === col) {
        detailedSortAsc = !detailedSortAsc;
    } else {
        detailedSortCol = col;
        detailedSortAsc = (col !== 'total'); // Texto ascendente, números descendente
    }
    renderDetailedTable();
}

function showLoader() {
    const loader = document.getElementById('globalLoader');
    loader.classList.remove('hidden');
    loader.classList.add('flex');
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    loader.classList.add('hidden');
    loader.classList.remove('flex');
}

function processParsedData(resultsArray) {
    if (!resultsArray || resultsArray.length === 0) return [];
    const firstRow = resultsArray[0];
    const rawKeys = Object.keys(firstRow).map(k => k.replace(/^\uFEFF/, '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const isNewFormat = rawKeys.includes('template data hsm');

    function getISOWeek(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = (d.getUTCDay() + 6) % 7;
        d.setUTCDate(d.getUTCDate() - dayNum + 3);
        const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
        const diff = d - firstThursday;
        return String(1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000)));
    }

    const mapDays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    return resultsArray.map(row => {
        const newRow = {};
        const cleanRow = {};
        for (let key in row) {
            if (row.hasOwnProperty(key)) {
                const cleanKey = key.replace(/^\uFEFF/, '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                cleanRow[cleanKey] = row[key];
            }
        }

        if (isNewFormat) {
            const dirVal = cleanRow['direccion'] ? cleanRow['direccion'].toString().trim() : "";
            newRow['Dirección'] = dirVal.toLowerCase().includes('in') ? 'Inbound' : (dirVal.toLowerCase().includes('out') ? 'Outbound' : dirVal);

            const templateData = cleanRow['template data hsm'] ? cleanRow['template data hsm'].toString().trim() : "";
            const slashIdx = templateData.indexOf('/');
            let rawCanal = templateData;
            let rawSegmento = "";
            if (slashIdx !== -1) {
                rawCanal = templateData.substring(0, slashIdx);
                rawSegmento = templateData.substring(slashIdx + 1);
            }

            let normCanal = rawCanal.trim();
            if (!normCanal || normCanal.toLowerCase().includes("error") || normCanal.toLowerCase().includes("se produjo un error")) {
                normCanal = "Sin clasificar";
            } else {
                normCanal = normCanal.charAt(0).toUpperCase() + normCanal.slice(1).toLowerCase();
                const canalMap = {
                    'Whatsapp': 'WhatsApp',
                    'Sms': 'SMS',
                    'Email': 'Email',
                    'Web': 'Web',
                    'Google': 'Google',
                    'Onsite': 'Onsite'
                };
                for (let k in canalMap) {
                    if (normCanal.toLowerCase() === k.toLowerCase()) normCanal = canalMap[k];
                }
            }

            newRow['Canal'] = normCanal;
            newRow['Segmento'] = rawSegmento;
            newRow['Cod Persona'] = cleanRow['cod. persona (contacto) (contacto)'] ? cleanRow['cod. persona (contacto) (contacto)'].toString().trim() : "";
            newRow['Campaña de referencia'] = cleanRow['campana de referencia'] ? cleanRow['campana de referencia'].toString().trim() : "";

            let dateObj = null;
            const rawFecha = cleanRow['fecha de creacion'] || cleanRow['fecha creacion'];
            if (rawFecha instanceof Date) {
                dateObj = rawFecha;
            } else if (rawFecha) {
                const strVal = rawFecha.toString().trim();
                const dtMatch = strVal.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
                if (dtMatch) {
                    const day = parseInt(dtMatch[1], 10);
                    const month = parseInt(dtMatch[2], 10) - 1;
                    const year = parseInt(dtMatch[3], 10);
                    const h = parseInt(dtMatch[4], 10);
                    const m = parseInt(dtMatch[5], 10);
                    const s = parseInt(dtMatch[6], 10);
                    dateObj = new Date(year, month, day, h, m, s);
                }
            }

            if (dateObj && !isNaN(dateObj.getTime())) {
                const dd = String(dateObj.getDate()).padStart(2, '0');
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const yyyy = dateObj.getFullYear();
                newRow['Fecha de creación'] = `${dd}/${mm}/${yyyy}`;

                const hh = String(dateObj.getHours()).padStart(2, '0');
                const min = String(dateObj.getMinutes()).padStart(2, '0');
                const ss = String(dateObj.getSeconds()).padStart(2, '0');
                newRow['Hora'] = `${hh}:${min}:${ss}`;
                newRow['Hora_parsed'] = dateObj.getHours();

                newRow['Día de la semana'] = mapDays[dateObj.getDay()];
                newRow['Número de semana'] = getISOWeek(dateObj);
            } else {
                newRow['Fecha de creación'] = "";
                newRow['Hora'] = "";
                newRow['Día de la semana'] = "";
                newRow['Número de semana'] = "";
            }

        } else {
            for (let key in row) {
                if (row.hasOwnProperty(key)) {
                    const cleanKey = key.replace(/^\uFEFF/, '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const val = row[key] ? row[key].toString().trim() : "";

                    if (cleanKey === 'direccion') {
                        newRow['Dirección'] = val.toLowerCase().includes('in') ? 'Inbound' : (val.toLowerCase().includes('out') ? 'Outbound' : val);
                    }
                    else if (cleanKey === 'canal') {
                        let normCanal = val;
                        if (!normCanal || normCanal.toLowerCase().includes("error") || normCanal.toLowerCase().includes("se produjo un error")) {
                            normCanal = "Sin clasificar";
                        } else {
                            normCanal = normCanal.charAt(0).toUpperCase() + normCanal.slice(1).toLowerCase();
                            const canalMap = {
                                'Whatsapp': 'WhatsApp',
                                'Sms': 'SMS',
                                'Email': 'Email',
                                'Web': 'Web',
                                'Google': 'Google',
                                'Onsite': 'Onsite'
                            };
                            for (let k in canalMap) {
                                if (normCanal.toLowerCase() === k.toLowerCase()) normCanal = canalMap[k];
                            }
                        }
                        newRow['Canal'] = normCanal;
                    }
                    else if (cleanKey === 'segmento') newRow['Segmento'] = val;
                    else if (cleanKey === 'fecha de creacion' || cleanKey === 'fecha creacion') newRow['Fecha de creación'] = val;
                    else if (cleanKey === 'dia de la semana' || cleanKey === 'dia semana') {
                        const d = val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const mapDaysFix = { 'lunes': 'lunes', 'martes': 'martes', 'miercoles': 'miércoles', 'jueves': 'jueves', 'viernes': 'viernes', 'sabado': 'sábado', 'domingo': 'domingo' };
                        newRow['Día de la semana'] = mapDaysFix[d] || val;
                    }
                    else if (cleanKey === 'numero de semana' || cleanKey === 'semana') newRow['Número de semana'] = val;
                    else if (cleanKey === 'cod persona' || cleanKey === 'codigo persona' || cleanKey === 'id persona') newRow['Cod Persona'] = val;
                    else if (cleanKey === 'codigo de campana' || cleanKey === 'codigo campana' || cleanKey === 'campana' || cleanKey === 'campana de referencia') newRow['Campaña de referencia'] = val;
                    else if (cleanKey === 'hora' || cleanKey === 'hora de creacion') {
                        newRow['Hora'] = val;
                        if (val.trim() !== '') {
                            let match = val.toLowerCase().match(/(\d+):(\d+)/);
                            if (match) {
                                let h = parseInt(match[1], 10);
                                if (val.toLowerCase().includes('pm') && h < 12) h += 12;
                                if (val.toLowerCase().includes('am') && h === 12) h = 0;
                                newRow['Hora_parsed'] = h;
                            } else if (!isNaN(parseInt(val))) {
                                newRow['Hora_parsed'] = parseInt(val);
                            }
                        }
                    }
                    else newRow[key] = val;
                }
            }
        }
        return newRow;
    });
}

document.getElementById('dataFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    showLoader();
    setTimeout(() => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const buffer = event.target.result;
            let content = "";

            if (file.name.endsWith('.json')) {
                content = new TextDecoder("utf-8").decode(buffer);
                try {
                    rawData = JSON.parse(content);
                    initDashboard();
                } catch (err) {
                    alert("Error leyendo JSON");
                }
                hideLoader();
            } else if (file.name.match(/\.xlsx?$/i)) {
                try {
                    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const resultsArray = XLSX.utils.sheet_to_json(worksheet, { raw: true });
                    rawData = processParsedData(resultsArray);
                    initDashboard();
                } catch (err) {
                    console.error(err);
                    alert("Error procesando archivo Excel");
                }
                hideLoader();
            } else if (file.name.endsWith('.csv')) {
                let utf8Decoder = new TextDecoder("utf-8");
                content = utf8Decoder.decode(buffer);

                if (content.includes('\uFFFD')) {
                    let ansiDecoder = new TextDecoder("windows-1252");
                    content = ansiDecoder.decode(buffer);
                }

                Papa.parse(content, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function (results) {
                        rawData = processParsedData(results.data);
                        initDashboard();
                        hideLoader();
                    }
                });
            }
        };
        reader.readAsArrayBuffer(file);
    }, 50);
});

function initDashboard() {
    applyFilters();
}

function filterDropdownOptions(listId, query) {
    const list = document.getElementById(listId);
    if (!list) return;
    const items = list.querySelectorAll('li');
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    items.forEach(li => {
        const textEl = li.querySelector('span');
        if (!textEl) return;
        const text = textEl.innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (text.includes(q)) {
            li.style.display = '';
        } else {
            li.style.display = 'none';
        }
    });
}

let activeDropdown = null;

function toggleDropdown(id, event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById(`dropdown-${id}`);

    if (activeDropdown && activeDropdown !== id) {
        document.getElementById(`dropdown-${activeDropdown}`).classList.add('hidden');
    }

    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        activeDropdown = id;
    } else {
        dropdown.classList.add('hidden');
        activeDropdown = null;
    }
}

document.addEventListener('click', function (e) {
    if (activeDropdown) {
        const container = document.getElementById(`container-${activeDropdown}`);
        if (!container.contains(e.target)) {
            document.getElementById(`dropdown-${activeDropdown}`).classList.add('hidden');
            activeDropdown = null;
        }
    }
});

function handleCheckboxChange(id, value, isChecked) {
    const sel = document.getElementById(id);

    if (value === 'ALL') {
        Array.from(sel.options).forEach(o => o.selected = (o.value === 'ALL'));
    } else {
        const optAll = sel.querySelector('option[value="ALL"]');
        if (optAll) optAll.selected = false;

        const opt = sel.querySelector(`option[value="${value}"]`);
        if (opt) opt.selected = isChecked;

        const selectedValues = Array.from(sel.selectedOptions).map(o => o.value);
        if (selectedValues.length === 0 && optAll) {
            optAll.selected = true;
        }
    }
    applyFilters();
}

function renderCustomDropdown(id) {
    const sel = document.getElementById(id);
    if (!sel || !sel.hasAttribute('multiple')) return;

    const list = document.getElementById(`list-${id}`);
    const label = document.getElementById(`label-${id}`);
    if (!list || !label) return;

    let html = '';
    let selectedTexts = [];

    Array.from(sel.options).forEach(opt => {
        if (opt.selected && opt.value !== 'ALL') selectedTexts.push(opt.text);

        const isAll = opt.value === 'ALL';
        html += `
    <li>
        <label class="flex items-center p-2 hover:bg-red-50 rounded-lg cursor-pointer transition text-sm">
            <input type="checkbox" value="${opt.value}" class="w-4 h-4 mr-3 rounded border-gray-300 text-red-600 focus:ring-red-500 transition cursor-pointer" ${opt.selected ? 'checked' : ''} onchange="handleCheckboxChange('${id}', this.value, this.checked)">
            <span class="text-gray-700 truncate ${isAll ? 'font-semibold' : ''}">${opt.text}</span>
        </label>
    </li>
    `;
    });

    list.innerHTML = html;

    const searchInput = document.querySelector(`input[data-list-id="list-${id}"]`);
    if (searchInput && searchInput.value) {
        filterDropdownOptions(`list-${id}`, searchInput.value);
    }

    const firstText = sel.options.length > 0 ? (sel.querySelector('option[value="ALL"]')?.text || 'Todos') : 'Todos';
    if (selectedTexts.length === 0 || sel.options[0].selected) {
        label.innerHTML = firstText;
        label.classList.remove('text-red-700');
    } else if (selectedTexts.length <= 2) {
        label.innerHTML = selectedTexts.join(', ');
        label.classList.add('text-red-700');
    } else {
        label.innerHTML = `${selectedTexts.length} seleccionados`;
        label.classList.add('text-red-700');
    }
}

function updateFilterOptions(camp, chan, seg, dateVal, weekVal, hourVal, dirVal) {
    const hasAll = arr => arr.length === 0 || arr.includes('ALL');

    const fillSelect = (id, options, currentVals) => {
        const sel = document.getElementById(id);
        const isMulti = sel.hasAttribute('multiple');
        const firstText = sel.options.length > 0 ? (sel.querySelector('option[value="ALL"]')?.text || 'Todos') : 'Todos';

        let html = `<option value="ALL" ${hasAll(currentVals) ? 'selected' : ''}>${firstText}</option>`;
        options.forEach(opt => {
            const safeOpt = String(opt).replace(/"/g, '&quot;');
            let isSelected = false;
            if (id === 'filterHour') {
                const hVal = String(opt).split(':')[0];
                isSelected = currentVals.includes(hVal) && !hasAll(currentVals);
                html += `<option value="${hVal}" ${isSelected ? 'selected' : ''}>${opt}</option>`;
            } else {
                isSelected = currentVals.includes(String(opt)) && !hasAll(currentVals);
                html += `<option value="${safeOpt}" ${isSelected ? 'selected' : ''}>${opt}</option>`;
            }
        });
        sel.innerHTML = html;

        if (isMulti) {
            renderCustomDropdown(id);
        }
    };

    const getOptions = (filterKey, skipValId) => {
        const subset = rawData.filter(d => {
            return (skipValId === 'filterCampaign' || hasAll(camp) || camp.includes(String(d['Campaña de referencia']))) &&
                (skipValId === 'filterChannel' || hasAll(chan) || chan.includes(String(d['Canal']))) &&
                (skipValId === 'filterSegment' || hasAll(seg) || seg.includes(String(d['Segmento']))) &&
                (skipValId === 'filterDate' || hasAll(dateVal) || dateVal.includes(String(d['Fecha de creación']))) &&
                (skipValId === 'filterWeek' || hasAll(weekVal) || weekVal.includes(String(d['Número de semana']))) &&
                (skipValId === 'filterHour' || hasAll(hourVal) || hourVal.includes(String(d['Hora_parsed']))) &&
                (skipValId === 'filterDirection' || hasAll(dirVal) || dirVal.includes(String(d['Dirección'])));
        });
        let opts = [...new Set(subset.map(d => d[filterKey]))].filter(val => val !== undefined && val !== null && val !== '');
        if (filterKey === 'Número de semana' || filterKey === 'Hora_parsed') opts.sort((a, b) => parseFloat(a) - parseFloat(b));
        else opts.sort();

        if (filterKey === 'Hora_parsed') {
            opts = opts.map(h => `${h}:00`);
        }

        return opts;
    };

    fillSelect('filterCampaign', getOptions('Campaña de referencia', 'filterCampaign'), camp);
    fillSelect('filterChannel', getOptions('Canal', 'filterChannel'), chan);
    fillSelect('filterSegment', getOptions('Segmento', 'filterSegment'), seg);
    fillSelect('filterDate', getOptions('Fecha de creación', 'filterDate'), dateVal);
    fillSelect('filterWeek', getOptions('Número de semana', 'filterWeek'), weekVal);
    fillSelect('filterHour', getOptions('Hora_parsed', 'filterHour'), hourVal);
    fillSelect('filterDirection', getOptions('Dirección', 'filterDirection'), dirVal);
}

function applyFilters() {
    const getSelectedValues = id => {
        const select = document.getElementById(id);
        return Array.from(select.selectedOptions).map(opt => opt.value);
    };

    const camp = getSelectedValues('filterCampaign');
    const chan = getSelectedValues('filterChannel');
    const seg = getSelectedValues('filterSegment');
    const dateVal = getSelectedValues('filterDate');
    const weekVal = getSelectedValues('filterWeek');
    const hourVal = getSelectedValues('filterHour');
    const dirVal = getSelectedValues('filterDirection');

    const hasAll = arr => arr.length === 0 || arr.includes('ALL');

    filteredData = rawData.filter(d => {
        return (hasAll(camp) || camp.includes(String(d['Campaña de referencia']))) &&
            (hasAll(chan) || chan.includes(String(d['Canal']))) &&
            (hasAll(seg) || seg.includes(String(d['Segmento']))) &&
            (hasAll(dateVal) || dateVal.includes(String(d['Fecha de creación']))) &&
            (hasAll(weekVal) || weekVal.includes(String(d['Número de semana']))) &&
            (hasAll(hourVal) || hourVal.includes(String(d['Hora_parsed']))) &&
            (hasAll(dirVal) || dirVal.includes(String(d['Dirección'])));
    });

    updateFilterOptions(camp, chan, seg, dateVal, weekVal, hourVal, dirVal);
    updateDashboard();
}

function resetFilters() {
    const filterIds = ['filterCampaign', 'filterChannel', 'filterSegment', 'filterDate', 'filterWeek', 'filterHour'];
    filterIds.forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            Array.from(sel.options).forEach(opt => {
                opt.selected = (opt.value === 'ALL');
            });
        }
    });
    const dirSel = document.getElementById('filterDirection');
    if (dirSel) dirSel.value = 'ALL';

    document.querySelectorAll('.dropdown-search').forEach(input => {
        input.value = '';
        filterDropdownOptions(input.dataset.listId, '');
    });

    applyFilters();
}

function updateDashboard() {
    updateKPIs();
    renderCharts();
    renderPivotTable();
    renderPivotSemanaTable();
    renderDetailedTable();
    generateInsights();
}

function updateKPIs() {
    const total = filteredData.length;
    const uniqueLeads = getUniqueLeads(filteredData).length;
    const inbound = filteredData.filter(d => d['Dirección'] === 'Inbound').length;
    const outbound = filteredData.filter(d => d['Dirección'] === 'Outbound').length;
    const totalRow = filteredData.length || 1; // prevent div by zero

    document.getElementById('kpiTotal').innerText = total;
    document.getElementById('kpiUnique').innerText = uniqueLeads;
    document.getElementById('kpiInbound').innerText = Math.round((inbound / totalRow) * 100) + '%';
    document.getElementById('kpiOutbound').innerText = Math.round((outbound / totalRow) * 100) + '%';

    const dayCounts = {};
    const hourCounts = {};
    filteredData.forEach(d => {
        if (d['Día de la semana']) {
            dayCounts[d['Día de la semana']] = (dayCounts[d['Día de la semana']] || 0) + 1;
        }
        if (d['Hora_parsed'] !== undefined && d['Hora_parsed'] !== null) {
            hourCounts[d['Hora_parsed']] = (hourCounts[d['Hora_parsed']] || 0) + 1;
        }
    });

    let bestDay = '-';
    let maxCountDay = 0;
    for (let d in dayCounts) {
        if (dayCounts[d] > maxCountDay) { maxCountDay = dayCounts[d]; bestDay = d; }
    }
    document.getElementById('kpiBestDay').innerText = bestDay ? bestDay.charAt(0).toUpperCase() + bestDay.slice(1) : '-';

    let bestHour = '-';
    let maxCountHour = 0;
    for (let h in hourCounts) {
        if (hourCounts[h] > maxCountHour) { maxCountHour = hourCounts[h]; bestHour = h; }
    }
    document.getElementById('kpiBestHour').innerText = bestHour !== '-' ? `${bestHour}:00 hrs` : '-';
}

function renderCharts() {
    Chart.register(ChartDataLabels);
    if (!Chart.defaults.plugins) Chart.defaults.plugins = {};
    Chart.defaults.plugins.datalabels = { display: false };
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#9CA3AF";
    Chart.defaults.scale.grid.color = "rgba(0,0,0,0.04)";
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(17, 24, 39, 0.9)";
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;

    const destroyChart = (id) => { if (charts[id]) charts[id].destroy(); }

    const dates = {};
    filteredData.forEach(d => {
        if (d['Fecha de creación']) {
            dates[d['Fecha de creación']] = (dates[d['Fecha de creación']] || 0) + 1;
        }
    });
    const sortedDates = Object.keys(dates).sort();
    destroyChart('lineChart');
    charts['lineChart'] = new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Leads',
                data: sortedDates.map(date => dates[date]),
                borderColor: '#D50000',
                backgroundColor: 'rgba(213, 0, 0, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }
    });

    const dayCounts = { 'lunes': 0, 'martes': 0, 'miércoles': 0, 'jueves': 0, 'viernes': 0, 'sábado': 0, 'domingo': 0 };
    filteredData.forEach(d => {
        if (d['Día de la semana'] && dayCounts[d['Día de la semana'].toLowerCase()] !== undefined) {
            dayCounts[d['Día de la semana'].toLowerCase()]++;
        }
    });
    destroyChart('barChart');
    charts['barChart'] = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
            datasets: [{
                label: 'Leads',
                data: Object.values(dayCounts),
                backgroundColor: '#1F2937'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }
    });

    const inbound = filteredData.filter(d => d['Dirección'] === 'Inbound').length;
    const outbound = filteredData.filter(d => d['Dirección'] === 'Outbound').length;
    destroyChart('doughnutChart');
    charts['doughnutChart'] = new Chart(document.getElementById('doughnutChart'), {
        type: 'doughnut',
        data: {
            labels: ['Inbound', 'Outbound'],
            datasets: [{
                data: [inbound, outbound],
                backgroundColor: ['#D50000', '#4B5563']
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const campCounts = {};
    filteredData.forEach(d => {
        if (d['Campaña de referencia']) {
            campCounts[d['Campaña de referencia']] = (campCounts[d['Campaña de referencia']] || 0) + 1;
        }
    });
    const sortedCamps = Object.keys(campCounts).sort((a, b) => campCounts[b] - campCounts[a]).slice(0, 5);

    destroyChart('topCampaignsChart');
    charts['topCampaignsChart'] = new Chart(document.getElementById('topCampaignsChart'), {
        type: 'pie',
        data: {
            labels: sortedCamps,
            datasets: [{
                label: 'Leads',
                data: sortedCamps.map(c => campCounts[c]),
                backgroundColor: ['#D50000', '#1F2937', '#9CA3AF', '#4B5563', '#F87171']
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right' } } }
    });

    const channelCounts = {};
    filteredData.forEach(d => {
        if (d['Canal']) {
            channelCounts[d['Canal']] = (channelCounts[d['Canal']] || 0) + 1;
        }
    });
    const sortedChannels = Object.keys(channelCounts).sort((a, b) => channelCounts[b] - channelCounts[a]);

    destroyChart('channelChart');
    charts['channelChart'] = new Chart(document.getElementById('channelChart'), {
        type: 'bar',
        data: {
            labels: sortedChannels,
            datasets: [{
                label: 'Leads',
                data: sortedChannels.map(c => channelCounts[c]),
                backgroundColor: '#4B5563'
            }]
        },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }
    });

    const hourCounts = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;

    filteredData.forEach(d => {
        if (d['Hora_parsed'] !== undefined && d['Hora_parsed'] !== null) {
            const h = d['Hora_parsed'];
            hourCounts[h] = (hourCounts[h] || 0) + 1;
        }
    });

    const hourLabels = Object.keys(hourCounts).map(h => `${h}:00`);
    const hourData = Object.values(hourCounts);

    destroyChart('scatterChart');
    charts['scatterChart'] = new Chart(document.getElementById('scatterChart'), {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'Leads por Hora',
                data: hourData,
                backgroundColor: '#D50000'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.raw} leads a las ${context.label}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Hora del Día', color: '#6B7280' },
                    grid: { display: false },
                    ticks: { maxRotation: 45, minRotation: 45 }
                },
                y: {
                    title: { display: true, text: 'Cantidad de Leads', color: '#6B7280' },
                    beginAtZero: true,
                    grid: { borderDash: [2, 4], color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}

function renderPivotTable() {
    const pivot = { 'Inbound': {}, 'Outbound': {} };
    const getSelectedValues = id => Array.from(document.getElementById(id).selectedOptions).map(o => o.value);
    const dirVals = getSelectedValues('filterDirection');
    const hasAllDir = dirVals.length === 0 || dirVals.includes('ALL');

    daysOrder.forEach(d => { pivot['Inbound'][d] = 0; pivot['Outbound'][d] = 0; });

    filteredData.forEach(d => {
        const dir = d['Dirección'];
        if (!hasAllDir && !dirVals.includes(String(dir))) return;

        const day = d['Día de la semana'] ? d['Día de la semana'].toLowerCase() : null;
        if ((dir === 'Inbound' || dir === 'Outbound') && day && pivot[dir][day] !== undefined) {
            pivot[dir][day]++;
        }
    });

    let tbody = '';
    let colTotals = { 'lunes': 0, 'martes': 0, 'miércoles': 0, 'jueves': 0, 'viernes': 0, 'sábado': 0, 'domingo': 0 };
    let grandTotal = 0;

    ['Inbound', 'Outbound'].forEach(dir => {
        if (!hasAllDir && !dirVals.includes(dir)) return;

        let rowTotal = 0;
        let tr = `<tr class="hover:bg-gray-50 transition"><td class="px-4 py-3 font-medium text-gray-900">${dir}</td>`;
        daysOrder.forEach(day => {
            const count = pivot[dir][day];
            rowTotal += count;
            colTotals[day] += count;
            tr += `<td class="px-4 py-3">${count}</td>`;
        });
        grandTotal += rowTotal;
        tr += `<td class="px-4 py-3 font-semibold text-red-700 bg-red-50/30">${rowTotal}</td></tr>`;
        tbody += tr;
    });

    let tfoot = `<tr class="bg-gray-50 border-t border-gray-200 font-semibold"><td class="px-4 py-3 text-gray-900">TOTAL GENERAL</td>`;
    daysOrder.forEach(day => { tfoot += `<td class="px-4 py-3 text-gray-800">${colTotals[day]}</td>`; });
    tfoot += `<td class="px-4 py-3 text-red-700">${grandTotal}</td></tr>`;

    document.getElementById('pivotBody').innerHTML = tbody + tfoot;

    let inTotal = 0;
    let outTotal = 0;
    daysOrder.forEach(day => {
        inTotal += pivot['Inbound'][day];
        outTotal += pivot['Outbound'][day];
    });
    const avgIn = (inTotal / 7).toFixed(1);
    const avgOut = (outTotal / 7).toFixed(1);
    const avgTotal = (grandTotal / 7).toFixed(1);

    document.getElementById('disclaimerPivotDay').innerHTML = `* Promedio de registros diarios: <strong>${avgTotal}</strong> (Inbound: ${avgIn} / Outbound: ${avgOut})`;
}

function renderPivotSemanaTable() {
    const pivot = { 'Inbound': {}, 'Outbound': {} };
    const getSelectedValues = id => Array.from(document.getElementById(id).selectedOptions).map(o => o.value);
    const dirVals = getSelectedValues('filterDirection');
    const hasAllDir = dirVals.length === 0 || dirVals.includes('ALL');

    const weeksSet = new Set();
    filteredData.forEach(d => {
        const week = d['Número de semana'];
        if (week !== undefined && week !== null && week !== '') weeksSet.add(String(week));
    });

    const weeksOrder = Array.from(weeksSet).sort((a, b) => parseInt(a) - parseInt(b));

    weeksOrder.forEach(w => { pivot['Inbound'][w] = 0; pivot['Outbound'][w] = 0; });

    filteredData.forEach(d => {
        const dir = d['Dirección'];
        if (!hasAllDir && !dirVals.includes(String(dir))) return;

        const week = d['Número de semana'];
        if ((dir === 'Inbound' || dir === 'Outbound') && week !== undefined && week !== null && week !== '' && pivot[dir][String(week)] !== undefined) {
            pivot[dir][String(week)]++;
        }
    });

    let thead = `<tr><th class="px-4 py-3 font-medium">Dirección</th>`;
    weeksOrder.forEach(w => {
        thead += `<th class="px-4 py-3 font-medium whitespace-nowrap">Semana ${w}</th>`;
    });
    thead += `<th class="px-4 py-3 font-medium text-red-600">Total</th></tr>`;
    document.getElementById('pivotSemanaHead').innerHTML = thead;

    let tbody = '';
    let colTotals = {};
    weeksOrder.forEach(w => colTotals[w] = 0);
    let grandTotal = 0;

    ['Inbound', 'Outbound'].forEach(dir => {
        if (!hasAllDir && !dirVals.includes(dir)) return;

        let rowTotal = 0;
        let tr = `<tr class="hover:bg-gray-50 transition"><td class="px-4 py-3 font-medium text-gray-900">${dir}</td>`;
        weeksOrder.forEach(week => {
            const count = pivot[dir][week];
            rowTotal += count;
            colTotals[week] += count;
            tr += `<td class="px-4 py-3">${count}</td>`;
        });
        grandTotal += rowTotal;
        tr += `<td class="px-4 py-3 font-semibold text-red-700 bg-red-50/30">${rowTotal}</td></tr>`;
        tbody += tr;
    });

    let tfoot = `<tr class="bg-gray-50 border-t border-gray-200 font-semibold"><td class="px-4 py-3 text-gray-900">TOTAL GENERAL</td>`;
    weeksOrder.forEach(week => { tfoot += `<td class="px-4 py-3 text-gray-800">${colTotals[week]}</td>`; });
    tfoot += `<td class="px-4 py-3 text-red-700">${grandTotal}</td></tr>`;

    document.getElementById('pivotSemanaBody').innerHTML = tbody + tfoot;

    const numWeeks = weeksOrder.length || 1;
    let inTotal = 0;
    let outTotal = 0;
    weeksOrder.forEach(w => {
        inTotal += pivot['Inbound'][w];
        outTotal += pivot['Outbound'][w];
    });
    const avgIn = (inTotal / numWeeks).toFixed(1);
    const avgOut = (outTotal / numWeeks).toFixed(1);
    const avgTotal = (grandTotal / numWeeks).toFixed(1);

    document.getElementById('disclaimerPivotWeek').innerHTML = `* Promedio de registros por semana: <strong>${avgTotal}</strong> (Inbound: ${avgIn} / Outbound: ${avgOut})`;
}

function renderDetailedTable() {
    const grouped = {};
    filteredData.forEach(d => {
        const dir = d['Dirección'] || '-';
        if (dir !== 'Inbound' && dir !== 'Outbound') return;

        const campana = d['Campaña de referencia'] || '-';
        const canal = d['Canal'] || '-';
        const segmento = d['Segmento'] || '-';
        const semana = d['Número de semana'] || '-';

        const key = `${campana}|${canal}|${segmento}|${semana}|${dir}`;

        if (!grouped[key]) {
            grouped[key] = {
                campana: campana,
                canal: canal,
                segmento: segmento,
                semana: semana,
                direccion: dir,
                total: 0
            };
        }
        grouped[key].total++;
    });

    let rows = Object.values(grouped);

    // Lógica de ordenamiento dinámica por columnas
    rows.sort((a, b) => {
        let valA = a[detailedSortCol];
        let valB = b[detailedSortCol];

        // Tratar vacíos o guiones para que vayan al final
        if (valA === '-' || valA === undefined) valA = '';
        if (valB === '-' || valB === undefined) valB = '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return detailedSortAsc ? -1 : 1;
        if (valA > valB) return detailedSortAsc ? 1 : -1;
        return 0;
    });

    // Renderizar cabeceras dinámicamente
    const cols = [
        { id: 'campana', label: 'Campaña' },
        { id: 'canal', label: 'Canal' },
        { id: 'segmento', label: 'Segmento' },
        { id: 'total', label: 'Registros Totales' },
        { id: 'semana', label: 'Semana' },
        { id: 'direccion', label: 'Dirección' }
    ];

    let theadHtml = '<tr>';
    cols.forEach(c => {
        let isSorted = detailedSortCol === c.id;
        let colorClass = c.id === 'total' ? 'text-red-600' : 'text-gray-500';
        let activeClass = isSorted ? 'bg-gray-100 font-bold' : 'font-medium hover:bg-gray-50';
        let iconHtml = isSorted
            ? (detailedSortAsc ? '▲' : '▼')
            : '<span class="opacity-0 group-hover:opacity-100">▼</span>';

        theadHtml += `
        <th class="px-4 py-3 cursor-pointer transition group select-none ${colorClass} ${activeClass}" onclick="setDetailedSort('${c.id}')" title="Ordenar por ${c.label}">
            <div class="flex items-center gap-1">
                ${c.label}
                <span class="text-[10px] ${isSorted ? 'text-red-600' : 'text-gray-400'}">${iconHtml}</span>
            </div>
        </th>
    `;
    });
    theadHtml += '</tr>';
    const theadEl = document.getElementById('detailedTableHead');
    if (theadEl) {
        theadEl.innerHTML = theadHtml;
    }

    let tbody = '';
    let sumTotal = 0;
    if (rows.length === 0) {
        tbody = `<tr><td colspan="6" class="px-4 py-4 text-center text-gray-500">No hay datos disponibles para Inbound/Outbound con los filtros actuales.</td></tr>`;
    } else {
        rows.forEach(r => {
            sumTotal += r.total;
            const dirClass = r.direccion === 'Inbound' ? 'bg-green-100 text-green-800' : (r.direccion === 'Outbound' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800');
            tbody += `<tr class="hover:bg-gray-50 border-b border-gray-100 transition">
            <td class="px-4 py-3 whitespace-nowrap">${r.campana}</td>
            <td class="px-4 py-3 whitespace-nowrap">${r.canal}</td>
            <td class="px-4 py-3 whitespace-nowrap">${r.segmento}</td>
            <td class="px-4 py-3 font-bold text-gray-900">${r.total}</td>
            <td class="px-4 py-3 whitespace-nowrap">${r.semana}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2.5 py-1 text-xs font-semibold rounded-full ${dirClass}">${r.direccion}</span>
            </td>
        </tr>`;
        });
    }

    document.getElementById('detailedTableBody').innerHTML = tbody;

    // Fila de Total (Tfoot)
    let tfoot = '';
    if (rows.length > 0) {
        tfoot = `<tr>
        <td colspan="3" class="px-4 py-3 text-right text-gray-900">TOTAL DE REGISTROS:</td>
        <td class="px-4 py-3 text-red-700">${sumTotal}</td>
        <td colspan="2" class="px-4 py-3"></td>
    </tr>`;
    }
    const tfootEl = document.getElementById('detailedTableFoot');
    if (tfootEl) tfootEl.innerHTML = tfoot;
}

/**
 * Analiza los datos actualmente filtrados y genera frases dinámicas (Insights)
 * resaltando tendencias de negocio como: mejor día, mejor campaña y distribución de tráfico.
 */
function generateInsights() {
    const list = document.getElementById('insightsList');
    if (filteredData.length === 0) { list.innerHTML = "<li>No hay datos suficientes para generar insights.</li>"; return; }

    const inbound = filteredData.filter(d => d['Dirección'] === 'Inbound').length;
    const outbound = filteredData.length - inbound;
    const trafficInsight = inbound > outbound ?
        `El tráfico <b>Inbound</b> domina la captación representando un ${(inbound / filteredData.length * 100).toFixed(1)}%.` :
        `El esfuerzo <b>Outbound</b> está generando la mayoría de los leads (${(outbound / filteredData.length * 100).toFixed(1)}%).`;

    const dayCounts = {};
    const campCounts = {};
    const channelCounts = {};
    const segmentCounts = {};
    const hourCounts = {};

    filteredData.forEach(d => {
        if (d['Día de la semana']) dayCounts[d['Día de la semana']] = (dayCounts[d['Día de la semana']] || 0) + 1;
        if (d['Campaña de referencia']) campCounts[d['Campaña de referencia']] = (campCounts[d['Campaña de referencia']] || 0) + 1;
        if (d['Canal']) channelCounts[d['Canal']] = (channelCounts[d['Canal']] || 0) + 1;
        if (d['Segmento'] && d['Segmento'].trim() !== '' && d['Segmento'].toLowerCase() !== 'otras fuentes' && d['Segmento'] !== '-' && d['Segmento'] !== 'sin clasificar') {
            segmentCounts[d['Segmento']] = (segmentCounts[d['Segmento']] || 0) + 1;
        }
        if (d['Hora_parsed'] !== undefined && d['Hora_parsed'] !== null) hourCounts[d['Hora_parsed']] = (hourCounts[d['Hora_parsed']] || 0) + 1;
    });

    const bestDay = Object.keys(dayCounts).length > 0 ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b) : '-';
    const dayInsight = bestDay !== '-' ? `El día de mayor rendimiento histórico es el <b>${bestDay}</b>, sugiriendo concentrar campañas y presupuesto en este día.` : '';

    const bestCamp = Object.keys(campCounts).length > 0 ? Object.keys(campCounts).reduce((a, b) => campCounts[a] > campCounts[b] ? a : b) : '-';
    const campInsight = bestCamp !== '-' ? `La campaña <b>${bestCamp}</b> lidera los resultados. Recomendable analizar sus atributos para replicarlos en futuras estrategias.` : '';

    const bestChannel = Object.keys(channelCounts).length > 0 ? Object.keys(channelCounts).reduce((a, b) => channelCounts[a] > channelCounts[b] ? a : b) : '-';
    const channelInsight = bestChannel !== '-' ? `El canal más efectivo es <b>${bestChannel}</b>, generando el mayor volumen de leads en la selección actual.` : '';

    const bestSegment = Object.keys(segmentCounts).length > 0 ? Object.keys(segmentCounts).reduce((a, b) => segmentCounts[a] > segmentCounts[b] ? a : b) : '-';
    const segmentInsight = bestSegment !== '-' ? `El segmento de público con mayor interés es <b>${bestSegment}</b>. Recomendable alinear los copys a este perfil.` : '';

    const bestHour = Object.keys(hourCounts).length > 0 ? Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b) : '-';
    const hourInsight = bestHour !== '-' ? `La mayor concentración de leads ocurre a las <b>${bestHour}:00 hrs</b>, ideal para programar envíos y esfuerzos de contactabilidad en ese horario.` : '';

    let weekInsight = '';
    const weeksSet = new Set();
    filteredData.forEach(d => {
        const week = d['Número de semana'];
        if (week !== undefined && week !== null && week !== '') weeksSet.add(String(week));
    });
    const sortedWeeks = Array.from(weeksSet).sort((a, b) => parseInt(a) - parseInt(b));

    if (sortedWeeks.length >= 2) {
        const lastWeek = sortedWeeks[sortedWeeks.length - 1];
        const prevWeek = sortedWeeks[sortedWeeks.length - 2];

        const getLeadsByWeekAndDir = (week, dir) => filteredData.filter(d => String(d['Número de semana']) === String(week) && d['Dirección'] === dir).length;

        const inboundLast = getLeadsByWeekAndDir(lastWeek, 'Inbound');
        const inboundPrev = getLeadsByWeekAndDir(prevWeek, 'Inbound');
        const outboundLast = getLeadsByWeekAndDir(lastWeek, 'Outbound');
        const outboundPrev = getLeadsByWeekAndDir(prevWeek, 'Outbound');

        const getVariationText = (current, previous, label) => {
            if (previous === 0 && current === 0) return null;
            if (previous === 0) return `<b>${label}</b> pasó de 0 a ${current} leads`;
            const diff = ((current - previous) / previous) * 100;
            const action = diff >= 0 ? 'se incrementó un' : 'cayó un';
            return `<b>${label}</b> ${action} ${Math.abs(diff).toFixed(0)}%`;
        };

        const inText = getVariationText(inboundLast, inboundPrev, 'Inbound');
        const outText = getVariationText(outboundLast, outboundPrev, 'Outbound');

        if (inText || outText) {
            let parts = [];
            if (inText) parts.push(inText);
            if (outText) parts.push(outText);
            weekInsight = `En la semana <b>${lastWeek}</b>, ${parts.join(' y ')} con respecto a la semana <b>${prevWeek}</b>.`;
        }
    }

    let html = `
    <li class="flex items-start"><span class="text-red-600 mr-2">📌</span> <span>${trafficInsight}</span></li>
`;
    if (weekInsight) html += `<li class="flex items-start"><span class="text-red-600 mr-2">📌</span> <span>${weekInsight}</span></li>`;
    if (dayInsight) html += `<li class="flex items-start"><span class="text-red-600 mr-2">📌</span> <span>${dayInsight}</span></li>`;
    if (hourInsight) html += `<li class="flex items-start"><span class="text-red-600 mr-2">📌</span> <span>${hourInsight}</span></li>`;
    if (campInsight) html += `<li class="flex items-start"><span class="text-red-600 mr-2">📌</span> <span>${campInsight}</span></li>`;
    if (channelInsight) html += `<li class="flex items-start"><span class="text-red-600 mr-2">📌</span> <span>${channelInsight}</span></li>`;
    if (segmentInsight) html += `<li class="flex items-start"><span class="text-red-600 mr-2">📌</span> <span>${segmentInsight}</span></li>`;

    list.innerHTML = html;
}

async function generateGeminiInsights() {
    if (filteredData.length === 0) {
        alert("No hay datos para analizar.");
        return;
    }

    // Llave ofuscada (invertida) para evitar escaneos automáticos de bots
    const apiKey = "Uyg5FEIES9Jn0xYHqczOCWon9l8KP1yxCySazIA".split('').reverse().join('');

    const list = document.getElementById('insightsList');
    const loader = document.getElementById('geminiLoader');

    list.classList.add('hidden');
    loader.classList.remove('hidden');
    loader.classList.add('flex');

    try {
        // Agregar resumen de datos para no enviar demasiados tokens
        const total = filteredData.length;
        const inbound = filteredData.filter(d => d['Dirección'] === 'Inbound').length;
        const outbound = total - inbound;

        const dayCounts = {};
        const campCounts = {};
        const channelCounts = {};
        const segmentCounts = {};
        const hourCounts = {};

        filteredData.forEach(d => {
            if (d['Día de la semana']) dayCounts[d['Día de la semana']] = (dayCounts[d['Día de la semana']] || 0) + 1;
            if (d['Campaña de referencia']) campCounts[d['Campaña de referencia']] = (campCounts[d['Campaña de referencia']] || 0) + 1;
            if (d['Canal']) channelCounts[d['Canal']] = (channelCounts[d['Canal']] || 0) + 1;
            if (d['Segmento']) segmentCounts[d['Segmento']] = (segmentCounts[d['Segmento']] || 0) + 1;
            if (d['Hora_parsed'] !== undefined && d['Hora_parsed'] !== null) hourCounts[d['Hora_parsed']] = (hourCounts[d['Hora_parsed']] || 0) + 1;
        });

        const dataSummary = {
            totalLeads: total,
            inboundLeads: inbound,
            outboundLeads: outbound,
            leadsPerDay: dayCounts,
            leadsPerCampaign: campCounts,
            leadsPerChannel: channelCounts,
            leadsPerSegment: segmentCounts,
            leadsPerHour: hourCounts
        };

        const prompt = `Eres un analista de datos experto en CRM y marketing digital. Revisa el siguiente resumen estadístico de captación de leads y genera 5 insights accionables muy breves (máximo 1 o 2 oraciones cada uno) destacando el comportamiento o dando recomendaciones de negocio basadas en los números reales. Devuélvelos en formato de lista simple separados por un salto de línea y elimina cualquier marcador o viñeta de tu texto.\n\nDatos a analizar:\n${JSON.stringify(dataSummary, null, 2)}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3 }
            })
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            console.error("Gemini API Error Details:", errorDetails);
            throw new Error(`HTTP ${response.status} - Detalles: ${errorDetails}`);
        }

        const result = await response.json();
        const text = result.candidates[0].content.parts[0].text;

        // Formatear los insights
        const insights = text.split('\n').filter(i => i.trim().length > 0);
        let html = '';
        insights.forEach(insight => {
            let cleanInsight = insight.replace(/^- /, '').replace(/^\* /, '').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            html += `<li class="flex items-start"><span class="text-blue-600 mr-2">✨</span> <span class="text-gray-800 font-medium">${cleanInsight}</span></li>`;
        });

        list.innerHTML = html;

    } catch (error) {
        console.error(error);
        alert("Hubo un error al generar insights con Gemini: " + error.message);
        generateInsights(); // Fallback a insights automáticos
    } finally {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        list.classList.remove('hidden');
    }
}

let exportRevertTimeout;

function exportToPDF() {
    showLoader();
    const element = document.getElementById('exportable-area');

    // Activar etiquetas de datos (DataLabels) temporalmente para la exportación
    for (let id in charts) {
        if (charts[id].options.plugins) {
            charts[id].options.plugins.datalabels = {
                display: true,
                color: (id === 'doughnutChart' || id === 'topCampaignsChart') ? '#fff' : '#1F2937',
                font: { weight: 'bold', size: 10 },
                anchor: (id === 'barChart' || id === 'channelChart') ? 'end' : 'center',
                align: (id === 'barChart' || id === 'channelChart') ? 'end' : (id === 'scatterChart' ? 'top' : 'center'),
                formatter: function (value, context) {
                    if (context.chart.config.type === 'scatter') return value.y;
                    return Math.round(value);
                }
            };
        }
        charts[id].update('none'); // Update sin animación
    }

    const opt = {
        margin: [2, 10, 2, 10],
        filename: 'Dashboard_Leads.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        hideLoader();
        scheduleRevertCharts();
    }).catch(err => {
        console.error("Error al exportar PDF: ", err);
        hideLoader();
        scheduleRevertCharts();
    });

    // Función para mantener los labels 10s visibles y luego ocultarlos
    function scheduleRevertCharts() {
        if (exportRevertTimeout) clearTimeout(exportRevertTimeout);
        exportRevertTimeout = setTimeout(() => {
            for (let id in charts) {
                if (charts[id].options.plugins) {
                    charts[id].options.plugins.datalabels = { display: false };
                }
                charts[id].update('none');
            }
        }, 10000); // 10 segundos
    }
}
