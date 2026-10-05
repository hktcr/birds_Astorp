/** Public, credential-free Artportalen map for the Nötkråka article figure. */
(function (root) {
    'use strict';
    const TAXON_ID = 100090;
    const MAX_FEATURES = 1000;
    const COLORS = { current: '#dc2626', 'last-year': '#f97316', decade: '#eab308', older: '#9ca3af' };
    const FILTER = "dyntaxaTaxonId=100090 AND municipality='Åstorp' AND dataProviderId=1 AND isPresentObservation=TRUE";
    const stockholmDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' });

    function dateInSweden(value) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        if (!value) return null;
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : stockholmDay.format(d);
    }
    function periodFor(date, today) {
        const year = Number(date.slice(0, 4));
        const current = Number(today.slice(0, 4));
        if (year === current) return 'current';
        if (year === current - 1) return 'last-year';
        return year >= current - 10 ? 'decade' : 'older';
    }
    function sourceURL(value) {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && /^(www\.)?artportalen\.se$/.test(url.hostname) && /^\/sighting\/\d+\/?$/i.test(url.pathname) ? url.href : null;
        } catch (_) { return null; }
    }
    function buildURL() {
        const params = new URLSearchParams({ service: 'wfs', version: '1.0.0', request: 'GetFeature', typeName: 'SOS:SpeciesObservations', outputFormat: 'application/json', maxFeatures: String(MAX_FEATURES), srsName: 'EPSG:4326', CQL_Filter: FILTER });
        return 'https://sosgeo.artdata.slu.se/geoserver/SOS/ows?' + params.toString();
    }
    function normalize(data, today = dateInSweden(new Date())) {
        if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Ogiltigt källsvar');
        const total = data.numberMatched ?? data.totalFeatures;
        if (total !== undefined && total !== 'unknown' && Number(total) > data.features.length) throw new Error('Ofullständigt källsvar');
        if ((total === undefined || total === 'unknown') && data.features.length >= MAX_FEATURES) throw new Error('Möjligen avklippt källsvar');
        const seen = new Set();
        const records = [];
        for (const feature of data.features) {
            const p = feature.properties || {};
            if (Number(p.dyntaxaTaxonId) !== TAXON_ID || Number(p.dataProviderId) !== 1 || p.municipality !== 'Åstorp' || p.isPresentObservation !== true) continue;
            const id = String(p.occurrenceId || feature.id || '');
            const date = dateInSweden(p.startDate);
            const lat = Number(p.decimalLatitude);
            const lng = Number(p.decimalLongitude);
            if (!id || seen.has(id) || !date || date > today || p.decimalLatitude == null || p.decimalLongitude == null || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
            seen.add(id);
            const quantity = p.organismQuantity == null ? null : Number(p.organismQuantity);
            const uncertainty = p.coordinateUncertaintyInMeters == null ? null : Number(p.coordinateUncertaintyInMeters);
            records.push({ id, date, lat, lng, locality: String(p.locality || 'Lokal utan namn'), quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null, uncertainty: Number.isFinite(uncertainty) && uncertainty > 0 ? uncertainty : null, url: sourceURL(p.url), uncertain: p.isUncertainIdentification === true });
        }
        if (data.features.length && !records.length) throw new Error('Inga användbara koordinatsatta nötkråkerapporter i svaret');
        return records.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    }
    function filterRecords(records, period, today) {
        const cutoff = new Date(today + 'T12:00:00Z');
        cutoff.setUTCDate(cutoff.getUTCDate() - 29);
        const since = cutoff.toISOString().slice(0, 10);
        return records.filter(r => period === 'all' || (period === 'recent' ? r.date >= since && r.date <= today : periodFor(r.date, today) === period));
    }
    function groupRecords(records) {
        const groups = new Map();
        for (const r of records) {
            const key = r.lat.toFixed(5) + ',' + r.lng.toFixed(5) + ':' + r.locality.trim().toLowerCase();
            if (!groups.has(key)) groups.set(key, { lat: r.lat, lng: r.lng, locality: r.locality, date: r.date, records: [] });
            const group = groups.get(key);
            group.records.push(r);
            if (r.date > group.date) group.date = r.date;
        }
        return [...groups.values()];
    }
    function markerOrder(groups) {
        // Leaflet draws later circles on top. Keep recent reports visible where
        // distinct nearby localities overlap, without changing the report list.
        return [...groups].sort((a, b) => a.date.localeCompare(b.date));
    }
    async function fetchJSON(url, fetcher, timeout = 18000, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetcher(url, { ...options, signal: controller.signal });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return await response.json();
        } finally { clearTimeout(timer); }
    }
    async function loadData(fallbackURL, fetcher = root.fetch.bind(root), today = dateInSweden(new Date())) {
        try {
            const data = await fetchJSON(buildURL(), fetcher, 18000, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
            return { records: normalize(data, today), fetchedAt: new Date().toISOString(), reserve: false };
        } catch (liveError) {
            const data = await fetchJSON(fallbackURL, fetcher, 8000);
            if (!data.fetchedAt || Number.isNaN(new Date(data.fetchedAt).getTime())) throw new Error('Reservdata saknar hämtningstid');
            return { records: normalize(data, today), fetchedAt: data.fetchedAt, reserve: true };
        }
    }
    function formatDay(day) {
        return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(day + 'T12:00:00Z'));
    }
    function formatStamp(stamp) {
        return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' }).format(new Date(stamp));
    }
    function observationItem(record) {
        const li = document.createElement('li');
        const parts = [formatDay(record.date), record.quantity == null ? 'antal ej angivet' : record.quantity + ' ex'];
        if (record.uncertain) parts.push('osäker artbestämning');
        if (record.uncertainty != null) parts.push('lägesosäkerhet ±' + record.uncertainty + ' m');
        li.append(document.createTextNode(parts.join(' · ') + ' '));
        if (record.url) {
            const a = document.createElement('a');
            a.href = record.url;
            a.textContent = 'Artportalen';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            li.append(a);
        }
        return li;
    }
    function initFigure(figure) {
        if (figure.dataset.initialized) return;
        figure.dataset.initialized = 'true';
        let result = null;
        let activePeriod = 'all';
        let map = null;
        let markers = null;
        const canvas = figure.querySelector('.nkm-canvas');
        const status = figure.querySelector('.nkm-status');
        const count = figure.querySelector('.nkm-count');
        const list = figure.querySelector('.nkm-list');
        const refresh = figure.querySelector('.nkm-refresh');

        if (root.L) {
            const topo = root.L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: 'Kartdata: © OpenStreetMap, SRTM | Kartografi: © OpenTopoMap (CC-BY-SA)' });
            const osm = root.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' });
            const satellite = root.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '© Esri, Maxar' });
            map = root.L.map(canvas, { center: [56.14, 13.05], zoom: 12, scrollWheelZoom: false, layers: [topo] });
            root.L.control.layers({ 'Terrängkarta': topo, 'Vägkarta': osm, Satellit: satellite }).addTo(map);
            markers = root.L.layerGroup().addTo(map);
            fetchJSON(figure.dataset.boundaryUrl, root.fetch.bind(root)).then(geo => {
                const geometry = geo.features[0].geometry;
                if (geometry.type !== 'Polygon') throw new Error('Oväntad kommungräns');
                const hole = geometry.coordinates[0].map(c => [c[1], c[0]]);
                root.L.polygon([[[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]], hole], { color: 'transparent', fillColor: '#4b5563', fillOpacity: .4, interactive: false, noClip: true }).addTo(map);
                root.L.polygon(hole, { color: '#b91c1c', weight: 3, fill: false, opacity: .8, interactive: false }).addTo(map);
                map.fitBounds(root.L.latLngBounds(hole), { padding: [10, 10] });
                if (markers) markers.eachLayer(marker => marker.bringToFront());
            }).catch(() => { canvas.setAttribute('aria-label', 'Nötkråkekarta. Kommungränsen kunde inte laddas.'); });
        } else {
            canvas.hidden = true;
            figure.querySelector('.nkm-details').open = true;
        }
        function render() {
            if (!result) return;
            const today = dateInSweden(new Date());
            const selected = filterRecords(result.records, activePeriod, today);
            const groups = groupRecords(selected);
            if (markers) markers.clearLayers();
            list.replaceChildren();
            count.textContent = selected.length ? `${selected.length} rapporter på ${groups.length} fyndplatser i urvalet. Senaste observation: ${formatDay(selected[0].date)}.` : 'Inga offentliga rapporter i det valda urvalet.';
            for (const group of markerOrder(groups)) {
                const color = COLORS[periodFor(group.date, today)];
                if (markers) {
                    const popup = document.createElement('div');
                    const title = document.createElement('strong');
                    title.textContent = group.locality;
                    popup.append(title);
                    const reports = document.createElement('ul');
                    reports.className = 'nkm-popup-list';
                    group.records.forEach(r => reports.append(observationItem(r)));
                    popup.append(reports);
                    root.L.circleMarker([group.lat, group.lng], { radius: 6 + Math.min(group.records.length, 15), fillColor: color, color, weight: 2, opacity: 1, fillOpacity: .4 }).bindPopup(popup, { maxWidth: 290 }).addTo(markers);
                }
            }
            for (const record of selected) {
                const li = observationItem(record);
                const name = document.createElement('strong');
                name.textContent = record.locality + ': ';
                li.prepend(name);
                list.append(li);
            }
        }
        async function refreshData() {
            refresh.disabled = true;
            status.dataset.state = 'loading';
            status.textContent = 'Hämtar offentliga rapporter från Artportalen…';
            try {
                result = await loadData(figure.dataset.fallbackUrl);
                status.dataset.state = result.reserve ? 'reserve' : 'live';
                status.textContent = result.reserve
                    ? `Reservdata: den aktuella hämtningen misslyckades. Visar ett sparat uttag från ${formatStamp(result.fetchedAt)} (svensk tid).`
                    : `Hämtat från Artportalen/SOS ${formatStamp(result.fetchedAt)} (svensk tid).`;
                if (!map) status.textContent += ' Kartan kunde inte visas; rapporterna finns i listan nedan.';
                render();
            } catch (_) {
                status.dataset.state = 'error';
                status.textContent = result ? 'Uppdateringen misslyckades. Tidigare inlästa data visas fortfarande; hämtade ' + formatStamp(result.fetchedAt) + ' (svensk tid).' : 'Rapporterna kunde inte hämtas. Försök igen eller besök Artportalen via länken nedan.';
            } finally { refresh.disabled = false; }
        }
        figure.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
            activePeriod = button.dataset.period;
            figure.querySelectorAll('[data-period]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
            render();
        }));
        refresh.addEventListener('click', refreshData);
        refreshData();
    }
    const api = { TAXON_ID, COLORS, buildURL, dateInSweden, periodFor, sourceURL, normalize, filterRecords, groupRecords, markerOrder, loadData };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof document !== 'undefined') {
        const init = () => document.querySelectorAll('[data-notkraka-map]').forEach(initFigure);
        if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', init, { once: true });
        else init();
    }
})(typeof window !== 'undefined' ? window : globalThis);
