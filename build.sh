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
cp manifest.webmanifest robots.txt dist/
cp icone-192.png icone-512.png icone-maskable.png apple-touch-icon.png dist/
cp src/config.js src/store.js dist/src/

# Pas de sitemap.xml ici : il était fabriqué à la demande par une Cloudflare
# Pages Function, et ces fonctions sont sorties du dépôt le 18/09/2026 au
# soir — le déploiement ne passait plus. Voir README.md.

echo "dist/ prêt :"
find dist -type f | sort
