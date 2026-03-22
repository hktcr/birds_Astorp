#!/usr/bin/env python3
"""
generate_season_timeline.py — Säsongs-tidslinje för fågelarter
================================================================

Genererar en SVG-grafik som visar observationsfrekvens per dag under en
vald del av året, med möjlighet att markera en specifik observationsdag
(t.ex. ett årskryss).

Datakälla
---------
Läser `species_days_historic.json` (genereras av `generate_radial_data.py`
från Artportalen-exporter). Formatet är:

    { "Artnamn": { "MM-DD": antal, ... }, ... }

Där `antal` = totalt antal observationer den kalenderdagen, alla år summerade.

OBS: Detta är INTE "första ankomst per år" — det är total observationsfrekvens.
Tidiga, små prickar visar var säsongens framkant brukar ligga.

Användning
----------
    python3 generate_season_timeline.py <species_days_historic.json> <output.svg> [options]

    # Grundfall: strandskata + sädesärla, markera 20 mars
    python3 generate_season_timeline.py static/data/species_days_historic.json output.svg

    # Anpassad körning (se CONFIG-sektionen i koden)
    # Ändra species_config, date_range, highlight_date direkt i koden.

Konfiguration (ändra i koden)
-----------------------------
- `species_config`: Lista av (artnamn, färg) — stödjer 1–4 arter per grafik.
- `start_date` / `end_date`: Datumintervall att visa (t.ex. feb–apr för vårarter).
- `highlight_month` / `highlight_day`: Datum att markera med röd ring.

Designsystem
------------
- Vit bakgrund, rundade hörn (rx=10)
- Prickstorlek proportionell mot antal observationer (r = 2.5–10.5)
- Opacity proportionell mot antal (0.25–0.70)
- Markerad dag: koncentriska röda ringar (#e11d48)
- Font: Inter / system-ui
- Datumaxel: varannan vecka, månadsstarter i fetstil

Exempel på output
-----------------
Se: static/images/posts/2026-03-20-hallpunkter-i-fagelaret/ankomst-tidslinje.svg
"""

import json
import sys
from datetime import date

# ──────────────────────────────────────────────────────────────────────
# CONFIG — Ändra dessa för nya arter/datum
# ──────────────────────────────────────────────────────────────────────

species_config = [
    # (artnamn i species_days_historic.json, prickfärg)
    ("Strandskata", "#0284c7"),   # Sky-600
    ("Sädesärla",   "#d97706"),   # Amber-600
]

# Datumintervall att visa
start_date = date(2026, 2, 15)
end_date   = date(2026, 4, 30)

# Datum att markera som årskryss (None = ingen markering)
highlight_month = 3
highlight_day   = 20

# Datumetiketter på x-axeln (month, day, label)
date_ticks = [
    (2, 15, "15 feb"),
    (3, 1,  "1 mar"),
    (3, 15, "15 mar"),
    (4, 1,  "1 apr"),
    (4, 15, "15 apr"),
    (4, 30, "30 apr"),
]

# Titel
title = "Årskryss 2026 i säsongens mönster"
subtitle = "Prickar = observationsfrekvens per dag, alla år summerade · Åstorps kommun · Källa: Artportalen"

# ──────────────────────────────────────────────────────────────────────
# IMPLEMENTATION
# ──────────────────────────────────────────────────────────────────────

with open(sys.argv[1], 'r') as f:
    data = json.load(f)

total_days = (end_date - start_date).days

# SVG layout
svg_width = 820
svg_height = 120 + len(species_config) * 100
margin_left = 100
margin_right = 30
plot_width = svg_width - margin_left - margin_right

# Colors
bg_color = "#ffffff"
border_color = "#e2e8f0"
grid_color = "#f1f5f9"
axis_color = "#cbd5e1"
text_color = "#1e293b"
dim_text = "#64748b"
label_text = "#334155"
highlight_color = "#e11d48"
line_color = "#e2e8f0"


def date_to_x(month, day):
    d = date(2026, month, day)
    frac = (d - start_date).days / total_days
    return margin_left + frac * plot_width


def get_obs_in_range(species_data):
    result = []
    for key, count in species_data.items():
        if key.startswith("_"):
            continue
        parts = key.split("-")
        month, day = int(parts[0]), int(parts[1])
        try:
            d = date(2026, month, day)
        except ValueError:
            continue
        if start_date <= d <= end_date:
            result.append((month, day, count))
    return sorted(result)


# Collect species data
species_obs = []
all_counts = []
for name, color in species_config:
    sp_data = data.get(name, {})
    sp_data.pop("_meta", None)
    obs = get_obs_in_range(sp_data)
    species_obs.append((name, color, obs))
    all_counts.extend(c for _, _, c in obs)

max_count = max(all_counts) if all_counts else 1

# Build SVG
svg = []

svg.append(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_width} {svg_height}"
     style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;">

  <rect width="{svg_width}" height="{svg_height}" rx="10" fill="{bg_color}" stroke="{border_color}" stroke-width="1"/>

  <text x="{svg_width/2}" y="30" text-anchor="middle" fill="{text_color}"
        font-size="15" font-weight="700">{title}</text>
  <text x="{svg_width/2}" y="48" text-anchor="middle" fill="{dim_text}"
        font-size="10">{subtitle}</text>
''')

# Grid lines + date labels
for month, day, label in date_ticks:
    x = date_to_x(month, day)
    is_month = (day == 1)
    sw = "1" if is_month else "0.5"
    sc = axis_color if is_month else grid_color
    svg.append(f'  <line x1="{x}" y1="60" x2="{x}" y2="{svg_height - 45}" stroke="{sc}" stroke-width="{sw}"/>')
    fw = "600" if is_month else "400"
    fc = label_text if is_month else dim_text
    svg.append(f'  <text x="{x}" y="{svg_height - 28}" text-anchor="middle" fill="{fc}" font-size="10" font-weight="{fw}">{label}</text>')

# Draw each species
for i, (name, color, obs) in enumerate(species_obs):
    row_y = 110 + i * 100

    # Horizontal dashed line
    svg.append(f'  <line x1="{margin_left}" y1="{row_y}" x2="{svg_width - margin_right}" y2="{row_y}" stroke="{line_color}" stroke-width="1" stroke-dasharray="3,5"/>')

    # Label
    svg.append(f'  <text x="{margin_left - 10}" y="{row_y - 15}" text-anchor="end" fill="{color}" font-size="13" font-weight="700">{name}</text>')

    # Get latin name from data keys (not available here, so skip or hardcode)
    # svg.append(f'  <text x="{margin_left - 10}" y="{row_y + 2}" text-anchor="end" fill="{dim_text}" font-size="9" font-style="italic">...</text>')

    # Dots
    for month, day, count in obs:
        x = date_to_x(month, day)
        r = 2.5 + (count / max_count) * 8
        opacity = 0.25 + (count / max_count) * 0.45

        if highlight_month and highlight_day and month == highlight_month and day == highlight_day:
            svg.append(f'  <circle cx="{x}" cy="{row_y}" r="{r + 7}" fill="none" stroke="{highlight_color}" stroke-width="1.5" opacity="0.25"/>')
            svg.append(f'  <circle cx="{x}" cy="{row_y}" r="{r + 4}" fill="none" stroke="{highlight_color}" stroke-width="1" opacity="0.4"/>')
            svg.append(f'  <circle cx="{x}" cy="{row_y}" r="{r}" fill="{highlight_color}" opacity="0.85"/>')
            svg.append(f'  <text x="{x}" y="{row_y + r + 15}" text-anchor="middle" fill="{highlight_color}" font-size="10" font-weight="700">2026</text>')
            svg.append(f'  <text x="{x}" y="{row_y + r + 26}" text-anchor="middle" fill="{dim_text}" font-size="8">{day} {"jan feb mar apr maj jun jul aug sep okt nov dec".split()[month-1]}</text>')
        else:
            svg.append(f'  <circle cx="{x}" cy="{row_y}" r="{r}" fill="{color}" opacity="{opacity:.2f}"/>')

# Legend
ly = svg_height - 12
svg.append(f'''
  <circle cx="{svg_width - 230}" cy="{ly}" r="4" fill="{dim_text}" opacity="0.4"/>
  <text x="{svg_width - 220}" y="{ly + 4}" fill="{dim_text}" font-size="9">Historisk observation</text>
  <circle cx="{svg_width - 110}" cy="{ly}" r="4" fill="{highlight_color}" opacity="0.85"/>
  <text x="{svg_width - 100}" y="{ly + 4}" fill="{highlight_color}" font-size="9" font-weight="600">Årskryss 2026</text>
''')

svg.append('</svg>')

output_path = sys.argv[2]
with open(output_path, 'w') as f:
    f.write('\n'.join(svg))

print(f"SVG → {output_path}")
for name, _, obs in species_obs:
    print(f"  {name}: {len(obs)} dagar med observationer i intervallet")
