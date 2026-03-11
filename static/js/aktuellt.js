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

                let sumNow = 0;
                let sumSoon = 0;
                let soonOffset = 999;
                let bestNowDOY = -1;
                let maxSingleDayNow = 0; // Bara för att spara en historisk peak för rariteter

                for (let i = 0; i < dayAngles.length; i++) {
                    const count = obsData[dayAngles[i].key] || 0;
                    if (count > 0) {
                        totalDays++;

                        let diff = i - todayDOY;
                        if (diff < -183) diff += 366;
                        if (diff > 183) diff -= 366;

                        // Möjlig just nu: +/- 7 dagar
                        if (diff >= -7 && diff <= 7) {
                            sumNow += count;
                            if (count > maxSingleDayNow) {
                                maxSingleDayNow = count;
                                bestNowDOY = i;
                            }
                        }
                        // I Antågande: Nästkommande två veckorna (+8 till +21 dagar)
                        else if (diff >= 8 && diff <= 21) {
                            sumSoon += count;
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
                    if (sumNow > 0) {
                        rarities.push({ name: species, total: totalDays, bestDoy: bestNowDOY, slug: slug, action: clickHandler });
                    }
                } else if (!isChecked2026) {
                    const cat = categoryMap[species] || 'regular';
                    // Kravet: Minst 2 historiska observationer under hela 14-dagarsfönstret
                    if (sumNow >= RECOMMENDATION_MIN_YEARS) {
                        possibleNow.push({ name: species, sumNow: sumNow, category: cat, totalDays: totalDays, slug: slug, action: clickHandler });
                    } else if (sumSoon >= RECOMMENDATION_MIN_YEARS) {
                        arrivingSoon.push({ name: species, offset: soonOffset, sumNow: sumSoon, category: cat, totalDays: totalDays, slug: slug, action: clickHandler });
                    }
                }
            }

            // --- Klassificeringslogik (2×2: category × tidssignal) ---
            function getClassification(category, sumNow) {
                const strong = sumNow >= 4;
                if (category === 'abundant') {
                    return strong
                        ? { label: 'Förväntad',     sublabel: 'Vanlig art — aktiv period',         bgCol: '#f0fdf4', borderCol: '#bbf7d0', textCol: '#16a34a', mainCol: '#14532d' }
                        : { label: 'Tidig ankomst',  sublabel: 'Vanlig art — tidig säsong',         bgCol: '#fffbeb', borderCol: '#fde68a', textCol: '#d97706', mainCol: '#78350f' };
                } else if (category === 'regular') {
                    return strong
                        ? { label: 'Aktuell',        sublabel: 'Regelbunden art — aktiv period',    bgCol: '#f0fdf4', borderCol: '#bbf7d0', textCol: '#16a34a', mainCol: '#14532d' }
                        : { label: 'Kan dyka upp',   sublabel: 'Regelbunden art — tidig säsong',    bgCol: '#fffbeb', borderCol: '#fde68a', textCol: '#d97706', mainCol: '#78350f' };
                } else {
                    // uncommon
                    return     { label: 'Möjlig',        sublabel: 'Ovanlig art i Åstorp',              bgCol: '#fffbeb', borderCol: '#fde68a', textCol: '#d97706', mainCol: '#78350f' };
                }
            }

            // Sorting: abundant först, sedan fallande tidssignal
            const catOrder = { abundant: 0, regular: 1, uncommon: 2 };
            possibleNow.sort((a, b) => {
                const ca = catOrder[a.category] !== undefined ? catOrder[a.category] : 2;
                const cb = catOrder[b.category] !== undefined ? catOrder[b.category] : 2;
                if (ca !== cb) return ca - cb;
                return b.sumNow - a.sumNow;
            });
            arrivingSoon.sort((a, b) => a.offset - b.offset);

            // --- Render UI ---

            // 1. Render Aktuella arter (Cards)
            if (possibleNow.length === 0) {
                gridPossible.innerHTML = `<p style="color:#64748b; margin-top:0;">Wow, du verkar ha kryssat alla vanliga arter för den här perioden!</p>`;
            } else {
                possibleNow.forEach(item => {
                    const card = document.createElement("div");
                    card.className = "aktuellt-card";
                    card.setAttribute("onclick", item.action);

                    const cls = getClassification(item.category, item.sumNow);

                    card.style.background = cls.bgCol;
                    card.style.borderColor = cls.borderCol;

                    card.innerHTML = `
                    <div>
                        <h3 style="margin:0 0 0.25rem 0; font-size:1.1rem; color:${cls.mainCol};">${item.name}</h3>
                        <span style="color:${cls.textCol}; font-weight:600; font-size:0.85rem;">${cls.label}</span>
                        <span style="color:#94a3b8; font-size:0.8rem; margin-left:0.25rem;">— ${cls.sublabel}</span>
                    </div>
                    <svg width="20" height="20" fill="none" stroke="${cls.borderCol}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="color: ${cls.textCol}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
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
                        const cls = getClassification(item.category, item.sumNow);

                        return `
                        <div class="aktuellt-card" style="margin-top:0.5rem; display:inline-flex; flex-direction:column; width:auto; padding:0.75rem 1.25rem; margin-right:0.5rem; background:${cls.bgCol}; border-color:${cls.borderCol};" onclick="${item.action}">
                            <span style="font-weight:600; color:${cls.mainCol};">${item.name}</span>
                            <span style="font-size:0.75rem; color:${cls.textCol}; margin-top:0.15rem;">${cls.label}</span>
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
