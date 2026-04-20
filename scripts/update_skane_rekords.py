import json

with open("skane-fenologi-rekord.json", "r") as f:
    current = json.load(f)

with open("parsed_skane_rekord.json", "r") as f:
    fisk = json.load(f)

for art, date in fisk.items():
    if art not in current:
        current[art] = {
            "skane_rekord_vart": date,
            "astorp_rekord_vart": None
        }
    else:
        current[art]["skane_rekord_vart"] = date

with open("skane-fenologi-rekord.json", "w", encoding="utf-8") as f:
    json.dump(current, f, ensure_ascii=False, indent=2)

