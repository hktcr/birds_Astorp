#!/usr/bin/env python3
"""Generate yearwheel from the SAME scoped Artportalen snapshot as the guide.

No personal excursions and no unverified TSV/CSV autodiscovery. Historic mixed
outputs remain unchanged until a complete source snapshot is reconciled.
"""
import argparse
import json
from pathlib import Path
from artportalen_data import DataError, atomic_json, radial_data

ROOT = Path(__file__).resolve().parents[1]

def generate(snapshot_path, output_path):
    data = json.loads(Path(snapshot_path).read_text(encoding='utf-8'))
    result = radial_data(data)
    atomic_json(output_path, result)
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', required=True, help='Complete Artportalen-only snapshot JSON')
    parser.add_argument('--output', type=Path, default=ROOT / 'static/data/species_days_historic.json')
    args = parser.parse_args()
    try:
        result = generate(args.snapshot, args.output)
    except (DataError, OSError, ValueError) as exc:
        parser.exit(1, f'Stopped; previous data retained: {exc}\n')
    print(f'Wrote {len(result) - 1} species. Personal data untouched. Nothing published.')

if __name__ == '__main__':
    main()
