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

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
