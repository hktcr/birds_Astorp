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
OUTPUT_STATIC_FILE = os.path.join(ASTORP_ROOT, "static", "data", "species_days_historic.json")

def process_tsv_files():
    # Dictionary to hold the aggregated data:
    # { "Artnamn": { "MM-DD": number_of_unique_years_seen } }
    # To count unique years, we'll store a set of years per day.
    # { "Artnamn": { "MM-DD": set(YYYY) } }
    species_data = defaultdict(lambda: defaultdict(set))
    
    # Get all TSV files in the directory
    tsv_files = glob.glob(os.path.join(TSV_DIR, "*.tsv"))
    print(f"Found {len(tsv_files)} TSV files to process.")
    
    for filename in tsv_files:
        print(f"Processing {filename}...")
        with open(filename, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter='\t')
            
            # Print fieldnames to debug
            print(f"Headers: {reader.fieldnames}")
            for row in reader:
                artnamn = row.get("Artnamn")
                startdatum = row.get("Startdatum")
                
                if not artnamn or not startdatum:
                    continue
                
                try:
                    # Parse date Assuming format YYYY-MM-DD
                    dt = datetime.strptime(startdatum, "%Y-%m-%d")
                    mm_dd = dt.strftime("%m-%d")
                    year = dt.year
                    
                    # Add the year to the set for this species and day
                    species_data[artnamn][mm_dd].add(year)
                except ValueError:
                    print(f"Skipping invalid date format: {startdatum} for {artnamn}")

    # Prepare final JSON data by counting the unique years
    # Format: { "Artnamn": { "01-01": 5, "05-12": 2, ... } }
    final_data = {}
    for artnamn, days in species_data.items():
        final_data[artnamn] = {}
        for mm_dd, years in days.items():
            final_data[artnamn][mm_dd] = len(years)

    # Make output directory if it doesn't exist
    os.makedirs(os.path.dirname(OUTPUT_STATIC_FILE), exist_ok=True)
    
    # Save to JSON
    with open(OUTPUT_STATIC_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, separators=(',', ':')) # minified output
        
    print(f"Successfully wrote aggregated data to {OUTPUT_STATIC_FILE}")
    print(f"Processed {len(final_data)} unique species.")

if __name__ == "__main__":
    process_tsv_files()
