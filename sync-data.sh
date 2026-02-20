#!/bin/bash
# sync-data.sh — Synkroniserar data-filer till docs/ för GitHub Pages
#
# ANVÄNDING:
#   ./sync-data.sh                 (synkar data + hugo build)
#   ./sync-data.sh --verify        (verifierar att filerna är synkade)
#   ./sync-data.sh --deploy        (synkar + build + commit + push)
#
# SINGLE SOURCE OF TRUTH:
#   data/checklist-2026.json  →  static/data/checklist-2026.json
#   data/locations.json       →  static/data/locations.json

set -e
cd "$(dirname "$0")"

if [[ "$1" == "--verify" ]]; then
    echo "🔍 Verifierar synk..."
    if diff -q data/checklist-2026.json static/data/checklist-2026.json > /dev/null 2>&1; then
        echo "✅ checklist-2026.json är synkad"
    else
        echo "❌ checklist-2026.json är INTE synkad!"
        exit 1
    fi
    if diff -q data/locations.json static/data/locations.json > /dev/null 2>&1; then
        echo "✅ locations.json är synkad"
    else
        echo "❌ locations.json är INTE synkad!"
        exit 1
    fi
    echo ""
    echo "Antal arter: $(grep -c '"species"' data/checklist-2026.json)"
elif [[ "$1" == "--deploy" ]]; then
    # Full deploy: sync + build + commit + push
    echo "📋 Synkar datafiler..."
    cp data/checklist-2026.json static/data/checklist-2026.json
    cp data/locations.json static/data/locations.json
    SPECIES_COUNT=$(grep -c '"species"' data/checklist-2026.json)
    echo "   Antal arter: $SPECIES_COUNT"
    
    echo "🏗️  Bygger Hugo-sajt..."
    hugo --minify --quiet
    echo "✅ Hugo-build klar"
    
    echo "🚀 Publicerar till GitHub..."
    git add -A
    git commit -m "🐦 Art #$SPECIES_COUNT uppdatering"
    git push
    echo "✅ Publicerat! Vänta ~1 min för GitHub Pages cache."
else
    echo "📋 Synkar datafiler..."
    cp data/checklist-2026.json static/data/checklist-2026.json
    cp data/locations.json static/data/locations.json
    echo "✅ Synkat till static/data/"
    echo "   Antal arter: $(grep -c '"species"' data/checklist-2026.json)"
    
    echo "🏗️  Bygger Hugo-sajt..."
    hugo --minify --quiet
    echo "✅ Hugo-build klar"
    echo ""
    echo "💡 Kör 'git add -A && git commit -m \"...\" && git push' för att publicera"
    echo "   Eller: ./sync-data.sh --deploy för full automatisk publicering"
fi

