#!/usr/bin/env python3
"""Manually refresh the small 2026 extract of SMHI's corrected CSV archives.

No scheduling or publication. Raw historical files stay outside the repository.
The browser combines this extract with latest-months, preferring archived values
on overlap. Missing/rejected measurements are never filled with zero.
"""
import csv
import io
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
YEAR = 2026
SOURCES = [(19, 62040), (20, 62040), (3, 62040), (4, 62040), (5, 62060)]


def parse_archive(text, year=YEAR):
    rows = list(csv.reader(io.StringIO(text.lstrip('\ufeff')), delimiter=';'))
    header_index = next(i for i, row in enumerate(rows)
                        if 'Kvalitet' in row and ('Representativt dygn' in row or 'Datum' in row))
    header = rows[header_index]
    daily = 'Representativt dygn' in header
    date_index = header.index('Representativt dygn' if daily else 'Datum')
    quality_index = header.index('Kvalitet')
    value_index = quality_index - 1
    values = {}
    for row in rows[header_index + 1:]:
        if len(row) <= quality_index or not row[date_index].startswith(f'{year}-'):
            continue
        try:
            value = float(row[value_index])
            if not math.isfinite(value) or row[quality_index] == 'R':
                continue
            if daily:
                date = row[date_index]
                datetime.strptime(date, '%Y-%m-%d')
                item = {'ref': date, 'value': value, 'quality': row[quality_index]}
                key = date
            else:
                dt = datetime.fromisoformat(row[date_index] + 'T' + row[date_index + 1]).replace(tzinfo=timezone.utc)
                key = int(dt.timestamp() * 1000)
                item = {'date': key, 'value': value, 'quality': row[quality_index]}
            values[key] = item
        except (ValueError, IndexError):
            continue
    return [values[key] for key in sorted(values)]


def main():
    series = {}
    for param, station in SOURCES:
        url = f'https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/{param}/station/{station}/period/corrected-archive/data.csv'
        with urlopen(url, timeout=90) as response:
            values = parse_archive(response.read().decode('utf-8-sig'))
        if not values:
            raise ValueError(f'No {YEAR} measurements in {url}; previous extract preserved')
        series[f'{param}/{station}'] = {'source': url, 'value': values}
        print(f'{param}/{station}: {len(values)} measurements')
    output = ROOT / f'static/data/weather-archive-{YEAR}.json'
    payload = {'year': YEAR, 'retrievedAt': datetime.now(timezone.utc).isoformat(), 'series': series}
    temporary = output.with_suffix('.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
    temporary.replace(output)
    print(output)


if __name__ == '__main__':
    main()
