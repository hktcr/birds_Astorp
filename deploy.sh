#!/bin/bash
# deploy.sh — Atomisk deploy-ritual för Fågelåret i Åstorp
# Eliminerar Shadow Sync-hazarden genom att synka data → docs i samma operation.
# OBS: gAIa ska ALDRIG köra detta script direkt — använd /Åstorp-2026 steg D.
set -e

echo "🖼️  Genererar thumbnails (800px bredd)..."
bash scripts/generate-thumbnails.sh

echo "🔨 Building Hugo..."
hugo --minify

echo "📋 Syncing data → docs/data..."
mkdir -p docs/data
cp -v data/*.json docs/data/

echo ""
echo "✅ Deploy ready."
echo "Ändrade filer:"
git status --short

# Draft-guard: Varna om content med draft: false finns bland nya/ändrade filer
DRAFT_FILES=$(git diff --name-only -- 'content/posts/*.md' 2>/dev/null || true)
UNTRACKED=$(git ls-files --others --exclude-standard -- 'content/posts/*.md' 2>/dev/null || true)
ALL_CHANGED=$(echo -e "${DRAFT_FILES}\n${UNTRACKED}" | grep -v '^$' || true)
if [ -n "$ALL_CHANGED" ]; then
    NON_DRAFTS=$(echo "$ALL_CHANGED" | xargs grep -l 'draft: false' 2>/dev/null || true)
    if [ -n "$NON_DRAFTS" ]; then
        echo ""
        echo "⚠️  Följande nya/ändrade filer har draft: false och kommer publiceras:"
        echo "$NON_DRAFTS"
        read -p "Fortsätt? (j/N) " CONFIRM
        [ "$CONFIRM" = "j" ] || { echo "❌ Avbryter."; exit 1; }
    fi
fi

echo ""
read -p "Commit-meddelande: " MSG

if [ -z "$MSG" ]; then
    echo "❌ Inget meddelande, avbryter."
    exit 1
fi

git add -A
git commit -m "$MSG"
git push origin main

echo ""
echo "🚀 Publicerat!"
