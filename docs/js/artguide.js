/**
 * Fågelåret i Åstorp — Artkalender (Fält-guide läge)
 * Interaktiv artkalender som visar arter för angiven månad.
 */
(function () {
    'use strict';

    // --- State ---
    let speciesData = [];
    let checklistData = [];
    let currentMonth = new Date().getMonth(); // 0-indexed
    let currentFilter = 'all';
    let currentSort = 'likely';

    const MONTH_NAMES = [
        'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
        'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];

    const CATEGORY_LABELS = {
        abundant: 'Förväntad',
        regular: 'Möjlig',
        uncommon: 'Ovanlig',
        rare: 'Raritet'
    };

    const CATEGORY_ICONS = {
        abundant: '',
        regular: '',
        uncommon: '◆',
        rare: '⭐'
    };

    const TARGET = 150;

    // --- Init ---
    async function init() {
        try {
            const baseURL = window.siteBaseURL || '/';
            const [guideRes, checklistRes] = await Promise.all([
                fetch(baseURL + 'data/species-guide.json'),
                fetch(baseURL + 'data/checklist-2026.json')
            ]);
            const guideJson = await guideRes.json();
            const checklistJson = await checklistRes.json();

            speciesData = guideJson.species || [];
            checklistData = checklistJson.observations || [];

            // Set export date in footer
            const footerDate = document.querySelector('.artguide-footer__date');
            if (footerDate) {
                footerDate.textContent = `Exportdatum: ${guideJson.exportDate || guideJson.generated}`;
            }

            matchChecklist();
            setupEventListeners();
            renderProgressBar();
            setActiveMonth(currentMonth);
            renderMonthView(currentMonth);
        } catch (err) {
            console.error('Artguide: Failed to load data', err);
            const container = document.getElementById('artguide-species');
            if (container) {
                container.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">Kunde inte ladda artdata.</p>';
            }
        }
    }

    // --- Checklist matching ---
    function matchChecklist() {
        const checkMap = new Map();
        for (const obs of checklistData) {
            const key = obs.species.toLowerCase();
            if (!checkMap.has(key)) {
                checkMap.set(key, {
                    date: obs.date,
                    location: obs.location
                });
            }
        }
        for (const sp of speciesData) {
            const key = sp.name.toLowerCase();
            const match = checkMap.get(key);
            if (match) {
                sp.checked = true;
                sp.checkDate = match.date;
                sp.checkLocation = match.location;
            } else {
                sp.checked = false;
            }
        }
    }

    // --- Event listeners ---
    function setupEventListeners() {
        // Month buttons
        document.querySelectorAll('.artguide-months__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const month = parseInt(btn.dataset.month);
                setActiveMonth(month);
                renderMonthView(month);
            });
        });

        // Filters
        document.querySelectorAll('.artguide-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.artguide-filter').forEach(b => b.classList.remove('artguide-filter--active'));
                btn.classList.add('artguide-filter--active');
                currentFilter = btn.dataset.filter;
                renderMonthView(currentMonth);
            });
        });

        // Sort toggle
        document.querySelectorAll('.artguide-sort__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.artguide-sort__btn').forEach(b => b.classList.remove('artguide-sort__btn--active'));
                btn.classList.add('artguide-sort__btn--active');
                currentSort = btn.dataset.sort;
                renderMonthView(currentMonth);
            });
        });
    }

    // --- Rendering ---
    function setActiveMonth(month) {
        currentMonth = month;
        const now = new Date().getMonth();
        document.querySelectorAll('.artguide-months__btn').forEach(btn => {
            const m = parseInt(btn.dataset.month);
            btn.classList.toggle('artguide-months__btn--active', m === month);
            btn.classList.toggle('artguide-months__btn--past', m < now && m !== month);
        });
    }

    function renderProgressBar() {
        const checked = speciesData.filter(s => s.checked).length;
        const pct = Math.min((checked / TARGET) * 100, 100);
        const bar = document.querySelector('.artguide-progress');
        const fill = document.querySelector('.artguide-progress__fill');
        const countEl = document.querySelector('.artguide-progress__count');
        const latestEl = document.querySelector('.artguide-progress__latest');

        if (bar) bar.setAttribute('aria-valuenow', checked);
        if (fill) {
            fill.style.width = '0%';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    fill.style.width = pct + '%';
                });
            });
        }
        if (countEl) countEl.textContent = `${checked}/${TARGET} arter`;

        // Find latest check
        if (latestEl) {
            const checkedSpecies = speciesData.filter(s => s.checked && s.checkDate);
            checkedSpecies.sort((a, b) => b.checkDate.localeCompare(a.checkDate));
            if (checkedSpecies.length > 0) {
                const latest = checkedSpecies[0];
                latestEl.innerHTML = `<strong>Senast:</strong> ${latest.name}, ${formatDate(latest.checkDate)}`;
            }
        }
    }

    function updateLegendCounts(displayedSpecies) {
        const categories = ['abundant', 'regular', 'uncommon', 'rare'];
        let totalChecked = 0, totalAll = 0;
        categories.forEach(cat => {
            const el = document.getElementById('legend-count-' + cat);
            if (!el) return;
            const inCat = displayedSpecies.filter(s => s.category === cat);
            const checked = inCat.filter(s => s.checked).length;
            el.textContent = `${checked}/${inCat.length}`;
            totalChecked += checked;
            totalAll += inCat.length;
        });
        // Always show the full-year total, not the month-filtered total
        const yearChecked = speciesData.filter(s => s.checked).length;
        const totalEl = document.getElementById('legend-count-total');
        if (totalEl) totalEl.textContent = `Årstotal: ${yearChecked}/${TARGET} · Visade: ${totalChecked}/${totalAll}`;
    }

    function sortSpecies(species, month) {
        if (currentSort === 'taxonomy') return species;
        // Sort by observation count in given month (descending), fallback to total
        return [...species].sort((a, b) => {
            const aVal = month !== undefined ? a.months[month] : a.total;
            const bVal = month !== undefined ? b.months[month] : b.total;
            return bVal - aVal || b.total - a.total;
        });
    }

    function sortChronological(species) {
        return [...species].sort((a, b) => {
            // Checked species first, sorted by date (earliest first)
            if (a.checked && b.checked) {
                return (a.checkDate || '').localeCompare(b.checkDate || '');
            }
            if (a.checked) return -1;
            if (b.checked) return 1;
            // Unchecked: taxonomic order
            return 0;
        });
    }

    function filterSpecies(species) {
        switch (currentFilter) {
            case 'abundant':
            case 'regular':
            case 'uncommon':
            case 'rare':
                return species.filter(s => s.category === currentFilter);
            case 'checked':
                return species.filter(s => s.checked);
            case 'missing':
                return species.filter(s => !s.checked);
            default:
                return species;
        }
    }

    function renderMonthView(month) {
        const container = document.getElementById('artguide-species');
        const heading = document.querySelector('.artguide-month-heading__title');
        const subtitle = document.querySelector('.artguide-month-heading__subtitle');

        if (!container) return;

        // Show month heading
        const monthHeading = document.querySelector('.artguide-month-heading');
        if (monthHeading) monthHeading.style.display = '';

        // Filter species that have observations in this month
        let monthSpecies = speciesData.filter(sp => sp.months[month] > 0);

        monthSpecies = filterSpecies(monthSpecies);
        if (currentSort === 'chronological') {
            monthSpecies = sortChronological(monthSpecies);
        } else {
            monthSpecies = sortSpecies(monthSpecies, month);
        }

        const checkedInMonth = monthSpecies.filter(s => s.checked).length;
        const yearChecked = speciesData.filter(s => s.checked).length;

        if (heading) heading.textContent = MONTH_NAMES[month];
        if (subtitle) {
            subtitle.textContent = `${monthSpecies.length} arter i ${MONTH_NAMES[month].toLowerCase()} · ${checkedInMonth} kryssade här · ${yearChecked} totalt i år`;
        }

        // Render cards
        container.className = 'artguide-species artguide-species--cards';
        container.innerHTML = monthSpecies.map(sp => renderCard(sp, month)).join('');
        updateLegendCounts(monthSpecies);

        // Add click handlers: Open Årshjul modal if arshjul.js function exists, else expand basic detail
        container.querySelectorAll('.artguide-card').forEach(card => {
            card.addEventListener('click', () => {
                if (typeof window.openArshjulModalForSpecies === 'function') {
                    // Try to use the modern Modal
                    window.openArshjulModalForSpecies(card.dataset.species, card.dataset.checked === 'true' ? card.dataset.checkdate : null);
                } else {
                    // Fallback to inline expansion
                    toggleCardExpansion(card);
                }
            });
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });
    }

    function renderCard(sp, activeMonth) {
        const icon = CATEGORY_ICONS[sp.category] || '';
        const label = CATEGORY_LABELS[sp.category] || '';
        const checkedClass = sp.checked ? ' artguide-card--checked' : '';
        const checkMark = sp.checked ? ' <span class="artguide-card__check" aria-label="Kryssad">✓</span>' : '';

        const sparkline = renderSparkline(sp.months, activeMonth, sp.category);

        // Show contextual count based on sort mode
        let countText;
        if (currentSort === 'chronological' && sp.checked) {
            countText = `Kryssad ${formatDate(sp.checkDate)}`;
        } else if (currentSort === 'likely' && activeMonth !== undefined) {
            const monthCount = sp.months[activeMonth];
            countText = `${monthCount} i ${MONTH_NAMES[activeMonth].toLowerCase()} · ${sp.total} totalt`;
        } else {
            countText = `${sp.total} rapp. totalt`;
        }

        const ariaLabel = `${sp.name} — ${label}, ${sp.total} rapporter${sp.checked ? ', kryssad ' + sp.checkDate : ''}`;

        return `
        <div class="artguide-card artguide-card--${sp.category}${checkedClass}"
             tabindex="0" role="button" aria-label="${ariaLabel}"
             data-species="${sp.name}"
             data-checked="${sp.checked}"
             data-checkdate="${sp.checkDate || ''}">
            <div class="artguide-card__header">
                <div class="artguide-card__names">
                    <span class="artguide-card__name">${sp.name}${checkMark} ${icon}</span>
                    <span class="artguide-card__latin">${sp.latin}</span>
                </div>
            </div>
            <div class="artguide-card__meta">
                <span class="artguide-card__category">${label}</span>
                <span class="artguide-card__total">${countText}</span>
            </div>
            <div class="artguide-card__sparkline">${sparkline}</div>
            <div class="artguide-card__details" style="display:none;">
                ${renderDetails(sp)}
            </div>
        </div>`;
    }

    function renderSparkline(months, activeMonth, category) {
        const max = Math.max(...months, 1);
        const barWidth = 6;
        const gap = 2;
        const height = 24;
        const totalWidth = 12 * (barWidth + gap) - gap;

        let bars = '';
        for (let i = 0; i < 12; i++) {
            const val = months[i];
            const barHeight = Math.max((val / max) * height, val > 0 ? 2 : 0);
            const y = height - barHeight;
            const isActive = i === activeMonth;
            const cls = isActive ? 'sparkline-bar sparkline-bar--active' : 'sparkline-bar';
            const x = i * (barWidth + gap);
            bars += `<rect class="${cls}" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="1"/>`;
        }

        return `<svg class="artguide-sparkline artguide-sparkline--${category}" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" aria-hidden="true">${bars}</svg>`;
    }

    function renderDetails(sp) {
        let html = '<div class="artguide-detail">';

        // Monthly bar chart
        html += '<div class="artguide-detail__chart">';
        const max = Math.max(...sp.months, 1);
        for (let i = 0; i < 12; i++) {
            const val = sp.months[i];
            const pct = (val / max) * 100;
            const label = MONTH_NAMES[i].substring(0, 3);
            html += `<div class="artguide-detail__bar-col">
                <div class="artguide-detail__bar-wrap">
                    <div class="artguide-detail__bar" style="height:${pct}%">${val > 0 ? val : ''}</div>
                </div>
                <span class="artguide-detail__bar-label">${label}</span>
            </div>`;
        }
        html += '</div>';

        // Info
        html += `<div class="artguide-detail__info">`;
        html += `<p><strong>Totalt:</strong> ${sp.total} rapporter i Åstorps kommun</p>`;
        if (sp.checked) {
            html += `<p><strong>Kryssad:</strong> ${formatDate(sp.checkDate)}`;
            if (sp.checkLocation) html += ` — ${sp.checkLocation}`;
            html += `</p>`;
        }
        html += '</div>';

        html += '</div>';
        return html;
    }

    function toggleCardExpansion(card) {
        const details = card.querySelector('.artguide-card__details');
        const sparkline = card.querySelector('.artguide-card__sparkline');
        if (!details) return;

        const isExpanded = details.style.display !== 'none';
        // Close any other expanded card
        document.querySelectorAll('.artguide-card__details').forEach(d => d.style.display = 'none');
        document.querySelectorAll('.artguide-card__sparkline').forEach(s => s.style.display = '');
        document.querySelectorAll('.artguide-card').forEach(c => c.classList.remove('artguide-card--expanded'));

        if (!isExpanded) {
            details.style.display = '';
            if (sparkline) sparkline.style.display = 'none';
            card.classList.add('artguide-card--expanded');
        }
    }

    // --- Helpers ---
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const day = parseInt(parts[2]);
        const month = months[parseInt(parts[1]) - 1];
        return `${day} ${month}`;
    }

    // --- Start ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
