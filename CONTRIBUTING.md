# Bidra till Fågelåret i Åstorp

Detta dokument beskriver rutiner och checklistor för att underhålla sajten [astorpsfaglar.se](https://astorpsfaglar.se). Det är skrivet så att vem som helst — människa eller AI — ska kunna jobba med projektet.

---

## Arkitektur

```
birds_Astorp/
├── content/
│   ├── posts/          ← Blogginlägg (Hugo Markdown)
│   ├── species/        ← Fågelatlasen (artregister + _index)
│   ├── galleri/        ← Galleri-sektion
│   └── om.md           ← Om-sida
├── data/               ← JSON-datakällor (checklist, locations, portraits)
├── layouts/
│   ├── index.html      ← Startsidans template
│   ├── species/        ← Fågelatlas-templates (taxonomy + term)
│   ├── galleri/        ← Galleri-template
│   ├── _default/       ← Generella templates (baseof, single, list)
│   └── partials/       ← Header, footer
├── static/
│   ├── js/             ← checklist.js, artguide.js, map.js, location-popup.js
│   ├── css/style.css   ← All CSS
│   └── data/           ← Kopia av checklist + species-guide (synkas)
├── docs/               ← Byggd sajt (GitHub Pages serverar härifrån)
│   └── data/           ← Slutgiltig data som klienten hämtar
├── scripts/            ← Python-skript (Artportalen-pipeline)
├── deploy.sh           ← Atomisk deploy-ritual (PRIMÄR)
├── sync-data.sh        ← Synk + build + verify (ALTERNATIV)
└── hugo.toml           ← Hugo-konfiguration (taxonomier, meny, params)
```

> **OBS:** Hugo kopierar INTE `data/`-filer till `docs/`. Artlistan och kartan hämtar JSON via klient-side `fetch()` från `docs/data/`. Startsidan bäddar in data vid byggtid via Hugo-template.

---

## Deploy-ritual

Använd **alltid** `deploy.sh` för att publicera ändringar:

```bash
./deploy.sh
```

Skriptet kör:
1. `hugo --minify` — bygger sajten till `docs/`
2. `cp data/*.json docs/data/` — synkar JSON-data
3. `git add -A && git commit && git push`

**Kör aldrig** `hugo` och `git push` separat — det skapar risk för skew mellan byggtid-data (startsidan) och klient-data (artlista/karta).

---

## Datakongruens-checklista

Vid ändring av **art**, **lokal** eller **koordinater** — uppdatera ALLA dessa filer:

| Datakälla | Fil | Fält |
|-----------|-----|------|
| Checklista | `data/checklist-2026.json` | `species`, `location`, `lat`, `lng` |
| Lokaler | `data/locations.json` | `name`, `lat`, `lng`, `description` |
| Blogginlägg | `content/posts/*.md` | frontmatter `location:`, `species:`, `locations:` |

> **OBS:** Kartan (`map.js`) bygger sina markörer direkt från `checklist-2026.json` — den läser INTE `locations.json`. Koordinaterna i checklistan måste vara korrekta.
>
> **`location:` vs `locations:`** — Båda fälten behövs i blogginlägg:
> - `location:` (singular, sträng) → Visar arkivtext i notislistan ("📍 Kvidinge · Tomarps Ene")
> - `locations:` (plural, array) → Popup-kartor med klickbara lokalnamn

### Exempel: Byta lokalnamn

Om "Tomarps Ene" ska bli "Rönneå vid Tomarps Ene":

1. `data/checklist-2026.json` — ändra `location` + koordinater
2. `data/locations.json` — lägg till ny lokal (eller ändra befintlig)
3. `content/posts/2026-02-06-*.md` — ändra `location:` i frontmatter
4. Kör `./deploy.sh`

**Felläge ("The Floating Pin"):** Om JSON uppdateras men frontmatter glöms, visar Notiser-sidan gammal lokal medan kartan visar rätt.

---

## Sajtsidor och datakällor

| Sida | Datakälla | Renderas |
|------|-----------|----------|
| **Startsidan** (`/`) | `data/checklist-2026.json` via Hugo-template + `docs/index.html` inline JS | Byggtid + manuell synk |
| **Notiser** (`/posts/`) | Blogginlägg frontmatter + `location-popup.js` | Vid byggtid |
| **Artkalender** (`/artguide/`) | `species-guide.json` + `checklist-2026.json` via `artguide.js` | Klient-side |
| **Galleri** (`/galleri/`) | Bilder extraherade ur blogginlägg via Hugo regex, med JS-filter (art/månad/landskap) + lightbox | Vid byggtid |
| **Karta** (`/karta/`) | `checklist-2026.json` (koordinater per obs) + `astorp-kommun.geojson` via `map.js` | Klient-side |
| **Årslista** (`/arslista/`) | `species-guide.json` + `checklist-2026.json` via `checklist.js` (TARGET=150 hårdkodad) | Klient-side |
| **Fågelatlasen** (`/species/`) | `checklist-2026.json` + `species-guide.json` + `species_portraits.json` via Hugo-taxonomi | Vid byggtid |
| **Om** (`/om/`) | `content/om.md` | Vid byggtid |

---

## Startsidans arkitektur

> **OBS:** Startsidan har en unik arkitektur med **dubbellagring** av observationsdata.

### Källfilen: `layouts/index.html`

Hugo-templaten genererar startsidans HTML vid byggtid. Den innehåller JavaScript som bygger tre komponenter:

1. **Termometer** — visar artantal / 150 med dynamisk HSL-färg
2. **Senast kryssad** — senaste arten i `observations`-arrayen
3. **Observationsspår** — vertikal tidslinje med alla observationer, grupperade per datum

#### Observationsspåret — numrering

Varje unik art tilldelas ett löpnummer (#1, #2, ...) baserat på den **kronologiska ordningen** arten först förekommer i `data.observations`-arrayen. Numren visas som `<span class="trail-species-number">#N</span>` framför artnamnet.

**Exempel:** Havsörn → Skata → Koltrast visas som `#1 Havsörn, #2 Skata, #3 Koltrast`

Numreringen beräknas dynamiskt av JS — inga nummer lagras i JSON. CSS-klassen `.trail-species-number` stylar numren (monospace, grön, 80% storlek).

### Produktionsfilen: `docs/index.html`

> ⚠️ **KRITISKT:** `docs/index.html` innehåller en **inline `<script>`-tagg** med en kopia av all observationsdata (minifierad). Denna uppdateras **INTE** automatiskt av `hugo --minify` eller `deploy.sh`.

Vid nya observationer måste `docs/index.html` uppdateras manuellt:
1. Lägg till ny observation i inline `data.observations`-arrayen
2. Kontrollera att hue-beräkningen finns intakt
3. Kontrollera att observationsspårets numrering (`sn`/`nn`-variabler) fungerar

Se `/Åstorp-2026`-workflowen, steg **A3b** för detaljerade instruktioner.


## Fågelatlasen (`/species/`)

Fågelatlasen är en Hugo-taxonomi-driven sektion som automatiskt genererar en sida per fågelart i Åstorps kommun.

### Hur det fungerar

```
hugo.toml taxonomies: species = 'species'
        ↓
content/species/artregister.md (dold, listar alla ~200 arter i frontmatter)
        ↓
Hugo genererar /species/{artnamn}/ för varje art
        ↓
layouts/species/taxonomy.html  → index-sida (/species/)
layouts/species/term.html      → enskild art-sida (/species/{artnamn}/)
```

### Datakällor vid byggtid

| Data | Källa | Vad den styr |
|------|-------|--------------|
| Kryssade arter | `data/checklist-2026.json` | Vilka kort som markeras som kryssade + #-nummer |
| Historisk statistik | `data/species_guide.json` | "Övriga arter"-sektionen + antal rapporter |
| Porträttbilder | `data/species_portraits.json` | Miniatyrbilder på atlas-korten |
| Notiser per art | Blogginlägg med `species:` i frontmatter | Antal notiser + mini-galleri på art-sidan |

### Uppdateringsregler

- **Ny art i checklist** → Fågelatlasen uppdateras automatiskt vid nästa Hugo-build (arten finns redan i artregistret)
- **Ny notis som nämner art** → Art-sidan visar notisen automatiskt (via `species:`-tagg i frontmatter)
- **Ny porträttbild** → Uppdatera `data/species_portraits.json` med sökväg till bilden:
  ```json
  "Artnamn": "/images/posts/YYYY-MM-DD-slug/bild.jpg"
  ```
  > **Trigger:** När en bild taggas med `categories: [Artnamn]` i `images:`-frontmatter, eller när användaren nämner att en bra bild finns, ska porträttet läggas till proaktivt. Kör `/astorpsfaglar` H3 för att hitta arter som saknar porträtt.
- **Ny art i kommunen** (aldrig rapporterad) → Lägg till i `content/species/artregister.md`

> **OBS:** `artregister.md` har `build: list: never` i frontmatter — den renderas aldrig själv, bara dess taxonomy-termer.

---

## Popup-karta i notiser (`location-popup.js`)

Blogginlägg med `locations:`-fält i frontmatter får klickbara lokalnamn som öppnar en popup-karta med Leaflet. Kartan visar gula markörer för alla lokaler i notisen, med kommungrins-overlay.

Frontmatter-exempel:
```yaml
locations:
  - name: "Kvidinge"
    lat: 56.13675
    lng: 13.04310
```

> **OBS:** Använd INTE `<span class="location-link">` i brödtexten. Hugo-templaten genererar dessa automatiskt från `locations:`-fältet.

---

## Nytt blogginlägg — checklista

1. Skapa `content/posts/YYYY-MM-DD-slug.md` med frontmatter:
   ```yaml
   ---
   title: "Titel"
   date: YYYY-MM-DD
   draft: false
   location: "Lokal1 · Lokal2"
   species:
     - Art1
     - Art2
   tags:
     - relevant-tagg
   locations:
     - name: "Lokalnamn"
       lat: 56.xxxxx
       lng: 13.xxxxx
   images:
     - url: "/images/posts/YYYY-MM-DD-slug/filnamn.jpg"
       alt: "Beskrivande bildtext"
       categories:
         - Art1
   ---
   ```
   > **OBS:** `locations:` ersätter det äldre `coordinates:`-fältet. Några äldre poster har kvar `coordinates:` men det behövs inte längre.
2. Uppdatera `data/checklist-2026.json` med nya arter/lokaler
3. Lägg till eventuella nya lokaler i `data/locations.json`
4. Placera bilder i `static/images/posts/YYYY-MM-DD-slug/`
5. Tagga bilder i frontmatter `images:` med `categories:` (se nedan)
6. Avsluta med milestone-signatur: `*Fågelåret i Åstorp, XX/150*`
7. (Valfritt) Uppdatera `data/species_portraits.json` om en bra bild finns
8. Kör `./deploy.sh`

---

## Bildtaggning i blogginlägg (`images:` frontmatter)

Bilder som ska visas i **Galleriet** (filtrerbara per art/kategori) och i **Fågelatlasen** (mini-galleri på art-sidan) måste tagas i blogginläggets frontmatter:

```yaml
images:
  - url: "/images/posts/2026-02-21-vigg/vigg.jpg"
    alt: "En vigghane på snötäckt fält"
    categories:
      - Vigg
  - url: "/images/posts/2026-02-21-vigg/landskap.jpg"
    alt: "Vy över Kungsgårdsmaderna"
    categories:
      - Landskap
```

| Fält | Syfte |
|------|-------|
| `url` | Sökväg till bilden (relativ till site root) |
| `alt` | Alt-text och bildtext i lightbox |
| `categories` | Filterkategorier — artnamn eller "Landskap" |

**Regler:**
- Bilder utan `images:`-taggning visas i galleriet men INTE i artspecifika filter
- `categories:` med artnamn kopplar bilden till artens sida i Fågelatlasen
- Befintliga kategorier: artnamn (t.ex. "Vigg", "Fjällvråk") + "Landskap"

---

## Stilprinciper (kortversion)

- **Em-dash (—)**: Använd aldrig. Ersätt med komma, punkt eller kolon.
- **Lokalnamn**: Middot-separator (`Kvidinge · Tomarps Ene`)
- **Specificitet**: "En dryg decimeter snö" > "Mycket snö"
- **Sista ordet**: Placera det viktigaste konceptet sist i meningen
- **Horisontella linjer**: Undvik `---` i bloggtexten (stör läsflödet)
- **Bildtext**: Beskriv beteende, inte bara art ("Talgoxe vid matningen, bland de första besökarna")

---

## Artportalen-datapipeline

> **⚠️ VIKTIGT:** Skripten nedan uppdaterar ENBART `static/data/species-guide.json`.
> De rör ALDRIG `data/checklist-2026.json` (din manuella krysslista).

> [!CAUTION] Taxon-ID och Area-ID
> Vid manuella API-anrop: verifiera **alltid** taxon-ID och area-ID mot tabellerna i `/ArtportalenAPI`-workflowen. Se pre-flight-checklistan där för detaljer och bakgrund (2026-02-13 incident).

### Två skript — två datakällor

| Skript | Datakälla | Syfte |
|--------|-----------|-------|
| `update-species-guide.py` | Artportalen API (live) | Hämtar aktuell statistik direkt från API:t |
| `preprocess_species_guide.py` | GeoJSON-export (offline) | Bearbetar nedladdad kommunexport till samma format |

Båda producerar `static/data/species-guide.json`. Använd `update-species-guide.py` för rutinuppdateringar. `preprocess_species_guide.py` används vid bulk-import av historical data från GeoJSON-exporter (sparade i `resources/artportalen-kommun-export/`).

### Uppdatera artstatistik från Artportalen

```bash
cd scripts/
python3 update-species-guide.py
```

Skriptet:
1. Läser `static/data/TaxonList_fåglar_Åstorpskommun.csv` (alla kända arter i kommunen)
2. Laddar ner aktuell data via Artportalen API (SOS API)
3. Beräknar totaler och månadsfördelning per art
4. Skriver ny `static/data/species-guide.json`

**Kräver:** Python 3, `requests`-biblioteket, giltig API-nyckel i `../data_mining/config.yaml`.

### Taxonomisk hantering

Skriptet filtrerar bort underarter (3+ delat vetenskapligt namn), genus utan artepithet, och hybrider. Två undantag definieras i `ALLOWED_SUBSPECIES`:

| Art | Vetenskapligt namn | Varför undantag |
|-----|-------------------|-----------------| 
| Tamduva | `Columba livia, domesticated populations` | API returnerar 4-delat namn |
| Gråkråka | `Corvus corone cornix` | Nordisk underart som bör räknas separat |

Nya undantag läggs till i `ALLOWED_SUBSPECIES`-listan i skriptet.

### Kända begränsningar (SOS API)

1. **Koordinatnoggrannhet:** API:t filtrerar geografiskt via point-in-polygon. Observationer med låg GPS-precision (±2km+) nära kommungränsen kan saknas. Artportalen-webben matchar via lokalnamn — skillnaden är marginell (<0,01%).
2. **Filtrerade poster:** ~0,4% av alla obs tillhör underarter/genus/hybrider som inte mappas till en TaxonList-art.
3. **Osäkra bestämningar:** Inkluderas i statistiken (räknas som giltiga obs).

### Validering efter uppdatering

Kör alltid en rimlighetskontroll efter `update-species-guide.py`. Skriptet bör passera:
- `total == sum(months)` för varje art
- Alla arter har exakt 12 månader
- Kategorier matchar tröskelvärden (abundant≥80, regular≥20, uncommon≥5, rare<5)
- Inga dubblettarter

### Dataflöde
```
TaxonList.csv + Artportalen API        GeoJSON-export
        ↓                                     ↓
  update-species-guide.py          preprocess_species_guide.py
        ↓                                     ↓
  static/data/species-guide.json  ◄────────────┘
        │
        ├── Hugo kopierar → docs/data/ (klient-side JS)
        └── Kopia i data/species_guide.json (Hugo byggtid: site.Data)
        +
  data/checklist-2026.json        (manuella kryss, ORÖRDA)
        ↓
  artguide.js + checklist.js + Fågelatlasen slår ihop vid rendering
```

### Stödfiler

| Fil | Syfte |
|-----|-------|
| `data/svenska-namn.json` | NL20 officiella svenska fågelnamn (namnuppslag för `preprocess_species_guide.py`) |
| `data/species_guide.json` | Kopia av `static/data/species-guide.json` som Hugo läser vid byggtid via `site.Data.species_guide` (krävs för Fågelatlasen och term-sidor) |
| `static/data/TaxonList_fåglar_Åstorpskommun.csv` | Lista över alla kända arter i kommunen (input till `update-species-guide.py`) |
| `resources/artportalen-kommun-export/*.geojson` | Nedladdade exporter (input till `preprocess_species_guide.py`) |

### Artguide — datakällor

| Sida | Datakälla | Renderas |
|------|-----------|----------|
| **Artguide** (`/artguide/`) | `species-guide.json` + `checklist-2026.json` via JS | Klient-side |

---

## Deploy-skript: deploy.sh vs sync-data.sh

Projektet har **två** deploy-hjälpare. Använd `deploy.sh` för publicering:

| | `deploy.sh` (PRIMÄR) | `sync-data.sh` |
|---|---|---|
| **Syfte** | Atomisk publicering | Synk + build + verifiering |
| Hugo build | ✅ | ✅ |
| `data/` → `static/data/` | ❌ | ✅ |
| `data/` → `docs/data/` | ✅ (`cp data/*.json docs/data/`) | ❌ (via Hugo) |
| Git commit + push | ✅ (interaktivt) | ✅ (med `--deploy`) |
| Verifieringsläge | ❌ | ✅ (`--verify`) |

**Rekommendation:** Använd `deploy.sh` vid publicering. Använd `sync-data.sh --verify` för att kontrollera synkstatus utan att publicera.

---

## Lokal utveckling

```bash
hugo server -D          # Inkl. utkast
# Öppna http://localhost:1313
```

**Hugo-version:** 0.154.5+extended (Homebrew)
**Publicering:** GitHub Pages från `docs/` på `main`-branchen
**Domän:** astorpsfaglar.se (via Cloudflare DNS → GitHub Pages)

---

## Infrastruktur och dolda beteenden

### Analytics
GoatCounter (`hlgk.goatcounter.com`) laddas i `baseof.html`. Cookiefritt, GDPR-vänligt.

### Lightbox
`baseof.html` innehåller ett komplett lightbox-system. Bilder med `.lightbox-link`-klass eller i `.gallery` öppnas i modal. Klick på bilden togglar zoom. Escape stänger.

### Leaflet (globalt)
Leaflet CSS + JS laddas via CDN i `baseof.html` på **alla** sidor — krävs av `location-popup.js` i blogginlägg.

### RSS
Hugo genererar automatiskt en RSS-feed (`<link rel="alternate" type="application/rss+xml">`).

### Fågelatlasen — Easter egg
Atlas-ingången (☀-symbolen) är en dold länk i `baseof.html`, inte i navigationsmenyn. Kommentar i koden: *"enda ingång under utvecklingsfasen"*.

### `youtube:` frontmatter
`single.html` renderar en inbäddad YouTube-video om `youtube:` finns i frontmatter (YouTube video-ID som sträng). Oanvänt idag men klart.

### Notislistan — artfilter via URL
`list.html` stöder `?species=artnamn` i URL:en. Art-pills i arkivvyn är klickbara och filtrerar.

### Årslistan — TARGET och 🆕-badge
- `TARGET = 150` är hårdkodad i `checklist.js` rad 17. Ändra här vid nytt årsmål.
- `checklist.js` injekterar arter från checklistan som saknas i `species-guide.json` med `isNew: true` och visar 🆕-badge. Dessa är arter som aldrig rapporterats i kommunen.

### Kartan — pulseffekt
`map.js` identifierar automatiskt den senaste observationsplatsen och visar en pulserande SVG-ring.

### Galleriet — bildextraktion
`galleri/list.html` extraherar bilder via regex från blogginlägg (både `![alt](url)` och `<img src>`). Bilder **utan** `images:`-taggning tilldelas postens `species:` som fallback-kategori i gallerifiltren.
