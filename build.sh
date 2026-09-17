#!/usr/bin/env bash
# Prépare dist/ : uniquement les fichiers du site.
# Le dépôt porte aussi le schéma SQL et les notes internes — ils ne sont pas publics.
set -euo pipefail

rm -rf dist
mkdir -p dist/src
# og.png : l'aperçu des liens partagés. Le manifest et les icônes : l'île
# ajoutée à l'écran d'accueil. Une icône oubliée ici et l'installation
# échoue en silence, sans rien dire dans la console.
cp index.html _redirects og.png dist/
cp manifest.webmanifest dist/
cp icone-192.png icone-512.png icone-maskable.png apple-touch-icon.png dist/
cp src/config.js src/store.js dist/src/

echo "dist/ prêt :"
find dist -type f | sort
