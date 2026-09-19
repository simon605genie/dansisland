/* Aucun panneau ne doit montrer de balise en clair.

   Trouvé le 19/09/2026 dans l'onglet Voisins :

     Il te manque <b>un bout de bois flotté</b> et <b>une bouteille…

   — les `</b>` s'affichaient dans la phrase. La cause était une jointure
   échappée **avec** son propre balisage : `esc(m.join('</b> et <b>'))` au
   lieu de `m.map(esc).join('</b> et <b>')`. Deux endroits l'avaient, et
   une troisième ligne du même fichier le faisait déjà dans le bon ordre.

   Ce contrôle attrape toute la famille, pas seulement ces deux lignes : il
   lit le **texte rendu** de chaque panneau et y cherche ce qui ressemble à
   une balise. Le jeu n'en écrit aucune légitimement.

   Éprouvé contre le défaut d'origine : en le remettant, ce harnais échoue.
   Un premier essai lisait `.panel:not([hidden])`, ce qui rendait une
   chaîne vide et passait sur du code cassé — un test qui ne tombe pas sur
   le bug qu'il vise ne vaut rien. */
import { navigateur, servir, onglet, compteur, attendre } from './aide.mjs';

const s = await servir(8151);
const nav = await navigateur();
const c = compteur();
const { ctx, page, erreurs } = await onglet(nav, { taille: { width: 1280, height: 1000 } });
await page.goto(s.url, { waitUntil: 'load' });
await attendre(2500);

const BALISE = /<\/?[a-zA-Z][^>]*>/;

for (const nom of ['moi', 'maison', 'ile', 'voisins', 'boutique']) {
  await page.evaluate(o => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === o);
    if (b) b.click();
  }, nom);
  await attendre(600);
  // `offsetParent` et non `[hidden]` : c'est ce qui est **visible** qui
  // compte, et c'est là que le premier essai s'est trompé.
  const txt = await page.evaluate(() =>
    [...document.querySelectorAll('.panel')].filter(p => p.offsetParent !== null)
      .map(p => p.innerText).join('\n'));
  const m = txt.match(BALISE);
  c.dit(txt.length > 100, 'panneau « ' + nom + ' » — il y a bien du texte à lire (' + txt.length + ')');
  c.dit(!m, 'panneau « ' + nom + ' » — aucune balise en clair' + (m ? ' → trouvé « ' + m[0] + ' »' : ''));
}
c.dit(erreurs.length === 0, 'aucune erreur de console' + (erreurs.length ? ' → ' + erreurs[0] : ''));

await ctx.close(); await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
