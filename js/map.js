/**
 * Fågelåret i Åstorp — Interaktiv terrängkarta
 * Baserad på Leaflet + OpenTopoMap
 */

document.addEventListener('DOMContentLoaded', function () {
    // Åstorps kommun centrum (approx)
    const astorpCenter = [56.1346, 12.9449];
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

    // Gul overlay utanför Åstorps kommun
    // Skapa en stor polygon som täcker hela kartan, med ett hål för kommunen
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

            // Skapa polygon med hål (world minus kommun) - GUL färg (avaktiverad)
            const overlayPolygon = L.polygon([
                worldBounds.map(c => [c[0], c[1]]),
                kommunHole
            ], {
                color: 'transparent',
                fillColor: '#FFD700',  // Gul toning
                fillOpacity: 0,        // Avaktiverad - sätt till 0.4 för att aktivera igen
                interactive: false
            }).addTo(map);

            // Lägg också till en kraftig gräns runt kommunen
            L.polygon(kommunHole, {
                color: '#1e40af',  // Kraftig blå
                weight: 4,
                fill: false,
                opacity: 0.8
            }).addTo(map);
        })
        .catch(err => {
            console.log('Kunde inte ladda kommungränser:', err);
        });

    // Observationsplatser med koordinater
    // Dessa fylls automatiskt från observationsdata
    const locations = {
        "Västra Sönnarslöv": { lat: 56.12868, lng: 13.08559, species: [] },
        "Kvidinge": { lat: 56.13675, lng: 13.04310, species: [] },
        "Bron vid Rönneå": { lat: 56.13312, lng: 13.09428, species: [] },
        "Tranarpsbron": { lat: 56.17858, lng: 13.02111, species: [] }
    };

    // Hämta observationsdata
    fetch(dataPath)
        .then(response => response.json())
        .then(data => {
            // Aggregera arter per plats
            data.observations.forEach(obs => {
                const loc = locations[obs.location];
                if (loc && !loc.species.includes(obs.species)) {
                    loc.species.push(obs.species);
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
                        fillColor: '#dc2626',  // Röd
                        color: '#dc2626',       // Samma röda som fill
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8,
                        className: isLatest ? 'latest-marker' : ''
                    }).addTo(map);

                    // Pulseffekt på senaste
                    if (isLatest) {
                        latestMarker = marker;
                        // Lägg till pulsring via SVG
                        const pulseIcon = L.divIcon({
                            className: 'pulse-marker',
                            html: `<div class=\"pulse-ring-container\">\n                                <svg class=\"pulse-svg\" viewBox=\"0 0 50 50\">\n                                    <circle class=\"pulse-ring\" cx=\"25\" cy=\"25\" r=\"20\" fill=\"none\" stroke=\"#dc2626\" stroke-width=\"2\"/>\n                                </svg>\n                            </div>`,
                            iconSize: [50, 50],
                            iconAnchor: [25, 25]
                        });
                        L.marker([loc.lat, loc.lng], { icon: pulseIcon, interactive: false }).addTo(map);
                    }

                    // Popup med artlista
                    const speciesList = loc.species.map(s => `<li>${s}</li>`).join('');
                    marker.bindPopup(`
                        <div class="map-popup">
                            <h4>${name}</h4>
                            <p><strong>${loc.species.length}</strong> arter observerade</p>
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
