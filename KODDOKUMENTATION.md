# KODDOKUMENTATION: Fågelåret i Åstorp (astorpsfaglar.se)

**Senast uppdaterad:** 2026-03-16  
**Teknikstack:** Hugo (Go-templates) + Vanilla JS + CSS Custom Properties + Leaflet + Python (scripts)  
**Publicering:** GitHub Pages från `docs/` via `deploy.sh`  
**Domän:** astorpsfaglar.se (Cloudflare DNS → GitHub Pages)

> **Relation till CONTRIBUTING.md:** CONTRIBUTING.md beskriver *rutiner och checklistor* — hur man bidrar, deploy-ritualer, datakongruens. Denna fil dokumenterar *kodlösningarna* — arkitektur, algoritmer, färgsystem, och alla kodkomponenter med citerad källkod. Varje kodändring dokumenteras med datumstämplad uppdatering i ändringsloggen längst ned.

---

## Syfte och vision

astorpsfaglar.se är en digital fågelårsbok för Åstorps kommun. Projektet följer ett helt kalenderår (2026) och dokumenterar alla observerade fågelarter med blogginlägg, interaktiva kartor, statistik och ett radiellt årshjul. Målet är 150 arter. Sajten är tänkt att fungera både som personligt observationsverktyg och som en publik resurs för intresserade fågelskådare.

Tekniskt bygger sajten på en dubbel datamodell: Hugo genererar statiska HTML-sidor vid byggtid (med Go-template-logik), medan klient-side JavaScript hämtar JSON-data via `fetch()` för interaktiva komponenter (årshjul, karta, artkalender). Denna hybridmodell ger snabb initial laddning men kräver noggrann datasynkronisering mellan `data/` (Hugo byggtid) och `docs/data/` (klient-side).

---

## Arkitektur

```
astorp-faglar/
├── content/              ← Markdown-innehåll (Hugo)
│   ├── posts/            ← Blogginlägg (notiser)
│   ├── species/          ← Fågelatlasen (artregister + _index)
│   ├── galleri/          ← Galleri-sektion
│   └── om.md             ← Om-sidan
├── data/                 ← JSON-datakällor (Hugo byggtid via site.Data)
│   ├── checklist-2026.json     ← SSOT: manuella kryss
│   ├── species_guide.json      ← Historisk artstatistik (kopia av static/)
│   ├── species_portraits.json  ← Porträttbilder per art
│   ├── locations.json          ← Lokaldatabas
│   └── svenska-namn.json       ← NL20 namnuppslag
├── layouts/              ← Hugo-templates
│   ├── index.html        ← Startsida (inline JS vid byggtid)
│   ├── _default/         ← baseof, single, list, vader, arshjul
│   ├── artguide/         ← Artkalender-layout
│   ├── aktuellt/         ← Rekommendationsvy
│   ├── karta/            ← Kart-layout
│   ├── galleri/          ← Galleri-layout
│   ├── species/          ← Fågelatlas (taxonomy + term)
│   └── partials/         ← Header, footer, head
├── static/
│   ├── js/               ← 6 JS-filer (klient-side logik)
│   ├── css/style.css     ← Kompletterande CSS
│   └── data/             ← JSON för klient-side fetch
├── assets/
│   ├── css/style.css     ← PRIMÄR CSS (5274 rader, Hugo pipes)
│   └── js/               ← Hugo-processade JS (om tillämpligt)
├── scripts/              ← Python-skript (datapipeline)
├── docs/                 ← Byggd sajt (GitHub Pages serverar)
├── deploy.sh             ← Atomisk deploy-ritual
├── sync-data.sh          ← Synk + build + verify
└── hugo.toml             ← Hugo-konfiguration
```

### Dataflöde

```
                    ┌─────────────────────────┐
                    │  data/checklist-2026.json │ (SSOT — manuella kryss)
                    └────────┬────────────────┘
                             │
           ┌─────────────────┼─────────────────────┐
           ▼                 ▼                      ▼
   Hugo byggtid        deploy.sh cp           klient-side JS
   (site.Data)       → docs/data/            fetch("/data/...")
   index.html          species-guide.json     arshjul.js, map.js
   species/term.html   checklist-2026.json    checklist.js, artguide.js
```

> **Kritiskt:** `docs/index.html` innehåller en inline `<script>` med observationsdata inbäddad vid byggtid. Klient-side JS-filer hämtar data separat via `fetch()`. Båda måste synkas.

---

## Komponenter och lösningar

### 1. Startsidan (`layouts/index.html`)

Startsidan är en Hugo-template med inbäddad JavaScript. Den renderar tre dynamiska element vid byggtid:

**Termometer-progressbar** — visar antal arter / 150 med en 5-stegs crescendo-ramp:

```javascript
// 5-stegs crescendo-ramp: amber → guld → lime → grön → smaragd
if (percentage <= 30) {
    // Gryning → Morgon: varm amber till guld (hue 35→45)
    hue = 35 + t * 10; sat = 85; light = 55;
} else if (percentage <= 60) {
    // Morgon → Dag: guld till lime (hue 45→65)
    hue = 45 + t * 20; sat = 85 + t * 5; light = 55 - t * 5;
} else if (percentage <= 85) {
    // Dag → Skymning: lime till rik grön (hue 65→100)
    hue = 65 + t * 35; sat = 90 - t * 10; light = 50 - t * 6;
} else {
    // Mål: rik grön till smaragd (hue 100→140)
    hue = 100 + t * 40; sat = 80; light = 44 - t * 6;
}
fill.style.backgroundColor = 'hsl(' + hue + ', ' + sat + '%, ' + light + '%)';
```

**Observationsspår** — vertikal tidslinje med löpnummer per unik art:

```javascript
var speciesNumber = {};
var nextNumber = 1;
data.observations.forEach(function (obs) {
    if (!speciesNumber[obs.species]) {
        speciesNumber[obs.species] = nextNumber++;
    }
    // ... gruppering per datum
});
// Renderas som: #1 Havsörn, #2 Skata, #3 Koltrast
```

CSS-klassen `.trail-species-number` stylar numren (monospace, grön, 80% storlek). Numreringen beräknas dynamiskt av JS — inga nummer lagras i JSON.

**Senaste notis** — Hugo-genererad länk till det senaste blogginlägget via `{{ first 1 (where .Site.RegularPages "Section" "posts") }}`.

---

### 2. Årshjulet (`static/js/arshjul.js` — 779 rader)

Årshjulet är projektets mest komplexa komponent. Det renderar SVG-baserade radiella diagram som visar vilka dagar under året en art historiskt observerats.

**SVG-generering** — varje dag mappas till en annulär sektor:

```javascript
function describeAnnularSegment(cx, cy, innerR, outerR, startAngle, endAngle) {
    const p1 = polarToCartesian(cx, cy, outerR, startAngle);
    const p2 = polarToCartesian(cx, cy, outerR, endAngle);
    const p3 = polarToCartesian(cx, cy, innerR, endAngle);
    const p4 = polarToCartesian(cx, cy, innerR, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return ["M", p1.x, p1.y, "A", outerR, outerR, 0, largeArc, 1, p2.x, p2.y,
            "L", p3.x, p3.y, "A", innerR, innerR, 0, largeArc, 0, p4.x, p4.y, "Z"].join(" ");
}
```

**Säsongsfärger** — intensitet baseras på antal år arten observerats (global max 5 år):

```javascript
const GLOBAL_MAX_YEARS = 5;
function getColor(month, count) {
    const intensity = Math.min(1, count / GLOBAL_MAX_YEARS);
    if (month >= 3 && month <= 5)  return `hsl(140, 60%, ${85 - 35*intensity}%)`; // Vår: Grön
    if (month >= 6 && month <= 8)  return `hsl(45, 100%, ${85 - 35*intensity}%)`; // Sommar: Gul
    if (month >= 9 && month <= 11) return `hsl(15, 80%, ${85 - 35*intensity}%)`; // Höst: Orange/Röd
    return `hsl(210, 80%, ${85 - 35*intensity}%)`;                                // Vinter: Blå
}
```

**Lazy loading** — IntersectionObserver renderar SVG:er först när kort scrollas in i viewporten:

```javascript
observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const svgWrapper = entry.target.querySelector('.arshjul-card-svg-wrapper');
            if (!svgWrapper.hasChildNodes()) {
                const svg = createSVG(data[speciesName] || {}, false, cardCheckDate);
                svgWrapper.appendChild(svg);
                requestAnimationFrame(() => svgWrapper.classList.add('loaded'));
            }
        }
    });
}, { rootMargin: "200px 0px" });
```

**Tips & Aktuellt-panel** — fem kategorier baserade på tidsanalys:

- **Aktuella arter**: `sumNow >= 2` (obs-dagar inom ±7 dagar)
- **I antågande**: `sumSoon >= 2` (obs-dagar +8 till +21 dagar)
- **Lämnar snart**: vintergäster (feb–maj) och sommargäster (aug–okt)
- **Finns i området**: stannare (resident) utan aktuell tidssignal
- **Rariteter**: `totalDaysCount <= 5` med `sumNow > 0`

Stannare bestäms via djupvintertröskel:

```javascript
const isResident = deepWinterDays >= 4 ||
    (deepWinterDays >= 2 && deepWinterDays / totalDaysCount >= 0.10);
```

**Modal** — `<dialog>` med interaktiva tooltips. Placeras utanför `#panel-arshjul` för att skydda mot CDN-cache:

```javascript
if (modal && modal.closest('#panel-arshjul')) {
    const artguide = document.querySelector('.artguide');
    if (artguide) artguide.appendChild(modal);
}
```

---

### 3. Artkalendern (`static/js/artguide.js` — 413 rader)

Artkalendern visar arter per månad med filter och sortering. Sparkline-grafer ger en snabb överblick:

```javascript
function renderSparkline(months, activeMonth, category) {
    const max = Math.max(...months, 1);
    for (let i = 0; i < 12; i++) {
        const barHeight = Math.max((months[i] / max) * height, months[i] > 0 ? 2 : 0);
        bars += `<rect class="${cls}" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="1"/>`;
    }
}
```

Kategorisystem med fyra nivåer:

| Kategori | Etikett | Ikon | Tröskel |
|----------|---------|------|---------|
| `abundant` | Förväntad | — | ≥80 rapporter |
| `regular` | Möjlig | — | ≥20 rapporter |
| `uncommon` | Ovanlig | ◆ | ≥5 rapporter |
| `rare` | Raritet | ⭐ | <5 rapporter |

Klick på artkort öppnar årshjulets modal via `window.openArshjulModalForSpecies()`.

---

### 4. Aktuellt-sidan (`static/js/aktuellt.js` — 282 rader)

Fristående rekommendationsvy med 2×2-klassificering (artens kategori × tidssignal):

```javascript
function getClassification(category, sumNow) {
    const strong = sumNow >= 4;
    if (category === 'abundant') {
        return strong
            ? { label: 'Förväntad', bgCol: '#f0fdf4', borderCol: '#bbf7d0' }
            : { label: 'Tidig ankomst', bgCol: '#fffbeb', borderCol: '#fde68a' };
    } else if (category === 'regular') {
        return strong
            ? { label: 'Aktuell', bgCol: '#f0fdf4', borderCol: '#bbf7d0' }
            : { label: 'Kan dyka upp', bgCol: '#fffbeb', borderCol: '#fde68a' };
    }
    return { label: 'Möjlig', bgCol: '#fffbeb', borderCol: '#fde68a' };
}
```

Sorterings- och filtreringslogik identisk med `arshjul.js renderTipsPanel()`, men med separata DOM-element.

---

### 5. Kartan (`static/js/map.js` — 188 rader)

Leaflet-baserad terrängkarta med OpenTopoMap-tiles. Kommungrins visas som GeoJSON med grå omlands-overlay (world polygon med hål):

```javascript
const overlayPolygon = L.polygon([
    worldBounds.map(c => [c[0], c[1]]),
    kommunHole  // Konvertera GeoJSON [lng, lat] → [lat, lng]
], {
    fillColor: '#4b5563',
    fillOpacity: 0.4,
    interactive: false
});
```

**Pulseffekt** — senaste observationsplatsen får en animerad SVG-ring:

```javascript
if (isLatest) {
    const pulseIcon = L.divIcon({
        className: 'pulse-marker',
        html: `<svg class="pulse-svg" viewBox="0 0 50 50">
            <circle class="pulse-ring" cx="25" cy="25" r="20"
                    fill="none" stroke="#dc2626" stroke-width="2"/>
        </svg>`
    });
    L.marker([loc.lat, loc.lng], { icon: pulseIcon, interactive: false }).addTo(map);
}
```

Markörstorlek skalas dynamiskt: `radius: 8 + Math.min(loc.species.length, 10)`.

---

### 6. Popup-karta i notiser (`static/js/location-popup.js` — 163 rader)

Klickbara lokalnamn i blogginlägg öppnar en kart-overlay med Leaflet. Lokaler hämtas från `data-lat`/`data-lng`-attribut på `.location-link`-element som Hugo genererar från `locations:`-frontmatter.

Gula markörer med pulseffekt (`EAB308`) och lokalnamnsetiketter. Samma kommungrins-overlay som huvudkartan.

---

### 7. Årslistan (`static/js/checklist.js` — 224 rader)

Interaktiv artlista med filter (alla/observerade/saknade) och sortering (taxonomisk/alfabetisk/kronologisk). Arter som saknas i `species-guide.json` men finns i checklistan injekteras som `isNew: true` med 🆕-badge.

```javascript
speciesList.push({
    name: obs.species,
    category: 'new',
    total: 0,
    isNew: true
});
```

`TARGET = 150` är hårdkodad (rad 17).

---

### 8. Vädersidan (`layouts/_default/vader.html`)

Komplex sida med tre datavyer (Årsöversikt / Vecka / 24h) som hämtar SMHI-data live:

- **Hero-widget**: "Just nu"-kort med vindkompass (Beaufort), temperatur, dagsljus (Jean Meeus-algoritm för 56.08°N)
- **Diagram**: Custom Canvas (temp, vind) och Chart.js (nederbörd, vattenföring)
- **SMHI-stationer**: Helsingborg A (temp, vind), Åstorp (precip), Forsmöllan/station 2372 (vattenföring)

---

### 9. Fågelatlasen (`layouts/species/`)

Hugo-taxonomi-driven sektion. `content/species/artregister.md` listar alla ~200 arter i frontmatter. Hugo genererar en sida per art via `taxonomy.html` (index) och `term.html` (enskild art).

Datakällor vid byggtid: `checklist-2026.json` (kryss), `species_guide.json` (statistik), `species_portraits.json` (bilder), blogginlägg med `species:`-tagg (notiser + galleri).

---

### 10. Deploy-ritual (`deploy.sh`)

Atomisk deploy med pre-flight-kontroller:

```bash
hugo --minify --cleanDestinationDir    # Bygger sajten
cp -v data/*.json docs/data/           # Synkar JSON
# Draft-guard: varnar om draft: false finns bland ändrade filer
git add -A && git commit -m "$MSG" && git push origin main
```

---

## Färger och design

### Primärpalett (CSS Custom Properties)

Designsystemet bygger på en "Naturbutiken"-palett, bestämd genom VEP-deliberation 2026-01-20/21/24:

```css
:root {
    --color-primary: #2B5A2B;           /* Naturbutiken-grön */
    --color-primary-dark: #1E4220;      /* Mörkgrön (rubriker, footer) */
    --color-primary-light: #3D7A3D;     /* Ljusgrön (hover, accent) */
    --color-accent: #C45B28;            /* Terrakotta — från röd gladans fjäderdräkt */
    --color-accent-light: #D97B4A;
    --color-bg: #FFFFFF;
    --color-bg-dark: #1E4220;           /* Mörkgrön footer (ej svart) */
    --color-text: #1A1A1A;
    --color-text-muted: #5A5A5A;
    --color-border: #E0DDD5;
}
```

### Typografi

```css
--font-heading: 'Inter', -apple-system, sans-serif;
--font-body: 'Inter', -apple-system, sans-serif;
/* Lora italic för figcaptions och postdatum */
.notis-chart figcaption { font-family: 'Lora', Georgia, serif; font-style: italic; }
.post-date { font-family: 'Lora', Georgia, serif; }
```

### Fluid Scale

Alla textstorlekar använder `clamp()` för responsivitet:
```css
--text-base: clamp(1rem, 0.9rem + 0.4vw, 1.125rem);
--text-xl: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
```

### Årshjulets färgkodning

| Säsong | Månad | HSL Hue | Färg |
|--------|-------|---------|------|
| Vår | Mar–Maj | 140 | Grön |
| Sommar | Jun–Aug | 45 | Gul |
| Höst | Sep–Nov | 15 | Orange/Röd |
| Vinter | Dec–Feb | 210 | Blå |

Intensitet: `lightness = 85 - (35 × min(1, count/5))` — ju fler år arten observerats, desto djupare färg.

### Aktuellt-sidans klassificeringsfärger

| Klassificering | Bakgrund | Kantfärg | Textfärg |
|----------------|----------|----------|----------|
| Förväntad / Aktuell | `#f0fdf4` | `#bbf7d0` | `#16a34a` |
| Tidig ankomst / Kan dyka upp | `#fffbeb` | `#fde68a` | `#d97706` |
| Raritet | `#fff1f2` | `#fecdd3` | `#be123c` |

### Kartan

- Kommungrins: `#b91c1c` (röd), 4px solid
- Omlands-overlay: `#4b5563` (grå), 40% opacity
- Observationsmarkörer: `#dc2626` (röd), transparenta med röd border
- Pulseffekt: SVG `<circle>` med `stroke: #dc2626`
- Popup-karta: gula markörer `#EAB308`

---

## Python-skript

### `scripts/generate_radial_data.py`
Genererar `species_days_historic.json` från Artportalen-exportdata. Nyckelformat: `{"Artnamn": {"01-15": 3, "03-22": 5, ...}}` — antalet år arten observerats på varje dag.

### `scripts/generate_notis_chart.py`
Hämtar SMHI-data och genererar stilade PNG-diagram för inbäddning i blogginlägg. Stöder `--type temp|precip|wind|flow` med kombinationer.

### `scripts/update-species-guide.py`
Live-hämtning från Artportalen SOS API. Filtrerar bort underarter, genus och hybrider (utom `ALLOWED_SUBSPECIES`: Tamduva, Gråkråka).

### `scripts/preprocess_species_guide.py`
Offline-bearbetning av GeoJSON-exporter till `species-guide.json`.

### `scripts/generate_wind_hourly_compass.py`
Genererar vindkompass-diagram för vädersidan.

---

## Ändringslogg

### 2026-03-16 — Initial koddokumentation

Skapad som del av GAIA-bred koddokumentationsinsats. Dokumenterat alla 6 JS-filer, CSS design system, Hugo-templates, deploy-skript och Python-pipeline. Alla kodexempel verifierade mot aktuell filinnehåll.

Dokumentet kompletterar `CONTRIBUTING.md` (rutiner/checklistor) med djup teknisk dokumentation av kodlösningar, algoritmer och designbeslut.

---

*Signatur: gAIa 🌲*
