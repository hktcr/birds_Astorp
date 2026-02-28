# VADER_DIAGRAM — Diagramarkitektur för Vädersidan

> Referensdokumentation för `/Åstorp-2026` workflow

## Filer

| Fil | Syfte |
|-----|-------|
| `content/vader.md` | Introtext + beta-notis. Layout: `vader` |
| `layouts/_default/vader.html` | All diagram-HTML + Chart.js-logik |
| `assets/css/style.css` | CSS `.vader-*` (rad ~2440–2500) |
| `hugo.toml` | Menypt "Väder" (weight 27) |

## Diagram (4 st)

### 1. Årslistan
- **Typ:** Linjediagram (röd, gradient-fill)
- **Data:** `checklist-2026.json` (inbäddad vid byggtid via Hugo)
- **Logik:** Kumulerar unika arter per datum, förläng till idag
- **Annoteringar:** Mållinje 150 arter, startprick jan 22
- **Canvas-ID:** `progress-chart`

### 2. Temperatur
- **Typ:** Linjediagram (orange max, blå min)
- **API:** `opendata-download-metobs.smhi.se` param 19 (min) + 20 (max)
- **Station:** 62040 (Helsingborg A, 16 km)
- **Period:** `latest-months`
- **Aspekt:** 2.0 (högre än övriga, 2.5)
- **Canvas-ID:** `temp-chart`

### 3. Nederbörd
- **Typ:** Stapeldiagram (blå)
- **API:** `opendata-download-metobs.smhi.se` param 5
- **Station:** 62060 (Åstorp, 4 km)
- **Period:** `latest-months`
- **Canvas-ID:** `precip-chart`

### 4. Vattenföring
- **Typ:** Linjediagram (teal, gradient-fill)
- **API:** `opendata-download-hydroobs.smhi.se` param 1 (dygnsvattenföring)
- **Station:** 2196 (Åbromölla, 7 km)
- **Period:** `corrected-archive` (hämtar hela historiken, filtrerar ≥ 2026)
- **OBS:** Hydro-API:t ger timestamps (ms), ej datumsträngar → aggregeras till dagmedel
- **Canvas-ID:** `flow-chart`

## Gemensam konfiguration

- **Chart.js v4** + `chartjs-plugin-annotation` v3 + Luxon v3 + `chartjs-adapter-luxon` v1
- **X-axel:** Tidsaxel jan–dec 2026, månadsindelning, streckade gridlinjer
- **Typsnitt:** Inter (via CDN, redan i basthema)
- **Tooltip:** Mörkgrön bakgrund (`rgba(30,66,32,0.9)`)

## API-endpoints

```
# Meteorologi
https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/{PARAM}/station/{STATION}/period/latest-months/data.json

# Hydrologi
https://opendata-download-hydroobs.smhi.se/api/version/latest/parameter/1/station/{STATION}/period/corrected-archive/data.json
```

## Deploy

```bash
hugo --destination docs && git add -A && git commit -m "msg" && git push origin main
```

GitHub Pages serverar `docs/` → astorpsfaglar.se
