/**
 * Fågelåret i Åstorp — Interaktiv terrängkarta
 * Baserad på Leaflet + OpenTopoMap
 */

document.addEventListener('DOMContentLoaded', function () {
    // Åstorps kommun centrum (approx)
    const astorpCenter = [56.1346, 12.9449];
    const defaultZoom = 12;

    // Use relative path for data - works in dev and production
    const dataPath = '/data/checklist-2026.json';

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

    // Observationsplatser med koordinater
    // Baserat på checklist-2026.json, manuellt geocodade för Åstorps kommun
    const locations = {
        "Åstorp centrum": { lat: 56.1346, lng: 12.9449, species: [] },
        "Trädgården": { lat: 56.1340, lng: 12.9420, species: [] },
        "Gråmanstorp": { lat: 56.1150, lng: 12.9700, species: [] },
        "Åstorps mader": { lat: 56.1480, lng: 12.9200, species: [] },
        "Väg 109": { lat: 56.1200, lng: 12.9100, species: [] },
        "Åstorp kyrka": { lat: 56.1350, lng: 12.9460, species: [] },
        "Matningen": { lat: 56.1330, lng: 12.9400, species: [] }
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

            Object.entries(locations).forEach(([name, loc]) => {
                if (loc.species.length > 0) {
                    // Anpassad markör i naturbutiken-grön
                    const marker = L.circleMarker([loc.lat, loc.lng], {
                        radius: 8 + Math.min(loc.species.length, 10),
                        fillColor: '#2B5A2B',
                        color: '#1E4220',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(map);

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
            document.getElementById('location-count').textContent = markerCount;
            document.getElementById('species-count').textContent = totalSpecies.size;
        })
        .catch(err => {
            console.error('Kunde inte ladda observationsdata:', err);
        });
});
