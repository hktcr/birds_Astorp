/**
 * Observation Explorer — Karta + lista med dubbelriktad synkronisering
 * Ersätter den enkla kart-lightboxen med en fullskärms <dialog>
 * 
 * Inspirerad av orkidésidans interaktiva utforskningsmönster,
 * anpassad för fågeldata från astorp_historic_locations.json
 */

(function () {
    'use strict';

    let explorerMap = null;
    let explorerInitialized = false;
    let explorerMarkers = [];
    let explorerBoundaryLayer = null;
    let activeTimePeriod = 'all';
    let currentSpecies = '';
    let currentData = [];

    // ─── COLOR CODING ───
    function getTimePeriod(dateStr) {
        const year = parseInt(dateStr.substring(0, 4), 10);
        const currentYear = new Date().getFullYear();
        if (year >= currentYear) return 'current';
        if (year === currentYear - 1) return 'last-year';
        if (year >= currentYear - 10) return 'decade';
        return 'older';
    }

    function getPeriodColor(period) {
        switch (period) {
            case 'current': return '#dc2626';
            case 'last-year': return '#f97316';
            case 'decade': return '#eab308';
            default: return '#9ca3af';
        }
    }

    function getPeriodLabel(period) {
        switch (period) {
            case 'current': return 'I år';
            case 'last-year': return 'Förra året';
            case 'decade': return '2–10 år sedan';
            default: return 'Äldre';
        }
    }

    // ─── FORMAT DATE ───
    function formatDate(dateStr) {
        if (!dateStr || dateStr.length < 10) return dateStr || 'okänt';
        const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun',
            'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
        const parts = dateStr.split('-');
        const y = parts[0];
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return `${d} ${months[m]} ${y}`;
    }

    // ─── FILTER ───
    function getFilteredData() {
        if (activeTimePeriod === 'all') return currentData;
        return currentData.filter(obs => obs._period === activeTimePeriod);
    }

    // ─── RENDER ───
    function renderExplorer() {
        const filtered = getFilteredData();

        // Update stats
        const statsEl = document.getElementById('obs-explorer-stats');
        if (statsEl) {
            statsEl.textContent = `Visar ${filtered.length} av ${currentData.length} fyndplatser`;
        }

        // Clear existing markers
        explorerMarkers.forEach(m => explorerMap.removeLayer(m));
        explorerMarkers = [];

        // Clear list
        const listEl = document.getElementById('obs-explorer-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="obs-explorer-empty">Inga fyndplatser matchar filtret.</div>';
            return;
        }

        // Render each observation
        filtered.forEach((obs, idx) => {
            const color = getPeriodColor(obs._period);

            // Map marker
            const marker = L.circleMarker([obs.lat, obs.lng], {
                radius: 6 + Math.min(obs.count, 15),
                fillColor: color,
                color: color,
                weight: 2,
                opacity: 1,
                fillOpacity: 0.4
            });

            const popupHTML = `
                <div class="obs-explorer-popup">
                    <strong>${obs.locality}</strong><br>
                    Totalt ${obs.count} fynd.<br>
                    Senast: ${formatDate(obs.date)}
                </div>
            `;
            marker.bindPopup(popupHTML);
            marker.addTo(explorerMap);
            explorerMarkers.push(marker);

            // List card
            const card = document.createElement('div');
            card.className = 'obs-explorer-card';
            card.dataset.idx = idx;
            card.style.setProperty('--period-color', color);

            card.innerHTML = `
                <div class="obs-card-header">
                    <span class="obs-card-locality">${obs.locality}</span>
                    <span class="obs-card-count">${obs.count} fynd</span>
                </div>
                <div class="obs-card-meta">
                    <span class="obs-card-date">📅 ${formatDate(obs.date)}</span>
                </div>
            `;
            listEl.appendChild(card);

            // Synch: list → map
            card.addEventListener('click', () => {
                highlightCard(idx);
                explorerMap.setView([obs.lat, obs.lng], 14);
                marker.openPopup();
            });

            // Synch: map → list
            marker.on('click', () => {
                highlightCard(idx, true);
            });
        });

        // Fit bounds to markers if any
        if (explorerMarkers.length > 0 && explorerBoundaryLayer) {
            explorerMap.fitBounds(explorerBoundaryLayer.getBounds());
        }
    }

    function highlightCard(idx, shouldScroll = false) {
        document.querySelectorAll('.obs-explorer-card').forEach(c => {
            c.classList.remove('active', 'pulse-highlight');
        });

        const cards = document.querySelectorAll('.obs-explorer-card');
        const card = cards[idx];
        if (card) {
            card.classList.add('active', 'pulse-highlight');
            setTimeout(() => card.classList.remove('pulse-highlight'), 2400);
            if (shouldScroll) {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    // ─── INIT MAP ───
    function initExplorerMap() {
        if (explorerInitialized) return;

        const container = document.getElementById('obs-explorer-map');
        if (!container) return;

        // Base layers
        const topoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: 'Kartdata: © OpenTopoMap'
        });

        const osmMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        });

        const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '© Esri, Maxar'
        });

        explorerMap = L.map('obs-explorer-map', {
            center: [56.14, 13.05],
            zoom: 12,
            scrollWheelZoom: true,
            layers: [topoMap]
        });

        L.control.layers({
            'Terrängkarta': topoMap,
            'Vägkarta': osmMap,
            'Satellit': satelliteMap
        }, null, { position: 'topright' }).addTo(explorerMap);

        // Municipality boundary
        const baseURL = window.siteBaseURL || '/';
        fetch(baseURL + 'data/astorp-kommun.geojson')
            .then(res => res.json())
            .then(geo => {
                const coords = geo.features[0].geometry.coordinates[0];
                const hole = coords.map(c => [c[1], c[0]]);
                const worldBounds = [[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]];

                L.polygon([worldBounds, hole], {
                    color: 'transparent',
                    fillColor: '#4b5563',
                    fillOpacity: 0.4,
                    interactive: false,
                    noClip: true
                }).addTo(explorerMap);

                explorerBoundaryLayer = L.polygon(hole, {
                    color: '#b91c1c',
                    weight: 3,
                    fill: false,
                    opacity: 0.8
                }).addTo(explorerMap);

                explorerMap.fitBounds(L.latLngBounds(hole));
            })
            .catch(err => console.error('Could not load municipality bounds', err));

        explorerInitialized = true;
    }

    // ─── OPEN EXPLORER ───
    window.openObsExplorer = function (speciesName) {
        currentSpecies = speciesName;
        activeTimePeriod = 'all';

        // Update title
        const titleEl = document.getElementById('obs-explorer-title');
        if (titleEl) titleEl.textContent = 'Historiska fyndplatser: ' + speciesName;

        // Reset filter pills
        document.querySelectorAll('.obs-period-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.period === 'all');
        });

        // Show dialog
        const dialog = document.getElementById('obs-explorer-dialog');
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
        document.body.classList.add('lightbox-open');

        // Show loading
        const loadingEl = document.getElementById('obs-explorer-loading');
        if (loadingEl) {
            loadingEl.style.display = 'block';
            loadingEl.textContent = 'Laddar fyndplatser...';
        }

        // Init map if needed
        initExplorerMap();

        // Fix Leaflet sizing in dialog
        setTimeout(() => explorerMap && explorerMap.invalidateSize(), 50);
        setTimeout(() => explorerMap && explorerMap.invalidateSize(), 300);

        // Load data
        const baseURL = window.siteBaseURL || '/';
        fetch(baseURL + 'data/astorp_historic_locations.json')
            .then(res => res.json())
            .then(data => {
                if (loadingEl) loadingEl.style.display = 'none';

                const locs = data[speciesName] || [];

                if (locs.length === 0) {
                    currentData = [];
                    if (loadingEl) {
                        loadingEl.style.display = 'block';
                        loadingEl.textContent = 'Inga historiska fyndplatser hittades för arten i Åstorp.';
                    }
                    const listEl = document.getElementById('obs-explorer-list');
                    if (listEl) listEl.innerHTML = '<div class="obs-explorer-empty">Inga historiska fyndplatser hittades.</div>';
                    const statsEl = document.getElementById('obs-explorer-stats');
                    if (statsEl) statsEl.textContent = '0 fyndplatser';
                    return;
                }

                // Enrich with time period
                currentData = locs.map(loc => ({
                    ...loc,
                    _period: getTimePeriod(loc.date)
                }));

                renderExplorer();
            })
            .catch(err => {
                if (loadingEl) {
                    loadingEl.style.display = 'block';
                    loadingEl.textContent = 'Kunde inte ladda fyndplatser.';
                }
                console.error('Could not load locations', err);
            });
    };

    // ─── CLOSE ───
    window.closeObsExplorer = function () {
        const dialog = document.getElementById('obs-explorer-dialog');
        if (dialog && dialog.open) dialog.close();
        document.body.classList.remove('lightbox-open');
    };

    // ─── BACKWARD COMPATIBILITY ───
    window.openMapLightbox = window.openObsExplorer;
    window.closeMapLightbox = window.closeObsExplorer;

    // ─── INIT EVENT LISTENERS ───
    document.addEventListener('DOMContentLoaded', () => {
        // Period pills
        document.querySelectorAll('.obs-period-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.obs-period-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                activeTimePeriod = pill.dataset.period;
                renderExplorer();
            });
        });

        // Close on backdrop click
        const dialog = document.getElementById('obs-explorer-dialog');
        if (dialog) {
            dialog.addEventListener('click', function (e) {
                const rect = this.getBoundingClientRect();
                if (e.clientX < rect.left || e.clientX > rect.right ||
                    e.clientY < rect.top || e.clientY > rect.bottom) {
                    closeObsExplorer();
                }
            });
        }

        // Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const dialog = document.getElementById('obs-explorer-dialog');
                if (dialog && dialog.open) {
                    e.preventDefault();
                    closeObsExplorer();
                }
            }
        });
    });
})();
