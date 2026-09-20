/* La planche d'identité, et ce qui l'empêche de se déliter.

   Le 20/09, le site a pris les sept couleurs d'une planche d'identité :
   océan, mer, lagon, sable, corail, végétation, crème. Une planche n'est
   pas un choix qu'on fait une fois — c'est un choix qu'on **tient**, et un
   dépôt où deux cents règles CSS peuvent écrire une couleur en dur n'en
   tient aucun très longtemps.

   Ce harnais ne juge pas le goût : il n'y a pas d'assertion possible sur
   « est-ce joli ». Il tient les quatre choses qui, elles, se mesurent :

     1. rien n'écrit une couleur en dehors de la planche
     2. tout ce qui s'écrit reste lisible, dans les deux thèmes
     3. le voile d'accueil garde ses trois déclarations d'accord
     4. les icônes sont bien celles du logo, et pas celles d'hier

   Le 3 est un invariant écrit depuis le 19/09 et jamais mesuré. Le 4 est
   une **consigne** de CLAUDE.md — « les icônes se régénèrent, elles ne se
   dessinent pas à la main » — donc quelque chose que personne ne relit.

   Et comme partout ici : quand un navigateur peut répondre, c'est à lui
   qu'on demande. Une expression rationnelle qui cherche des sélecteurs
   hérite des angles morts d'un moteur CSS. C'est la leçon du contrôle 12
   de `objets.mjs`, et elle vaut mot pour mot ici. */
import { navigateur, servir, onglet, attendre, compteur, RACINE } from './aide.mjs';
import { readFileSync } from 'fs';
import path from 'path';

const s = await servir(8214);
const nav = await navigateur();
const c = compteur();
const lire = f => readFileSync(path.join(RACINE, f), 'utf8');

/* Les sept de la planche, plus les deux dérivées. Elles sont écrites ici
   **en dur et en toutes lettres** : c'est le seul endroit du dépôt qui a le
   droit de les recopier, parce que c'est lui qui vérifie que les autres ne
   le font pas. Une liste lue depuis la feuille ne prouverait que la feuille
   est d'accord avec elle-même. */
const PLANCHE = {
  ocean: '#0D2630', mer: '#184D5B', 'mer-claire': '#146A78', lagon: '#72D6D0',
  sable: '#F4D7A1', corail: '#FF8F70', vegetal: '#5FAF78', creme: '#FFF8E8'
};

c.titre('1. la planche est la seule source de couleur');
{
  const src = lire('index.html');
  const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
  c.dit(style.length > 20000, 'la feuille de style a bien été trouvée (' + style.length + ' car.)');

  // Le bloc des jetons : tout ce qui est avant `*{box-sizing` déclare, tout
  // ce qui est après consomme. Un consommateur n'a pas à connaître de teinte.
  const coupe = style.indexOf('*{box-sizing');
  c.dit(coupe > 0, 'le bloc des jetons se termine bien avant la première règle');
  const jetons = style.slice(0, coupe), regles = style.slice(coupe);

  for (const [nom, hex] of Object.entries(PLANCHE))
    c.dit(jetons.indexOf('--' + nom + ':' + hex) >= 0,
          '`--' + nom + '` vaut bien ' + hex + ' dans index.html');

  /* Les seules couleurs en dur tolérées dans les règles, et chacune a sa
     raison écrite dans la feuille :

       #FDFBF0  le papier du **jeu**, peint dans le canvas. Les vignettes
                d'objet le portent pour que le dessin se lise, en sombre
                comme en clair — invariant du 16/09.
       #B8431E  le corail **écrit** sur ce papier-là, mesuré à 5,24. Le
                corail de la planche y rendrait 2,3.
       #CBD5DC  le damier de la gomme, signe universel du « rien ».
       #2A4956  le fond d'une plaque coupée, et
       #C6DDE2  son texte : ils ne suivent pas le thème parce que la plaque
                est posée sur le canvas.
       #25D366  le vert de WhatsApp, et ses deux variantes. Ce n'est pas
       #1FB855  notre couleur : c'est la leur, et un bouton WhatsApp qui
       #06331B  ne serait pas vert n'est pas reconnu.
       #FFFEF8  la carte claire et
       #F6EBD5  le creux clair : deux nuances du crème que la planche ne
       #4E6E78  nomme pas, plus l'encre sourde, le creux sombre et la
       #081A21  ligne sombre. Elles sont **dans le bloc des jetons**, donc
       #24657A  déclarées une fois — elles n'apparaissent pas ici.
       #C6DDE2 */
  const TOLERES = new Set(['#FDFBF0', '#B8431E', '#CBD5DC', '#2A4956', '#C6DDE2',
                           '#25D366', '#1FB855', '#06331B', '#FFF']);
  // Les commentaires citent des couleurs pour les expliquer : les retirer,
  // sinon le contrôle s'accuse de sa propre documentation.
  const sansNotes = regles.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const trouvees = (sansNotes.match(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g) || [])
    .map(x => x.toUpperCase());
  const hors = [...new Set(trouvees)].filter(x => !TOLERES.has(x));
  console.log('     couleurs en dur dans les règles : ' + trouvees.length +
              ' occurrences, ' + new Set(trouvees).size + ' distinctes');
  if (hors.length) console.log('     hors planche : ' + hors.join(' · '));
  c.dit(trouvees.length > 0, 'le contrôle voit bien des couleurs (sinon il ne mesure rien)');
  c.dit(hors.length === 0, 'aucune couleur en dur hors de la liste tolérée');

  // L'autre feuille. Deux feuilles, une seule planche : si une couleur
  // change dans index.html, elle doit changer dans les pages publiques.
  const commun = lire('functions/_commun.js');
  const manquent = Object.entries(PLANCHE)
    .filter(([n, h]) => commun.indexOf('--' + n + ':' + h) < 0).map(([n]) => n);
  c.dit(manquent.length === 0,
        'functions/_commun.js porte les mêmes sept couleurs' +
        (manquent.length ? ' (manquent : ' + manquent.join(', ') + ')' : ''));
}

c.titre('2. ce qui s’écrit reste lisible — demandé au navigateur');
{
  /* On ne lit pas la feuille : on ouvre la page, on prend de **vrais**
     éléments, et on demande au navigateur la couleur qu'il a calculée.
     Lui seul connaît la cascade, les media queries et les `var()`
     imbriquées. C'est aussi le seul moyen d'éprouver le thème sombre sans
     recopier ses valeurs ici — les recopier ne prouverait que ma
     constance, comme les deux listes de genres du 19/09. */
  const mesure = async (theme) => {
    const { ctx, page } = await onglet(nav, { taille: { width: 1280, height: 900 }, theme });
    await page.goto(s.url, { waitUntil: 'load' });
    await attendre(2200);
    const r = await page.evaluate(() => {
      const L = (r, g, b) => {
        const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const rgb = s => (s.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
      // Le fond réel d'un élément : on remonte tant qu'il est transparent.
      const fond = el => {
        for (let n = el; n; n = n.parentElement) {
          const b = getComputedStyle(n).backgroundColor;
          if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return rgb(b);
        }
        return [255, 255, 255];
      };
      const K = el => {
        if (!el) return null;
        const a = L(...rgb(getComputedStyle(el).color)), b = L(...fond(el));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const $ = q => document.querySelector(q);
      // On arme une puce pour mesurer l'état « choisi », qui est le piège
      // historique de ce dépôt : en sombre, `--navy` **est** la couleur des
      // cartes, et un chip sélectionné y devenait invisible.
      const puce = [...document.querySelectorAll('#p-toi .chip')]
        .find(x => x.getAttribute('aria-pressed') === 'true');
      return {
        corps: K(document.body),
        titre: K($('.tagline-h1 .grand')),
        sous: K($('.tagline-h1 .petit')),
        tagline: K($('.tagline')),
        etiquette: K($('#p-toi .lab')),
        puceChoisie: K(puce),
        onglet: K($('.tabs button[aria-selected="true"]')),
        ongletAutre: K($('.tabs button[aria-selected="false"]')),
        bouton: K($('.accueil .btn.primary')),
        devise: K($('.word .devise')),
        pastille: K($('.socle i')),
      };
    });
    await ctx.close();
    return r;
  };

  // Le seuil : 4,5 pour du texte courant, 3 pour ce qui est gros ou gras et
  // gros. Le titre et le bouton d'accueil sont au-delà de 24 px, donc 3
  // suffirait — on leur demande quand même 4,5, parce qu'ils l'atteignent
  // et qu'un seuil qu'on peut tenir se tient.
  const SEUILS = { corps: 4.5, titre: 4.5, sous: 4.5, tagline: 4.5, etiquette: 4.5,
                   puceChoisie: 4.5, onglet: 4.5, ongletAutre: 4.5, bouton: 4.5,
                   devise: 4.5, pastille: 4.5 };
  for (const theme of ['light', 'dark']) {
    const r = await mesure(theme);
    console.log('     — thème ' + theme + ' —');
    for (const [quoi, seuil] of Object.entries(SEUILS)) {
      const k = r[quoi];
      if (k == null) { c.dit(false, theme + ' : « ' + quoi + ' » est introuvable dans la page'); continue; }
      console.log('       ' + quoi.padEnd(13) + k.toFixed(2));
      c.dit(k >= seuil, theme + ' : « ' + quoi + ' » à ' + k.toFixed(2) + ' (seuil ' + seuil + ')');
    }
  }
}

c.titre('3. le voile garde ses trois déclarations d’accord');
{
  /* Invariant écrit le 19/09 et jamais mesuré : « les trois déclarations
     doivent rester d'accord — la claire, celle du `@media dark` et celle de
     `[data-theme=dark]` ». Ce sont les **alphas** qui s'accordent, jamais
     les couleurs : l'une est crème, les deux autres sont océan. Un contrôle
     mal posé accuse à tort aussi facilement qu'il absout à tort, et
     celui-là a déjà été écrit de travers une fois. */
  const src = lire('index.html');
  /* Le motif prend la déclaration **entière**, jusqu'au point-virgule ou
     à l'accolade. La première version s'arrêtait au premier « ), rgba( »
     rencontré, donc elle ne lisait qu'un arrêt sur trois et concluait que
     les trois déclarations s'accordaient — sur un tiers de ce qu'elles
     disent. Un contrôle qui ne lit pas tout ce qu'il prétend lire absout
     à tort : c'est la leçon des trois prénoms au lieu de vingt. */
  const decl = [...src.matchAll(/radial-gradient\(58% 60% at 50% 50%,([^;}]*)/g)];
  console.log('     déclarations trouvées : ' + decl.length);
  c.dit(decl.length === 3, 'les trois déclarations du voile sont là (' + decl.length + ')');
  const alphas = decl.map(m =>
    [...m[1].matchAll(/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*(\.?\d+(?:\.\d+)?)\)/g)]
      .map(x => x[1]).join('/'));
  alphas.forEach(a => console.log('       ' + a));
  c.dit(new Set(alphas).size === 1, 'et elles portent exactement les mêmes alphas');
  c.dit(alphas[0].split('/').length === 4,
        'chacune a bien ses trois arrêts et sa couche plate (' + alphas[0] + ')');
}

c.titre('4. les icônes sont celles du logo, pas celles d’hier');
{
  /* « Les icônes se régénèrent, elles ne se dessinent pas à la main. Elles
     sont le SVG du logo de index.html relu en repère 64 et rasterisé. »
     C'était une consigne, donc quelque chose que personne ne relit — et le
     logo a changé le 20/09. Le contrôle rasterise le logo **tel qu'il est
     dans la source**, et compare au PNG du dépôt, pixel par pixel sur une
     grille. Aucune dépendance : c'est le navigateur qui décode les deux. */
  const src = lire('index.html');
  const m = src.match(/<svg class="mark" viewBox="0 0 64 64"[^>]*>([\s\S]*?)<\/svg>/);
  c.dit(!!m, 'le logo est trouvable dans index.html');

  const { ctx, page } = await onglet(nav, { taille: { width: 300, height: 300 } });
  await page.goto(s.url, { waitUntil: 'load' });
  const ICONES = ['/icone-192.png', '/icone-512.png', '/apple-touch-icon.png'];
  for (const f of ICONES) {
    const ecart = await page.evaluate(async ([dessin, fichier]) => {
      const T = 64;
      const peindre = source => new Promise((ok, ko) => {
        const i = new Image();
        i.onload = () => {
          const cv = document.createElement('canvas'); cv.width = cv.height = T;
          const g = cv.getContext('2d'); g.drawImage(i, 0, 0, T, T);
          ok(g.getImageData(0, 0, T, T).data);
        };
        i.onerror = () => ko(new Error('image ' + source.slice(0, 40)));
        i.src = source;
      });
      const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">' +
        dessin + '</svg>');
      const a = await peindre(svg), b = await peindre(fichier);
      let somme = 0, n = 0;
      for (let i = 0; i < a.length; i += 4) {
        // Le fond du PNG est transparent hors du carré arrondi, comme le
        // SVG : on ne compare que là où les deux peignent quelque chose.
        if (a[i + 3] < 200 || b[i + 3] < 200) continue;
        somme += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        n++;
      }
      return { ecart: n ? somme / (n * 3) : 999, points: n };
    }, [m[1], f]);
    console.log('     ' + f.padEnd(24) + 'écart moyen ' + ecart.ecart.toFixed(1) +
                '/255 sur ' + ecart.points + ' points');
    c.dit(ecart.points > 2000, f + ' : assez de points comparés (' + ecart.points + ')');
    // Le seuil est large : deux rasterisations d'un même SVG à deux
    // tailles différentes ne donnent pas les mêmes pixels au bord des
    // courbes. Ce qu'on attrape, c'est une icône d'un **autre** dessin —
    // l'ancien logo rendait 48 de moyenne, mesuré en le remettant.
    c.dit(ecart.ecart < 14, f + ' : c’est bien le logo d’aujourd’hui (' + ecart.ecart.toFixed(1) + ')');
  }
  await ctx.close();
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
