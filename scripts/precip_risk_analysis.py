#!/usr/bin/env python3
"""
Nederbördsrisk-analys (Experiment)
===================================
Hämtar 4 månaders timdata från SMHI (Helsingborg A, station 62040)
för lufttryck, luftfuktighet och nederbörd. Analyserar den historiska
korrelationen mellan trycktrend + fuktighet och faktisk nederbörd
för att härleda en empirisk risktabell.

Resultatet skrivs som en JSON-lookup-tabell som kan bäddas in
direkt i vädersidans JavaScript.
"""

import json
import sys
from datetime import datetime
from collections import defaultdict
from urllib.request import urlopen

STATION = '62040'
BASE = 'https://opendata-download-metobs.smhi.se/api/version/1.0'

def fetch(parameter):
    """Hämta latest-months-data för given parameter."""
    url = f'{BASE}/parameter/{parameter}/station/{STATION}/period/latest-months/data.json'
    with urlopen(url) as resp:
        data = json.loads(resp.read())
    return {v['date']: float(v['value']) for v in data.get('value', []) if v['value'] != ''}


def classify_trend(trend_hpa):
    """Klassificera trycktrendens magnitud."""
    if trend_hpa <= -2.0:
        return 'kraftigt_fallande'
    elif trend_hpa <= -0.8:
        return 'fallande'
    elif trend_hpa <= -0.3:
        return 'svagt_fallande'
    elif trend_hpa <= 0.3:
        return 'stabilt'
    elif trend_hpa <= 0.8:
        return 'svagt_stigande'
    elif trend_hpa <= 2.0:
        return 'stigande'
    else:
        return 'kraftigt_stigande'


def classify_humidity(rh):
    """Klassificera relativ luftfuktighet i tre grupper."""
    if rh < 65:
        return 'torr'
    elif rh < 80:
        return 'medel'
    else:
        return 'fuktig'


def main():
    print("Hämtar data från SMHI (Helsingborg A)...")
    
    pressure = fetch(9)   # Lufttryck (hPa), timvis
    humidity = fetch(6)   # Relativ luftfuktighet (%), timvis
    precip   = fetch(7)   # Nederbördsmängd (mm), timvis
    
    print(f"  Lufttryck:     {len(pressure)} mätpunkter")
    print(f"  Luftfuktighet: {len(humidity)} mätpunkter")
    print(f"  Nederbörd:     {len(precip)} mätpunkter")
    
    # Hitta gemensamma tidpunkter
    common_times = sorted(set(pressure.keys()) & set(humidity.keys()) & set(precip.keys()))
    print(f"  Gemensamma:    {len(common_times)} timmar")
    
    if len(common_times) < 100:
        print("FÖR LITE DATA — avbryter.")
        sys.exit(1)
    
    # Beräkna trycktrend (3h bakåt) för varje tidpunkt
    ONE_HOUR_MS = 3600 * 1000
    
    # Bygg resultat-tabell: {(trend_klass, hum_klass): {total, precip_count, total_mm}}
    risk_table = defaultdict(lambda: {'total': 0, 'with_precip': 0, 'total_mm': 0.0})
    
    for t in common_times:
        t_minus_3h = t - 3 * ONE_HOUR_MS
        if t_minus_3h not in pressure:
            continue
        
        trend = pressure[t] - pressure[t_minus_3h]
        rh = humidity[t]
        rain_mm = precip[t]
        
        trend_cls = classify_trend(trend)
        hum_cls = classify_humidity(rh)
        key = (trend_cls, hum_cls)
        
        risk_table[key]['total'] += 1
        if rain_mm > 0.0:
            risk_table[key]['with_precip'] += 1
            risk_table[key]['total_mm'] += rain_mm
    
    # Beräkna empirisk sannolikhet
    print("\n" + "=" * 72)
    print("EMPIRISK NEDERBÖRDSRISK (Helsingborg A, senaste 4 månaderna)")
    print("=" * 72)
    print(f"{'Trycktrend':<22} {'Fuktighet':<10} {'N':<6} {'Regn':<6} {'Risk %':<8} {'Snitt mm':<10}")
    print("-" * 72)
    
    lookup = {}
    
    # Sortera för läsbarhet
    trend_order = ['kraftigt_fallande', 'fallande', 'svagt_fallande', 'stabilt', 
                   'svagt_stigande', 'stigande', 'kraftigt_stigande']
    hum_order = ['torr', 'medel', 'fuktig']
    
    for tc in trend_order:
        for hc in hum_order:
            key = (tc, hc)
            d = risk_table[key]
            if d['total'] == 0:
                continue
            
            risk_pct = (d['with_precip'] / d['total']) * 100
            avg_mm = d['total_mm'] / d['with_precip'] if d['with_precip'] > 0 else 0.0
            
            print(f"{tc:<22} {hc:<10} {d['total']:<6} {d['with_precip']:<6} {risk_pct:<8.1f} {avg_mm:<10.2f}")
            
            lookup[f"{tc}_{hc}"] = {
                'risk_pct': round(risk_pct, 1),
                'avg_mm': round(avg_mm, 2),
                'n': d['total']
            }
    
    # Skriv lookup-tabell till JSON
    output = {
        'station': 'Helsingborg A (62040)',
        'period': {
            'from': datetime.fromtimestamp(common_times[0] / 1000).isoformat(),
            'to': datetime.fromtimestamp(common_times[-1] / 1000).isoformat()
        },
        'total_hours': len(common_times),
        'lookup': lookup
    }
    
    out_path = 'data/precip_risk_lookup.json'
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nLookup-tabell sparad till: {out_path}")
    
    # Generera JS-fragment för direkt inkludering
    print("\n// JavaScript-fragment för buildOutlookWidget:")
    print("var PRECIP_RISK = " + json.dumps(lookup, indent=2, ensure_ascii=False) + ";")


if __name__ == '__main__':
    main()
