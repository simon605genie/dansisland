/* ============================================================
   Les Reels de Dan's Island. Un fichier, sept films, un moteur.

       node fabrique.mjs            tous
       node fabrique.mjs nuit chien   ceux-là

   Chacun montre **le vrai jeu** : ses panneaux, ses plaques, son murmure,
   et un geste qu'on peut nommer. Rien n'est simulé — les états rares
   (marée basse, pluie, nuit) sont forcés comme `test/vivant.mjs` les force,
   par une panne sur le fichier servi, jamais par un dessin truqué.

   Et chacun **se vérifie** : un Reel qui promet des habitants qui saluent
   échoue si personne n'a parlé. C'est la règle de ce dépôt — une mesure
   qui ne vérifie pas qu'elle regarde la bonne chose passe au vert en ne
   regardant rien.
   ============================================================ */
import { fabriquer, haut, dire, carte, caler, allerA, casesLibres } from './scene.mjs';
import { attendre, remplacer } from '../../test/aide.mjs';
import { MAISON } from '../maquettes.mjs';

/* `test:objets` **remplace** la liste des objets de l'île : un Reel qui sème
   un phare et rien d'autre filme une île nue. On resème donc le décor. */
const DECOR = [
  { t: 'palmier', x: 6, y: 7 }, { t: 'arbre', x: 11, y: 7 }, { t: 'sapin', x: 13, y: 7 },
  { t: 'buisson', x: 6, y: 11 }, { t: 'fleur', x: 11, y: 12 }, { t: 'rocher', x: 5, y: 9 },
  { t: 'banc', x: 9, y: 11 }, { t: 'coffre', x: 7, y: 12 },
];
const MEUBLES = JSON.stringify(MAISON);
const objets = (...sup) => JSON.stringify(DECOR.concat(sup));

/* Le temps qu'il fait devient pilotable depuis la page. Une seule panne pour
   les deux plans de « pluie » : la tranche de pluie, puis la belle qui la
   suit, dont l'arc-en-ciel se déduit. */
const forcerTemps = src => remplacer(src, /function meteoDe\(n\)\{[\s\S]*?\n\}/,
  "function meteoDe(n){ return window.__temps ? window.__temps(n) : 'beau'; }");

const dit = (murmures, re, quoi) => {
  if (!murmures.some(m => re.test(m)))
    throw new Error(`le jeu n'a jamais dit ${quoi} : le Reel montre autre chose que ce qu'il annonce`);
  console.log(`✅ ${quoi} — dit à l'écran`);
};

const FIN = (t, s) => ({ nom: 'fin', duree: 1.6, avant: p => carte(p, t, s) });
const OUVRIR = (p, n) => p.click(`.tabs button:nth-child(${n})`);

// ─────────────────────────────────────────────── l'île, et ce qu'on y fait
/* Quatre cases bien écartées plutôt que les quatre premières : quatre objets
   posés côte à côte ne se lisent pas comme « on construit son île ». */
function ecartees(pts0, n) {
  /* On préfère le centre du cadre : un palmier posé sur le bord est à moitié
     caché par la plaque ou par le pad, et la pose ne se lit pas. */
  const xs = pts0.map(q => q.sx), ys = pts0.map(q => q.sy);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2, ry = (Math.max(...ys) - Math.min(...ys)) / 2;
  const centre = pts0.filter(q => ((q.sx - cx) / (rx * 0.72)) ** 2 + ((q.sy - cy) / (ry * 0.72)) ** 2 <= 1);
  const pts = centre.length >= n + 2 ? centre : pts0;
  const pris = [pts[Math.floor(pts.length / 2)]];
  while (pris.length < n) {
    let best = null, bd = -1;
    for (const q of pts) {
      if (pris.includes(q)) continue;
      const d = Math.min(...pris.map(r => Math.hypot(r.sx - q.sx, r.sy - q.sy)));
      if (d > bd) { bd = d; best = q; }
    }
    pris.push(best);
  }
  return pris;
}

const armer = async (p, nom) => {
  await p.locator('.obj', { hasText: new RegExp('^' + nom + '$') }).first().click();
  await attendre(120);
  /* Le panneau garde sa propre position de défilement (`buildAll()`, 16/09).
     Sans ça il restait calé sur les pastilles de peinture, et on ne voyait
     jamais le pinceau qu'on vient d'armer. */
  await caler(p);
};

let cibles = [], entreA = -1;

const ile = {
  nom: 'ile', onglet: 1, port: 8230,
  scenes: [
    {
      nom: 'accroche', duree: 1.8,
      async avant(p) { await dire(p, 'Pas de score.', 'Pas de minuteur. Pas de partie perdue.'); await haut(p); },
      async pendant(p, k, n) {
        if (k === Math.round(n * 0.45))
          await dire(p, '<em>Personne ne perd.</em>', 'Une île à toi, dans le navigateur.');
      },
    },
    {
      nom: 'poser', duree: 3.6,
      async avant(p) {
        await dire(p, 'Tu poses<br>ce que tu veux.', 'Et tu reviens en arrière quand tu veux.');
        await p.click('.tabs button:nth-child(3)');              // Île
        await attendre(250);
        await armer(p, 'Palmier');
        const libres = await casesLibres(p, 8);
        cibles = ecartees(libres, 4);
        console.log('cases visées :', cibles.map(c => `(${c.tx},${c.ty})`).join(' '));
      },
      async pendant(p, k) {
        const quand = [8, 26, 48, 66];
        const i = quand.indexOf(k);
        if (i === 2) await armer(p, 'Fleur');                    // on change de pinceau à mi-plan
        /* On recale après chaque pose : poser reconstruit le panneau, et le
           pinceau armé doit rester sous les yeux pendant tout le plan. */
        if (i >= 0) { await p.mouse.click(cibles[i].sx, cibles[i].sy); await caler(p); }
      },
    },
    {
      nom: 'marche', duree: 2.2,
      async avant(p) { await dire(p, 'Tu marches,<br>c’est tout.', 'Les flèches, ou le doigt sur l’écran.'); await haut(p); },
      async pendant(p, k, n) {
        if (k === 0) await p.keyboard.down('ArrowUp');
        if (k === Math.round(n * 0.5)) { await p.keyboard.up('ArrowUp'); await p.keyboard.down('ArrowDown'); }
        if (k === n - 2) await p.keyboard.up('ArrowDown');
      },
    },
    {
      nom: 'entrer', duree: 4.0,
      async avant(p) {
        await dire(p, 'Et tu entres<br>chez toi.', 'Trois pièces, à meubler comme tu veux.');
        /* On rend la main, puis on clique sa porte : le bonhomme y va tout
           seul et le seuil le fait entrer. Tenir une flèche ne marchait que
           depuis la case de départ — et le plan vient après une marche. */
        await p.locator('#p-ile .chip', { hasText: /Marcher/ }).first().click();
        await attendre(150);
        const c = await p.evaluate(() => window.__seuil());
        await allerA(p, c.x, c.y);          // `allerA` remonte, vise et vérifie la cible
        console.log(`seuil visé : case (${c.x},${c.y})`);
      },
      async pendant(p, k, n) {
        if (entreA >= 0 && k === entreA + 42) {
          await p.locator('#p-maison .chip', { hasText: /Chambre/ }).first().click();
          await attendre(150); await haut(p);
        }
        if (entreA < 0) {
          if (await p.evaluate(() => window.__ou().dedans)) { entreA = k; await haut(p); }
          if (entreA < 0 && k === n - 8) throw new Error('le bonhomme n’est jamais entré : le plan ne montre pas ce qu’il annonce');
        }
      },
    },
    FIN('Gratuit.<br>Rien à installer.', 'dès 6 ans · sans compte'),
  ],
  verifier: ({ murmures }) => {
    console.log('entré dans la maison à l’image', entreA, 'du plan');
    dit(murmures, /Te voil|salon/i, 'qu’on est bien entré chez soi');
  },
};

// ────────────────────────────────────────────────────────────── la marée
const maree = {
  nom: 'maree', onglet: 3, port: 8231,
  memoire: { 'test:maree': JSON.stringify({ phase: 0, numero: 1000 }) },
  scenes: [
    { nom: 'accroche', duree: 1.8,
      async avant(p) { await dire(p, 'La mer se retire.', 'Deux fois par jour, comme la vraie.'); await haut(p); } },
    { nom: 'ramasser', duree: 4.6,
      async avant(p) {
        /* La laisse se demande au jeu : ce qu'elle dépose se déduit du numéro
           de marée, donc l'écrire en dur ici serait une seconde liste. */
        const l = await p.evaluate(() => window.__laisse());
        if (!l.length) throw new Error('la marée n’a rien déposé : le plan n’a rien à ramasser');
        const o = await p.evaluate(() => window.__ou());
        /* On prend la plus proche **qu'on puisse atteindre d'un clic** : le
           pad de marche recouvre le bas du cadre, donc une trouvaille plein
           sud n'est pas cliquable même quand elle est là. */
        l.sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y));
        let but = null;
        for (const c of l) { try { await allerA(p, c.x, c.y); but = c; break; } catch (e) {} }
        if (!but) throw new Error('aucune trouvaille n’est atteignable d’un clic : ' + JSON.stringify(l));
        console.log('trouvaille visée :', but.t, `(${but.x},${but.y})`);
      },
      async pendant(p, k, n) {
        if (process.env.TRACE && k % 24 === 0)
          console.log('  k=' + k, JSON.stringify(await p.evaluate(() => ({ ...window.__ou(), ...window.__outil() }))));
        if (k === Math.round(n * 0.42))
          await dire(p, 'Et elle laisse<br>des choses.', 'On les ramasse en marchant. Rien à cliquer.');
      } },
    FIN('Gratuit.<br>Rien à installer.', 'dès 6 ans · sans compte'),
  ],
  verifier: ({ murmures }) => dit(murmures, /shell|sac|ramass/i, 'qu’on a ramassé quelque chose'),
};

// ────────────────────────────────────────────────────── la nuit, le phare
const nuit = {
  nom: 'nuit', onglet: 3, port: 8232,
  memoire: { 'test:objets': objets({ t: 'phare', x: 12, y: 10 }) },
  scenes: [
    { nom: 'jour', duree: 1.8,
      async avant(p) { await dire(p, 'Ton île<br>a un phare.', 'Le jour, il ne sert à rien.'); await haut(p); } },
    { nom: 'bascule', duree: 1.2,
      async avant(p) {
        await dire(p, 'Et puis<br>tu passes à la nuit.', 'Un bouton. Rien d’autre.');
        await OUVRIR(p, 3);
        await attendre(250);
        await p.locator('#p-ile .chip', { hasText: /^Nuit$/ }).first().click();
        await attendre(250); await haut(p);
        if (await p.evaluate(() => window.__ciel()) !== 'nuit')
          throw new Error('le ciel n’est pas passé à la nuit');
      } },
    { nom: 'balayage', duree: 4.2,
      async avant(p) { await dire(p, '<em>Il balaie la mer.</em>', 'Et les constellations sortent.'); await haut(p); } },
    FIN('Gratuit.<br>Rien à installer.', 'dès 6 ans · sans compte'),
  ],
};

// ─────────────────────────────────────────── la pluie, puis l'arc-en-ciel
const pluie = {
  nom: 'pluie', onglet: 3, port: 8233, panne: forcerTemps,
  memoire: { 'test:maree': JSON.stringify({ phase: 0.25, numero: 1000 }), 'test:objets': objets() },
  scenes: [
    { nom: 'pluie', duree: 3.2,
      async avant(p) {
        await p.evaluate(() => { window.__temps = () => 'pluie'; });
        await dire(p, 'Il pleut<br>sur ton île.', 'Il n’y a rien à faire. C’est le but.'); await haut(p);
      } },
    { nom: 'arc', duree: 3.8,
      async avant(p) {
        /* L'arc-en-ciel n'est pas un temps : il se **déduit** d'une belle
           tranche qui suit une tranche de pluie. On fait donc alterner les
           tranches, et la phase de marée semée met la demi-tranche au
           maximum de l'arche. */
        await p.evaluate(() => { window.__temps = n => (n % 2 ? 'beau' : 'pluie'); });
        await dire(p, 'Puis il ne pleut plus.', 'Et quelquefois, il y a ça.'); await haut(p);
      },
      /* `meteoNow` ne se met à jour que dans `avancerMeteo()`, donc dans une
         image. L'horloge étant pilotée, lire l'arc juste après avoir changé
         le temps rend toujours zéro : on attend que le jeu ait tourné. */
      async pendant(p, k) {
        if (k !== 3) return;
        const a = await p.evaluate(() => window.__arc());
        if (!(a > 0.5)) throw new Error(`pas d’arc-en-ciel à l’écran (force ${a}) : le plan ne montre pas ce qu’il annonce`);
        console.log('force de l’arc-en-ciel :', a.toFixed(2));
      } },
    FIN('Gratuit.<br>Rien à installer.', 'dès 6 ans · sans compte'),
  ],
};

// ──────────────────────────────────────────── le village et ses habitants
const village = {
  nom: 'village', onglet: 3, port: 8234,
  memoire: { 'test:objets': objets(
    { t: 'ecole', x: 4, y: 9 }, { t: 'restaurant', x: 12, y: 9 },
    { t: 'ferme', x: 5, y: 6 }, { t: 'coiffeur', x: 12, y: 6 }) },
  scenes: [
    { nom: 'batir', duree: 2.2,
      async avant(p) { await dire(p, 'Tu peux bâtir<br>un village.', 'Une école, une ferme, un restaurant.'); await haut(p); } },
    { nom: 'habitants', duree: 5.4,
      async avant(p) { await dire(p, '<em>Et des gens y habitent.</em>', 'Ils se rendent visite. Et ils te saluent.'); await haut(p); } },
    FIN('Gratuit.<br>Rien à installer.', 'dès 6 ans · sans compte'),
  ],
  verifier: ({ murmures }) => dit(murmures, /fait signe|Je vais voir/i, 'qu’un habitant te salue'),
};

// ────────────────────────────────────────────────────────────── le chien
let suivis = 0, rates = 0;
const chien = {
  nom: 'chien', onglet: 1, port: 8235,
  memoire: { 'test:objets': objets({ t: 'chien', x: 8, y: 9 }) },
  scenes: [
    { nom: 'trouver', duree: 2.0,
      async avant(p) { await dire(p, 'Il y a un chien.', 'Sous tes pieds. Appuie sur E.'); await haut(p); } },
    { nom: 'sortir', duree: 5.4,
      async avant(p) {
        await dire(p, '<em>Et il faut le sortir.</em>', 'Il t’attend. Il ne gronde jamais.');
        await p.keyboard.press('e'); await attendre(200); await haut(p);
        if (!await p.evaluate(() => window.__chien()))
          throw new Error('la balade n’a pas commencé : E n’a pas pris');
      },
      async pendant(p, k) {
        /* On suit le chien plutôt que de tenir une flèche : il choisit son
           chemin, et un bonhomme planté le fait s'asseoir. On vise
           `balade.x/y`, sa position **dessinée** — `balade.o` garde sa case
           toute la balade, et la viser revenait à ne pas bouger du tout. */
        if (k > 0 && k % 16 === 0) {
          const c = await p.evaluate(() => window.__chien());
          if (c) { suivis++; try { await allerA(p, Math.floor(c.x), Math.floor(c.y)); } catch (e) { rates++; } }
        }
      } },
    FIN('Gratuit.<br>Rien à installer.', 'dès 6 ans · sans compte'),
  ],
  verifier: ({ murmures }) => {
    console.log(`suivi du chien : ${suivis} visées, ${rates} hors d'atteinte`);
    dit(murmures, /part devant/i, 'que la balade a commencé');
  },
};

// ──────────────────────────────────────────────────── la visite, et le mot
const voisins = {
  nom: 'voisins', onglet: 4, port: 8236,
  scenes: [
    { nom: 'archipel', duree: 2.0,
      async avant(p) {
        await dire(p, 'Et tu vas marcher<br>chez les autres.', 'Vingt îles, et celles de tes copains.');
        await haut(p);
      } },
    { nom: 'visite', duree: 3.0,
      async avant(p) {
        await p.locator('.neighbor button:has-text("Visiter")').first().click();
        await attendre(1600); await haut(p);
        await dire(p, 'Tu débarques<br>devant sa porte.', 'Son île est à lui. Pas de score non plus.');
        /* On l'écarte des objets avant le plan suivant : debout sur une
           fleur, `proximity()` réécrit la bulle à chaque image et recouvre
           le « Mot planté » avant qu'on ait pu le lire. C'est le défaut que
           ce dépôt nomme depuis le 18/09. */
        const libres = await casesLibres(p, 4);
        await allerA(p, libres[Math.floor(libres.length / 2)].tx, libres[Math.floor(libres.length / 2)].ty);
      } },
    { nom: 'mot', duree: 4.0,
      async avant(p) {
        await dire(p, 'Tu lui laisses<br>un mot.', 'Et son île gagne un cran de terre.');
        /* Le champ du livre d'or est un `input`, pas un `textarea` — le seul
           `textarea` de la page est le code de sauvegarde, dans un autre
           panneau, et le remplir ne plantait rien. On prend donc le champ du
           **même `.field`** que le bouton. */
        const bouton = await trouverPlanter(p);
        const champ = p.locator('.field:has(button:has-text("Planter le mot")) input[type="text"]').first();
        await champ.fill('Ton île est trop belle ! Passe voir la mienne.');
        await haut(p); await attendre(200);
        await bouton.click();
        await attendre(500); await haut(p);
      } },
    FIN('Gratuit.<br>Rien à installer.', 'dès 6 ans · sans compte'),
  ],
  verifier: ({ murmures }) => dit(murmures, /Mot plant/i, 'que le mot est planté'),
};

/* Le livre d'or ne vit pas dans le même onglet selon où l'on est : on
   cherche plutôt que de recopier un numéro d'onglet qui se périmera. */
async function trouverPlanter(p) {
  for (const n of [3, 4, 2, 5, 1]) {
    await OUVRIR(p, n); await attendre(300);
    const b = p.locator('button:has-text("Planter le mot")');
    if (await b.count() && await b.first().isVisible()) return b.first();
  }
  throw new Error('« Planter le mot » introuvable : le plan ne peut pas montrer ce qu’il annonce');
}

const TOUS = { ile, maree, nuit, pluie, village, chien, voisins };

const veut = process.argv.slice(2);
const liste = veut.length ? veut : Object.keys(TOUS);
for (const k of liste) {
  const r = TOUS[k];
  if (!r) { console.error(`Reel inconnu : ${k} (${Object.keys(TOUS).join(', ')})`); process.exit(1); }
  console.log('\n══════ ' + k + ' ══════');
  await fabriquer({ nom: 'reel-' + r.nom, scenes: r.scenes, port: r.port, panne: r.panne,
    verifier: r.verifier, onglet: r.onglet,
    memoire: { 'dansisland:shells1': '1', 'test:interieur': MEUBLES, ...(r.memoire || {}) } });
}
