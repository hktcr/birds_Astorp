#!/usr/bin/env python3
"""
update_phenology.py - GAIA Phenology Engine 
Korsläser årets fältobservationer (checklist-2026.json) och stämmer av mot den historiska 
databasen (phenology_master.json).
Eventuella nya Åstorps-rekord skrivs in automatiskt.
Dessutom genereras en current-fil för vy på webben med uträknade deltas (hur tidig/sen).
"""

import json
import os
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DATA_DIR = os.path.join(BASE_DIR, "static", "data")

CHECKLIST_PATH = os.path.join(DATA_DIR, "checklist-2026.json")
MASTER_PATH = os.path.join(STATIC_DATA_DIR, "phenology_master.json")
CURRENT_PATH = os.path.join(STATIC_DATA_DIR, "phenology_current.json")

def load_json(p):
    if os.path.exists(p):
        with open(p, 'r') as f:
            return json.load(f)
    return {}

def save_json(data, p):
    with open(p, 'w') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def dt_from_md(md_str, default_year=2026):
    """Parses 'MM-DD' into a datetime for comparison"""
    if not md_str: return None
    return datetime.strptime(f"{default_year}-{md_str}", "%Y-%m-%d")

def format_md(dt):
    """Formats datetime back to 'MM-DD'"""
    if not dt: return None
    return dt.strftime("%m-%d")

def get_delta_days(date1, date2):
    """Returns how many days date1 is later than date2 (negative means early)."""
    if not date1 or not date2: return None
    return (date1 - date2).days

def main():
    checklist = load_json(CHECKLIST_PATH)
    master = load_json(MASTER_PATH)
    
    if not checklist or not master:
        print("Missing checklist or master file.")
        return

    current_year_data = {}
    master_updated = False

    observations = checklist.get("observations", [])
    
    for obs in observations:
        species = obs["species"]
        obs_date_str = obs["date"]  # YYYY-MM-DD
        
        # Only process spring dates right now (Jan-Jun)
        try:
            obs_dt = datetime.strptime(obs_date_str, "%Y-%m-%d")
        except ValueError:
            continue
            
        md_str = format_md(obs_dt)
        
        # 1. Update Master if it's a new Åstorp record!
        m_data = master.get(species, {
            "skane_spring_record": None,
            "skane_fall_record": None,
            "astorp_spring_record": None,
            "astorp_fall_record": None,
            "skof_status": "unverified",
            "is_resident": False
        })
        
        # We assume if it's Resident, we don't track spring arrival really, but let's do it anyway if it's interesting
        # Check if new spring record
        current_record_dt = dt_from_md(m_data["astorp_spring_record"])
        
        is_new_astorp_spring = False
        # If no record exists, or if the new date is earlier (in the spring), update it
        # (Assuming spring records are only relevant before July 1st)
        if obs_dt.month <= 6:
            if not current_record_dt or obs_dt.replace(year=2026) < current_record_dt.replace(year=2026):
                m_data["astorp_spring_record"] = md_str
                master_updated = True
                is_new_astorp_spring = True
                
        master[species] = m_data
        
        # 2. Build current_year_data for frontend rendering (Dashboard)
        skane_rec_dt = dt_from_md(m_data.get("skane_spring_record"))
        ast_rec_dt = dt_from_md(m_data.get("astorp_spring_record"))
        
        delta_skane = get_delta_days(obs_dt.replace(year=2026), skane_rec_dt) if skane_rec_dt else None
        delta_astorp = get_delta_days(obs_dt.replace(year=2026), ast_rec_dt) if ast_rec_dt else None
        
        current_year_data[species] = {
            "arrival_date": obs_date_str,
            "skane_spring_record": m_data.get("skane_spring_record"),
            "astorp_spring_record": m_data.get("astorp_spring_record"),
            "delta_skane": delta_skane,       # negative = early
            "delta_astorp": delta_astorp,     # negative = early
            "is_new_astorp_record": is_new_astorp_spring,
            "is_resident": m_data.get("is_resident", False)
        }

    # Save outputs
    if master_updated:
        save_json(master, MASTER_PATH)
        print("Updated phenology_master.json with new Åstorp records!")
    
    save_json(current_year_data, CURRENT_PATH)
    print(f"Generated phenology_current.json with {len(current_year_data)} species.")

if __name__ == "__main__":
    main()
