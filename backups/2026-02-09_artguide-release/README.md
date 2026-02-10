# Åstorpsfåglar.se — Backup 2026-02-09

> **Snapshot:** Komplett sajt med ny Artguide-modul

## Vad som ingår

| Komponent | Filer | Status |
|-----------|-------|--------|
| **Hugo-kärna** | `hugo.toml`, `layouts/`, `content/` | ✅ |
| **Årslista** | `layouts/arslista/`, `static/js/checklist.js`, `data/checklist-2026.json` | ✅ |
| **Karta** | `layouts/karta/`, `static/js/map.js`, `data/locations.json` | ✅ |
| **Artguide (NY)** | `layouts/artguide/`, `static/js/artguide.js`, `static/data/species-guide.json` | ✅ |
| **CSS** | `static/css/style.css` (inkl. artguide-sektionen ~620 rader) | ✅ |
| **Preprocessing** | `scripts/preprocess_species_guide.py` | ✅ |
| **Blogginlägg** | `content/posts/` | ✅ |
| **Bilder/video** | `static/images/`, `static/videos/` | ✅ |

## Artguide-modulen — Nyckeldetaljer

### Datafil: `static/data/species-guide.json`
- 188 arter, 13 223 observationer
- Källa: Artportalen GeoJSON-export (2026-02-08)
- Namn synkade mot NL20 (officiella svenska namn 2025)
- 4 raritetskategorier: abundant (≥50), regular (10–49), uncommon (5–9), rare (1–4)

### Preprocessing: `scripts/preprocess_species_guide.py`
```
python3 scripts/preprocess_species_guide.py
```
Kräver att GeoJSON-filen finns i `resources/artportalen-kommun-export/`

### Layout: `layouts/artguide/single.html`
Hugo-layout som laddar JS + CSS + JSON

### JavaScript: `static/js/artguide.js`
- Månadsnavigation (12 knappar)
- Kortvy med sparklines + expanderbar detalj
- Heatmap-helårsvy
- Filter (Alla/Förväntade/Möjliga/Ovanliga/Rariteter/Kryssade/Saknade)
- Kryssdata från `checklist-2026.json`

### CSS: sista ~620 raderna i `static/css/style.css`
- Sektion markerad med `/* Artguide — Interaktiv artöversikt */`
- Custom properties: `--ag-abundant-*`, `--ag-regular-*`, `--ag-uncommon-*`, `--ag-rare-*`
- Kryssade arter: pastellgrön bakgrund (#e8f5e9)

## Återställning

Om sajten trasslats till:
```bash
rsync -av --exclude 'docs/' THIS_BACKUP/ /tmp/birds_Astorp_fix/
cd /tmp/birds_Astorp_fix && hugo server -D
```

## Kontext
- **VEP-panel:** UX-Designpanelen (Klara, Vera, Fabian, Axel) + Viktor Verktyg + Dr. Fenix Fenologica
- **Konversation:** cfd38063-54b4-4d2d-aba0-d96262338939
- **Datum:** 2026-02-09
