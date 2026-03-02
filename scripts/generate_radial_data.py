#!/usr/bin/env python3
import os
import glob
import csv
import json
from collections import defaultdict
from datetime import datetime

# Convert relative paths to absolute paths based on this script's location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# SCRIPT_DIR is astorp-faglar/scripts
ASTORP_ROOT = os.path.dirname(SCRIPT_DIR) # astorp-faglar/
GAIA_ROOT = os.path.dirname(os.path.dirname(ASTORP_ROOT)) # GAIA/

# Path to the TSV exports and output JSON
TSV_DIR = os.path.join(GAIA_ROOT, "Fåglar", "Artportalen", "export", "obsar")
HISTORIC_CSV_DIR = os.path.join(GAIA_ROOT, "Fåglar", "data_mining", "downloads", "alla_faglar_astorp")
EXCURSION_DIR = os.path.join(GAIA_ROOT, "Fåglar", "Exkursioner")
OUTPUT_STATIC_FILE = os.path.join(ASTORP_ROOT, "static", "data", "species_days_historic.json")

# Locations that count as "Åstorp" for the Årshjul
ASTORP_LOCATIONS = {
    "åstorp", "tomarp", "kvidinge", "kundinge", "sönnarslöv",
    "kölslätta", "körslättaravinen", "kungsgårdsmaderna", "tranarpsbron",
    "hyllinge", "maglaby", "rörspjäll", "tomarps ene",
}

def is_astorp_location(location):
    """Check if a location name belongs to the Åstorp area."""
    return location.lower().strip() in ASTORP_LOCATIONS


def process_excursion_files(species_data):
    """Process System C excursion JSON files and merge into species_data."""
    if not os.path.isdir(EXCURSION_DIR):
        print(f"No excursion directory found at {EXCURSION_DIR}, skipping System C.")
        return 0

    json_files = glob.glob(os.path.join(EXCURSION_DIR, "*.json"))
    count = 0

    for filepath in json_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"  ⚠️ Skipping {filepath}: {e}")
            continue

        location = data.get("location", "")
        date_str = data.get("date", "")

        if not is_astorp_location(location):
            print(f"  Skipping {filepath} (location '{location}' is not Åstorp)")
            continue

        if not date_str or len(date_str) != 10:
            print(f"  ⚠️ Skipping {filepath}: invalid date '{date_str}'")
            continue

        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            mm_dd = dt.strftime("%m-%d")
            year = dt.year
        except ValueError:
            print(f"  ⚠️ Skipping {filepath}: cannot parse date '{date_str}'")
            continue

        species_list = data.get("species", [])
        for sp in species_list:
            name = sp.get("name", "").strip().capitalize()
            if not name:
                continue
            # Add this year to the set for this species+day
            # Deduplication is automatic: if Artportalen already has
            # the same species+day+year, the set won't grow.
            species_data[name][mm_dd].add(year)
            count += 1

    print(f"Processed {len(json_files)} excursion files, {count} species-day entries added.")
    return len(json_files)


def process_tsv_files():
    # Dictionary to hold the aggregated data:
    # { "Artnamn": { "MM-DD": number_of_unique_years_seen } }
    # To count unique years, we'll store a set of years per day.
    # { "Artnamn": { "MM-DD": set(YYYY) } }
    species_data = defaultdict(lambda: defaultdict(set))
    
    # ── Source A: Artportalen TSV/CSV ──
    tsv_files = glob.glob(os.path.join(TSV_DIR, "*.tsv"))
    # The SOS export is often named .csv but is tab-separated
    csv_files = glob.glob(os.path.join(HISTORIC_CSV_DIR, "*.csv")) 
    all_files = tsv_files + csv_files

    print(f"Found {len(all_files)} Artportalen files to process.")
    
    for filename in all_files:
        print(f"Processing {filename}...")
        with open(filename, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter='\t')
            
            for row in reader:
                # SOS API uses VernacularName and StartDate, old TSVs use Artnamn and Startdatum
                artnamn = row.get("Artnamn") or row.get("VernacularName")
                startdatum = row.get("Startdatum") or row.get("StartDate")
                
                if not artnamn or not startdatum:
                    continue
                
                # Clean up species name (capitalize first letter)
                artnamn = artnamn.strip().capitalize()
                
                if artnamn.lower() in ("sädgås", "ob. skogsgås/tundragås"):
                    artnamn = "Skogsgås"
                
                try:
                    # Parse date Assuming format YYYY-MM-DD
                    dt = datetime.strptime(startdatum[:10], "%Y-%m-%d") # Use [:10] in case of datetime
                    mm_dd = dt.strftime("%m-%d")
                    year = dt.year
                    
                    # Add the year to the set for this species and day
                    species_data[artnamn][mm_dd].add(year)
                except ValueError:
                    pass # Skip silent to avoid massive log spam

    # ── Source C: Personal Excursion Registry ──
    print(f"\nProcessing excursion files (System C)...")
    process_excursion_files(species_data)

    # Prepare final JSON data by counting the unique years
    # Format: { "Artnamn": { "01-01": 5, "05-12": 2, ... } }
    final_data = {}
    for artnamn, days in species_data.items():
        if len(days) > 0:
            final_data[artnamn] = {}
            for mm_dd, years in days.items():
                final_data[artnamn][mm_dd] = len(years)

    # Make output directory if it doesn't exist
    os.makedirs(os.path.dirname(OUTPUT_STATIC_FILE), exist_ok=True)
    
    # Save to JSON
    with open(OUTPUT_STATIC_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, separators=(',', ':')) # minified output
        
    print(f"\nSuccessfully wrote aggregated data to {OUTPUT_STATIC_FILE}")
    print(f"Processed {len(final_data)} unique species.")

if __name__ == "__main__":
    process_tsv_files()
