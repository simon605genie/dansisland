/* Les trois objets chers, et le piège que ce dépôt répète le plus souvent :
   **`agir()` et `proximity()` doivent rester d'accord.**

   La plaque rose et la touche `E` sont le même geste. Deux listes de rangs
   séparées par quatre cents lignes, et la plaque annonce « Relever la
   boîte » pendant que `E` ouvre le coffre. Ça ne se voit pas à la
   relecture, ça ne lève aucune erreur, et ça se découvre le doigt sur le
   bouton. Ce harnais marche jusqu'à chaque objet, lit ce que la plaque
   annonce, appuie sur `E`, et regarde ce qui s'est passé.

   Il éprouve aussi ce que chacun apporte, puisque c'est leur seule raison
   d'être : sans fonction, ce sont des décorations à 50 shells. */
import { navigateur, servir, onglet, compteur, attendre } from './aide.mjs';
import { readFileSync, readdirSync } from 'fs';

const s = await servir(8155);
const nav = await navigateur();
const c = compteur();

/* `proximity()` cherche à moins de 0,95 case : il faut donc être **sur**
   la case de l'objet, pas à côté. Les objets ne bloquent pas la marche,
   c'est ainsi qu'on atteint un coffre.

   Plutôt que de faire marcher le bonhomme — ce qui demanderait de refaire
   la caméra pour viser, et c'est exactement le calcul que `pt()` est seul à
   avoir le droit de faire — on pose l'objet **sous ses pieds**. On éprouve
   l'accord entre la plaque et la touche, pas le pathfinding.

   La case est (8,10), **mesurée** et non déduite : le bonhomme démarre
   devant sa porte (`house.y + 2,6`) et pas au 9,5 ; 11,5 de la déclaration
   de `hero`, qui n'est que le repli si cette case est bloquée. Si un jour
   la maison de départ bouge, ce harnais ne trouve plus rien sous les pieds
   et le dit — c'est pour ça qu'il vérifie d'abord la plaque. */
const SOUS = (t, c) => [{ t, x: 8, y: 10, c }];
const BOITE = SOUS('boitelettres', '#B44C6C');
const GIROUETTE = SOUS('girouette', '#8F98A6');
const MOTS = [['Lise', 'coucou de chez moi'], ['Nino', 'ton phare est beau'], ['Ana', 'je repasse demain']];

const ouvrir = async (objets, mots) => {
  const o = await onglet(nav, {
    taille: { width: 1200, height: 860 },
    memoire: {
      'test:objets': JSON.stringify(objets), 'test:mots': JSON.stringify(mots || []),
      'dansisland:entre': '1', 'dansisland:guide': '1', 'dansisland:muet': '1',
    },
  });
  await o.page.goto(s.url, { waitUntil: 'load' });
  await attendre(2500);
  return o;
};
const etat = page => page.evaluate(() => ({
  plaque: (() => { const b = document.getElementById('rose-btn');
                   return b && !b.hidden ? b.textContent.trim() : null; })(),
  murmure: (() => { const w = document.getElementById('whisper');
                    return w && w.classList.contains('on') ? w.innerText.replace(/\s+/g, ' ').trim() : ''; })(),
}));

c.titre('1. la vitrine — trois articles, trois prix, trois fonctions annoncées');
{
  const { ctx, page, erreurs } = await ouvrir(null);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'boutique');
    if (b) b.click();
  });
  await attendre(700);
  const v = await page.evaluate(() =>
    [...document.querySelectorAll('#p-boutique .obj')].map(o => o.innerText.replace(/\s+/g, ' ').trim()));
  for (const [nom, prix] of [['Girouette', 42], ['Carillon', 50], ['Boîte aux lettres', 55]])
    c.dit(v.some(t => t.startsWith(nom) && t.includes(prix + ' shells')),
          nom + ' est en vitrine à ' + prix + ' shells');

  /* L'achat se fait en deux temps depuis le 16/09 : choisir un article
     ouvre un comptoir sous la vitrine, qui porte le prix, ce qui manque et
     le seul bouton qui débite. C'est **là** que se lit ce que l'objet fait
     — et un objet cher qui ne dirait pas ce qu'il fait avant de débiter
     serait une décoration hors de prix. */
  const comptoir = async nom => {
    await page.evaluate(n => {
      const b = [...document.querySelectorAll('#p-boutique .obj')].find(o => o.innerText.includes(n));
      if (b) b.click();
    }, nom);
    await attendre(450);
    return page.evaluate(() => {
      const c = document.querySelector('#p-boutique .comptoir');
      return c ? c.innerText.replace(/\s+/g, ' ').trim() : '';
    });
  };
  const g = await comptoir('Girouette'); console.log('     ' + g);
  c.dit(/marée/.test(g), 'le comptoir de la girouette dit ce qu’elle apprend de la marée');
  const ca = await comptoir('Carillon'); console.log('     ' + ca);
  c.dit(/visiteurs l’entendent/.test(ca), 'le comptoir du carillon dit que les visiteurs l’entendent');
  const bo = await comptoir('Boîte aux lettres'); console.log('     ' + bo);
  c.dit(/drapeau se lève/.test(bo), 'le comptoir de la boîte dit à quoi sert son drapeau');
  c.dit(/55/.test(bo), 'et il porte le prix');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('2. la boîte aux lettres — le drapeau, puis ce qu’on a écrit');
{
  const { ctx, page, erreurs } = await ouvrir(BOITE, MOTS);
  await attendre(900);
  const a = await etat(page);
  console.log('     plaque  : ' + a.plaque);
  console.log('     murmure : ' + a.murmure);
  c.dit(a.plaque === 'Relever la boîte', 'la plaque rose annonce « Relever la boîte »');
  c.dit(/3 mots/.test(a.murmure), 'la bulle dit combien de mots attendent');

  await page.keyboard.press('e');
  await attendre(400);
  const b = await etat(page);
  console.log('     après E : ' + b.murmure);
  // C'est **le** contrôle : la touche fait ce que la plaque annonçait.
  c.dit(/Ana/.test(b.murmure) && /je repasse demain/.test(b.murmure),
        'E lit le dernier mot reçu — la touche fait ce que la plaque annonçait');
  c.dit(/Lise|Nino/.test(b.murmure), 'les autres mots sont là aussi');
  c.dit(!/<\/?[a-zA-Z]/.test(b.murmure), 'aucune balise en clair dans le murmure');

  await attendre(1400);
  const d = await etat(page);
  c.dit(d.plaque === null, 'la plaque disparaît : il n’y a plus rien à relever');
  c.dit(erreurs.length === 0, 'aucune erreur de console' + (erreurs.length ? ' → ' + erreurs[0] : ''));
  await ctx.close();
}

c.titre('3. la boîte vide — pas un refus, juste une boîte vide');
{
  const { ctx, page, erreurs } = await ouvrir(BOITE, []);
  await attendre(900);
  const a = await etat(page);
  console.log('     murmure : ' + a.murmure);
  c.dit(a.plaque === null, 'pas de plaque rose : rien à relever, donc rien à annoncer');
  c.dit(/vide/.test(a.murmure), 'la bulle dit que la boîte est vide');
  // Même règle que le coffre vide et que le chien qui s'assied : on ne
  // gronde pas, on dit l'état.
  c.dit(!/(impossible|pas le droit|refus)/i.test(a.murmure), 'aucune gronderie');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('4. la girouette — la marée, en toutes lettres et avec un délai');
{
  const { ctx, page, erreurs } = await ouvrir(GIROUETTE);
  await attendre(900);
  const a = await etat(page);
  console.log('     plaque  : ' + a.plaque);
  console.log('     murmure : ' + a.murmure);
  c.dit(a.plaque === 'Lire la girouette', 'la plaque rose annonce « Lire la girouette »');

  await page.keyboard.press('e');
  await attendre(400);
  const b = await etat(page);
  console.log('     après E : ' + b.murmure);
  c.dit(/mer est (basse|haute)/.test(b.murmure), 'E dit où en est la mer');
  // Le délai est ce que le panneau Île ne disait pas : « deux fois par
  // jour » n'aide pas quelqu'un qui veut savoir s'il attend ou s'il part.
  c.dit(/(heure|minute)/.test(b.murmure), 'et dans combien de temps elle change');
  c.dit(!/NaN|undefined|Infinity/.test(b.murmure), 'le délai est un vrai nombre');
  c.dit(erreurs.length === 0, 'aucune erreur de console' + (erreurs.length ? ' → ' + erreurs[0] : ''));
  await ctx.close();
}

c.titre('5. les trois posés ensemble — l’île tient, et rien ne part en base');
{
  const { ctx, page, erreurs } = await ouvrir(
    [{ t: 'boitelettres', x: 5, y: 8 }, { t: 'girouette', x: 12, y: 8 }, { t: 'carillon', x: 5, y: 11 }], MOTS);
  const v = await page.evaluate(() => ({
    // `mondeNu()` liste ce qui part en base, et une clé absente est effacée
    // à la sauvegarde suivante. Les trois objets vivent dans `objects`, qui
    // y est déjà : rien de neuf ne doit apparaître dans le brouillon local.
    cles: Object.keys(JSON.parse(localStorage.getItem('dansisland:brouillon') || '{}')),
    pixels: (() => { const cv = document.getElementById('world');
                     return cv ? cv.width * cv.height : 0; })(),
  }));
  c.dit(v.pixels > 0, 'le jeu a peint quelque chose');
  c.dit(!v.cles.includes('carillon') && !v.cles.includes('boitelettres'),
        'aucune clé de plus au premier niveau du monde');
  c.dit(erreurs.length === 0, 'aucune erreur de console' + (erreurs.length ? ' → ' + erreurs[0] : ''));
  await ctx.close();
}

c.titre('6. s’éloigner efface la bulle — le verrou ne survit pas à son état');
{
  /* « Un verrou de bulle qui survit à son état, c'est un message qui reste
     à l'écran pour toujours » — la règle est écrite depuis le chien. Le
     ménage du bas de `proximity()` ne lève que les clés dont il connaît le
     préfixe, et c'est une liste en dur : toute clé nouvelle doit y entrer.

     Ce contrôle s'en assure sans connaître la liste : il marche jusqu'à ce
     que le bonhomme quitte la case, et regarde si la bulle est partie. */
  const { ctx, page, erreurs } = await ouvrir(GIROUETTE);
  await attendre(900);
  c.dit(/girouette/i.test((await etat(page)).murmure), 'la bulle est là quand on est dessus');

  /* On marche vers le sud — vers l'est, le bonhomme monte sur son seuil et
     entre dans la maison, ce qui change d'état au lieu de s'éloigner.

     Puis on **attend 2,8 s**, et c'est ce qui rend ce contrôle sûr : en
     chemin on tond une touffe, et ce message-là recouvre la bulle sans rien
     prouver. Mais un message de tonte n'a pas de verrou, donc il s'efface
     tout seul au bout de 2,2 s ; un verrou survivant, lui, ne s'efface
     jamais. Après l'attente, un murmure encore allumé **est** le défaut. */
  await page.keyboard.down('ArrowDown');
  await attendre(1300);
  await page.keyboard.up('ArrowDown');
  await attendre(2800);

  const v = await etat(page);
  console.log('     après avoir marché : ' + (v.murmure || '(rien)'));
  c.dit(v.murmure === '', 'la bulle a disparu quand on s’éloigne');
  c.dit(v.plaque === null, 'la plaque rose est retombée aussi');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('7. la crotte — même règle, et elle a sa propre clé');
{
  const { ctx, page, erreurs } = await ouvrir(SOUS('crotte', '#8B6F4E'));
  await attendre(900);
  const a = await etat(page);
  console.log('     plaque  : ' + a.plaque);
  c.dit(a.plaque === 'Nettoyer', 'la plaque rose annonce « Nettoyer »');

  await page.keyboard.down('ArrowDown');
  await attendre(1300);
  await page.keyboard.up('ArrowDown');
  await attendre(2800);
  const v = await etat(page);
  console.log('     après avoir marché : ' + (v.murmure || '(rien)'));
  c.dit(v.murmure === '', 'la bulle a disparu quand on s’éloigne');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('8. le coffre — le « +shells » ne doit plus être recouvert');
{
  /* Le défaut était écrit dans CLAUDE.md depuis le 17/09 — « le coffre a
     encore ce défaut-là, lui » — et personne ne l'avait repris : à l'image
     suivante, `proximity()` voyait un coffre désormais vide et recouvrait
     le gain par « tu l'as déjà ouvert aujourd'hui », avant qu'on ait pu le
     lire. C'est ce contrôle qui empêche qu'il revienne. */
  const { ctx, page, erreurs } = await ouvrir(SOUS('coffre', '#8AA3B2'));
  await attendre(900);
  const a = await etat(page);
  console.log('     plaque  : ' + a.plaque);
  c.dit(a.plaque === 'Ouvrir le coffre', 'la plaque rose annonce « Ouvrir le coffre »');

  await page.keyboard.press('e');
  await attendre(500);
  const b = await etat(page);
  console.log('     après E : ' + b.murmure);
  c.dit(/shell/.test(b.murmure), 'E annonce ce que le coffre donne');
  c.dit(!/déjà ouvert/.test(b.murmure), 'et ce n’est pas « tu l’as déjà ouvert »');

  // Le vrai contrôle : plusieurs images plus tard, le gain est encore lu.
  await attendre(1600);
  const d = await etat(page);
  console.log('     1,6 s plus tard : ' + d.murmure);
  c.dit(/shell/.test(d.murmure), 'le gain tient à l’écran, il n’est pas recouvert');
  c.dit(d.plaque === null, 'la plaque est retombée : il n’y a plus rien à ouvrir');
  c.dit(erreurs.length === 0, 'aucune erreur de console' + (erreurs.length ? ' → ' + erreurs[0] : ''));
  await ctx.close();
}

c.titre('9. les îles de démonstration ne portent rien de payant');
{
  /* « Ne pas mettre d'objet de la boutique sur les îles bot : on en ramène
     un souvenir gratuitement, et la boutique ne sert plus à rien. » La
     règle est écrite depuis le 16/09 et elle était **enfreinte** — `phare`
     (30 shells) au port, `boutique` (35) au village — sans que rien ne le
     signale : un souvenir porte `o.de`, donc il ne débloque pas le
     pinceau, et il n'y a ni erreur ni trace. Juste un objet à 30 shells
     qu'on ramène en se promenant.

     Ce contrôle est **statique** : il lit les deux listes dans la source
     plutôt que de visiter vingt îles. C'est le seul moyen d'être sûr de
     les couvrir toutes, et il ne peut pas se périmer quand la boutique
     s'agrandit ou qu'un thème change. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  const payants = [...src.matchAll(/\{ou:'(?:ile|dedans|toi)',\s*k:'([a-z]+)'/g)].map(m => m[1]);
  c.dit(payants.length > 20, 'la liste des articles payants a été lue (' + payants.length + ')');

  const themes = [...src.matchAll(/\{n:'([a-z]+)',\s*v:\[([^\]]+)\]\}/g)]
    .map(m => [m[1], m[2].match(/'[a-z]+'/g).map(x => x.slice(1, -1))]);
  c.dit(themes.length === 5, 'les cinq thèmes des îles bot ont été lus');

  const fautes = [];
  for (const [nom, objets] of themes)
    for (const o of objets)
      if (payants.includes(o)) fautes.push(nom + ' → ' + o);
  if (fautes.length) console.log('     ' + fautes.join(', '));
  c.dit(fautes.length === 0,
        'aucun thème ne porte un objet payant' + (fautes.length ? ' → ' + fautes.join(', ') : ''));

  /* Et les **trois îles écrites à la main**, qui ne passent pas par les
     thèmes du tout. Mon premier essai ne regardait que `THEMES` et
     déclarait la règle tenue : c'est une capture d'écran qui a montré une
     échoppe bien vivante sur « Îlot Cactus ». Un contrôle qui ne couvre
     qu'une des deux sources dit « tout va bien » avec assurance, et c'est
     pire que pas de contrôle du tout. */
  const dur = src.slice(src.indexOf('const DEMO=['), src.indexOf('for(let i=0;i<NOMS_ILE.length'));
  const poses = [...new Set([...dur.matchAll(/\{t:'([a-z]+)'/g)].map(m => m[1]))];
  c.dit(poses.length > 10, 'les objets des îles écrites à la main ont été lus (' + poses.length + ')');
  const durs = poses.filter(o => payants.includes(o));
  if (durs.length) console.log('     ' + durs.join(', '));
  c.dit(durs.length === 0,
        'aucune île écrite à la main ne porte un objet payant' + (durs.length ? ' → ' + durs.join(', ') : ''));
}

c.titre('9 bis. un souvenir décore, il ne fonctionne pas');
{
  /* Les trois objets chers du 19/09 ont créé un trou que les objets
     décoratifs n'avaient pas : n'importe quel objet se ramène en souvenir
     de chez un ami, donc une visite suffisait à obtenir gratuitement les
     trois articles les plus chers de la Boutique. C'est la règle des îles
     bot — « on en ramène un souvenir gratuitement, et la boutique ne sert
     plus à rien » — qui revenait par les vrais voisins.

     Un souvenir porte `o.de`. Il reste posé, il se regarde, il se
     déplace ; il ne fait simplement pas le travail. */
  const SOUVENIR = (t, c) => [{ t, x: 8, y: 10, c, de: 'Lise' }];

  for (const [t, nom, prix] of [['boitelettres', 'Boîte aux lettres', 55],
                                ['girouette', 'Girouette', 42]]) {
    const { ctx, page, erreurs } = await ouvrir(SOUVENIR(t, '#B44C6C'), MOTS);
    await attendre(900);
    const v = await etat(page);
    console.log('     ' + t + ' : ' + (v.murmure || '(rien)'));
    c.dit(v.plaque === null, t + ' — pas de plaque rose : le souvenir n’agit pas');
    c.dit(/[Ss]ouvenir/.test(v.murmure), t + ' — la bulle dit que c’est un souvenir');
    c.dit(/Lise/.test(v.murmure), t + ' — elle nomme de chez qui il vient');
    c.dit(v.murmure.includes(String(prix)), t + ' — et elle donne le prix du vrai (' + prix + ')');

    /* La touche ne doit pas agir non plus : elle tombe au rang suivant.
       Mon premier essai cherchait l'absence de « shell » — mais la bulle
       du souvenir **porte le prix**, donc elle contient ce mot et
       l'assertion tombait sur son propre texte. On regarde ce que le vrai
       objet aurait produit : les mots reçus, ou l'état de la mer. */
    await page.keyboard.press('e');
    await attendre(400);
    const b = await etat(page);
    c.dit(!/Lise\s*:/.test(b.murmure) && !/[Ll]a mer est/.test(b.murmure),
          t + ' — E ne relève rien et ne lit pas la marée');
    c.dit(erreurs.length === 0, t + ' — aucune erreur de console');
    await ctx.close();
  }

  /* Le carillon n'a pas de bulle : il se dit par le son, et un son absent
     ne s'explique pas au pied de l'objet. C'est donc au **ramassage** que
     la phrase tombe — vérifié ici sur la source, faute de pouvoir visiter
     un voisin dans ce harnais. */
  const src0 = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  c.dit(/FONCTIONNEL=\{girouette:1, carillon:1, boitelettres:1\}/.test(src0),
        'les trois objets fonctionnels sont déclarés ensemble');
  c.dit(/aUnCarillon\(\)\{[^}]*!estSouvenir\(o\)/.test(src0),
        'un carillon souvenir ne sonne pas');
  // Le fichier porte l'apostrophe en **échappement** `\u2019`, pas en
  // caractère : chercher le caractère ne trouve rien. Mesuré, pas deviné.
  c.dit(/ramasserSouvenir[^]*?est un souvenir/.test(src0),
        'le ramassage dit lui-même qu’un souvenir ne fait pas le travail');
}

c.titre('10. `agir()` et `proximity()` listent les mêmes sondes, dans le même ordre');
{
  /* Le piège que ce dépôt nomme le plus souvent, et le seul que les
     contrôles 2 à 8 n'éprouvent que **trois rangs sur sept** : il faudrait
     amener le bonhomme devant chaque chose, et un chien se promène.

     Celui-ci le prend par la source. Les deux fonctions doivent appeler
     les mêmes sondes dans le même ordre — souvenir, chien, crotte, coffre,
     boîte, girouette, porte. C'est exactement ce que veut dire « les deux
     doivent rester d'accord », et ça se lit sans faire un pas.

     Trouvé en l'écrivant : `proximity()` **ne passait pas** par
     `chienProche()` ni `crotteProche()`, elle testait `objet.t` en ligne,
     où `objet` est le *dernier* objet sous les pieds. `CLAUDE.md`
     affirmait pourtant que les deux passaient par la même fonction. Les
     deux branches faisaient bien la même chose — parce qu'aucune case ne
     porte deux objets — mais rien ne le garantissait. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  const corps = nom => {
    const i = src.indexOf('function ' + nom + '(');
    let prof = 0, ouvert = false;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') { prof++; ouvert = true; }
      else if (src[j] === '}' && --prof === 0 && ouvert) return src.slice(i, j + 1);
    }
    return '';
  };
  // Les commentaires citent les sondes sans les appeler : les retirer,
  // sinon c'est la prose qu'on éprouve et pas le code.
  const sansNotes = t => t.replace(/\/\*[^]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const SONDES = ['souvenirProche', 'chienProche', 'crotteProche', 'coffreProche',
                  'boiteProche', 'girouetteProche', 'devantLaPorte'];
  const ordre = nom => {
    const b = sansNotes(corps(nom)), vus = [];
    for (const m of b.matchAll(new RegExp('\\b(' + SONDES.join('|') + ')\\b', 'g')))
      if (vus[vus.length - 1] !== m[1]) vus.push(m[1]);
    return vus;
  };
  const a = ordre('agir'), p = ordre('proximity');
  console.log('     agir()      : ' + a.join(' → '));
  console.log('     proximity() : ' + p.join(' → '));
  c.dit(a.length === SONDES.length, 'agir() appelle les ' + SONDES.length + ' sondes (' + a.length + ')');
  c.dit(p.length === SONDES.length, 'proximity() appelle les ' + SONDES.length + ' sondes (' + p.length + ')');
  c.dit(a.join() === p.join(), 'les deux listes sont dans le même ordre');
}

c.titre('11. les listes qui doivent rester d’accord');
{
  /* « Deux listes qui divergent » est le piège que `CLAUDE.md` nomme le
     plus souvent — pour `slug_libre()` et les contraintes, pour
     `functions/_commun.js` et `src/config.js`, pour `TROUVAILLES` et le
     tableau SQL, pour la vitrine et le catalogue. Chaque fois, la
     consigne écrite était « si l'une change, l'autre doit suivre », et
     chaque fois c'est une consigne que personne ne relit.

     Les trois ci-dessous sont d'accord aujourd'hui — vérifié avant de les
     écrire, aucune ne corrigeait quoi que ce soit. Elles sont là pour le
     jour où elles ne le seront plus, et elles répondent en une seconde
     plutôt qu'après un achat refusé chez un joueur. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // a) la vitrine et le catalogue SQL. Un article absent du SQL s'affiche
  //    et l'achat le refuse : « la vitrine annonce un prix que l'achat
  //    refuse », mot pour mot ce qui est écrit depuis le 16/09.
  const vitrine = new Map([...src.matchAll(
    /\{ou:'(ile|dedans|toi)',\s*k:'([a-z]+)',\s*n:'[^']*',\s*prix:(\d+)/g)]
    .map(m => [m[2], m[1] + ':' + m[3]]));
  const sql = new Map();
  for (const f of readdirSync(new URL('../supabase/', import.meta.url)).filter(f => f.endsWith('.sql')))
    for (const m of readFileSync(new URL('../supabase/' + f, import.meta.url), 'utf8')
                      .matchAll(/\('([a-z_]+)'\s*,\s*'(ile|dedans|toi)'\s*,\s*(\d+)\)/g))
      sql.set(m[1], m[2] + ':' + m[3]);
  c.dit(vitrine.size > 25, 'la vitrine a été lue (' + vitrine.size + ' articles)');
  const ecarts = [...vitrine].filter(([k, v]) => sql.get(k) !== v)
    .map(([k, v]) => k + ' (vitrine ' + v + ', SQL ' + (sql.get(k) || 'absent') + ')');
  if (ecarts.length) console.log('     ' + ecarts.join(', '));
  c.dit(ecarts.length === 0,
        'chaque article de la vitrine a sa ligne SQL, au même rayon et au même prix');

  // b) GAMMES doit avoir les mêmes clés que `sky`, sinon une heure
  //    nouvelle retombe sur `jour` en silence. C'est écrit le 19/09.
  const gam = new Set([...(src.match(/const GAMMES=\{[^]*?\n\};/) || [''])[0]
    .matchAll(/^\s*'([^']+)':/gm)].map(m => m[1]));
  const ciels = new Set([...src.matchAll(/\[\['jour','Jour'\],\['([^']+)'[^\]]*\],\['([^']+)'/g)]
    .flatMap(m => [m[1], m[2]]).concat(['jour']));
  console.log('     GAMMES : ' + [...gam].join(' ') + '   |   sky : ' + [...ciels].join(' '));
  c.dit(gam.size >= 3 && ciels.size >= 3, 'les deux listes ont été lues');
  c.dit([...ciels].every(k => gam.has(k)), 'chaque heure du ciel a sa gamme');

  // c) faux-store.js doit exporter tout ce qu'index.html lui demande.
  //    Un export qui manque, et la page ne démarre pas du tout : module
  //    refusé, écran vide, une ligne dans la console.
  const faux = readFileSync(new URL('./faux-store.js', import.meta.url), 'utf8');
  const fournis = new Set([...faux.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+([a-zA-Z]+)/g)]
    .map(m => m[1]));
  // Le `(?<![/\w])` écarte le `store.js` du chemin d'import, qui n'est pas
  // un appel — mon premier essai le comptait comme un export manquant et
  // rendait ce contrôle rouge pour rien. Un faux positif use un contrôle
  // aussi sûrement qu'un faux négatif : on finit par ne plus le lire.
  const demandes = [...new Set([...src.matchAll(/(?<![/\w])store\.([a-zA-Z]+)/g)].map(m => m[1]))];
  const absents = demandes.filter(k => !fournis.has(k));
  if (absents.length) console.log('     ' + absents.join(', '));
  c.dit(demandes.length > 15, 'les appels à store.* ont été lus (' + demandes.length + ')');
  c.dit(absents.length === 0, 'faux-store.js exporte tout ce qu’index.html demande');
}

c.titre('12. tout élément caché par `hidden` doit vraiment disparaître');
{
  /* Le défaut du 17/09 : `.zoom button` portait `display:grid`, une règle
     d'auteur, qui l'emporte sur le `[hidden]{display:none}` de la feuille
     du navigateur. Le bouton de l'appareil photo restait donc **visible et
     cliquable avant tout achat** — `basculerViseur()` refusait bien, donc
     rien ne fuyait, mais c'est le bouton mort que ce dépôt s'interdit, et
     rien ne le signalait.

     **Ce contrôle a d'abord été écrit en regex, et il ne l'attrapait
     pas** : il construisait les sélecteurs depuis l'`id` et les classes de
     chaque élément, alors que la règle fautive vise un **ancêtre**
     (`.zoom button`). Il avait donc précisément l'angle mort du bug qu'il
     visait. On demande maintenant au navigateur, qui résout toute la
     cascade — spécificité, ordre, media queries — et qui ne peut pas se
     tromper sur ce que voit l'œil.

     Deux tailles, parce qu'une règle peut ne mordre que sous media query :
     le large ordinaire, et le portrait tactile étroit où vit `.tourne`. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const caches = [...new Set([...src.matchAll(/id="([a-z\-]+)"[^>]*\shidden/g),
                              ...src.matchAll(/\shidden[^>]*id="([a-z\-]+)"/g)]
                              .map(m => m[1]))].sort();
  console.log('     cachés par hidden : ' + caches.join(', '));
  c.dit(caches.length >= 5, 'les éléments cachés ont été trouvés (' + caches.length + ')');

  for (const [nom, taille, tactile] of [['large', { width: 1200, height: 860 }, false],
                                        ['portrait tactile', { width: 390, height: 780 }, true]]) {
    const { ctx, page, erreurs } = await onglet(nav, {
      taille, tactile,
      memoire: { 'dansisland:entre': '1', 'dansisland:guide': '1', 'dansisland:muet': '1' },
    });
    await page.goto(s.url, { waitUntil: 'load' });
    await attendre(1600);
    // On cache chacun et on lit ce que le navigateur en fait, puis on
    // remet : mesurer ne doit pas changer l'état de la page.
    const vus = await page.evaluate(ids => ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return [id, 'absent'];
      const avant = el.hidden;
      el.hidden = true;
      const d = getComputedStyle(el).display;
      el.hidden = avant;
      return [id, d];
    }), caches);
    const fautifs = vus.filter(([, d]) => d !== 'none' && d !== 'absent').map(([i, d]) => i + ':' + d);
    if (fautifs.length) console.log('     ' + nom + ' → ' + fautifs.join(', '));
    c.dit(vus.filter(([, d]) => d === 'absent').length === 0,
          nom + ' — tous les éléments existent dans la page');
    c.dit(fautifs.length === 0,
          nom + ' — `hidden` les fait tous disparaître' + (fautifs.length ? ' → ' + fautifs.join(', ') : ''));
    c.dit(erreurs.length === 0, nom + ' — aucune erreur de console');
    await ctx.close();
  }
}

c.titre('13. la vitrine est rangée par prix, rayon par rayon');
{
  /* Chaque rayon était écrit par prix croissant — puis les trois chers ont
     été **ajoutés à la fin** du rayon « île », donc après la montgolfière à
     60 : la colonne des prix lisait 40, 45, 50, 60, 42, 50, 55. Et le rayon
     « toi » n'avait jamais été rangé du tout : 25, 45, 28, 20.

     Un prix qui revient en arrière au milieu d'une liste se lit comme une
     erreur, et c'est l'ordre **de déclaration** qui s'affiche : ce que le
     fichier montre est ce que l'enfant voit. Ajouter un article à la fin de
     son rayon est le geste le plus naturel du monde, donc c'est celui qu'il
     faut garder. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const bloc = (src.match(/const BOUTIQUE=\[([\s\S]*?)\n\];/) || [])[1] || '';
  const lignes = [...bloc.matchAll(/\{ou:'(\w+)',\s*k:'(\w+)',\s*n:'([^']*)',\s*prix:(\d+)/g)]
    .map(m => ({ ou: m[1], k: m[2], n: m[3], prix: +m[4] }));
  c.dit(lignes.length >= 25, 'la vitrine a été lue (' + lignes.length + ' articles)');
  const rayons = [...new Set(lignes.map(l => l.ou))];
  c.dit(rayons.length >= 3, 'ses rayons ont été lus (' + rayons.join(', ') + ')');
  for (const r of rayons) {
    const l = lignes.filter(x => x.ou === r);
    const mauvais = l.filter((x, i) => i && x.prix < l[i - 1].prix);
    console.log('     ' + r.padEnd(7) + ' ' + l.map(x => x.prix).join(' ') +
                (mauvais.length ? '   ⚠️ ' + mauvais.map(x => x.n).join(', ') : ''));
    c.dit(mauvais.length === 0, 'rayon « ' + r + ' » — les prix ne reviennent jamais en arrière' +
          (mauvais.length ? ' (' + mauvais.map(x => x.n + ' à ' + x.prix).join(', ') + ')' : ''));
  }
}

c.titre('14. personne ne colle « un » devant un nom d’objet');
{
  /* « Un fleur de chez Lila. » — lu à l'écran en allant visiter un voisin,
     pas dans le code. Trois phrases collaient un article en dur devant
     `NOM_OBJ[…]`, et **15 des 37 objets sont féminins** : une échoppe, une
     tortue, une balançoire, une montgolfière… La phrase de la visite est
     celle qu'on voit le plus souvent de tout le jeu.

     C'est mot pour mot le défaut de « Te voilà dans le chambre », et le
     remède est le même : le genre est une propriété du **type**, dans le
     catalogue, troisième case de la ligne.

     Ce que ce contrôle peut faire, et ce qu'il ne peut pas. Il vérifie le
     **câblage** — qu'aucune phrase ne recolle un article à la main — et
     c'est ce qui empêche le défaut de revenir. Il ne peut pas vérifier le
     **français** : comparer mes marques `'f'` à une liste que j'aurais
     écrite à côté ne prouverait que ma constance. La grammaire, elle, a été
     relue une fois sur la liste imprimée ci-dessous, et la phrase de la
     visite a été lue dans le jeu qui tournait — « Une fleur de chez Lila ».
     Le relevé est imprimé pour qu'on puisse la relire, pas pour décorer. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const bloc = (src.match(/const OBJ_GROUPS=\[\n([\s\S]*?)\n\];/) || [])[1] || '';
  const objets = [...bloc.matchAll(/\['([a-z0-9]+)','([^']+)'(,'f')?\]/g)]
    .map(x => ({ k: x[1], n: x[2], f: !!x[3] }));
  c.dit(objets.length >= 30, 'le catalogue a été lu (' + objets.length + ' objets)');
  const fem = objets.filter(o => o.f);
  c.dit(fem.length >= 10, fem.length + ' objets portent leur « f »');
  console.log('     féminins : ' + fem.map(o => 'une ' + o.n.toLowerCase()).join(' · '));
  console.log('     masculins : ' + objets.filter(o => !o.f).map(o => 'un ' + o.n.toLowerCase()).join(' · '));

  // Le câblage : plus une seule phrase qui recolle l'article elle-même.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const colles = [...code.matchAll(/['’ ](?:[Uu]n|[Uu]ne|[TtSs]on|[Tt]a)\s*(?:<[^>]*>)?\s*'\s*\+\s*\(?\s*NOM_OBJ\[/g)];
  c.dit(colles.length === 0, 'aucune phrase ne colle un article devant NOM_OBJ (' + colles.length + ')');
  for (const [q, re] of [
    ['le souvenir chez un voisin', /unObjet\(objet\.t,true,true\)\+' de chez '/],
    ['l’objet sous la maison', /'Il y a '\+unObjet\(gene\.t,false,true\)\+' sous la maison/],
    ['l’objet qu’on ne peut pas tourner', /say\(unObjet\(o\.t,true,true\)\+' n’a pas de sens/],
    ['le compagnon qui te suit', /tonObjet\(k\)\+' te suit maintenant partout/],
  ]) c.dit(re.test(code), q + ' passe par la fonction');
  // Et la crotte, qui n'est dans aucun rayon : son genre se pose à la main,
  // donc c'est exactement celui qu'on peut oublier.
  c.dit(/NOM_OBJ\.crotte='crotte'; FEM_OBJ\.crotte=1;/.test(code),
        'la crotte, hors catalogue, porte quand même son genre');
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
