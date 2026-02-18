/**
 * Fågelåret i Åstorp — Popup-karta för lokaler i notiser
 * Klickbara lokalnamn öppnar en karta med gula pulserande markörer
 */

document.addEventListener('DOMContentLoaded', function () {
    const locationLinks = document.querySelectorAll('.location-link');
    if (!locationLinks.length) return;

    // Skapa overlay-element
    const overlay = document.createElement('div');
    overlay.className = 'location-map-overlay';
    overlay.innerHTML = `
        <div class="location-map-container">
            <button class="location-map-close" aria-label="Stäng karta">&times;</button>
            <div id="location-popup-map" class="location-popup-map"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    let popupMap = null;

    function closePopupMap() {
        overlay.classList.remove('active');
        if (popupMap) {
            popupMap.remove();
            popupMap = null;
        }
    }

    // Stäng med klick utanför
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closePopupMap();
    });

    // Stäng med ×
    overlay.querySelector('.location-map-close').addEventListener('click', closePopupMap);

    // Stäng med Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closePopupMap();
        }
    });

    // Samla alla lokaler i denna notis
    function getAllLocations() {
        const locs = [];
        document.querySelectorAll('.location-link').forEach(function (el) {
            const lat = parseFloat(el.dataset.lat);
            const lng = parseFloat(el.dataset.lng);
            const name = el.textContent.trim();
            if (!isNaN(lat) && !isNaN(lng)) {
                locs.push({ name: name, lat: lat, lng: lng });
            }
        });
        return locs;
    }

    function openPopupMap(clickedName) {
        const locations = getAllLocations();
        if (!locations.length) return;

        overlay.classList.add('active');

        // Initiera Leaflet-kartan
        popupMap = L.map('location-popup-map', {
            scrollWheelZoom: true,
            zoomControl: true
        });

        // OpenTopoMap (samma som huvudkartan)
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a>'
        }).addTo(popupMap);

        // Ladda kommunens GeoJSON för gråtonat omland
        const baseURL = window.siteBaseURL || '/';
        fetch(baseURL + 'data/astorp-kommun.geojson')
            .then(function (r) { return r.json(); })
            .then(function (kommunData) {
                var kommunCoords = kommunData.features[0].geometry.coordinates[0];
                var worldBounds = [[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]];
                var kommunHole = kommunCoords.map(function (c) { return [c[1], c[0]]; });

                L.polygon([
                    worldBounds.map(function (c) { return [c[0], c[1]]; }),
                    kommunHole
                ], {
                    color: 'transparent',
                    fillColor: '#4b5563',
                    fillOpacity: 0.4,
                    interactive: false
                }).addTo(popupMap);

                // Kommunens gräns
                L.polygon(kommunHole, {
                    color: '#b91c1c',
                    weight: 3,
                    fill: false,
                    opacity: 0.6
                }).addTo(popupMap);
            })
            .catch(function () { /* Visa kartan utan kommunlager */ });

        // Lägg till gula markörer
        var bounds = L.latLngBounds();

        locations.forEach(function (loc) {
            var latlng = [loc.lat, loc.lng];
            bounds.extend(latlng);

            // Gul circleMarker
            L.circleMarker(latlng, {
                radius: 10,
                fillColor: '#EAB308',
                color: '#EAB308',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(popupMap).bindPopup('<strong>' + loc.name + '</strong>');

            // Gul puls-ring (SVG)
            var pulseIcon = L.divIcon({
                className: 'pulse-yellow-marker',
                html: '<div class="pulse-yellow-container">' +
                    '<svg class="pulse-yellow-svg" viewBox="0 0 60 60">' +
                    '<circle class="pulse-yellow-ring" cx="30" cy="30" r="24" fill="none" stroke="#EAB308" stroke-width="2"/>' +
                    '</svg>' +
                    '</div>',
                iconSize: [60, 60],
                iconAnchor: [30, 30]
            });
            L.marker(latlng, { icon: pulseIcon, interactive: false }).addTo(popupMap);

            // Lokalnamn som etikett
            var labelIcon = L.divIcon({
                className: 'location-label',
                html: '<span class="location-label-text">' + loc.name + '</span>',
                iconSize: [120, 24],
                iconAnchor: [60, -14]
            });
            L.marker(latlng, { icon: labelIcon, interactive: false }).addTo(popupMap);
        });

        // Zoomanpassning
        if (locations.length === 1) {
            popupMap.setView([locations[0].lat, locations[0].lng], 14);
        } else {
            popupMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    }

    // Bind klick-handler till alla location-links
    locationLinks.forEach(function (el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            openPopupMap(el.textContent.trim());
        });
    });
});
