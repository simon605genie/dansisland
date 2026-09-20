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
  c.dit(v.haut <= 90, 'elle tient sur une rangée ou deux (' + v.haut + ' px, contre 156 avant)');
  c.dit(v.deco, 'ce qui n’est nulle part ailleurs reste : « Se déconnecter »');
  /* Le défaut tenait en une phrase — « deux fois plus de place pour dire
     qui on est que pour jouer » — et c'est donc un **rapport** qu'il faut
     vérifier, pas un nombre. Mon premier jet exigeait 150 px de panneau,
     mesurés sur cette machine-ci : le runner rend le texte un peu plus
     large, la carte y fait 67 px au lieu de 61 et le panneau 143 au lieu
     de 168. Rouge, pour un gain pourtant bien là (73 → 143). Un seuil
     calibré sur une machine est un seuil qui tombera sur une autre ;
     l'écart entre deux mesures du même écran, non. */
  c.dit(v.panel > v.haut, 'le panneau a plus de place que la carte (' + v.panel +
        ' px contre ' + v.haut + ' — c’était 73 contre 156)');
  c.dit(v.panel >= 120, 'et il en a vraiment, pas juste plus qu’elle (' + v.panel + ' px)');

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

  /* Et debout, sur un petit téléphone. Même cause — `>span{flex:1 1 100%}`
     existe pour faire de la place au **champ**, et il n'y en a plus — mais
     pas le même remède : en portrait il y a la place pour deux rangées, et
     l'adresse de l'île est ce qu'on partage. Elle reste donc visible. */
  const t = await onglet(nav, { taille: { width: 375, height: 667 }, tactile: true });
  await t.page.goto(s.url, { waitUntil: 'load' });
  await attendre(2200);
  const u = await t.page.evaluate(() => {
    const c = document.getElementById('compte');
    const cadre = document.querySelector('.viewport').getBoundingClientRect();
    const adr = c.querySelector('.redite');
    return { haut: Math.round(c.getBoundingClientRect().height),
             pose: c.classList.contains('pose'),
             adresseVisible: !!adr && adr.offsetParent !== null && adr.getBoundingClientRect().width > 40,
             cadreY: Math.round(cadre.top), cadreBas: Math.round(cadre.bottom), ecran: 667 };
  });
  console.log('     portrait 375x667 : carte ' + u.haut + ' px, cadre y' + u.cadreY + '→' + u.cadreBas);
  c.dit(u.pose && u.haut <= 90, 'debout aussi, la carte se pose (' + u.haut + ' px, contre 167 avant)');
  c.dit(u.adresseVisible, 'mais l’adresse de l’île reste visible : en portrait, elle a la place');
  c.dit(u.cadreBas <= u.ecran, 'et le cadre du jeu tient tout entier dans le premier écran');
  c.dit(t.erreurs.length === 0, 'aucune erreur de console');
  await t.ctx.close();
}

/* Chez un voisin, le panneau Île se ferme — en entier.

   Il se fermait à moitié : le nom de l'île, l'Heure, l'Ambiance et la
   Palette étaient éteints par `fermerEnVisite()`, mais **les dix-sept
   vignettes de l'atelier restaient cliquables**. On armait donc un pinceau
   chez quelqu'un, on cliquait, et il ne se passait rien.

   Rien n'était perdu — mesuré, le code de sauvegarde ne bougeait pas d'un
   octet — mais c'est le défaut nommé le 16/09 : « un pinceau armé au mauvais
   endroit doit le dire ; le clic ne faisait rien et rien ne l'expliquait ».
   Et l'explication existait, tout en haut du panneau, à un écran de
   défilement des vignettes. */
c.titre('chez un voisin, le panneau Île est fermé en entier');
{
  const { ctx, page, erreurs } = await onglet(nav, { taille: { width: 1280, height: 900 } });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2400);
  const ouvrir = async k => {
    await page.evaluate(t => {
      const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === t);
      if (b) b.click();
    }, k);
    await attendre(600);
  };
  const lire = () => page.evaluate(() => {
    const p = document.getElementById('p-ile');
    const objs = [...p.querySelectorAll('.obj')], chips = [...p.querySelectorAll('.chip')];
    return { objs: objs.length, objsOff: objs.filter(b => b.disabled).length,
             chips: chips.length, chipsOff: chips.filter(b => b.disabled).length };
  });

  await ouvrir('ile');
  const chez = await lire();
  console.log('     chez moi : ' + chez.objsOff + '/' + chez.objs + ' vignettes éteintes, ' +
              chez.chipsOff + '/' + chez.chips + ' puces éteintes');
  // L'ordre compte : si l'atelier était fermé chez soi, le jeu n'aurait plus
  // d'atelier du tout — c'est la première chose à refuser.
  c.dit(chez.objs > 10, 'chez moi, l’atelier a ses vignettes (' + chez.objs + ')');
  c.dit(chez.objsOff === 0, 'chez moi, aucune n’est éteinte');
  c.dit(chez.chipsOff === 0, 'chez moi, aucune puce n’est éteinte');

  await ouvrir('voisins');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.neighbor button')].find(x => /Visiter/.test(x.textContent));
    if (b) b.click();
  });
  await attendre(1800);
  await ouvrir('ile');
  const chez2 = await lire();
  console.log('     en visite : ' + chez2.objsOff + '/' + chez2.objs + ' vignettes éteintes, ' +
              chez2.chipsOff + '/' + chez2.chips + ' puces éteintes');
  c.dit(chez2.objs > 10, 'en visite, les vignettes sont toujours là (on voit ce qu’on aura chez soi)');
  c.dit(chez2.objsOff === chez2.objs, 'mais toutes éteintes — aucun pinceau ne s’arme chez les autres');
  c.dit(chez2.chipsOff === chez2.chips, 'et toutes les puces aussi');

  /* Et le panneau Maison, qui avait le même défaut d'un cran plus loin :
     ses deux boutons d'action étaient fermés en visite, mais les sept
     réglages d'apparence restaient ouverts. Ceux-là **marchaient** — ce
     n'était pas un clic mort, c'était une modification de ta maison que tu
     ne vois pas d'ici. Même raison, même remède. */
  const mai = () => page.evaluate(() => {
    const p = document.getElementById('p-maison');
    const bs = [...p.querySelectorAll('button')], ins = [...p.querySelectorAll('input')];
    return { b: bs.length, bOff: bs.filter(x => x.disabled).length,
             i: ins.length, iOff: ins.filter(x => x.disabled).length };
  });
  await ouvrir('maison');
  const mv = await mai();
  console.log('     maison en visite : ' + mv.bOff + '/' + mv.b + ' boutons, ' +
              mv.iOff + '/' + mv.i + ' champs éteints');
  c.dit(mv.b > 20 && mv.bOff === mv.b, 'en visite, toute l’apparence de la maison est fermée');
  c.dit(mv.i > 0 && mv.iOff === mv.i, 'ses champs de texte aussi');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();

  // Et chez soi, rien n'est fermé — la première chose à refuser.
  const t = await onglet(nav, { taille: { width: 1280, height: 900 } });
  await t.page.goto(s.url, { waitUntil: 'load' });
  await attendre(2400);
  await t.page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'maison');
    if (b) b.click();
  });
  await attendre(600);
  const mc = await t.page.evaluate(() => {
    const p = document.getElementById('p-maison');
    const bs = [...p.querySelectorAll('button')], ins = [...p.querySelectorAll('input')];
    return { b: bs.length, bOff: bs.filter(x => x.disabled).length,
             i: ins.length, iOff: ins.filter(x => x.disabled).length };
  });
  console.log('     maison chez moi  : ' + mc.bOff + '/' + mc.b + ' boutons, ' +
              mc.iOff + '/' + mc.i + ' champs éteints');
  c.dit(mc.b > 20 && mc.bOff === 0, 'chez moi, la maison se règle toujours (' + mc.b + ' boutons, aucun éteint)');
  c.dit(mc.iOff === 0, 'et ses champs de texte se remplissent');
  c.dit(t.erreurs.length === 0, 'aucune erreur de console');
  await t.ctx.close();
}

c.titre('chez un voisin, le cadeau du jour dit où il est');
{
  /* Le bloc parlait comme si on était chez soi : « va marcher jusqu'à lui »,
     à propos d'un coffre qui est sur une autre île — et `coffrePlein()` est
     faux quand `visiting`, c'est la règle du 17/09.

     Pire dans la branche **sans coffre** : il offrait « Poser un coffre »,
     qui arme le pinceau et ouvre l'onglet Île. Depuis que cet onglet se
     ferme en visite, ce bouton menait droit dans un panneau tout gris.

     On éprouve une île **sans aucun coffre**, parce que c'est la branche
     qui portait les boutons — celle qu'on n'aurait pas vue en regardant
     une île ordinaire. */
  const { ctx, page, erreurs } = await onglet(nav, {
    taille: { width: 1280, height: 900 },
    memoire: { 'test:objets': JSON.stringify([{ t: 'palmier', x: 8, y: 8, o: 'se', c: '#2E7D5B' }]) },
  });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2400);
  const ouvrir = async k => {
    await page.evaluate(t => {
      const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === t);
      if (b) b.click();
    }, k);
    await attendre(600);
  };
  const cadeau = () => page.evaluate(() => {
    const p = document.getElementById('p-boutique');
    const f = [...p.querySelectorAll('.field')].find(x => /cadeau du jour/i.test(x.innerText));
    if (!f) return null;
    return { txt: f.innerText.replace(/\s+/g, ' ').trim(),
             boutons: [...f.querySelectorAll('button')].map(b => b.textContent.trim()) };
  });

  await ouvrir('boutique');
  const ch = await cadeau();
  console.log('     chez moi  : ' + (ch ? ch.boutons.length + ' bouton(s) — ' + ch.txt.slice(0, 58) : '(pas de bloc)'));
  // Sans coffre, les deux boutons restent chez soi : une gomme passée sur le
  // dernier coffre ne doit pas rendre le cadeau injoignable (règle du 17/09).
  c.dit(!!ch, 'chez moi, le bloc du cadeau est là');
  c.dit(ch && ch.boutons.length === 2, 'sans coffre, il garde ses deux boutons (' +
        (ch ? ch.boutons.join(' / ') : '?') + ')');

  await ouvrir('voisins');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.neighbor button')].find(x => /Visiter/.test(x.textContent));
    if (b) b.click();
  });
  await attendre(1800);
  await ouvrir('boutique');
  const cv = await cadeau();
  console.log('     en visite : ' + (cv ? cv.boutons.length + ' bouton(s) — ' + cv.txt.slice(0, 58) : '(pas de bloc)'));
  c.dit(!!cv, 'en visite, le bloc est toujours là — le cadeau existe, il est ailleurs');
  c.dit(cv && cv.boutons.length === 0, 'mais il n’offre aucun geste qu’on ne peut pas faire d’ici');
  c.dit(cv && /chez toi/.test(cv.txt), 'et il dit où il est');
  // Sans coffre, ne pas en promettre un : la phrase enverrait chercher un
  // objet qui n'existe pas sur l'île du joueur.
  c.dit(cv && !/dans ton coffre/.test(cv.txt), 'sans coffre, il n’en promet pas un');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

/* La Boutique montre des articles.

   Même défaut que « Voisins ne montrait aucun voisin », et trouvé de la même
   façon — en regardant, pas en relisant. Mesuré avant correction, dans un
   panneau de 636 px :

     y=  297   Ce qui rapporte aujourd’hui   (816 px de jauges)
     y= 1113   le premier article
     y= 1762   les six bâtiments

   Sept jauges de gain passaient donc avant la première vignette. Et « Sur ton
   île » était une grille plate de 26 articles triés par prix, où les six
   bâtiments étaient éparpillés entre l'échoppe et le toboggan : rien ne
   disait qu'il y avait un village à bâtir. C'est la leçon du 19/09 au matin —
   ce qui existe mais ne se nomme nulle part n'existe pas.

   Deux choses éprouvées ici, et elles sont distinctes : les **rayons** (une
   vitrine qui se lit) et l'**ordre** (une boutique qui montre sa boutique). */
c.titre('la Boutique montre des articles, et ses rayons se lisent');
for (const [nom, width, height, tactile, voitSansDefiler] of [
  ['grand écran 1280', 1280, 900, false, true],
  ['portrait 390', 390, 844, true, true],
  ['paysage court 780x360', 780, 360, true, false]]) {
  const { ctx, page, erreurs } = await onglet(nav, { taille: { width, height }, tactile });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'boutique');
    if (b) b.click();
  });
  await attendre(700);

  const r = await page.evaluate(() => {
    const p = document.getElementById('p-boutique');
    if (!p) return null;
    const y0 = p.getBoundingClientRect().top - p.scrollTop;
    const rayons = [...p.querySelectorAll('.field')].filter(f => f.querySelector('.objs .obj'))
      .map(f => ({ titre: (f.querySelector('.lab') || {}).textContent.trim(),
                   n: f.querySelectorAll('.objs .obj').length,
                   y: Math.round(f.getBoundingClientRect().top - y0) }));
    const gains = [...p.querySelectorAll('.field')].find(f => f.querySelector('.gains'));
    const v1 = p.querySelector('.objs .obj');
    const bat = rayons.find(x => /Bâtiments/.test(x.titre));
    return {
      rayons, bat,
      gainsY: gains ? Math.round(gains.getBoundingClientRect().top - y0) : -1,
      premierY: v1 ? Math.round(v1.getBoundingClientRect().top - y0) : -1,
      visible: v1 ? (v1.getBoundingClientRect().top >= p.getBoundingClientRect().top &&
                     v1.getBoundingClientRect().top < p.getBoundingClientRect().bottom) : false,
      haut: Math.round(p.getBoundingClientRect().height),
    };
  });
  console.log('     ' + nom.padEnd(22) + ' panneau ' + (r ? r.haut + ' px · 1er article y' + r.premierY +
              ' · Bâtiments y' + (r.bat ? r.bat.y : '?') + ' · « ce qui rapporte » y' + r.gainsY : '(absent)'));
  if (r) console.log('       rayons : ' + r.rayons.map(x => x.titre + ' (' + x.n + ')').join(' · '));

  // Le comptage d'abord : un contrôle qui ne dit pas combien il a lu peut
  // passer au vert en ne regardant presque rien. C'est la leçon des îles de
  // démonstration, et celle des trois prénoms au lieu de vingt.
  c.dit(r && r.rayons.length >= 6, nom + ' — la vitrine a ses rayons (' + (r ? r.rayons.length : 0) + ')');
  c.dit(r && r.bat && r.bat.n === 6, nom + ' — le rayon Bâtiments porte les six (' +
        (r && r.bat ? r.bat.n : 0) + ')');
  c.dit(r && r.premierY >= 0 && r.gainsY > r.premierY,
        nom + ' — « ce qui rapporte » passe sous la vitrine, pas avant');
  if (voitSansDefiler)
    c.dit(r && r.visible, nom + ' — le premier article se voit sans défiler (y' + (r ? r.premierY : '?') + ')');
  c.dit(erreurs.length === 0, nom + ' — aucune erreur de console');
  await ctx.close();
}

/* Le comptoir tombe sous le rayon d'où vient le clic, pas en bas de la
   section. C'est la règle de la boutique du 16/09 — le prix et le refus
   tombent là où est le doigt — et avec 26 vignettes en une grille, « en bas
   de la section » était déjà à un écran de défilement. */
c.titre('le comptoir tombe sous le rayon qu’on vient de toucher');
{
  const { ctx, page, erreurs } = await onglet(nav, { taille: { width: 1280, height: 900 } });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'boutique');
    if (b) b.click();
  });
  await attendre(600);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#p-boutique .objs .obj')].find(x => /Ferme/.test(x.textContent));
    if (b) b.click();
  });
  await attendre(600);

  const r = await page.evaluate(() => {
    const p = document.getElementById('p-boutique');
    const co = p.querySelector('.comptoir');
    const y0 = p.getBoundingClientRect().top - p.scrollTop;
    const bat = [...p.querySelectorAll('.field')].find(f => /Bâtiments/.test(
      ((f.querySelector('.lab') || {}).textContent || '')));
    const dedans = [...p.querySelectorAll('.field')].find(f => /Dans ta maison/.test(
      ((f.querySelector('.lab') || {}).textContent || '')));
    const y = e => e ? Math.round(e.getBoundingClientRect().top - y0) : -1;
    return { txt: co ? co.innerText.replace(/\s+/g, ' ').trim() : null,
             co: y(co), bat: y(bat), dedans: y(dedans) };
  });
  console.log('     Bâtiments y' + r.bat + ' · comptoir y' + r.co + ' · rayon suivant y' + r.dedans);
  console.log('     ' + (r.txt || '(aucun comptoir)').slice(0, 96));
  c.dit(!!r.txt, 'toucher un bâtiment ouvre le comptoir');
  /* Le rayon d'abord, et ce n'est pas une politesse : éprouvé en remettant la
     grille plate, `bat` valait -1, donc « le comptoir est sous le rayon »
     était vrai sans rien mesurer et la section passait au vert pendant que
     la précédente était rouge. Un repère absent doit faire échouer ce qui
     s'appuie dessus, jamais l'absoudre. */
  c.dit(r.bat >= 0, 'le rayon Bâtiments existe, et c’est ce qui rend la suite mesurable');
  c.dit(r.bat >= 0 && r.co > r.bat, 'il tombe **sous** le rayon Bâtiments');
  c.dit(r.bat >= 0 && r.dedans > 0 && r.co < r.dedans,
        'et avant le rayon suivant, pas en bas de la section');
  // Le prix dans la ligne du titre, toujours : « il te manque 24 » ne dit pas
  // si l'objet en vaut 34 ou 340. Règle du 19/09.
  c.dit(!!r.txt && /34 shells/.test(r.txt), 'et il porte le prix (34 shells)');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
