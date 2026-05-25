#!/usr/bin/env python3
"""
Generate individual bird observation JSON for the obs-explorer.
Reads Artportalen GeoJSON export and produces a per-species map of observations.

Output format:
{
  "Gulsparv": [
    {"id": "obs-1", "date": "2024-06-15", "lat": 56.136, "lng": 13.043,
     "locality": "Kvidinge", "count": 2, "observer": "Håkan Karlsson"}
  ],
  ...
}
"""

import json
import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

# Input: Artportalen GeoJSON export
GEOJSON_PATH = os.path.join(
    PROJECT_DIR, "resources", "artportalen-kommun-export",
    "astorp_kommun_alla_observationer_2026-02-19.geojson"
)

# Output paths
STATIC_OUTPUT = os.path.join(PROJECT_DIR, "static", "data", "bird_observations_individual.json")
DOCS_OUTPUT = os.path.join(PROJECT_DIR, "docs", "data", "bird_observations_individual.json")


def capitalize_species(name: str) -> str:
    """Capitalize first letter of species name (bläsand → Bläsand)."""
    if not name:
        return name
    return name[0].upper() + name[1:]


def parse_date(date_str: str) -> str:
    """Extract date portion from ISO datetime string."""
    if not date_str:
        return "okänt"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        # Try just taking first 10 chars
        return date_str[:10] if len(date_str) >= 10 else date_str


def main():
    print(f"Reading GeoJSON from: {GEOJSON_PATH}")
    
    if not os.path.exists(GEOJSON_PATH):
        print(f"ERROR: File not found: {GEOJSON_PATH}")
        sys.exit(1)
    
    with open(GEOJSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    
    features = data.get("features", [])
    print(f"Total features in GeoJSON: {len(features)}")
    
    # Filter to birds only
    bird_obs = []
    skipped_no_coords = 0
    skipped_no_name = 0
    
    for feat in features:
        props = feat.get("properties", {})
        
        # Only birds
        if props.get("OrganismGroup") != "Fåglar":
            continue
        
        # Must have vernacular name
        vname = (props.get("VernacularName") or "").strip()
        if not vname:
            skipped_no_name += 1
            continue
        
        # Must have coordinates
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", [])
        if not coords or len(coords) < 2:
            skipped_no_coords += 1
            continue
        
        lng, lat = coords[0], coords[1]
        
        # Parse count
        count = props.get("IndividualCount") or props.get("OrganismQuantityInt") or props.get("OrganismQuantity") or 1
        try:
            count = int(count)
        except (ValueError, TypeError):
            count = 1
        
        # Parse observer
        observer = (props.get("RecordedBy") or props.get("ReportedBy") or "okänd").strip() or "okänd"
        
        # Parse locality (clean up verbose names)
        locality = props.get("Municipality", "Åstorp")
        # Try to get more specific locality from OccurrenceId or other fields
        # The GeoJSON from Artportalen doesn't always have a fine-grained locality field
        # We'll use coordinates to distinguish points
        
        bird_obs.append({
            "species": capitalize_species(vname),
            "scientificName": props.get("ScientificName") or "",
            "date": parse_date(props.get("StartDate", "")),
            "lat": round(lat, 5),
            "lng": round(lng, 5),
            "locality": locality,
            "count": count,
            "observer": observer,
        })
    
    print(f"Bird observations: {len(bird_obs)}")
    print(f"Skipped (no coords): {skipped_no_coords}")
    print(f"Skipped (no name): {skipped_no_name}")
    
    # Group by species
    species_map = {}
    obs_id = 0
    
    # Sort by species, then by date (newest first)
    bird_obs.sort(key=lambda x: (x["species"], x["date"]), reverse=True)
    # Re-sort so species are alphabetical, dates newest-first within each
    bird_obs.sort(key=lambda x: x["species"])
    
    for obs in bird_obs:
        sp = obs["species"]
        if sp not in species_map:
            species_map[sp] = []
        
        obs_id += 1
        species_map[sp].append({
            "id": f"obs-{obs_id}",
            "date": obs["date"],
            "lat": obs["lat"],
            "lng": obs["lng"],
            "locality": obs["locality"],
            "count": obs["count"],
            "observer": obs["observer"],
        })
    
    # Sort each species' observations by date (newest first)
    for sp in species_map:
        species_map[sp].sort(key=lambda x: x["date"], reverse=True)
    
    # Sort species alphabetically (Swedish locale-friendly via key)
    sorted_map = dict(sorted(species_map.items()))
    
    print(f"\nTotal species: {len(sorted_map)}")
    
    # Show top 5 by observation count
    top5 = sorted(sorted_map.items(), key=lambda x: len(x[1]), reverse=True)[:5]
    print("Top 5 most observed:")
    for sp, obs_list in top5:
        print(f"  {sp}: {len(obs_list)} observations")
    
    # Write output
    output_json = json.dumps(sorted_map, ensure_ascii=False, separators=(",", ":"))
    
    for output_path in [STATIC_OUTPUT, DOCS_OUTPUT]:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(output_json)
        size_kb = os.path.getsize(output_path) / 1024
        print(f"Written: {output_path} ({size_kb:.0f} KB)")
    
    print("\nDone!")


if __name__ == "__main__":
    main()
