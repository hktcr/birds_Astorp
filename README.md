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
   coordinates:
     lat: 56.xxxxx
     lon: 13.xxxxx
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
| `docs/data/*.json` | *Genereras av sync-data.sh* — redigera EJ |
| `sync-data.sh` | Synkar data/ → docs/data/ |
| `content/posts/*.md` | Blogginlägg |
| `layouts/index.html` | Startsidans layout + progressbar |
| `static/js/checklist.js` | Logik för årslistan |
| `static/css/style.css` | All CSS |
| `hugo.toml` | Hugo-konfiguration |


---

## 🚀 Deployment

Projektet använder **Hugo** → **GitHub Pages** via `/docs`-mappen.

```bash
# Lokal server
hugo server -D
# Öppna: http://localhost:1313/birds_Astorp/

# Publicera
hugo --minify
git add -A
git commit -m "Beskrivning"
git push
# GitHub Pages serverar från docs/-mappen automatiskt
```

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
