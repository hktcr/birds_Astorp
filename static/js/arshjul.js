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
    const GLOBAL_MAX_YEARS = 8;

    function getColor(month, count) {
        if (count === 0) return "none";
        const isSummer = (month >= 5 && month <= 9);
        const intensity = Math.min(1, count / GLOBAL_MAX_YEARS);

        if (isSummer) {
            const hue = 50 - (20 * intensity);
            const lightness = 65 - (15 * intensity);
            return `hsl(${hue}, 100%, ${lightness}%)`;
        } else {
            const lightness = 80 - (40 * intensity);
            return `hsl(210, 90%, ${lightness}%)`;
        }
    }

    /**
     * Generate an SVG DOM Element
     * @param {Object} speciesData The data object for the species: {"01-01": 2, ...}
     * @param {boolean} isInteractive Should hover tooltips be attached? (true for modal, false for grid)
     * @returns {SVGElement}
     */
    function createSVG(speciesData, isInteractive = false) {
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

        return svg;
    }

    // Modal behavior
    function openModal(speciesName, slug, speciesData) {
        modalTitle.textContent = speciesName;
        modalTitle.textContent = speciesName;

        // Clear previous SVG
        const oldSvg = modalSvgContainer.querySelector("svg");
        if (oldSvg) oldSvg.remove();

        // Hide tooltip just in case
        modalTooltip.style.opacity = 0;

        // Render interactive SVG
        const interactiveSvg = createSVG(speciesData, true);
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
            if (loadingEl) loadingEl.remove();

            // Build category lookup from species-guide.json
            const categoryMap = {};
            if (guideData && guideData.species) {
                guideData.species.forEach(sp => {
                    categoryMap[sp.name] = sp.category || "regular";
                });
            }

            // Build checklist lookup
            const checkedSet = new Set();
            if (checklistData && checklistData.observations) {
                checklistData.observations.forEach(entry => {
                    if (entry.species) checkedSet.add(entry.species);
                });
            }

            // Taxonomic sorting using the index passed from Hugo
            const taxaIndex = {};
            if (window.arshjulTaxonomy) {
                window.arshjulTaxonomy.forEach((name, i) => {
                    taxaIndex[name] = i;
                });
            }

            const allSpecies = Object.keys(data)
                .filter(name => name in categoryMap) // Only show curated species from guide
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
                            // First time rendering!
                            const svg = createSVG(data[speciesName], false); // false = non interactive tooltips
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
                const isChecked = checkedSet.has(species);

                const card = document.createElement("div");
                card.className = "arshjul-card";
                card.dataset.species = species;
                card.dataset.category = category;
                card.dataset.checked = isChecked ? "true" : "false";

                const header = document.createElement("h3");
                header.textContent = species;
                card.appendChild(header);

                const svgWrapper = document.createElement("div");
                svgWrapper.className = "arshjul-card-svg-wrapper";
                card.appendChild(svgWrapper);

                // Add click listener for Modal
                card.addEventListener("click", () => {
                    openModal(species, slug, data[species]);
                });

                gridEl.appendChild(card);

                // Start observing
                observer.observe(card);
            });

            // ── FILTER LOGIC ──
            const filterContainer = document.getElementById("arshjul-filters");
            if (filterContainer) {
                const filterBtns = filterContainer.querySelectorAll(".arshjul-filter-btn");
                filterBtns.forEach(btn => {
                    btn.addEventListener("click", () => {
                        // Update active state
                        filterBtns.forEach(b => {
                            b.classList.remove("arshjul-filter-btn--active");
                            b.style.background = "white";
                            b.style.color = "#374151";
                        });
                        btn.classList.add("arshjul-filter-btn--active");
                        btn.style.background = "#2d5016";
                        btn.style.color = "white";

                        const filter = btn.dataset.filter;
                        const cards = gridEl.querySelectorAll(".arshjul-card");
                        cards.forEach(card => {
                            let show = false;
                            if (filter === "alla") {
                                show = true;
                            } else if (filter === "checked") {
                                show = card.dataset.checked === "true";
                            } else if (filter === "missing") {
                                show = card.dataset.checked === "false";
                            } else {
                                show = card.dataset.category === filter;
                            }
                            card.style.display = show ? "" : "none";
                        });
                    });
                });
            }

        })
        .catch(e => {
            console.error(e);
            if (loadingEl) loadingEl.textContent = "Kunde inte ladda data.";
        });

});

