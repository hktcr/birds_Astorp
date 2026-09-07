# Fågelåret i Åstorp

En hybrid fågelblogg för Åstorps kommun — observationer, bilder och interaktiv årskrysslista.

**Live:** https://hktcr.github.io/birds_Astorp/

---

## 🐦 Snabbguide: Lägg till observationer

> ⚠️ **VIKTIGT:** Redigera ENDAST filer i `data/`-katalogen. Kör sedan `./sync-data.sh` före publicering.

### Endast artnotering (utan blogginlägg)

1. Öppna `data/checklist-2026.json`
2. Lägg till i slutet av `observations`-arrayen:
   ```json
   {
       "species": "Artnamn",
       "latin": "Vetenskapligt namn",
       "date": "2026-MM-DD",
       "location": "Lokalnamn",
       "lat": 56.xxxxx,
       "lng": 13.xxxxx
   }
   ```
3. Publicera:
   ```bash
   ./sync-data.sh --deploy
   ```
   (Alternativt manuellt: `./sync-data.sh && git add -A && git commit -m "..." && git push`)

### Med blogginlägg

1. Skapa fil: `content/posts/2026-MM-DD-url-slug.md`
2. Frontmatter:
   ```yaml
   ---
   title: "Rubrik"
   date: 2026-MM-DD
   location: "Huvudlokal"
   species:
     - Art 1
     - Art 2
   tags:
     - relevant-tagg
   locations:
     - name: "Lokalnamn"
       lat: 56.xxxxx
       lng: 13.xxxxx
   images:
     - url: "/images/posts/2026-MM-DD-slug/bild.jpg"
       alt: "Beskrivande text"
       categories:
         - Art 1
   ---
   ```
3. Lägg till alla nya arter i `data/checklist-2026.json`
4. Synka och pusha:
   ```bash
   ./sync-data.sh && hugo --minify && git add -A && git commit -m "Notis: Rubrik" && git push
   ```

---

## 📁 Viktiga filer

| Fil | Syfte |
|-----|-------|
| `data/checklist-2026.json` | **ENDA KÄLLAN** — alla observerade arter |
| `data/locations.json` | Standardlokaler med koordinater |
| `data/species_portraits.json` | Porträttbilder för Fågelatlasen |
| `docs/data/*.json` | *Genereras av deploy.sh* — redigera EJ |
| `deploy.sh` | Atomisk deploy-ritual (hugo + synk + git) |
| `sync-data.sh` | Synka data + verifiera (`--verify`) |
| `content/posts/*.md` | Blogginlägg |
| `content/species/artregister.md` | Genererar artsidor (alla kommunens arter) |
| `layouts/index.html` | Startsidans layout: progressbar + observationsspår |
| `layouts/species/taxonomy.html` | Fågelatlasen — index-vy |
| `layouts/species/term.html` | Fågelatlasen — enskild art-sida |
| `static/js/checklist.js` | Logik för årslistan |
| `static/js/artguide.js` | Artkalendern — månadsnavigation + sparklines |
| `static/js/map.js` | Interaktiv karta med Leaflet |
| `static/js/location-popup.js` | Popup-karta för lokaler i notiser |
| `static/css/style.css` | All CSS |
| `hugo.toml` | Hugo-konfiguration (taxonomier, meny) |


---

## 🚀 Deployment

Projektet använder **Hugo** → **GitHub Pages** via `/docs`-mappen.

```bash
# Lokal server
hugo server -D
# Öppna: http://localhost:1313/birds_Astorp/

# Publicera
bash scripts/build.sh
git add -A
git commit -m "Beskrivning"
git push
# GitHub Pages serverar från docs/-mappen automatiskt
```

`scripts/build.sh` synkar checklistan och lokalerna före Hugo och verifierar alla tre datakopior efteråt. Granska ändringarna före commit och publicering. CARTO:s klientnyckel kan anges vid byggtid med Hugo-parametern `cartoBasemapKey` (miljövariabel `HUGO_PARAMS_CARTOBASEMAPKEY`). Utan nyckel används OpenStreetMap. Ange aldrig någon privat CARTO-kontonyckel här; parametern publiceras i kartans HTML.

---

## 📊 Datastruktur

### checklist-2026.json

```json
{
    "year": 2026,
    "municipality": "Åstorp",
    "observations": [
        {
            "species": "Havsörn",
            "latin": "Haliaeetus albicilla",
            "date": "2026-01-22",
            "location": "Sönnarslöv",
            "lat": 56.12868,
            "lng": 13.08559
        }
    ]
}
```

**Viktigt:** Ordningen i arrayen bestämmer "Senast kryssad" — sista elementet visas.

### locations.json

```json
{
    "locations": [
        {
            "name": "Kvidinge",
            "lat": 56.13675,
            "lng": 13.04310,
            "type": "standard"
        }
    ]
}
```

---

## 🎯 Mål

- **150 arter** under 2026
- Dokumentera fågelår i Åstorps kommun
- Interaktiv karta och artlista

---

## 📄 Licens

© 2026 Håkan Karlsson
