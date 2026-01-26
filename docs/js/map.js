/**
 * Fågelåret i Åstorp — Interaktiv terrängkarta
 * Baserad på Leaflet + OpenTopoMap
 */

document.addEventListener('DOMContentLoaded', function () {
    // Åstorps kommun centrum (justerat för bättre vy)
    const astorpCenter = [56.14, 13.05];
    const defaultZoom = 12;

    // Använd baseURL från Hugo för korrekta paths
    const baseURL = window.siteBaseURL || '/';
    const dataPath = baseURL + 'data/checklist-2026.json';
    const geoPath = baseURL + 'data/astorp-kommun.geojson';

    // Initiera kartan
    const map = L.map('map', {
        center: astorpCenter,
        zoom: defaultZoom,
        scrollWheelZoom: true
    });

    // OpenTopoMap — terrängkarta
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Kartdata: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    }).addTo(map);

    // Grå overlay utanför Åstorps kommun
    fetch(geoPath)
        .then(response => response.json())
        .then(kommunData => {
            const kommunCoords = kommunData.features[0].geometry.coordinates[0];

            // Skapa en "world" polygon som täcker allt
            const worldBounds = [
                [-90, -180],
                [-90, 180],
                [90, 180],
                [90, -180],
                [-90, -180]
            ];

            // Konvertera kommunkoordinater till [lat, lng] format
            const kommunHole = kommunCoords.map(coord => [coord[1], coord[0]]);

            // Skapa polygon med hål (world minus kommun) - GRÅ färg
            const overlayPolygon = L.polygon([
                worldBounds.map(c => [c[0], c[1]]),
                kommunHole
            ], {
                color: 'transparent',
                fillColor: '#4b5563',
                fillOpacity: 0.4,
                interactive: false
            }).addTo(map);

            // Lägg också till en kraftig gräns runt kommunen
            L.polygon(kommunHole, {
                color: '#b91c1c',
                weight: 4,
                fill: false,
                opacity: 0.8
            }).addTo(map);

            // Beräkna centrum och optimal zoom baserat på höjden
            const bounds = L.latLngBounds(kommunHole);
            const center = bounds.getCenter();

            // Beräkna zoom så att nord-syd touchar kanterna
            const mapHeight = map.getSize().y;
            const latDiff = bounds.getNorth() - bounds.getSouth();
            // Formel: zoom ≈ log2(180 * mapHeight / (latDiff * 256))
            const zoom = Math.floor(Math.log2(180 * mapHeight / (latDiff * 256)));

            map.setView(center, zoom);
        })
        .catch(err => {
            console.log('Kunde inte ladda kommungränser:', err);
        });

    // Hämta observationsdata och bygg platser dynamiskt
    fetch(dataPath)
        .then(response => response.json())
        .then(data => {
            // Bygg locations dynamiskt från observationsdata
            const locations = {};

            data.observations.forEach(obs => {
                if (!locations[obs.location]) {
                    locations[obs.location] = {
                        lat: obs.lat,
                        lng: obs.lng,
                        species: []
                    };
                }
                if (!locations[obs.location].species.includes(obs.species)) {
                    locations[obs.location].species.push(obs.species);
                }
            });

            // Skapa markörer
            let totalSpecies = new Set();
            let markerCount = 0;
            let latestMarker = null;
            let latestDate = null;

            // Hitta senaste observation
            data.observations.forEach(obs => {
                const obsDate = new Date(obs.date);
                if (!latestDate || obsDate > latestDate) {
                    latestDate = obsDate;
                }
            });

            Object.entries(locations).forEach(([name, loc]) => {
                if (loc.species.length > 0) {
                    // Kolla om detta är den senaste observationsplatsen
                    const isLatest = data.observations.some(obs =>
                        obs.location === name &&
                        new Date(obs.date).getTime() === latestDate.getTime()
                    );

                    // Röd markör med samma border som fill
                    const marker = L.circleMarker([loc.lat, loc.lng], {
                        radius: 8 + Math.min(loc.species.length, 10),
                        fillColor: '#dc2626',
                        color: '#dc2626',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8,
                        className: isLatest ? 'latest-marker' : ''
                    }).addTo(map);

                    // Pulseffekt på senaste
                    if (isLatest) {
                        latestMarker = marker;
                        const pulseIcon = L.divIcon({
                            className: 'pulse-marker',
                            html: `<div class=\"pulse-ring-container\">
                                <svg class=\"pulse-svg\" viewBox=\"0 0 50 50\">
                                    <circle class=\"pulse-ring\" cx=\"25\" cy=\"25\" r=\"20\" fill=\"none\" stroke=\"#dc2626\" stroke-width=\"2\"/>
                                </svg>
                            </div>`,
                            iconSize: [50, 50],
                            iconAnchor: [25, 25]
                        });
                        L.marker([loc.lat, loc.lng], { icon: pulseIcon, interactive: false }).addTo(map);
                    }

                    // Popup med artlista — "Här kryssades:"
                    const speciesList = loc.species.map(s => `<li>${s}</li>`).join('');
                    marker.bindPopup(`
                        <div class="map-popup">
                            <h4>${name}</h4>
                            <p><strong>Här kryssades:</strong></p>
                            <ul class="popup-species-list">${speciesList}</ul>
                        </div>
                    `);

                    // Räkna statistik
                    loc.species.forEach(s => totalSpecies.add(s));
                    markerCount++;
                }
            });

            // Uppdatera statistik i header
            const speciesEl = document.getElementById('species-count');
            if (speciesEl) speciesEl.textContent = totalSpecies.size;
        })
        .catch(err => {
            console.error('Kunde inte ladda observationsdata:', err);
        });
});
