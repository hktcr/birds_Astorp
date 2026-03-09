/**
 * arshjul.js - Logic for the dedicated /arshjul/ gallery page
 * Implements SVG generation, IntersectionObserver for lazy-loading, and a <dialog> modal.
 */

document.addEventListener("DOMContentLoaded", () => {
    const dataUrl = "/data/species_days_historic.json";
    const gridEl = document.getElementById("arshjul-grid");
    const loadingEl = document.getElementById("arshjul-loading");

    // Modal Elements
    const modal = document.getElementById("arshjul-modal");
    const modalClose = document.getElementById("arshjul-modal-close");
    const modalTitle = document.getElementById("arshjul-modal-title");
    const modalSvgContainer = document.getElementById("arshjul-modal-svg-container");
    const modalTooltip = document.getElementById("arshjul-modal-tooltip");
    const modalTooltipCount = document.getElementById("arshjul-modal-tooltip-count");

    // Latin name lookup — populated by .then() callback, used by openModal
    let latinMap = {};

    // Pre-calculate Calendar Data (leap year, 366 days)
    const isLeapYear = true;
    const daysInMonths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
    const totalDays = 366;
    const dayAngles = [];
    let currentDayOfYear = 0;

    for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= daysInMonths[m]; d++) {
            const startAngle = (currentDayOfYear / totalDays) * 360 + 180;
            const endAngle = ((currentDayOfYear + 1) / totalDays) * 360 + 180;
            const mm = (m + 1).toString().padStart(2, '0');
            const dd = d.toString().padStart(2, '0');
            dayAngles.push({
                month: m + 1,
                day: d,
                key: `${mm}-${dd}`,
                startAngle: startAngle,
                endAngle: endAngle
            });
            currentDayOfYear++;
        }
    }

    // Geometry & Math helpers
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    function describeAnnularSegment(cx, cy, innerR, outerR, startAngle, endAngle) {
        const p1 = polarToCartesian(cx, cy, outerR, startAngle);
        const p2 = polarToCartesian(cx, cy, outerR, endAngle);
        const p3 = polarToCartesian(cx, cy, innerR, endAngle);
        const p4 = polarToCartesian(cx, cy, innerR, startAngle);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return [
            "M", p1.x, p1.y,
            "A", outerR, outerR, 0, largeArc, 1, p2.x, p2.y,
            "L", p3.x, p3.y,
            "A", innerR, innerR, 0, largeArc, 0, p4.x, p4.y,
            "Z"
        ].join(" ");
    }

    // Global fixed scale: 1 year = light, GLOBAL_MAX_YEARS+ = full saturation.
    // This ensures that rare species with 1 obs year don't appear at max intensity.
    const GLOBAL_MAX_YEARS = 5;

    function getColor(month, count) {
        if (count === 0) return "none";

        const intensity = Math.min(1, count / GLOBAL_MAX_YEARS);

        if (month >= 3 && month <= 5) {
            // Spring (Mar-May): Green
            const hue = 140;
            const lightness = 85 - (35 * intensity);
            return `hsl(${hue}, 60%, ${lightness}%)`;
        } else if (month >= 6 && month <= 8) {
            // Summer (Jun-Aug): Yellow
            const hue = 45;
            const lightness = 85 - (35 * intensity);
            return `hsl(${hue}, 100%, ${lightness}%)`;
        } else if (month >= 9 && month <= 11) {
            // Autumn (Sep-Nov): Orange/Red
            const hue = 15;
            const lightness = 85 - (35 * intensity);
            return `hsl(${hue}, 80%, ${lightness}%)`;
        } else {
            // Winter (Dec-Feb): Blue
            const hue = 210;
            const lightness = 85 - (35 * intensity);
            return `hsl(${hue}, 80%, ${lightness}%)`;
        }
    }

    /**
     * Generate an SVG DOM Element
     * @param {Object} speciesData The data object for the species: {"01-01": 2, ...}
     * @param {boolean} isInteractive Should hover tooltips be attached? (true for modal, false for grid)
     * @returns {SVGElement}
     */
    function createSVG(speciesData, isInteractive = false, checkDate = null) {
        const innerRadius = 80;
        const outerRadius = 100;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "-120 -120 240 240");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.maxHeight = "100%";
        svg.style.display = "block";
        svg.style.overflow = "visible";

        // Background track
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bg.setAttribute("cx", "0");
        bg.setAttribute("cy", "0");
        bg.setAttribute("r", "90");
        bg.setAttribute("fill", "none");
        bg.setAttribute("stroke", "#f8fafc");
        bg.setAttribute("stroke-width", "20");
        svg.appendChild(bg);

        // Month lines
        let curDay = 0;
        for (let m = 0; m < 12; m++) {
            const monthStartAngle = (curDay / totalDays) * 360 + 180;
            const divider = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const p1 = polarToCartesian(0, 0, innerRadius - 5, monthStartAngle);
            const p2 = polarToCartesian(0, 0, outerRadius + 5, monthStartAngle);
            divider.setAttribute("x1", p1.x);
            divider.setAttribute("y1", p1.y);
            divider.setAttribute("x2", p2.x);
            divider.setAttribute("y2", p2.y);
            divider.setAttribute("stroke", "#e2e8f0");
            divider.setAttribute("stroke-width", "1");
            svg.appendChild(divider);

            const labelMidAngle = monthStartAngle + ((daysInMonths[m] / totalDays) * 360) / 2;
            const labelPos = polarToCartesian(0, 0, outerRadius + 15, labelMidAngle);
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", labelPos.x);
            label.setAttribute("y", labelPos.y);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
            label.setAttribute("font-size", "8");
            label.setAttribute("fill", "#94a3b8");
            label.textContent = monthNames[m];
            svg.appendChild(label);

            curDay += daysInMonths[m];
        }

        // Calc stats
        let activeDays = 0;
        for (const key in speciesData) {
            if (speciesData[key] > 0) activeDays++;
        }

        // Central text
        const textCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textCount.setAttribute("x", "0");
        textCount.setAttribute("y", "0");
        textCount.setAttribute("text-anchor", "middle");
        textCount.setAttribute("dominant-baseline", "middle");
        textCount.setAttribute("font-size", "24");
        textCount.setAttribute("font-weight", "bold");
        textCount.setAttribute("fill", "#334155");
        textCount.textContent = activeDays;
        svg.appendChild(textCount);

        const textLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textLabel.setAttribute("x", "0");
        textLabel.setAttribute("y", "20");
        textLabel.setAttribute("text-anchor", "middle");
        textLabel.setAttribute("font-size", "10");
        textLabel.setAttribute("fill", "#64748b");
        textLabel.textContent = "Dagar";
        svg.appendChild(textLabel);

        // Segments
        const segmentsGrp = document.createElementNS("http://www.w3.org/2000/svg", "g");
        svg.appendChild(segmentsGrp);

        dayAngles.forEach(da => {
            const count = speciesData[da.key] || 0;
            if (count > 0) {
                const color = getColor(da.month, count);
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", describeAnnularSegment(0, 0, innerRadius, outerRadius, da.startAngle - 0.2, da.endAngle + 0.2));
                path.setAttribute("fill", color);

                if (isInteractive) {
                    path.style.transition = "fill 0.2s";
                    path.style.cursor = "crosshair";

                    path.addEventListener("mouseenter", (e) => {
                        path.setAttribute("fill", "#f87171"); // Hover highlight

                        modalTooltipDate.textContent = `${da.day} ${monthNames[da.month - 1]}`;
                        modalTooltipCount.textContent = `Observerats under ${count} olika år`;

                        // We use bounding box of the modal container to position absolute tooltip
                        const containerRect = modalSvgContainer.getBoundingClientRect();
                        modalTooltip.style.left = `${e.clientX - containerRect.left}px`;
                        modalTooltip.style.top = `${e.clientY - containerRect.top - 10}px`;
                        modalTooltip.style.opacity = 1;
                    });

                    path.addEventListener("mouseleave", () => {
                        path.setAttribute("fill", color);
                        modalTooltip.style.opacity = 0;
                    });
                }

                segmentsGrp.appendChild(path);
            }
        });

        // Today marker — small red tick outside the wheel
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const diff = now - startOfYear;
        const oneDay = 1000 * 60 * 60 * 24;
        const todayDOY = Math.floor(diff / oneDay) - 1; // 0-indexed
        const todayAngle = (todayDOY / totalDays) * 360 + 180;
        const tickInner = polarToCartesian(0, 0, outerRadius + 3, todayAngle);
        const tickOuter = polarToCartesian(0, 0, outerRadius + 10, todayAngle);
        const todayTick = document.createElementNS("http://www.w3.org/2000/svg", "line");
        todayTick.setAttribute("x1", tickInner.x);
        todayTick.setAttribute("y1", tickInner.y);
        todayTick.setAttribute("x2", tickOuter.x);
        todayTick.setAttribute("y2", tickOuter.y);
        todayTick.setAttribute("stroke", "#dc2626");
        todayTick.setAttribute("stroke-width", "2");
        todayTick.setAttribute("stroke-linecap", "round");
        svg.appendChild(todayTick);

        // Check-date marker — green tick outside the wheel (same radius as today)
        if (checkDate) {
            const checkD = new Date(checkDate);
            const checkStartOfYear = new Date(checkD.getFullYear(), 0, 0);
            const checkDOY = Math.floor((checkD - checkStartOfYear) / oneDay) - 1;
            const checkAngle = (checkDOY / totalDays) * 360 + 180;
            const checkInner = polarToCartesian(0, 0, outerRadius + 3, checkAngle);
            const checkOuter = polarToCartesian(0, 0, outerRadius + 10, checkAngle);
            const checkTick = document.createElementNS("http://www.w3.org/2000/svg", "line");
            checkTick.setAttribute("x1", checkInner.x);
            checkTick.setAttribute("y1", checkInner.y);
            checkTick.setAttribute("x2", checkOuter.x);
            checkTick.setAttribute("y2", checkOuter.y);
            checkTick.setAttribute("stroke", "#22c55e");
            checkTick.setAttribute("stroke-width", "2.5");
            checkTick.setAttribute("stroke-linecap", "round");
            svg.appendChild(checkTick);
        }

        return svg;
    }

    // Modal behavior
    function openModal(speciesName, slug, speciesData, checkDate) {
        modalTitle.textContent = speciesName;

        // Show latin name below title
        let modalLatin = document.getElementById("arshjul-modal-latin");
        if (!modalLatin) {
            modalLatin = document.createElement("p");
            modalLatin.id = "arshjul-modal-latin";
            modalLatin.style.cssText = "font-style:italic; color:#94a3b8; font-size:1rem; margin:0.15rem 0 0 0;";
            modalTitle.insertAdjacentElement("afterend", modalLatin);
        }
        modalLatin.textContent = latinMap[speciesName] || "";

        // Clear previous SVG
        const oldSvg = modalSvgContainer.querySelector("svg");
        if (oldSvg) oldSvg.remove();

        // Hide tooltip just in case
        modalTooltip.style.opacity = 0;

        // Render interactive SVG (pass checkDate for green tick)
        const interactiveSvg = createSVG(speciesData, true, checkDate);
        modalSvgContainer.appendChild(interactiveSvg);

        modal.showModal();
        document.body.style.overflow = "hidden"; // Prevent background scroll
    }

    modalClose.addEventListener("click", () => {
        modal.close();
    });

    // Click outside to close (backdrop click)
    modal.addEventListener("click", (e) => {
        const dialogDimensions = modal.getBoundingClientRect();
        if (
            e.clientX < dialogDimensions.left ||
            e.clientX > dialogDimensions.right ||
            e.clientY < dialogDimensions.top ||
            e.clientY > dialogDimensions.bottom
        ) {
            modal.close();
        }
    });

    modal.addEventListener("close", () => {
        document.body.style.overflow = "";
    });

    // Fetch master JSON and category/checklist data, then init grid
    const guideUrl = "/data/species-guide.json";
    const checklistUrl = "/data/checklist-2026.json";

    Promise.all([
        fetch(dataUrl).then(r => r.json()),
        fetch(guideUrl).then(r => r.json()).catch(() => null),
        fetch(checklistUrl).then(r => r.json()).catch(() => null)
    ])
        .then(([data, guideData, checklistData]) => {
            window._arshjulData = data;
            if (loadingEl) loadingEl.remove();

            // Build category + latin lookup from species-guide.json
            const categoryMap = {};
            if (guideData && guideData.species) {
                guideData.species.forEach(sp => {
                    categoryMap[sp.name] = sp.category || "regular";
                    if (sp.latin) latinMap[sp.name] = sp.latin;
                });
            }

            // Build checklist lookup (species → earliest date + latin)
            const checkedMap = new Map();
            if (checklistData && checklistData.observations) {
                checklistData.observations.forEach(entry => {
                    if (entry.species) {
                        const existing = checkedMap.get(entry.species);
                        if (!existing || entry.date < existing.date) {
                            checkedMap.set(entry.species, { date: entry.date, latin: entry.latin || "" });
                        }
                    }
                });
            }

            // Add checklist species NOT in species-guide to categoryMap + latinMap
            // so they appear in the årshjul grid even without historical data
            for (const [species, info] of checkedMap) {
                if (!(species in categoryMap)) {
                    categoryMap[species] = "new";
                    if (info.latin) latinMap[species] = info.latin;
                }
            }

            // Taxonomic sorting using the index passed from Hugo
            const taxaIndex = {};
            if (window.arshjulTaxonomy) {
                window.arshjulTaxonomy.forEach((name, i) => {
                    taxaIndex[name] = i;
                });
            }

            // Include species from historic data that are in the guide OR new from checklist
            // (skip _meta key which is metadata, not a species)
            const speciesFromData = Object.keys(data).filter(name => name !== '_meta' && name in categoryMap);
            // Also include checklist species that have no historic data at all
            const checklistOnly = [...checkedMap.keys()].filter(name => !(name in data) && name in categoryMap);
            const allSpecies = [...new Set([...speciesFromData, ...checklistOnly])]
                .sort((a, b) => {
                    const idxA = taxaIndex[a] ?? 99999;
                    const idxB = taxaIndex[b] ?? 99999;
                    if (idxA !== idxB) return idxA - idxB;
                    return a.localeCompare(b);
                });

            // Intersection Observer for Lazy Loading
            // Render when Card is within 200px of Viewport
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        const speciesName = card.dataset.species;
                        const svgWrapper = card.querySelector('.arshjul-card-svg-wrapper');

                        if (!svgWrapper.hasChildNodes()) {
                            // First time rendering! Use empty data if species has no historic records
                            const cardCheckDate = card.dataset.checkdate || null;
                            const svg = createSVG(data[speciesName] || {}, false, cardCheckDate);
                            svgWrapper.appendChild(svg);

                            // Let layout settle, then fade in
                            requestAnimationFrame(() => {
                                svgWrapper.classList.add('loaded');
                            });
                        }

                        // We don't unobserve, because we might want to unmount SVGs if we ever run 
                        // out of memory on huge datasets, but for ~100 SVGs it's fine.
                        // obs.unobserve(card); 
                    }
                });
            }, { rootMargin: "200px 0px" });

            allSpecies.forEach(species => {
                const slug = species.toLowerCase().replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                const category = categoryMap[species] || "regular";
                const isChecked = checkedMap.has(species);
                const checkInfo = checkedMap.get(species) || null;
                const checkDate = checkInfo ? checkInfo.date : null;

                const card = document.createElement("div");
                card.className = "arshjul-card";
                card.dataset.species = species;
                card.dataset.category = category;
                card.dataset.checked = isChecked ? "true" : "false";

                // Store check date on card for lazy SVG rendering
                if (isChecked && checkDate) {
                    card.dataset.checkdate = checkDate;
                }

                // ── Checked badge (green circle with ✓) ──
                if (isChecked) {
                    const badge = document.createElement("div");
                    badge.className = "arshjul-card-badge";
                    badge.title = checkDate ? `Kryssad ${checkDate}` : 'Kryssad 2026';
                    badge.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22">
                        <circle cx="11" cy="11" r="10" fill="#22c55e"/>
                        <path d="M6.5 11.5 L9.5 14.5 L15.5 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </svg>`;
                    card.appendChild(badge);
                }

                const header = document.createElement("h3");
                header.textContent = species;
                card.appendChild(header);

                // Latin name below species name
                if (latinMap[species]) {
                    const latin = document.createElement("p");
                    latin.textContent = latinMap[species];
                    latin.style.cssText = "font-style:italic; color:#94a3b8; font-size:0.75rem; margin:0 0 0.25rem 0; line-height:1;";
                    card.appendChild(latin);
                }

                const svgWrapper = document.createElement("div");
                svgWrapper.className = "arshjul-card-svg-wrapper";
                card.appendChild(svgWrapper);

                // Add click listener for Modal — use empty data if species has no historic records
                const speciesData = data[species] || {};
                card.addEventListener("click", () => {
                    openModal(species, slug, speciesData, card.dataset.checkdate || null);
                });

                gridEl.appendChild(card);

                // Start observing
                observer.observe(card);
            });

            // ── FILTER LOGIC ──
            const filterContainer = document.getElementById("arshjul-filters");
            const filterBtns = filterContainer ? filterContainer.querySelectorAll(".arshjul-filter-btn") : [];
            const searchInput = document.getElementById("arshjul-search");

            function updateGrid() {
                // Determine active category filter
                let activeFilter = "alla";
                const activeBtn = Array.from(filterBtns).find(b => b.classList.contains("arshjul-filter-btn--active"));
                if (activeBtn) activeFilter = activeBtn.dataset.filter;

                // Determine active text search
                const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

                const cards = gridEl.querySelectorAll(".arshjul-card");
                cards.forEach(card => {
                    const species = card.dataset.species.toLowerCase();
                    let showCategory = false;

                    // Match category
                    if (activeFilter === "alla") {
                        showCategory = true;
                    } else if (activeFilter === "checked") {
                        showCategory = card.dataset.checked === "true";
                    } else if (activeFilter === "missing") {
                        showCategory = card.dataset.checked === "false";
                    } else {
                        showCategory = card.dataset.category === activeFilter;
                    }

                    // Match search text
                    const showSearch = query === "" || species.includes(query);

                    card.style.display = (showCategory && showSearch) ? "" : "none";
                });
            }

            if (filterBtns.length > 0) {
                filterBtns.forEach(btn => {
                    btn.addEventListener("click", () => {
                        // Update active state visually
                        filterBtns.forEach(b => {
                            b.classList.remove("arshjul-filter-btn--active");
                            b.style.background = "white";
                            b.style.color = "#374151";
                        });
                        btn.classList.add("arshjul-filter-btn--active");
                        btn.style.background = "#2d5016";
                        btn.style.color = "white";

                        // Apply filters
                        updateGrid();
                    });
                });
            }

            // ── RECOMMENDATION ENGINE ──
            const RECOMMENDATION_MIN_YEARS = 2;
            const RECOMMENDATION_RARE_MAX_TOTAL = 5;

            const dropdown = document.getElementById("arshjul-recommendations-dropdown");
            const recsContent = document.getElementById("arshjul-recs-content");
            const recsLoading = document.getElementById("arshjul-recs-loading");

            function generateRecommendations() {
                if (recsContent.innerHTML !== "") return; // Already generated

                const today = new Date();
                const startOfYear = new Date(today.getFullYear(), 0, 0);
                const todayDOY = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) - 1;

                const possibleNow = [];
                const arrivingSoon = [];
                const rarities = [];

                for (const species in data) {
                    if (species === '_meta' || !categoryMap[species]) continue;

                    const isChecked2026 = checkedMap.has(species);
                    const obsData = data[species];
                    let totalDays = 0;
                    let maxYearsNow = 0; // [-3, +3] window
                    let maxYearsSoon = 0; // [+4, +14] window
                    let soonOffset = 999;

                    for (let i = 0; i < dayAngles.length; i++) {
                        const count = obsData[dayAngles[i].key] || 0;
                        if (count > 0) {
                            totalDays++;

                            // Calculate diff from today, wrapping around 366
                            let diff = i - todayDOY;
                            if (diff < -183) diff += 366;
                            if (diff > 183) diff -= 366;

                            if (diff >= -3 && diff <= 3) {
                                if (count > maxYearsNow) maxYearsNow = count;
                            } else if (diff >= 4 && diff <= 14) {
                                if (count > maxYearsSoon) maxYearsSoon = count;
                                if (diff < soonOffset) soonOffset = diff;
                            }
                        }
                    }

                    if (totalDays === 0) continue;

                    // Categorize
                    if (totalDays <= RECOMMENDATION_RARE_MAX_TOTAL) {
                        if (maxYearsNow > 0) {
                            rarities.push({ name: species });
                        }
                    } else if (!isChecked2026) {
                        if (maxYearsNow >= RECOMMENDATION_MIN_YEARS) {
                            possibleNow.push({ name: species });
                        } else if (maxYearsSoon >= RECOMMENDATION_MIN_YEARS) {
                            arrivingSoon.push({ name: species, offset: soonOffset });
                        }
                    }
                }

                // Sort arriving soon by how close they are
                arrivingSoon.sort((a, b) => a.offset - b.offset);

                // Build HTML
                let html = "";

                function buildGroup(title, items, icon) {
                    if (items.length === 0) return "";
                    let res = `<div style="margin-bottom: 1.5rem;"><h4 style="margin:0 0 0.75rem 0; font-size:0.75rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; font-weight:700;">${title}</h4><div style="display:flex; flex-wrap:wrap; gap:0.5rem;">`;
                    items.slice(0, 10).forEach(item => {  // Max 10 per category to keep it clean
                        res += `<button class="rec-chip" data-species="${item.name}" style="background:#f1f5f9; border:1px solid #e2e8f0; border-radius:999px; padding:0.4rem 0.85rem; font-size:0.9rem; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.background='#f1f5f9'; this.style.borderColor='#e2e8f0';">${icon} ${item.name}</button>`;
                    });
                    res += `</div></div>`;
                    return res;
                }

                html += buildGroup("📍 Möjliga just nu", possibleNow, "");
                html += buildGroup("⏳ I antågande", arrivingSoon, "");
                html += buildGroup("⭐ Aktuella rariteter", rarities, "⭐");

                if (html === "") {
                    html = `<p style="text-align:center; color:#94a3b8; font-size:0.9rem; margin:1rem 0;">Inga specifika fågeltips just nu.</p>`;
                }

                recsContent.innerHTML = html;
                recsLoading.style.display = "none";
                recsContent.style.display = "block";

                // Add click events to chips
                const chips = recsContent.querySelectorAll('.rec-chip');
                chips.forEach(chip => {
                    chip.addEventListener('click', (e) => {
                        e.preventDefault();
                        dropdown.style.display = "none";

                        const speciesName = chip.dataset.species;
                        const checkInfo = checkedMap.get(speciesName) || null;
                        const checkDate = checkInfo ? checkInfo.date : null;
                        const slug = speciesName.toLowerCase().replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o").replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                        openModal(speciesName, slug, data[speciesName] || {}, checkDate);
                    });
                });
            }

            if (searchInput) {
                searchInput.addEventListener("focus", () => {
                    if (searchInput.value.trim() === "") {
                        dropdown.style.display = "block";
                        generateRecommendations();
                    }
                });

                searchInput.addEventListener("input", () => {
                    updateGrid();
                    if (searchInput.value.trim() !== "") {
                        dropdown.style.display = "none";
                    } else {
                        dropdown.style.display = "block";
                        generateRecommendations();
                    }
                });

                let blurTimeout;
                searchInput.addEventListener("blur", () => {
                    // Small timeout to allow clicks inside the dropdown to register
                    blurTimeout = setTimeout(() => {
                        dropdown.style.display = "none";
                    }, 200);
                });

                if (dropdown) {
                    // Prevent hiding if clicking inside the dropdown
                    dropdown.addEventListener("mousedown", (e) => {
                        e.preventDefault();
                    });
                }
            }

        })
        .catch(e => {
            console.error(e);
            if (loadingEl) loadingEl.textContent = "Kunde inte ladda data.";
        });

});


// Expose openModal to global scope for artguide.js
window.openArshjulModalForSpecies = function (speciesName, checkDate) {
    if (window._arshjulData && window._arshjulData[speciesName]) {
        // We recreate slug logic here
        const slug = speciesName.toLowerCase().replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        openModal(speciesName, slug, window._arshjulData[speciesName], checkDate);
    } else {
        console.warn("No data for species", speciesName);
    }
};
