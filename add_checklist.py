import json

checklist_path = "data/checklist-2026.json"

with open(checklist_path, "r", encoding="utf-8") as f:
    data = json.load(f)

new_obs1 = {
    "species": "Hussvala",
    "latin": "Delichon urbicum",
    "date": "2026-04-24",
    "location": "Körslättabäckens våtmarker",
    "lat": 56.093059657874605,
    "lng": 13.065669791540584
}

new_obs2 = {
    "species": "Trädpiplärka",
    "latin": "Anthus trivialis",
    "date": "2026-04-24",
    "location": "Körslättabäckens våtmarker",
    "lat": 56.093059657874605,
    "lng": 13.065669791540584
}

data["observations"].append(new_obs1)
data["observations"].append(new_obs2)

with open(checklist_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print("Added Hussvala and Trädpiplärka to checklist-2026.json")
