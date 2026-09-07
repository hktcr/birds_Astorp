#!/bin/bash
# Keep Hugo's source data and browser data in sync before every release build.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
fi
for name in checklist-2026.json locations.json; do
    cp "data/$name" "static/data/$name"
done
hugo --minify "$@"
python3 scripts/verify-data.py
