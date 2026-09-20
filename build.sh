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

# ------------------------------------------------------------------
#  Ce qu'on s'apprête à publier, et d'où ça vient.
#
#  Le 20/09, un déploiement a publié l'**ancienne** version : le clone de
#  déploiement était resté sur un vieux commit. Le contrôle après coup l'a
#  vu (empreinte servie ≠ empreinte du dépôt), mais six minutes trop tard,
#  et la vérification faite à la main ne l'a pas vu du tout — elle
#  comparait le build local au site, donc l'ancien à l'ancien. Identiques,
#  forcément.
#
#  **Une mesure qui ne vérifie pas qu'elle regarde la bonne chose passe au
#  vert sans rien voir.** C'est écrit partout dans CLAUDE.md, et ça s'est
#  reproduit ici parce que le garde-fou n'était qu'une consigne dans un
#  message. Il est maintenant dans le seul endroit que personne ne peut
#  sauter : la sortie de la commande qu'on lance juste avant de publier.
#
#  L'empreinte est celle que compare `.github/workflows/verifier-le-
#  deploiement.yml` : les deux doivent coïncider après la mise en ligne.
# ------------------------------------------------------------------
empreinte=$( { sha256sum dist/index.html 2>/dev/null || shasum -a 256 dist/index.html; } | cut -c1-16 )
echo ""
echo "  empreinte : $empreinte   ($(wc -c < dist/index.html | tr -d ' ') octets)"

if git rev-parse --git-dir >/dev/null 2>&1; then
  branche=$(git rev-parse --abbrev-ref HEAD)
  echo "  commit    : $(git rev-parse --short HEAD)  ($branche)"

  # Un clone resté en arrière est exactement ce qui a coûté un tour. On ne
  # va pas chercher le réseau — `git fetch` d'un script de build, c'est une
  # surprise — mais si une référence distante est déjà là, on la lit.
  #
  # `@{u}` et non `origin/$branche` : en HEAD détaché — ce que fait
  # `actions/checkout` sur un runner — la branche s'appelle « HEAD », donc
  # `origin/HEAD` résout vers la branche **par défaut** du dépôt et le
  # script annonçait un retard qui n'existait pas, avec un remède absurde
  # (`git checkout -B HEAD origin/HEAD`). Mesuré en détachant HEAD, pas
  # deviné. `@{u}` n'existe que pour une branche qui suit vraiment quelque
  # chose : le cas détaché se tait tout seul. Un faux positif use un
  # garde-fou aussi sûrement qu'un angle mort.
  amont=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
  if [ -n "${amont:-}" ]; then
    retard=$(git rev-list --count "HEAD..$amont" 2>/dev/null || echo 0)
    if [ "${retard:-0}" -gt 0 ]; then
      echo ""
      echo "  ⚠️  CE CLONE A $retard COMMIT(S) DE RETARD SUR $amont."
      echo "     Publier maintenant mettrait en ligne une version périmée."
      echo "     git fetch origin $branche && git checkout -B $branche $amont"
    fi
  fi

  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "  ⚠️  Le dossier a des modifications non validées : ce qui part en"
    echo "     ligne ne correspondra à aucun commit."
  fi
fi
