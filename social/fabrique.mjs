/* La fabrique d'images Instagram.
 *
 *   node fabrique.mjs            → les cartes 4:5 + les cadres bruts
 *   node fabrique.mjs --brut     → seulement les cadres, pour régler le cadrage
 *
 * Elle ne dépend de rien d'autre que du harnais : Playwright est déjà une
 * dépendance de `test/`, et la composition se fait dans un canvas de
 * navigateur — donc **aucune dépendance de plus dans ce dépôt**, qui est
 * l'invariant tenu depuis le début.
 *
 * Le principe est celui du harnais : on sert une copie d'`index.html` dont
 * la saison et la météo sont forcées, on sème une île, on capture `#world`.
 *
 * `build.sh` copie une liste explicite de fichiers dans `dist/` : ce
 * dossier n'en fait pas partie et n'a pas à y entrer. Les images sont
 * servies par `raw.githubusercontent.com` — le dépôt est public, et
 * l'API Instagram va chercher l'image à une URL publique. **Rien de tout
 * ceci ne touche donc à l'empreinte du déploiement.**
 *
 * ── Ce que cette fabrique ne peut pas vérifier ──────────────────────
 *
 * **Que la légende décrive ce que l'image montre.** Mesuré : l'automne
 * ne change la clarté du sol que de 182 à 180, et ce sont les feuilles
 * qui le disent — or elles tombent, donc une image fixe en attrape deux
 * ou trois. Une carte titrée « en octobre, les feuilles tombent » peut
 * très bien n'en montrer aucune, et c'est exactement la faute nommée
 * dans CLAUDE.md pour les phrases de saison : promettre un détail qu'on
 * ne peint pas, c'est envoyer quelqu'un le chercher.
 *
 * La fabrique ne sait pas juger ça. **Chaque carte se regarde avant de
 * partir**, comme les six bâtiments et le lit : c'est la limite déjà
 * écrite pour le son et pour les deux relevés de genres. Une saison qui
 * ne se lit pas sur une image fixe se raconte en carrousel de quatre,
 * où c'est l'écart entre les cases qui parle.
 */
import { navigateur, servir, onglet, attendre, remplacer } from '../test/aide.mjs';
import fs from 'fs';

const OUT = new URL('./images/', import.meta.url).pathname;
fs.mkdirSync(OUT + '/brut', { recursive: true });
fs.mkdirSync(OUT + '/carte', { recursive: true });

const BRUT_SEUL = process.argv.includes('--brut');

/* ── Le cadrage ────────────────────────────────────────────────────────
 *
 * Le cadre du jeu fait 768x500, soit 1,536:1 — un paysage. Instagram veut
 * du 4:5, soit 0,8 — un portrait. Découper un 4:5 *dans* le cadre ne
 * garderait qu'une tranche verticale de l'île : c'est le raisonnement déjà
 * écrit pour le tirage de l'appareil photo, et la conclusion est la même.
 * **On ne recadre pas l'île, on la monte.**
 *
 * Ce qu'on retire est du papier et de l'eau, jamais de la terre : à ZMIN
 * la tache de mer occupe 96 % de la largeur du cadre et laisse une
 * soixantaine de pixels de papier en haut et en bas. `MARGE` dit ce qu'on
 * coupe de chaque côté, en fraction du cadre — à régler en regardant les
 * captures brutes, pas en le déduisant. */
const L = 1080, H = 1350;              // 4:5, la taille native du fil

/* Mesuré sur une capture, pas déduit : la tache de mer occupe
 * x ∈ [0,08 ; 0,96] et y ∈ [0,10 ; 0,84] du cadre. Ce qu'on coupe est du
 * papier de coin, jamais de la terre. Et la tache n'est **pas centrée**
 * verticalement — son milieu tombe à 0,47, pas à 0,50 — donc un rognage
 * symétrique laisserait l'île haute dans sa bande. */
const GARDE = { x0: 0.045, x1: 0.985, y0: 0.055, y1: 0.885 };

const ENCRE  = '#0D2630';              // Océan profond
const CORAIL = '#FF8F70';

/* Le HUD n'est pas l'île. Les plaques, la colonne de zoom et le murmure
 * sont l'habillage d'un jeu dans un navigateur : sur une carte, ils
 * disent « capture d'écran » au lieu de « endroit ». On les cache avant
 * la capture, on ne les recadre pas — ils sont aux quatre coins. */
const SANS_HUD = '.plate,.zoom,.whisper{display:none!important}';

/* ── Les recettes ──────────────────────────────────────────────────────
 *
 * Une recette = un état du monde + une île. Tout est forcé : sans ça le
 * rendu dépend du jour et de l'heure où on lance la fabrique, et c'est
 * exactement ce que `NEUTRE` empêche dans `vivant.mjs`. Une image qui
 * change selon le calendrier n'est pas une image, c'est un tirage. */
const forcer = ({ saison = 'ete', meteo = 'beau' }) => src => {
  let s = src;
  s = remplacer(s, /function saison\(\)\{ return saisonDe\(jourDuJeu\(\)\); \}/,
                `function saison(){ return '${saison}'; }`);
  s = remplacer(s, /function meteoDe\(n\)\{[\s\S]*?\n\}/,
                `function meteoDe(n){ return '${meteo}'; }`);
  return s;
};

// Une île garnie, pour que chaque capture ait quelque chose à montrer.
const ILE_RICHE = [
  { t: 'palmier', x: 6, y: 7, c: '#2E7D5B' }, { t: 'arbre', x: 12, y: 8, c: '#2E7D5B' },
  { t: 'sapin', x: 5, y: 12, c: '#2E7D6B' }, { t: 'fleur', x: 10, y: 6, c: '#F48CA8' },
  { t: 'phare', x: 4, y: 9, c: '#FDFBF2' }, { t: 'moulin', x: 13, y: 12, c: '#FDFBF2' },
  { t: 'ecole', x: 7, y: 4, c: '#F4D7A1' }, { t: 'restaurant', x: 11, y: 13, c: '#FF8F70' },
  { t: 'potager', x: 9, y: 9, c: '#4E9B5E' }, { t: 'coffre', x: 12, y: 10, c: '#8B5E3C' },
  { t: 'dalle', x: 8, y: 11, c: '#72D6D0' }, { t: 'dalle', x: 9, y: 11, c: '#72D6D0' },
  { t: 'dalle', x: 10, y: 11, c: '#72D6D0' },
  { t: 'girouette', x: 6, y: 9, c: '#8F98A6' }, { t: 'carillon', x: 13, y: 6, c: '#F2A93B' },
  { t: 'banc', x: 7, y: 13, c: '#8B5E3C' }, { t: 'lampe', x: 11, y: 4, c: '#F4D6A0' },
];

const RECETTES = [
  { k: '01-crepuscule-phare', saison: 'ete',       meteo: 'beau',   ciel: 'crépuscule',
    titre: 'Il n’y a rien à finir.' },
  { k: '02-nuit-constellations', saison: 'ete',    meteo: 'beau',   ciel: 'nuit',
    titre: 'Le phare balaie la mer.' },
  { k: '03-hiver',            saison: 'hiver',     meteo: 'beau',   ciel: null,
    titre: 'L’île suit le vrai calendrier.' },
  { k: '04-automne',          saison: 'automne',   meteo: 'beau',   ciel: null,
    titre: 'En octobre, les feuilles tombent.' },
  { k: '05-printemps',        saison: 'printemps', meteo: 'beau',   ciel: null,
    titre: 'Au printemps, des pétales.' },
  { k: '06-pluie',            saison: 'ete',       meteo: 'pluie',  ciel: null,
    titre: 'Il pleut sur l’île.' },
  { k: '07-brume',            saison: 'ete',       meteo: 'brume',  ciel: null,
    titre: 'La brume délave tout.' },
  { k: '08-nuages',           saison: 'ete',       meteo: 'nuages', ciel: null,
    titre: 'Le temps est le même pour tout l’archipel.' },
];

/* ── La composition ────────────────────────────────────────────────────
 *
 * Dans un canvas de navigateur, parce que c'est ce qui sait déjà peindre
 * du texte avec les polices du site. Les deux bandes se **déduisent** du
 * rapport voulu — des hauteurs écrites en dur seraient fausses le jour où
 * le cadrage change. C'est la règle déjà tenue pour le tirage 4:5. */
async function composer(nav, brut, titre, dest) {
  const p = await nav.newPage({ viewport: { width: L, height: H }, deviceScaleFactor: 1 });
  await p.setContent(`<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=DM+Mono:wght@500&display=swap">
<style>html,body{margin:0;background:#222}canvas{display:block}</style>
<canvas id="c" width="${L}" height="${H}"></canvas>`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);

  await p.evaluate(async ({ b64, titre, L, H, GARDE, ENCRE, CORAIL }) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });

    const sx = img.width * GARDE.x0, sy = img.height * GARDE.y0;
    const sw = img.width * (GARDE.x1 - GARDE.x0);
    const sh = img.height * (GARDE.y1 - GARDE.y0);
    const h = Math.round(L * sh / sw);          // l'image occupe toute la largeur

    /* **Le fond des bandes est celui du cadre, jamais le crème de la
     * planche.** Le ciel de l'île change avec l'heure — crème le jour,
     * rose au crépuscule, bleu nuit la nuit — et une bande crème posée
     * sous un cadre rose fait une couture horizontale en travers de
     * l'image. On lit donc la couleur dans un coin du cadre, après que
     * le HUD a été caché : c'est du papier, pas une plaque.
     *
     * Le coin haut-gauche porte le soleil ou la lune selon l'heure. On
     * prend le coin **haut-droit**, le seul que rien ne traverse — la
     * mouette et le nuage passent, mais pas à l'instant de la capture,
     * et c'est la médiane de neuf points qui tranche. */
    const m = document.createElement('canvas');
    m.width = img.width; m.height = img.height;
    m.getContext('2d').drawImage(img, 0, 0);
    const mc = m.getContext('2d');
    const ech = [];
    for (let i = 0; i < 9; i++) {
      const px = mc.getImageData(Math.round(img.width * (0.90 + (i % 3) * 0.03)),
                                 Math.round(img.height * (0.02 + Math.floor(i / 3) * 0.015)), 1, 1).data;
      ech.push([px[0], px[1], px[2]]);
    }
    const med = k => ech.map(e => e[k]).sort((a, b) => a - b)[4];
    const fond = `rgb(${med(0)},${med(1)},${med(2)})`;

    const c = document.getElementById('c').getContext('2d');
    c.fillStyle = fond; c.fillRect(0, 0, L, H);

    // Les deux bandes se déduisent du reste, 58 % au-dessus : le titre
    // prend deux lignes, la signature une seule.
    const reste = H - h;
    const haut = Math.round(reste * 0.58);
    c.drawImage(img, sx, sy, sw, sh, 0, haut, L, h);

    // Le titre. L'encre est l'océan profond sur un fond clair, le crème
    // sur un fond sombre : la nuit, un titre bleu nuit sur ciel bleu
    // nuit n'existe pas. Le seuil est la luminance perçue.
    const lum = (0.2126 * med(0) + 0.7152 * med(1) + 0.0722 * med(2)) / 255;
    c.fillStyle = lum > 0.5 ? ENCRE : '#FFF8E8';
    c.textAlign = 'center';
    c.font = '800 58px "Baloo 2", system-ui, sans-serif';
    const lignes = []; let ligne = '';
    for (const mot of titre.split(' ')) {
      const essai = ligne ? ligne + ' ' + mot : mot;
      if (c.measureText(essai).width > L - 170 && ligne) { lignes.push(ligne); ligne = mot; }
      else ligne = essai;
    }
    lignes.push(ligne);
    const y0 = haut / 2 - (lignes.length - 1) * 34 + 14;
    lignes.forEach((l, i) => c.fillText(l, L / 2, y0 + i * 68));

    // La signature. Le point corail est le logo réduit à ce qu'il a de
    // reconnaissable à cette taille.
    const yb = haut + h + (H - haut - h) / 2;
    c.font = '500 32px "DM Mono", monospace';
    const larg = c.measureText('dansisland.app').width;
    c.fillStyle = CORAIL;
    c.beginPath(); c.arc(L / 2 - larg / 2 - 26, yb - 9, 9, 0, 7); c.fill();
    c.fillStyle = lum > 0.5 ? ENCRE : '#FFF8E8';
    c.fillText('dansisland.app', L / 2 + 10, yb + 2);
  }, { b64: brut.toString('base64'), titre, L, H, GARDE, ENCRE, CORAIL });

  const jpg = await p.evaluate(() =>
    document.getElementById('c').toDataURL('image/jpeg', 0.92).split(',')[1]);
  fs.writeFileSync(dest, Buffer.from(jpg, 'base64'));
  await p.close();
}

// ── La boucle ─────────────────────────────────────────────────────────
const nav = await navigateur();
let port = 4820;

for (const r of RECETTES) {
  const s = await servir(port++, forcer(r));
  const { page: p, erreurs } = await onglet(nav, {
    taille: { width: 1280, height: 900 }, dpr: 2,
    memoire: {
      'dansisland:entre': '1', 'dansisland:guide': '4', 'dansisland:muet': '1',
      'test:objets': JSON.stringify(ILE_RICHE),
    },
  });
  await p.goto(s.url, { waitUntil: 'load' });
  await attendre(2400);

  if (r.ciel) {
    await p.evaluate(() => {
      const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'ile');
      if (b) b.click();
    });
    await attendre(500);
    const pose = await p.evaluate(k => {
      const f = [...document.querySelectorAll('.field')].find(x => /^Heure/.test(x.textContent));
      const c = f && [...f.querySelectorAll('.chip')].find(x => x.textContent.trim().toLowerCase().startsWith(k));
      if (c) { c.click(); return true; }
      return false;
    }, r.ciel.slice(0, 4));
    if (!pose) console.log('  ⚠ ciel « ' + r.ciel + ' » non posé — la capture ne montre pas ce qu’elle dit');
    await attendre(1000);
  }

  await p.addStyleTag({ content: SANS_HUD });
  await attendre(250);
  const brut = await p.locator('#world').screenshot();
  fs.writeFileSync(`${OUT}/brut/${r.k}.png`, brut);
  if (!BRUT_SEUL) await composer(nav, brut, r.titre, `${OUT}/carte/${r.k}.jpg`);

  const ko = fs.statSync(`${OUT}/${BRUT_SEUL ? 'brut/' + r.k + '.png' : 'carte/' + r.k + '.jpg'}`).size / 1024;
  console.log(`  ${r.k}  ${ko.toFixed(0)} ko` + (erreurs.length ? `  ⚠ ${erreurs.length} erreur(s) : ${erreurs[0].slice(0, 80)}` : ''));

  await p.context().close(); s.fermer();
}

await nav.close();
console.log('\n' + OUT);
