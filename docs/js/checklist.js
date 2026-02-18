/**
 * Fågelåret i Åstorp — Årskrysslista
 * Interaktiv artlista med filter och sortering
 */

(function () {
    'use strict';

    // Swedish bird species in taxonomic order (subset for MVP)
    // Full list can be expanded from BirdLife Sverige taxonomy
    const SPECIES_LIST = [
        { id: 1, name: "Knölsvan", latin: "Cygnus olor", order: 1 },
        { id: 2, name: "Sångsvan", latin: "Cygnus cygnus", order: 2 },
        { id: 3, name: "Skogsgås", latin: "Anser fabalis", order: 3 },
        { id: 4, name: "Grågås", latin: "Anser anser", order: 4 },
        { id: 5, name: "Kanadagås", latin: "Branta canadensis", order: 5 },
        { id: 6, name: "Vitkindad gås", latin: "Branta leucopsis", order: 6 },
        { id: 7, name: "Gräsand", latin: "Anas platyrhynchos", order: 7 },
        { id: 8, name: "Kricka", latin: "Anas crecca", order: 8 },
        { id: 9, name: "Bläsand", latin: "Mareca penelope", order: 9 },
        { id: 10, name: "Knipa", latin: "Bucephala clangula", order: 10 },
        { id: 11, name: "Storskrake", latin: "Mergus merganser", order: 11 },
        { id: 12, name: "Fasan", latin: "Phasianus colchicus", order: 12 },
        { id: 13, name: "Storskarv", latin: "Phalacrocorax carbo", order: 13 },
        { id: 14, name: "Gråhäger", latin: "Ardea cinerea", order: 14 },
        { id: 15, name: "Röd glada", latin: "Milvus milvus", order: 15 },
        { id: 16, name: "Havsörn", latin: "Haliaeetus albicilla", order: 16 },
        { id: 17, name: "Sparvhök", latin: "Accipiter nisus", order: 17 },
        { id: 18, name: "Ormvråk", latin: "Buteo buteo", order: 18 },
        { id: 79, name: "Fjällvråk", latin: "Buteo lagopus", order: 19 },
        { id: 19, name: "Tornfalk", latin: "Falco tinnunculus", order: 20 },
        { id: 20, name: "Trana", latin: "Grus grus", order: 20 },
        { id: 21, name: "Strandskata", latin: "Haematopus ostralegus", order: 21 },
        { id: 22, name: "Tofsvipa", latin: "Vanellus vanellus", order: 22 },
        { id: 23, name: "Enkelbeckasin", latin: "Gallinago gallinago", order: 23 },
        { id: 24, name: "Morkulla", latin: "Scolopax rusticola", order: 24 },
        { id: 25, name: "Fiskmås", latin: "Larus canus", order: 25 },
        { id: 26, name: "Gråtrut", latin: "Larus argentatus", order: 26 },
        { id: 27, name: "Havstrut", latin: "Larus marinus", order: 27 },
        { id: 28, name: "Skrattmås", latin: "Chroicocephalus ridibundus", order: 28 },
        { id: 29, name: "Tamduva", latin: "Columba livia", order: 29 },
        { id: 30, name: "Skogsduva", latin: "Columba oenas", order: 30 },
        { id: 31, name: "Ringduva", latin: "Columba palumbus", order: 31 },
        { id: 32, name: "Turkduva", latin: "Streptopelia decaocto", order: 32 },
        { id: 33, name: "Kattuggla", latin: "Strix aluco", order: 33 },
        { id: 34, name: "Hornuggla", latin: "Asio otus", order: 34 },
        { id: 35, name: "Gröngöling", latin: "Picus viridis", order: 35 },
        { id: 36, name: "Större hackspett", latin: "Dendrocopos major", order: 36 },
        { id: 37, name: "Mindre hackspett", latin: "Dryobates minor", order: 37 },
        { id: 38, name: "Spillkråka", latin: "Dryocopus martius", order: 38 },
        { id: 39, name: "Skata", latin: "Pica pica", order: 39 },
        { id: 40, name: "Nötskrika", latin: "Garrulus glandarius", order: 40 },
        { id: 41, name: "Kaja", latin: "Coloeus monedula", order: 41 },
        { id: 42, name: "Råka", latin: "Corvus frugilegus", order: 42 },
        { id: 43, name: "Gråkråka", latin: "Corvus cornix", order: 43 },
        { id: 44, name: "Korp", latin: "Corvus corax", order: 44 },
        { id: 45, name: "Tofsmes", latin: "Lophophanes cristatus", order: 45 },
        { id: 46, name: "Svartmes", latin: "Periparus ater", order: 46 },
        { id: 47, name: "Blåmes", latin: "Cyanistes caeruleus", order: 47 },
        { id: 48, name: "Talgoxe", latin: "Parus major", order: 48 },
        { id: 49, name: "Nötväcka", latin: "Sitta europaea", order: 49 },
        { id: 50, name: "Trädkrypare", latin: "Certhia familiaris", order: 50 },
        { id: 51, name: "Gärdsmyg", latin: "Troglodytes troglodytes", order: 51 },
        { id: 52, name: "Stjärtmes", latin: "Aegithalos caudatus", order: 52 },
        { id: 53, name: "Kungsfågel", latin: "Regulus regulus", order: 53 },
        { id: 54, name: "Koltrast", latin: "Turdus merula", order: 54 },
        { id: 55, name: "Björktrast", latin: "Turdus pilaris", order: 55 },
        { id: 56, name: "Rödvingetrast", latin: "Turdus iliacus", order: 56 },
        { id: 57, name: "Taltrast", latin: "Turdus philomelos", order: 57 },
        { id: 58, name: "Dubbeltrast", latin: "Turdus viscivorus", order: 58 },
        { id: 59, name: "Rödhake", latin: "Erithacus rubecula", order: 59 },
        { id: 60, name: "Grå flugsnappare", latin: "Muscicapa striata", order: 60 },
        { id: 61, name: "Svartvit flugsnappare", latin: "Ficedula hypoleuca", order: 61 },
        { id: 62, name: "Pilfink", latin: "Passer montanus", order: 62 },
        { id: 63, name: "Gråsparv", latin: "Passer domesticus", order: 63 },
        { id: 64, name: "Sädesärla", latin: "Motacilla alba", order: 64 },
        { id: 65, name: "Forsärla", latin: "Motacilla cinerea", order: 65 },
        { id: 66, name: "Ängspiplärka", latin: "Anthus pratensis", order: 66 },
        { id: 67, name: "Bofink", latin: "Fringilla coelebs", order: 67 },
        { id: 68, name: "Bergfink", latin: "Fringilla montifringilla", order: 68 },
        { id: 69, name: "Grönfink", latin: "Chloris chloris", order: 69 },
        { id: 70, name: "Steglits", latin: "Carduelis carduelis", order: 70 },
        { id: 71, name: "Grönsiska", latin: "Spinus spinus", order: 71 },
        { id: 72, name: "Hämpling", latin: "Linaria cannabina", order: 72 },
        { id: 73, name: "Gråsiska", latin: "Acanthis flammea", order: 73 },
        { id: 74, name: "Domherre", latin: "Pyrrhula pyrrhula", order: 74 },
        { id: 75, name: "Stenknäck", latin: "Coccothraustes coccothraustes", order: 75 },
        { id: 76, name: "Mindre korsnäbb", latin: "Loxia curvirostra", order: 76 },
        { id: 77, name: "Gulsparv", latin: "Emberiza citrinella", order: 77 },
        { id: 78, name: "Sävsparv", latin: "Emberiza schoeniclus", order: 78 }
    ];

    let observations = [];
    let currentFilter = 'all';
    let currentSort = 'taxonomic';

    /**
     * Initialize the checklist
     */
    async function init() {
        await loadObservations();
        setupEventListeners();
        render();
    }

    /**
     * Load observations from JSON data file
     */
    async function loadObservations() {
        try {
            // Använd dynamisk baseURL från Hugo
            const baseURL = window.siteBaseURL || '/birds_Astorp/';
            const response = await fetch(baseURL + 'data/checklist-2026.json');
            const data = await response.json();
            observations = data.observations || [];
        } catch (error) {
            console.log('No observations data found, starting fresh');
            observations = [];
        }
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.checklist-filter[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.checklist-filter[data-filter]').forEach(b =>
                    b.classList.remove('active')
                );
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                render();
            });
        });

        // Sort select
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                render();
            });
        }
    }

    /**
     * Get observation data for a species
     */
    function getObservation(speciesName) {
        return observations.find(o =>
            o.species.toLowerCase() === speciesName.toLowerCase()
        );
    }

    /**
     * Render the species grid
     */
    function render() {
        const grid = document.getElementById('species-grid');
        if (!grid) return;

        // Get filtered and sorted species
        let species = [...SPECIES_LIST];

        // Apply filter
        if (currentFilter === 'observed') {
            species = species.filter(s => getObservation(s.name));
        } else if (currentFilter === 'pending') {
            species = species.filter(s => !getObservation(s.name));
        }

        // Apply sort
        if (currentSort === 'alphabetical') {
            species.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
        } else if (currentSort === 'chronological') {
            // Observed species first, sorted by date then by order in JSON
            species.sort((a, b) => {
                const obsA = getObservation(a.name);
                const obsB = getObservation(b.name);
                if (obsA && obsB) {
                    const dateCompare = new Date(obsA.date) - new Date(obsB.date);
                    if (dateCompare !== 0) return dateCompare;
                    // Same date: use order in observations array
                    const indexA = observations.findIndex(o => o.species.toLowerCase() === a.name.toLowerCase());
                    const indexB = observations.findIndex(o => o.species.toLowerCase() === b.name.toLowerCase());
                    return indexA - indexB;
                }
                if (obsA) return -1;
                if (obsB) return 1;
                return a.order - b.order;
            });
        } else {
            // Taxonomic order (default)
            species.sort((a, b) => a.order - b.order);
        }

        // Render
        if (species.length === 0) {
            grid.innerHTML = '<p class="empty-state">Inga arter matchar filtret</p>';
            return;
        }

        grid.innerHTML = species.map(s => {
            const obs = getObservation(s.name);
            const observedClass = obs ? 'observed' : '';

            return `
        <div class="species-card ${observedClass}">
          <div class="species-checkbox">
            ${obs ? '✓' : ''}
          </div>
          <div class="species-info">
            <span class="species-name">${s.name}</span>
            <span class="species-latin">${s.latin}</span>
          </div>
          <div class="species-obs-data">
            ${obs ? `<span class="species-date">${formatDate(obs.date)}</span><span class="species-location">${obs.location}</span>` : ''}
          </div>
        </div>
      `;
        }).join('');

        // Update stats
        updateStats();
    }

    /**
     * Update statistics display
     */
    function updateStats() {
        const totalEl = document.getElementById('total-species');
        const lastEl = document.getElementById('last-added');

        const observedSpecies = SPECIES_LIST.filter(s => getObservation(s.name));

        if (totalEl) {
            totalEl.textContent = observedSpecies.length;
        }

        if (lastEl && observations.length > 0) {
            // Last observation in array is the most recently added
            lastEl.textContent = observations[observations.length - 1].species;
        }
    }

    /**
     * Format date for display
     */
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'short'
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
