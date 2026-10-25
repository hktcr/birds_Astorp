#!/usr/bin/env python3
"""Derive public species statistics from one complete, scoped SOS snapshot.

No personal list, CSV count fallback, name-based species merge or credentials.
This offline entry point does not download or publish. A future approved transport
can use fetch_artportalen.download_snapshot; its live integration is not yet tested.
"""
import argparse
import json
from pathlib import Path
from artportalen_data import DataError, atomic_json, species_guide

ROOT = Path(__file__).resolve().parents[1]

def generate(snapshot_path, output_path):
    data = json.loads(Path(snapshot_path).read_text(encoding='utf-8'))
    result = species_guide(data)  # Validate everything before touching the output.
    atomic_json(output_path, result)
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', required=True, help='Complete Artportalen-only snapshot JSON')
    parser.add_argument('--output', type=Path, default=ROOT / 'static/data/species-guide.json')
    args = parser.parse_args()
    try:
        result = generate(args.snapshot, args.output)
    except (DataError, OSError, ValueError) as exc:
        parser.exit(1, f'Stopped; previous data retained: {exc}\n')
    print(f"Wrote {len(result['species'])} species; review source coverage and exclusions before building. Nothing published.")

if __name__ == '__main__':
    main()
