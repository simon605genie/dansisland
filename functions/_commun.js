// ============================================================
//  Ce que partagent les pages publiques (Cloudflare Pages Functions).
//
//  Pourquoi elles existent : le jeu est **une seule page** peinte dans un
//  canvas, et `_redirects` sert cette même page à toutes les adresses. Un
//  robot — Google, WhatsApp, Signal, Slack — ne lit pas le JavaScript : il
//  voyait donc « Dan's Island » et la même vignette pour les cinquante
//  îles de l'archipel. Ces fonctions écrivent, côté serveur, une vraie
//  page HTML par île et par carte postale, avec son titre, sa description
//  et ses balises de partage.
//
//  Trois règles :
//
//  1. **En cas de doute, on s'efface.** Île inconnue, base injoignable,
//     slug mal formé : `next()`, et c'est le catch-all qui sert le jeu.
//     Le routeur de `index.html` sait ouvrir /island/x et /carte/x. Une
//     adresse partagée ne doit jamais tomber sur une page d'erreur.
//  2. **On ne lit que ce qui est public.** La clé est la clé publishable,
//     celle de `src/config.js`, sans jeton d'utilisateur : `auth.uid()`
//     vaut null côté Postgres, donc la RLS ne montre que les îles
//     publiées. La vue `archipel` suffit, et elle ne trimballe pas le
//     jsonb entier.
//  3. **La clé vient d'`env` quand elle y est.** Les valeurs écrites ici
//     ne sont qu'un repli, identiques à celles de `src/config.js` : deux
//     listes qui divergent, et la page publique ne trouve plus l'île que
//     le jeu affiche. Si tu changes l'une, change l'autre.
// ============================================================

const URL_DEFAUT = 'https://cgputbitzfgokpwbbind.supabase.co';
const CLE_DEFAUT = 'sb_publishable_3V1nUy5JTTqXw2CfGdFtrQ_3VG0iIP2';

export const SITE = 'https://dansisland.app';
export const SLUG = /^[a-z0-9][a-z0-9-]{1,23}$/;

/* **Rien n'est indexable par défaut.** Une île est faite par quelqu'un, et
   souvent par un enfant : elle porte son prénom, le nom qu'il a donné à son
   île, et le livre d'or où ses copains ont écrit. Une carte postale porte en
   plus un message personnel dans son adresse.

   Jusqu'au 20/09, `page()` écrivait `index, follow` en dur et le plan du
   site listait **toutes** les îles publiées. Publier une île pour qu'un ami
   la visite et la retrouver dans Google sont deux choses différentes, et le
   joueur n'avait consenti qu'à la première.

   Ce qui s'indexe est donc une liste **écrite à la main**, courte, et faite
   de pages éditoriales — plus l'île de démonstration, qui n'appartient à
   personne. Ajouter une île ici est une décision, pas un effet de bord. */
export const ROBOTS_OUI = 'index, follow, max-image-preview:large';
export const ROBOTS_NON = 'noindex, follow, max-image-preview:large';
export const ILES_INDEXABLES = ['dan'];

/* Les pages éditoriales. Une seule liste : le plan du site les énumère, le
   pied de page les relie, et chaque page sait laquelle elle est. Deux listes
   qui divergent, et le plan annonce une adresse qui n'existe pas — le piège
   déjà nommé pour les prix SQL et pour les rayons de l'atelier.

   **`chemin` est français, et c'est le canonique.** Le site est en français
   et pour des enfants francophones : « comment jouer à » se tape en
   français, pas en anglais, et une adresse qu'on ne sait pas lire ne se
   partage pas de vive voix.

   **`alias` est l'adresse anglaise**, servie à l'identique, canonique
   pointé sur le français. Ce n'est pas un doublon : c'est la même page à
   deux portes, et un moteur consolide les deux sur une seule. Un `noindex`
   sur l'alias, lui, contredirait son propre canonique — les deux signaux
   ne se posent pas ensemble.

   **Les huit adresses sont réservées côté base** (`slug_reserve()`,
   `supabase/2026-09-20_slugs_reserves.sql`) : sans ça, un joueur pouvait
   prendre `comment-jouer` comme adresse d'île, et sa page de fonction
   aurait masqué son île sans que rien ne le signale. */
export const PAGES = [
  { chemin: '/comment-jouer',      alias: '/how-to-play',       nom: 'Comment jouer',       court: 'Jouer' },
  { chemin: '/fonctionnalites',    alias: '/features',          nom: 'Ce qu’on peut faire', court: 'Le jeu' },
  { chemin: '/construire-son-ile', alias: '/build-your-island', nom: 'Construire son île',  court: 'Construire' },
  { chemin: '/cartes-postales',    alias: '/postcards',         nom: 'Les cartes postales', court: 'Cartes postales' }
];

function base(env) {
  return {
    url: (env && env.SUPABASE_URL) || URL_DEFAUT,
    cle: (env && env.SUPABASE_KEY) || CLE_DEFAUT
  };
}

// Une île publiée, par son slug. `archipel` est la vue publique : nom,
// propriétaire, palette, avatar, nombre de mots. Pas le monde entier.
export async function ileParSlug(env, slug) {
  const b = base(env);
  const u = b.url + '/rest/v1/archipel?slug=eq.' + encodeURIComponent(slug) + '&select=*&limit=1';
  const r = await fetch(u, { headers: { apikey: b.cle, Authorization: 'Bearer ' + b.cle } });
  if (!r.ok) return null;
  const rows = await r.json();
  return (Array.isArray(rows) && rows[0]) || null;
}

// Toutes les îles publiées, pour le plan du site.
export async function toutesLesIles(env, limite = 2000) {
  const b = base(env);
  const u = b.url + '/rest/v1/archipel?select=slug,maj_le&limit=' + limite;
  const r = await fetch(u, { headers: { apikey: b.cle, Authorization: 'Bearer ' + b.cle } });
  if (!r.ok) return [];
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

export function ech(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Une île dessinée en SVG, dans les couleurs de son propriétaire. Le jeu
// la peint dans un canvas, ce qui ne sert à rien ici : c'est une page
// servie à quelqu'un qui n'a pas encore lancé le jeu. Une vignette plate,
// mais qui porte **ses** couleurs à lui, dit déjà que l'île est la sienne.
export function vignette(pal) {
  const p = (pal && pal.grass) ? pal : { water: '#45CFE8', sand: '#F4D6A0', grass: '#7BD389' };
  const los = (cx, cy, w, h, c) =>
    `<path d="M${cx} ${cy - h} L${cx + w} ${cy} L${cx} ${cy + h} L${cx - w} ${cy} Z" fill="${c}"/>`;
  // Les cases se peignent dans l'ordre `x+y`, comme dans le jeu : en
  // ordre de lignes, une case du fond passe devant une case de devant et
  // l'île a l'air pliée.
  const cases = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
    const d = Math.hypot(x - 2, y - 2);
    if (d > 2.3) continue;
    cases.push({ x, y, d });
  }
  cases.sort((a, b2) => (a.x + a.y) - (b2.x + b2.y));
  const sol = cases.map(c =>
    los(200 + (c.x - c.y) * 34, 108 + (c.x + c.y) * 17, 34, 17,
        c.d > 1.55 ? ech(p.sand) : ech(p.grass))).join('');
  const palmier = (x, y) => `<g transform="translate(${x} ${y})">
    <path d="M0 0 V-22" stroke="#8B5E3C" stroke-width="4" stroke-linecap="round"/>
    <path d="M0 -22c-9-7-17-5-20 2 7-2 12 0 15 3M0 -22c9-7 17-5 20 2-7-2-12 0-15 3M0 -22c-2-9 3-14 10-14-4 4-6 9-5 14"
          fill="#5FAF78"/></g>`;
  return `<svg viewBox="0 0 400 240" role="img" aria-label="Une île vue de dessus, en isométrique">
  <ellipse cx="200" cy="142" rx="190" ry="94" fill="${ech(p.water)}"/>
  ${sol}
  ${palmier(132, 146)}
  <path d="M182 128 h36 v30 h-36 z" fill="#FDFBF2"/>
  <path d="M176 128 L200 108 L224 128 Z" fill="#184D5B"/>
  <rect x="194" y="142" width="12" height="16" rx="2" fill="#FF8F70"/>
  ${palmier(266, 160)}
</svg>`;
}

/* La page. Une seule maquette pour l'île et pour la carte postale : même
   papier, même typo, mêmes couleurs que le jeu, et elle marche sans une
   ligne de JavaScript. C'est le point — un robot la lit, et un enfant sur
   une connexion lente la voit avant que quoi que ce soit ne se charge.

   Le thème sombre est là aussi : le jeu l'a, et une page d'invitation
   blanche qui éclate au milieu de la nuit, c'est la première impression
   ratée. */
export function page(o) {
  const url = SITE + o.chemin;
  return `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0D2630">
<title>${ech(o.titre)}</title>
<meta name="description" content="${ech(o.desc)}">
<link rel="canonical" href="${ech(url)}">
<meta name="robots" content="${ech(o.robots || ROBOTS_NON)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Dan's Island">
<meta property="og:locale" content="fr_BE">
<meta property="og:url" content="${ech(url)}">
<meta property="og:title" content="${ech(o.titre)}">
<meta property="og:description" content="${ech(o.desc)}">
<meta property="og:image" content="${SITE}/og.png?v=3">
<meta property="og:image:secure_url" content="${SITE}/og.png?v=3">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Une île isométrique avec sa maison, son phare et ses palmiers.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ech(o.titre)}">
<meta name="twitter:description" content="${ech(o.desc)}">
<meta name="twitter:image" content="${SITE}/og.png?v=3">
<link rel="icon" href="/icone-192.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap">
${o.ld ? '<script type="application/ld+json">' + o.ld + '</script>' : ''}
<style>
/* La planche d'identité du 20/09, la même que celle d'index.html. Deux
   feuilles, une seule planche : si une couleur change là-bas, elle change
   ici. C'est le piège déjà nommé pour les clés Supabase de ce fichier et
   pour les prix SQL — deux listes qui divergent, et la page publique ne
   ressemble plus au jeu qu'elle annonce. */
:root{
  --ocean:#0D2630;--mer:#184D5B;--mer-claire:#146A78;--lagon:#72D6D0;
  --sable:#F4D7A1;--corail:#FF8F70;--vegetal:#5FAF78;--creme:#FFF8E8;
  --paper:var(--creme);--card:#FFFEF8;--sunk:#F6EBD5;
  --ink:var(--ocean);--ink-2:var(--mer);--ink-3:#4E6E78;--line:#E8DBBE;
  --corail-ecrit:#B8431E;
  --pink:var(--corail);--teal:var(--mer-claire);--sand:var(--sable);--encre:var(--ocean);
}
@media (prefers-color-scheme:dark){
  :root{--paper:var(--ocean);--card:var(--mer);--sunk:#081A21;
        --ink:var(--creme);--ink-2:#C6DDE2;--ink-3:#9CC0C7;--line:#24657A;
        --teal:var(--lagon);--corail-ecrit:var(--corail)}
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font:16px/1.55 Nunito,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3,.d{font-family:"Baloo 2",Nunito,sans-serif;margin:0;line-height:1.08;text-wrap:balance}
a{color:var(--teal)}
:focus-visible{outline:3px solid var(--corail);outline-offset:2px;border-radius:8px}
.wrap{max-width:960px;margin:0 auto;padding:22px 20px 40px}

/* ---- l'en-tête : logotype, menu, et la porte ---- */
.haut{display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap;margin-bottom:26px}
.haut .logo{display:flex;align-items:center;gap:11px;text-decoration:none;color:inherit}
.haut svg{width:40px;height:40px;flex:none;border-radius:10px}
.haut b{font-family:"Baloo 2",sans-serif;font-size:19px;font-weight:800;letter-spacing:.01em}
.haut .menu{display:flex;flex-wrap:wrap;gap:3px 15px;margin-left:auto;font-size:13.5px}
.haut .menu a{color:var(--ink-2);text-decoration:none;font-weight:600}
.haut .menu a:hover,.haut .menu a[aria-current]{color:var(--corail-ecrit)}
.haut .btn{padding:9px 16px;font-size:15px}
@media (max-width:640px){.haut .menu{display:none}.haut .btn{margin-left:auto}}

/* ---- la carte d'une île, d'une carte postale ---- */
.carte{background:var(--card);border:1.5px solid var(--line);border-radius:20px;overflow:hidden;
  box-shadow:0 1px 0 rgba(13,38,48,.05),0 16px 38px -22px rgba(13,38,48,.5);
  max-width:600px;margin-inline:auto}
.carte>svg{display:block;width:100%;height:auto;background:#FDFBF0}
.dedans{padding:22px 24px 26px}
h1{font-size:clamp(26px,6.4vw,36px);font-weight:800}
.qui{color:var(--ink-3);font-size:14px;margin:5px 0 0}
.mot{margin:16px 0 0;padding:13px 16px;background:var(--sand);color:var(--encre);border-radius:13px;
  font-family:"Baloo 2",sans-serif;font-weight:700;font-size:17px;line-height:1.35}
.dit{color:var(--ink-2);margin:15px 0 0}
.portes{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}
.btn{display:inline-block;text-decoration:none;font-family:"Baloo 2",sans-serif;font-weight:700;
  font-size:16px;padding:12px 19px;border-radius:14px;border:1.5px solid var(--line);
  background:var(--paper);color:var(--ink)}
.btn.p{background:var(--corail);border-color:var(--corail);color:var(--encre);
  box-shadow:0 4px 0 rgba(200,84,54,.32)}
.mono{font-family:"DM Mono",ui-monospace,monospace;font-size:13px}
.liens{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:12px}
.liens a{font-weight:600}

/* ---- le bandeau de titre des pages éditoriales ----
   La planche pose le titre sur un panneau d'océan, pas sur le papier. Sans
   photo à mettre dessous — ce dépôt n'a pas de rasteriseur et n'en aura pas
   — c'est le dégradé mer + la vague qui font le fond. Il tient tout seul, ne
   charge rien, et il est le même de jour comme de nuit : c'est un panneau,
   il n'a pas à changer avec le thème. */
.banniere{position:relative;overflow:hidden;border-radius:22px;margin-bottom:26px;
  padding:34px 30px 38px;color:var(--creme);
  background:linear-gradient(160deg,#184D5B 0%,#0D2630 72%)}
.banniere h1{color:var(--creme);max-width:16ch}
.banniere .chapo{color:#BFE4E6;font-size:17.5px;margin:10px 0 0;max-width:46ch;position:relative}
.banniere .soleil{position:absolute;top:-58px;right:-40px;width:230px;height:230px;
  border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,143,112,.62) 0%,rgba(255,143,112,.26) 45%,rgba(255,143,112,0) 72%)}
/* Deux palmiers en filigrane, au bord du bandeau. C'est le seul décor du
   site qui ne soit ni le logo ni une île de joueur : il est en crème à 9 %,
   donc il se voit sans jamais disputer le titre. Il part sous 760 px, où le
   titre occupe déjà toute la largeur. */
.banniere .palmes{position:absolute;right:16px;bottom:8px;width:190px;height:120px;
  opacity:.09;pointer-events:none}
@media (max-width:760px){.banniere .palmes{display:none}}
.banniere .vague{position:absolute;left:0;right:0;bottom:-2px;width:100%;height:26px;display:block}
.banniere>*{position:relative}
@media (max-width:640px){.banniere{padding:24px 20px 30px;border-radius:18px}}

/* ---- le rang des cinq : la carte du jeu ----
   Ce n'est pas la barre d'onglets du jeu recopiée : ce sont les cinq choses
   qu'on y fait. Le quatrième s'appelle **Voisins** et non « Explorer »
   comme sur la planche, parce que c'est le mot que l'enfant verra dans le
   jeu — un site qui apprend un mot que le jeu n'emploie pas fait chercher
   un onglet qui n'existe pas. */
.rang{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:0 0 30px}
.rang a,.rang div{display:block;text-decoration:none;color:inherit;background:var(--card);
  border:1.5px solid var(--line);border-radius:16px;padding:14px 13px 15px}
/* La carte de la page où l'on est : même objet, mais elle ne mène nulle
   part et le dit — un fond creux, comme une touche enfoncée. */
.rang div{background:var(--sunk);border-style:dashed}
.rang a:hover{border-color:var(--corail)}
.rang .rond{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;
  background:var(--sunk);color:var(--teal);margin-bottom:9px}
.rang svg{width:19px;height:19px;display:block}
.rang b{display:block;font-family:"Baloo 2",sans-serif;font-size:15.5px;font-weight:800}
.rang span{display:block;font-size:12.5px;color:var(--ink-3);line-height:1.4;margin-top:2px}
@media (max-width:760px){.rang{grid-template-columns:repeat(2,1fr)}}
@media (max-width:420px){.rang{grid-template-columns:1fr}
  .rang a,.rang div{display:grid;grid-template-columns:34px 1fr;column-gap:12px;align-items:center}
  .rang .rond{margin:0;grid-row:span 2}}

/* ---- la citation ---- */
.citation{margin:30px 0;padding:22px 26px;border-radius:20px;background:var(--sunk);
  border:1.5px solid var(--line);font-family:"Baloo 2",sans-serif;font-weight:700;
  font-size:clamp(19px,3.4vw,25px);line-height:1.25;color:var(--ink);text-wrap:balance}
.citation span{display:block;font-family:Nunito,sans-serif;font-weight:600;font-size:14px;
  color:var(--ink-3);margin-top:8px}

/* ---- les pages éditoriales : du texte long, pas une carte ---- */
.page h2{font-size:21px;font-weight:800;margin:30px 0 7px}
.page p{margin:0 0 13px}
.page ul{margin:0 0 13px;padding-left:19px}
.page li{margin:0 0 6px}
.page .encart{background:var(--card);border:1.5px solid var(--line);border-radius:16px;
  padding:17px 19px;margin:24px 0}
.page .encart p:last-child{margin:0}

/* ---- le socle et le pied ---- */
.socle{margin-top:30px;color:var(--ink-3);font-size:13.5px;line-height:1.5}
.socle h2{font-size:15px;color:var(--ink-2);margin:0 0 5px}
.pied{margin-top:26px;padding-top:18px;border-top:1.5px solid var(--line);
  display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 18px;font-size:12px}
.pied .nom{font-family:"Baloo 2",sans-serif;font-weight:800;letter-spacing:.06em;color:var(--ink-2)}
.pied .nom i{font-style:normal;font-weight:600;letter-spacing:.14em;color:var(--ink-3)}
.pied .verbes,.pied .devise{letter-spacing:.13em;text-transform:uppercase;
  font-weight:700;color:var(--ink-3)}
.pied .devise{margin-left:auto}
@media (max-width:640px){.pied .devise{margin-left:0}}
</style>
<div class="wrap">
  <header class="haut">
    <a class="logo" href="/">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="15" fill="#0D2630"/>
  <circle cx="43" cy="20" r="9" fill="#FF8F70"/>
  <path d="M11 48c0-10 9.5-15 21-15s21 5 21 15z" fill="#F4D7A1"/>
  <path d="M26 35V21" stroke="#8B5E3C" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M26 21c-7-5.5-13.5-3-15.5 2.5 5.5-2 10 0 12 2.5M26 21c7-5.5 13.5-3 15.5 2.5-5.5-2-10 0-12 2.5M26 21c-1-6.5 3.5-10 9-10-3.5 2.5-4.5 6.5-3.5 10" fill="#5FAF78"/>
  <path d="M6 56c6-4 11 4 17 0s11 4 17 0 11 4 17 0" fill="none" stroke="#72D6D0" stroke-width="5" stroke-linecap="round"/>
      </svg>
      <b>DAN’S ISLAND</b>
    </a>
    <!-- Le menu porte « court », le pied porte « nom ». Ce n'est pas une
         seconde liste : c'est un second champ de la même ligne, donc rien
         ne peut diverger. Mesuré : à 1100 px, les quatre noms longs
         poussaient le bouton « Créer mon île » à la ligne, et une porte
         qui tombe sous son propre menu n'est plus une porte.
         (Pas d'accent grave ici : on est dans un gabarit, et une apostrophe
         inversée y ferme la chaîne. Trouvé en cassant le module.) -->
    <nav class="menu" aria-label="Le site">${PAGES.map(p =>
      '<a href="' + p.chemin + '"' + (p.chemin === o.chemin ? ' aria-current="page"' : '') +
      '>' + ech(p.court || p.nom) + '</a>').join('')}</nav>
    <a class="btn p" href="/">Créer mon île</a>
  </header>
  ${o.corps}
  <section class="socle">
    <h2>Qu’est-ce que Dan’s Island&nbsp;?</h2>
    <p>Un jeu de détente, gratuit, qui se joue dans le navigateur. On crée son
    personnage, on construit sa maison et son île, puis on va découvrir celles
    des autres. Pas de score, pas de minuteur, pas de partie ratée&nbsp;: la mer
    monte et descend, les mouettes traversent le ciel, et on revient quand on
    veut. <a href="/">Créer mon île</a>.</p>
    <nav class="liens">${PAGES.map(p =>
      '<a href="' + p.chemin + '">' + ech(p.nom) + '</a>').join('')}</nav>
  </section>
  <footer class="pied">
    <span class="nom">DAN’S ISLAND <i>— Digital Island Retreat</i></span>
    <span class="verbes">Jouer · Créer · Visiter · Partager · Respirer</span>
    <span class="devise">Des îles plus heureuses sur un internet plus doux.</span>
  </footer>
</div>
`;
}

/* Le filigrane du bandeau : deux palmiers et un sol, en crème translucide.
   Le même palmier que le logo, redessiné en repère 190x120 — un `transform`
   sur le dessin du logo aurait marché aussi, mais il aurait lié la
   décoration d'un bandeau à une marque qui peut changer demain. */
export const PALMES = `<svg class="palmes" viewBox="0 0 190 120" aria-hidden="true">
  <g fill="none" stroke="#FFF8E8" stroke-width="5" stroke-linecap="round">
    <path d="M60 112V58"/><path d="M128 112V74"/>
  </g>
  <g fill="#FFF8E8">
    <path d="M60 58c-16-13-31-9-36 5 13-5 24-1 29 5zM60 58c16-13 31-9 36 5-13-5-24-1-29 5zM60 58c-3-16 8-25 21-25-8 6-12 15-10 24z"/>
    <path d="M128 74c-11-9-22-6-25 4 9-4 17-1 20 3zM128 74c11-9 22-6 25 4-9-4-17-1-20 3zM128 74c-2-11 6-18 15-18-6 4-9 11-7 17z"/>
    <ellipse cx="95" cy="114" rx="86" ry="10"/>
  </g>
</svg>`;

/* La vague qui ferme le bandeau de titre. Elle est en repère 1200x26 et
   s'étire : une vague qui garderait son rapport laisserait un coin de
   papier sur un large écran. */
export const VAGUE = `<svg class="vague" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 14c90-16 180 16 270 4s180-20 270-6 180 20 270 8 180-18 270-6 120 12 120 12V26H0z" fill="#FFF8E8" opacity=".14"/>
  <path d="M0 20c100-12 200 10 300 2s200-14 300-4 200 14 300 6 200-10 300-2V26H0z" fill="#72D6D0" opacity=".3"/>
</svg>`;

/* Le rang des cinq : ce qu'on fait dans le jeu, en cinq portes. Il vit ici
   et pas dans `_pages.js` parce que la page d'une île et celle d'une carte
   postale y ont droit aussi — c'est la réponse à « c'est quoi, ce truc ? »
   pour quelqu'un qui arrive par un lien reçu sur WhatsApp. */
const CINQ = [
  ['Moi', 'Crée ton personnage', '/comment-jouer',
   '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 20c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'],
  ['Maison', 'Construis et décore', '/comment-jouer#ta-maison',
   '<path d="M3.5 10.5 12 3.5l8.5 7M5.5 9.5V20h13V9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'],
  ['Île', 'Façonne ton paradis', '/construire-son-ile',
   '<path d="M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 15c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 10V5M12 5c-2.5-1.8-4.6-1-5.4 1 1.9-.7 3.4 0 4.1.9M12 5c2.5-1.8 4.6-1 5.4 1-1.9-.7-3.4 0-4.1.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'],
  ['Voisins', 'Rends visite aux autres', '/fonctionnalites',
   '<circle cx="12" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 10h15M12 2.5c2 2.2 3 4.8 3 7.5s-1 5.3-3 7.5c-2-2.2-3-4.8-3-7.5s1-5.3 3-7.5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 21h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'],
  ['Cartes postales', 'Capture et partage', '/cartes-postales',
   '<rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 19V5M2.5 9.5h11.5M2.5 14h11.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="17.8" cy="9.3" r="1.6" fill="currentColor"/>']
];

/* Chaque carte mène à la page qui en parle, et **la carte de la page où
   l'on est n'est pas un lien**. Le premier jet les pointait toutes vers
   « / » : cinq liens vers la même adresse dans une seule navigation, ce
   qui ne dit rien à un lecteur d'écran et rien à un moteur. Une carte qui
   pointe sur la page qu'on lit déjà est le même défaut d'un cran plus
   loin, d'où le `<div>`.

   **Les cinq cibles doivent être deux à deux distinctes**, et c'est ce qui
   fait tenir tout le reste. Il y a cinq cartes pour quatre pages : au
   premier jet, Maison et Île pointaient toutes deux sur
   `/construire-son-ile`, donc sur cette page **deux** cartes devenaient des
   `<div>` — deux repères « tu es ici » côte à côte dans une rangée de cinq,
   ce qui ne se lit pas comme « cette page parle des deux » mais comme un
   défaut d'affichage. Et les trois autres pages y montraient deux liens
   vers la même adresse.

   Le remède n'est pas de compter les `<div>` : c'est que **deux cartes ne
   visent jamais le même endroit**. Maison va au paragraphe qui lui répond
   (`/comment-jouer#ta-maison` — les murs, le toit, les volets, et les trois
   pièces), Île garde la page de la construction. Au plus un `<div>` devient
   alors vrai par construction, et personne n'a à y penser.

   Une ancre dans une cible n'est pas décorative : elle doit exister dans la
   page visée, sinon le saut ne fait rien et rien ne le dit. Le contrôle 4 de
   `test/robots.mjs` vérifie les deux — l'unicité des cibles et l'existence
   de chaque ancre — et il a été éprouvé en remettant le vrai défaut. Trouvé
   en **regardant** la page rendue, pas en relisant cette liste. */
export function rang(ici) {
  return '<nav class="rang" aria-label="Ce qu’on fait dans le jeu">' + CINQ.map(([n, d, ou, g]) => {
    const dedans = `<span class="rond" aria-hidden="true"><svg viewBox="0 0 24 24">${g}</svg></span>` +
                   `<b>${ech(n)}</b><span>${ech(d)}</span>`;
    return ou === ici ? `<div>${dedans}</div>` : `<a href="${ou}">${dedans}</a>`;
  }).join('') + '</nav>';
}

export function reponse(html) {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Cinq minutes au bord, une heure de « sers le périmé pendant que tu
      // rafraîchis » : une île qu'on vient de renommer se remet à jour vite,
      // et un lien qui tourne sur WhatsApp ne martèle pas la base.
      'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600'
    }
  });
}
