/* Trois retours d'usage du 20/09, et ce qu'ils ont en commun : **le jeu ne
   répondait pas à ce que le joueur venait de faire.**

     un pinceau armé confisquait le clic, sans moyen de reprendre la main
     on changeait de prénom, et l'île s'appelait toujours « L'île de Dan »
     cinq réglages de visage donnaient cinq cents bonshommes, pas plus

   Ils vivent dans le même harnais parce qu'ils vivent dans le même
   panneau, et que les trois se mesurent de la même façon : faire le geste,
   et regarder ce que l'écran répond. */
import { navigateur, servir, onglet, attendre, compteur } from './aide.mjs';
import { readFileSync } from 'fs';

const s = await servir(8213);
const nav = await navigateur();
const c = compteur();
const lire = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

const ouvre = async () => {
  const o = await onglet(nav, { taille: { width: 1280, height: 900 },
                                memoire: { 'dansisland:muet': '1' } });
  await o.page.goto(s.url, { waitUntil: 'load' });
  await attendre(2400);
  return o;
};
const onglets = async (page, t) => {
  await page.evaluate(x => {
    const b = [...document.querySelectorAll('.tabs button')].find(y => y.dataset.tab === x);
    if (b) b.click();
  }, t);
  await attendre(450);
};
const taper = async (page, sel, v) => {
  await page.evaluate(([s, v]) => {
    const i = document.querySelector(s);
    i.value = v; i.dispatchEvent(new Event('input', { bubbles: true }));
  }, [sel, v]);
  await attendre(350);
};

c.titre('1. reprendre son bonhomme sans rouvrir un panneau');
{
  /* Un pinceau armé confisque le clic sur l'île : on pose un arbre, on veut
     marcher, et le seul moyen était de rouvrir l'onglet Île et d'y
     retrouver « ✋ Marcher » — à un écran de défilement, et loin du doigt
     qui vient de poser.

     Le bouton n'existe que quand il sert : un bouton toujours là serait
     mort neuf fois sur dix, c'est la règle déjà tenue pour l'appareil
     photo. Donc on éprouve les **trois** états, pas seulement celui du
     milieu. */
  const { ctx, page, erreurs } = await ouvre();
  const etat = () => page.evaluate(() => {
    const b = document.getElementById('marche-btn');
    return b ? { la: true, vu: b.offsetParent !== null } : { la: false, vu: false };
  });

  const a = await etat();
  c.dit(a.la, 'le bouton existe dans la page');
  c.dit(!a.vu, 'en marchant, il ne se montre pas — un bouton mort n’apprend rien');

  await onglets(page, 'ile');
  await page.evaluate(() => { const b = document.querySelector('#p-ile .objs .obj'); if (b) b.click(); });
  await attendre(450);
  const b = await etat();
  c.dit(b.vu, 'un pinceau armé le fait apparaître');

  await page.evaluate(() => document.getElementById('marche-btn').click());
  await attendre(450);
  const d = await etat();
  const murmure = await page.evaluate(() => {
    const w = document.getElementById('whisper');
    return w && w.classList.contains('on') ? w.innerText.replace(/\s+/g, ' ').trim() : '';
  });
  console.log('     ' + (murmure || '(pas de murmure)'));
  c.dit(!d.vu, 'un clic dessus rend la main, et le bouton s’en va');
  c.dit(/repris ton bonhomme/i.test(murmure), 'et il le dit, là où est le doigt');
  // La puce « ✋ Marcher » de l'atelier doit suivre : deux endroits qui
  // disent l'état du pinceau, et l'un ment.
  const marche = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#p-ile .chip')].find(x => /Marcher/.test(x.textContent));
    return b ? b.getAttribute('aria-pressed') : null;
  });
  c.dit(marche === 'true', 'et l’atelier est d’accord (« ✋ Marcher » redevient le choisi)');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('2. le nom de l’île suit le prénom — tant qu’on ne l’a pas choisi');
{
  /* Signalé : on change son prénom, l'île s'appelle toujours « L'île de
     Dan ». « Dan » est le nom de démonstration de `defaultWorld()`, et rien
     ne le reliait à `me.name` : un enfant qui s'appelle Léa habitait chez
     Dan.

     Les **deux** moitiés comptent, et la seconde plus que la première : une
     île qu'on a nommée soi-même ne doit jamais se faire renommer dans le
     dos. C'est la règle du cadre qu'on glisse contre le mur plutôt que
     d'effacer — on ne reprend pas ce qui a été choisi. */
  const { ctx, page, erreurs } = await ouvre();
  const plaque = () => page.evaluate(() => document.getElementById('hud-name').textContent.trim());
  const champIle = () => page.evaluate(() => {
    const i = document.querySelector('#p-ile input[type=text]'); return i ? i.value : '(absent)';
  });

  // Le faux serveur rend une île déjà nommée : on repose l'état par défaut,
  // sinon on éprouve le cas « nom choisi » en croyant éprouver l'autre.
  await onglets(page, 'toi'); await taper(page, '#p-toi input[type=text]', 'Dan');
  await onglets(page, 'ile'); await taper(page, '#p-ile input[type=text]', "L'île de Dan");
  c.dit(await plaque() === "L'île de Dan", 'état de départ : l’île porte le nom par défaut');

  await onglets(page, 'toi'); await taper(page, '#p-toi input[type=text]', 'Léa');
  const apres = await plaque();
  console.log('     prénom → Léa : ' + apres);
  c.dit(apres === "L'île de Léa", 'le nom par défaut suit le prénom');
  await onglets(page, 'ile');
  // Le champ du panneau Île est relu à la reconstruction, pas à la frappe :
  // il restait sur « L'île de Dan » pendant que la plaque disait « Léa », et
  // retaper dedans aurait réécrit le vieux nom par-dessus le neuf.
  c.dit(await champIle() === "L'île de Léa", 'et le champ du panneau Île ne reste pas périmé');

  await taper(page, '#p-ile input[type=text]', 'Roche-Ronde');
  await onglets(page, 'toi'); await taper(page, '#p-toi input[type=text]', 'Nour');
  const choisi = await plaque();
  console.log('     nom choisi, prénom → Nour : ' + choisi);
  c.dit(choisi === 'Roche-Ronde', 'un nom **choisi** ne se fait jamais renommer dans le dos');

  /* Les quatre états de départ, et non le seul que ce harnais produisait.
     La première version de `suivreLePrenom()` comparait le nom de l'île à
     la chaîne dérivée de l'ancien prénom, point. Éprouvée sur un seul
     état — celui de `defaultWorld()` — elle passait au vert en ratant la
     moitié des cas réels :

       « L’île de Dan » (apostrophe typographique)  → ne suivait pas
       « L'île de Dan » + prénom effacé             → ne suivait pas

     C'est, une fois de plus, une mesure qui raisonnait comme son objet :
     le harnais fabriquait l'état avec le même caractère que le code
     testé. Il les fabrique maintenant tous les quatre. */
  const essai = async (nomIle, prenomAvant) => {
    await onglets(page, 'toi'); await taper(page, '#p-toi input[type=text]', prenomAvant);
    await onglets(page, 'ile'); await taper(page, '#p-ile input[type=text]', nomIle);
    await onglets(page, 'toi'); await taper(page, '#p-toi input[type=text]', 'Simon');
    return plaque();
  };
  for (const [nomIle, prenomAvant] of [["L'île de Dan", 'Dan'], ['L’île de Dan', 'Dan'],
                                       ["L'île de Dan", ''],   ['Mon île', '']]) {
    const r = await essai(nomIle, prenomAvant);
    console.log('     ' + JSON.stringify(nomIle).padEnd(17) + ' + prénom ' +
                JSON.stringify(prenomAvant).padEnd(6) + ' → ' + r);
    c.dit(r === "L'île de Simon", 'un nom que le **jeu** a écrit suit le prénom (' + nomIle + ')');
  }
  // Et l'autre moitié de la règle : une forme générée dont la partie
  // variable n'est ni l'ancien prénom ni le propriétaire est un nom qu'on
  // a tapé soi-même. On ne reprend pas ce qui a été choisi.
  const marie = await essai("L'île de Marie", 'Paul');
  console.log('     « L\'île de Marie » + prénom "Paul" → ' + marie);
  c.dit(marie === "L'île de Marie",
        'mais « L’île de Marie » tapé à la main reste « L’île de Marie »');

  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('3. le visage se peint, et il arrive sur le bonhomme');
{
  /* Cinq réglages donnent cinq cents bonshommes ; un pinceau en donne
     autant qu'il y a d'enfants. C'est le seul endroit du jeu où l'on
     dessine vraiment quelque chose.

     Aucune migration : il vit dans `me.face`, et `me` est déjà dans
     `mondeNu()`. Le contrôle le vérifie dans la source — une clé de plus
     dans le jsonb se perdrait en silence, c'est le piège nommé depuis le
     16/09. */
  const src = lire('index.html');
  c.dit(/return \{name:w\.name,[^}]*me:w\.me/.test(src.replace(/\s+/g, ' ')),
        '`me` part bien en base — donc `me.face` aussi, sans migration');
  c.dit(!/mondeNu[\s\S]{0,200}face:/.test(src), 'et `face` n’ajoute aucune clé à `mondeNu()`');

  const { ctx, page, erreurs } = await ouvre();
  await onglets(page, 'toi');
  await page.evaluate(() => {
    const c = document.querySelector('canvas.visage'); if (c) c.scrollIntoView({ block: 'center' });
  });
  await attendre(400);
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas.visage');
    if (!c) return null;
    const b = c.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, n: document.querySelectorAll('.visage-coul button').length };
  });
  c.dit(!!box, 'l’éditeur est là');
  // Treize couleurs et une gomme : au-delà de treize il faudrait deux
  // caractères par case, et toutes les chaînes déjà enregistrées se
  // reliraient de travers — le piège d'`encode()`, transposé.
  c.dit(box && box.n === 14, 'treize couleurs et une gomme (' + (box ? box.n : 0) + ')');

  /* On peint en **violet**, et c'est le cœur de cette section. Compter les
     pixels *sombres* de l'aperçu passait au vert à 4084 — sauf que le
     bonhomme a les cheveux noirs, donc l'assertion se vérifiait elle-même
     et serait restée verte avec un éditeur débranché. Le violet
     `#9B6BC9` n'est ni dans les teints, ni dans les cheveux, ni dans les
     tenues : s'il apparaît sur la tête, il vient du pinceau et de nulle
     part ailleurs. C'est la leçon du « shell » cherché dans sa propre
     bulle, du 19/09. */
  const VIOLET = [0x9B, 0x6B, 0xC9], IDX_VIOLET = 10;
  const compteViolet = (sel) => page.evaluate(([sel, v]) => {
    const c = document.querySelector(sel); if (!c) return -1;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4)
      if (Math.abs(d[i] - v[0]) < 12 && Math.abs(d[i + 1] - v[1]) < 12 &&
          Math.abs(d[i + 2] - v[2]) < 12 && d[i + 3] > 200) n++;
    return n;
  }, [sel, VIOLET]);

  const avantEd = await compteViolet('canvas.visage');
  const avantLui = await compteViolet('#preview');
  console.log('     avant : éditeur ' + avantEd + ' · aperçu ' + avantLui + ' pixels violets');
  c.dit(avantEd === 0, 'l’éditeur part vide');
  c.dit(avantLui === 0, 'et le bonhomme ne porte aucun violet — le témoin est propre');

  await page.evaluate(n => document.querySelectorAll('.visage-coul button')[n].click(), IDX_VIOLET);
  await attendre(300);
  await page.evaluate(() => document.querySelector('canvas.visage').scrollIntoView({ block: 'center' }));
  await attendre(250);

  /* Le canvas doit être **amené à l'écran** avant qu'on clique : le panneau
     défile, et un clic à des coordonnées hors cadre ne touche rien. La
     première version de cette sonde peignait zéro case et ne disait rien —
     une sonde qui rate sa cible se lit comme un jeu qui ne répond pas. */
  const r = box.w / 2 - 4, pas = (r * 2) / 12;
  for (const [i, j] of [[3, 4], [4, 4], [7, 4], [8, 4]]) {
    await page.mouse.move(box.x + (box.w / 2 - r) + (i + 0.5) * pas,
                          box.y + (box.h / 2 - r) + (j + 0.5) * pas);
    await page.mouse.down(); await page.mouse.up(); await attendre(70);
  }
  const n = await compteViolet('canvas.visage');
  console.log('     pixels violets dans l’éditeur : ' + n);
  c.dit(n > 500, 'quatre cases peintes se voient (' + n + ' pixels)');

  // La note change de sens à la première case : « tant que tu n'as rien
  // peint » devient faux, et l'éditeur ne reconstruit pas le panneau.
  const note = await page.evaluate(() => {
    const h = [...document.querySelectorAll('#p-toi .hint')].find(x => /peins|Choisis/.test(x.textContent));
    return h ? h.textContent.trim() : '';
  });
  console.log('     ' + note.slice(0, 72));
  c.dit(/remplace les yeux/.test(note), 'la note se met à jour au premier pixel');

  // Et le bonhomme, lui. L'aperçu le montre trois fois — de face et des
  // deux côtés — donc le visage doit y arriver trois fois.
  const surLui = await compteViolet('#preview');
  console.log('     pixels violets dans l’aperçu : ' + surLui);
  c.dit(surLui > 0, 'et le bonhomme le porte : l’aperçu a repeint sa tête');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
