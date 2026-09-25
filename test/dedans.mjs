/* L'intérieur de la maison : ce qu'on voit en entrant, et ce qu'on lit.

   Deux défauts trouvés le 19/09 en y entrant pour de bon, plutôt qu'en
   relisant le code :

     la pièce ne remplissait pas le cadre    51 % de large en chambre
     « Te voilà dans **le** chambre »        quatre phrases, trois genres

   Le premier ne se voyait pas à la lecture : `fitDedans()` existait et
   avait l'air branché. Il l'était — en **plafond**, jamais en zoom visé.
   Le second ne se voyait pas non plus : chaque phrase, prise seule, est du
   français correct ; c'est la composition avec un nom variable qui est
   fausse. Les deux se voient à l'écran en une seconde. */
import { navigateur, servir, onglet, compteur, attendre } from './aide.mjs';
import { readFileSync } from 'fs';

const s = await servir(8156);
const nav = await navigateur();
const c = compteur();

const VIDE = { sol: 'parquet', mur: 'creme', meubles: [] };
const MAISON = { v: 1, pieces: { salon: VIDE, chambre: { ...VIDE, mur: 'rose' },
                                 atelier: { ...VIDE, mur: 'bois' } } };

const entrer = async (taille, tactile) => {
  const o = await onglet(nav, {
    taille, tactile,
    memoire: {
      'test:interieur': JSON.stringify(MAISON), 'test:mots': '[]',
      'dansisland:entre': '1', 'dansisland:muet': '1',
      'dansisland:tourne': '1', 'dansisland:guide': '1',
    },
  });
  await o.page.goto(s.url, { waitUntil: 'load' });
  await attendre(2400);
  await o.page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'maison');
    if (b) b.click();
  });
  await attendre(500);
  await o.page.evaluate(() => {
    const b = [...document.querySelectorAll('#p-maison button')].find(x => /Entrer/.test(x.textContent));
    if (b) b.click();
  });
  await attendre(1500);
  return o;
};
// Passer d'une pièce à l'autre par le panneau, comme le fait le joueur.
const allerDans = async (page, k) => {
  await page.evaluate(n => {
    const b = [...document.querySelectorAll('#p-maison button, #p-maison .chip')]
      .find(x => new RegExp(n, 'i').test(x.textContent));
    if (b) b.click();
  }, k);
  await attendre(1300);
};

/* Combien du cadre la pièce occupe. On lit les pixels du canvas et on
   compare au papier, dont la couleur se prend dans un coin — plutôt que
   de l'écrire en dur, qui serait faux dès qu'on change de thème. */
const occupation = page => page.evaluate(() => {
  const cv = document.getElementById('world'), g = cv.getContext('2d');
  const { width: W, height: H } = cv, d = g.getImageData(0, 0, W, H).data;
  const p0 = [d[0], d[1], d[2]];
  let minx = W, maxx = 0, miny = H, maxy = 0, n = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * 4;
    if (Math.abs(d[i] - p0[0]) + Math.abs(d[i + 1] - p0[1]) + Math.abs(d[i + 2] - p0[2]) > 18) {
      n++; if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  }
  return { large: Math.round((maxx - minx) / W * 100), haut: Math.round((maxy - miny) / H * 100),
           peint: Math.round(n * 4 / (W * H) * 100),
           colle: minx <= 2 || maxx >= W - 2 || miny <= 2 || maxy >= H - 2 };
});

c.titre('1. les trois pièces remplissent le cadre');
{
  /* Mesuré avant la correction : le salon occupait 65 % de la largeur, la
     chambre et l'atelier **51 %**, et quatre cinquièmes des pixels
     étaient du papier vide. On entrait chez soi et il n'y avait presque
     rien à voir. `fitDedans()` calculait pourtant le bon zoom depuis le
     début — il n'était branché qu'en plafond. */
  const { ctx, page, erreurs } = await entrer({ width: 1100, height: 820 });
  for (const k of ['salon', 'chambre', 'atelier']) {
    if (k !== 'salon') await allerDans(page, k);
    const v = await occupation(page);
    console.log('     ' + k.padEnd(8) + ' ' + v.large + '% de large, ' + v.haut +
                '% de haut, ' + v.peint + '% de pixels peints');
    c.dit(v.large >= 75, k + ' — occupe au moins 75 % de la largeur (' + v.large + ')');
    c.dit(v.haut >= 80, k + ' — occupe au moins 80 % de la hauteur (' + v.haut + ')');
    // Et surtout : remplir ne doit pas vouloir dire déborder. `fitDedans()`
    // garde 28 px de marge en largeur et 44 en hauteur, et c'est ce qui
    // permet d'en faire le zoom visé sans couper un mur.
    c.dit(!v.colle, k + ' — rien ne touche le bord du cadre');
  }
  c.dit(erreurs.length === 0, 'aucune erreur de console' + (erreurs.length ? ' → ' + erreurs[0] : ''));
  await ctx.close();
}

c.titre('2. chaque pièce a son article, et ce n’est pas « le chambre »');
{
  /* Quatre phrases collaient un article en dur devant un nom variable :
     « Te voilà dans **le** chambre », « Passer **au** chambre », « Une
     porte vers **le** atelier », « **Le** chambre fait 6x5 cases ».
     Il y a trois pièces et trois genres — masculin, féminin, et masculin
     devant voyelle, qui élide. L'article est donc une propriété de la
     pièce, au même titre que son nom. */
  const { ctx, page, erreurs } = await entrer({ width: 1100, height: 820 });
  const attendu = [
    ['chambre', /Te voilà dans la chambre/, /La chambre fait 6x5/],
    ['atelier', /Te voilà dans l’atelier/, /L’atelier fait 6x5/],
  ];
  for (const [k, murmure, panneau] of attendu) {
    await allerDans(page, k);
    const v = await page.evaluate(() => ({
      m: (document.getElementById('whisper') || {}).innerText || '',
      p: (document.getElementById('p-maison') || {}).innerText || '',
    }));
    console.log('     ' + k + ' : ' + v.m.replace(/\s+/g, ' ').trim());
    c.dit(murmure.test(v.m.replace(/\s+/g, ' ')), k + ' — le murmure a le bon article');
    c.dit(panneau.test(v.p.replace(/\s+/g, ' ')), k + ' — le panneau aussi, avec la capitale');
    c.dit(!/le chambre|le atelier|au chambre|au atelier/i.test(v.m + ' ' + v.p),
          k + ' — aucun article collé de travers');
  }
  // Le salon garde le sien, et il faut le vérifier : une correction qui
  // casse le cas qui marchait n'est pas une correction.
  await allerDans(page, 'salon');
  const sv = await page.evaluate(() => (document.getElementById('p-maison') || {}).innerText || '');
  c.dit(/Le salon fait 8x6/.test(sv.replace(/\s+/g, ' ')), 'salon — « Le salon » n’a pas bougé');
  c.dit(erreurs.length === 0, 'aucune erreur de console' + (erreurs.length ? ' → ' + erreurs[0] : ''));
  await ctx.close();
}

c.titre('3. personne ne recolle un article à la main');
{
  /* La bulle de la porte ne se lit pas à l'écran : `proximiteDedans()`
     franchit le seuil dès qu'on marche dessus avec le sas armé, donc
     « Une porte vers … » ne s'affiche qu'entre deux images. On vérifie
     donc la source — et on le dit, plutôt que de faire croire à une
     mesure.

     Mais ce qu'on y vérifie a changé. Le premier jet cherchait la phrase
     telle qu'elle était écrite, ce qui ne prouve qu'une chose : que je
     l'ai recopiée. En posant la panne — `laPiece()` rendant « le » pour
     tout le monde — deux des quatre phrases ont continué de dire juste,
     et c'était le vrai défaut : elles **ne passaient pas par la
     fonction**. Elles recollaient `pieceDef(k).art` devant le nom, chacune
     à sa façon, et la troisième corrigeait après coup avec un `.replace()`.
     Trois orthographes d'une même idée, donc trois endroits à tenir
     d'accord le jour où une quatrième pièce arrive.

     L'invariant est donc : **`art` et `a` ne se lisent que dans leurs deux
     fonctions.** Une phrase qui les relit ailleurs est une quatrième
     orthographe qui s'installe. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  /* Les commentaires citent `art` sans le lire, donc on les retire — et
     **vraiment**, blocs compris. Mon premier jet ne jetait que les lignes
     qui commencent par `//` ou `/*` ; la ligne du milieu d'un bloc
     `/* … *\/` restait, et le commentaire qui explique justement ce défaut
     a fait rougir le contrôle. Un faux positif use un contrôle aussi
     sûrement qu'un faux négatif — c'est la leçon de `store.js` compté
     comme export manquant. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const dehors = [...code.matchAll(/\.art\b|\bd\.a\b/g)].length;
  // Quatre lectures légitimes : `d.art` deux fois dans laPiece (le nom et la
  // capitale) et `d.a` dans aLaPiece — plus rien ailleurs.
  const dansLesDeux = [...(code.match(/function laPiece[\s\S]*?\n\}|function aLaPiece[^\n]*\n/g) || [])
    .join('\n').matchAll(/\.art\b|\bd\.a\b/g)].length;
  console.log('     ' + dehors + ' lecture(s) de l’article, dont ' + dansLesDeux + ' dans les deux fonctions');
  c.dit(dansLesDeux >= 2, 'les deux fonctions lisent bien l’article (' + dansLesDeux + ')');
  c.dit(dehors === dansLesDeux,
        'aucune phrase ne relit l’article ailleurs (' + (dehors - dansLesDeux) + ' en trop)');
  // Et les quatre phrases passent bien par l'une ou l'autre.
  /* Les deux premières portent maintenant un trou plutôt qu'un `+` : la
     phrase entière est visible d'un coup, ce dont une traduction a besoin
     pour décider de son ordre de mots. Ce que le contrôle prouve est
     inchangé — l'article ne se recolle nulle part à la main. */
  for (const [quoi, re] of [
    ['le murmure d’arrivée', /Te voilà dans \{piece\}[\s\S]{0,80}?piece: laPiece\(p\.k,false,true\)/],
    ['la bulle de la porte', /Une porte vers \{piece\}[\s\S]{0,120}?piece: laPiece\(p\.vers,false,true\)/],
    ['la plaque rose', /'Passer '\+aLaPiece\(p\.vers\)/],
    ['la note du panneau', /laPiece\(def\.k,true,true\)/],
  ]) c.dit(re.test(code), quoi + ' passe par la fonction');
  c.dit(/\{k:'chambre', n:'Chambre', art:'la ', a:'à la '/.test(src),
        'la chambre porte son article et son « à »');
  c.dit(/\{k:'atelier', n:'Atelier', art:'l’',\s*a:'à l’'/.test(src),
        'l’atelier porte les siens, élidés');
}

c.titre('4. dedans, les quatre plaques tiennent sur une rangée');
{
  /* CLAUDE.md porte cet avertissement depuis le 16/09 : « à quatre plaques
     et 360 px, le bouton Son passait à la ligne et se posait sur les
     boutons de zoom ». C'est pour ça que `hud-mode` ne dit que la pièce,
     sans « Chez toi ».

     Or **dedans, on est à quatre plaques** — retour, pièce, bourse, son —
     et c'est exactement le cas que l'avertissement vise. Mesuré à 360 px :
     la quatrième va de 295 à 338 px, il reste 39 px de marge. Ça tient.

     Mais la mesure d'un seul écran ne dit rien du cas qui serre : la
     largeur de la deuxième plaque est le **nom de la pièce**, et mon
     premier jet n'entrait que dans le salon, qui est le nom le plus
     court des trois. On passe donc dans les trois, et on regarde ce qui
     compte vraiment — deux plaques qui se chevauchent, ou une qui sort. */
  for (const [nom, width, height] of [['portrait 360', 360, 780],
                                      ['paysage court 780x360', 780, 360]]) {
    const { ctx, page, erreurs } = await entrer({ width, height }, true);
    for (const k of ['salon', 'chambre', 'atelier']) {
      if (k !== 'salon') await allerDans(page, k);
      const r = await page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const hors = [...document.querySelectorAll('#p-maison *')].filter(e => {
          const b = e.getBoundingClientRect();
          return b.width > 0 && (b.right > W + 1 || b.left < -1);
        }).length;
        const pl = [...document.querySelectorAll('.plate')].filter(e => e.offsetParent !== null)
          .map(e => e.getBoundingClientRect()).sort((a, b) => a.left - b.left);
        const tops = pl.map(b => Math.round(b.top));
        let chevauche = 0, deborde = 0;
        pl.forEach((b, i) => {
          if (i && b.left < pl[i - 1].right - 1) chevauche++;
          if (b.right > W + 1 || b.left < -1) deborde++;
        });
        /* Le plus petit écart entre deux plaques voisines, et c'est **lui**
           qu'il faut lire. Mon premier jet mesurait la marge à droite de la
           dernière : elle vaut 22 px dans les trois pièces, parce que la
           plaque Son est poussée au bord et n'y bouge jamais. Ce qui se
           resserre quand le nom de la pièce s'allonge, c'est le trou juste
           avant elle. */
        const serre = pl.length > 1
          ? Math.round(Math.min(...pl.slice(1).map((b, i) => b.left - pl[i].right))) : 0;
        return { hors, pageX: document.documentElement.scrollWidth - W, chevauche, deborde, serre,
                 noms: pl.map(b => b.width | 0).join('/'),
                 piece: (document.getElementById('hud-mode') || {}).innerText || '',
                 plaques: pl.length, ecart: tops.length ? Math.max(...tops) - Math.min(...tops) : 0 };
      });
      console.log('     ' + nom + ' / ' + k.padEnd(8) + ' : ' + r.plaques + ' plaques (' + r.noms +
                  ' px), écart vertical ' + r.ecart + ', plus petit trou ' + r.serre + ' px');
      const q = nom + ' / ' + k;
      // Sans ça, les trois tours mesureraient trois fois le salon — et
      // rendraient trois fois le même nombre en ayant l'air de prouver
      // quelque chose. C'est la plaque qui dit dans quelle pièce on est.
      c.dit(new RegExp(k, 'i').test(r.piece), q + ' — on est bien dans la pièce (' + r.piece.trim() + ')');
      c.dit(r.plaques === 4, q + ' — quatre plaques, dont le retour et la pièce');
      c.dit(r.serre > 4, q + ' — les plaques ne se touchent pas (trou ' + r.serre + ' px)');
      c.dit(r.ecart < 12, q + ' — elles tiennent sur une rangée (écart ' + r.ecart + ' px)');
      c.dit(r.chevauche === 0, q + ' — aucune plaque n’en recouvre une autre');
      c.dit(r.deborde === 0, q + ' — aucune plaque hors de l’écran');
      c.dit(r.hors === 0, q + ' — aucun élément du panneau hors de l’écran');
      c.dit(r.pageX <= 0, q + ' — aucun débordement horizontal (' + r.pageX + ' px)');
    }
    c.dit(erreurs.length === 0, nom + ' — aucune erreur de console');
    await ctx.close();
  }
}

c.titre('5. le zoom part du haut, et aucun bouton n’est mort');
{
  /* Conséquence de la section 1, et il fallait la regarder plutôt que la
     supposer : dedans, le zoom d'arrivée **est** le plafond, donc « voir
     de plus près » n'a plus rien à donner. Un bouton qui ne fait rien est
     exactement ce que ce jeu s'interdit — c'est la règle du bouton photo
     avant l'achat, et celle des objets verrouillés de l'atelier.

     Mesuré : il arrive **déjà désactivé**, et il se rallume dès qu'on a
     reculé. La plage n'a pas changé — elle va toujours de 1 à
     `fitDedans()` — seul le point de départ est passé d'un bout à
     l'autre. On peut donc encore reculer jusqu'à la vue d'avant. */
  const { ctx, page, erreurs } = await entrer({ width: 1100, height: 820 });
  const zoom = () => page.evaluate(() => [...document.querySelectorAll('.zoom button')]
    .filter(e => e.offsetParent !== null)
    .map(e => ({ n: (e.getAttribute('aria-label') || e.textContent).trim(), off: !!e.disabled })));
  const clic = async n => { await page.evaluate(k => {
    const b = [...document.querySelectorAll('.zoom button')].filter(e => e.offsetParent !== null)
      .find(e => ((e.getAttribute('aria-label') || '') + e.textContent).includes(k));
    if (b && !b.disabled) b.click();
  }, n); await attendre(500); };

  const arrivee = await zoom();
  const pres = arrivee.find(b => /plus près/.test(b.n));
  console.log('     ' + arrivee.map(b => b.n + (b.off ? ' [désactivé]' : '')).join(' · '));
  c.dit(!!pres, 'le bouton « voir de plus près » est là');
  c.dit(pres && pres.off, 'il arrive désactivé — on est déjà au plafond, et ça se dit');

  const large0 = (await occupation(page)).large;
  await clic('−'); await clic('−');
  const large1 = (await occupation(page)).large;
  console.log('     en arrivant ' + large0 + ' %, après deux reculs ' + large1 + ' %');
  c.dit(large1 < large0 - 8, 'reculer marche encore (' + large0 + ' % → ' + large1 + ' %)');
  const recule = (await zoom()).find(b => /plus près/.test(b.n));
  c.dit(recule && !recule.off, 'et « de plus près » se rallume une fois qu’il a de quoi faire');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
