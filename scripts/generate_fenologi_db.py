#!/usr/bin/env python3
import json
import os

GAIA_DIR = "/Users/hakankarlsson/Library/CloudStorage/GoogleDrive-hlg.karlsson@gmail.com/Min enhet/🌎GAIA"
PROJECT_DIR = os.path.join(GAIA_DIR, "Fåglar", "astorp-faglar")

CHECKLIST_PATH = os.path.join(PROJECT_DIR, "data", "checklist-2026.json")
SKANE_REKORDS_PATH = os.path.join(PROJECT_DIR, "data", "skane-fenologi-rekord.json")
GUIDE_PATH = os.path.join(PROJECT_DIR, "data", "species_guide.json")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "static", "data", "fenologi-db.json")

def build_db():
    print("🔄 Sammanställer fenologidatabas...")

    with open(CHECKLIST_PATH, "r", encoding="utf-8") as f:
        checklist = json.load(f)
    
    with open(SKANE_REKORDS_PATH, "r", encoding="utf-8") as f:
        rekords = json.load(f)
        
    with open(GUIDE_PATH, "r", encoding="utf-8") as f:
        guide = json.load(f)

    # 1. Hämta årets första observationer
    obs2026 = {}
    for obs in checklist.get("observations", []):
        species = obs["species"]
        if species not in obs2026:
            obs2026[species] = obs

    # 2. Hämta taxonomisk ordning och latinska namn från species_guide
    guide_species = guide.get("species", [])
    taxo_map = {item["name"]: idx for idx, item in enumerate(guide_species)}
    latin_map = {item["name"]: item["latin"] for item in guide_species}

    # 3. Slå samman all data
    db = []
    
    # Lägg till alla från FiSk (rekorden) + alla som setts i år
    all_species = set(rekords.keys()).union(set(obs2026.keys()))
    
    for name in all_species:
        rec = rekords.get(name, {})
        obs = obs2026.get(name)
        
        # Försök hitta latinskt namn
        latin = rec.get("latin")
        if not latin:
            latin = latin_map.get(name, "")
        if not latin and obs:
            latin = obs.get("latin", "")
            
        taxo_index = taxo_map.get(name, 9999)
        
        db.append({
            "name": name,
            "latin": latin,
            "taxoIndex": taxo_index,
            "skaneRec": rec.get("skane_rekord_vart"),
            "astorpHist": rec.get("astorp_rekord_vart"),
            "obs2026": obs
        })

    # Skapa mappen static/data om den inte finns
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Klar! Sparade {len(db)} arter till {OUTPUT_PATH}")

if __name__ == "__main__":
    build_db()
