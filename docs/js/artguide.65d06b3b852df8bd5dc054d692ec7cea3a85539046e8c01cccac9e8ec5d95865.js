/**
 * Fågelåret i Åstorp — Artkalender
 * Interactive species guide with monthly navigation,
 * rarity color coding, and checklist integration.
 */
(function () {
    'use strict';

    // --- State ---
    let speciesData = [];
    let checklistData = [];
    let currentMonth = new Date().getMonth(); // 0-indexed
    let currentView = 'month';
    let currentFilter = 'all';
    let currentSort = 'likely';
    let expandedCard = null;

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

            // Check URL params for pre-selected filter (e.g. ?filter=checked)
            const urlParams = new URLSearchParams(window.location.search);
            const filterParam = urlParams.get('filter');
            if (filterParam) {
                const filterBtn = document.querySelector(`.artguide-filter[data-filter="${filterParam}"]`);
                if (filterBtn) {
                    document.querySelectorAll('.artguide-filter').forEach(b => b.classList.remove('artguide-filter--active'));
                    filterBtn.classList.add('artguide-filter--active');
                    currentFilter = filterParam;
                }
            }

            // Check URL params for pre-selected view (e.g. ?view=year)
            const viewParam = urlParams.get('view');
            if (viewParam === 'year') {
                currentView = 'year';
                document.querySelectorAll('.artguide-view-toggle__btn').forEach(b => {
                    b.classList.remove('artguide-view-toggle__btn--active');
                    b.setAttribute('aria-selected', 'false');
                });
                const yearBtn = document.querySelector('.artguide-view-toggle__btn[data-view="year"]');
                if (yearBtn) {
                    yearBtn.classList.add('artguide-view-toggle__btn--active');
                    yearBtn.setAttribute('aria-selected', 'true');
                }
                const monthNav = document.querySelector('.artguide-months');
                if (monthNav) monthNav.style.display = 'none';
            }

            renderProgressBar();
            setActiveMonth(currentMonth);
            if (currentView === 'year') {
                renderYearView();
            } else {
                renderMonthView(currentMonth);
            }
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
                if (currentView === 'month') {
                    renderMonthView(month);
                }
            });
        });

        // View toggle
        document.querySelectorAll('.artguide-view-toggle__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.artguide-view-toggle__btn').forEach(b => {
                    b.classList.remove('artguide-view-toggle__btn--active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('artguide-view-toggle__btn--active');
                btn.setAttribute('aria-selected', 'true');
                currentView = btn.dataset.view;

                // Hide month nav in year view
                const monthNav = document.querySelector('.artguide-months');
                if (monthNav) monthNav.style.display = currentView === 'year' ? 'none' : '';

                if (currentView === 'month') {
                    renderMonthView(currentMonth);
                } else {
                    renderYearView();
                }
            });
        });

        // Filters
        document.querySelectorAll('.artguide-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.artguide-filter').forEach(b => b.classList.remove('artguide-filter--active'));
                btn.classList.add('artguide-filter--active');
                currentFilter = btn.dataset.filter;
                if (currentView === 'month') {
                    renderMonthView(currentMonth);
                } else {
                    renderYearView();
                }
            });
        });

        // Sort toggle
        document.querySelectorAll('.artguide-sort__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.artguide-sort__btn').forEach(b => b.classList.remove('artguide-sort__btn--active'));
                btn.classList.add('artguide-sort__btn--active');
                currentSort = btn.dataset.sort;
                if (currentView === 'month') {
                    renderMonthView(currentMonth);
                } else {
                    renderYearView();
                }
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

    function updateLegendCounts(viewSpecies, displayedCount) {
        // viewSpecies = all species in the current view context (month or year),
        // BEFORE any category/checked filter. This ensures legend always shows
        // "checked / total in category" against the full pool.
        const categories = ['abundant', 'regular', 'uncommon', 'rare'];
        let totalChecked = 0, totalAll = 0;
        categories.forEach(cat => {
            const el = document.getElementById('legend-count-' + cat);
            if (!el) return;
            const inCat = viewSpecies.filter(s => s.category === cat);
            const checked = inCat.filter(s => s.checked).length;
            el.textContent = `${checked}/${inCat.length}`;
            totalChecked += checked;
            totalAll += inCat.length;
        });
        const yearChecked = speciesData.filter(s => s.checked).length;
        const totalEl = document.getElementById('legend-count-total');
        if (totalEl) totalEl.textContent = `Årstotal: ${yearChecked}/${TARGET} · Visade: ${displayedCount}/${totalAll}`;
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

        // All species in this month (before category/checked filter)
        const allMonthSpecies = speciesData.filter(sp => sp.months[month] > 0);

        let monthSpecies = filterSpecies(allMonthSpecies);
        if (currentSort === 'chronological') {
            monthSpecies = sortChronological(monthSpecies);
        } else {
            monthSpecies = sortSpecies(monthSpecies, month);
        }

        const yearChecked = speciesData.filter(s => s.checked).length;

        if (heading) heading.textContent = MONTH_NAMES[month];
        if (subtitle) subtitle.textContent = '';

        // Description text
        const descEl = document.getElementById('artguide-description');
        if (descEl) {
            const totalInMonth = allMonthSpecies.length;
            const totalCheckedInMonth = allMonthSpecies.filter(sp => sp.checked).length;
            const monthName = MONTH_NAMES[month].toLowerCase();
            let desc = `${yearChecked} av ${TARGET} arter har kryssats under 2026. I ${monthName} finns ${totalInMonth} arter rapporterade genom åren, och ${totalCheckedInMonth} av dessa är kryssade.`;
            if (currentFilter && currentFilter !== 'all' && monthSpecies.length !== totalInMonth) {
                desc += ` Visar just nu: ${monthSpecies.length} arter.`;
            }
            descEl.textContent = desc;
            descEl.style.display = '';
        }

        // Render cards
        container.className = 'artguide-species artguide-species--cards';
        container.innerHTML = monthSpecies.map(sp => renderCard(sp, month)).join('');
        updateLegendCounts(allMonthSpecies, monthSpecies.length);

        // Add click handlers for expansion
        container.querySelectorAll('.artguide-card').forEach(card => {
            card.addEventListener('click', () => toggleCardExpansion(card));
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCardExpansion(card);
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

        const ariaLabel = `${sp.name}: ${label}, ${sp.total} rapporter${sp.checked ? ', kryssad ' + sp.checkDate : ''}`;

        return `
        <div class="artguide-card artguide-card--${sp.category}${checkedClass}"
             tabindex="0" role="button" aria-label="${ariaLabel}"
             data-species="${sp.name}">
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
            if (sp.checkLocation) html += `, ${sp.checkLocation}`;
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

    // --- Year/heatmap view ---
    function renderYearView() {
        const container = document.getElementById('artguide-species');
        if (!container) return;

        // Show year heading
        const monthHeading = document.querySelector('.artguide-month-heading');
        if (monthHeading) {
            monthHeading.style.display = '';
            const title = monthHeading.querySelector('.artguide-month-heading__title');
            const subtitle = monthHeading.querySelector('.artguide-month-heading__subtitle');
            const filtered0 = filterSpecies(speciesData);
            const checkedTotal = filtered0.filter(s => s.checked).length;
            if (title) title.textContent = 'Helårsöversikt';
            if (subtitle) subtitle.textContent = `${filtered0.length} arter historiskt observerade · ${checkedTotal} kryssade`;
            const descEl = document.getElementById('artguide-description');
            if (descEl) descEl.style.display = 'none';
        }

        let filtered = filterSpecies(speciesData);
        if (currentSort === 'chronological') {
            filtered = sortChronological(filtered);
        } else {
            filtered = sortSpecies(filtered, undefined);
        }

        container.className = 'artguide-species artguide-species--heatmap';

        let html = '<div class="artguide-heatmap-wrap"><table class="artguide-heatmap">';
        html += '<thead><tr><th class="artguide-heatmap__name-col">Art</th>';
        for (let i = 0; i < 12; i++) {
            const cls = i === currentMonth ? ' class="artguide-heatmap__active-month"' : '';
            html += `<th${cls}>${MONTH_NAMES[i].substring(0, 3)}</th>`;
        }
        html += '<th>Tot</th></tr></thead><tbody>';

        for (const sp of filtered) {
            const max = Math.max(...sp.months, 1);
            const checkedMark = sp.checked ? ' ✓' : '';
            const rowClass = sp.checked ? 'artguide-heatmap__row--checked' : '';

            html += `<tr class="artguide-heatmap__row artguide-heatmap__row--${sp.category} ${rowClass}">`;
            html += `<td class="artguide-heatmap__name">${sp.name}${sp.checked ? ' <span class="artguide-heatmap__checkmark">✓</span>' : ''} <span class="artguide-heatmap__latin">${sp.latin}</span></td>`;

            for (let i = 0; i < 12; i++) {
                const val = sp.months[i];
                const intensity = val > 0 ? Math.max(0.15, val / max) : 0;
                const activeClass = i === currentMonth ? ' artguide-heatmap__cell--active' : '';
                html += `<td class="artguide-heatmap__cell artguide-heatmap__cell--${sp.category}${activeClass}" style="--intensity:${intensity.toFixed(2)}" title="${val} obs i ${MONTH_NAMES[i]}">${val > 0 ? val : ''}</td>`;
            }
            html += `<td class="artguide-heatmap__total">${sp.total}</td>`;
            html += '</tr>';
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
        updateLegendCounts(speciesData, filtered.length);
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
