"""Exercise SMHI's two CSV schemas without network requests."""
import importlib.util
import sys
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('archive', Path(__file__).with_name('update-weather-archive.py'))
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)
daily = '''Stationsnamn;Stationsnummer
Åstorp;62060

Från Datum Tid (UTC);Till Datum Tid (UTC);Representativt dygn;Nederbördsmängd;Kvalitet
2025-12-31 06:00:00;2026-01-01 06:00:00;2026-01-01;0.0;G
2026-01-01 06:00:00;2026-01-02 06:00:00;2026-01-02;;G
2026-01-02 06:00:00;2026-01-03 06:00:00;2026-01-03;4;R
2026-01-03 06:00:00;2026-01-04 06:00:00;2026-01-04;2.5;Y
2025-01-01 06:00:00;2025-01-02 06:00:00;2025-01-02;9;G
'''
assert archive.parse_archive(daily) == [
    {'ref': '2026-01-01', 'value': 0.0, 'quality': 'G'},
    {'ref': '2026-01-04', 'value': 2.5, 'quality': 'Y'},
]
hourly = '''Datum;Tid (UTC);Vindhastighet;Kvalitet
2026-01-01;00:00:00;0;G
2026-01-01;01:00:00;3.2;Y
2026-01-01;02:00:00;NaN;G
'''
rows = archive.parse_archive(hourly)
assert len(rows) == 2
assert rows[0]['date'] == 1767225600000 and rows[0]['value'] == 0
assert rows[1]['date'] - rows[0]['date'] == 3600000
print('PASS: daily representative dates, UTC hours, zero, missing, rejected, invalid and out-of-year archive values.')
