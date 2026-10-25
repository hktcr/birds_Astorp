"""Fail a release when Hugo and browser-facing data disagree."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
for name in ("checklist-2026.json", "locations.json"):
    source = json.loads((root / "data" / name).read_text())
    for folder in ("static/data", "docs/data"):
        actual = json.loads((root / folder / name).read_text())
        if actual != source:
            raise SystemExit(f"Osynkad data: {folder}/{name}")

observations = json.loads((root / "data/checklist-2026.json").read_text())["observations"]
guide = json.loads((root / "static/data/species-guide.json").read_text())
for relative in ("docs/data/species-guide.json",):
    if json.loads((root / relative).read_text()) != guide:
        raise SystemExit(f"Osynkad artstatistik: {relative}")
names = [sp['name'] for sp in guide['species']]
if len(names) != len(set(names)):
    raise SystemExit("Dubblettarter i artstatistiken")
for sp in guide['species']:
    if len(sp['months']) != 12 or any(not isinstance(n, int) or n < 0 for n in sp['months']):
        raise SystemExit(f"Ogiltiga månadsantal: {sp['name']}")
    if sp['total'] != sum(sp['months']):
        # Preserve this documented anomaly in the existing 2026-03-01 export.
        # Any new mismatch needs source review, not inferred monthly counts.
        if (guide.get('exportDate'), sp['name'], sp['total'], sum(sp['months'])) != ('2026-03-01', 'Rödhalsad gås', 1, 0):
            raise SystemExit(f"Ny källavvikelse i månadsstatistik: {sp['name']}")
        print(f"Befintlig källavvikelse (oförändrad): {sp['name']}, total {sp['total']}, månadssumma {sum(sp['months'])}")
print(f"Artstatistik synkad: {len(names)} arter, export {guide.get('exportDate')}.")
species = {obs["species"] for obs in observations}
if len(species) != len(observations):
    raise SystemExit("Dubblettarter i årslistan")
print(f"Datasynk verifierad: {len(species)} arter, alla tre kopior överens.")

# New-generation outputs must come from exactly the same source and taxonomy policy.
# Legacy data is retained, not retroactively certified by this check.
radial = json.loads((root / "static/data/species_days_historic.json").read_text())
provenance, radial_meta = guide.get("provenance", {}), radial.get("_meta", {})
if provenance or "dataProviderId" in radial_meta:
    for meta in (provenance, radial_meta):
        if (type(meta.get("dataProviderId")) is not int or meta.get("dataProviderId") != 1 or meta.get("municipalityId") != "1277" or meta.get("sensitiveObservations") is not False or meta.get("complete") is not True
                or meta.get("taxonomyPolicy") != "species-rank-only-v1"
                or not isinstance(meta.get("recordsSha256"), str) or len(meta["recordsSha256"]) != 64):
            raise SystemExit("Ofullständig eller oväntad källproveniens")
    if provenance["recordsSha256"] != radial_meta["recordsSha256"]:
        raise SystemExit("Artguide och årshjul bygger på olika källuttag")
    if json.loads((root / "docs/data/species_days_historic.json").read_text()) != radial:
        raise SystemExit("Osynkat årshjul")
else:
    print("Äldre underlag: inte källcertifierat; blandad historik måste regenereras och stämmas av.")
