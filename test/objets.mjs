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
import { navigateur, servir, onglet, compteur, attendre, remplacer } from './aide.mjs';
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

  /* Et la **troisième** source, née le 20/09 : `GRANDS`, les bâtiments posés
     au nord des îles bot. Ceux-là sont payants **exprès**, et c'est la seule
     exception à la règle du 16/09 — un village de démonstration sans un seul
     bâtiment ne montre pas le jeu.

     Ce qui la rendait acceptable était le refus de `ramasserSouvenir()` sur
     une île `demo` : un garde-fou, donc une chose qui peut être retirée.
     Depuis le 21/09 il n'y a plus rien à garder — **on ne ramène plus
     rien**, on prend une photo, et une photo d'église n'entre dans aucune
     liste d'objets. L'exception n'a plus besoin de son exception.

     Le contrôle lit donc l'invariant qui l'a remplacée, et il est plus
     fort : `photographier()` n'écrit que dans `interieur`. Voir plus bas.

     Écrire ce bloc était le vrai travail : mon premier jet ne lisait que
     `THEMES` et `DEMO`, exactement comme le 19/09, et il est **passé au
     vert** alors que six articles payants venaient d'arriver sur vingt îles.
     Un contrôle qui ne connaît pas la source qu'on vient d'ajouter ne dit
     rien — il rassure. */
  const gr = src.slice(src.indexOf('const GRANDS='), src.indexOf('const combien='));
  const grands = [...new Set([...gr.matchAll(/'([a-z]+)'\s*[,\]]/g)].map(m => m[1])
    .filter(x => payants.includes(x)))];
  console.log('     GRANDS : ' + (grands.join(' · ') || '(aucun)'));
  c.dit(grands.length >= 4, 'les bâtiments des îles bot ont été lus (' + grands.length + ')');

  // Seuls des **bâtiments** ont droit à l'exception : un phare ou une
  // échoppe posés là se ramèneraient toujours, et la règle repartirait.
  const emprise = src.slice(src.indexOf('const EMPRISE_ILE='), src.indexOf('function empriseIle'));
  const bat = [...emprise.matchAll(/([a-z]+):\s*\[2,\s*2\]/g)].map(m => m[1]);
  c.dit(bat.length === 6, 'les six bâtiments 2x2 ont été lus (' + bat.length + ')');
  const horsBat = grands.filter(t => !bat.includes(t));
  c.dit(horsBat.length === 0,
        'GRANDS ne pose que des bâtiments' + (horsBat.length ? ' → ' + horsBat.join(', ') : ''));

  /* L'invariant qui remplace le garde-fou, et qui le vaut mieux : **une
     visite n'ajoute rien à `mine.objects`.** Tant que c'était vrai « parce
     qu'un refus le disait », il suffisait de retirer le refus ; c'est vrai
     maintenant parce qu'il n'y a plus une seule ligne qui pousse quoi que
     ce soit dans cette liste au retour d'une visite.

     C'est un contrôle de **câblage**, pas de comportement, et il faut le
     dire : amener le bonhomme sur une église d'île bot demanderait de le
     téléporter, et rien ici n'en donne le moyen. */
  const corpsDe = nom => {
    const i = src.indexOf('function ' + nom + '(');
    if (i < 0) return '';
    let prof = 0, ouvert = false;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') { prof++; ouvert = true; }
      else if (src[j] === '}' && --prof === 0 && ouvert) return src.slice(i, j + 1);
    }
    return '';
  };
  const ph = corpsDe('photographier');
  c.dit(ph.length > 400, 'photographier() a été lu (' + ph.length + ' caractères)');
  c.dit(/mine\.interieur\.pieces\[[^\]]+\]\.meubles\.push\(/.test(ph),
        'photographier() accroche un cadre dans la maison');
  c.dit(!/objects\s*\.?\s*push/.test(ph) && !/mine\.objects/.test(ph),
        'et il ne touche jamais à `mine.objects` : rien de payant ne se ramène');
  /* Et le compte, parce qu'un contrôle qui ne dit pas ce qu'il a lu peut
     passer au vert en ne regardant rien. Cinq lignes poussent un objet
     d'île, et **pas une** ne signe du nom d'un hôte : les îles bot (deux),
     les mots replantés en panneau, le pinceau, la crotte du chien. */
  const pushs = [...src.matchAll(/\bobjects\.push\(/g)];
  c.dit(pushs.length === 5, 'cinq lignes posent un objet d’île (' + pushs.length + ')');
  const signe = [...src.matchAll(/objects\.push\([^;]{0,160}?de\s*:/g)];
  c.dit(signe.length === 0,
        'aucune ne signe du nom de l’hôte : un objet de voisin ne se copie plus (' +
        signe.length + ')');
}

c.titre('9 ter. les six bâtiments : une emprise de 2x2, et des proportions');
{
  /* Mesuré avant d'y toucher, en unités du monde : la ferme faisait **33**
     et le bonhomme en fait 38 — on était plus grand qu'une ferme — et
     l'école 43, moins qu'un arbre à fleurs. Les six avaient été dessinés
     comme des objets, pas comme des bâtiments.

     La vignette est peinte dans un repère connu, et `dessinDe()` applique
     `ECH_BAT` **à l'intérieur** pendant qu'`APERCU_ECH` divise par le même
     facteur : ce que la vignette montre est donc le dessin **brut**, et la
     taille réelle sur l'île se retrouve en le remultipliant. C'est de
     l'arithmétique sur une mesure du navigateur, pas une lecture du code. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  // La déclaration seule, coupée à son `};` : une tranche de longueur fixe
  // mordait sur le code suivant et comptait huit échelles au lieu de six.
  // Un compte qui déborde ment aussi sûrement qu'un compte qui manque.
  const d0 = src.indexOf('const ECH_BAT=');
  const eb = src.slice(d0, src.indexOf('};', d0));
  const ECH = {};
  [...eb.matchAll(/([a-z]+):\s*([\d.]+)/g)].forEach(m => { ECH[m[1]] = parseFloat(m[2]); });
  c.dit(Object.keys(ECH).length === 6, 'les six échelles ont été lues (' + Object.keys(ECH).length + ')');
  c.dit(/APERCU_ECH\[k\]\s*=\s*0\.60\s*\/\s*ECH_BAT\[k\]/.test(src),
        'la vignette divise par la même échelle — sinon elle déborde de sa case');

  const { ctx, page, erreurs } = await ouvrir(null);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'boutique');
    if (b) b.click();
  });
  await attendre(700);
  const brut = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('#p-boutique .objs .obj').forEach(b => {
      const cv = b.querySelector('canvas'), nom = b.querySelector('span');
      if (!cv || !nom) return;
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, n = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++)
        if (d[(y * cv.width + x) * 4 + 3] > 200) {
          n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
      if (n) out[nom.textContent.trim()] = { demi: Math.max(60 - x0, x1 - 60), haut: 90 - y0 };
    });
    return out;
  });
  const NOM = { ferme: 'Ferme', ecole: 'École', coiffeur: 'Coiffeur',
    supermarche: 'Supermarché', restaurant: 'Restaurant', culte: 'Lieu de culte' };
  // pixels de vignette = monde_brut x 1,2  (2 du setTransform x 0,60 d'échelle)
  const taille = {};
  Object.keys(NOM).forEach(k => { const m = brut[NOM[k]];
    if (m) taille[k] = { demi: m.demi / 1.2 * ECH[k], haut: m.haut / 1.2 * ECH[k] }; });
  c.dit(Object.keys(taille).length === 6, 'les six ont été mesurés dans la vitrine');

  console.log('     la maison fait 80 de haut et 56 de demi-largeur · le bonhomme 38');
  Object.keys(NOM).forEach(k => { const t = taille[k]; if (!t) return;
    console.log('       ' + NOM[k].padEnd(14) + 'demi-larg. ' + t.demi.toFixed(0).padStart(3) +
      '   hauteur ' + t.haut.toFixed(0).padStart(4) + '   ' + (t.haut / 80).toFixed(2) + '× la maison'); });

  // Le défaut d'origine, nommé : plus personne ne doit être plus grand qu'un
  // bâtiment, et une église doit dominer la maison.
  const petits = Object.keys(taille).filter(k => taille[k].haut <= 38);
  c.dit(petits.length === 0,
        'aucun bâtiment n’est plus petit que le bonhomme' + (petits.length ? ' → ' + petits.join(', ') : ''));
  c.dit(taille.culte && taille.culte.haut > 80, 'le lieu de culte dépasse la maison (' +
        (taille.culte ? taille.culte.haut.toFixed(0) : '?') + ' contre 80)');
  c.dit(taille.ecole && taille.ecole.haut > 45,
        'l’école dépasse un arbre à fleurs (45), ce qui n’était pas le cas');
  c.dit(taille.culte && Object.keys(taille).every(k => taille[k].haut <= taille.culte.haut),
        'et le clocher est le plus haut des six');
  // Ils sont larges, mais pas au point de mordre sur la case du voisin :
  // un 2x2 a 56 de demi-largeur, comme la maison.
  const larges = Object.keys(taille).filter(k => taille[k].demi > 56);
  c.dit(larges.length === 0,
        'aucun ne déborde de son 2x2' + (larges.length ? ' → ' + larges.join(', ') : ''));
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
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

  const src0 = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  c.dit(/FONCTIONNEL=\{girouette:1, carillon:1, boitelettres:1\}/.test(src0),
        'les trois objets fonctionnels sont déclarés ensemble');
  /* La phrase qui l'expliquait au ramassage est partie avec le ramassage :
     depuis le 21/09 on ne ramène plus rien, on photographie, et il n'y a
     plus de souvenir **neuf** à qui dire qu'il ne fonctionne pas.

     Ce qui reste — et c'est tout l'objet de cette section — ce sont les
     souvenirs **déjà posés**, que ce changement ne reprend à personne.
     `estSouvenir()` continue de les gouverner, et les trois sondes le
     lisent toujours : c'est la règle du cadre glissé contre le mur
     plutôt qu'effacé. */
  for (const s of ['boiteProche', 'girouetteProche', 'aUnCarillon'])
    c.dit(new RegExp('function ' + s + '\\([^]{0,340}?!estSouvenir\\(').test(src0),
          s + '() écarte encore un souvenir déjà posé');
}

c.titre('10. `agir()` et `proximity()` listent les mêmes sondes, dans le même ordre');
{
  /* Le piège que ce dépôt nomme le plus souvent, et le seul que les
     contrôles 2 à 8 n'éprouvent que **trois rangs sur sept** : il faudrait
     amener le bonhomme devant chaque chose, et un chien se promène.

     Celui-ci le prend par la source. Les deux fonctions doivent appeler
     les mêmes sondes dans le même ordre — photo, chien, crotte, coffre,
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
  const SONDES = ['photoProche', 'chienProche', 'crotteProche', 'coffreProche',
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
  /* Depuis le passage aux gabarits, la phrase ne colle plus rien : elle
     porte un **trou**, et le trou reçoit la fonction. Le contrôle vérifie
     donc les deux — la phrase a bien son `{objet}`, et c'est bien
     `unObjet()` qui le remplit. C'est strictement plus fort qu'avant, où
     il suffisait de trouver une concaténation.

     Et c'est le défaut déjà nommé pour `mondeNu()` : ces quatre lignes
     affirmaient quelque chose de vrai en s'accrochant à la ponctuation
     qui l'entourait le jour où elles ont été écrites. */
  for (const [q, re] of [
    ['l’objet qu’on photographie chez un voisin',
      /\{objet\} de chez \{hote\}[\s\S]{0,220}?objet: unObjet\(objet\.t,true,true\)/],
    ['l’objet sous la maison',
      /Il y a \{objet\} sous la maison[\s\S]{0,120}?objet: unObjet\(gene\.t,false,true\)/],
    ['l’objet qu’on ne peut pas tourner',
      /\{objet\} n’a pas de sens[\s\S]{0,120}?objet: unObjet\(o\.t,true,true\)/],
    ['le compagnon qui te suit',
      /\{objet\} te suit maintenant partout[\s\S]{0,120}?objet: tonObjet\(k\)/],
  ]) c.dit(re.test(code), q + ' passe par la fonction');
  // Et la crotte, qui n'est dans aucun rayon : son genre se pose à la main,
  // donc c'est exactement celui qu'on peut oublier.
  c.dit(/NOM_OBJ\.crotte='crotte'; FEM_OBJ\.crotte=1;/.test(code),
        'la crotte, hors catalogue, porte quand même son genre');

  /* Et la phrase du Sens, qui recopiait `PIVOT_ILE` à la main. Elle disait
     exactement la bonne chose — jusqu'au jour où un objet orientable
     serait ajouté sans que personne ne pense à elle. Vérifié en ajoutant
     `moulin` à `PIVOT_ILE` : la phrase le nomme toute seule. */
  c.dit(/const axes=Object\.keys\(PIVOT_ILE\)\.map\(/.test(code),
        'la phrase du Sens se lit dans PIVOT_ILE, elle ne la recopie pas');
  c.dit(!/suit un axe : <b>banc<\/b>/.test(code),
        'et la liste écrite à la main n’est pas revenue');

  /* « La porte de Adam est fermée. » Même faute, sur la phrase qu'on
     rencontre à chaque porte de voisin — sept endroits. Cinq des vingt
     prénoms de démonstration commencent par une voyelle, et un prénom est
     du texte libre : ça ne se réglait pas en renommant les bots.

     Le contrôle applique la règle **telle qu'elle est écrite dans le
     fichier** aux prénoms que le jeu **livre vraiment**, et imprime le
     résultat. Ce n'est donc pas ma table comparée à ma table : la règle
     vient de `deQui()`, les prénoms du bloc des îles de démonstration. */
  c.dit(/function deQui\(nom\)/.test(code) && /de:n=>/.test(code), 'deQui() est là, et son module aussi');
  c.dit(!/porte de <b>'\+esc\(world\.owner\)/.test(code),
        'plus une phrase ne colle « de » devant le nom de l’hôte');
  /* La liste des voyelles a quitté le corps de `deQui()` pour la constante
     `VOY`, que le module français de `GRAMMAIRE` lit. Le contrôle la lit
     là où elle est ; ce qu'il prouve n'a pas bougé d'un mot. */
  const voy = (code.match(/const VOY=\/\^\[([^\]]*)\]\//) || [])[1];
  c.dit(!!voy, 'sa liste de voyelles a été lue');
  /* Les prénoms viennent de **deux** endroits — les quelques îles écrites à
     la main (`mkN`) et la liste des bots (`NOMS_GENS`) — et mon premier jet
     n'en lisait qu'un : 3 prénoms au lieu de 20. C'est le défaut exact des
     îles de démonstration du matin, où le contrôle ne lisait que `THEMES`
     et ratait les îles écrites à la main. L'assertion de comptage est ce
     qui l'a rattrapé les deux fois. */
  const prenoms = [...new Set([
    ...[...src.matchAll(/mkN\('[a-z]+','[^']*','([^']+)'/g)].map(m => m[1]),
    ...((src.match(/const NOMS_GENS=\[([\s\S]*?)\];/) || [])[1] || '')
       .split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean),
  ])];
  c.dit(prenoms.length >= 18, 'les prénoms des deux sources ont été lus (' + prenoms.length + ')');
  if (voy) {
    const re = new RegExp('^[' + voy.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))) + ']', 'i');
    const rendu = prenoms.map(n => (re.test(n) ? 'd’' : 'de ') + n);
    console.log('     ' + rendu.join(' · '));
    // Un prénom à voyelle au moins, sinon le contrôle ne prouve rien : il
    // dirait « de » partout et aurait l'air content.
    c.dit(rendu.some(x => x.startsWith('d’')), 'au moins un prénom s’élide — la règle mord');
    c.dit(rendu.some(x => x.startsWith('de ')), 'et au moins un ne s’élide pas');
  }
}

c.titre('14 bis. fille ou garçon, et les six bâtiments');
{
  /* Deux ajouts demandés le 19/09 au soir. Ce qu'on vérifie ici est ce qui
     se voit : que le choix **change le dessin**, et que les six bâtiments
     sont branchés partout où un objet d'île doit l'être.

     Le reste est déjà couvert, et ça n'est pas un hasard : le contrôle 11
     a crois é leurs six lignes SQL avec la vitrine, le 13 a vérifié qu'ils
     ne cassaient pas l'ordre des prix, et le 14 a lu « une ferme » et
     « une école » dans les féminins. Un garde-fou écrit le matin qui
     rattrape le travail du soir sans qu'on y pense, c'est ce pour quoi ils
     existent. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const BAT = ['ferme', 'ecole', 'coiffeur', 'supermarche', 'restaurant', 'culte'];
  for (const [quoi, test] of [
    ['un dessin', k => new RegExp('\\n  ' + k + '\\(c,C\\)\\{').test(src)],
    ['une entrée d’atelier', k => new RegExp("\\['" + k + "','").test(src)],
    ['une ligne de vitrine', k => new RegExp("k:'" + k + "',").test(src)],
    ['une orientation', k => new RegExp('\\b' + k + ':1').test(src)],
  ]) {
    const manque = BAT.filter(k => !test(k));
    c.dit(manque.length === 0, 'les six bâtiments ont ' + quoi +
          (manque.length ? ' — il manque ' + manque.join(', ') : ''));
  }
  // Le rayon est à part : « Village » était déjà à quatorze articles.
  c.dit(/\['Bâtiments',\[/.test(src), 'ils ont leur propre rayon dans l’atelier');

  /* Et le dessin. Un choix qui ne change rien à l'écran n'est pas un choix :
     on lit les pixels de l'aperçu du bonhomme dans les deux réglages. */
  const { ctx, page, erreurs } = await onglet(nav, { taille: { width: 1000, height: 1000 } });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2400);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'toi');
    if (b) b.click();
  });
  await attendre(700);
  const choix = () => page.evaluate(() => {
    const p = document.getElementById('p-toi');
    const f = [...p.querySelectorAll('.field')].find(x => /Fille ou gar/i.test(x.innerText));
    return f ? [...f.querySelectorAll('.chip')].map(b => b.textContent.trim()) : null;
  });
  const dessin = async n => {
    await page.evaluate(q => {
      const p = document.getElementById('p-toi');
      const f = [...p.querySelectorAll('.field')].find(x => /Fille ou gar/i.test(x.innerText));
      const b = [...f.querySelectorAll('.chip')].find(x => x.textContent.trim() === q);
      if (b) b.click();
    }, n);
    await attendre(800);
    return page.evaluate(() => {
      const cv = document.querySelector('#p-toi canvas');
      const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
      const W = cv.width, H = cv.height;
      /* On compte les pixels de **la tenue**, pas les pixels opaques :
         l'aperçu est peint sur un mur rayé, donc tout y est opaque et une
         mesure d'alpha rend le même nombre dans les deux cas — mesuré,
         660 contre 660. La jupe est de la couleur de la tenue, et c'est
         elle qu'on cherche. */
      const tenue = (i) => Math.abs(d[i] - 0x14) + Math.abs(d[i + 1] - 0x8A) + Math.abs(d[i + 2] - 0x9C) < 60;
      let n = 0, bas = 0;
      for (let y = 0; y < H; y++) { let l = 0;
        for (let x = 0; x < W; x++) if (tenue((y * W + x) * 4)) { n++; l++; }
        if (y > H * 0.62 && l > bas) bas = l; }
      return { n, bas };
    });
  };
  const ch = await choix();
  c.dit(!!ch && ch.length === 2, 'le choix est là, avec deux réponses (' + (ch || []).join(' / ') + ')');
  const g = await dessin('Garçon'), f = await dessin('Fille');
  console.log('     tenue peinte — garçon : ' + g.n + ' px, dont ' + g.bas + ' de large en bas · '+
              'fille : ' + f.n + ' px, dont ' + f.bas);
  c.dit(f.bas > g.bas + 8, 'la fille a une jupe — le bas s’évase (' + g.bas + ' → ' + f.bas + ' px)');
  c.dit(f.n > g.n, 'et elle couvre plus de surface (' + g.n + ' → ' + f.n + ' px)');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('15. le livre d’or affiche le texte des autres, il ne l’exécute pas');
{
  /* C'est le seul endroit du jeu où le texte d'un **inconnu** arrive sur la
     page de quelqu'un d'autre : on plante un mot chez un voisin, et l'hôte
     le lit chez lui. Un `<img onerror=…>` qui s'exécuterait là tournerait
     dans la session de l'hôte, avec son compte.

     La discipline est tenue — `esc()` partout sur `panneau.txt`,
     `panneau.by`, `auteur_nom` — mais une discipline ne se relit pas, et il
     suffit d'un `+` oublié. On ne vérifie donc pas la source : **on envoie
     une vraie tentative et on demande au navigateur ce qu'il en a fait.**
     C'est la leçon du contrôle 12 — quand un navigateur peut répondre,
     c'est à lui qu'il faut demander. */
  const { ctx, page, erreurs } = await onglet(nav, {
    taille: { width: 1280, height: 900 },
    memoire: { 'test:mots': JSON.stringify([
      ['Zoé', '<b>gras ?</b>'],
      ['<i>Ana</i>', 'coucou'],
      ['Ilan', '<img src=x onerror="document.title=\'PERCÉ\'">'],
    ]) },
  });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2600);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'ile');
    if (b) b.click();
  });
  await attendre(800);

  const v = await page.evaluate(() => {
    const p = document.getElementById('p-ile');
    const t = (p.innerText || '').replace(/\s+/g, ' ');
    return { titre: document.title, img: p.querySelectorAll('img').length,
             mots: ['<b>gras ?</b>', '<i>Ana</i>', '<img src=x'].filter(x => t.includes(x)).length };
  });
  console.log('     titre de la page : « ' + v.titre +' », <img> dans le panneau : ' + v.img +
              ', balises lues en clair : ' + v.mots + '/3');
  c.dit(v.titre !== 'PERCÉ', 'le onerror n’a pas tourné — le titre de la page est intact');
  c.dit(v.img === 0, 'aucune <img> n’a été créée depuis un mot');
  c.dit(v.mots === 3, 'les trois mots s’affichent tels qu’ils ont été écrits');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('16. la bourse n’annonce que ce qu’un geste peut aller chercher');
{
  /* La phrase du haut de la Boutique disait « il te reste 84 shells à
     gagner aujourd'hui » : la somme de **tous** les plafonds. Or 49 de ces
     84 sont `mot_recu` et `commande_recue` — ils tombent quand quelqu'un
     vient, et aucune action du joueur ne les déclenche. Un enfant qui lit
     84 devant un objet à 50 croit qu'il l'aura ce soir en se donnant du
     mal ; il peut en atteindre 35.

     Le contrôle ne relit pas la liste des gains, il **recompose la somme
     depuis les jauges affichées** et la compare au nombre annoncé. Une
     mesure qui lirait la même liste que le code mesuré hériterait de ses
     angles morts — c'est la phrase que ce dépôt a écrite quatre fois, après
     la regex qui cherchait des sélecteurs, le harnais qui ne connaissait que
     les fenêtres étroites, le seuil calibré sur une police, et l'apostrophe
     fabriquée avec le même caractère que le code éprouvé. */
  const { ctx, page, erreurs } = await onglet(nav, { taille: { width: 1280, height: 900 } });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'boutique');
    if (b) b.click();
  });
  await attendre(800);

  const v = await page.evaluate(() => {
    const p = document.getElementById('p-boutique');
    const phrase = [...p.querySelectorAll('p,div')].map(e => e.textContent.trim())
      .find(t => /aujourd’hui/.test(t) && /shell/.test(t)) || '';
    /* Les jauges disent, pour chaque gain, combien reste à prendre. Le
       libellé « Recevoir … chez toi » est ce qui distingue les deux
       familles à l'écran : c'est le seul signe dont dispose le lecteur, donc
       c'est celui sur lequel la mesure s'appuie. */
    let soi = 0, autres = 0, n = 0;
    for (const g of p.querySelectorAll('.gain')) {
      const nom = g.querySelector('b').textContent;
      const [fait, plaf] = g.querySelector('.n').textContent.split('/').map(x => +x.trim());
      if (!isFinite(fait) || !isFinite(plaf)) continue;
      n++;
      if (/^Recevoir/.test(nom)) autres += plaf - fait; else soi += plaf - fait;
    }
    return { phrase, soi, autres, n };
  });

  const nb = (v.phrase.match(/(\d+) shell/g) || []).map(x => parseInt(x, 10));
  console.log('     phrase : ' + v.phrase);
  console.log('     jauges : ' + v.n + ' · par un geste ' + v.soi + ' · si on passe ' + v.autres);
  // Un contrôle qui ne dit pas combien il a lu peut passer au vert en ne
  // regardant rien : sept jauges, ou la mesure ne vaut pas.
  c.dit(v.n === 7, 'les sept jauges ont été lues (' + v.n + ')');
  c.dit(v.autres > 0, 'et certaines ne dépendent que des visiteurs (' + v.autres + ')');
  c.dit(nb.length === 2, 'la phrase annonce deux nombres, pas un (' + nb.join(' et ') + ')');
  c.dit(nb[0] === v.soi,
        'le premier est ce qu’un geste va chercher (' + nb[0] + ' = ' + v.soi + ')');
  c.dit(nb[1] === v.autres,
        'le second est ce qui dépend des visiteurs (' + nb[1] + ' = ' + v.autres + ')');
  c.dit(nb[0] !== v.soi + v.autres,
        'et jamais la somme des deux, qui promettrait ' + (v.soi + v.autres));
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('17. répondre à un mot, et la réponse se lit au pied du panneau');
{
  /* Le livre d'or ne parlait que dans un sens : on plantait un mot chez un
     ami, il le lisait, et il n'y avait plus aucune raison de repasser.

     Quatre choses à éprouver, et la première est celle qui compte le
     plus : **une réponse est du texte libre qui arrive sur l'écran de
     quelqu'un d'autre.** C'est le deuxième chemin de ce genre dans tout le
     jeu, après le mot lui-même — et celui-là, le contrôle 15 le couvre
     depuis le 19/09. Un nouveau chemin de texte qui ne serait pas échappé
     rouvrirait exactement le trou que ce contrôle-là surveille. */
  const DEDANS = '<img src=x onerror="document.title=\'PERCÉ\'">';
  // Le mot est semé **sous les pieds** — case (8,10), la même que les
  // objets — pour que `proximity()` en fasse une bulle sans avoir à
  // marcher jusqu'au panneau.
  const { ctx, page, erreurs } = await ouvrir(null,
    [['Ana', 'Ton île est belle', '', 8, 10]]);

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'ile');
    if (b) b.click();
  });
  await attendre(700);

  /* 1. **Le livre d'or n'est pas un formulaire.** Huit mots à l'écran
        feraient huit champs ; le champ se déplie sur un geste, comme le
        comptoir de la boutique et le viseur de l'appareil. */
  // Relevée **avant** de répondre : comparer à un nombre écrit en dur
  // serait un seuil calibré sur une machine, la faute du 19/09.
  const avantSous = await page.evaluate(() =>
    (document.getElementById('hud-sous') || {}).textContent || '');
  const avant = await page.evaluate(() => ({
    champs: document.querySelectorAll('#p-ile .gb li input').length,
    chips: [...document.querySelectorAll('#p-ile .gb li button')].map(b => b.textContent),
  }));
  console.log('     avant le dépli : ' + avant.champs + ' champ(s) · ' + avant.chips.join(' · '));
  c.dit(avant.chips.includes('répondre'), 'le mot d’Ana porte un bouton « répondre »');
  c.dit(avant.champs === 0, 'et aucun champ n’est ouvert d’avance (' + avant.champs + ')');

  const deplie = await page.evaluate(() => {
    const li = [...document.querySelectorAll('#p-ile .gb li')].find(x => /Ana/.test(x.innerText));
    const o = li && [...li.querySelectorAll('button')].find(b => b.textContent === 'répondre');
    if (!o) return null;
    o.click();
    return { champs: li.querySelectorAll('input').length,
             envoyer: !![...li.querySelectorAll('button')].find(b => b.textContent === 'Envoyer') };
  });
  c.dit(!!deplie && deplie.champs === 1, 'le bouton déplie exactement un champ');
  c.dit(!!deplie && deplie.envoyer, 'et le bouton qui envoie apparaît avec lui');

  /* 2. **La réponse est échappée.** On en envoie une qui essaie de
        s'exécuter, et on demande au navigateur ce qu'il en a fait — pas à
        une regex qui chercherait `esc(` dans la source. C'est la leçon du
        contrôle 12, et c'est déjà la forme du contrôle 15. */
  await page.evaluate(t => {
    const li = [...document.querySelectorAll('#p-ile .gb li')].find(x => /Ana/.test(x.innerText));
    li.querySelector('input').value = 'Merci ! ' + t;
    [...li.querySelectorAll('button')].find(b => b.textContent === 'Envoyer').click();
  }, DEDANS);
  await attendre(900);

  const vu = await page.evaluate(() => ({
    titre: document.title,
    images: document.querySelectorAll('#p-ile img').length,
    ligne: ([...document.querySelectorAll('#p-ile .gb li')]
      .find(x => /Ana/.test(x.innerText)) || {}).innerText || '',
  }));
  c.dit(vu.titre !== 'PERCÉ', 'la réponse ne s’exécute pas (titre : ' + vu.titre.slice(0, 28) + '…)');
  c.dit(vu.images === 0, 'et elle ne crée aucune <img> (' + vu.images + ')');
  c.dit(/onerror/.test(vu.ligne), 'elle s’affiche en clair, balise comprise');

  /* 3. **La réponse se lit au pied du panneau**, pas seulement dans le
        panneau. C'est la forme que ce jeu donne à tout — le cadeau est
        dans le coffre, la commande au pas de la porte — et une réponse n'a
        de sens qu'à côté de ce qu'elle répond. Le mot est sous les pieds,
        donc `proximity()` en fait une bulle à l'image suivante. */
  await attendre(600);
  const bulle = (await etat(page)).murmure;
  console.log('     bulle au panneau : ' + bulle.slice(0, 90));
  c.dit(/a écrit/.test(bulle), 'la bulle du panneau dit bien ce qu’Ana a écrit');
  c.dit(/Tu as répondu/.test(bulle), 'et elle porte la réponse juste en dessous');
  c.dit(/onerror/.test(bulle), 'la réponse y est aussi en clair, pas exécutée');

  /* 4. **Répondre ne rapporte rien.** C'est un geste solitaire, écrit chez
        soi, et un geste solitaire ne paie pas dans ce jeu : c'est la règle
        tenue depuis le 16/09, et le potager comme la dalle qui chante l'ont
        tenue aussi. Ce qui paie, c'est que l'autre revienne. */
  const apres = await page.evaluate(() =>
    (document.getElementById('hud-sous') || {}).textContent || '');
  console.log('     bourse après la réponse : ' + apres.trim() + ' (' + avantSous.trim() + ' avant)');
  c.dit(apres === avantSous,
        'la bourse n’a pas bougé — une réponse ne paie rien (' + apres.trim() + ')');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('18. peindre le sol — la première clé ajoutée à mondeNu() depuis longtemps');
{
  /* Tout ce qui a été écrit ces deux jours tient **sans une clé de plus**,
     parce que tout s'y déduit du temps ou de la case. Une couleur posée
     par un enfant ne se déduit de rien : c'est une donnée du joueur, et
     une donnée du joueur qui ne part pas en base est une donnée perdue.

     Le contrôle porte donc d'abord sur les **deux chemins** qu'elle doit
     prendre, et qui sont deux occasions de l'oublier : `mondeNu()`, qui
     va en base, et `encode()`, qui fait le code de sauvegarde. */
  const { ctx, page, erreurs } = await ouvrir(null);

  const ileTab = () => page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'ile');
    if (b) b.click();
  });
  const champ = () => page.evaluate(() => {
    const f = [...document.querySelectorAll('.field')].find(x => /Peindre le sol/.test(x.textContent));
    if (!f) return null;
    f.scrollIntoView({ block: 'center' });
    return { pastilles: [...f.querySelectorAll('button')].map(b => b.textContent.trim()),
             note: (f.querySelector('.hint') || {}).innerText || '',
             eteintes: [...f.querySelectorAll('button')].filter(b => b.disabled).length };
  });
  const armer = nom => page.evaluate(n => {
    const f = [...document.querySelectorAll('.field')].find(x => /Peindre le sol/.test(x.textContent));
    f.scrollIntoView({ block: 'center' });
    [...f.querySelectorAll('button')].find(b => new RegExp(n).test(b.textContent)).click();
  }, nom);
  const compte = async () => {
    const t = (await champ()).note;
    const m = t.match(/(\d+) case/);
    return m ? +m[1] : 0;
  };
  const enBase = () => page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('test:dernier-monde')); } catch (e) { return null; }
  });
  const codePeint = () => page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
    if (b) b.click();
    const v = [...document.querySelectorAll('#p-voisins textarea')].map(e => e.value)
      .find(x => x && x.length > 40) || '';
    try { const j = JSON.parse(decodeURIComponent(escape(atob(v))));
          return (j.l || '').split('').filter(c => c !== '.').length; }
    catch (e) { return -1; }
  });

  await ileTab(); await attendre(600);
  const av = await champ();
  console.log('     pastilles : ' + (av ? av.pastilles.join(' · ') : '(champ absent)'));
  c.dit(!!av, 'le champ « Peindre le sol » est dans le panneau Île');
  c.dit(!!av && av.pastilles.length === 13,
        'douze couleurs et une gomme (' + (av ? av.pastilles.length : 0) + ')');
  c.dit(!!av && /Effacer/.test(av.pastilles[av.pastilles.length - 1]),
        'et la gomme est une pastille de la rangée, pas un mode à part');

  /* **Une île jamais peinte ne porte pas la clé.** 324 points pour dire
     « rien » dans un jsonb que chaque sauvegarde réécrit, c'est 324 de
     trop — et c'est ce qui rend cette clé acceptable. */
  const nu0 = await enBase();
  console.log('     en base au départ : ' + (nu0 ? nu0.cles.join(' ') : '(rien sauvegardé)'));
  c.dit(!nu0 || !nu0.cles.includes('sol'),
        'avant d’avoir peint, `sol` n’entre pas dans mondeNu()');

  // On peint. La boîte du canvas est **relevée après l'armement** : cliquer
  // une pastille fait défiler la page, et une boîte d'avant vise 200 px
  // plus bas — une heure perdue là-dessus.
  await armer('Corail');
  await attendre(300);
  const bb = await page.locator('#world').boundingBox();
  for (const [fx, fy] of [[0.50, 0.50], [0.46, 0.53], [0.42, 0.56]]) {
    await page.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy);
    await attendre(150);
  }
  await attendre(400);
  const n1 = await compte();
  console.log('     après trois clics : ' + n1 + ' case(s) peinte(s)');
  c.dit(n1 === 3, 'trois clics peignent trois cases (' + n1 + ')');

  const nu1 = await enBase();
  console.log('     en base : ' + (nu1 ? nu1.cles.join(' ') + ' · sol ' + nu1.sol + ' car., ' + nu1.peint + ' peinte(s)' : '(rien)'));
  c.dit(!!nu1 && nu1.cles.includes('sol'), '`sol` entre dans mondeNu() dès qu’on a peint');
  c.dit(!!nu1 && nu1.sol === 324, 'et c’est une chaîne de 324 caractères, une par case');
  c.dit(!!nu1 && nu1.peint === 3, 'qui porte bien les trois cases (' + (nu1 ? nu1.peint : 0) + ')');

  /* **Le code de sauvegarde est l'autre chemin**, et il se remettait à
     jour nulle part : `ouvrirOnglet()` ne reconstruit rien, et aucun
     pinceau n'appelle `buildAll()`. Un enfant qui peignait puis copiait
     son code copiait l'île d'avant. Ça ne datait pas de la peinture — le
     pinceau de terrain avait déjà ce défaut. */
  const cp = await codePeint();
  console.log('     dans le code de sauvegarde : ' + cp);
  c.dit(cp === 3, 'le code de sauvegarde porte la peinture sans attendre un buildAll (' + cp + ')');

  // Ctrl+Z : une peinture qu'on ne peut pas reprendre n'est pas un pinceau.
  await ileTab(); await attendre(400);
  await page.keyboard.press('Control+z');
  await attendre(600);
  const n2 = await compte();
  console.log('     après Ctrl+Z : ' + n2);
  c.dit(n2 === 2, 'Ctrl+Z reprend le dernier coup de pinceau (' + n2 + ')');

  // La gomme, qui est une couleur de la rangée.
  await armer('Effacer');
  await attendre(300);
  const bb2 = await page.locator('#world').boundingBox();
  await page.mouse.click(bb2.x + bb2.width * 0.46, bb2.y + bb2.height * 0.53);
  await attendre(400);
  const n3 = await compte();
  console.log('     après la gomme : ' + n3);
  c.dit(n3 === 1, 'la gomme retire une case (' + n3 + ')');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('18 bis. les deux chemins de la peinture, éprouvés en les cassant');
{
  /* Les deux assertions du contrôle 18 qui comptent — « `sol` entre dans
     `mondeNu()` » et « le code de sauvegarde le porte » — ne valent que
     si elles rougissent quand on casse ce qu'elles surveillent. Sans
     ça, ce sont deux phrases.

     On sert donc **deux copies abîmées** du site et on refait la même
     mesure. `remplacer()` lève si la panne ne trouve pas sa cible : une
     panne qui ne se pose pas rendrait le contrôle vert pour la pire des
     raisons. */
  const peindre = async (site) => {
    const o = await onglet(nav, { taille: { width: 1200, height: 860 },
      memoire: { 'dansisland:entre': '1', 'dansisland:guide': '1', 'dansisland:muet': '1' } });
    await o.page.goto(site.url, { waitUntil: 'load' });
    await attendre(2500);
    await o.page.evaluate(() => {
      const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'ile');
      if (b) b.click();
    });
    await attendre(600);
    await o.page.evaluate(() => {
      const f = [...document.querySelectorAll('.field')].find(x => /Peindre le sol/.test(x.textContent));
      f.scrollIntoView({ block: 'center' });
      [...f.querySelectorAll('button')].find(b => /Corail/.test(b.textContent)).click();
    });
    await attendre(300);
    // Relevée **après** l'armement : la pastille fait défiler la page.
    const bb = await o.page.locator('#world').boundingBox();
    for (const [fx, fy] of [[0.50, 0.50], [0.46, 0.53]]) {
      await o.page.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy);
      await attendre(150);
    }
    await attendre(400);
    const base = await o.page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('test:dernier-monde')); } catch (e) { return null; }
    });
    const code = await o.page.evaluate(() => {
      const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
      if (b) b.click();
      const v = [...document.querySelectorAll('#p-voisins textarea')].map(e => e.value)
        .find(x => x && x.length > 40) || '';
      try { const j = JSON.parse(decodeURIComponent(escape(atob(v))));
            return (j.l || '').split('').filter(ch => ch !== '.').length; }
      catch (e) { return -1; }
    });
    await o.ctx.close();
    return { base, code };
  };

  // 1. `mondeNu()` qui oublie la peinture : elle n'arriverait jamais en base.
  const p1 = await servir(8157, src => remplacer(src,
    /  const s=solDe\(w\); if\(s!==SOL_VIDE\) o\.sol=s;\n/, ''));
  c.dit(p1.pannePosee, 'la panne « mondeNu() oublie sol » a bien été posée');
  const r1 = await peindre(p1);
  p1.fermer();
  console.log('     sans la ligne de mondeNu : base ' +
              (r1.base ? r1.base.peint + ' peinte(s)' : '(rien)') + ' · code ' + r1.code);
  c.dit(!!r1.base && !r1.base.cles.includes('sol'),
        'la peinture n’arrive plus en base — le contrôle 18 mord bien');
  c.dit(r1.code === 2, 'et le code de sauvegarde, lui, la porte encore : ce sont deux chemins');

  // 2. `saveMine()` qui ne rafraîchit plus le code : c'est le défaut qui
  //    existait depuis toujours, remis en place pour vérifier qu'on le voit.
  const p2 = await servir(8158, src => remplacer(src, /^  rafraichirCode\(\);\n/m, ''));
  c.dit(p2.pannePosee, 'la panne « le code ne se rafraîchit plus » a bien été posée');
  const r2 = await peindre(p2);
  p2.fermer();
  console.log('     sans rafraichirCode : base ' +
              (r2.base ? r2.base.peint + ' peinte(s)' : '(rien)') + ' · code ' + r2.code);
  c.dit(!!r2.base && r2.base.peint === 2, 'la base reçoit toujours la peinture');
  c.dit(r2.code === 0,
        'mais le code de sauvegarde repasse périmé (' + r2.code + ') — c’est bien lui qu’on corrigeait');
}

c.titre('18 ter. chez un voisin, on ne peint pas son sol');
{
  /* Un pinceau armé chez quelqu'un est un clic mort, et « je clique et il
     ne se passe rien » est le pire des retours — la leçon de la boutique
     du 16/09, tenue partout ailleurs par `fermerEnVisite()`. */
  const { ctx, page, erreurs } = await ouvrir(null);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
    if (b) b.click();
  });
  await attendre(700);
  const parti = await page.evaluate(() => {
    const n = [...document.querySelectorAll('#p-voisins .neighbor')][1];
    const b = n && [...n.querySelectorAll('button,a')].find(x => /Visiter/i.test(x.textContent));
    if (!b) return false;
    b.click(); return true;
  });
  await attendre(2200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'ile');
    if (b) b.click();
  });
  await attendre(600);
  const v = await page.evaluate(() => {
    const f = [...document.querySelectorAll('.field')].find(x => /Peindre le sol/.test(x.textContent));
    if (!f) return null;
    const b = [...f.querySelectorAll('button')];
    return { total: b.length, eteintes: b.filter(x => x.disabled).length };
  });
  console.log('     chez le voisin : ' + (v ? v.eteintes + ' pastilles éteintes sur ' + v.total : '(champ absent)'));
  c.dit(parti, 'on est bien arrivé chez un voisin');
  c.dit(!!v && v.total === 13, 'la rangée est visible — on voit ce qu’on aura chez soi');
  c.dit(!!v && v.eteintes === v.total, 'et toutes ses pastilles sont éteintes');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('19. on ne ramène plus un objet, on en rapporte une photo');
{
  /* Trois reproches, rapportés en jouant, et le mot « souvenir » les
     portait tous les trois : « je ramène un souvenir, il ne disparaît pas
     de l'autre île, je ne le vois pas sur la mienne ». Il disait qu'on
     **prend** quelque chose, et on ne prenait rien.

     Ce contrôle mesure ce qui l'a remplacé, de bout en bout : on va chez
     quelqu'un, on se met sur un objet, on appuie sur `E`, on rentre, on
     entre dans la maison, et on regarde le cadre. Pas une assertion sur la
     source : ce qui compte ici est ce qu'un enfant voit.

     Le bonhomme est **posé** sur un objet du voisin plutôt que marché
     jusque-là : viser une case demanderait de refaire la caméra, et `pt()`
     est seul à avoir le droit de défaire cette transformation. C'est le
     même choix que le `SOUS` du haut de ce fichier, et la sonde le dit :
     `__poser` ne fait que déplacer le bonhomme, tout le reste — la plaque,
     `proximity()`, `E`, `agir()` — est le vrai chemin. */
  const s2 = await servir(8156, src => remplacer(src,
    /function proximity\(\)\{/,
    'window.__poser=()=>{ const o=(world.objects||[]).find(x=>x.t!==\'panneau\'&&x.t!==\'crotte\');' +
    ' if(!o) return null; hero.x=o.x+0.5; hero.y=o.y+0.5; target=null; return o.t; };\n' +
    'window.__compte=()=>({ owner:world.owner, lui:(world.objects||[]).length,' +
    ' moi:(mine.objects||[]).length });\n' +
    'window.__base=()=>Object.keys(mondeNu(mine)).sort().join(\' \');\n' +
    'window.__code=()=>encode(mine);\n' +
    'window.__devantLeCadre=()=>{ const k=(pieceData().meubles||[]).find(m=>m.t===\'tableau\'&&m.photo);' +
    ' if(!k) return null; hero.x=k.x+0.5; hero.y=k.y+0.5; target=null; return k.photo; };\n' +
    'window.__cadres=()=>{ const r=[]; PIECES.forEach(q=>((mine.interieur.pieces[q.k]||{}).meubles||[])' +
    '.forEach(m=>{ if(m.t===\'tableau\') r.push({p:q.k,photo:m.photo||null,de:m.de||null,pc:m.pc||null}); })); return r; };\n' +
    'function proximity(){'));
  const o = await onglet(nav, {
    taille: { width: 1200, height: 860 },
    memoire: { 'dansisland:entre': '1', 'dansisland:guide': '1', 'dansisland:muet': '1' },
  });
  const { ctx, page, erreurs } = o;
  await page.goto(s2.url, { waitUntil: 'load' });
  await attendre(2500);

  // Chez un voisin.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
    if (b) b.click();
  });
  await attendre(700);
  const parti = await page.evaluate(() => {
    const n = [...document.querySelectorAll('#p-voisins .neighbor')][1];
    const b = n && [...n.querySelectorAll('button,a')].find(x => /Visiter/i.test(x.textContent));
    if (!b) return false;
    b.click(); return true;
  });
  await attendre(2200);
  c.dit(parti, 'on est bien arrivé chez un voisin');

  const avant = await page.evaluate(() => window.__cadres().length);
  /* `world` dans une page de test n'est **pas** le monde du jeu : un
     élément à `id` devient une globale, et `#world` est le canvas. Donc
     `world.objects` vaut `undefined` et compte zéro sans rien prouver.
     C'est le piège de sonde écrit le 19/09, et c'est pour ça que le compte
     passe par le crochet et pas par `page.evaluate` en direct. */
  const n0 = await page.evaluate(() => window.__compte());
  const sujet = await page.evaluate(() => window.__poser());
  await attendre(700);
  const v = await etat(page);
  console.log('     sur ' + sujet + ' : ' + (v.plaque || '(pas de plaque)') + ' · ' + v.murmure);
  c.dit(!!sujet, 'un objet du voisin a été trouvé (' + sujet + ')');
  c.dit(!!v.plaque && /photo/i.test(v.plaque), 'la plaque rose propose de prendre une photo');
  c.dit(/photo/i.test(v.murmure), 'et la bulle dit la même chose que la plaque');
  // Le mot qui disait qu'on prenait quelque chose ne doit plus s'y trouver.
  c.dit(!/souvenir/i.test(v.plaque + ' ' + v.murmure),
        'ni l’une ni l’autre ne promet qu’on ramène quelque chose');

  await page.keyboard.press('e');
  await attendre(600);
  const ap = await etat(page);
  console.log('     après E : ' + ap.murmure);
  const cadres = await page.evaluate(() => window.__cadres());
  const neuf = cadres.filter(k => k.photo);
  console.log('     cadres : ' + JSON.stringify(neuf));
  c.dit(cadres.length === avant + 1, 'un cadre de plus dans la maison (' + avant + ' → ' + cadres.length + ')');
  c.dit(neuf.length === 1 && neuf[0].photo === sujet,
        'il porte le **type** de l’objet photographié, pas des pixels (' +
        (neuf[0] ? neuf[0].photo : '—') + ')');
  c.dit(!!neuf[0] && !!neuf[0].de, 'et il est signé du nom de l’hôte (' + (neuf[0] || {}).de + ')');
  c.dit(!!neuf[0] && !!neuf[0].pc,
        'il garde la couleur qu’avait l’objet : un phare rouge n’est pas bleu au mur');
  // La phrase nomme la pièce, sinon « il t'attend chez toi » ne dit pas où.
  c.dit(new RegExp(neuf[0] ? neuf[0].p : 'zzz', 'i').test(ap.murmure),
        'la phrase nomme la pièce où il est accroché (' + (neuf[0] || {}).p + ')');

  /* Les deux premiers reproches se mesurent, et c'est tout l'objet de ce
     bloc : « il ne disparaît pas de l'autre île » — il n'a jamais eu à
     disparaître, on n'a rien pris ; « je ne le vois pas sur mon île » —
     il n'y est pas, et c'est maintenant ce que la phrase annonce. */
  const n1 = await page.evaluate(() => window.__compte());
  const bilan = { owner: n1.owner, chezLui: n1.lui, avant: n0.lui,
                  chezMoi: n1.moi, moiAvant: n0.moi };
  console.log('     chez ' + bilan.owner + ' : ' + bilan.chezLui + ' objets (' +
              bilan.avant + ' avant) · chez moi : ' + bilan.chezMoi);
  c.dit(bilan.chezLui === bilan.avant,
        'l’île visitée n’a pas perdu un objet (' + bilan.avant + ' → ' + bilan.chezLui + ')');
  c.dit(bilan.chezMoi === bilan.moiAvant,
        'et la mienne n’en a pas gagné (' + bilan.moiAvant + ' → ' + bilan.chezMoi + ')');

  /* **Les deux chemins.** `mondeNu()` et `encode()` sont deux routes pour
     la même donnée, donc deux occasions de l'oublier — c'est écrit depuis
     le 16/09, et le code de sauvegarde ne passe que par la seconde. Un
     harnais qui ne regarde qu'une des deux dit « tout va bien » sur la
     moitié de la question. */
  const base = await page.evaluate(() => window.__base());
  console.log('     en base : ' + base);
  c.dit(!/\bphoto\b|\bcadre/.test(base),
        'aucune clé de plus au premier niveau : le cadre est un meuble, et ' +
        '`interieur` y était déjà');
  c.dit(/\binterieur\b/.test(base), 'et `interieur` part bien en base');
  const dansLeCode = await page.evaluate(() => {
    const o = JSON.parse(decodeURIComponent(escape(atob(window.__code()))));
    const ms = ((o.i && o.i.pieces && o.i.pieces.salon) || {}).meubles || [];
    const k = ms.find(m => m.t === 'tableau' && m.photo);
    return k ? { photo: k.photo, de: k.de, pc: k.pc } : null;
  });
  console.log('     dans le code de sauvegarde : ' + JSON.stringify(dansLeCode));
  c.dit(!!dansLeCode && dansLeCode.photo === sujet,
        'le code de sauvegarde porte le cadre, sa signature et sa couleur');

  /* Et enfin ce qu'un enfant voit : on rentre, on entre, on se met devant,
     et le cadre **dit de qui vient sa photo**. Sans ça c'est un rectangle
     de plus au mur, et la visite n'aura rien rapporté. */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'ile');
    if (b) b.click();
  });
  await attendre(500);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#p-ile button')].find(x => /Rentrer chez toi/.test(x.textContent));
    if (b) b.click();
  });
  await attendre(2200);
  const entre = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'maison');
    if (t) t.click();
    return true;
  });
  await attendre(600);
  /* Cliquer un bouton d'un panneau qui défile fait bouger la page, et le
     clic part à côté : on l'amène sous la vue d'abord. Trois heures
     perdues là-dessus le 20/09. */
  await page.evaluate(async () => {
    const b = [...document.querySelectorAll('#p-maison button')].find(x => /Entrer/.test(x.textContent));
    if (!b) return;
    b.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 200));
    b.click();
  });
  await attendre(1400);
  const vu = await page.evaluate(() => window.__devantLeCadre());
  await attendre(800);
  const d = await etat(page);
  console.log('     devant le cadre : ' + (d.murmure || '(rien)'));
  c.dit(entre && vu === sujet, 'on est rentré, entré, et le cadre est là (' + vu + ')');
  c.dit(/Lila/.test(d.murmure), 'la bulle nomme de chez qui vient la photo');
  c.dit(/photo/i.test(d.murmure), 'et elle dit que c’est une photo, pas l’objet');
  c.dit(d.plaque === null, 'pas de plaque rose : un cadre se regarde, il ne se prend pas');

  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close(); s2.fermer();
}

c.titre('20. le sentier des visiteurs — une lanterne par personne, rien en base');
{
  /* « L'île grandit parce que des gens sont passés » est écrit depuis le
     16/09, et ça ne se lisait que dans un compteur de rayon — c'est-à-dire
     nulle part. Une lanterne par personne distincte rend la phrase
     physique : on la voit, on marche dessus, elle dit qui, et la nuit
     elle éclaire.

     Ce contrôle ne lit pas la source pour les positions : il demande au
     jeu où elles sont tombées et vérifie chacune contre le rayon, l'eau,
     la maison et les objets. Une lanterne dans la mer serait le défaut
     qu'on ne découvre qu'à la dix-septième île. */
  const PANNE = src => remplacer(src, /function cheminHabitant\(o,cible\)\{/,
    'window.__lant=()=>lanternesDe(world).map(l=>({x:l.x,y:l.y,nom:l.nom}));\n' +
    'window.__ok=(x,y)=>({ rayon:dansLeRayon(x,y,world),' +
    ' eau:(world.tiles||[])[y*GRID+x]===2,' +
    ' maison:(x>=world.house.x&&x<=world.house.x+1&&y>=world.house.y&&y<=world.house.y+1),' +
    ' objet:(world.objects||[]).some(o=>couvre(o,x,y)) });\n' +
    'window.__code=()=>encode(mine);\n' +
    'window.__base=()=>Object.keys(mondeNu(mine)).sort().join(\' \');\n' +
    'window.__poserSur=(k)=>{ const l=lanternesDe(world)[k]; if(!l) return null;' +
    ' hero.x=l.x+0.5; hero.y=l.y+0.5; target=null; return l.nom; };\n' +
    'function cheminHabitant(o,cible){');

  // Cinq prénoms, et **trois mots de plus signés Lila** : une personne,
  // une lanterne, quel que soit le nombre de mots qu'elle a laissés.
  const CINQ = [['Lila','coucou'], ['Nour','joli'], ['Yann','salut'],
                ['Inès','bravo'], ['Tom','super'],
                ['Lila','je repasse'], ['Lila','encore moi'], ['Lila','et hop']];

  const s2 = await servir(8157, PANNE);
  const o = await onglet(nav, {
    taille: { width: 1200, height: 860 },
    memoire: { 'test:mots': JSON.stringify(CINQ), 'dansisland:entre': '1',
               'dansisland:guide': '4', 'dansisland:muet': '1' },
  });
  const { ctx, page, erreurs } = o;
  await page.goto(s2.url, { waitUntil: 'load' });
  await attendre(2600);

  const lant = await page.evaluate(() => window.__lant());
  console.log('     lanternes : ' + lant.map(l => l.nom + '(' + l.x + ',' + l.y + ')').join(' · '));
  c.dit(lant.length === 5,
        'cinq personnes distinctes, cinq lanternes — pas huit (' + lant.length + ')');
  const noms = new Set(lant.map(l => l.nom));
  c.dit(noms.size === 5 && noms.has('Lila'), 'chacune porte un prénom, et Lila n’en a qu’une');

  /* Chaque case, vérifiée contre les quatre choses qui la rendraient
     fausse. C'est la leçon du restaurant de « La Crique » qui flottait au
     nord : `dansLeRayon()` dit où est l'île, la tuile ne dit que ce qui y
     est peint — il faut les deux. */
  const mauvaises = [];
  for (const l of lant) {
    const v = await page.evaluate(([x, y]) => window.__ok(x, y), [l.x, l.y]);
    if (!v.rayon || v.eau || v.maison || v.objet)
      mauvaises.push(l.nom + ' ' + JSON.stringify(v));
  }
  c.dit(mauvaises.length === 0,
        'aucune n’est dans l’eau, hors du rayon, sous la maison ou sur un objet' +
        (mauvaises.length ? ' → ' + mauvaises.join(' ; ') : ''));

  // Rien en base, et **les deux chemins** : `mondeNu()` et `encode()`.
  const base = await page.evaluate(() => window.__base());
  const code = await page.evaluate(() => {
    const o = JSON.parse(decodeURIComponent(escape(atob(window.__code()))));
    return Object.keys(o).sort().join(' ');
  });
  console.log('     en base : ' + base);
  c.dit(!/lanterne|ami|visiteur/i.test(base + ' ' + code),
        'aucune clé de plus, ni dans mondeNu() ni dans le code de sauvegarde');
  c.dit(!/lanterne/i.test(JSON.stringify(await page.evaluate(() => window.__lant()))
        .replace(/lanternes?/gi, '')), 'le repère est la liste, pas une clé du monde');

  // Elle se **regarde** : une bulle qui nomme la personne, pas de plaque.
  const qui = await page.evaluate(() => window.__poserSur(0));
  await attendre(800);
  const v = await etat(page);
  console.log('     sur la lanterne de ' + qui + ' : ' + (v.murmure || '(rien)'));
  c.dit(new RegExp(qui).test(v.murmure), 'la bulle nomme la personne qui est passée');
  // Pas d'accord de genre sur un prénom : « est passée » / « est passé »
  // ne se choisit pas quand le prénom est du texte libre.
  c.dit(/laissé un mot|Un mot d/.test(v.murmure), 'et elle dit ce que c’est');
  c.dit(!/passée?\b/.test(v.murmure), 'sans accorder quoi que ce soit à un prénom');
  c.dit(v.plaque === null,
        'pas de plaque rose : une lanterne se regarde, elle ne se prend pas');

  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close(); s2.fermer();

  /* **La stabilité**, et c'est elle qui compte le plus : le dixième ami ne
     doit jamais déplacer le premier. Une île dont les lumières bougent à
     chaque visite ne se reconnaît plus. On re-sème les cinq plus un
     sixième et on compare les cinq premières positions. */
  const s3 = await servir(8158, PANNE);
  const o3 = await onglet(nav, {
    taille: { width: 1200, height: 860 },
    memoire: { 'test:mots': JSON.stringify(CINQ.concat([['Maya', 'hello']])),
               'dansisland:entre': '1', 'dansisland:guide': '4', 'dansisland:muet': '1' },
  });
  await o3.page.goto(s3.url, { waitUntil: 'load' });
  await attendre(2600);
  const lant6 = await o3.page.evaluate(() => window.__lant());
  const pos = a => a.slice(0, 5).map(l => l.nom + ':' + l.x + ',' + l.y).join(' ');
  console.log('     à cinq : ' + pos(lant));
  console.log('     à six  : ' + pos(lant6));
  c.dit(lant6.length === 6, 'un ami de plus, une lanterne de plus (' + lant6.length + ')');
  c.dit(pos(lant) === pos(lant6), 'et les cinq premières n’ont pas bougé d’une case');
  c.dit(o3.erreurs.length === 0, 'aucune erreur de console');
  await o3.ctx.close(); s3.fermer();
}

c.titre('21. « Lila t’a répondu » — la boucle qui était coupée');
{
  /* `motsDe()` interroge par **île**. Donc l'auteur d'un mot n'apprenait
     jamais qu'on lui avait répondu : la réponse ne s'affichait que s'il
     retournait là-bas **et** marchait jusqu'à son propre panneau. C'est
     la seule boucle du jeu qui fasse *revenir* quelqu'un, et elle était
     coupée à son troisième pas — donc une migration jouée le 20/09 pour
     une fonctionnalité que le bénéficiaire ne voyait pas. */
  const REPS = [['Lila', 'lila', 'Ton île est belle', 'Merci, reviens quand tu veux !', 0],
                ['Nour', 'nour', 'Joli phare', 'Il est neuf :)', 2]];
  const ouvrirRep = async reps => {
    const o = await onglet(nav, {
      taille: { width: 1200, height: 860 },
      memoire: { 'test:reponses': JSON.stringify(reps), 'dansisland:entre': '1',
                 'dansisland:guide': '4', 'dansisland:muet': '1' },
    });
    await o.page.goto(s.url, { waitUntil: 'load' });
    await attendre(2600);
    return o;
  };
  const voisins = page => page.evaluate(() => {
    const p = document.getElementById('p-voisins');
    const f = p.querySelector('.field');
    const onglet = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
    return {
      premier: f ? f.innerText.replace(/\s+/g, ' ').trim().slice(0, 150) : '',
      pastille: !!(onglet && onglet.classList.contains('cadeau')),
      boutons: [...p.querySelectorAll('.field')][0]
        ? [...[...p.querySelectorAll('.field')][0].querySelectorAll('button')].map(b => b.textContent.trim())
        : [],
    };
  });

  const { ctx, page, erreurs } = await ouvrirRep(REPS);
  const v = await etat(page);
  console.log('     au chargement : ' + (v.murmure || '(rien)'));
  c.dit(/Lila/.test(v.murmure), 'le message d’accueil nomme qui a répondu');
  c.dit(/répondu/.test(v.murmure), 'et dit que c’est une réponse');
  // Une seule bulle pour les deux nouvelles : deux `say()` coup sur coup,
  // et c'est le premier qui est perdu.
  c.dit((v.murmure.match(/Depuis ton dernier passage/g) || []).length === 1,
        'une seule bulle, pas deux messages coup sur coup');

  const a = await voisins(page);
  console.log('     en tête de Voisins : ' + a.premier);
  console.log('     boutons : ' + a.boutons.join(' · '));
  c.dit(/répondu/i.test(a.premier), 'le bloc des réponses est **en tête** de l’onglet');
  c.dit(/Lila/.test(a.premier) && /Merci/.test(a.premier),
        'il porte le prénom et le texte de la réponse');
  /* Le bouton qui **emmène** : sans lui on saurait qu'on a une réponse
     sans savoir où la lire, et c'est exactement le défaut qu'on corrige.
     La règle de la boutique du 16/09 : la réponse tombe là où est le doigt. */
  c.dit(a.boutons.some(b => /Lila/.test(b)), 'et le bouton qui emmène chez elle');
  c.dit(a.pastille === true, 'la pastille de l’onglet Voisins est allumée');

  // Elle s'éteint quand on a eu la liste **sous les yeux**, pas au
  // chargement : marquer au chargement, c'est perdre le signal pour qui
  // ouvre le jeu sans regarder.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
    if (b) b.click();
  });
  await attendre(500);
  const b = await voisins(page);
  const vues = await page.evaluate(() => window.__reponsesVues || 0);
  c.dit(b.pastille === false, 'et elle s’éteint quand on ouvre l’onglet');
  c.dit(vues === 1, 'le serveur a retenu le coup d’œil (' + vues + ')');
  c.dit(/répondu/i.test(b.premier), 'le bloc, lui, reste : ce n’est pas une notification');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();

  // Sans réponse, l'onglet est **exactement** celui d'avant.
  const o0 = await ouvrirRep([]);
  const z = await voisins(o0.page);
  console.log('     sans réponse, en tête : ' + z.premier.slice(0, 60));
  c.dit(/commande/i.test(z.premier),
        'sans réponse, la commande du jour reprend la tête');
  c.dit(z.pastille === false, 'et la pastille reste éteinte');
  c.dit(o0.erreurs.length === 0, 'aucune erreur de console');
  await o0.ctx.close();

  /* **À marée basse aussi**, et c'est le défaut que cette section a
     elle-même révélé en devenant rouge sans qu'une ligne du jeu ait
     changé. `avancerMaree()` annonce la mer basse à la **première
     image** ; le message d'accueil arrive de la base quelques centaines
     de millisecondes plus tôt, donc la marée le recouvrait. Une fois sur
     trois — la mer est basse environ 3 h 45 sur 12 h 25 — quelqu'un
     avait écrit et on ne l'apprenait jamais.

     Le faux fige désormais la mer **haute** pour tous les contrôles, ce
     qui ôte l'oracle. Celui-ci force donc la mer **basse** : ce qu'on
     veut mesurer, on le demande, on ne l'attend pas. `niveau =
     (1 - cos(2π·phase))/2`, donc phase 0 est le creux. */
  const bas = await onglet(nav, {
    taille: { width: 1200, height: 860 },
    memoire: { 'test:reponses': JSON.stringify(REPS),
               'test:maree': JSON.stringify({ phase: 0, numero: 1000 }),
               'dansisland:entre': '1', 'dansisland:guide': '4', 'dansisland:muet': '1' },
  });
  await bas.page.goto(s.url, { waitUntil: 'load' });
  await attendre(1200);
  const vb = await etat(bas.page);
  console.log('     à marée basse : ' + (vb.murmure || '(rien)'));
  c.dit(/Lila/.test(vb.murmure),
        'la marée basse ne recouvre plus « Lila t’a répondu »');
  c.dit(!/Marée basse/.test(vb.murmure),
        'elle se tait quand le murmure porte déjà quelque chose');
  c.dit(bas.erreurs.length === 0, 'aucune erreur de console');
  await bas.ctx.close();
}

c.titre('22. le cadeau du jour ne se perd plus');
{
  /* C'était le **seul endroit du jeu où l'on perdait quelque chose** :
     `serie` comptait les jours d'affilée et repartait à 1 dès qu'un jour
     était sauté, donc le cadeau retombait de 10 shells à 4 et le septième
     — celui qui offre un objet — reculait d'une semaine entière.

     Tout le reste du jeu tient la règle inverse : le chien qui s'assied
     n'échoue pas, la mer repose le bonhomme à terre, le potager ne meurt
     jamais, on ne reprend pas ce qui a été posé.

     Le contrôle fabrique **l'enfant parti en vacances** — dernier cadeau
     il y a une semaine, cinq déjà ouverts — parce que c'est le seul état
     où l'ancienne règle mordait, donc le seul qui prouve qu'elle est
     partie. */
  /* On ouvre le cadeau par le **vrai geste** : un coffre sous les pieds
     et la touche `E`. Le bouton du panneau n'existe que sur une île **sans
     coffre** — la règle du 17/09, « le bouton du panneau ne disparaît que
     s'il y a un coffre » — et mon premier essai le cherchait sur une île
     qui en porte un : clic dans le vide, murmure vide, trois assertions
     rouges qui ne disaient rien du jeu. D'où la première assertion
     ci-dessous, qui refuse de mesurer si le coffre ne s'est pas ouvert. */
  const COFFRE = [{ t: 'coffre', x: 8, y: 10, c: '#B8823C' }];
  const ouvrirCad = async bourse => {
    const o = await onglet(nav, {
      taille: { width: 1200, height: 860 },
      memoire: { 'test:bourse': JSON.stringify(bourse),
                 'test:objets': JSON.stringify(COFFRE), 'dansisland:entre': '1',
                 'dansisland:guide': '4', 'dansisland:muet': '1' },
    });
    await o.page.goto(s.url, { waitUntil: 'load' });
    await attendre(2600);
    return o;
  };
  const noteEtGain = async page => {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'boutique');
      if (b) b.click();
    });
    await attendre(600);
    const note = await page.evaluate(() => {
      const f = [...document.querySelectorAll('#p-boutique .field')]
        .find(x => /cadeau/i.test(x.textContent));
      const p = f && [...f.parentNode.children];
      const i = p ? p.indexOf(f) : -1;
      return (i >= 0 && p[i + 1] ? p[i + 1].innerText : '').replace(/\s+/g, ' ').trim();
    });
    await page.keyboard.press('e');
    await attendre(900);
    return { note, murmure: (await etat(page)).murmure };
  };

  // Cinq cadeaux déjà ouverts, le dernier il y a une semaine.
  const vacances = { serie: 5, cadeau: '2026-09-12', jour: '2026-09-19', shells: 10 };
  const a = await ouvrirCad(vacances);
  const va = await noteEtGain(a.page);
  console.log('     note   : ' + va.note);
  console.log('     après E : ' + va.murmure);
  c.dit(/shell/.test(va.murmure),
        'le coffre s’est bien ouvert — sinon rien de ce qui suit ne mesure quoi que ce soit');

  /* **Le câblage d'abord** : ni la source du jeu ni celle du faux ne
     doivent porter la remise à un. Deux chemins pour la même idée — le
     serveur et le miroir hors ligne — et c'est celui-là que voit un
     enfant sans compte. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const sql = readFileSync(new URL('../supabase/2026-09-21_cadeau_sans_perte.sql',
                                   import.meta.url), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  c.dit(/b\.serie\s*=\s*\(b\.serie\|\|0\)\+1/.test(code),
        'le miroir hors ligne incrémente sans condition');
  c.dit(!/jourDecale\(-1\)\s*\)\s*\?/.test(code),
        'et la remise à un a disparu du miroir');
  // Le SQL porte l'ancienne ligne **en commentaire**, pour dire ce qui a
  // changé : on retire les commentaires avant de chercher, sinon
  // l'assertion tombe sur l'explication. C'est le « shell » cherché dans
  // sa propre bulle, du 19/09.
  const sqlNu = sql.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
  c.dit(/b\.serie\s*:=\s*b\.serie\s*\+\s*1\s*;/.test(sqlNu),
        'et `bourse_cadeau()` fait la même chose côté serveur');
  c.dit(!/else\s+1\s+end/.test(sqlNu), 'la remise à un a disparu du SQL aussi');

  /* Puis ce qu'un enfant voit. Le gain est la preuve la plus directe :
     à la sixième ouverture il vaut 9 (3+6), là où l'ancienne règle
     l'aurait renvoyé à 4 (3+1). */
  c.dit(/\+9 shells/.test(va.murmure),
        'six cadeaux ouverts donnent 9 shells, pas les 4 d’une série cassée');
  c.dit(!/affilée/i.test(va.note + ' ' + va.murmure),
        'plus un mot de « jours d’affilée » à l’écran');
  c.dit(!/reviens demain/i.test(va.note + ' ' + va.murmure),
        'ni de « reviens demain » : ce qui tire est devant, pas derrière');
  c.dit(/n’enlève rien|enlève rien/.test(va.note),
        'la note dit que sauter des jours ne coûte rien');
  c.dit(/Encore <?b?>?1|Encore 1/.test(va.murmure.replace(/<[^>]*>/g, '')),
        'et elle annonce ce qui vient : encore 1 avant l’objet');
  c.dit(a.erreurs.length === 0, 'aucune erreur de console');
  await a.ctx.close();

  // Et le tout premier cadeau reste doux : pas de compte à tenir.
  const b = await ouvrirCad({ serie: 0, cadeau: '', jour: '2026-09-19', shells: 10 });
  const vb = await noteEtGain(b.page);
  console.log('     premier : ' + vb.murmure);
  c.dit(/\+4 shells/.test(vb.murmure), 'le premier cadeau vaut 4 shells');
  c.dit(!/affilée|reviens demain/i.test(vb.note + ' ' + vb.murmure),
        'et rien n’y presse non plus');
  c.dit(b.erreurs.length === 0, 'aucune erreur de console');
  await b.ctx.close();
}




c.titre('23. les habitants ont un nom, et ils te le disent une fois');
{
  /* Ils traversaient l'île sans que personne sache pourquoi, et un
     personnage qui marche sans but se lit comme un décor animé. Ils
     disent maintenant leur prénom et où ils vont — une phrase qu'on peut
     vérifier en les suivant des yeux, donc « montrer » et « dire »
     d'accord pour une fois.

     Trois défauts possibles, et les trois sont silencieux :

     1. **deux bonjours coup sur coup.** Deux habitants deviennent
        éligibles à une image d'écart, et le second recouvre le premier :
        mesuré avant la correction, les deux cases étaient dans
        `habSalues` dès le premier échantillon mais **une seule phrase**
        avait jamais été lisible. C'est la faute déjà nommée pour le
        message d'accueil ;
     2. **la phrase qui se rejoue.** Ils font l'aller-retour toutes les
        quinze secondes : sans le « une fois », le murmure portait la même
        phrase sur 55 relevés sur 62, et le seul canal de texte du jeu
        était confisqué ;
     3. **l'article en dur.** « à le restaurant », « à la école ». Les six
        bâtiments couvrent les trois cas à eux seuls, donc écrire les
        articles à la main aurait été faux le premier jour. */
  /* Les deux cases sont **mesurées, pas choisies** : la panne n° 1 ne se
     produit que si les deux habitants sont à portée de parole *à la même
     image*, et rien ne le garantit — les phases se déduisent de la case,
     donc leur point de croisement est fixe. Quatre dispositions ont été
     relevées sur deux tours entiers avant d'en écrire une :

         deux face à face  (4,9)+(11,9)   21 relevés sur 130
         deux plus serrés  (5,9)+(10,9)  130 sur 130
         quatre autour                     0 sur 130
         quatre en croix                   0 sur 130

     Les deux dispositions à quatre bâtiments rendent **zéro** : les
     habitants s'apparient entre eux et ne passent pas près du bonhomme.
     Avec (4,9)+(11,9), la panne posée exprès **passait au vert** — le
     contrôle ne fabriquait pas la situation qu'il prétendait couvrir.
     (5,9)+(10,9) les tient à portée tout le temps, donc la collision est
     certaine et non probable. */
  const DEUX = [{ t: 'ferme', x: 5, y: 9 }, { t: 'ecole', x: 10, y: 9 }];
  const UN = [{ t: 'ferme', x: 4, y: 9 }];

  // Une panne qui n'en est pas une : elle expose l'état du jeu à la page.
  // Sans ça on mesure un murmure sans savoir qui était éligible quand.
  const SONDE = src => remplacer(src, /function frame\(t\)\{/,
    'function frame(t){ window.__lieux=()=>[\'ferme\',\'ecole\',\'coiffeur\',' +
    '\'supermarche\',\'restaurant\',\'culte\'].map(k=>auLieu(k).replace(/<[^>]*>/g,\'\'));' +
    'window.__hab=()=>habitantsAu(tNow).length;');
  const sp = await servir(8156, SONDE);

  const suivre = async (objets, ms) => {
    const o = await onglet(nav, {
      taille: { width: 1200, height: 860 },
      memoire: { 'test:objets': JSON.stringify(objets), 'dansisland:entre': '1',
                 'dansisland:guide': '4', 'dansisland:muet': '1' },
    });
    await o.page.goto(sp.url, { waitUntil: 'load' });
    // Le pas est de 250 ms parce que la phrase dure 3,4 s : un relevé plus
    // lâche raterait une bulle qui ne tiendrait qu'une image, et c'est
    // précisément la panne n° 1.
    const vus = [], phrases = new Set();
    let avant = '', bascules = 0;
    for (let i = 0; i < ms / 250; i++) {
      const w = await o.page.evaluate(() => {
        const e = document.getElementById('whisper');
        return e && e.classList.contains('on') ? e.textContent.trim() : '';
      });
      const bonjour = /te fait signe/.test(w);
      if (bonjour) { phrases.add(w); vus.push(w); }
      if (bonjour && w !== avant) bascules++;
      avant = w;
      await attendre(250);
    }
    return { o, phrases: [...phrases], vus, bascules,
             hab: await o.page.evaluate(() => window.__hab()) };
  };

  // --- les six lieux, imprimés autant que vérifiés -------------------
  const l = await onglet(nav, { taille: { width: 1200, height: 860 },
    memoire: { 'dansisland:entre': '1', 'dansisland:guide': '4', 'dansisland:muet': '1' } });
  await l.page.goto(sp.url, { waitUntil: 'load' });
  await attendre(2200);
  const lieux = await l.page.evaluate(() => window.__lieux());
  console.log('     ' + lieux.join(' · '));
  c.dit(lieux.length === 6, 'les six bâtiments ont une forme « où » (' + lieux.length + ')');
  /* Ce que ce contrôle peut prouver : qu'**aucun article n'est écrit à la
     main**, donc que les trois formes viennent du genre du catalogue et
     de la première lettre du nom. Ce qu'il ne peut pas prouver, c'est le
     français — il l'imprime, comme les deux relevés de genres et la ligne
     des prénoms élidés, pour qu'une personne le relise une fois. */
  c.dit(!lieux.some(x => /^à le |^à la [aeiouéè]|^au [aeiouéè]/i.test(x)),
        'aucune contraction impossible (« à le », « à la école », « au école »)');
  c.dit(lieux.filter(x => /^à la /.test(x)).length >= 1 &&
        lieux.filter(x => /^à l’/.test(x)).length >= 1 &&
        lieux.filter(x => /^au /.test(x)).length >= 1,
        'les trois formes mordent vraiment : « à la », « à l’ », « au »');
  await l.ctx.close();

  // --- deux habitants : chacun parle, chacun une fois ----------------
  const d = await suivre(DEUX, 16000);
  // Un repère absent doit faire échouer ce qui s'appuie dessus, jamais
  // l'absoudre : sans habitants, tout le reste serait vrai sans rien dire.
  c.dit(d.hab === 2, 'les deux habitants sont bien là (' + d.hab + ')');
  for (const p of d.phrases) console.log('     « ' + p + ' »');
  c.dit(d.phrases.length === 2,
        'les deux se présentent, et on a pu lire les deux (' + d.phrases.length + ')');
  c.dit(d.phrases.every(p => /Je vais voir/.test(p)),
        'chacun dit chez qui il va, et où');
  c.dit(d.bascules === 2,
        'aucun bonjour ne se rejoue en 16 s (' + d.bascules + ' phrases dites)');
  // 3,4 s à 250 ms font ~13 relevés par phrase. Sous 6 pour deux phrases,
  // c'est qu'une bulle a été recouverte avant d'avoir été lisible.
  c.dit(d.vus.length >= 12,
        'et chacune reste lisible (' + d.vus.length + ' relevés pour 2 phrases)');
  c.dit(d.o.erreurs.length === 0, 'aucune erreur de console');
  await d.o.ctx.close();

  // --- un seul bâtiment : il vient dire bonjour chez toi -------------
  const u = await suivre(UN, 12000);
  c.dit(u.hab === 1, 'un seul habitant (' + u.hab + ')');
  for (const p of u.phrases) console.log('     « ' + p + ' »');
  c.dit(u.phrases.length === 1 && /bonjour chez toi/.test(u.phrases[0]),
        'seul, il vient dire bonjour chez toi');
  c.dit(u.o.erreurs.length === 0, 'aucune erreur de console');
  await u.o.ctx.close();

  /* **Ils ne disent jamais ce qu'un objet payant dit.** Pas la marée, que
     vend la girouette à 42 shells ; pas les mots reçus, que vend la boîte
     aux lettres à 55. Un bâtiment à 34 qui donnerait la fonction d'un
     objet à 42, c'est le trou du 19/09 rouvert par une autre porte. Ça se
     lit dans la source, parce qu'une phrase absente ne se mesure pas. */
  const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const bloc = src.slice(src.indexOf('const hab=habitantProche();'),
                         src.indexOf('const hab=habitantProche();') + 900);
  c.dit(bloc.length > 400, 'le bloc du bonjour a été lu (' + bloc.length + ' caractères)');
  c.dit(!/maree|Maree|mareeTexte|motsNouveaux|bourse|shell/i.test(bloc),
        'il ne dit ni la marée, ni les mots reçus, ni les shells');
  sp.fermer();
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
