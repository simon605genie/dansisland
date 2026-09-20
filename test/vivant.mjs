/* Ce qui bouge tout seul — et qui n'avait jamais été éprouvé.

   Ce dépôt écrit depuis le 19/09 que le rendu image par image ne
   s'éprouve pas : « le rAF y est bridé, le canvas garde la dernière image
   peinte, et seize mesures rendent seize fois la même valeur ». Remesuré
   le 20/09 au soir, dans ce conteneur, avec ce Chromium :

       images par seconde : 60,5
       relevés du canvas  : 6 valeurs distinctes sur 6

   **La phrase était fausse ici.** Elle a peut-être été vraie sur une autre
   machine — ce n'est pas la question : elle a servi de raison de ne rien
   mesurer, et pendant ce temps le requin, le voilier, les lucioles, les
   éclats sur l'eau et la respiration du bonhomme n'avaient aucun contrôle.
   Une limite qu'on n'a pas revérifiée depuis qu'on l'a écrite est une
   décision qu'on ne prend plus.

   La méthode : on **échantillonne le canvas dans le temps réel** et on
   compte les pixels qui changent, dans une région choisie. Puis on refait
   la même mesure sur une copie du site où la chose est débranchée — c'est
   `servir(port, panne)`. Un contrôle qui dit seulement « ça bouge » ne
   prouve rien : le ciel est plein de mouettes, la mer scintille, et tout
   bouge partout. **Ce qui prouve, c'est l'écart entre les deux.**

   Ce qu'il ne couvre pas, et il ne faut pas prétendre le contraire : il ne
   dit pas si c'est joli. Le juge en reste quelqu'un — c'est la limite déjà
   écrite pour le son et pour les deux relevés de genres. */
import { navigateur, servir, onglet, compteur, attendre, remplacer } from './aide.mjs';

const nav = await navigateur();
const c = compteur();

/* **Toutes les mesures se font par beau temps d'été, et c'est le
   garde-fou le plus important de ce fichier.**

   La saison et la météo ajoutent toutes deux des choses qui tombent —
   pétales, feuilles, neige, pluie — et elles tombent dans les mêmes
   régions que le vent. Sans les figer, ce harnais **mesure autre chose
   selon le jour et l'heure où on le lance** :

     - lancé un 20 septembre, le contrôle du vent est tombé de 2,1x à 1,2x
       parce que les feuilles d'automne bougeaient des **deux** côtés de la
       comparaison ;
     - et la météo tourne toutes les 2 h 29, donc une tranche de pluie
       aurait rendu le même contrôle rouge une fois sur sept, au hasard.

   Un contrôle dont le verdict dépend du calendrier n'est pas un contrôle,
   c'est un oracle. Il aurait été rouge tout l'automne et vert en juillet
   sans que rien du jeu n'ait changé, et c'est le pire des deux mondes :
   on aurait fini par ne plus le lire.

   L'été et le beau temps sont les deux seuls états qui n'ajoutent rien :
   c'est donc le fond neutre. Les sections qui éprouvent la saison ou le
   temps forcent le leur — c'est leur sujet. */
const NEUTRE = src => remplacer(
  remplacer(src, /function saison\(\)\{ return saisonDe\(jourDuJeu\(\)\); \}/,
            "function saison(){ return 'ete'; }"),
  /function meteoDe\(n\)\{[\s\S]*?\n\}/, "function meteoDe(n){ return 'beau'; }");
// Deux pannes qui se composent : le fond neutre, puis celle qu'on éprouve.
const avecEte = panne => src => panne ? panne(NEUTRE(src)) : NEUTRE(src);

/* Une île semée à la main plutôt que celle du hasard : un contrôle qui
   mesure une île différente à chaque exécution mesure aussi le hasard.

   Le format est `{t,x,y}` — celui de `mondeNu()`. Mon premier jet écrivait
   `['palmier',7,6]` : `normaliserMonde()` a écarté les neuf objets en
   silence, et j'ai mesuré le vent sur une île **sans un seul arbre**
   pendant trois sections. Rien ne le disait ; c'est la capture d'écran qui
   l'a dit. D'où `combienPoses()` plus bas, et l'assertion qui va avec :
   une sonde qui ne vérifie pas avoir posé ce qu'elle mesure passe au vert
   en ne regardant rien. */
const SEME = JSON.stringify([
  { t: 'palmier', x: 7, y: 6 }, { t: 'palmier', x: 11, y: 7 },
  { t: 'arbre', x: 6, y: 10 }, { t: 'arbre', x: 12, y: 11 },
  { t: 'sapin', x: 8, y: 13 }, { t: 'buisson', x: 10, y: 5 },
  { t: 'fleur', x: 9, y: 12 }, { t: 'rocher', x: 13, y: 9 },
  { t: 'phare', x: 4, y: 8 },
]);
const SEMES = JSON.parse(SEME).length;

/* Le code de sauvegarde, en clair. `world` n'est pas atteignable depuis la
   page — un élément à `id` en fait une globale, et `world` est le
   **canvas**, pas le monde. Le code, lui, est exactement ce qui part en
   base : c'est donc la bonne source pour les deux questions de ce fichier,
   « les objets sont-ils posés ? » et « est-ce que rien n'a bougé ? ».

   Il est en **base64**, et c'est le deuxième piège que cette sonde m'a
   tendu : mon premier comptage cherchait `"palmier"` dans la chaîne
   encodée et rendait 0 sur 9, devant une île qui portait visiblement ses
   neuf objets sur la capture d'écran. Un compte qui rend zéro devant une
   chose visible est un compte cassé, pas une découverte. */
async function codeSauvegarde(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
    if (b) b.click();
  });
  await attendre(600);
  return page.evaluate(() => {
    const v = [...document.querySelectorAll('#p-voisins textarea')]
      .map(e => e.value).find(x => x && x.length > 40) || '';
    try { return decodeURIComponent(escape(atob(v))); } catch (e) { return v; }
  });
}
async function combienPoses(page) {
  const clair = await codeSauvegarde(page);
  return ['palmier', 'arbre', 'sapin', 'buisson', 'fleur', 'rocher', 'phare']
    .reduce((n, k) => n + (clair.split('"' + k + '"').length - 1), 0);
}

/* Compter les pixels qui changent dans une bande du canvas, sur une durée
   réelle. On rend la bande en **fractions** du canvas et non en pixels :
   la taille du canvas est fixe aujourd'hui (768x500), mais un contrôle qui
   l'écrit en dur ment le jour où elle change. */
async function bouge(page, { x0 = 0, y0 = 0, x1 = 1, y1 = 1, ms = 1400, seuil = 8 } = {}) {
  return page.evaluate(async ({ x0, y0, x1, y1, ms, seuil }) => {
    const cv = document.getElementById('world'), g = cv.getContext('2d');
    const X = Math.round(x0 * cv.width), Y = Math.round(y0 * cv.height);
    const W = Math.round((x1 - x0) * cv.width), H = Math.round((y1 - y0) * cv.height);
    const lire = () => g.getImageData(X, Y, W, H).data;
    const a = lire();
    await new Promise(r => setTimeout(r, ms));
    const b = lire();
    let n = 0, max = 0, somme = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      if (d > seuil) n++;
      if (d > max) max = d;
      somme += a[i] + a[i + 1] + a[i + 2];
    }
    return { n, max, pix: W * H, part: +(100 * n / (W * H)).toFixed(2),
             clair: Math.round(somme / (W * H * 3)) };
  }, { x0, y0, x1, y1, ms, seuil });
}

/* Le **chemin parcouru** dans une région, cumulé sur une période entière
   du vent.

   Une seule fenêtre de mesure ne vaut rien ici, et c'est une erreur que
   j'ai mis trois essais à comprendre : comparer deux images séparées de
   400 ms, c'est lire une **dérivée à une phase tirée au hasard**. Au
   sommet du sinus le vent ne bouge presque pas ; à son passage par zéro il
   file. Le même réglage rendait 1,23x à la calibration et 1,08x à
   l'exécution suivante — pas parce que le jeu avait changé, mais parce que
   la mesure tombait ailleurs dans le cycle.

   En sommant les écarts entre images successives sur 1600 ms — un tour
   complet de `vent()` — le chemin total ne dépend plus de la phase, et il
   reste proportionnel à l'amplitude. C'est la même idée que le centroïde
   contre la boîte englobante, notée le 19/09 : il faut mesurer la
   grandeur qu'on nomme, pas une grandeur qui lui ressemble. */
async function chemin(page, { x0, y0, x1, y1 }, { pas = 200, duree = 1600, seuil = 8 } = {}) {
  return page.evaluate(async ({ x0, y0, x1, y1, pas, duree, seuil }) => {
    const cv = document.getElementById('world'), g = cv.getContext('2d');
    const X = Math.round(x0 * cv.width), Y = Math.round(y0 * cv.height);
    const W = Math.round((x1 - x0) * cv.width), H = Math.round((y1 - y0) * cv.height);
    const lire = () => g.getImageData(X, Y, W, H).data;
    let avant = lire(), total = 0, tours = 0;
    for (let t = 0; t < duree; t += pas) {
      await new Promise(r => setTimeout(r, pas));
      const ici = lire();
      for (let i = 0; i < ici.length; i += 4) {
        const d = Math.abs(avant[i] - ici[i]) + Math.abs(avant[i + 1] - ici[i + 1])
                + Math.abs(avant[i + 2] - ici[i + 2]);
        if (d > seuil) total++;
      }
      avant = ici; tours++;
    }
    return { total, tours, pix: W * H };
  }, { x0, y0, x1, y1, pas, duree, seuil });
}

/* Ouvrir une île semée, au ciel voulu. `sky` se règle par le panneau Île,
   comme un joueur le ferait : écrire `world.sky` demanderait d'atteindre
   la portée du module, qui n'est pas exposée — et c'est très bien ainsi. */
async function ile(site, { sky = 'jour' } = {}) {
  const o = await onglet(nav, { taille: { width: 1280, height: 900 },
                                memoire: { 'test:objets': SEME } });
  await o.page.goto(site.url, { waitUntil: 'load' });
  await attendre(1700);
  if (sky !== 'jour') {
    await o.page.evaluate(k => {
      const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'ile');
      if (b) b.click();
    });
    await attendre(500);
    const mis = await o.page.evaluate(k => {
      const f = [...document.querySelectorAll('.field')].find(x => /^Heure/.test(x.textContent));
      if (!f) return false;
      const ch = [...f.querySelectorAll('.chip')].find(x => x.textContent.trim().toLowerCase().startsWith(k));
      if (!ch) return false;
      ch.click(); return true;
    }, sky.slice(0, 4));
    await attendre(700);
    if (!mis) throw new Error('impossible de régler le ciel sur ' + sky);
  }
  return o;
}

c.titre('1. le rAF tourne vraiment ici — tout le reste en dépend');
{
  /* Sans cette mesure, les six sections suivantes pourraient être vertes
     pour la pire des raisons : une image figée comparée à elle-même rend
     « zéro pixel bouge » partout, et un contrôle qui attend du mouvement
     serait alors rouge — mais un contrôle qui attend de l'immobilité,
     comme la panne ci-dessous, serait vert sans rien prouver. */
  const s = await servir(8261, avecEte());
  const o = await ile(s);
  const fps = await o.page.evaluate(async () => {
    let n = 0; const t0 = performance.now();
    await new Promise(res => { const b = () => {
      n++; if (performance.now() - t0 < 1000) requestAnimationFrame(b); else res(); };
      requestAnimationFrame(b); });
    return n;
  });
  console.log('     ' + fps + ' images en une seconde');
  c.dit(fps > 20, 'le navigateur peint pour de bon (' + fps + ' img/s)');
  await o.ctx.close(); s.fermer();
}

/* La bande où vit l'île. Elle a été **relevée sur une image de
   différence** — deux images à 775 ms d'écart, soustraites et amplifiées —
   et non devinée : mon premier jet prenait `0,42 à 0,86` en hauteur, ce qui
   ratait la moitié haute des arbres et ajoutait un grand quart de mer vide.
   Le contour de la mer ondule aussi (c'est `wMer()`), et il traversait les
   coins de la boîte : du bruit pur, qui écrasait le signal qu'on cherchait. */
const TERRE = { x0: 0.26, y0: 0.24, x1: 0.73, y1: 0.70 };

c.titre('2. le vent plie les arbres et l’herbe');
{
  const s = await servir(8262, avecEte());
  const o = await ile(s);
  const avec = await bouge(o.page, TERRE);
  const poses = await combienPoses(o.page);
  console.log('     objets posés sur l’île : ' + poses + ' / ' + SEMES);
  // Sans ça, les trois sections mesuraient une île vide en ayant l'air de
  // mesurer le vent dans les arbres. Elles l'ont fait.
  c.dit(poses === SEMES, 'l’île porte bien ce qu’on y a semé (' + poses + '/' + SEMES + ')');
  await o.ctx.close(); s.fermer();

  /* La panne : `VENT_PLIE` vidé et `vent()` rendu nul. Les deux, parce
     qu'un seul laisserait l'autre chemin vivant — les touffes n'appellent
     pas `ventPlie()`, elles appellent `vent()` en direct. */
  /* `remplacer()` et non `.replace()` : une panne qui ne trouve pas sa
     cible se pose en silence, et le contrôle mesure alors la même chose
     des deux côtés. C'est arrivé ici même — `vent()` a gagné un
     `* ventForce()` avec la météo, mon motif visait encore `return
     Math.sin(`, et le « sans vent » avait toujours son vent : le rapport
     est tombé de 1,9x à 1,2x et j'ai cru à une régression du jeu. */
  const p = await servir(8263, avecEte(src =>
    remplacer(remplacer(src, /const VENT_PLIE=\{[\s\S]*?\};/, 'const VENT_PLIE={};'),
              /return \(Math\.sin\(t\/1550[\s\S]*?\* ventForce\(\);/, 'return 0;')));
  c.dit(p.pannePosee, 'la panne a bien été posée dans la copie servie');
  const o2 = await ile(p);
  const sans = await bouge(o2.page, TERRE);
  await o2.ctx.close(); p.fermer();

  console.log('     avec le vent : ' + avec.n + ' px (' + avec.part + ' %)   ' +
              'sans : ' + sans.n + ' px (' + sans.part + ' %)');
  c.dit(avec.n > 400, 'quelque chose bouge sur la terre (' + avec.n + ' px)');
  /* Un rapport, pas un nombre absolu : le runner rend autrement, et un
     seuil calibré ici tombe là-bas — c'est la leçon du 19/09, où un
     `panneau >= 150` est passé en local et rouge en CI.

     Et le seuil vient d'une **mesure de dispersion**, pas d'un chiffre
     rond choisi au jugé. Trois tours de chaque côté ont donné 3591/3727/3834
     avec le vent et 1667/1694/1703 sans ; d'autres exécutions sont
     descendues à 1,7. Le rapport observé va donc de **1,7 à 2,3**, et il
     vaut **1,0 par construction** quand le vent est coupé, puisque c'est
     la même scène sans le seul terme qui bouge.

     Le seuil se choisit entre les deux, pas au bord de l'un d'eux : à 1,8
     le contrôle aurait clignoté, et un contrôle qui clignote finit par ne
     plus être lu — c'est la leçon du seuil calibré sur une police, du
     19/09. 1,4 refuse le vent coupé sans jamais accuser à tort.

     Ce qui n'a **pas** été fait : forcer la rafale pour élargir l'écart.
     Un jeu de détente n'a pas à avoir la tempête, et remonter l'amplitude
     pour faire passer une mesure, c'est laisser la mesure décider du jeu. */
  c.dit(avec.n > sans.n * 1.4,
        'et c’est bien le vent : ' + (sans.n ? (avec.n / sans.n).toFixed(1) : '∞') + 'x plus qu’avec le vent coupé');
}

c.titre('3. le phare balaie la mer, la nuit seulement');
{
  /* Le faisceau vit dans la section de nuit, donc de jour il ne doit rien
     peindre du tout.

     **La boîte a été relevée sur une capture, pas déduite.** Mes trois
     premières visaient le sud-ouest du phare — et le balayage passe au
     nord-ouest. Elles rendaient donc « aucune différence » avec assurance,
     devant un faisceau parfaitement visible sur l'image. Resserrer une
     boîte qui vise à côté ne fait que mesurer le vide de plus près : les
     trois essais donnaient 1175/576, puis 327/323, puis 174/164, et j'ai
     failli en conclure que l'effet n'existait pas. */
  const OUEST = { x0: 0.10, y0: 0.12, x1: 0.40, y1: 0.38 };
  const s = await servir(8264, avecEte());
  const oj = await ile(s, { sky: 'jour' });
  const jour = await bouge(oj.page, OUEST);
  await oj.ctx.close();
  const on = await ile(s, { sky: 'nuit' });
  const nuit = await bouge(on.page, OUEST);
  await on.ctx.close(); s.fermer();

  const p = await servir(8265, avecEte(src => remplacer(src, /if\(o\.t!=='phare'\) return;/, 'return;')));
  c.dit(p.pannePosee, 'la panne a bien été posée dans la copie servie');
  const o2 = await ile(p, { sky: 'nuit' });
  const sans = await bouge(o2.page, OUEST);
  await o2.ctx.close(); p.fermer();

  console.log('     nuit ' + nuit.n + ' px · jour ' + jour.n + ' px · nuit sans phare ' + sans.n + ' px');
  c.dit(nuit.n > sans.n * 1.6,
        'le faisceau bouge l’eau la nuit (' + (sans.n ? (nuit.n / sans.n).toFixed(1) : '∞') + 'x)');
  /* `max` ne valait rien ici : c'est l'écart le plus fort d'un pixel entre
     deux instants, et les éclats sur l'eau le saturent à 158 des deux
     côtés. Ce qu'un faisceau fait, c'est **ajouter de la lumière** — donc
     c'est la clarté moyenne de l'eau qu'il faut lire, et elle ne peut pas
     être saturée par un éclat ponctuel. */
  c.dit(nuit.clair > sans.clair,
        'et il éclaire l’eau pour de bon (clarté ' + nuit.clair + ' contre ' + sans.clair + ')');
}

c.titre('4. les constellations, mesurées sur leurs propres traits');
{
  /* **On lit les pixels sur les segments**, aux coordonnées que `CONSTEL`
     déclare, et on les compare aux mêmes points décalés de huit pixels vers
     le bas — du ciel vide, à la même hauteur, sous le même nuage s'il y en
     a un.

     Mon premier jet comptait les « pixels plus clairs que la moyenne »
     dans une bande du haut du cadre : il y trouvait 1608 points avec et
     1232 sans, c'est-à-dire surtout des nuages et la lune. Un contrôle qui
     mesure le ciel entier ne peut pas dire si un trait de plus y est —
     c'est, une fois encore, une mesure qui ne vise pas ce qu'elle nomme. */
  const SONDE = `(() => {
    const cv = document.getElementById('world'), g = cv.getContext('2d');
    const K = [
      { p:[[196,40],[218,33],[240,34],[261,42],[258,63],[236,68],[213,58]],
        s:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]] },
      { p:[[560,58],[560,22],[588,58],[534,58],[596,66]],
        s:[[0,1],[1,2],[2,4],[3,4],[0,3]] },
    ];
    const lum = (x,y) => { const d = g.getImageData(Math.round(x), Math.round(y), 1, 1).data;
                           return d[0] + d[1] + d[2]; };
    let sur = 0, sous = 0, n = 0;
    for (const k of K) for (const [i,j] of k.s) {
      const a = k.p[i], b = k.p[j];
      for (let u = 0.15; u <= 0.85; u += 0.10) {
        const x = a[0] + (b[0]-a[0])*u, y = a[1] + (b[1]-a[1])*u;
        sur += lum(x, y); sous += lum(x, y + 8); n++;
      }
    }
    return { sur: Math.round(sur/n), sous: Math.round(sous/n), n };
  })()`;

  const s = await servir(8266, avecEte());
  const on = await ile(s, { sky: 'nuit' });
  const avec = await on.page.evaluate(SONDE);
  const scint = await bouge(on.page, { x0: 0.24, y0: 0.03, x1: 0.36, y1: 0.16 }, 1800);
  await on.ctx.close(); s.fermer();

  const p = await servir(8267, avecEte(src => remplacer(src, /^\s*constellations\(t\);$/m, '')));
  c.dit(p.pannePosee, 'la panne a bien été posée dans la copie servie');
  const o2 = await ile(p, { sky: 'nuit' });
  const sans = await o2.page.evaluate(SONDE);
  await o2.ctx.close(); p.fermer();

  console.log('     sur les traits ' + avec.sur + ' · juste à côté ' + avec.sous +
              ' · sans les constellations ' + sans.sur + '   (' + avec.n + ' points)');
  c.dit(avec.n >= 60, 'assez de points relevés sur les segments (' + avec.n + ')');
  c.dit(avec.sur > avec.sous, 'les traits sont plus clairs que le ciel juste à côté');
  c.dit(avec.sur > sans.sur, 'et ils disparaissent quand on débranche le dessin (' +
        avec.sur + ' → ' + sans.sur + ')');
  c.dit(scint.n > 0, 'la Casserole scintille (' + scint.n + ' px changent en 1,8 s)');
}

c.titre('5. la météo change la lumière, pas seulement les gouttes');
{
  /* Le vrai défaut du premier jet : la pluie tombait, **et le soleil
     brillait au-dessus**. Ça ne se lit pas comme de la pluie, ça se lit
     comme des rayures sur l'écran. Un temps se reconnaît d'abord à la
     lumière du cadre, et seulement ensuite aux particules — d'où
     `SOLEIL_VOILE` et `METEO_VOILE`.

     Le contrôle mesure donc la **clarté moyenne du cadre entier**, temps
     par temps, en forçant la météo par une panne. C'est la seule mesure
     qui dit ce qu'on cherche : un comptage de gouttes aurait été vert dès
     le premier jet. */
  const forcer = quoi => src =>
    remplacer(src, /function meteoDe\(n\)\{[\s\S]*?\n\}/,
              "function meteoDe(n){ return '" + quoi + "'; }");
  const TOUT = { x0: 0, y0: 0, x1: 1, y1: 1, ms: 700 };
  const vu = {}, surTerre = {};
  let port = 8271;
  for (const temps of ['beau', 'nuages', 'pluie', 'brume', 'rafale']) {
    const s = await servir(port++, forcer(temps));
    const o = await ile(s);
    vu[temps] = await bouge(o.page, TOUT);
    /* La rafale ne vit que là où il y a des arbres : mesurée sur le cadre
       entier, elle est noyée dans la mer et le ciel, qui occupent les
       quatre cinquièmes. C'est la même erreur de visée que les trois
       boîtes du phare, en plus discrète — 1,09x au lieu de 1,23x.

       Et c'est un **chemin cumulé**, pas un écart entre deux images : une
       fenêtre unique lit une dérivée à une phase tirée au hasard, et le
       même réglage a rendu 1,23x puis 1,08x d'une exécution à l'autre.
       Voir `chemin()`. */
    surTerre[temps] = await chemin(o.page, TERRE);
    await o.ctx.close(); s.fermer();
  }
  console.log('     clarté du cadre : ' +
    Object.entries(vu).map(([k, v]) => k + ' ' + v.clair).join(' · '));
  console.log('     pixels qui bougent : ' +
    Object.entries(vu).map(([k, v]) => k + ' ' + v.n).join(' · '));

  c.dit(vu.beau.clair > vu.nuages.clair,
        'le ciel couvert assombrit le cadre (' + vu.beau.clair + ' → ' + vu.nuages.clair + ')');
  c.dit(vu.nuages.clair > vu.pluie.clair,
        'et la pluie l’assombrit encore (' + vu.nuages.clair + ' → ' + vu.pluie.clair + ')');
  c.dit(vu.brume.clair > vu.pluie.clair,
        'la brume délave au lieu d’assombrir (' + vu.brume.clair + ' contre ' + vu.pluie.clair + ')');
  // La pluie tombe : c'est le seul temps qui ajoute du mouvement partout,
  // y compris sur le papier hors de la mer.
  c.dit(vu.pluie.n > vu.beau.n * 1.5,
        'il tombe vraiment quelque chose (' + vu.pluie.n + ' contre ' + vu.beau.n + ')');
  // La rafale plie plus fort : `ventForce()` vaut 2,3 au lieu de 1. Mesurée
  // sur la terre, là où sont les arbres.
  console.log('     chemin sur la terre (1,6 s) : beau ' + surTerre.beau.total +
              ' · rafale ' + surTerre.rafale.total + ' · brume ' + surTerre.brume.total);
  c.dit(surTerre.beau.tours === 8, 'le chemin a été cumulé sur huit pas (' + surTerre.beau.tours + ')');
  c.dit(surTerre.rafale.total > surTerre.beau.total * 1.12,
        'la rafale secoue les arbres plus que le beau temps (' +
        surTerre.rafale.total + ' contre ' + surTerre.beau.total + ')');
  // Et la brume immobilise l'air (`ventForce()` vaut 0,35) : c'est le seul
  // temps où l'île est **plus calme** que par beau temps. C'est ce qui
  // prouve que `ventForce()` est branché dans les deux sens, et pas
  // seulement qu'une rafale ajoute du mouvement.
  c.dit(surTerre.brume.total < surTerre.beau.total * 0.88,
        'la brume immobilise l’air (' + surTerre.brume.total + ' contre ' + surTerre.beau.total + ')');
}

c.titre('5 bis. les saisons se posent sur l’île, elles ne la repeignent pas');
{
  /* **La règle qui décide de tout ici : une saison ajoute, elle ne
     remplace jamais.** Le joueur a choisi sa palette de terrain ; un hiver
     qui repeindrait son herbe en blanc lui prendrait son île.

     Le contrôle l'éprouve sur les pixels : il relève la clarté du sol aux
     quatre saisons, et vérifie que l'**été ne change rien du tout** —
     c'est l'île d'avant, à l'octet près. Une saison qui se verrait en été
     serait la preuve qu'on a touché au dessin de base. */
  const forcer = q => src =>
    remplacer(src, /function saison\(\)\{ return saisonDe\(jourDuJeu\(\)\); \}/,
              "function saison(){ return '" + q + "'; }");
  const SOL = { x0: 0.34, y0: 0.42, x1: 0.62, y1: 0.62 };   // de l'herbe, au milieu
  const vu = {};
  let port = 8281;
  for (const q of ['ete', 'printemps', 'automne', 'hiver']) {
    const s = await servir(port++, forcer(q));
    const o = await ile(s);
    vu[q] = await bouge(o.page, SOL, { ms: 300 });
    await o.ctx.close(); s.fermer();
  }
  console.log('     clarté du sol : ' +
    Object.entries(vu).map(([k, v]) => k + ' ' + v.clair).join(' · '));

  // L'hiver blanchit franchement, l'automne réchauffe à peine : les deux
  // écarts sont voulus, et c'est leur **ordre** qui dit que ça marche.
  c.dit(vu.hiver.clair > vu.ete.clair + 20,
        'l’hiver pose de la neige sur le sol (' + vu.ete.clair + ' → ' + vu.hiver.clair + ')');
  c.dit(vu.automne.clair !== vu.ete.clair,
        'l’automne teinte le sol sans le refaire (' + vu.ete.clair + ' → ' + vu.automne.clair + ')');
  c.dit(Math.abs(vu.automne.clair - vu.ete.clair) < Math.abs(vu.hiver.clair - vu.ete.clair),
        'et il le fait beaucoup plus discrètement que l’hiver');
  /* Le printemps ne pose **rien** au sol — il ne fait tomber que des
     pétales, qui passent devant. C'est ce qui distingue « ajouter au
     ciel » de « toucher à la terre ». */
  c.dit(vu.printemps.clair === vu.ete.clair,
        'le printemps ne touche pas au sol (' + vu.printemps.clair + ' = ' + vu.ete.clair + ')');
}

c.titre('6. la météo ne rapporte rien et ne coûte rien');
{
  /* La règle qui compte plus que le dessin : **un temps qui paierait
     serait un gain qui tombe tout seul cinq fois par jour**, exactement ce
     que la marée a refusé d'être. On le vérifie dans la source plutôt qu'à
     l'écran : c'est une propriété du code, et elle se lit d'un coup.

     Et il n'y a pas de mauvais temps — rien ne ralentit, rien ne se perd.
     C'est la ligne du chien qui s'assied. */
  const { readFileSync } = await import('fs');
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  // Les deux blocs : la saison est déclarée juste avant la météo, et les
  // deux doivent tenir la même promesse.
  const bloc = src.slice(src.indexOf('/* ================= les saisons'),
                         src.indexOf('function avancerMaree'));
  console.log('     bloc saisons + météo : ' + bloc.length + ' caractères');
  c.dit(bloc.length > 2500, 'les deux blocs ont été lus (' + bloc.length + ')');
  c.dit(/const SAISONS=/.test(bloc) && /const METEO=/.test(bloc),
        'et ils portent bien les deux tables (SAISONS et METEO)');
  c.dit(!/bourse_gagner|PLAFOND|faits\s*\[|GAIN_/.test(bloc),
        'ni l’une ni l’autre ne touche la bourse, un plafond, ou `faits`');
  c.dit(!/vitesse|blocked\(|hero\./.test(bloc),
        'et aucune ne touche au déplacement : ni un temps ni une saison ne ralentit');
  // Une clé de plus dans `mondeNu()` serait une météo par île, donc la fin
  // de « le même temps pour tout l'archipel ».
  const nu = src.slice(src.indexOf('return {name:w.name'), src.indexOf('return {name:w.name') + 400);
  c.dit(nu.length > 200, 'la liste de mondeNu() a été lue (' + nu.length + ' caractères)');
  c.dit(!/meteo|saison|vent/.test(nu),
        'et ni la météo, ni la saison, ni le vent n’y sont entrés');
}

c.titre('6 bis. chez un voisin, l’hôte fait les cent pas');
{
  /* Vingt îles de démonstration sont la première chose qu'un nouveau venu
     voit en cliquant « Voisins ». Leur hôte était **assis**, donc vingt
     cartes postales où rien ne bouge.

     Ce qui se mesure ici, et c'est le point délicat : l'hôte bouge, mais
     l'île entière bouge aussi (mer, mouettes, vent, feuilles). On compare
     donc la même île avec et **sans** le va-et-vient — c'est la seule
     façon de dire que c'est bien lui. */
  const aller = async (s) => {
    const o = await onglet(nav, { taille: { width: 1280, height: 900 },
                                  memoire: { 'dansisland:muet': '1' } });
    await o.page.goto(s.url, { waitUntil: 'load' });
    await attendre(1900);
    await o.page.evaluate(() => {
      const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
      if (b) b.click();
    });
    await attendre(800);
    const ou = await o.page.evaluate(() => {
      const ns = [...document.querySelectorAll('#p-voisins .neighbor')];
      const n = ns[2] || ns[1];
      if (!n) return null;
      const b = [...n.querySelectorAll('button,a')].find(x => /Visiter/i.test(x.textContent));
      if (!b) return null;
      b.click(); return true;
    });
    await attendre(2200);
    const plaque = await o.page.evaluate(() =>
      (document.getElementById('hud-name') || {}).textContent || '');
    return { o, ou, plaque: plaque.trim() };
  };

  /* La bande devant la maison de l'hôte, **relevée sur une capture** puis
     calibrée. Elle est serrée exprès : l'hôte est une silhouette de vingt
     pixels de large, et dans une boîte quatre fois plus grande il pèse
     2 % des pixels, noyé dans la mer, les mouettes et les feuilles qui
     tombent. Mesuré, le même contrôle selon la boîte et la fenêtre :

         large  1,6 s → 1,16x      large  4,4 s → 1,23x
         serrée 1,6 s → 1,30x      serrée 4,4 s → 1,40x
         étroite 1,6 s → 1,56x     étroite 4,4 s → 2,16x

     Et la fenêtre couvre **tout son trajet aller** (4,4 s des 11 s du
     cycle) : sur 1,6 s il ne parcourt qu'un tiers de case, ce qui est vrai
     mais indétectable. Une fenêtre d'échantillonnage se choisit sur la
     durée du geste qu'on mesure, pas au jugé. */
  const DEVANT = { x0: 0.38, y0: 0.48, x1: 0.50, y1: 0.62 };
  const TRAJET = { pas: 550, duree: 4400 };

  const s = await servir(8291, avecEte());
  const a = await aller(s);
  console.log('     visite : ' + (a.plaque || '(échec)'));
  c.dit(!!a.ou && !!a.plaque, 'on est bien arrivé chez un voisin (' + a.plaque + ')');
  const avec = await chemin(a.o.page, DEVANT, TRAJET);
  await a.o.ctx.close(); s.fermer();

  // La panne : l'hôte reste assis, comme avant le 20/09 au soir.
  const p = await servir(8292, avecEte(src => remplacer(src, /function hoteAu\(t\)\{[\s\S]*?\n\}/,
                                                'function hoteAu(t){ return null; }')));
  c.dit(p.pannePosee, 'la panne a bien été posée dans la copie servie');
  const b = await aller(p);
  const sans = await chemin(b.o.page, DEVANT, TRAJET);
  await b.o.ctx.close(); p.fermer();

  console.log('     chemin devant la maison : ' + avec.total + ' avec · ' + sans.total + ' sans');
  c.dit(avec.total > sans.total * 1.5,
        'l’hôte marche vraiment (' + (sans.total ? (avec.total / sans.total).toFixed(1) : '∞') + 'x)');

  /* **Le repli est ce qui compte le plus ici**, et il ne se voit pas à
     l'œil : une maison au bord de l'île peut avoir la mer devant sa porte,
     et un hôte qui marcherait sur l'eau serait le défaut qu'on ne
     découvre qu'à la dix-septième île. On éprouve donc `terre()` refusé
     partout : l'hôte doit **rester assis**, c'est-à-dire retomber
     exactement sur l'état d'avant. */
  const q = await servir(8293, avecEte(src =>
    remplacer(src, /function segmentDevantLaPorte\(\)\{/,
              'function segmentDevantLaPorte(){ if(1) return null;')));
  c.dit(q.pannePosee, 'la panne du sol introuvable a bien été posée');
  const d = await aller(q);
  const assis = await chemin(d.o.page, DEVANT, TRAJET);
  const erreurs = d.o.erreurs.length;
  await d.o.ctx.close(); q.fermer();
  console.log('     sans terrain praticable : ' + assis.total + ' (il reste assis)');
  c.dit(erreurs === 0, 'aucune erreur quand il n’y a pas la place de marcher');
  c.dit(assis.total < avec.total,
        'et il retombe sur l’état d’avant plutôt que de marcher sur l’eau');
}

c.titre('7. rien de tout ça n’est parti en base');
{
  /* La ligne écrite pour les mouettes et le requin, et qui vaut pour le
     vent : aucune clé de plus dans `mondeNu()`. On le vérifie sur le code
     de sauvegarde, qui est ce qui part vraiment. */
  const s = await servir(8268, avecEte());
  const o = await ile(s);
  const av = await o.page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
    if (b) b.click(); return null;
  });
  const code1 = await codeSauvegarde(o.page);
  await attendre(2400);           // le vent a tourné entre les deux relevés
  const code2 = await codeSauvegarde(o.page);
  await o.ctx.close(); s.fermer();
  console.log('     code de sauvegarde : ' + code1.length + ' caractères en clair');
  c.dit(code1.length > 200, 'le code de sauvegarde a été lu (' + code1.length + ')');
  c.dit(/"o":\[/.test(code1), 'et il porte bien les objets de l’île');
  c.dit(code1 === code2, 'il n’a pas bougé d’un octet pendant que le vent soufflait');
  // La liste des clés, nommément : une clé de plus se verrait ici avant de
  // se voir en production. C'est ce que `mondeNu()` promet.
  const cles = Object.keys(JSON.parse(code1)).sort().join(' ');
  console.log('     clés : ' + cles);
  c.dit(!/vent|meteo|saison/.test(cles), 'et aucune clé de vent n’est apparue dans mondeNu()');
}

await nav.close();
process.exit(c.fin() ? 1 : 0);
