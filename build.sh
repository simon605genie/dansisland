#!/usr/bin/env bash
# Prépare dist/ : uniquement les fichiers du site.
# Le dépôt porte aussi le schéma SQL et les notes internes — ils ne sont pas publics.
set -euo pipefail

rm -rf dist
mkdir -p dist/src
cp index.html _redirects og.png dist/   # og.png : l'aperçu des liens partagés
cp src/config.js src/store.js dist/src/

echo "dist/ prêt :"
find dist -type f | sort
