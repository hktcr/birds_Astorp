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
    
    # Hitta gemensamma tidpunkter för P och H
    base_times = sorted(set(pressure.keys()) & set(humidity.keys()))
    print(f"  Gemensamma P+H: {len(base_times)} timmar")
    
    if len(base_times) < 100:
        print("FÖR LITE DATA — avbryter.")
        sys.exit(1)
    
    ONE_HOUR_MS = 3600 * 1000
    
    # risk_table: key -> { 'total': N, '1h': {rain, total_mm}, '3h': {rain, total_mm}, '6h': {rain, total_mm} }
    risk_table = defaultdict(lambda: {
        'total': 0,
        '1h': {'rain': 0, 'mm': 0.0},
        '3h': {'rain': 0, 'mm': 0.0},
        '6h': {'rain': 0, 'mm': 0.0}
    })
    
    def get_precip_sum(start_t, hours_fwd):
        """Summerar regn från (start_t) till (start_t + hours_fwd). Exkluderar regn precis vid start_t."""
        total_mm = 0.0
        # Vi itererar över framtida timmar (1 till och med hours_fwd)
        for h in range(1, hours_fwd + 1):
            t = start_t + h * ONE_HOUR_MS
            total_mm += precip.get(t, 0.0)
        return total_mm

    for t in base_times:
        t_minus_3h = t - 3 * ONE_HOUR_MS
        if t_minus_3h not in pressure:
            continue
            
        trend = pressure[t] - pressure[t_minus_3h]
        rh = humidity[t]
        
        trend_cls = classify_trend(trend)
        hum_cls = classify_humidity(rh)
        key = (trend_cls, hum_cls)
        
        risk_table[key]['total'] += 1
        
        rain_1h = get_precip_sum(t, 1)
        rain_3h = get_precip_sum(t, 3)
        rain_6h = get_precip_sum(t, 6)
        
        if rain_1h > 0:
            risk_table[key]['1h']['rain'] += 1
            risk_table[key]['1h']['mm'] += rain_1h
        if rain_3h > 0:
            risk_table[key]['3h']['rain'] += 1
            risk_table[key]['3h']['mm'] += rain_3h
        if rain_6h > 0:
            risk_table[key]['6h']['rain'] += 1
            risk_table[key]['6h']['mm'] += rain_6h

    print("\n" + "=" * 80)
    print("EMPIRISK NEDERBÖRDSRISK (Helsingborg A, senaste 4 månaderna)")
    print("=" * 80)
    print(f"{'Tillstånd':<30}  {'N':<5} | {'1h Risk':<10} | {'3h Risk':<10} | {'6h Risk':<10}")
    print("-" * 80)
    
    lookup = {}
    trend_order = ['kraftigt_fallande', 'fallande', 'svagt_fallande', 'stabilt', 
                   'svagt_stigande', 'stigande', 'kraftigt_stigande']
    hum_order = ['torr', 'medel', 'fuktig']
    
    for tc in trend_order:
        for hc in hum_order:
            key_name = f"{tc}_{hc}"
            key = (tc, hc)
            d = risk_table[key]
            
            if d['total'] == 0:
                continue
                
            n = d['total']
            p1 = (d['1h']['rain'] / n) * 100
            p3 = (d['3h']['rain'] / n) * 100
            p6 = (d['6h']['rain'] / n) * 100
            
            m1 = d['1h']['mm'] / d['1h']['rain'] if d['1h']['rain'] > 0 else 0
            m3 = d['3h']['mm'] / d['3h']['rain'] if d['3h']['rain'] > 0 else 0
            m6 = d['6h']['mm'] / d['6h']['rain'] if d['6h']['rain'] > 0 else 0
            
            label = f"{tc} + {hc}"
            print(f"{label:<30}  {n:<5} | {p1:>5.1f}% ({m1:.1f}) | {p3:>5.1f}% ({m3:.1f}) | {p6:>5.1f}% ({m6:.1f})")
            
            lookup[key_name] = {
                'n': n,
                'h1': {'pct': round(p1, 1), 'mm': round(m1, 2)},
                'h3': {'pct': round(p3, 1), 'mm': round(m3, 2)},
                'h6': {'pct': round(p6, 1), 'mm': round(m6, 2)}
            }
            
    out_path = 'data/precip_risk_lookup.json'
    with open(out_path, 'w') as f:
        json.dump(lookup, f, indent=2, ensure_ascii=False)
        
    print(f"\nLookup-tabell sparad till: {out_path}")
    print("\n// Klistra in detta i vader.html:")
    print("var PRECIP_RISK = " + json.dumps(lookup, indent=2, ensure_ascii=False) + ";")

if __name__ == '__main__':
    main()

