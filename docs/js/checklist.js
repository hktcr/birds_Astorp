/**
 * Fågelåret i Åstorp — Årskrysslista
 * Interaktiv artlista med filter, sökning och sortering
 * 
 * Läser artdata från species-guide.json (samma källa som Artkalendern)
 * och kryssdata från checklist-2026.json.
 */

(function () {
    'use strict';

    let speciesList = [];
    let observations = [];
    let currentFilter = 'all';
    let currentSort = 'taxonomic';
    let currentSearch = '';

    const TARGET = 150;

    /**
     * Initialize the checklist
     */
    async function init() {
        await loadData();
        setupEventListeners();
        render();
    }

    /**
     * Load species from species-guide.json and observations from checklist-2026.json
     */
    async function loadData() {
        try {
            const baseURL = window.siteBaseURL || '/birds_Astorp/';
            const [guideRes, checklistRes] = await Promise.all([
                fetch(baseURL + 'data/species-guide.json'),
                fetch(baseURL + 'data/checklist-2026.json')
            ]);
            const guideJson = await guideRes.json();
            const checklistJson = await checklistRes.json();

            observations = checklistJson.observations || [];

            // Build species list from guide (taxonomic order preserved)
            const guideSpecies = guideJson.species || [];
            const guideNames = new Set();

            speciesList = guideSpecies.map((sp, index) => {
                guideNames.add(sp.name.toLowerCase());
                return {
                    name: sp.name,
                    latin: sp.latin,
                    category: sp.category,
                    total: sp.total,
                    order: index
                };
            });

            // Inject any checklist species not in the guide (new for municipality)
            let nextOrder = speciesList.length;
            for (const obs of observations) {
                const key = obs.species.toLowerCase();
                if (!guideNames.has(key)) {
                    speciesList.push({
                        name: obs.species,
                        latin: obs.latin,
                        category: 'new',
                        total: 0,
                        order: nextOrder++,
                        isNew: true
                    });
                    guideNames.add(key);
                }
            }
        } catch (error) {
            console.error('Checklist: Failed to load data', error);
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

        // Search input
        const searchInput = document.getElementById('checklist-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentSearch = searchInput.value.toLowerCase().trim();
                render();
            });

            // Keyboard shortcuts: R = focus/clear search, Escape = reset
            document.addEventListener('keydown', (e) => {
                const active = document.activeElement;
                const isTyping = active && (
                    active.tagName === 'INPUT' ||
                    active.tagName === 'TEXTAREA' ||
                    active.isContentEditable
                );

                if (e.key === 'Escape') {
                    searchInput.value = '';
                    currentSearch = '';
                    searchInput.blur();
                    render();
                    return;
                }

                if ((e.key === 'r' || e.key === 'R') && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    searchInput.value = '';
                    currentSearch = '';
                    searchInput.focus();
                    render();
                }
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
        let species = [...speciesList];

        // Apply text search filter
        if (currentSearch) {
            species = species.filter(s =>
                s.name.toLowerCase().includes(currentSearch) ||
                s.latin.toLowerCase().includes(currentSearch)
            );
        }

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
            const newBadge = s.isNew ? ' <span class="species-new-badge">🆕</span>' : '';

            return `
        <div class="species-card ${observedClass}">
          <div class="species-checkbox">
            ${obs ? '✓' : ''}
          </div>
          <div class="species-info">
            <span class="species-name">${s.name}${newBadge}</span>
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
     * Update statistics display — always against full species list
     */
    function updateStats() {
        const totalEl = document.getElementById('total-species');
        const lastEl = document.getElementById('last-added');

        const observedCount = speciesList.filter(s => getObservation(s.name)).length;
        const totalCount = speciesList.length;

        if (totalEl) {
            totalEl.textContent = `${observedCount}/${totalCount}`;
        }

        if (lastEl && observations.length > 0) {
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
