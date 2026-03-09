/**
 * aktuellt.js - Logic for the dedicated /aktuellt/ recommendations page.
 * Fetches JSON bird data, performs time-window filtering, and renders UI components.
 */

document.addEventListener("DOMContentLoaded", () => {
    // We only execute on the /aktuellt page where #aktuellt-app exists
    const appEl = document.getElementById("aktuellt-app");
    if (!appEl) return;

    const dataUrl = "/data/species_days_historic.json";
    const guideUrl = "/data/species-guide.json";
    const checklistUrl = "/data/checklist-2026.json";

    const loadingEl = document.getElementById("aktuellt-loading");
    const contentEl = document.getElementById("aktuellt-content");

    // UI Containers
    const gridPossible = document.getElementById("grid-possible");
    const timelineArriving = document.getElementById("timeline-arriving");
    const gridRarities = document.getElementById("grid-rarities");

    // Algorithm constants (must match arshjul.js precisely)
    const RECOMMENDATION_MIN_YEARS = 2;
    const RECOMMENDATION_RARE_MAX_TOTAL = 5;

    // Helper: Day Angles (re-creating the 366-day array used in arshjul.js)
    const daysInMonths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
    const dayAngles = [];
    let currentDayOfYear = 0;

    // Reverse lookup day of year -> "14 April" string
    const doyToString = [];

    for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= daysInMonths[m]; d++) {
            const mm = (m + 1).toString().padStart(2, '0');
            const dd = d.toString().padStart(2, '0');
            dayAngles.push({
                month: m + 1,
                day: d,
                key: `${mm}-${dd}`
            });
            doyToString[currentDayOfYear] = `${d} ${monthNames[m].toLowerCase()}`;
            currentDayOfYear++;
        }
    }

    Promise.all([
        fetch(dataUrl).then(r => r.json()),
        fetch(guideUrl).then(r => r.json()).catch(() => null),
        fetch(checklistUrl).then(r => r.json()).catch(() => null)
    ])
        .then(([data, guideData, checklistData]) => {
            // Build Lookups
            const categoryMap = {};
            const latinMap = {};
            if (guideData && guideData.species) {
                guideData.species.forEach(sp => {
                    categoryMap[sp.name] = sp.category || "regular";
                    if (sp.latin) latinMap[sp.name] = sp.latin;
                });
            }

            const checkedMap = new Map();
            if (checklistData && checklistData.observations) {
                checklistData.observations.forEach(entry => {
                    if (entry.species && (!checkedMap.has(entry.species) || entry.date < checkedMap.get(entry.species).date)) {
                        checkedMap.set(entry.species, { date: entry.date, latin: entry.latin || "" });
                    }
                });
            }

            // Calculation
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
                let maxYearsNow = 0;
                let maxYearsSoon = 0;
                let soonOffset = 999;
                let bestNowDOY = -1; // Specific day with highest observation count in the Now window

                for (let i = 0; i < dayAngles.length; i++) {
                    const count = obsData[dayAngles[i].key] || 0;
                    if (count > 0) {
                        totalDays++;

                        let diff = i - todayDOY;
                        if (diff < -183) diff += 366;
                        if (diff > 183) diff -= 366;

                        if (diff >= -3 && diff <= 3) {
                            if (count > maxYearsNow) {
                                maxYearsNow = count;
                                bestNowDOY = i;
                            }
                        } else if (diff >= 4 && diff <= 14) {
                            if (count > maxYearsSoon) {
                                maxYearsSoon = count;
                            }
                            if (diff < soonOffset) {
                                soonOffset = diff;
                            }
                        }
                    }
                }

                if (totalDays === 0) continue;

                // Build slugs for modals
                const slug = species.toLowerCase().replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                const clickHandler = `if(window.openArshjulModalForSpecies) window.openArshjulModalForSpecies('${species}')`;

                if (totalDays <= RECOMMENDATION_RARE_MAX_TOTAL) {
                    if (maxYearsNow > 0) {
                        rarities.push({ name: species, total: totalDays, bestDoy: bestNowDOY, slug: slug, action: clickHandler });
                    }
                } else if (!isChecked2026) {
                    if (maxYearsNow >= RECOMMENDATION_MIN_YEARS) {
                        possibleNow.push({ name: species, maxYears: maxYearsNow, slug: slug, action: clickHandler });
                    } else if (maxYearsSoon >= RECOMMENDATION_MIN_YEARS) {
                        arrivingSoon.push({ name: species, offset: soonOffset, maxYears: maxYearsSoon, slug: slug, action: clickHandler });
                    }
                }
            }

            // Sorting
            possibleNow.sort((a, b) => b.maxYears - a.maxYears); // Sort by highest frequency
            arrivingSoon.sort((a, b) => a.offset - b.offset); // Sort by soonest arrival

            // --- Render UI ---

            // 1. Render Possible Now (Cards)
            if (possibleNow.length === 0) {
                gridPossible.innerHTML = `<p style="color:#64748b; margin-top:0;">Wow, du verkar ha kryssat alla vanliga arter för den här perioden!</p>`;
            } else {
                possibleNow.forEach(item => {
                    const card = document.createElement("div");
                    card.className = "aktuellt-card";
                    card.setAttribute("onclick", item.action);

                    // Färgkodning baserad på "förväntad" (>=4 år) vs "möjlig"
                    const isHigh = item.maxYears >= 4;
                    const bgCol = isHigh ? "#f0fdf4" : "#fffbeb";
                    const borderCol = isHigh ? "#bbf7d0" : "#fde68a";
                    const textCol = isHigh ? "#16a34a" : "#d97706";
                    const mainTextCol = isHigh ? "#14532d" : "#78350f";

                    card.style.background = bgCol;
                    card.style.borderColor = borderCol;

                    const probText = isHigh ? `<span style="color:${textCol}; font-weight:600; font-size:0.85rem;">Förväntad (setts ${item.maxYears} år)</span>` : `<span style="color:${textCol}; font-size:0.85rem;">Möjlig (setts ${item.maxYears} år)</span>`;

                    card.innerHTML = `
                    <div>
                        <h3 style="margin:0 0 0.25rem 0; font-size:1.1rem; color:${mainTextCol};">${item.name}</h3>
                        ${probText}
                    </div>
                    <svg width="20" height="20" fill="none" stroke="${borderCol}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="color: ${textCol}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                `;
                    gridPossible.appendChild(card);
                });
            }

            // 2. Render Arriving Soon (Timeline)
            if (arrivingSoon.length === 0) {
                timelineArriving.innerHTML = `<p style="color:#64748b; margin-top:0;">Inga nya specifika arter på ingång de närmaste 2 veckorna, det är lugnt i markerna.</p>`;
            } else {
                // Group by offset day
                const groupedSoon = {};
                arrivingSoon.forEach(item => {
                    if (!groupedSoon[item.offset]) groupedSoon[item.offset] = [];
                    groupedSoon[item.offset].push(item);
                });

                for (const offsetStr of Object.keys(groupedSoon).sort((a, b) => parseInt(a) - parseInt(b))) {
                    const offset = parseInt(offsetStr);
                    const speciesArr = groupedSoon[offsetStr];

                    let targetDOY = todayDOY + offset;
                    if (targetDOY > 365) targetDOY -= 366;
                    const dateStr = doyToString[targetDOY];
                    const dayText = offset === 1 ? "I morgon" : `Om ${offset} dagar`;

                    const node = document.createElement("div");
                    node.className = "aktuellt-timeline-node";

                    let speciesHTML = speciesArr.map(item => {
                        const isHigh = item.maxYears >= 4;
                        const bgCol = isHigh ? "#f0fdf4" : "#fffbeb";
                        const borderCol = isHigh ? "#bbf7d0" : "#fde68a";
                        const textCol = isHigh ? "#14532d" : "#78350f";
                        const subTextCol = isHigh ? "#16a34a" : "#d97706";

                        return `
                        <div class="aktuellt-card" style="margin-top:0.5rem; display:inline-flex; flex-direction:column; width:auto; padding:0.75rem 1.25rem; margin-right:0.5rem; background:${bgCol}; border-color:${borderCol};" onclick="${item.action}">
                            <span style="font-weight:600; color:${textCol};">${item.name}</span>
                            <span style="font-size:0.75rem; color:${subTextCol}; margin-top:0.15rem;">${isHigh ? 'Förväntad' : 'Möjlig'}</span>
                        </div>
                        `;
                    }).join('');

                    node.innerHTML = `
                    <div class="aktuellt-timeline-marker"></div>
                    <div>
                        <span style="font-size:0.85rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">${dayText} <span style="font-weight:400;">(${dateStr})</span></span>
                        <div style="margin-top:0.25rem;">
                            ${speciesHTML}
                        </div>
                    </div>
                `;
                    timelineArriving.appendChild(node);
                }
            }

            // 3. Render Rarities (Cards)
            if (rarities.length === 0) {
                document.getElementById("section-rarities").style.display = "none";
            } else {
                rarities.forEach(item => {
                    const card = document.createElement("div");
                    card.className = "aktuellt-card";
                    card.setAttribute("onclick", item.action);

                    // Rariteter får en mjuk röd/lila färgkodning istället för stjärna
                    card.style.background = "#fff1f2";
                    card.style.borderColor = "#fecdd3";

                    card.innerHTML = `
                    <div>
                        <h3 style="margin:0 0 0.25rem 0; font-size:1.1rem; color:#881337; display:flex; align-items:center; gap:0.5rem;">${item.name}</h3>
                        <span style="color:#be123c; font-size:0.85rem;">Historiskt obsad ${doyToString[item.bestDoy]}. (Totalt ${item.total} obs-dagar någonsin)</span>
                    </div>
                    <svg width="20" height="20" fill="none" stroke="#fda4af" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                `;
                    gridRarities.appendChild(card);
                });
            }

            // Hide loading, show content
            loadingEl.style.display = "none";
            contentEl.style.display = "block";

        })
        .catch(err => {
            console.error("Error loading dates for /aktuellt :", err);
            if (loadingEl) loadingEl.textContent = "Kunde hoppeligen inte ladda data. Försök ladda om sidan.";
        });

});
