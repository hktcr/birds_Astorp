# Bidra till Fågelåret i Åstorp

Detta dokument beskriver rutiner och checklistor för att underhålla sajten [astorpsfaglar.se](https://astorpsfaglar.se). Det är skrivet så att vem som helst — människa eller AI — ska kunna jobba med projektet.

---

## Arkitektur

```
birds_Astorp/
├── content/posts/      ← Blogginlägg (Hugo Markdown)
├── data/               ← JSON-datakällor (checklist, locations)
├── layouts/            ← Hugo-templates
├── static/             ← JS, CSS, bilder, video
├── docs/               ← Byggd sajt (GitHub Pages serverar härifrån)
│   └── data/           ← Kopia av data/ — MANUELL SYNK KRÄVS
├── deploy.sh           ← Atomisk deploy-ritual
└── hugo.toml           ← Hugo-konfiguration
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
| Blogginlägg | `content/posts/*.md` | frontmatter `location:`, `species:` |

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
| **Artlistan** (`/arslista/`) | `docs/data/checklist-2026.json` via JS `fetch()` | Klient-side |
| **Artguide** (`/artguide/`) | `species-guide.json` + `checklist-2026.json` via JS | Klient-side |
| **Kartan** (`/karta/`) | `docs/data/checklist-2026.json` + `docs/data/locations.json` via JS | Klient-side |
| **Notiser** (`/posts/`) | Blogginlägg frontmatter | Vid byggtid |

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
   ---
   ```
2. Uppdatera `data/checklist-2026.json` med nya arter/lokaler
3. Lägg till eventuella nya lokaler i `data/locations.json`
4. Placera bilder i `static/images/posts/`
5. Avsluta med milestone-signatur: `*Fågelåret i Åstorp, XX/150*`
6. Kör `./deploy.sh`

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

> **⚠️ VIKTIGT:** Skriptet nedan uppdaterar ENBART `static/data/species-guide.json`.
> Det rör ALDRIG `data/checklist-2026.json` (din manuella krysslista).

> [!CAUTION] Taxon-ID och Area-ID
> Vid manuella API-anrop: verifiera **alltid** taxon-ID och area-ID mot tabellerna i `/ArtportalenAPI`-workflowen. Se pre-flight-checklistan där för detaljer och bakgrund (2026-02-13 incident).

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
TaxonList.csv + Artportalen API
        ↓
  update-species-guide.py
        ↓
  static/data/species-guide.json  (historisk statistik)
        +
  data/checklist-2026.json        (manuella kryss, ORÖRDA)
        ↓
  artguide.js slår ihop vid rendering
```

### Artguide — datakällor

| Sida | Datakälla | Renderas |
|------|-----------|----------|
| **Artguide** (`/artguide/`) | `species-guide.json` + `checklist-2026.json` via JS | Klient-side |

---

## Lokal utveckling

```bash
hugo server -D          # Inkl. utkast
# Öppna http://localhost:1313
```

**Hugo-version:** 0.154.5+extended (Homebrew)
**Publicering:** GitHub Pages från `docs/` på `main`-branchen
**Domän:** astorpsfaglar.se (via Cloudflare DNS → GitHub Pages)
