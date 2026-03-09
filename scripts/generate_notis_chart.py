#!/usr/bin/env python3
"""
generate_notis_chart.py — Generera stilade väderdiagram för notiser.

Hämtar data från SMHI:s öppna API och skapar publikationsklara PNG-bilder
som bäddas in i blogginlägg på astorpsfaglar.se.

Användning:
    python3 scripts/generate_notis_chart.py \
        --type temp \
        --from 2026-02-20 \
        --to 2026-03-05 \
        --output static/images/posts/2026-03-05-slug/temp-feb-mar.png

    python3 scripts/generate_notis_chart.py \
        --type temp+precip \
        --from 2026-02-01 \
        --to 2026-02-28 \
        --output /tmp/test-combo.png

Diagramtyper:
    temp       Dagtemperatur (max, orange) + natttemperatur (min, blå)
    precip     Nederbörd (blå staplar, mm)
    wind       Medelvind (linje, m/s)
    flow       Vattenföring Rönne å (linje, m³/s)
    temp+precip  Kombinationsdiagram: temp staplar + nederbörd

Beroenden: matplotlib, requests
"""

import argparse
import os
import sys
from datetime import datetime, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.ticker as ticker
import requests

# ─── Sajtens designpalett ───
COLORS = {
    "primary":      "#2B6A4F",   # Naturbutiken-grön
    "primary_dark":  "#1E4220",
    "temp_day":     "#C67B4F",   # Orange (dagtemp)
    "temp_night":   "#3D4F7C",   # Blå (natttemp)
    "precip":       "#5B9BD5",   # Ljusblå
    "wind":         "#6B8E6B",   # Dämpad grön
    "flow":         "#2A7B8F",   # Teal
    "grid":         "#E8E8E8",
    "text":         "#5A5A5A",
    "text_dark":    "#1A1A1A",
    "bg":           "#FFFFFF",
    "frost":        "#E8F0F8",   # Ljusblå frostzon
}

# ─── SMHI-stationer (samma som vader.html) ───
STATIONS = {
    "temp":   62040,   # Helsingborg A
    "precip": 62060,   # Åstorp
    "wind":   62040,   # Helsingborg A
}
STATION_FLOW = 2372    # Forsmöllans KRV, Rönne å

STATION_NAMES = {
    "temp":   "SMHI, Helsingborg A",
    "precip": "SMHI, Åstorp",
    "wind":   "SMHI, Helsingborg A",
    "flow":   "SMHI, Forsmöllan (Rönne å)",
}


def fetch_smhi_metobs(param, station):
    """Hämta meteorologiska observationer från SMHI."""
    url = (
        f"https://opendata-download-metobs.smhi.se/api/version/1.0/"
        f"parameter/{param}/station/{station}/period/latest-months/data.json"
    )
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json().get("value", [])


def fetch_smhi_hydro(station):
    """Hämta hydrologiska observationer (vattenföring) från SMHI."""
    url = (
        f"https://opendata-download-hydroobs.smhi.se/api/version/latest/"
        f"parameter/1/station/{station}/period/corrected-archive/data.json"
    )
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    vals = r.json().get("value", [])
    # Aggregera till dagsvärden (medel per dag)
    day_map = {}
    for v in vals:
        d = datetime.fromtimestamp(v["date"] / 1000, tz=__import__('datetime').timezone.utc).strftime("%Y-%m-%d")
        if d not in day_map:
            day_map[d] = {"sum": 0, "count": 0}
        day_map[d]["sum"] += v["value"]
        day_map[d]["count"] += 1
    return [
        {"ref": d, "value": round(day_map[d]["sum"] / day_map[d]["count"], 2)}
        for d in sorted(day_map)
    ]


def filter_range(data, date_from, date_to):
    """Filtrera SMHI-data till ett datumintervall."""
    return [v for v in data if date_from <= v["ref"] <= date_to]


def setup_axes(ax, date_from, date_to):
    """Gemensam x-axel-konfiguration i Inter-stil."""
    ax.set_xlim(datetime.strptime(date_from, "%Y-%m-%d"),
                datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
    days = (datetime.strptime(date_to, "%Y-%m-%d") -
            datetime.strptime(date_from, "%Y-%m-%d")).days + 1
    if days <= 31:
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=max(1, days // 10)))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%-d %b"))
    else:
        ax.xaxis.set_major_locator(mdates.MonthLocator())
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    ax.tick_params(axis="x", colors=COLORS["text"], labelsize=9)
    ax.tick_params(axis="y", colors=COLORS["text"], labelsize=9)
    ax.set_facecolor(COLORS["bg"])
    ax.grid(axis="y", color=COLORS["grid"], linewidth=0.5)
    ax.grid(axis="x", color=COLORS["grid"], linewidth=0.3, linestyle="--")
    for spine in ax.spines.values():
        spine.set_visible(False)


def add_source(ax, source_text):
    """Lägg till en diskret källhänvisning."""
    ax.text(
        1.0, -0.08, source_text,
        transform=ax.transAxes,
        fontsize=7, color=COLORS["text"],
        ha="right", va="top", style="italic",
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Chart builders
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def build_temp(ax, date_from, date_to):
    """Dagtemp (orange) + natttemp (blå) som staplar."""
    day_data = filter_range(fetch_smhi_metobs(20, STATIONS["temp"]), date_from, date_to)
    night_data = filter_range(fetch_smhi_metobs(19, STATIONS["temp"]), date_from, date_to)

    if not day_data and not night_data:
        ax.text(0.5, 0.5, "Inga temperaturdata tillgängliga",
                transform=ax.transAxes, ha="center", va="center",
                color=COLORS["text"], fontsize=11)
        return

    bar_width = 0.35
    for data, color, offset, label in [
        (day_data, COLORS["temp_day"], -bar_width/2, "Dagmax"),
        (night_data, COLORS["temp_night"], bar_width/2, "Nattmin"),
    ]:
        dates = [datetime.strptime(v["ref"], "%Y-%m-%d") + timedelta(days=offset)
                 for v in data]
        vals = [float(v["value"]) for v in data]
        bar_colors = [color if v >= 0 else color + "88" for v in vals]
        ax.bar(dates, vals, width=bar_width, color=bar_colors, label=label,
               edgecolor="none", zorder=3)

    # Nollinje
    ax.axhline(0, color="#999", linewidth=0.8, zorder=2)

    # Frostzon
    ylim = ax.get_ylim()
    if ylim[0] < 0:
        ax.axhspan(ylim[0], 0, color=COLORS["frost"], zorder=1)

    ax.set_ylabel("°C", fontsize=9, color=COLORS["text"])
    ax.legend(fontsize=8, frameon=False, loc="upper left")
    setup_axes(ax, date_from, date_to)
    add_source(ax, STATION_NAMES["temp"])


def build_precip(ax, date_from, date_to):
    """Nederbördsstaplar (mm)."""
    data = filter_range(fetch_smhi_metobs(5, STATIONS["precip"]), date_from, date_to)

    if not data:
        ax.text(0.5, 0.5, "Inga nederbördsdata tillgängliga",
                transform=ax.transAxes, ha="center", va="center",
                color=COLORS["text"], fontsize=11)
        return

    dates = [datetime.strptime(v["ref"], "%Y-%m-%d") for v in data]
    vals = [float(v["value"]) for v in data]

    ax.bar(dates, vals, color=COLORS["precip"], edgecolor=COLORS["precip"],
           width=0.8, alpha=0.75, zorder=3)
    ax.set_ylabel("mm", fontsize=9, color=COLORS["text"])
    ax.yaxis.set_major_formatter(ticker.FormatStrFormatter("%.1f"))
    setup_axes(ax, date_from, date_to)
    add_source(ax, STATION_NAMES["precip"])


def build_wind(ax, date_from, date_to):
    """Medelvind (m/s) linjediagram."""
    data = filter_range(fetch_smhi_metobs(4, STATIONS["wind"]), date_from, date_to)

    if not data:
        ax.text(0.5, 0.5, "Inga vinddata tillgängliga",
                transform=ax.transAxes, ha="center", va="center",
                color=COLORS["text"], fontsize=11)
        return

    dates = [datetime.strptime(v["ref"], "%Y-%m-%d") for v in data]
    vals = [float(v["value"]) for v in data]

    ax.fill_between(dates, vals, alpha=0.15, color=COLORS["wind"], zorder=2)
    ax.plot(dates, vals, color=COLORS["wind"], linewidth=2, zorder=3)
    ax.set_ylabel("m/s", fontsize=9, color=COLORS["text"])
    setup_axes(ax, date_from, date_to)
    add_source(ax, STATION_NAMES["wind"])


def build_flow(ax, date_from, date_to):
    """Vattenföring (m³/s) linjediagram."""
    raw = fetch_smhi_hydro(STATION_FLOW)
    data = filter_range(raw, date_from, date_to)

    if not data:
        ax.text(0.5, 0.5, "Inga vattenföringsdata tillgängliga",
                transform=ax.transAxes, ha="center", va="center",
                color=COLORS["text"], fontsize=11)
        return

    dates = [datetime.strptime(v["ref"], "%Y-%m-%d") for v in data]
    vals = [float(v["value"]) for v in data]

    ax.fill_between(dates, vals, alpha=0.2, color=COLORS["flow"], zorder=2)
    ax.plot(dates, vals, color=COLORS["flow"], linewidth=2, zorder=3)
    ax.set_ylabel("m³/s", fontsize=9, color=COLORS["text"])
    setup_axes(ax, date_from, date_to)
    add_source(ax, STATION_NAMES["flow"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHART_BUILDERS = {
    "temp": build_temp,
    "precip": build_precip,
    "wind": build_wind,
    "flow": build_flow,
}


def main():
    parser = argparse.ArgumentParser(
        description="Generera väderdiagram för notiser på astorpsfaglar.se"
    )
    parser.add_argument(
        "--type", required=True,
        help="Diagramtyp: temp, precip, wind, flow, eller kombinationer med + (t.ex. temp+precip)"
    )
    parser.add_argument("--from", dest="date_from", required=True,
                        help="Startdatum (YYYY-MM-DD)")
    parser.add_argument("--to", dest="date_to", required=True,
                        help="Slutdatum (YYYY-MM-DD)")
    parser.add_argument("--output", "-o", required=True,
                        help="Sökväg till output-PNG")
    parser.add_argument("--title", default=None,
                        help="Valfri rubrik ovanför diagrammet")
    parser.add_argument("--dpi", type=int, default=200,
                        help="Bildupplösning (default: 200 → retina-kvalitet)")

    args = parser.parse_args()

    # Parsar kombinationstyper
    chart_types = [t.strip() for t in args.type.split("+")]
    for ct in chart_types:
        if ct not in CHART_BUILDERS:
            print(f"❌ Okänd diagramtyp: '{ct}'. Tillgängliga: {', '.join(CHART_BUILDERS)}")
            sys.exit(1)

    # Validera datum
    try:
        datetime.strptime(args.date_from, "%Y-%m-%d")
        datetime.strptime(args.date_to, "%Y-%m-%d")
    except ValueError:
        print("❌ Datumformat måste vara YYYY-MM-DD")
        sys.exit(1)

    # ─── Skapa figur ───
    n_charts = len(chart_types)
    fig_height = 4 * n_charts + (0.6 if args.title else 0)
    fig, axes = plt.subplots(n_charts, 1, figsize=(10, fig_height),
                             squeeze=False)
    fig.patch.set_facecolor(COLORS["bg"])

    # Rubrik
    if args.title:
        fig.suptitle(args.title, fontsize=13, fontweight=600,
                     color=COLORS["text_dark"], y=0.98)

    # Bygg diagram
    for i, ct in enumerate(chart_types):
        ax = axes[i, 0]
        print(f"📊 Bygger {ct}-diagram ({args.date_from} → {args.date_to})...")
        CHART_BUILDERS[ct](ax, args.date_from, args.date_to)

    plt.tight_layout(pad=1.5)

    # Spara
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    fig.savefig(args.output, dpi=args.dpi, bbox_inches="tight",
                facecolor=COLORS["bg"], edgecolor="none")
    plt.close(fig)

    # Filstorlek
    size_kb = os.path.getsize(args.output) / 1024
    print(f"✅ Sparat: {args.output} ({size_kb:.0f} KB, {args.dpi} DPI)")
    print(f"   Bädda in i notis med:")
    print(f'   <figure class="notis-chart">')
    print(f'     <a href="/{os.path.relpath(args.output, "static")}" class="lightbox-link">')
    print(f'       <img src="/{os.path.relpath(args.output, "static")}" alt="Beskrivning">')
    print(f'     </a>')
    print(f'     <figcaption>Din bildtext här.</figcaption>')
    print(f'   </figure>')


if __name__ == "__main__":
    main()
