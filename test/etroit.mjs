/* Les deux tailles que ce dépôt exige de vérifier avant de croire que ça
   tient : **360 px** en portrait et **780x360** en paysage court.

   Ce ne sont pas des tailles au hasard. À trois plaques dans le bandeau et
   360 px, le bouton Son passait à la ligne et se posait sur le ciel ; à
   cinq onglets dans 235 px, « Boutique » était coupé ; en paysage court,
   `.objs` en quatre colonnes de 60 px débordait d'une colonne de 210 px
   utiles et la quatrième vignette sortait de l'écran. Les trois sont
   corrigés — ce harnais est là pour qu'ils ne reviennent pas. */
import { navigateur, servir, onglet, compteur, attendre } from './aide.mjs';

const s = await servir(8152);
const nav = await navigateur();
const c = compteur();

for (const [nom, width, height] of [['portrait 360', 360, 780], ['paysage court 780x360', 780, 360]]) {
  c.titre(nom);
  const { ctx, page, erreurs } = await onglet(nav, { taille: { width, height }, tactile: true });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(1800);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'ile');
    if (b) b.click();
  });
  await attendre(700);

  const r = await page.evaluate(() => {
    const f = [...document.querySelectorAll('.field')].find(x => /Ambiance sonore/.test(x.textContent));
    const puces = f ? [...f.querySelectorAll('.chip')] : [];
    const deborde = puces.filter(b => {
      const r = b.getBoundingClientRect(), p = b.parentElement.getBoundingClientRect();
      return r.right > p.right + 1 || r.left < p.left - 1;
    }).length;
    const vignettes = [...document.querySelectorAll('.objs canvas')].filter(v => {
      const r = v.getBoundingClientRect();
      return r.right > document.documentElement.clientWidth + 1;
    }).length;
    return {
      puces: puces.length, deborde, vignettes,
      pageX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      onglets: [...document.querySelectorAll('.tabs button')].some(b => b.scrollWidth > b.clientWidth + 1),
    };
  });

  c.dit(r.puces === 5, 'les cinq ambiances sont là');
  c.dit(r.deborde === 0, 'aucune puce d’ambiance ne sort de sa rangée');
  c.dit(r.vignettes === 0, 'aucune vignette d’objet ne sort de l’écran');
  c.dit(r.pageX <= 0, 'aucun débordement horizontal de la page (' + r.pageX + ' px)');
  c.dit(!r.onglets, 'aucun onglet n’a son texte coupé');
  c.dit(erreurs.length === 0, 'aucune erreur de console' + (erreurs.length ? ' → ' + erreurs[0] : ''));
  await ctx.close();
}

/* Et une largeur qui n'est pas étroite du tout, pour la raison qui a fait
   ajouter cette section : **ce qui serre le bandeau du guide, c'est la
   colonne de droite, pas la fenêtre.** Elle fait 360 px sur un écran de
   1280, donc une règle en `@media (max-width:520px)` ne s'y déclenche
   jamais — et c'est exactement là que « Passer » tombait seul, 47 px sous
   « Suivant », avec un bandeau à 105 px de haut.

   Un harnais qui n'éprouve que les tailles étroites ne pouvait pas le
   voir : il mesurait la fenêtre, comme la règle fautive. On regarde donc
   les deux bouts. */
c.titre('le bandeau du guide, du téléphone au grand écran');
for (const [nom, width, height, tactile] of [['grand écran 1280', 1280, 900, false],
                                             ['portrait 390', 390, 844, true],
                                             ['portrait 360', 360, 780, true],
                                             ['paysage court 780x360', 780, 360, true]]) {
  const { ctx, page, erreurs } = await onglet(nav, {
    taille: { width, height }, tactile,
    // Un vrai premier arrivant : le guide n'a pas commencé, l'accueil non
    // plus. `aide.mjs` sème `guide:4` par défaut pour que le bandeau ne
    // gêne pas les autres harnais — ici, c'est justement lui qu'on veut.
    memoire: { 'dansisland:guide': '0', 'dansisland:entre': '0' },
  });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2000);
  await page.evaluate(() => { const b = document.getElementById('acc-creer'); if (b) b.click(); });
  await attendre(800);

  const r = await page.evaluate(() => {
    const g = document.getElementById('guide');
    if (!g || g.hidden) return null;
    const bs = [...g.querySelectorAll('button')].map(e => ({
      t: Math.round(e.getBoundingClientRect().top), txt: e.textContent.trim() }));
    const W = document.documentElement.clientWidth;
    return { n: bs.length, txt: bs.map(b => b.txt).join('/'),
             ecart: bs.length === 2 ? Math.abs(bs[0].t - bs[1].t) : -1,
             haut: Math.round(g.getBoundingClientRect().height),
             hors: [...g.children].filter(e => {
               const b = e.getBoundingClientRect();
               return b.width > 0 && (b.right > W + 1 || b.left < -1); }).length };
  });
  console.log('     ' + nom.padEnd(22) + ' bandeau ' + (r ? r.haut + ' px, boutons ' + r.txt +
              ', écart vertical ' + r.ecart + ' px' : '(absent)'));
  c.dit(!!r, nom + ' — le bandeau du guide est là au premier pas');
  c.dit(r && r.n === 2, nom + ' — ses deux boutons sont là');
  c.dit(r && r.ecart < 6, nom + ' — « Suivant » et « Passer » sur la même rangée (' +
        (r ? r.ecart : '?') + ' px)');
  c.dit(r && r.hors === 0, nom + ' — rien du bandeau ne sort de l’écran');
  c.dit(erreurs.length === 0, nom + ' — aucune erreur de console');
  await ctx.close();
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
