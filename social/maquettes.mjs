/* Les maquettes des visuels Instagram — le module partagé.
 *
 * `directions.mjs` (les cinq visuels d'exploration) et `calendrier.mjs`
 * (les publications du mois) peignent les **mêmes** gabarits. Les
 * recopier dans les deux fichiers, c'est la faute que ce dépôt nomme
 * partout : deux listes qui doivent rester d'accord finissent par ne
 * plus l'être, et ici ça se verrait sur un compte public.
 *
 * Ce module ne fait rien tout seul : il rend une boîte à outils, cinq
 * maquettes et de quoi capturer le jeu. Ce sont les deux autres qui
 * décident quoi peindre.
 */
import { navigateur, servir, onglet, attendre, remplacer } from '../test/aide.mjs';
import fs from 'fs';

const L = 1080, H = 1350;

const ENCRE  = '#0D2630';   // Océan profond
const CREME  = '#FFF8E8';
const CORAIL = '#FF8F70';
const CORAIL_ECRIT = '#B8431E';
const LAGON  = '#72D6D0';

// Le HUD n'est pas l'île : plaques, zoom et murmure sont aux quatre coins
// du cadre, donc irrattrapables au recadrage.
const SANS_HUD = '.plate,.zoom,.whisper{display:none!important}';

const forcer = ({ saison = 'ete', meteo = 'beau' }) => src => {
  let s = src;
  s = remplacer(s, /function saison\(\)\{ return saisonDe\(jourDuJeu\(\)\); \}/,
                `function saison(){ return '${saison}'; }`);
  s = remplacer(s, /function meteoDe\(n\)\{[\s\S]*?\n\}/,
                `function meteoDe(n){ return '${meteo}'; }`);
  return s;
};

const ILE = [
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

/* ── La capture ────────────────────────────────────────────────────────
 *
 * `zoom` compte des clics sur le bouton « voir de plus près ». La
 * première série montrait une île minuscule au milieu de beaucoup d'eau :
 * à l'échelle d'une vignette de fil, ça se lit comme une maquette, pas
 * comme un monde. On s'approche. */
/* ── Montrer, pas dire ─────────────────────────────────────────────────
 *
 * Trois crochets, et ils existent tous les trois pour la même raison :
 * une carte qui **dit** « on peut entrer dans la maison » en montrant
 * l'île vue du dehors ne montre pas ce qu'elle promet. C'est la faute
 * déjà nommée pour les feuilles d'automne, et elle se reposait ici dans
 * la moitié du calendrier.
 *
 *   `dedans`   entre pour de vrai dans une pièce, et peint son intérieur
 *   `sousLesPieds` sème un objet **sur la case du bonhomme**
 *   `toucheE`  appuie sur E, donc déclenche le geste de cet objet-là
 *
 * La case du bonhomme est **(8,10)**, mesurée et pas déduite : il démarre
 * devant sa porte, pas au 9,5 ; 11,5 de la déclaration de `hero`, qui
 * n'est que le repli. C'est le chiffre qu'a établi `test/objets.mjs`, et
 * on le reprend plutôt que de le remesurer.
 *
 * Les deux ensemble donnent une vraie promenade du chien : on sème le
 * chien sous les pieds, on appuie sur E, la balade commence — et la
 * capture montre le bonhomme en train de le promener, pas une île avec
 * un chien posé dessus.
 */
const CASE_HERO = { x: 8, y: 10 };

/* ── Une maison meublée ────────────────────────────────────────────────
 *
 * Le premier essai entrait dans un salon **vide** : un plancher nu sous
 * une légende qui dit « trois pièces à décorer ». Ça ne montre rien à
 * décorer, et c'est exactement la faute que ces crochets existent pour
 * fermer — montrer, pas dire.
 *
 * `o` est le sens, `c` la couleur. Les meubles encombrants sont contre
 * les murs : `normaliserInterieur()` écarte en silence ce qui se
 * retrouverait dehors, donc un meuble mal placé disparaît sans rien
 * dire. Les tapis sont `plat` et passent sous le reste ; le vase est
 * `dessus` et se pose sur la table basse.
 */
export const MAISON = { v: 1, pieces: {
  salon: { sol: 'parquet', mur: 'creme', meubles: [
    { t: 'tapis', x: 2, y: 2, o: 'se', c: '#C9A87C' },
    { t: 'canape', x: 1, y: 1, o: 'se', c: '#4E8FA8' },
    { t: 'fauteuil', x: 4, y: 1, o: 'sw', c: '#E0836B' },
    { t: 'tablebasse', x: 3, y: 3, o: 'se', c: '#8B5E3C' },
    { t: 'vase', x: 3, y: 3, o: 'se', c: '#72D6D0' },
    { t: 'tele', x: 6, y: 2, o: 'sw', c: '#2A3340' },
    { t: 'plante', x: 6, y: 4, o: 'se', c: '#5FAF78' },
    { t: 'tableau', x: 0, y: 1, o: 'sw', c: '#F2A93B' },
    { t: 'tableau', x: 3, y: 0, o: 'se', c: '#F48CA8' },
    { t: 'poele', x: 0, y: 4, o: 'se', c: '#5B4636' },
    { t: 'horloge', x: 5, y: 0, o: 'se', c: '#8B5E3C' },
  ] },
  chambre: { sol: 'parquet', mur: 'rose', meubles: [
    { t: 'tapisrond', x: 3, y: 2, o: 'se', c: '#F4D7A1' },
    { t: 'lit', x: 1, y: 1, o: 'se', c: '#F48CA8' },
    { t: 'chevet', x: 3, y: 1, o: 'se', c: '#8B5E3C' },
    { t: 'lampadaire', x: 4, y: 3, o: 'se', c: '#F4D6A0' },
    { t: 'commode', x: 0, y: 3, o: 'se', c: '#A8703C' },
    { t: 'plante', x: 4, y: 0, o: 'se', c: '#5FAF78' },
    { t: 'guirlande', x: 2, y: 0, o: 'se', c: '#F2A93B' },
  ] },
  atelier: { sol: 'parquet', mur: 'bois', meubles: [
    { t: 'tapis', x: 2, y: 2, o: 'se', c: '#9BBFD6' },
    { t: 'bureau', x: 1, y: 1, o: 'se', c: '#8B5E3C' },
    { t: 'chaise', x: 1, y: 2, o: 'se', c: '#4E8FA8' },
    { t: 'bibliotheque', x: 4, y: 0, o: 'se', c: '#A8703C' },
    { t: 'etagere', x: 0, y: 3, o: 'se', c: '#C9A87C' },
    { t: 'malle', x: 4, y: 3, o: 'se', c: '#5B4636' },
    { t: 'piano', x: 2, y: 4, o: 'se', c: '#2A3340' },
    { t: 'tableau', x: 0, y: 1, o: 'sw', c: '#72D6D0' },
  ] },
} };

async function capturer(nav, port, { saison, meteo, ciel, zoom = 0, objets = ILE,
                                     mots, dedans, sousLesPieds, toucheE, attendreApres = 0, marcher }) {
  if (sousLesPieds) {
    objets = [...objets.filter(o => !(o.x === CASE_HERO.x && o.y === CASE_HERO.y)),
              { ...CASE_HERO, ...sousLesPieds }];
  }
  const s = await servir(port, forcer({ saison, meteo }));
  const memoire = {
    'dansisland:entre': '1', 'dansisland:guide': '4', 'dansisland:muet': '1',
    'test:objets': JSON.stringify(objets),
  };
  // Une maison meublée dès qu'on compte y entrer : un salon vide sous une
  // légende qui dit « trois pièces à décorer » ne montre rien à décorer.
  if (dedans) memoire['test:interieur'] = JSON.stringify(MAISON);
  // Des mots reçus : c'est ce qui fait grandir l'île, donc c'est ce qu'il
  // faut montrer quand on dit qu'elle grandit.
  if (mots) memoire['test:mots'] = JSON.stringify(mots);
  const { page: p, erreurs } = await onglet(nav, {
    taille: { width: 1280, height: 900 }, dpr: 2, memoire,
  });
  await p.goto(s.url, { waitUntil: 'load' });
  await attendre(2400);

  if (ciel) {
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
    }, ciel.slice(0, 4));
    // Un ciel non posé rend une carte qui ne montre pas ce qu'elle dit.
    if (!pose) throw new Error('ciel « ' + ciel + ' » non posé');
    await attendre(900);
  }

  /* Entrer dans la maison, **par l'interface**.
     `entrer(k)` vit dans la portée du module — la page est un module ES,
     donc elle n'est pas sur `window` et `p.evaluate` ne la voit pas.
     Mesuré, pas supposé : le premier essai levait « entrer() introuvable »
     et, c'est le point, il **levait** au lieu de capturer le dehors en
     silence sous une légende qui parle du dedans.
     On prend donc le bouton « 🚪 Entrer » du panneau Maison, en le faisant
     défiler sous la vue d'abord : cliquer un élément d'un panneau qui
     défile fait bouger la page, et le clic part à côté. Trois heures
     perdues là-dessus le 20/09. */
  if (dedans) {
    await p.evaluate(() => {
      const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'maison');
      if (b) b.click();
    });
    await attendre(600);
    const bouton = p.locator('#p-maison button', { hasText: 'Entrer' }).first();
    if (!await bouton.count()) throw new Error('bouton « Entrer » introuvable');
    await bouton.scrollIntoViewIfNeeded();
    await bouton.click();
    await attendre(1000);

    // On y est ? La plaque du nom devient « ← Ton île » dedans, et le
    // panneau Maison devient l'atelier des pièces. Une capture du dehors
    // sous une légende qui parle du dedans est exactement ce que ce
    // crochet existe pour empêcher.
    const dans = await p.evaluate(() =>
      /Ton île/.test(document.getElementById('hud-name')?.textContent || ''));
    if (!dans) throw new Error('le clic sur « Entrer » n’a pas pris');

    // La pièce voulue, si ce n'est pas le salon : les autres se prennent
    // par les puces de l'atelier du dedans.
    if (typeof dedans === 'string' && dedans !== 'salon') {
      const puce = p.locator('#p-maison .chip', { hasText: new RegExp(dedans, 'i') }).first();
      if (await puce.count()) {
        await puce.scrollIntoViewIfNeeded();
        await puce.click();
        await attendre(800);
      }
    }
  }

  if (toucheE) {
    await p.keyboard.press('e');
    await attendre(500);
  }

  /* Faire marcher le bonhomme. Sans ça, une balade capturée montre le
     chien parti au loin et le bonhomme planté devant sa porte : ça se lit
     « il y a un chien là-bas », pas « on promène son chien ». Le chien
     attend celui qui le suit — c'est la règle du jeu, et c'est elle qui
     rend la photo juste. */
  if (marcher) {
    for (const pas of [].concat(marcher)) {
      await p.keyboard.down(pas.touche);
      await attendre(pas.ms);
      await p.keyboard.up(pas.touche);
      await attendre(120);
    }
  }
  if (attendreApres) await attendre(attendreApres);

  for (let i = 0; i < zoom; i++) {
    await p.click('#zoom-plus');
    await attendre(420);
  }

  await p.addStyleTag({ content: SANS_HUD });
  await attendre(260);
  const png = await p.locator('#world').screenshot();
  const erreur = erreurs[0] || null;
  await p.context().close(); s.fermer();
  return { png, erreur };
}

/* ── La boîte à outils typographique ──────────────────────────────────
 *
 * Elle vit dans la page, parce que c'est le navigateur qui sait mesurer
 * du texte avec les polices du site. Chaque maquette la reçoit.
 */
const OUTILS = `
  const L = ${L}, H = ${H};
  const ENCRE='${ENCRE}', CREME='${CREME}', CORAIL='${CORAIL}',
        CORAIL_ECRIT='${CORAIL_ECRIT}', LAGON='${LAGON}';

  function img(b64){ return new Promise(r=>{ const i=new Image();
    i.onload=()=>r(i); i.src='data:image/png;base64,'+b64; }); }

  // La couleur de fond du cadre, lue dans le coin haut-droit : le seul
  // que ni le soleil ni la lune ne traversent. Médiane de neuf points.
  function fondDe(im){
    const m=document.createElement('canvas'); m.width=im.width; m.height=im.height;
    const mc=m.getContext('2d'); mc.drawImage(im,0,0);
    const e=[];
    for(let i=0;i<9;i++){
      const d=mc.getImageData(Math.round(im.width*(0.90+(i%3)*0.03)),
                              Math.round(im.height*(0.02+Math.floor(i/3)*0.015)),1,1).data;
      e.push([d[0],d[1],d[2]]);
    }
    const med=k=>e.map(x=>x[k]).sort((a,b)=>a-b)[4];
    const rgb=[med(0),med(1),med(2)];
    return { css:'rgb('+rgb.join(',')+')', rgb,
             clair:(0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2])/255 > 0.5 };
  }

  // Découpe le texte en lignes qui tiennent dans \`larg\`, et rend leur
  // hauteur totale : une maquette doit pouvoir se centrer sur le bloc
  // réel, pas sur le nombre de lignes qu'elle espérait.
  function lignes(c, txt, larg){
    const out=[]; let l='';
    for(const mot of txt.split(' ')){
      const essai = l ? l+' '+mot : mot;
      if(c.measureText(essai).width > larg && l){ out.push(l); l=mot; }
      else l=essai;
    }
    out.push(l); return out;
  }
  function bloc(c, txt, larg, x, y, interligne, align){
    c.textAlign = align || 'left';
    const ls = lignes(c, txt, larg);
    ls.forEach((l,i)=>c.fillText(l, x, y+i*interligne));
    return ls.length*interligne;
  }

  /* Remplit le rectangle (x,y,w,h) avec la zone \`z\` du cadre, sans
     jamais déformer : on choisit la découpe source dont le rapport est
     celui de la cible, et on la centre sur \`ax\`/\`ay\`.

     Les quatre premières maquettes calculaient chacune leur découpe à la
     main, avec des facteurs écrits en dur — c'est de là que venait le
     sous-titre de A posé sur la mer, et c'est le défaut nommé partout
     dans CLAUDE.md : la même idée écrite à trois endroits finit par
     diverger. Une île écrasée se verrait tout de suite ; une île mal
     placée, non. */
  function poser(c, im, x, y, w, h, o){
    o = o || {};
    const z  = o.zone || [0,0,1,1];
    const ax = o.ax===undefined ? 0.5 : o.ax;
    const ay = o.ay===undefined ? 0.5 : o.ay;
    const zx = im.width*z[0], zy = im.height*z[1];
    const zw = im.width*(z[2]-z[0]), zh = im.height*(z[3]-z[1]);
    let sw = zw, sh = zw*h/w;
    if(sh > zh){ sh = zh; sw = zh*w/h; }
    c.drawImage(im, zx+(zw-sw)*ax, zy+(zh-sh)*ay, sw, sh, x, y, w, h);
  }

  /* ── La signature ───────────────────────────────────────────────────
   *
   * **Elle lit ce qu'il y a derrière elle, pas ce qu'il y avait dans le
   * coin du cadre.** Les quatre premières maquettes décidaient l'encre
   * d'après la couleur du ciel en haut à droite, puis écrivaient
   * l'adresse tout en bas, sur l'île — donc du crème sur du sable, et
   * une adresse illisible sur quatre affiches sur cinq.
   *
   * C'est la faute que CLAUDE.md répète depuis le 19/09 : une mesure qui
   * ne vérifie pas qu'elle regarde la bonne chose passe au vert sans
   * rien voir. On échantillonne donc la bande réellement occupée par le
   * texte, une fois tout le reste peint, et on prend le contraste qui
   * gagne. Le halo tient le cas d'une bande à moitié claire — un fond
   * bariolé n'a pas de bonne encre, il a besoin d'un fond à lui. */
  function signer(c, y){
    const larg = 340, x0 = Math.round(L/2 - larg/2);
    const d = c.getImageData(x0, Math.round(y-26), larg, 38).data;
    let s=0, n=0;
    for(let i=0;i<d.length;i+=4*7){ s += 0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]; n++; }
    const clair = s/n/255 > 0.5;

    c.textAlign='center';
    c.font='500 30px "DM Mono", monospace';
    const w = c.measureText('dansisland.app').width;
    c.save();
    c.shadowColor = clair ? 'rgba(255,248,232,.95)' : 'rgba(13,38,48,.95)';
    c.shadowBlur = 16;
    c.fillStyle = CORAIL;
    c.beginPath(); c.arc(L/2 - w/2 - 26, y-10, 9, 0, 7); c.fill();
    c.fillStyle = clair ? ENCRE : CREME;
    c.fillText('dansisland.app', L/2 + 10, y);
    c.fillText('dansisland.app', L/2 + 10, y);   // deux passes : le halo porte
    c.restore();
  }
`;

/* ── Les cinq maquettes ────────────────────────────────────────────────
 *
 * Chacune est une fonction qui reçoit le contexte, l'image du cadre et
 * les mots. Elles ne partagent que la boîte à outils — une maquette qui
 * hériterait de la mise en page d'une autre ne serait plus une direction
 * séparée, et on ne saurait plus ce qu'on compare.
 */
const MAQUETTES = {

  /* A · LE CLAIM — la promesse en face.
   *
   * Le sur-titre répond à « pour qui » avant que le titre réponde à
   * « quoi » : un parent décide en une demi-seconde si ça le concerne. */
  claim: `async (c, im, t) => {
    const f = fondDe(im);
    c.fillStyle = f.css; c.fillRect(0,0,L,H);
    const encre = f.clair ? ENCRE : CREME;

    /* **L'image commence sous le texte, elle ne passe pas dessous.**
       La première version la posait à 452 et le sous-titre courait
       jusqu'à 600 : trois lignes de blanc sur de la mer bleue. Le bloc
       de texte se mesure maintenant avant, et l'image prend ce qui
       reste — donc allonger l'accroche ne peut plus la recouvrir. */
    const HAUT = 660;
    poser(c, im, 0, HAUT, L, H-HAUT, { zone:[0.05,0.06,0.98,0.86], ay:0.34 });

    const X = 84;
    c.fillStyle = f.clair ? CORAIL_ECRIT : CORAIL;
    c.font = '500 27px "DM Mono", monospace';
    c.textAlign = 'left';
    c.letterSpacing = '3px';
    c.fillText(t.sur, X, 150);
    c.letterSpacing = '0px';

    c.fillStyle = encre;
    c.font = '800 82px "Baloo 2", system-ui, sans-serif';
    const bas = bloc(c, t.titre, L-2*X, X, 242, 88);

    c.fillStyle = CORAIL;
    c.fillRect(X, 248+bas-44, 96, 7);

    c.fillStyle = encre;
    c.globalAlpha = .82;
    c.font = '600 35px "Nunito", system-ui, sans-serif';
    bloc(c, t.sous, L-2*X-40, X, 242+bas+40, 46);
    c.globalAlpha = 1;

    signer(c, H-52);
  }`,

  /* B · L'ABSENCE — ce que le jeu n'a pas.
   *
   * C'est l'accroche la plus forte pour un parent, parce qu'elle nomme
   * son angoisse au lieu de vanter une fonctionnalité. L'image passe
   * derrière un voile : ici le texte est le sujet, et une image trop
   * lisible sous une liste se bat avec elle. */
  absence: `async (c, im, t) => {
    const f = fondDe(im);
    c.fillStyle = f.css; c.fillRect(0,0,L,H);
    poser(c, im, 0, H-560, L, 560, { zone:[0.10,0.10,0.94,0.88], ay:0.30 });

    const voile = c.createLinearGradient(0,0,0,H);
    voile.addColorStop(0,   f.clair ? 'rgba(255,248,232,.97)' : 'rgba(13,38,48,.97)');
    voile.addColorStop(.58, f.clair ? 'rgba(255,248,232,.93)' : 'rgba(13,38,48,.93)');
    voile.addColorStop(1,   f.clair ? 'rgba(255,248,232,.34)' : 'rgba(13,38,48,.40)');
    c.fillStyle = voile; c.fillRect(0,0,L,H);
    const encre = f.clair ? ENCRE : CREME;

    c.textAlign='center';
    c.fillStyle = f.clair ? CORAIL_ECRIT : CORAIL;
    c.font = '500 26px "DM Mono", monospace';
    c.letterSpacing='3px'; c.fillText(t.sur, L/2, 128); c.letterSpacing='0px';

    // Chaque ligne barrée : le trait est corail, donc c'est lui qu'on
    // voit en premier, et la liste se lit comme un soulagement.
    /* **Toutes les barres ont la même longueur.** Taillées à la largeur
       de chaque mot, elles dessinaient un zigzag au milieu de la liste :
       l'œil suit le bord dentelé au lieu de lire. Une seule longueur,
       celle du plus long, et la liste redevient une liste. */
    c.font = '700 58px "Baloo 2", system-ui, sans-serif';
    const barre = Math.max(...t.rien.map(l=>c.measureText(l).width))/2 + 26;
    let y = 246;
    for(const ligne of t.rien){
      c.fillStyle = encre; c.globalAlpha=.78;
      c.fillText(ligne, L/2, y);
      c.globalAlpha=1; c.strokeStyle=CORAIL; c.lineWidth=6; c.lineCap='round';
      c.beginPath(); c.moveTo(L/2-barre, y-19); c.lineTo(L/2+barre, y-19); c.stroke();
      y += 86;
    }

    c.fillStyle = encre; c.globalAlpha=.24;
    c.fillRect(L/2-60, y+10, 120, 4); c.globalAlpha=1;

    c.fillStyle = encre;
    c.font = '800 62px "Baloo 2", system-ui, sans-serif';
    bloc(c, t.mais, L-150, L/2, y+118, 70, 'center');

    signer(c, H-56);
  }`,

  /* C · LA BOUCLE — tout le jeu en trois lignes.
   *
   * La seule des cinq qui explique. Elle vise le parent qui a compris
   * que c'est joli mais pas ce qu'on y fait — et la boucle du jeu est
   * justement son meilleur argument : on progresse en invitant. */
  boucle: `async (c, im3, t) => {
    const f = fondDe(im3[0]);
    c.fillStyle = f.clair ? CREME : ENCRE; c.fillRect(0,0,L,H);
    const encre = f.clair ? ENCRE : CREME;

    c.textAlign='center';
    c.fillStyle = f.clair ? CORAIL_ECRIT : CORAIL;
    c.font='500 26px "DM Mono", monospace';
    c.letterSpacing='3px'; c.fillText(t.sur, L/2, 92); c.letterSpacing='0px';
    c.fillStyle = encre;
    c.font='800 68px "Baloo 2", system-ui, sans-serif';
    c.fillText(t.titre, L/2, 172);

    // Trois rangées : une vignette carrée prise au centre du cadre, le
    // numéro en corail, la phrase à droite.
    const TY=252, RH=352, VIG=250;
    t.pas.forEach((p,i)=>{
      const y = TY + i*RH;
      const im = im3[i];
      c.save();
      c.beginPath(); c.roundRect(64, y, VIG, VIG, 26); c.clip();
      poser(c, im, 64, y, VIG, VIG, { zone:[0.14,0.04,0.86,0.92], ay:0.46 });
      c.restore();

      c.textAlign='left';
      c.fillStyle = CORAIL;
      c.font='800 46px "Baloo 2", system-ui, sans-serif';
      c.fillText(String(i+1), 352, y+58);
      c.fillStyle = encre;
      c.font='700 42px "Baloo 2", system-ui, sans-serif';
      const n = bloc(c, p.quoi, L-352-70, 352, y+120, 50);
      c.globalAlpha=.72;
      c.font='600 30px "Nunito", system-ui, sans-serif';
      bloc(c, p.pourquoi, L-352-70, 352, y+120+n+14, 38);
      c.globalAlpha=1;
    });

    signer(c, H-52);
  }`,

  /* D · LA SOURCE — pour le parent qui arbitre.
   *
   * **La citation n'affirme rien sur ce jeu-ci**, et c'est ce qui la
   * rend publiable : elle rapporte ce qu'une étude a mesuré, avec ses
   * auteurs, sa revue, son année et son effectif, puis le jeu se place
   * à côté. Déformer une étude sur une affiche destinée à des parents
   * serait pire que ne pas en citer. */
  source: `async (c, im, t) => {
    const f = fondDe(im);
    c.fillStyle = f.clair ? CREME : ENCRE; c.fillRect(0,0,L,H);
    const encre = f.clair ? ENCRE : CREME;

    // Une bande d'île en bas, coupée : elle signe la marque sans
    // disputer la place au texte, qui est le sujet.
    const hb = 392;
    c.save(); c.beginPath(); c.rect(0,H-hb,L,hb); c.clip();
    poser(c, im, 0, H-hb, L, hb, { zone:[0.12,0.12,0.92,0.86], ay:0.34 });
    c.restore();
    const fondu = c.createLinearGradient(0,H-hb,0,H-hb+150);
    fondu.addColorStop(0, f.clair ? CREME : ENCRE);
    fondu.addColorStop(1, f.clair ? 'rgba(255,248,232,0)' : 'rgba(13,38,48,0)');
    c.fillStyle=fondu; c.fillRect(0,H-hb,L,150);

    const X=80;
    c.textAlign='left';
    c.fillStyle = f.clair ? CORAIL_ECRIT : CORAIL;
    c.font='500 26px "DM Mono", monospace';
    c.letterSpacing='3px'; c.fillText(t.sur, X, 118); c.letterSpacing='0px';

    c.fillStyle=CORAIL; c.fillRect(X, 158, 7, 232);

    c.fillStyle=encre;
    c.font='700 50px "Baloo 2", system-ui, sans-serif';
    const n = bloc(c, t.citation, L-X-46-X, X+34, 214, 60);

    c.globalAlpha=.66;
    c.font='500 24px "DM Mono", monospace';
    bloc(c, t.dit, L-2*X, X+34, 214+n+26, 34);
    c.globalAlpha=1;

    c.fillStyle=encre;
    c.font='800 58px "Baloo 2", system-ui, sans-serif';
    bloc(c, t.donc, L-2*X, X, 700, 66);

    signer(c, H-52);
  }`,

  /* E · LE DÉTAIL — presque pas de texte.
   *
   * Le cercle large du plan : ceux qui suivent des comptes de pixel art
   * et de cosy games. Ils donnent des likes et peu de joueurs, mais ils
   * donnent de la portée — et cette direction ne coûte rien, puisque
   * c'est le jeu tel quel. */
  detail: `async (c, im, t) => {
    const f = fondDe(im);
    c.fillStyle = f.css; c.fillRect(0,0,L,H);
    /* Plein cadre, recadré sur l'île : on perd les flancs de la mer, et
       c'est exactement ce qu'on veut perdre.

       **Sauf qu'un intérieur ne se recadre pas comme une île.** La pièce
       est déjà une composition serrée et centrée dans le cadre : lui
       appliquer le recadrage de l'île coupait le bonhomme en deux sur le
       bord gauche. Le champ "cadre" de la publication laisse donc chacune
       dire sa zone, plutôt que d'ajouter une sixième maquette qui ne
       différerait que par quatre nombres.

       (Aucun accent grave dans ce commentaire : les maquettes SONT des
       littéraux de gabarit, donc une apostrophe inversée y ferme la
       chaîne et le module ne se charge plus. Troisième fois cette nuit
       que ce piège se referme — il est écrit dans CLAUDE.md depuis le
       20/09 pour functions/_commun.js, et il vaut ici mot pour mot.) */
    poser(c, im, 0, 0, L, H, { zone: t.cadre || [0.08,0.00,0.94,1.00],
                               ay: t.ay === undefined ? 0.42 : t.ay });

    const bas = c.createLinearGradient(0,H-300,0,H);
    bas.addColorStop(0,'rgba(13,38,48,0)'); bas.addColorStop(1,'rgba(13,38,48,.72)');
    c.fillStyle=bas; c.fillRect(0,H-300,L,300);

    c.textAlign='center'; c.fillStyle=CREME;
    c.font='700 44px "Baloo 2", system-ui, sans-serif';
    c.fillText(t.mot, L/2, H-116);
    signer(c, H-56);
  }`,
};

/* ── Les cinq cartes ───────────────────────────────────────────────── */
export { L, H, ENCRE, CREME, CORAIL, CORAIL_ECRIT, LAGON, SANS_HUD,
         forcer, ILE, capturer, OUTILS, MAQUETTES, composer };

/* ── La composition ───────────────────────────────────────────────────
 *
 * Les outils et la maquette partent comme **sources**, et la page les
 * assemble en une seule fonction : la maquette appelle `fondDe()`,
 * `poser()`, `bloc()` et `signer()` par leur nom, comme si elles étaient
 * dans le même fichier. Passer la maquette déjà compilée n'est pas
 * possible — une fonction ne traverse pas la frontière du navigateur.
 */
async function composer(nav, { pngs, maquette, mots, multi, dest }) {
  const p = await nav.newPage({ viewport: { width: L, height: H }, deviceScaleFactor: 1 });
  await p.setContent(`<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@600;700&family=DM+Mono:wght@500&display=swap">
<style>html,body{margin:0;background:#222}canvas{display:block}</style>
<canvas id="c" width="${L}" height="${H}"></canvas>`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);

  await p.evaluate(async ({ b64s, mots, outils, maquette, multi }) => {
    const peindre = new Function(outils + '\n; return (' + maquette + ');')();
    const ims = [];
    for (const b of b64s) {
      ims.push(await new Promise(r => {
        const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b;
      }));
    }
    const c = document.getElementById('c').getContext('2d');
    await peindre(c, multi ? ims : ims[0], mots);
  }, { b64s: pngs, mots, outils: OUTILS, maquette: MAQUETTES[maquette], multi: !!multi });

  const jpg = await p.evaluate(() =>
    document.getElementById('c').toDataURL('image/jpeg', 0.93).split(',')[1]);
  fs.writeFileSync(dest, Buffer.from(jpg, 'base64'));
  await p.close();
  return fs.statSync(dest).size;
}
