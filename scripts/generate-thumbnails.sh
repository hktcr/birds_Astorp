#!/bin/bash
# generate-thumbnails.sh — Skapa galleri-thumbnails (800px bredd)
# Använder macOS sips. Kör före hugo build.
# Filnamn baseras på base64-encodning av originalfilnamnet för att 
# helt undvika URL-encoding-problem på GitHub Pages med åäö.
set -e

STATIC_DIR="$(cd "$(dirname "$0")/.." && pwd)/static/images"
THUMB_WIDTH=800
QUALITY=80

echo "🖼️  Genererar thumbnails (${THUMB_WIDTH}px bredd)..."

count=0
skipped=0

# Clean old -thumb files first to ensure we don't leave orphans
find "$STATIC_DIR" -type f -name "*-thumb-b64.jpg" -delete

# Process all image files in static/images
find "$STATIC_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" \) | while read -r src; do
    # Skip files that are already thumbnails (just in case)
    if [[ "$src" == *"-thumb-"* ]]; then
        continue
    fi

    dir=$(dirname "$src")
    basename=$(basename "$src")
    
    # Base64 encode the filename (URL-safe base64: replace + with -, / with _, remove =)
    # This guarantees a perfectly ASCII-safe filename that Hugo can match
    # Note: printf preserves exact string, no newline
    b64_name=$(printf "%s" "$basename" | base64 | tr '+/' '-_' | tr -d '=' | tr -d '\n')
    
    # Build new thumbnail path
    thumb="${dir}/${b64_name}-thumb-b64.jpg"

    # Skip if thumbnail already exists and is newer than source
    if [ -f "$thumb" ] && [ "$thumb" -nt "$src" ]; then
        ((skipped++)) || true
        continue
    fi

    echo "  → ${basename} as ${b64_name}-thumb-b64.jpg"
    
    # Copy original, resize with sips, convert to JPEG
    cp "$src" "$thumb"
    sips --resampleWidth "$THUMB_WIDTH" --setProperty format jpeg --setProperty formatOptions "$QUALITY" "$thumb" > /dev/null 2>&1

    ((count++)) || true
done

echo "✅ Klart! $count thumbnails genererade, $skipped redan aktuella."
