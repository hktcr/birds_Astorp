#!/usr/bin/env python3
"""Generate a first-arrival-per-year SVG for strandskata and sädesärla."""
import json
from datetime import date

with open('/tmp/first_arrivals.json', 'r') as f:
    data = json.load(f)

# Filter to spring arrivals only (Jan 1 – May 31) to exclude autumn anomalies
def spring_arrivals(species_data):
    result = []
    for year_str, d in species_data.items():
        year = int(year_str)
        m, day = d['month'], d['day']
        if m <= 5:  # Spring only
            result.append((year, m, day))
    return sorted(result)

strandskata = spring_arrivals(data.get("Strandskata", {}))
sadesarla = spring_arrivals(data.get("Sädesärla", {}))

# Add 2026 observation
strandskata.append((2026, 3, 20))
sadesarla.append((2026, 3, 20))

print("Strandskata spring arrivals:", [(y, m, d) for y,m,d in strandskata])
print("Sädesärla spring arrivals:", [(y, m, d) for y,m,d in sadesarla])

# Timeline: Feb 15 – May 15
start_ref = date(2026, 2, 15)
end_ref = date(2026, 5, 15)
total_days = (end_ref - start_ref).days

svg_width = 820
svg_height = 310
margin_left = 100
margin_right = 30
plot_width = svg_width - margin_left - margin_right
row1_y = 120
row2_y = 220

# Colors
bg = "#ffffff"
border = "#e2e8f0"
grid = "#f1f5f9"
axis = "#cbd5e1"
txt = "#1e293b"
dim = "#64748b"
label = "#334155"
blue = "#0284c7"
amber = "#d97706"
rose = "#e11d48"
line = "#e2e8f0"

date_ticks = [
    (3, 1,  "1 mar"),
    (3, 15, "15 mar"),
    (4, 1,  "1 apr"),
    (4, 15, "15 apr"),
    (5, 1,  "1 maj"),
]

def day_to_x(month, day):
    d = date(2026, month, day)
    frac = (d - start_ref).days / total_days
    return margin_left + frac * plot_width

svg = []

svg.append(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_width} {svg_height}"
     style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;">

  <rect width="{svg_width}" height="{svg_height}" rx="10" fill="{bg}" stroke="{border}" stroke-width="1"/>

  <text x="{svg_width/2}" y="30" text-anchor="middle" fill="{txt}"
        font-size="15" font-weight="700">Första vår-observation per år</text>
  <text x="{svg_width/2}" y="48" text-anchor="middle" fill="{dim}"
        font-size="10">Varje prick = ett års första observation i Åstorps kommun · Källa: Artportalen</text>
''')

# Grid + date labels
for month, day, lbl in date_ticks:
    x = day_to_x(month, day)
    is_m = (day == 1)
    svg.append(f'  <line x1="{x}" y1="60" x2="{x}" y2="{svg_height - 45}" stroke="{axis if is_m else grid}" stroke-width="{"1" if is_m else "0.5"}"/>')
    svg.append(f'  <text x="{x}" y="{svg_height - 28}" text-anchor="middle" fill="{label if is_m else dim}" font-size="10" font-weight="{"600" if is_m else "400"}">{lbl}</text>')

# Row lines
for ry in [row1_y, row2_y]:
    svg.append(f'  <line x1="{margin_left}" y1="{ry}" x2="{svg_width - margin_right}" y2="{ry}" stroke="{line}" stroke-width="1" stroke-dasharray="3,5"/>')

# Labels
svg.append(f'  <text x="{margin_left - 10}" y="{row1_y - 15}" text-anchor="end" fill="{blue}" font-size="13" font-weight="700">Strandskata</text>')
svg.append(f'  <text x="{margin_left - 10}" y="{row1_y + 2}" text-anchor="end" fill="{dim}" font-size="9" font-style="italic">Haematopus ostralegus</text>')
svg.append(f'  <text x="{margin_left - 10}" y="{row2_y - 15}" text-anchor="end" fill="{amber}" font-size="13" font-weight="700">Sädesärla</text>')
svg.append(f'  <text x="{margin_left - 10}" y="{row2_y + 2}" text-anchor="end" fill="{dim}" font-size="9" font-style="italic">Motacilla alba</text>')

months_sv = 'jan feb mar apr maj jun jul aug sep okt nov dec'.split()

def draw_arrivals(arrivals, ry, color):
    for year, m, d in arrivals:
        x = day_to_x(m, d)
        # Clamp to plot area
        x = max(margin_left, min(x, svg_width - margin_right))
        
        is_2026 = (year == 2026)
        r = 5 if is_2026 else 4
        
        if is_2026:
            svg.append(f'  <circle cx="{x}" cy="{ry}" r="{r + 7}" fill="none" stroke="{rose}" stroke-width="1.5" opacity="0.25"/>')
            svg.append(f'  <circle cx="{x}" cy="{ry}" r="{r + 4}" fill="none" stroke="{rose}" stroke-width="1" opacity="0.4"/>')
            svg.append(f'  <circle cx="{x}" cy="{ry}" r="{r}" fill="{rose}" opacity="0.9"/>')
            svg.append(f'  <text x="{x}" y="{ry + r + 16}" text-anchor="middle" fill="{rose}" font-size="10" font-weight="700">2026</text>')
            svg.append(f'  <text x="{x}" y="{ry + r + 27}" text-anchor="middle" fill="{dim}" font-size="8">{d} {months_sv[m-1]}</text>')
        else:
            svg.append(f'  <circle cx="{x}" cy="{ry}" r="{r}" fill="{color}" opacity="0.5"/>')
            # Year label above/below, alternating to avoid overlap
            offset = -12 if (year % 2 == 0) else 14
            svg.append(f'  <text x="{x}" y="{ry + offset}" text-anchor="middle" fill="{dim}" font-size="7">{year}</text>')

draw_arrivals(strandskata, row1_y, blue)
draw_arrivals(sadesarla, row2_y, amber)

# Legend
ly = svg_height - 12
svg.append(f'''
  <circle cx="{svg_width - 230}" cy="{ly}" r="4" fill="{dim}" opacity="0.5"/>
  <text x="{svg_width - 220}" y="{ly + 4}" fill="{dim}" font-size="9">Första obs (historiskt år)</text>
  <circle cx="{svg_width - 95}" cy="{ly}" r="4" fill="{rose}" opacity="0.9"/>
  <text x="{svg_width - 85}" y="{ly + 4}" fill="{rose}" font-size="9" font-weight="600">Årskryss 2026</text>
''')

svg.append('</svg>')

output_path = '/Users/hakankarlsson/Library/CloudStorage/GoogleDrive-hlg.karlsson@gmail.com/Min enhet/🌎GAIA/Fåglar/astorp-faglar/static/images/posts/2026-03-20-hallpunkter-i-fagelaret/ankomst-tidslinje.svg'
with open(output_path, 'w') as f:
    f.write('\n'.join(svg))
print(f"\nSVG written to {output_path}")
