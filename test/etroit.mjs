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

/* « Voisins » doit montrer des voisins.

   Mesuré le 19/09 : la commande, la carte postale et l'invitation faisaient
   ensemble plus de 500 px, et la première île tombait à y=670 dans un
   panneau qui en montre 660 — hors de vue sur grand écran comme en
   portrait. On ouvrait l'onglet et on n'y voyait aucune île, au moment
   précis où le quatrième pas du guide dit « va marcher sur l'île d'un
   autre ». C'est le défaut déjà corrigé pour le bloc Compagnon.

   Deux mesures, et elles ne disent pas la même chose : **l'ordre** des
   blocs vaut à toutes les tailles, la **visibilité sans défiler** dépend de
   la place. En paysage court le panneau ne fait que 73 px de haut — rien
   n'y tient, et ce n'est pas cet ordre-là qui le décidera. */
c.titre('l’onglet Voisins montre des voisins');
for (const [nom, width, height, tactile, voitSansDefiler] of [
  ['grand écran 1280', 1280, 900, false, true],
  ['portrait 390', 390, 844, true, true],
  ['portrait 360', 360, 780, true, true],
  ['paysage court 780x360', 780, 360, true, false]]) {
  const { ctx, page, erreurs } = await onglet(nav, { taille: { width, height }, tactile });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
    if (b) b.click();
  });
  await attendre(700);

  const r = await page.evaluate(() => {
    const p = document.getElementById('p-voisins');
    if (!p) return null;
    const y0 = p.getBoundingClientRect().top;
    const rang = t => {
      const e = [...p.children].find(x => new RegExp(t, 'i').test(x.textContent || ''));
      return e ? Math.round(e.getBoundingClientRect().top - y0) : -1;
    };
    const nb = p.querySelector('.neighbor');
    const b = nb ? nb.getBoundingClientRect() : null;
    return { commande: rang('La commande du jour'), archipel: rang('archipel'),
             carte: rang('Ta carte postale'), invite: rang('Inviter quelqu'),
             ile: b ? Math.round(b.top - y0) : -1,
             visible: b ? (b.top >= 0 && b.top < p.getBoundingClientRect().bottom) : false,
             haut: Math.round(p.getBoundingClientRect().height) };
  });
  console.log('     ' + nom.padEnd(22) + ' panneau ' + (r ? r.haut + ' px · commande y' + r.commande +
              ', archipel y' + r.archipel + ', carte y' + r.carte + ' · 1re île y' + r.ile : '(absent)'));
  c.dit(!!r && r.ile >= 0, nom + ' — il y a au moins une île dans la liste');
  c.dit(r && r.commande >= 0 && r.commande < r.archipel,
        nom + ' — la commande du jour garde sa place, en tête');
  c.dit(r && r.archipel > 0 && r.archipel < r.carte,
        nom + ' — l’archipel passe avant la carte postale');
  c.dit(r && r.carte < r.invite, nom + ' — la carte postale reste avant l’invitation');
  if (voitSansDefiler)
    c.dit(r && r.visible, nom + ' — la première île se voit sans défiler (y' + (r ? r.ile : '?') + ')');
  c.dit(erreurs.length === 0, nom + ' — aucune erreur de console');
  await ctx.close();
}

/* La carte de connexion, couchée.

   Mesuré à 780x360 : elle prenait **156 px des 360** de l'écran — six
   enfants empilés — et il ne restait que 73 px au panneau. Deux fois plus
   de place pour dire qui on est que pour jouer.

   Elle se pose maintenant sur une rangée dès qu'il n'y a plus rien à
   saisir, et ce qui disparaît est ce qui existe ailleurs (l'adresse et son
   bouton de copie sont dans Voisins). Ce qui ne doit **jamais** disparaître,
   c'est la carte quand elle a encore un champ : c'est là qu'on se connecte
   et qu'on nomme son île, et c'est la raison d'être du `display:contents`
   sur `.stage`. */
c.titre('la carte de connexion couchée, et ce qu’elle ne doit pas perdre');
{
  const { ctx, page, erreurs } = await onglet(nav, { taille: { width: 780, height: 360 }, tactile: true });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2200);

  const v = await page.evaluate(() => {
    const c = document.getElementById('compte');
    const p = [...document.querySelectorAll('.panel')].find(e => e.offsetParent !== null);
    return { haut: Math.round(c.getBoundingClientRect().height),
             pose: c.classList.contains('pose'), champ: !!c.querySelector('input'),
             deco: !![...c.querySelectorAll('button')].some(b => /connecter/i.test(b.textContent) &&
                                                                b.offsetParent !== null),
             panel: p ? Math.round(p.getBoundingClientRect().height) : 0 };
  });
  console.log('     carte ' + v.haut + ' px (pose=' + v.pose + ', champ=' + v.champ + '), panneau ' + v.panel + ' px');
  c.dit(!v.champ && v.pose, 'tout est réglé, donc la carte est « posée »');
  c.dit(v.haut <= 80, 'elle tient sur une rangée ou deux (' + v.haut + ' px, contre 156 avant)');
  c.dit(v.deco, 'ce qui n’est nulle part ailleurs reste : « Se déconnecter »');
  c.dit(v.panel >= 150, 'le panneau récupère la place (' + v.panel + ' px, contre 73 avant)');

  /* Et l'état que le faux serveur ne sait pas produire — il rend toujours
     un compte complet, avec son île et son adresse. On remet donc un champ
     à la main, et `formeDuCompte()` doit le voir : c'est exactement ce
     qu'elle fait, elle ne lit rien d'autre que la présence d'un `input`. */
  const w = await page.evaluate(() => {
    const c = document.getElementById('compte');
    const i = document.createElement('input'); i.type = 'email'; c.appendChild(i);
    c.classList.toggle('pose', !c.querySelector('input'));   // la ligne de formeDuCompte()
    const st = getComputedStyle([...c.querySelectorAll('.redite')][0] || document.body);
    return { pose: c.classList.contains('pose'), haut: Math.round(c.getBoundingClientRect().height),
             champVisible: i.offsetParent !== null && i.getBoundingClientRect().width > 20,
             rediteRevenue: st.display !== 'none' };
  });
  console.log('     avec un champ à remplir : carte ' + w.haut + ' px, pose=' + w.pose);
  c.dit(!w.pose, 'un champ à remplir défait tout de suite l’état « posé »');
  c.dit(w.champVisible, 'et le champ est bien visible et large (on peut se connecter couché)');
  c.dit(w.rediteRevenue, 'ce qui avait été caché revient avec lui');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
