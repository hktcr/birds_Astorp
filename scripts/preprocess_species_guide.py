#!/usr/bin/env python3
"""
Preprocess Artportalen GeoJSON export → species-guide.json

Reads the full Artportalen export for Åstorp municipality and produces
a compact JSON file with per-species monthly observation counts,
rarity categories, and metadata for the Artguide web page.

Usage:
    python3 scripts/preprocess_species_guide.py

Input:  resources/artportalen-kommun-export/astorp_kommun_alla_observationer_*.geojson
Output: static/data/species-guide.json
"""

import json
import glob
import os
import sys
from collections import defaultdict
from datetime import date

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)  # astorp-faglar/
TAXON_LIST_PATH = os.path.join(PROJECT_DIR, "static", "data", "TaxonList_fåglar_Åstorpskommun.csv")
SVENSKA_NAMN_PATH = os.path.join(PROJECT_DIR, "data", "svenska-namn.json")


# Taxa to exclude: aggregated taxa, family-level entries, subspecies with NE status
EXCLUDE_PREFIXES = ["ob. "]
EXCLUDE_EXACT = {
    # Family-level / aggregate taxa
    "fasanfåglar",
    "hägrar",
    "gäss",
    "korsnäbbar",
    "vråkar",
}
# Hybrid combos to exclude (lowercase)
EXCLUDE_HYBRIDS = {
    "bofink/bergfink",
    "hornuggla/jorduggla",
    "mindre sångsvan/sångsvan",
}
# Subspecies/NE entries to exclude (lowercase)
EXCLUDE_SUBSPECIES = {
    "vanlig nötväcka",
    "nordlig gulärla",
    "sydlig gulärla",
    "västlig svart rödstjärt",
    "nordsjösilltrut",
    "europeisk sånglärka",  # subspecies-level; sånglärka is the species
}

# Name remapping: merge old/aggregate taxa into accepted species
# "sädgås" and "ob. skogsgås/tundragås" = obestämda records that in Skåne
# overwhelmingly represent skogsgås (Anser fabalis), not tundragås.
NAME_REMAP = {
    "sädgås": "skogsgås",
    "ob. skogsgås/tundragås": "skogsgås",
    "kråka": "gråkråka",  # modern taxonomy split
    "stäpphök/ängshök": "ängshök",  # hybrid combo → count as ängshök
}
LATIN_REMAP = {
    "Anser fabalis/serrirostris": "Anser fabalis",
    "Corvus corone": "Corvus cornix",  # kråka → gråkråka
}

# Category thresholds (total observations)
CATEGORIES = [
    (50, "abundant"),    # ≥50: Förväntad
    (10, "regular"),     # 10-49: Möjlig
    (5, "uncommon"),     # 5-9: Ovanlig
    (1, "rare"),         # 1-4: Raritet
]

def find_geojson(base_dir):
    """Find the most recent GeoJSON export."""
    pattern = os.path.join(
        base_dir,
        "resources",
        "artportalen-kommun-export",
        "astorp_kommun_alla_observationer_*.geojson"
    )
    files = glob.glob(pattern)
    if not files:
        # Try from project root
        pattern = os.path.join(
            base_dir,
            "..",
            "resources",
            "artportalen-kommun-export",
            "astorp_kommun_alla_observationer_*.geojson"
        )
        files = glob.glob(pattern)
    if not files:
        print(f"ERROR: No GeoJSON file found matching pattern")
        sys.exit(1)
    # Return most recent by filename
    return sorted(files)[-1]


def should_exclude(name_lower):
    """Check if a species name should be excluded."""
    if not name_lower or name_lower.strip() == "":
        return True
    for prefix in EXCLUDE_PREFIXES:
        if name_lower.startswith(prefix):
            return True
    if name_lower in EXCLUDE_EXACT:
        return True
    if name_lower in EXCLUDE_HYBRIDS:
        return True
    if name_lower in EXCLUDE_SUBSPECIES:
        return True
    return False


def categorize(total):
    """Assign rarity category based on total observations."""
    for threshold, category in CATEGORIES:
        if total >= threshold:
            return category
    return "rare"


def capitalize_swedish(name):
    """Capitalize Swedish bird name (first letter only)."""
    if not name:
        return name
    return name[0].upper() + name[1:]

def load_svenska_namn():
    """Läs in NL20 officiella svenska namn."""
    if not os.path.exists(SVENSKA_NAMN_PATH):
        print(f"⚠️ Hittar inte {SVENSKA_NAMN_PATH}, använder fallback-namn.")
        return {}
    with open(SVENSKA_NAMN_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_taxon_list():
    """Läs TaxonList CSV och returnera mappning: latin/svenst namn -> taxonomisk position och namn."""
    if not os.path.exists(TAXON_LIST_PATH):
        print(f"❌ Hittar inte TaxonList: {TAXON_LIST_PATH}")
        sys.exit(1)

    taxa = {}
    with open(TAXON_LIST_PATH, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            parts = line.strip().split(';')
            if len(parts) < 2:
                continue
            name = parts[0].strip()
            sci = parts[1].strip()
            if not name or not sci:
                continue
            
            data = {
                "name": name,
                "latin": sci,
                "sort_order": line_num
            }
            taxa[name.lower()] = data
            taxa[sci.lower()] = data
    return taxa


def main():
    # Determine base directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir)

    # Also check if GeoJSON is in the GAIA directory
    gaia_base = os.path.expanduser(
        "~/Library/CloudStorage/GoogleDrive-hlg.karlsson@gmail.com/"
        "Min enhet/🌎GAIA/Fåglar/astorp-faglar"
    )

    geojson_path = None
    for search_dir in [base_dir, gaia_base]:
        try:
            geojson_path = find_geojson(search_dir)
            break
        except SystemExit:
            continue

    if geojson_path is None:
        print("ERROR: Could not find GeoJSON export in any expected location")
        sys.exit(1)

    print(f"Reading: {os.path.basename(geojson_path)}")
    print(f"  Path: {geojson_path}")

    # Parse GeoJSON
    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    print(f"  Total features: {len(features)}")

    taxon_list = load_taxon_list()
    svenska_namn = load_svenska_namn()

    # Aggregate per species
    species_data = defaultdict(lambda: {
        "total": 0,
        "months": defaultdict(int),
        "latin": None
    })

    # Detect GeoJSON format: old Artportalen web export vs new SOS API export
    sample_props = features[0].get("properties", {}) if features else {}
    is_api_format = "VernacularName" in sample_props
    if is_api_format:
        print("  Format: SOS API GeoJSON (VernacularName, StartDate, ...)")
    else:
        print("  Format: Artportalen web export (Svenskt namn, Startdatum, ...)")

    excluded_count = 0
    for feat in features:
        props = feat.get("properties", {})

        # Extract fields based on format
        if is_api_format:
            name_raw = props.get("VernacularName") or ""
            latin = props.get("ScientificName") or ""
            start_date = props.get("StartDate") or ""
            # Extract month from ISO date: "2024-12-12T11:48:00" → 12
            month = int(start_date[5:7]) if len(start_date) >= 7 else None
        else:
            name_raw = props.get("Svenskt namn", "")
            month = props.get("Startdatum (månad)")
            latin = props.get("Vetenskapligt namn", "")

        name_lower = name_raw.lower().strip()

        # Remap aggregate taxa to accepted species (must happen before exclusion check)
        name_lower = NAME_REMAP.get(name_lower, name_lower)

        if should_exclude(name_lower):
            excluded_count += 1
            continue

        latin = LATIN_REMAP.get(latin, latin)

        species_data[name_lower]["total"] += 1
        if month is not None:
            species_data[name_lower]["months"][int(month)] += 1
        if latin and not species_data[name_lower]["latin"]:
            species_data[name_lower]["latin"] = latin

    print(f"  Excluded observations: {excluded_count}")
    print(f"  Unique species: {len(species_data)}")

    # Build output
    species_list = []
    
    # We only include species that are in the TaxonList to filter out Jaktfalk and similar errors
    taxa_processed = set()
    
    for name_lower, info in species_data.items():
        latin = info["latin"] or ""
        
        # Determine taxonomy from TaxonList
        taxon_info = taxon_list.get(name_lower)
        if not taxon_info and latin:
            taxon_info = taxon_list.get(latin.lower())
            
        if not taxon_info:
            continue
            
        avi_name = taxon_info["name"]
        sort_order = taxon_info["sort_order"]
        
        # Avoid duplicate entries for the same resolved taxon
        if avi_name in taxa_processed:
            # We already added this taxon, we should merge the totals/months
            for sp in species_list:
                if sp["_avi_name"] == avi_name:
                    sp["total"] += info["total"]
                    for m in range(12):
                        sp["months"][m] += info["months"].get(m+1, 0)
                    sp["category"] = categorize(sp["total"])
                    break
            continue
            
        taxa_processed.add(avi_name)
        
        # 1. Look up in NL20 (svenska_namn) by scientific name
        # 2. If not found, fallback to AviList (TaxonList)
        final_name = svenska_namn.get(latin.lower(), avi_name)
        
        # Special case for Tamduva/Klippduva
        if final_name.lower() == "klippduva" or avi_name.lower() == "tamduva":
            final_name = "Klippduva (tamduva)"

        months_array = [info["months"].get(m, 0) for m in range(1, 13)]
        species_list.append({
            "name": capitalize_swedish(final_name),
            "latin": latin,
            "total": info["total"],
            "category": categorize(info["total"]),
            "months": months_array,
            "sortOrder": sort_order,
            "_avi_name": avi_name
        })

    # Sort by taxonomic order
    species_list.sort(key=lambda s: s["sortOrder"])

    # Remove internal fields
    for sp in species_list:
        del sp["sortOrder"]
        del sp["_avi_name"]

    # Category summary
    cat_counts = defaultdict(int)
    for sp in species_list:
        cat_counts[sp["category"]] += 1

    print(f"\nCategories:")
    print(f"  Förväntad (≥50):  {cat_counts['abundant']}")
    print(f"  Möjlig (10-49):   {cat_counts['regular']}")
    print(f"  Ovanlig (5-9):    {cat_counts['uncommon']}")
    print(f"  Raritet (1-4):    {cat_counts['rare']}")

    # Extract export date from filename
    basename = os.path.basename(geojson_path)
    export_date = basename.replace("astorp_kommun_alla_observationer_", "").replace(".geojson", "")

    output = {
        "generated": date.today().isoformat(),
        "exportDate": export_date,
        "source": "Artportalen — samtliga fågelobservationer, Åstorps kommun",
        "totalObservations": sum(sp["total"] for sp in species_list),
        "species": species_list,
    }

    # Write output
    output_path = os.path.join(base_dir, "static", "data", "species-guide.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    file_size = os.path.getsize(output_path)
    print(f"\nOutput: {output_path}")
    print(f"  Species: {len(species_list)}")
    print(f"  File size: {file_size:,} bytes ({file_size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
