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

# `functions/` n'est **pas** copié, et c'est important : Cloudflare lit les
# Pages Functions à la racine du projet, pas dans le dossier de sortie.
# Copiées dans dist/, elles seraient servies comme des fichiers texte — donc
# du code publié au lieu d'être exécuté.
# Il n'y a pas non plus de sitemap.xml ici : il est fabriqué à la demande
# depuis l'archipel par functions/sitemap.xml.js.

echo "dist/ prêt :"
find dist -type f | sort
