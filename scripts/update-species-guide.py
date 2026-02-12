#!/usr/bin/env python3
"""
update-species-guide.py — Regenerera species-guide.json från Artportalen API

Hämtar samtliga fågelobservationer för Åstorps kommun (Municipality 1277)
från SOS API och beräknar månadsfördelning + totaler per art.

OUTPUT:  ../static/data/species-guide.json
         (Rör ALDRIG data/checklist-2026.json!)

KRÄVER: - Python 3
        - requests
        - Giltig API-nyckel i ../../data_mining/config.yaml

ANVÄNDNING:
    cd scripts/
    python3 update-species-guide.py
"""

import json
import os
import sys
import time
from datetime import datetime
from collections import defaultdict

try:
    import requests
except ImportError:
    print("❌ Saknar 'requests'-biblioteket. Installera: pip3 install requests")
    sys.exit(1)

try:
    import yaml
except ImportError:
    # Fallback: läs bara api_key raden manuellt
    yaml = None

# --- Konfiguration ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)  # astorp-faglar/
DATA_MINING_DIR = os.path.join(os.path.dirname(PROJECT_DIR), "data_mining")

CONFIG_PATH = os.path.join(DATA_MINING_DIR, "config.yaml")
TAXON_LIST_PATH = os.path.join(PROJECT_DIR, "static", "data", "TaxonList_fåglar_Åstorpskommun.csv")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "static", "data", "species-guide.json")

# Artportalen SOS API
BASE_URL = "https://api.artdatabanken.se/species-observation-system/v1"
AREA_TYPE = "Municipality"
AREA_FEATURE_ID = "1277"  # Åstorp
TAXON_ID = 4000104  # Aves (alla fåglar)

# Raritetskategorier baserat på observationsantal
def classify_category(total):
    """Klassificera art baserat på totalt antal observationer."""
    if total >= 80:
        return "abundant"    # Förväntad
    elif total >= 20:
        return "regular"     # Möjlig
    elif total >= 5:
        return "uncommon"    # Ovanlig
    else:
        return "rare"        # Raritet


def load_api_key():
    """Ladda API-nyckel från config.yaml."""
    if not os.path.exists(CONFIG_PATH):
        print(f"❌ Hittar inte config: {CONFIG_PATH}")
        sys.exit(1)

    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        if yaml:
            config = yaml.safe_load(f)
            return config.get("api_key", "")
        else:
            # Fallback utan PyYAML
            for line in f:
                if line.strip().startswith("api_key:"):
                    key = line.split(":", 1)[1].strip().strip('"').strip("'")
                    return key
    print("❌ Kunde inte läsa API-nyckel")
    sys.exit(1)


def load_taxon_list():
    """Läs TaxonList CSV och returnera lista med arter i taxonomisk ordning."""
    if not os.path.exists(TAXON_LIST_PATH):
        print(f"❌ Hittar inte TaxonList: {TAXON_LIST_PATH}")
        sys.exit(1)

    species = []
    with open(TAXON_LIST_PATH, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            parts = line.strip().split(';')
            if len(parts) < 2:
                continue
            name = parts[0].strip()
            sci = parts[1].strip()
            if not name or not sci:
                continue
            # Skippa "Ob.", familje-/ordningsgrupper, och hybridnamn
            if name.startswith("Ob.") or '/' in sci or sci.endswith("idae"):
                continue
            # Skippa generiska (bara genus, inget artepithet)
            sci_parts = sci.split()
            if len(sci_parts) < 2:
                continue
            # Skippa underarter (3+ delar) och speciella
            if len(sci_parts) > 2 and "domesticated" not in sci.lower():
                continue

            red_list = parts[3].strip() if len(parts) > 3 else ""
            try:
                count = int(parts[-1].strip())
            except ValueError:
                count = 0

            species.append({
                "name": name,
                "latin": sci,
                "order": line_num,
                "existing_count": count,
                "red_list": red_list,
            })

    print(f"📋 TaxonList: {len(species)} arter laddade")
    return species


def api_request(session, method, url, api_key, max_retries=5, **kwargs):
    """HTTP-request med automatisk retry vid 429 (rate limit)."""
    for attempt in range(max_retries):
        resp = session.request(method, url, **kwargs)
        if resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", 15 * (attempt + 1)))
            print(f"   ⏳ Rate limit — väntar {wait}s (försök {attempt + 1}/{max_retries})")
            time.sleep(wait)
            continue
        return resp
    print(f"❌ Gav upp efter {max_retries} försök")
    return None


def download_all_observations(api_key):
    """Ladda ner samtliga fågelobservationer för Åstorp via paginering."""
    session = requests.Session()
    session.headers.update({
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    })

    search_filter = {
        "taxon": {
            "ids": [TAXON_ID],
            "includeUnderlyingTaxa": True
        },
        "geographics": {
            "areas": [{
                "areaType": AREA_TYPE,
                "featureId": AREA_FEATURE_ID
            }]
        },
        "output": {
            "fields": [
                "event.startDate",
                "taxon.vernacularName",
                "taxon.scientificName",
                "identification.uncertainIdentification"
            ]
        }
    }

    # 1. Räkna först
    count_url = f"{BASE_URL}/Observations/Count"
    resp = api_request(session, "POST", count_url, api_key,
                       params={"sensitiveObservations": "false"},
                       json=search_filter)
    if not resp or resp.status_code != 200:
        print(f"❌ Count misslyckades: {resp.status_code if resp else 'timeout'}")
        sys.exit(1)

    total_count = resp.json()
    print(f"📊 Totalt {total_count} observationer att hämta")

    # 2. Paginerad hämtning
    all_obs = []
    page_size = 1000
    skip = 0

    while skip < total_count:
        search_url = f"{BASE_URL}/Observations/Search"
        resp = api_request(session, "POST", search_url, api_key,
                           params={
                               "sensitiveObservations": "false",
                               "skip": skip,
                               "take": page_size,
                               "translationCultureCode": "sv-SE"
                           },
                           json=search_filter)

        if not resp or resp.status_code != 200:
            print(f"❌ Search misslyckades vid skip={skip}: {resp.status_code if resp else 'timeout'}")
            sys.exit(1)

        records = resp.json().get("records", [])
        if not records:
            break

        all_obs.extend(records)
        skip += page_size
        pct = min(100, int(skip / total_count * 100))
        print(f"   📥 {len(all_obs)}/{total_count} ({pct}%)")

    print(f"✅ Hämtade {len(all_obs)} observationer")
    return all_obs


def process_observations(observations, taxon_list):
    """Beräkna statistik per art från rådata."""

    # Bygg lookup med svenskt namn (lowercase) → TaxonList-post
    taxon_lookup_swe = {}
    taxon_lookup_sci = {}
    for sp in taxon_list:
        taxon_lookup_swe[sp["name"].lower()] = sp
        taxon_lookup_sci[sp["latin"].lower()] = sp

    # Samla statistik
    stats = defaultdict(lambda: {"total": 0, "months": [0] * 12, "uncertain_only": True})

    for obs in observations:
        # Extrahera fält
        taxon = obs.get("taxon", {})
        swe_name = taxon.get("vernacularName", "").strip()
        sci_name = taxon.get("scientificName", "").strip()
        uncertain = obs.get("identification", {}).get("uncertainIdentification", False)

        start_date = obs.get("event", {}).get("startDate", "")

        if not swe_name or not start_date:
            continue

        # Filtrera till rena arter (2-delat vetenskapligt namn)
        # Undantag: "domesticated populations" (t.ex. tamduva)
        sci_parts = sci_name.split()
        if len(sci_parts) != 2 and "domesticated" not in sci_name.lower():
            continue
        if '/' in sci_name or ' x ' in sci_name:
            continue

        key = swe_name.lower()

        # Bara räkna säkra observationer om det inte är osäkert
        if not uncertain:
            stats[key]["uncertain_only"] = False

        # Månadsindex
        try:
            month = int(start_date[5:7]) - 1  # 0-indexerat
            if 0 <= month <= 11:
                stats[key]["months"][month] += 1
                stats[key]["total"] += 1
        except (ValueError, IndexError):
            continue

        # Spara namn
        stats[key]["swe"] = swe_name
        stats[key]["sci"] = sci_name

    print(f"🔢 {len(stats)} unika arter i API-data")
    return stats


def build_species_guide(taxon_list, stats):
    """Bygg species-guide.json-strukturen."""

    species_entries = []

    for sp in taxon_list:
        name = sp["name"]
        latin = sp["latin"]
        key = name.lower()

        # Hämta API-statistik om den finns
        api_stat = stats.get(key)

        # Fallback: matcha via vetenskapligt namn
        if not api_stat:
            api_stat = stats.get(latin.lower())
            if not api_stat:
                # Sök igenom stats efter matchande sci
                for stat_key, stat_val in stats.items():
                    if stat_val.get("sci", "").lower() == latin.lower():
                        api_stat = stat_val
                        break

        if api_stat and api_stat["total"] > 0:
            # Använd API-data (oavsett om alla obs är osäkra — de räknas ändå)
            total = api_stat["total"]
            months = api_stat["months"]
        elif sp["existing_count"] > 0:
            # Arten finns i TaxonList men inte i API (koordinatnoggrannhet etc.)
            # Behåll befintligt antal, tomt månadsfördelning
            total = sp["existing_count"]
            months = [0] * 12
        else:
            # Arten har 0 obs och hittas inte i API — skippa inte, inkludera med 0
            total = 0
            months = [0] * 12

        # Skippa arter som aldrig observerats
        if total == 0:
            continue

        category = classify_category(total)

        species_entries.append({
            "name": name,
            "latin": latin,
            "total": total,
            "category": category,
            "months": months
        })

    return species_entries


def save_species_guide(species_entries, total_observations):
    """Spara species-guide.json."""
    today = datetime.now().strftime("%Y-%m-%d")

    guide = {
        "generated": today,
        "exportDate": today,
        "source": "Artportalen via SOS API — samtliga fågelobservationer, Åstorps kommun",
        "totalObservations": total_observations,
        "species": species_entries
    }

    # Skapa backup av befintlig fil
    if os.path.exists(OUTPUT_PATH):
        backup_path = OUTPUT_PATH + f".backup-{today}"
        if not os.path.exists(backup_path):
            import shutil
            shutil.copy2(OUTPUT_PATH, backup_path)
            print(f"💾 Backup sparad: {os.path.basename(backup_path)}")

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(guide, f, ensure_ascii=False, indent=2)

    print(f"✅ Sparade {len(species_entries)} arter till {os.path.basename(OUTPUT_PATH)}")
    print(f"   Filstorlek: {os.path.getsize(OUTPUT_PATH):,} bytes")


def main():
    print("=" * 60)
    print("🐦 Artportalen → species-guide.json")
    print("   Åstorps kommun (alla fåglar)")
    print("=" * 60)
    print()

    # 1. Ladda konfiguration
    api_key = load_api_key()
    print(f"🔑 API-nyckel: {api_key[:8]}...{api_key[-4:]}")

    # 2. Ladda TaxonList (bestämmer taxonomisk ordning)
    taxon_list = load_taxon_list()

    # 3. Ladda ner observationer från API
    print()
    print("📡 Hämtar data från Artportalen...")
    observations = download_all_observations(api_key)

    # 4. Beräkna statistik
    print()
    print("🧮 Beräknar artstatistik...")
    stats = process_observations(observations, taxon_list)

    # 5. Bygg species-guide
    species_entries = build_species_guide(taxon_list, stats)

    # 6. Spara
    print()
    save_species_guide(species_entries, len(observations))

    # 7. Sammanfattning
    print()
    print("=" * 60)
    print("📊 Sammanfattning")
    print(f"   Arter i TaxonList:    {len(taxon_list)}")
    print(f"   Arter med obs > 0:    {len(species_entries)}")
    print(f"   Totala observationer: {len(observations)}")

    # Kategorier
    cats = defaultdict(int)
    for sp in species_entries:
        cats[sp["category"]] += 1
    print(f"   Förväntade (abundant): {cats['abundant']}")
    print(f"   Möjliga (regular):     {cats['regular']}")
    print(f"   Ovanliga (uncommon):   {cats['uncommon']}")
    print(f"   Rariteter (rare):      {cats['rare']}")
    print("=" * 60)

    print()
    print("⚠️  OBS: data/checklist-2026.json är ORÖRD (som den ska vara)")
    print("💡 Kör nu: cd .. && ./sync-data.sh --deploy")


if __name__ == "__main__":
    main()
