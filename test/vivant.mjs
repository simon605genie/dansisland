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
import { navigateur, servir, onglet, compteur, attendre, remplacer, RACINE } from './aide.mjs';
import fs from 'fs';
import path from 'path';

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

/* La **clarté d'une région suivie dans le temps**, et non à un instant.

   Née d'un contrôle qui clignotait : « le phare éclaire l'eau pour de bon »
   comparait la clarté moyenne de deux relevés **ponctuels**, et rendait
   « 81 contre 81 ». Le faisceau fait un tour en 9 s et n'occupe qu'un
   vingtième de tour (`arc(-0,10 ; 0,10)`) : un instant tiré au hasard le
   rate dix-neuf fois sur vingt. Le contrôle était donc vert ou rouge selon
   le moment où on lançait le harnais — l'oracle exact que ce fichier se
   reproche ailleurs.

   C'est la même faute que la fenêtre unique de `chemin()`, sur une autre
   grandeur : **une mesure doit couvrir la période du phénomène qu'elle
   nomme.** `max` est ce qu'il faut lire pour un phare — ce qui compte est
   qu'il existe un moment où l'eau est plus claire — et `moy` pour une
   teinte permanente, où la moyenne lisse ce qui tombe du ciel. */
async function clarte(page, { x0, y0, x1, y1 }, { pas = 300, duree = 9600 } = {}) {
  return page.evaluate(async ({ x0, y0, x1, y1, pas, duree }) => {
    const cv = document.getElementById('world'), g = cv.getContext('2d');
    const X = Math.round(x0 * cv.width), Y = Math.round(y0 * cv.height);
    const W = Math.round((x1 - x0) * cv.width), H = Math.round((y1 - y0) * cv.height);
    const un = () => {
      const d = g.getImageData(X, Y, W, H).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
      return s / (W * H * 3);
    };
    const v = [];
    for (let t = 0; t < duree; t += pas) {
      await new Promise(r => setTimeout(r, pas));
      v.push(un());
    }
    return { n: v.length,
             max: Math.round(Math.max(...v) * 10) / 10,
             moy: Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 };
  }, { x0, y0, x1, y1, pas, duree });
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
  /* **Un tour entier du faisceau, pas un instant.** Il met 9 s à faire le
     tour (`t/9000`) et n'occupe qu'un vingtième de tour (`arc(-0,10 ;
     0,10)`) : une mesure ponctuelle le rate dix-neuf fois sur vingt.

     C'est ce qui a fait clignoter ce contrôle — il rendait « clarté 81
     contre 81 » sur un phare parfaitement allumé, et il était vert ou
     rouge selon la seconde où on lançait le harnais. Un contrôle dont le
     verdict dépend de l'instant n'est pas un contrôle, c'est un oracle :
     la phrase était déjà écrite pour la saison et la météo, et elle
     s'appliquait ici sans que je la voie. */
  const TOUR = { pas: 300, duree: 9600 };
  const s = await servir(8264, avecEte());
  const oj = await ile(s, { sky: 'jour' });
  const jour = await bouge(oj.page, OUEST);
  await oj.ctx.close();
  const on = await ile(s, { sky: 'nuit' });
  const nuit = await bouge(on.page, OUEST);
  const nuitL = await clarte(on.page, OUEST, TOUR);
  await on.ctx.close(); s.fermer();

  const p = await servir(8265, avecEte(src => remplacer(src, /if\(o\.t!=='phare'\) return;/, 'return;')));
  c.dit(p.pannePosee, 'la panne a bien été posée dans la copie servie');
  const o2 = await ile(p, { sky: 'nuit' });
  const sans = await bouge(o2.page, OUEST);
  const sansL = await clarte(o2.page, OUEST, TOUR);
  await o2.ctx.close(); p.fermer();

  console.log('     nuit ' + nuit.n + ' px · jour ' + jour.n + ' px · nuit sans phare ' + sans.n + ' px');
  c.dit(nuit.n > sans.n * 1.6,
        'le faisceau bouge l’eau la nuit (' + (sans.n ? (nuit.n / sans.n).toFixed(1) : '∞') + 'x)');
  /* `max` d'un pixel entre deux images ne valait rien ici : les éclats sur
     l'eau le saturent à 158 des deux côtés. Ce qu'un faisceau fait, c'est
     **ajouter de la lumière** — donc c'est la clarté de l'eau qu'il faut
     lire, et son maximum sur un tour entier, puisqu'un phare éclaire par
     intermittence. La moyenne serait presque celle d'une eau sans phare :
     il ne balaie qu'un vingtième du temps. */
  console.log('     clarté sur un tour (' + nuitL.n + ' relevés) : max ' + nuitL.max +
              ' / moy ' + nuitL.moy + ' · sans phare max ' + sansL.max + ' / moy ' + sansL.moy);
  c.dit(nuitL.n >= 30, 'le tour complet a bien été échantillonné (' + nuitL.n + ' relevés)');
  c.dit(nuitL.max > sansL.max,
        'et il éclaire l’eau pour de bon (clarté max ' + nuitL.max + ' contre ' + sansL.max + ')');
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
  /* **La paire qu'on compare a été choisie sur une mesure, pas au jugé**,
     et le premier choix était mauvais.

     « rafale > beau × 1,12 » a clignoté : neuf relevés donnaient 1,14 ·
     1,15 · 1,17 · 1,17 · 1,21 · 1,22 · 1,23 · 1,25 · 1,26, et une
     exécution est tombée à **1,05**. Le seuil était posé *dans* le nuage,
     et c'est exactement ce que ce fichier interdit ailleurs.

     Pourquoi les deux sont si proches : à force 1 les feuilles balaient
     déjà presque tous leurs pixels en 1,6 s, donc doubler l'amplitude
     n'ajoute que la marge. J'ai cru pouvoir le corriger en ne comptant que
     les gros écarts — **fausse piste, mesurée** : à seuil 8 le rapport est
     de 1,22, à 50 il tombe à 1,06 et à 140 il passe sous 1. Une rafale
     élargit la zone balayée, elle ne creuse pas les écarts pixel par
     pixel. Allonger la fenêtre (1,6 s → 6,4 s) ne resserre rien non plus.

     La paire **rafale contre brume** porte la même affirmation — que
     `ventForce()` est branché dans les deux sens, 2,3 contre 0,35 — et
     elle a de la marge : 1,6 à 2,0 mesuré. Le seuil est à 1,35, entre les
     deux nuages et au bord d'aucun. */
  c.dit(surTerre.brume.total < surTerre.beau.total * 0.88,
        'la brume immobilise l’air (' + surTerre.brume.total + ' contre ' + surTerre.beau.total + ')');
  c.dit(surTerre.rafale.total > surTerre.brume.total * 1.35,
        'et la rafale le secoue bien plus qu’elle (' +
        (surTerre.rafale.total / (surTerre.brume.total || 1)).toFixed(2) + 'x)');
  // Le sens beau → rafale est **imprimé, pas affirmé** : il est vrai, mais
  // trop serré pour qu'une assertion tienne sans clignoter. Un contrôle
  // honnête montre ce qu'il ne peut pas juger.
  console.log('     rafale / beau : ' +
              (surTerre.rafale.total / (surTerre.beau.total || 1)).toFixed(2) +
              'x (trop serré pour une assertion — voir le commentaire)');
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
  /* **La clarté se lit sur une seconde, pas sur une image.** Le premier jet
     comparait deux relevés ponctuels et exigeait l'égalité exacte : il a
     rendu « 181 = 182 » et rougi, alors que rien n'avait changé. Ce qui
     traverse la boîte, ce sont les pétales du printemps et les feuilles de
     l'automne — ils passent **devant** le sol, donc ils déplacent la
     moyenne d'une unité ou deux selon l'instant.

     La moyenne sur douze relevés lisse ce qui tombe et laisse ce qui est
     posé, qui est exactement la grandeur que ces quatre assertions
     nomment. Même faute que le phare, sur une autre échelle de temps. */
  for (const q of ['ete', 'printemps', 'automne', 'hiver']) {
    const s = await servir(port++, forcer(q));
    const o = await ile(s);
    vu[q] = await clarte(o.page, SOL, { pas: 90, duree: 1080 });
    await o.ctx.close(); s.fermer();
  }
  console.log('     clarté du sol (moyenne sur ' + vu.ete.n + ' relevés) : ' +
    Object.entries(vu).map(([k, v]) => k + ' ' + v.moy).join(' · '));
  c.dit(vu.ete.n >= 10, 'chaque saison a bien été moyennée (' + vu.ete.n + ' relevés)');

  // L'hiver blanchit franchement, l'automne réchauffe à peine : les deux
  // écarts sont voulus, et c'est leur **ordre** qui dit que ça marche.
  const ecart = q => Math.abs(vu[q].moy - vu.ete.moy);
  c.dit(vu.hiver.moy > vu.ete.moy + 20,
        'l’hiver pose de la neige sur le sol (' + vu.ete.moy + ' → ' + vu.hiver.moy + ')');
  c.dit(ecart('automne') > 1,
        'l’automne teinte le sol sans le refaire (' + vu.ete.moy + ' → ' + vu.automne.moy + ')');
  c.dit(ecart('automne') < ecart('hiver'),
        'et il le fait beaucoup plus discrètement que l’hiver');
  /* Le printemps ne pose **rien** au sol — il ne fait tomber que des
     pétales, qui passent devant. C'est ce qui distingue « ajouter au
     ciel » de « toucher à la terre ».

     L'assertion est un **écart relatif** et non une égalité : des pétales
     traversent la boîte, donc la moyenne bouge d'une fraction d'unité même
     quand la terre n'a pas changé. Ce qu'on affirme est que le printemps
     touche le sol **bien moins** que l'automne, qui est le plus discret
     des deux qui y touchent vraiment. Un seuil absolu aurait rougi sur le
     passage d'un pétale ; celui-ci rougit si quelqu'un peint la terre au
     printemps. */
  c.dit(ecart('printemps') < ecart('automne') * 0.5,
        'le printemps ne touche pas au sol (écart ' + ecart('printemps').toFixed(1) +
        ' contre ' + ecart('automne').toFixed(1) + ' pour l’automne)');
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
  /* Une clé de plus dans `mondeNu()` serait une météo par île, donc la fin
     de « le même temps pour tout l'archipel ».

     On lit le **corps de la fonction**, pas la forme qu'elle avait le jour
     où ce contrôle a été écrit. La version d'avant découpait 400
     caractères à partir de `return {name:w.name` : elle a rendu « 0
     caractère » le 20/09 au soir, quand `mondeNu()` est passé à
     `const o={…}` pour n'ajouter `sol` que si on a peint. Rien de ce
     qu'elle affirme n'avait changé — seulement la ponctuation. C'est la
     faute déjà nommée pour l'accroche recopiée dans le workflow : **une
     forme recopiée dans un contrôle est une forme de trop.** */
  const nu = (src.match(/function mondeNu\(w\)\{[\s\S]*?\n\}/) || [''])[0];
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
  /* **21/09 — ce contrôle clignotait, et c'était la quatrième fois.** Trois
     exécutions d'affilée sur un dépôt **inchangé** ont rendu 1,5x · 1,5x ·
     1,7x contre un seuil à 1,5 : un vert, un rouge, un vert. Repéré comme
     le 20/09, en relançant le harnais sur le commit d'avant dans un
     worktree — un rouge qui existe déjà sur la version précédente n'est
     pas une régression, et il n'y avait rien à chercher dans le code du
     jour.

     La cause tenait aux deux défauts que ce fichier nomme déjà :

     1. **La fenêtre ne couvrait pas la période du phénomène.** 4,4 s d'un
        cycle de 11 s, donc l'aller seul, et deux pauses tombées où elles
        voulaient. À 8,8 s le relevé du côté « assis » passe de 5429–6344
        (17 % d'écart) à 11855–12092 (2 %) : c'est la mer qui scintille et
        la mouette qui passe, et il faut assez de relevés pour qu'elles se
        moyennent.
     2. **Le seuil était posé dans le nuage**, et non entre les deux. Le
        rapport vrai vaut 1,42 · 1,44 · 1,45 sur trois tours, et il vaut 1,0
        par construction quand l'hôte reste assis — les deux côtés peignent
        alors la même scène. 1,5 était **au-dessus** du nuage vrai.

     1,25 tombe entre 1,0 et 1,42, au bord d'aucun des deux. */
  const DEVANT = { x0: 0.38, y0: 0.48, x1: 0.50, y1: 0.62 };
  const TRAJET = { pas: 550, duree: 8800 };

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
  c.dit(avec.total > sans.total * 1.25,
        'l’hôte marche vraiment (' + (sans.total ? (avec.total / sans.total).toFixed(2) : '∞') + 'x)');

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

c.titre('6 ter. le village a des habitants, et une île sans bâtiment n’a rien changé');
{
  /* Six bâtiments payants posés au nord, et personne dedans : le village
     avait la silhouette et pas la vie.

     Ce qui se mesure ici est le même problème que pour l'hôte — tout bouge
     partout, donc « ça bouge » ne prouve rien. On compare la même île
     avec et **sans** `habitantsAu()`.

     La boîte `RUES` a été calibrée, pas choisie. Quatre candidates, trois
     tours chacune :

         large  1,81x    centre 1,81x    rues 1,87x    ouest 2,16 / 3,26 / 2,82x

     `ouest` l'emporte parce qu'elle serre la rue où les habitants passent
     au lieu de compter la mer et les mouettes autour. Le seuil est à
     **1,6** : l'observé va de 2,16 à 3,26 d'un côté et vaut 1,0 par
     construction de l'autre, donc il est entre les deux nuages et au bord
     d'aucun. Un contrôle qui clignote finit par ne plus être lu. */
  const VILLAGE = JSON.stringify([
    { t: 'ecole', x: 5, y: 5 }, { t: 'ferme', x: 11, y: 5 },
    { t: 'restaurant', x: 5, y: 11 }, { t: 'culte', x: 11, y: 11 },
  ]);
  const RUES = { x0: 0.28, y0: 0.34, x1: 0.48, y1: 0.62 };
  const TOUR = { pas: 400, duree: 6000 };
  const SANS_HABITANTS = src => remplacer(src,
    /function habitantsAu\(t\)\{[\s\S]*?\n  return out;\n\}/,
    'function habitantsAu(t){ return []; }');

  const ouvrir = async (s, graines) => {
    const o = await onglet(nav, { taille: { width: 1280, height: 900 },
                                  memoire: { 'test:objets': graines, 'dansisland:muet': '1' } });
    await o.page.goto(s.url, { waitUntil: 'load' });
    await attendre(2000);
    return o;
  };

  // 1. Les quatre bâtiments sont-ils vraiment posés ? Un contrôle qui ne
  //    vérifie pas avoir posé ce qu'il mesure passe au vert en ne
  //    regardant rien : c'est le défaut des neuf arbres invisibles.
  const s = await servir(8294, avecEte());
  const o = await ouvrir(s, VILLAGE);
  const clair = await codeSauvegarde(o.page);
  const poses = ['ecole', 'ferme', 'restaurant', 'culte']
    .reduce((n, k) => n + (clair.split('"' + k + '"').length - 1), 0);
  console.log('     bâtiments posés : ' + poses + ' sur 4');
  c.dit(poses === 4, 'les quatre bâtiments sont bien sur l’île');
  const avec = await chemin(o.page, RUES, TOUR);
  await o.ctx.close(); s.fermer();

  const p = await servir(8295, avecEte(SANS_HABITANTS));
  c.dit(p.pannePosee, 'la panne « personne ne sort » a bien été posée');
  const op = await ouvrir(p, VILLAGE);
  const sans = await chemin(op.page, RUES, TOUR);
  const errV = op.erreurs.length;
  await op.ctx.close(); p.fermer();

  console.log('     chemin dans la rue : ' + avec.total + ' avec · ' + sans.total + ' sans');
  c.dit(errV === 0, 'aucune erreur avec un village peuplé');
  c.dit(avec.total > sans.total * 1.6,
        'les habitants marchent vraiment (' + (sans.total ? (avec.total / sans.total).toFixed(1) : '∞') + 'x)');

  /* 2. **Une île sans bâtiment est exactement l'île d'avant**, et c'est
        l'assertion qui protège les joueurs qui n'ont rien acheté. On
        reprend le semis des autres sections — palmiers, arbres, un
        phare — qui ne porte aucun bâtiment : avec ou sans habitants, le
        relevé doit être le même à la dispersion près. */
  const t1 = await servir(8296, avecEte());
  const o1 = await ouvrir(t1, SEME);
  const nu = await chemin(o1.page, RUES, TOUR);
  await o1.ctx.close(); t1.fermer();

  const t2 = await servir(8297, avecEte(SANS_HABITANTS));
  const o2 = await ouvrir(t2, SEME);
  const nuSans = await chemin(o2.page, RUES, TOUR);
  await o2.ctx.close(); t2.fermer();

  const ecart = Math.abs(nu.total - nuSans.total) / Math.max(1, nuSans.total);
  console.log('     île sans bâtiment : ' + nu.total + ' · ' + nuSans.total
              + ' (écart ' + (ecart * 100).toFixed(0) + ' %)');
  c.dit(ecart < 0.35, 'sans bâtiment, l’île est celle d’avant — personne n’apparaît');

  /* 3. **Le repli**, et c'est ce qui compte le plus : un bâtiment au bord
        de l'île peut avoir la mer entre lui et son voisin, et un habitant
        qui marcherait sur l'eau est le défaut qu'on ne découvre qu'à la
        dix-septième île. `terre()` refusé partout doit rendre l'île
        d'avant, sans une erreur. C'est la même épreuve que pour l'hôte. */
  const q = await servir(8298, avecEte(src =>
    remplacer(src, /function cheminHabitant\(o,cible\)\{/,
              'function cheminHabitant(o,cible){ if(1) return null;')));
  c.dit(q.pannePosee, 'la panne du sol introuvable a bien été posée');
  const oq = await ouvrir(q, VILLAGE);
  const nulPart = await chemin(oq.page, RUES, TOUR);
  const errQ = oq.erreurs.length;
  await oq.ctx.close(); q.fermer();
  console.log('     sans chemin praticable : ' + nulPart.total + ' (personne ne sort)');
  c.dit(errQ === 0, 'aucune erreur quand aucun chemin n’est praticable');
  c.dit(nulPart.total < avec.total,
        'et le village retombe sur l’état d’avant plutôt que de marcher sur l’eau');
}

c.titre('6 quater. les dalles chantent quand on marche dessus');
{
  /* Le seul instrument du jeu, et on en joue **en marchant**. Trois
     risques, et ce sont eux qu'on mesure — pas « est-ce que ça fait du
     bruit », qu'aucun navigateur piloté ne peut dire : il n'y a pas de
     sortie audio ici, c'est écrit depuis le 19/09. */
  const RANG = [];
  for (let k = 0; k < 6; k++) RANG.push({ t: 'dalle', x: 8 + k, y: 10, c: '#72D6D0' });
  const DALLES = JSON.stringify(RANG);

  /* 1. **Le degré vu et le degré entendu doivent s'accorder.** La teinte
        de l'octave se décide dans `DRAW.dalle` (`haut = i>=5`) et la
        fréquence dans `noteDeDalle()` (`1+floor(i/5)`) : deux expressions
        de la même idée, donc deux listes à tenir d'accord, et c'est
        exactement ce que ce dépôt se reproche depuis le contrôle 11.

        Je l'avais écrite à **4**, et une dalle sur dix s'affichait dans
        une octave et sonnait dans l'autre. Rien ne le disait : les deux
        moitiés du défaut sont dans deux fonctions qu'on ne lit jamais
        ensemble. Le contrôle lit la source et compare les deux bornes. */
  const src = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const borneVue = (src.match(/haut\s*=\s*i\s*>=\s*(\d+)/) || [])[1];
  const borneOuie = (src.match(/1\s*\+\s*Math\.floor\(i\s*\/\s*(\d+)\)/) || [])[1];
  console.log('     octave : teinte à i>=' + borneVue + ' · note à floor(i/' + borneOuie + ')');
  c.dit(!!borneVue && !!borneOuie, 'les deux bornes de l’octave ont été lues');
  c.dit(borneVue === borneOuie,
        'la teinte bascule là où la note change d’octave (' + borneVue + ' = ' + borneOuie + ')');

  /* 2. **L'onde ne doit pas être peinte dans `DRAW.dalle`.** C'est la règle
        déjà écrite pour le scintillement du coffre et pour le vent :
        `dessinDe()` peint aussi les vignettes de l'atelier et de la
        vitrine, et un dessin qui porte son état ne peut plus servir
        d'icône.

        **Mon premier contrôle mesurait la vignette dans le navigateur, et
        il ne valait rien.** Il ouvrait l'atelier, relevait le canvas deux
        fois à 700 ms d'écart et vérifiait qu'il n'avait pas bougé — vert.
        Puis la panne, qui peint l'onde dans `DRAW.dalle`, l'a laissé vert
        aussi : **les vignettes sont peintes une seule fois**, à la
        construction du panneau, donc rien ne les repeint jamais. Le
        contrôle demandait « est-ce que ça bouge ? » à une image qui ne
        peut pas bouger.

        C'est la leçon du contrôle 12, prise dans l'autre sens : là-bas
        une regex ne pouvait pas voir ce qu'un moteur CSS calcule, ici le
        navigateur ne peut pas montrer ce qui n'est peint qu'une fois.
        **C'est la panne qui l'a dit, pas la relecture** — et c'est
        exactement ce pour quoi ce dépôt fabrique ses pannes.

        Ce qui se vérifie vraiment, c'est **d'où l'onde est appelée**, et
        ça se lit dans la source. Le risque réel n'était d'ailleurs pas une
        vignette qui tremble, c'était une vignette avec une onde figée
        dessus. */
  const corpsDalle = (s2) => (s2.match(/\n  dalle\(c,C,etat\)\{[\s\S]*?\n  \},\n/) || [''])[0];
  const dans = corpsDalle(src);
  c.dit(dans.length > 400, 'le corps de DRAW.dalle a été lu (' + dans.length + ' caractères)');
  c.dit(!/onde\s*\(/.test(dans), 'et il n’appelle pas onde() — la vignette ne peut pas la porter');
  c.dit(/if\(dalleFrappee[\s\S]{0,200}onde\(ctx/.test(src),
        'c’est drawWorld() qui la peint, sur la seule dalle qu’on vient de frapper');

  /* La panne : l'onde peinte **dans** le dessin de l'objet, c'est-à-dire
     le défaut exact que la règle interdit. On la pose sur la source et on
     relit le corps : le contrôle doit rougir. Pas besoin de navigateur —
     ce qu'on affirme est une propriété du code, comme les deux bornes de
     l'octave ci-dessus. */
  const casse = remplacer(src,
    /      const u = n===1 \? 0 : -0\.36 \+ 0\.72\*k\/\(n-1\);/,
    '      const u = n===1 ? 0 : -0.36 + 0.72*k/(n-1);\n      onde(c,0);');
  c.dit(/onde\s*\(/.test(corpsDalle(casse)),
        'et la panne qui l’y remet fait bien rougir ce contrôle');

  /* 3. **Marcher sur les dalles n'écrit rien.** L'onde elle-même a été
        jugée à l'œil, sur une capture — il n'y a pas d'assertion sur
        « est-ce joli », et celle que j'avais écrite (comparer le chemin
        parcouru sur la rangée avec et sans les dalles) rendait 0,95x : un
        liseré blanc sur une case pèse bien moins que le bonhomme qui
        traverse la boîte. Un contrôle qui mesure surtout autre chose ne
        dit rien, et il valait mieux le retirer que le desserrer.

        Ce qui se mesure ici est l'invariant qui compte : `dalleSous` et
        `dalleFrappee` sont du transitoire, donc rien de l'instrument ne
        doit entrer en base.

        **Et ça ne se mesure pas en comparant le code de sauvegarde entier**,
        ce que mon premier jet faisait. Marcher **tond l'herbe** : le
        bonhomme coupe les touffes qu'il traverse, `tondre()` écrit
        `mine.tiles` et appelle `saveMine()`. Le code change donc à chaque
        pas, et le contrôle rougissait en accusant les dalles de ce que
        faisait la tondeuse. C'est mot pour mot le piège déjà écrit le
        19/09 pour le coffre — « il passait parce qu'en marchant le
        bonhomme tondait une touffe » — repris par l'autre bout.

        On compare donc ce que les dalles pourraient toucher, et rien
        d'autre : **la liste des clés**, et **la liste des objets**. Les
        tuiles ont le droit de bouger ; elles appartiennent à la tondeuse. */
  const s3 = await servir(8303, avecEte());
  const o = await onglet(nav, { taille: { width: 1280, height: 900 },
                                memoire: { 'test:objets': DALLES, 'dansisland:muet': '1' } });
  await o.page.goto(s3.url, { waitUntil: 'load' });
  await attendre(1800);
  const lire = async () => {
    const j = JSON.parse(await codeSauvegarde(o.page));
    return { cles: Object.keys(j).sort().join(' '), objets: JSON.stringify(j.o) };
  };
  const avant = await lire();
  const posees = (avant.objets.match(/"dalle"/g) || []).length;
  await o.page.keyboard.down('ArrowDown'); await o.page.keyboard.down('ArrowRight');
  await attendre(1800);
  await o.page.keyboard.up('ArrowDown'); await o.page.keyboard.up('ArrowRight');
  const apres = await lire();
  const errD = o.erreurs.length;
  await o.ctx.close(); s3.fermer();
  console.log('     dalles posées : ' + posees + ' sur 6 · clés : ' + apres.cles);
  c.dit(posees === 6, 'les six dalles sont bien sur l’île');
  c.dit(errD === 0, 'marcher dessus ne lève aucune erreur');
  c.dit(avant.cles === apres.cles, 'et n’ajoute aucune clé au code de sauvegarde');
  c.dit(avant.objets === apres.objets,
        'ni un octet aux objets — la note et l’onde sont du transitoire');
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
  c.dit(!/vent|meteo|saison|habitant/.test(cles),
        'et aucune clé de vent, de météo, de saison ni d’habitant n’est apparue dans mondeNu()');
}

await nav.close();
process.exit(c.fin() ? 1 : 0);
