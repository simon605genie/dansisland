#!/usr/bin/env bash
# Les polices du jeu viennent de Google Fonts par un <link>. Chromium piloté
# ne passe pas par le proxy du conteneur : sans elles, tous les panneaux
# tombent en system-ui et la vidéo est hors charte — et ça ne se voit que
# rendu. On les rapatrie une fois, on les inline (sous-ensemble latin seul,
# U+0000-00FF couvre tout le français), et la fabrique ne dépend plus d'aucun
# réseau. Régénérées, jamais recopiées : si le jeu change de police, on
# relance ce script.
set -e
cd "$(dirname "$0")"; mkdir -p polices; cd polices
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" -o brut.css
grep -oE "https://fonts.gstatic.com/[^)]+\.woff2" brut.css | sort -u |
  while read -r u; do curl -s "$u" -o "$(basename "$u")"; done
node - <<'JS'
import fs from 'fs';
const css = fs.readFileSync('brut.css', 'utf8');
const blocs = css.split('@font-face').slice(1).map(b => '@font-face' + b.slice(0, b.indexOf('}') + 1));
const latins = blocs.filter(b => /unicode-range:\s*U\+0000-00FF/.test(b));
if (!latins.length) throw new Error('aucune fonte latine : la feuille a changé de forme');
fs.writeFileSync('polices-inline.css', latins.map(b => {
  const nom = b.match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/)[0].split('/').pop();
  return b.replace(/url\([^)]+\)/, `url(data:font/woff2;base64,${fs.readFileSync(nom).toString('base64')})`);
}).join('\n'));
console.log(latins.length + ' fontes latines · ' + Math.round(fs.statSync('polices-inline.css').size / 1024) + ' ko');
JS
