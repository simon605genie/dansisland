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
   déjà nommé pour les prix SQL et pour les rayons de l'atelier. */
export const PAGES = [
  { chemin: '/how-to-play',      nom: 'Comment jouer' },
  { chemin: '/features',         nom: 'Ce qu’on peut faire' },
  { chemin: '/build-your-island', nom: 'Construire son île' },
  { chemin: '/postcards',        nom: 'Les cartes postales' }
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
          fill="#3FBF8F"/></g>`;
  return `<svg viewBox="0 0 400 240" role="img" aria-label="Une île vue de dessus, en isométrique">
  <ellipse cx="200" cy="142" rx="190" ry="94" fill="${ech(p.water)}"/>
  ${sol}
  ${palmier(132, 146)}
  <path d="M182 128 h36 v30 h-36 z" fill="#FDFBF2"/>
  <path d="M176 128 L200 108 L224 128 Z" fill="#0B3C5D"/>
  <rect x="194" y="142" width="12" height="16" rx="2" fill="#F48CA8"/>
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
<meta name="theme-color" content="#0B3C5D">
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
<meta property="og:image" content="${SITE}/og.png?v=2">
<meta property="og:image:secure_url" content="${SITE}/og.png?v=2">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Une île isométrique avec sa maison, son phare et ses palmiers.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ech(o.titre)}">
<meta name="twitter:description" content="${ech(o.desc)}">
<meta name="twitter:image" content="${SITE}/og.png?v=2">
<link rel="icon" href="/icone-192.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap">
${o.ld ? '<script type="application/ld+json">' + o.ld + '</script>' : ''}
<style>
:root{--paper:#FAF6EA;--card:#FFFDF5;--ink:#0B3C5D;--ink-2:#3F6B85;--ink-3:#8AA3B2;
      --line:#E2D8C2;--pink:#F48CA8;--teal:#148A9C;--sand:#F4D6A0}
@media (prefers-color-scheme:dark){
  :root{--paper:#062434;--card:#0B3C5D;--ink:#F6F1E2;--ink-2:#A9CBD6;--ink-3:#75A0B1;--line:#14567A}
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font:16px/1.55 Nunito,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,.d{font-family:"Baloo 2",Nunito,sans-serif;margin:0;line-height:1.08;text-wrap:balance}
a{color:var(--teal)}
.wrap{max-width:620px;margin:0 auto;padding:28px 20px 44px}
.haut{display:flex;align-items:center;gap:11px;margin-bottom:26px}
.haut svg{width:40px;height:40px;flex:none;border-radius:10px}
.haut b{font-family:"Baloo 2",sans-serif;font-size:19px;font-weight:800;letter-spacing:.01em}
.carte{background:var(--card);border:1.5px solid var(--line);border-radius:18px;overflow:hidden;
  box-shadow:0 1px 0 rgba(11,60,93,.05),0 14px 34px -20px rgba(11,60,93,.5)}
.carte>svg{display:block;width:100%;height:auto;background:#FDFBF0}
.dedans{padding:20px 22px 24px}
h1{font-size:clamp(26px,6.4vw,36px);font-weight:800}
.qui{color:var(--ink-3);font-size:14px;margin:5px 0 0}
.mot{margin:16px 0 0;padding:13px 16px;background:var(--sand);color:#0B3C5D;border-radius:13px;
  font-family:"Baloo 2",sans-serif;font-weight:700;font-size:17px;line-height:1.35}
.dit{color:var(--ink-2);margin:15px 0 0}
.portes{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}
.btn{display:inline-block;text-decoration:none;font-family:"Baloo 2",sans-serif;font-weight:700;
  font-size:16px;padding:12px 19px;border-radius:13px;border:1.5px solid var(--line);
  background:var(--paper);color:var(--ink)}
.btn.p{background:var(--pink);border-color:var(--pink);color:#0B3C5D}
.socle{margin-top:26px;color:var(--ink-3);font-size:13.5px;line-height:1.5}
.socle h2{font-size:15px;color:var(--ink-2);margin:0 0 5px}
.liens{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:12px}
.liens a{font-weight:600}
.mono{font-family:"DM Mono",ui-monospace,monospace;font-size:13px}
/* Les pages éditoriales : du texte long, pas une carte. Elles partagent le
   papier et la typo du jeu, et rien d'autre n'a eu à changer. */
.page h1{font-size:clamp(28px,6.8vw,40px);font-weight:800;margin-bottom:6px}
.page .chapo{color:var(--ink-2);font-size:17.5px;margin:0 0 26px}
.page h2{font-size:21px;font-weight:800;margin:30px 0 7px}
.page p{margin:0 0 13px}
.page ul{margin:0 0 13px;padding-left:19px}
.page li{margin:0 0 6px}
.page .encart{background:var(--card);border:1.5px solid var(--line);border-radius:16px;
  padding:17px 19px;margin:24px 0}
.page .encart p:last-child{margin:0}
</style>
<div class="wrap">
  <header class="haut">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#0B3C5D"/>
      <path d="M10 44c0-7 6-12 13-12s13 5 13 12z" fill="#8B5E3C"/>
      <path d="M22 33V19" stroke="#FAF6EA" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M22 19c-5-4-10-3-12 1 4-1 7 0 9 2M22 19c5-4 10-3 12 1-4-1-7 0-9 2M22 19c-1-5 2-8 6-8-2 2-3 5-2 8" fill="#FAF6EA"/>
      <circle cx="46" cy="20" r="7" fill="#F48CA8"/>
      <rect x="42" y="32" width="8" height="18" rx="4" fill="#FAF6EA"/>
    </svg>
    <b><a href="/" style="color:inherit;text-decoration:none">DAN’S ISLAND</a></b>
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
</div>
`;
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
