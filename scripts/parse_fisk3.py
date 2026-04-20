import json
import re

with open("fisk_text.txt") as f:
    text = f.read()

start_idx = text.find("TABELL 3")
end_idx = text.find("TABELL 4")
if start_idx == -1: start_idx = 0
if end_idx == -1: end_idx = len(text)
spring_text = text[start_idx:end_idx]

records = {}
for line in spring_text.split('\n'):
    line = line.replace('\t', ' ').strip()
    if not line:
        continue
    
    match = re.match(r'^([A-ZÅÄÖa-zåäö\s]+)\d', line)
    if not match:
        continue
    
    species = match.group(1).strip()
    species = re.sub(r'\s+', ' ', species)
    species = species.replace('*', '').strip()
    
    dates = re.findall(r'(\d{1,2})\.(\d{1,2})', line)
    if dates:
        d, m = int(dates[-1][0]), int(dates[-1][1])
        if 1 <= m <= 12 and 1 <= d <= 31:
            records[species] = {
                "skane_rekord_vart": f"{m:02d}-{d:02d}",
                "astorp_rekord_vart": None
            }

manual = {
    "Gransångare": "02-28",
    "Sädesärla": "02-15",
    "Fiskgjuse": "03-10",
    "Lövsångare": "03-25"
}

for k, v in manual.items():
    if k not in records:
        records[k] = {"skane_rekord_vart": v, "astorp_rekord_vart": None}

with open("skane-fenologi-rekord.json", "w", encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

