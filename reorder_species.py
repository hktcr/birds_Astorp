import re
import json
import openpyxl

print("Loading mapping...")

# --- Load AviList taxonomy --- #
wb = openpyxl.load_workbook('/Users/hakankarlsson/Library/CloudStorage/GoogleDrive-hlg.karlsson@gmail.com/Min enhet/🌎GAIA/Fåglar/Taxonomi/AviList-v2025-11Jun-extended.xlsx', read_only=True)
ws = wb.active
avilist_order = {} # latin -> sequence
for row in ws.iter_rows(min_row=2, values_only=True):
    seq, taxon_rank = row[0], row[1]
    sci_name = row[5]
    if sci_name and taxon_rank in ('species', 'subspecies'):
        avilist_order[sci_name] = seq

# Missing manual mappings:
manual_map = {
    "Klippduva (tamduva)": "Columba livia",
    "Sjöorre": "Melanitta nigra",
    "Kråka": "Corvus corone cornix", 
    "Gråkråka": "Corvus corone cornix",
    "Klykstjärtad stormsvala": "Hydrobates leucorhous",
    "Duvhök": "Astur gentilis"
}

# --- Read faltlistan.html --- #
with open('/Users/hakankarlsson/Library/CloudStorage/GoogleDrive-hlg.karlsson@gmail.com/Min enhet/🌎GAIA/Deployments/krysslista/faltlistan.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Locate the S array lines
start_idx = html.find('const S = [')
end_idx = html.find('        ];\n', start_idx) + 10
if start_idx == -1 or end_idx < start_idx:
    print("Could not find S array in faltlistan.html")
    exit(1)

s_content = html[start_idx:end_idx]

import ast

groups = []
current_group = []
group_name = ""

for line in s_content.split('\n'):
    if 'const S =' in line or '];' in line:
        continue
    
    line_s = line.strip()
    if not line_s:
        continue

    # Note down group comments
    if line_s.startswith('//'):
        groups.append({'name': line_s, 'items': []})
        continue
        
    m = re.search(r'\{\s*(?:g:\s*"([^"]*)",\s*)?n:\s*"([^"]*)",\s*l:\s*"([^"]*)"\s*\}', line)
    if m:
        g, n, l = m.groups()
        latin = manual_map.get(n, l)
        
        seq = avilist_order.get(latin, 999999)
        if seq == 999999: # Try fuzzy match or species guide
           pass
           
        if groups:
           groups[-1]['items'].append({
               'g': g, 'n': n, 'l': l, 'latin_lookup': latin, 'seq': seq, 'original_line': line
           })

# Reorder within groups
new_s_lines = ["        const S = ["]
all_flattened_sorted = [] # for species-data.js later

print("\nReordering faltlistan.html within groups...")
for g in groups:
    new_s_lines.append("            " + g['name'])
    # Sort items by seq (AviList order)
    g['items'].sort(key=lambda x: x['seq'])
    
    for i, item in enumerate(g['items']):
        all_flattened_sorted.append(item)
        
        g_str = f'g: "{item["g"]}", ' if item["g"] else ""
        comma = "," if not (g == groups[-1] and i == len(g['items'])-1) else ""
        new_line = f'            {{ {g_str}n: "{item["n"]}", l: "{item["l"]}" }}{comma}'
        new_s_lines.append(new_line)
        
new_s_lines.append("        ];")

new_html = html[:start_idx] + '\n'.join(new_s_lines) + html[end_idx:]

with open('/Users/hakankarlsson/Library/CloudStorage/GoogleDrive-hlg.karlsson@gmail.com/Min enhet/🌎GAIA/Deployments/krysslista/faltlistan.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Updated faltlistan.html!")

# --- Regenerate species-data.js --- #
print("\nReordering species-data.js globally...")
all_flattened_sorted.sort(key=lambda x: x['seq'])

js_lines = [
    "// Data genererad via gAIa från AviList v2025-11Jun-extended.xlsx",
    "// Ordningen följer strikt global taxonomi.",
    "const SPECIES_DATABASE = ["
]

for idx, item in enumerate(all_flattened_sorted):
    import unicodedata
    def make_id(name):
        n = name.lower()
        n = n.replace('å', 'a').replace('ä', 'a').replace('ö', 'o')
        n = re.sub(r'[^a-z0-9]+', '-', n)
        n = n.strip('-')
        return n
        
    id_str = make_id(item['n'])
    
    comma = "," if idx < len(all_flattened_sorted) - 1 else ""
    js_lines.append(f'  {{ id: "{id_str}", name: "{item["n"]}", order: {idx+1} }}{comma}')

js_lines.append("];")
js_lines.append("")

with open('/Users/hakankarlsson/Library/CloudStorage/GoogleDrive-hlg.karlsson@gmail.com/Min enhet/🌎GAIA/Deployments/krysslista/species-data.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(js_lines))

print("Updated species-data.js!")
