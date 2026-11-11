/* Le Reel « vrai jeu ». Cinq plans, et dans chacun il se passe quelque chose
   qu'on peut nommer : il pose, il marche, il entre. Le texte du jeu reste à
   l'écran — onglets, plaques, murmure — parce que c'est lui qui dit ce que
   c'est.

   Trois choses mesurées plutôt que supposées, et chacune a cassé une version :
     · **on pose avant de marcher.** La caméra suit le bonhomme, donc marcher
       d'abord décentre l'île pour tous les plans suivants ;
     · **les cases visées se demandent au jeu** (`__case`). Des fractions de
       cadre écrites en dur tombent dans l'eau dès que la caméra a bougé, et
       le Reel affiche alors « Le large ne t'appartient pas encore » ;
     · **on entre en marchant sur le seuil**, pas par un bouton. Mesuré :
       `ArrowLeft` depuis la position de départ fait entrer à 1,33 s. C'est le
       vrai geste du jeu, et il amène sa propre phrase dans le murmure. */
import { fabriquer, casesLibres, pointDeCase } from './scene.mjs';
import { attendre } from '../../test/aide.mjs';
import { MAISON } from '../maquettes.mjs';

const haut = p => p.evaluate(() => window.scrollTo(0, 0));
const dire = (p, gros, petit) => p.evaluate(([g, s]) => window.__bandeau(g, s), [gros, petit]);

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

/* Caler le panneau sur le pinceau armé, en haut de ce qu'on voit de lui.
   `scrollIntoView` centre dans le conteneur de défilement, pas dans la
   fenêtre : le panneau n'en montre que 170 px et les vignettes tombaient
   sous le bord. On pose donc le décalage à la main. */
const caler = p => p.evaluate(() => {
  const el = document.querySelector('.obj[aria-pressed="true"]');
  const boite = el?.closest('.panel');
  if (el && boite)
    boite.scrollTop += el.getBoundingClientRect().top - boite.getBoundingClientRect().top - 10;
  window.scrollTo(0, 0);
});

let cibles = [], entreA = -1;

await fabriquer({
  nom: 'dansisland-reel',
  memoire: {
    'dansisland:shells1': '1',                    // la note des premiers shells déplace la mise en page
    'test:interieur': JSON.stringify(MAISON),     // sinon on promet des pièces à meubler devant un plancher nu
  },
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
        await haut(p);                      // la puce a fait défiler : on remonte AVANT de relever
        const c = await p.evaluate(() => window.__seuil());
        const q = await pointDeCase(p, c.x, c.y);
        await p.mouse.click(q.sx, q.sy);
        await haut(p);
        const t = await p.evaluate(() => window.__outil());
        if (!t.cible) throw new Error('le clic n’a posé aucune cible : la page a-t-elle défilé ?');
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
    {
      nom: 'fin', duree: 1.6,
      async avant(p) {
        console.log('entré dans la maison à l’image', entreA, `(${(entreA / 24).toFixed(2)}s du plan)`);
        await p.evaluate(() => window.__fin('Gratuit.<br>Rien à installer.', 'dès 6 ans · sans compte', true));
      },
    },
  ],
});
