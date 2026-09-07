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
species = {obs["species"] for obs in observations}
if len(species) != len(observations):
    raise SystemExit("Dubblettarter i årslistan")
print(f"Datasynk verifierad: {len(species)} arter, alla tre kopior överens.")
