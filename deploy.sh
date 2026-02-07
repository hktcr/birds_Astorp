#!/bin/bash
# deploy.sh — Atomisk deploy-ritual för Fågelåret i Åstorp
# Eliminerar Shadow Sync-hazarden genom att synka data → docs i samma operation.
set -e

echo "🔨 Building Hugo..."
hugo --minify

echo "📋 Syncing data → docs/data..."
mkdir -p docs/data
cp -v data/*.json docs/data/

echo ""
echo "✅ Deploy ready."
echo "Ändrade filer:"
git status --short

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
