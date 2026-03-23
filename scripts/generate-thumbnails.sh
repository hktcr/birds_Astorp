#!/bin/bash
# generate-thumbnails.sh — Skapa galleri-thumbnails (800px bredd)
# Använder macOS sips. Kör före hugo build.
# OBS: Filnamnen lowercasas för att matcha Hugo urlize-beteende.
set -e

STATIC_DIR="$(cd "$(dirname "$0")/.." && pwd)/static/images"
THUMB_WIDTH=800
QUALITY=80

echo "🖼️  Genererar thumbnails (${THUMB_WIDTH}px bredd)..."

count=0
skipped=0

# Process all image files in static/images
find "$STATIC_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" \) | while read -r src; do
    # Skip files that are already thumbnails
    if [[ "$src" == *"-thumb."* ]]; then
        continue
    fi

    # Get directory and filename
    dir=$(dirname "$src")
    basename=$(basename "$src")
    
    # Remove extension, lowercase the name (match Hugo urlize behavior)
    name_no_ext="${basename%.*}"
    name_lower=$(echo "$name_no_ext" | tr '[:upper:]' '[:lower:]')
    
    # Build thumbnail path with lowercased name
    thumb="${dir}/${name_lower}-thumb.jpg"

    # Skip if thumbnail already exists and is newer than source
    if [ -f "$thumb" ] && [ "$thumb" -nt "$src" ]; then
        ((skipped++)) || true
        continue
    fi

    echo "  → $(basename "$thumb")"
    
    # Copy original, resize with sips, convert to JPEG
    cp "$src" "$thumb"
    sips --resampleWidth "$THUMB_WIDTH" --setProperty format jpeg --setProperty formatOptions "$QUALITY" "$thumb" > /dev/null 2>&1

    ((count++)) || true
done

echo "✅ Klart! $count thumbnails genererade, $skipped redan aktuella."
