#!/bin/bash
# sync-data.sh — Synkroniserar data-filer till docs/ för GitHub Pages
#
# ANVÄNDING:
#   ./sync-data.sh                 (synkar alla datafiler)
#   ./sync-data.sh --verify        (verifierar att filerna är synkade)
#
# SINGLE SOURCE OF TRUTH:
#   data/checklist-2026.json  →  docs/data/checklist-2026.json
#   data/locations.json       →  docs/data/locations.json

set -e
cd "$(dirname "$0")"

if [[ "$1" == "--verify" ]]; then
    echo "🔍 Verifierar synk..."
    if diff -q data/checklist-2026.json docs/data/checklist-2026.json > /dev/null 2>&1; then
        echo "✅ checklist-2026.json är synkad"
    else
        echo "❌ checklist-2026.json är INTE synkad!"
        exit 1
    fi
    if diff -q data/locations.json docs/data/locations.json > /dev/null 2>&1; then
        echo "✅ locations.json är synkad"
    else
        echo "❌ locations.json är INTE synkad!"
        exit 1
    fi
    echo ""
    echo "Antal arter: $(grep -c '"species"' data/checklist-2026.json)"
else
    echo "📋 Synkar datafiler..."
    cp data/checklist-2026.json docs/data/checklist-2026.json
    cp data/locations.json docs/data/locations.json
    echo "✅ Synkat till docs/data/"
    echo "   Antal arter: $(grep -c '"species"' data/checklist-2026.json)"
fi
