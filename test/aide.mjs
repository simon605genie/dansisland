/* ============================================================
   Ce dont tous les harnais ont besoin : un site servi, un serveur
   simulé à la place de Supabase, et un navigateur.

   Pourquoi un faux store plutôt que le vrai : les épreuves doivent
   pouvoir tourner sans réseau, sans compte et sans toucher à la base de
   production. `src/store.js` est remplacé par `faux-store.js` dans une
   copie temporaire du site — le dépôt n'est jamais modifié.
   ============================================================ */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export const ICI = path.dirname(fileURLToPath(import.meta.url));
export const RACINE = path.resolve(ICI, '..');

const TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain',
};

/* Le navigateur.

   `chromium.launch()` tout court est ce qu'il faut sur une machine où on a
   fait `npx playwright install chromium`. Dans un conteneur qui porte déjà
   des navigateurs sous `PLAYWRIGHT_BROWSERS_PATH`, le numéro de build
   attendu par le paquet npm et celui qui est là ne coïncident pas
   forcément — et l'erreur ne dit que « Executable doesn't exist ». On se
   rabat donc sur le premier Chromium trouvé, plutôt que de demander à
   quelqu'un de coller un chemin dans un fichier. */
export async function navigateur(args = []) {
  try { return await chromium.launch({ args }); }
  catch (e) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!base || !fs.existsSync(base)) throw e;
    for (const d of fs.readdirSync(base).sort().reverse()) {
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return chromium.launch({ executablePath: p, args });
    }
    throw e;
  }
}

/* Le site, servi depuis une copie jetable.

   Toute adresse inconnue rend `index.html` : c'est exactement ce que fait
   le catch-all de `_redirects` en production, et c'est ce qui permet
   d'éprouver `/carte/<slug>` et `/island/<slug>`.

   `panne` reçoit la source d'`index.html` et rend celle qu'on veut servir.
   **C'est ce qui permet de fabriquer une vraie panne** plutôt que de
   supposer qu'un contrôle mordrait : ce dépôt éprouve chacun de ses
   garde-fous en remettant le défaut, et jusqu'ici il fallait modifier le
   fichier du dépôt pour le faire. Le dépôt n'est jamais touché, et la
   copie est jetée avec le serveur.

   Un remplacement qui ne remplace rien passerait inaperçu — une panne qui
   ne se pose pas rend le contrôle vert pour la mauvaise raison, et c'est
   exactement ce que ce dépôt se reproche depuis le 19/09. D'où `pannePosee`,
   que l'appelant doit pouvoir vérifier. */
export async function servir(port, panne) {
  const dos = fs.mkdtempSync(path.join(os.tmpdir(), 'dansisland-test-'));
  fs.mkdirSync(path.join(dos, 'src'));
  const src = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const sortie = panne ? panne(src) : src;
  fs.writeFileSync(path.join(dos, 'index.html'), sortie);
  fs.copyFileSync(path.join(RACINE, 'src', 'config.js'), path.join(dos, 'src', 'config.js'));
  fs.copyFileSync(path.join(ICI, 'faux-store.js'), path.join(dos, 'src', 'store.js'));
  /* Les icônes et le manifeste. Ils ne servaient à aucun harnais jusqu'au
     20/09 — et c'est exactement pour ça que personne ne vérifiait qu'elles
     suivaient le logo. `design.mjs` les compare au SVG de la source, dans
     un canvas : il faut donc qu'elles arrivent par la **même origine**,
     sinon le canvas est souillé et `getImageData()` lève. */
  for (const f of ['icone-192.png', 'icone-512.png', 'icone-maskable.png',
                   'apple-touch-icon.png', 'og.png', 'manifest.webmanifest', 'robots.txt']) {
    const src = path.join(RACINE, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dos, f));
  }

  const serveur = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    let f = path.join(dos, u === '/' ? 'index.html' : u);
    if (!f.startsWith(dos) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      f = path.join(dos, 'index.html');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'text/plain' });
    res.end(fs.readFileSync(f));
  });
  await new Promise(r => serveur.listen(port, r));
  return {
    url: 'http://127.0.0.1:' + port + '/',
    dossier: dos,
    pannePosee: sortie !== src,
    fermer: () => { serveur.close(); fs.rmSync(dos, { recursive: true, force: true }); },
  };
}

/* Un onglet prêt à jouer.

   `memoire` est ce qu'on écrit dans `localStorage` **avant** que la page ne
   démarre. Le `try/catch` n'est pas une politesse : ce script tourne dans
   chaque document, y compris l'`about:blank` initial, où `localStorage`
   lève une SecurityError — sans lui, le harnais salit son propre relevé
   d'erreurs. */
export async function onglet(nav, { taille = { width: 1280, height: 900 }, memoire = {},
                                    tactile = false, dpr = 1, theme = 'light' } = {}) {
  const ctx = await nav.newContext({
    viewport: taille, deviceScaleFactor: dpr, colorScheme: theme,
    isMobile: tactile, hasTouch: tactile,
  });
  const erreurs = [];
  ctx.on('weberror', e => erreurs.push(String(e.error())));
  /* `null` **retire** la clé au lieu de l'écrire. Sans ça, un harnais qui
     veut éprouver le tout premier visiteur ne peut pas : les graines par
     défaut existent pour que l'accueil ne gêne pas les autres contrôles, et
     `setItem(k, null)` écrit la chaîne « null », qui est vraie. On ne pouvait
     donc que semer, jamais dé-semer — et l'état le plus important du site,
     celui de quelqu'un qui arrive pour la première fois, était le seul
     qu'aucun contrôle ne savait produire. */
  await ctx.addInitScript(m => {
    try {
      Object.entries(m).forEach(([k, v]) =>
        v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v));
    } catch (e) {}
  /* **`dansisland:langue` est semée en français**, et c'est le garde-fou le
     plus important de ce fichier depuis la marée figée.

     Sans elle, le jeu lit `navigator.language` — et un Chromium piloté
     répond `en-US`. Les dix harnais qui cherchent des phrases françaises
     seraient donc rouges ici et verts sur une machine réglée en français,
     sans qu'une ligne du jeu ait changé. C'est exactement l'oracle déjà
     nommé pour la saison, la météo et l'heure de la marée : **une mesure
     doit tenir toutes ses variables sauf celle qu'elle nomme.**

     Seul `langues.mjs` la remplace, puisque c'est la seule qu'il éprouve. */
  }, { 'dansisland:entre': '1', 'dansisland:guide': '4', 'dansisland:tourne': '1',
       'dansisland:langue': 'fr', ...memoire });
  const page = await ctx.newPage();
  page.on('pageerror', e => erreurs.push(String(e)));
  return { ctx, page, erreurs };
}

/* Le compte-rendu. Un harnais qui dit seulement « échec » oblige à relire
   le code pour savoir ce qui a échoué ; chaque ligne porte donc sa phrase. */
export function compteur() {
  let dur = 0;
  return {
    dit(ok, s) { if (!ok) dur++; console.log((ok ? '  ✅ ' : '  ❌ ') + s); },
    titre(s) { console.log('\n── ' + s); },
    fin() {
      console.log('\n' + (dur ? '❌ ' + dur + ' contrôle(s) en échec'
                              : '✅ tous les contrôles passent'));
      return dur;
    },
  };
}

export const attendre = ms => new Promise(r => setTimeout(r, ms));

/* Un remplacement qui **doit** mordre.

   `pannePosee` dit qu'une panne a changé quelque chose ; il ne dit pas que
   *chacun* des remplacements a trouvé sa cible. Une panne en deux temps
   dont le second rate se pose à moitié, et le contrôle mesure alors un
   état que personne n'a voulu — vert ou rouge, il ne dit plus rien.

   Ça m'est arrivé en forçant l'arc-en-ciel : le premier remplacement
   passait, le second visait une ligne que j'avais réécrite, et la capture
   ne montrait aucun arc. J'ai cru à un défaut du dessin. */
export function remplacer(src, re, par) {
  if (!re.test(src)) throw new Error('la panne ne trouve pas sa cible : ' + re);
  return src.replace(re, par);
}
