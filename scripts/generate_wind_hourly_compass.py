#!/usr/bin/env python3
"""
generate_hourly_wind_chart.py — Genererar ett diagram för N/S och V/Ö vindkomponenter
baserat på utvalda 24 timmar istället för dygnsmedel.
"""

import argparse
import math
import os
from datetime import datetime, timezone, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import requests

STATION_WIND = 62040  # Helsingborg A

# Sajtens färger
COLORS = {
    "bg": "#FFFFFF",
    "text": "#5A5A5A",
    "text_dark": "#1A1A1A",
    "grid": "#E8E8E8",
    "n": "#4A90D9",  # Blå för Nord
    "s": "#D94A4A",  # Röd för Syd
    "e": "#3DAA6D",  # Grön för Öst
    "w": "#D9A84A"   # Gul för Väst
}

def fetch_hourly_wind():
    """Hämta senaste månadernas timdata från SMHI (dir=3, speed=4)."""
    dir_url = f"https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/3/station/{STATION_WIND}/period/latest-months/data.json"
    spd_url = f"https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/4/station/{STATION_WIND}/period/latest-months/data.json"
    
    dir_data = requests.get(dir_url, timeout=30).json().get("value", [])
    spd_data = requests.get(spd_url, timeout=30).json().get("value", [])
    
    spd_map = {v["date"]: float(v["value"]) for v in spd_data if "date" in v}
    
    points = []
    for v in dir_data:
        if "date" not in v: continue
        ts = v["date"]
        if ts not in spd_map: continue
        
        spd = spd_map[ts]
        try:
            deg = float(v["value"])
        except ValueError:
            continue
            
        dt = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
        rad = deg * math.pi / 180
        
        # NS (Nord=positiv) och EW (Öst=positiv)
        ns = math.cos(rad) * spd
        ew = math.sin(rad) * spd
        
        points.append({
            "dt": dt,
            "ns": ns,
            "ew": ew
        })
    return points

def filter_hours(points, start_dt, end_dt):
    """Behåll endast punkter i [start_dt, end_dt]."""
    return [p for p in points if start_dt <= p["dt"] <= end_dt]

def setup_axes(ax, start_dt, end_dt):
    # ax.set_xlim(start_dt, end_dt)
    ax.xaxis.set_major_locator(mdates.HourLocator(interval=3))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M\n%-d %b", tz=timezone.utc))
    
    ax.tick_params(axis="x", colors=COLORS["text"], labelsize=8)
    ax.tick_params(axis="y", colors=COLORS["text"], labelsize=8)
    ax.set_facecolor(COLORS["bg"])
    ax.grid(axis="y", color=COLORS["grid"], linewidth=0.5)
    ax.grid(axis="x", color=COLORS["grid"], linewidth=0.3, linestyle="--")
    for spine in ax.spines.values():
        spine.set_visible(False)

def build_comp_chart(ax, data, comp_key, label_pos, label_neg, color_pos, color_neg):
    dates = [p["dt"] for p in data]
    vals = [p[comp_key] for p in data]
    
    colors = [color_pos if v >= 0 else color_neg for v in vals]
    
    # 1h width approx i dagar: 1/24 ≈ 0.04
    ax.bar(dates, vals, color=colors, width=0.035, zorder=3)
    ax.axhline(0, color="#999", linewidth=0.8, zorder=2)
    
    # Remove default y-ticks to replace with custom text
    ax.set_yticks([])
    
    # Calculate sensible max limit to place labels nicely
    max_val = max(abs(v) for v in vals) if vals else 1
    y_lim = math.ceil(max_val) + 1
    ax.set_ylim(-y_lim, y_lim)
    
    # Draw custom Y-axis ticks and labels
    for y in range(-y_lim, y_lim + 1):
        if y == 0: continue
        ax.text(-0.01, y, str(abs(y)), transform=ax.get_yaxis_transform(),
                ha="right", va="center", color=COLORS["text"], fontsize=8)
        ax.axhline(y, color=COLORS["grid"], linewidth=0.5, zorder=1)
        
    # Draw the directional labels at top and bottom of Y-axis
    ax.text(-0.02, 0.95, label_pos, transform=ax.transAxes,
            ha="right", va="center", color=color_pos, fontsize=10, fontweight="bold")
    ax.text(-0.02, 0.05, label_neg, transform=ax.transAxes,
            ha="right", va="center", color=color_neg, fontsize=10, fontweight="bold")
            
    # Add a subtle background arrow or line to indicate axis
    ax.annotate("", xy=(-0.01, 1), xytext=(-0.01, 0), xycoords="axes fraction",
                arrowprops=dict(arrowstyle="<|-|>", color=COLORS["text"], lw=1))
                
    ax.set_ylabel("m/s", fontsize=9, color=COLORS["text"], labelpad=25)
    
    txt = f"Staplar uppåt = vind från {label_pos}\nStaplar nedåt = vind från {label_neg}"
    ax.text(0.01, 0.95, txt, transform=ax.transAxes,
            fontsize=7, color=COLORS["text"], va="top", ha="left",
            bbox=dict(facecolor="white", edgecolor="none", alpha=0.7, pad=0.3))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", required=True, help="Startdatum och tid format YYYY-MM-DDTHH:MM (UTC)")
    parser.add_argument("--end", required=True, help="Slutdatum och tid format YYYY-MM-DDTHH:MM (UTC)")
    parser.add_argument("--output", required=True, help="Path till .png")
    args = parser.parse_args()
    
    start_dt = datetime.strptime(args.start, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)
    end_dt = datetime.strptime(args.end, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)
    
    print(f"Hämtar data mellan {start_dt} och {end_dt}...")
    points = fetch_hourly_wind()
    points = filter_hours(points, start_dt, end_dt)
    
    if not points:
        print("Ingen data hittades för intervallet.")
        return
        
    fig = plt.figure(figsize=(10, 10))
    fig.patch.set_facecolor(COLORS["bg"])
    
    # Skapa rutnät: 3 rader. Rad 1: NS. Rad 2: EW. Rad 3: Compass.
    gs = fig.add_gridspec(3, 2, height_ratios=[1, 1, 0.8])
    
    ax_ns = fig.add_subplot(gs[0, :])
    ax_ew = fig.add_subplot(gs[1, :])
    
    ax_comp1 = fig.add_subplot(gs[2, 0], polar=True)
    ax_comp2 = fig.add_subplot(gs[2, 1], polar=True)
    
    # NS
    setup_axes(ax_ns, start_dt, end_dt)
    build_comp_chart(ax_ns, points, "ns", "Nord", "Syd", COLORS["n"], COLORS["s"])
    ax_ns.set_title("Nord/Syd-komponent (N/S)", fontsize=11, color=COLORS["text_dark"], pad=10)
    
    # EW
    setup_axes(ax_ew, start_dt, end_dt)
    build_comp_chart(ax_ew, points, "ew", "Öst", "Väst", COLORS["e"], COLORS["w"])
    ax_ew.set_title("Väst/Öst-komponent (V/Ö)", fontsize=11, color=COLORS["text_dark"], pad=10)
    
    # ---------------------------------------------------------
    # Compass plots for first and last point
    # ---------------------------------------------------------
    def draw_compass(ax, pt, title):
        ax.set_theta_direction(-1) # Medurs
        ax.set_theta_zero_location('N') # Noll uppåt
        
        # Grid settings
        ax.set_rlabel_position(45)
        ax.grid(color=COLORS["grid"], linestyle=':', linewidth=0.5)
        
        # Rensa radiala ticks
        ax.set_yticks([])
        
        # Sätt kompasstexter
        ax.set_xticks([0, math.pi/2, math.pi, 3*math.pi/2])
        ax.set_xticklabels(['N', 'Ö', 'S', 'V'], color=COLORS["text"], fontsize=9, fontweight="bold")
        ax.spines['polar'].set_color(COLORS["grid"])
        
        if not pt: return
        
        # Beräkna grad (matematisk axel: från varifrån den blåser)
        mag = math.sqrt(pt["ns"]**2 + pt["ew"]**2)
        if mag == 0: return

        # I polar plot med set_theta_zero_location('N') och direction=-1 (medurs):
        # 0 rad = N (uppåt), pi/2 = Ö (höger), pi = S (nedåt), 3*pi/2 = V (vänster)
        #
        # Vår data: ns positiv = N, ew positiv = Ö
        # x = ew, y = ns
        # Vi använder atan2(ew, ns) därför atan2(x, y) ger vinkeln medsols från Y-axeln (N)!
        # (Standard är atan2(y, x) motsols från X-axeln. För bäring är atan2(x, y) rätt)
        rad_from = math.atan2(pt["ew"], pt["ns"])
        
        # Användarens request: "Visa pilarna i den riktning som vinden blåser"
        # Det betyder att pilen ska peka DIT vinden är på väg.
        rad_to = rad_from + math.pi
        
        ax.annotate("", xy=(rad_to, mag), xytext=(0, 0),
                    arrowprops=dict(facecolor=COLORS["n"], edgecolor=COLORS["text_dark"], width=3, headwidth=10, headlength=12))
        
        # Convert rad_from to compass string for clarity (-math.pi to math.pi -> 0 to 360)
        deg_from = (math.degrees(rad_from) + 360) % 360
        dirs = ["N", "NÖ", "Ö", "SÖ", "S", "SV", "V", "NV"]
        dir_idx = round(deg_from / 45) % 8
        compass_str = dirs[dir_idx]
        
        ax.set_title(f"{title}\n{pt['dt'].strftime('%H:%M')} ({mag:.1f} m/s från {compass_str})", fontsize=10, color=COLORS["text_dark"], pad=15)
        ax.set_ylim(0, max(mag * 1.2, 5)) # min limit
        
    # Find exact points for 20:00 and 02:00
    pt_20 = None
    pt_02 = None
    for p in points:
        if p["dt"].hour == 20:
            pt_20 = p
        if p["dt"].hour == 2:
            pt_02 = p
            
    # Fallback to first/last if exact hours are missing
    if not pt_20: pt_20 = points[0]
    if not pt_02: pt_02 = points[-1]
            
    draw_compass(ax_comp1, pt_20, "Vind ikväll/igår (20:00)")
    draw_compass(ax_comp2, pt_02, "Vind inatt (02:00)")
    

    
    fig.suptitle("Vindriktning per timme", fontsize=14, fontweight="bold", color=COLORS["text_dark"], y=0.98)
    
    plt.tight_layout(pad=2.0)
    
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    fig.savefig(args.output, dpi=200, bbox_inches="tight", facecolor=COLORS["bg"])
    plt.close(fig)
    print(f"Sparade till {args.output}")
    
    # ---------------------------------------------------------
    # Generate standalone thumbnail for 02:00
    # ---------------------------------------------------------
    fig_thumb = plt.figure(figsize=(4, 4))
    fig_thumb.patch.set_facecolor(COLORS["bg"])
    ax_thumb = fig_thumb.add_subplot(111, polar=True)
    
    draw_compass(ax_thumb, pt_02, "Vind inatt (02:00)")
    
    thumb_output = args.output.replace(".png", "-thumb.png")
    fig_thumb.savefig(thumb_output, dpi=150, bbox_inches="tight", facecolor=COLORS["bg"])
    plt.close(fig_thumb)
    print(f"Sparade thumbnail till {thumb_output}")

if __name__ == "__main__":
    main()
