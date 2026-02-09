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

# Taxa to exclude: aggregated taxa, family-level entries, subspecies with NE status
EXCLUDE_PREFIXES = ["ob. "]
EXCLUDE_EXACT = {
    "fasanfåglar",
    "hägrar",
}
# Subspecies/NE entries to exclude (lowercase)
EXCLUDE_SUBSPECIES = {
    "vanlig nötväcka",
    "nordlig gulärla",
    "sydlig gulärla",
    "västlig svart rödstjärt",
    "nordsjösilltrut",
    "nordlig kärrsnäppa",
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

    # Aggregate per species
    species_data = defaultdict(lambda: {
        "total": 0,
        "months": defaultdict(int),
        "latin": None,
        "sort_order": float("inf"),
    })

    excluded_count = 0
    for feat in features:
        props = feat.get("properties", {})
        name_raw = props.get("Svenskt namn", "")
        name_lower = name_raw.lower().strip()

        if should_exclude(name_lower):
            excluded_count += 1
            continue

        month = props.get("Startdatum (månad)")
        latin = props.get("Vetenskapligt namn", "")
        sort_order = props.get("Taxon sorteringsordning", float("inf"))

        species_data[name_lower]["total"] += 1
        if month is not None:
            species_data[name_lower]["months"][int(month)] += 1
        if latin and not species_data[name_lower]["latin"]:
            species_data[name_lower]["latin"] = latin
        if sort_order < species_data[name_lower]["sort_order"]:
            species_data[name_lower]["sort_order"] = sort_order

    print(f"  Excluded observations: {excluded_count}")
    print(f"  Unique species: {len(species_data)}")

    # Build output
    species_list = []
    for name_lower, info in species_data.items():
        months_array = [info["months"].get(m, 0) for m in range(1, 13)]
        species_list.append({
            "name": capitalize_swedish(name_lower),
            "latin": info["latin"] or "",
            "total": info["total"],
            "category": categorize(info["total"]),
            "months": months_array,
            "sortOrder": info["sort_order"],
        })

    # Sort by taxonomic order
    species_list.sort(key=lambda s: s["sortOrder"])

    # Remove sortOrder from output (internal only)
    for sp in species_list:
        del sp["sortOrder"]

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
