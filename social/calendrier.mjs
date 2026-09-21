/* Le mois de publications, et les images qui vont avec.
 *
 *   node calendrier.mjs            → les 30 images + calendrier.json
 *   node calendrier.mjs --sec      → seulement calendrier.json, sans rendre
 *
 * ── La cadence ────────────────────────────────────────────────────────
 *
 * **Une publication par jour**, et c'est un arbitrage, pas un défaut.
 * Le plan marketing disait trois par semaine *parce que produire coûte
 * une heure* ; en automatique ce coût disparaît et cet argument-là tombe.
 * Trois autres restent, et ils ne dépendent pas de qui produit :
 *
 *   — sur un compte neuf, deux publications par jour ne font pas deux
 *     fois la portée, elles se la partagent ;
 *   — le stock se brûle : les dix meilleurs sujets partent en cinq jours ;
 *   — deux par jour dès le premier jour, par l'API, avec des images de
 *     même facture, c'est le profil qu'un réseau amortit.
 *
 * `PAR_JOUR` est là pour que passer à deux soit **une ligne**, pas un
 * chantier : le workflow lit la même valeur.
 *
 * ── Le mélange des cinq directions ────────────────────────────────────
 *
 * Un compte qui publie trente fois la même maquette se lit comme un
 * gabarit, pas comme quelqu'un. Les cinq tournent donc, avec `detail`
 * en dominante — c'est le pilier « l'île du jour » du plan, celui qui
 * convertit. Le champ `m` de chaque jour dit laquelle : le jour où une
 * direction est choisie, on remplace les `m` concernés, et le fichier
 * imprime la répartition à chaque exécution pour qu'on la voie.
 *
 * ── Ce que ce fichier ne peut pas vérifier ────────────────────────────
 *
 * **Que la légende décrive ce que l'image montre.** C'est écrit dans
 * `fabrique.mjs` et ça vaut ici : l'automne ne change la clarté du sol
 * que de 182 à 180, et ce sont les feuilles qui le disent — or une image
 * fixe en attrape deux ou trois. Chaque carte se regarde avant de
 * partir. C'est la limite déjà écrite pour le son et pour les deux
 * relevés de genres : il y a des choses dont le juge est quelqu'un.
 */
import { navigateur } from '../test/aide.mjs';
import { capturer, composer } from './maquettes.mjs';
import fs from 'fs';

const OUT = new URL('./images/', import.meta.url).pathname;
const SEC = process.argv.includes('--sec');

export const PAR_JOUR = 1;

/* L'adresse publique des images. Le dépôt est public et l'API Instagram
   va chercher l'image à une URL — elle n'accepte pas d'octets. On passe
   donc par `raw.githubusercontent.com` plutôt que par le site : **rien de
   tout ceci ne touche à `dist/` ni à l'empreinte du déploiement.**
   Vérifié le 21/09 : 200, `content-type: image/jpeg`. */
export const RACINE_IMG =
  'https://raw.githubusercontent.com/simon605genie/dansisland/main/social/images/';

/* Quinze au maximum, en **premier commentaire** et non dans la légende —
   ça garde la légende lisible. Trois familles de cinq, du plan marketing.
   Pas de #gratuit ni de #free : ils attirent des comptes qui cherchent
   tout sauf un jeu. */
const TAGS = [
  '#cosygame', '#jeurelaxant', '#wholesomegames', '#pixelart', '#isometricart',
  '#jeuxpourenfants', '#parentsdeleves', '#ecranssains', '#jeuxsanspub', '#jeuenfrancais',
  '#indiegame', '#gamedev', '#jeuindependant', '#devjournal', '#faitmain',
];

// La troisième ligne de chaque légende, et elle ne change jamais : un
// lecteur qui tombe sur le cinquième post doit savoir où aller sans
// remonter au profil.
const ADRESSE = 'dansisland.app — gratuit, dans le navigateur, rien à installer.';

const ILE_NUE = [
  { t: 'palmier', x: 7, y: 8, c: '#2E7D5B' },
  { t: 'fleur', x: 10, y: 9, c: '#F48CA8' },
];
const ILE_MOYENNE = [
  ...ILE_NUE,
  { t: 'boitelettres', x: 9, y: 11, c: '#FF8F70' },
  { t: 'arbre', x: 12, y: 8, c: '#2E7D5B' },
  { t: 'banc', x: 6, y: 11, c: '#8B5E3C' },
];
const MOTS = [
  ['Lila', 'Trop belle ton île !', null, 8, 12],
  ['Nour', 'Je repasse demain', null, 11, 6],
  ['Ilan', 'J’adore le phare', null, 5, 10],
];

/* ── Les trente ────────────────────────────────────────────────────────
 *
 * L'ordre n'est pas décoratif. Les six premiers portent tout le poids :
 * un compte neuf n'a pas de public, donc ce sont eux que verront les
 * quelques personnes qui arrivent par les mots-clés. Ils répondent, dans
 * l'ordre : qu'est-ce que c'est · à quoi ça ressemble · pourquoi ça
 * rassure un parent · comment on y joue · pourquoi ce choix · qu'est-ce
 * qui bouge. Après seulement, on se promène.
 *
 * `l` est la légende en trois lignes du plan : ce qu'on voit, la règle
 * derrière, l'adresse. La troisième est ajoutée automatiquement.
 */
const JOURS = [
  { k: 'ouverture', m: 'claim', s: { zoom: 1 },
    t: { sur: 'GRATUIT · DÈS 6 ANS', titre: 'Un jeu où personne ne perd.',
         sous: 'Ton enfant construit son île, la décore, et l’envoie à ses copains. Rien à installer, rien à payer.' },
    l: ['Voilà Dan’s Island. Une île à soi, qu’on bâtit case par case.',
        'Pas de score, pas de minuteur, pas de partie perdue — ce n’est pas une fonctionnalité qui manque, c’est la décision de départ.'] },

  { k: 'nuit-phare', m: 'detail', s: { ciel: 'nuit', zoom: 2 },
    t: { mot: 'Il est 21 h sur l’île.' },
    l: ['La nuit, le phare balaie la mer et les lucioles sortent.',
        'Rien ne se passe. C’est exactement ce qu’on lui demande.'] },

  { k: 'ce-quil-ny-a-pas', m: 'absence', s: { zoom: 1 },
    t: { sur: 'CE QU’IL N’Y A PAS',
         rien: ['de score', 'de minuteur', 'de publicité', 'd’achat', 'de partie perdue'],
         mais: 'Juste une île, et des amis qui passent.' },
    l: ['Il n’y a rien à gagner, et rien à perdre.',
        'La monnaie du jeu se gagne en jouant et ne s’achète pas : il n’y a aucun paiement réel, et il n’y en aura jamais.'] },

  { k: 'comment-on-joue', m: 'boucle',
    ss: [{ zoom: 2, objets: ILE_NUE },
         { ciel: 'crépuscule', zoom: 2, objets: ILE_MOYENNE, mots: MOTS.slice(0, 1) },
         { zoom: 1, mots: MOTS }],
    t: { sur: 'EN TROIS GESTES', titre: 'Comment on joue',
         pas: [{ quoi: 'Tu construis ton île.', pourquoi: 'Le relief, les arbres, la maison, ta tête au pinceau.' },
               { quoi: 'Tu envoies une carte postale.', pourquoi: 'À un copain, sur WhatsApp. C’est ton adresse.' },
               { quoi: 'Il passe, et ton île grandit.', pourquoi: 'C’est la seule façon d’avoir plus de terre.' }] },
    l: ['Tout le jeu tient en trois gestes.',
        'Et le troisième est la règle qui tranche tout le reste : l’île grandit parce que quelqu’un est passé, jamais parce que le temps passe.'] },

  { k: 'sans-gagnant', m: 'source', s: { zoom: 1 },
    t: { sur: 'POURQUOI SANS GAGNANT',
         citation: '« Les enfants partagent moins après avoir joué de façon compétitive qu’après avoir joué de façon coopérative. »',
         dit: 'Toppe, Hardecker & Haun · PLOS ONE 14(8), 2019 · 96 enfants de 4 à 5 ans',
         donc: 'Sur Dan’s Island, il n’y a rien à gagner sur quelqu’un.' },
    l: ['Une étude de 2019 sur 96 enfants de 4 à 5 ans : après un jeu compétitif, ils partagent moins avec des enfants qui n’avaient pas joué.',
        'Elle ne porte pas sur Dan’s Island, et on ne le prétendra pas. Elle dit juste pourquoi ce jeu n’a pas de gagnant. Sources sur dansisland.app/pourquoi-un-jeu-calme'] },

  { k: 'la-maree', m: 'detail', s: { zoom: 1 },
    t: { mot: 'Deux fois par jour, la mer se retire.' },
    l: ['La marée découvre un anneau de sable mouillé, et y laisse trois choses à ramasser.',
        'Comme la vraie, elle passe cinquante minutes plus tard chaque jour — donc l’enfant qui joue toujours après l’école ne voit pas toujours la même moitié du jeu.'] },

  { k: 'temps-decran', m: 'source', s: { ciel: 'crépuscule', zoom: 1 },
    t: { sur: 'CE QUE DIT LA RECHERCHE',
         citation: '« Le nombre d’heures jouées n’était pas lié au bien-être. Ce qui l’était, c’est la valeur accordée à ce temps-là. »',
         dit: 'Ballou, Vuorre, Hakman, Magnusson & Przybylski · Royal Society Open Science 12(3), 2025 · 703 joueurs adultes, 140 000 heures',
         donc: 'Compter les minutes renseigne mal.' },
    l: ['Oxford, 2025 : 703 joueurs, 150 jeux, 140 000 heures de jeu mesurées. La durée ne prédit rien ; ce qu’on en retire, si.',
        'L’étude porte sur des adultes, et pas sur ce jeu-ci. On la cite pour ce qu’elle a mesuré — les quatre sources sont en ligne.'] },

  { k: 'linterieur', m: 'detail', s: { dedans: 'salon' },
    t: { mot: 'On entre, et on décore.', cadre: [0.02, 0.02, 0.98, 0.98], ay: 0.5 },
    l: ['Trois pièces à décorer : un salon, une chambre, un atelier. Des tapis, des meubles, des tableaux au mur, un vase posé sur la commode.',
        'Un meuble qui ne peut pas aller là où on le pose le dit, au lieu d’effacer ce qui était là.'] },

  { k: 'le-chien', m: 'claim', s: { sousLesPieds: { t: 'chien', c: '#8B5E3C' },
                                    toucheE: true, marcher: [{ touche: 'ArrowUp', ms: 900 }],
                                    attendreApres: 300, zoom: 2 },
    t: { sur: 'UNE CORVÉE PAR JOUR, PAS PLUS', titre: 'Le chien attend, il ne gronde jamais.',
         sous: 'Trop loin, il s’assied. Pas de minuteur, pas de perte, rien qui rouspète. On revient, il repart.' },
    l: ['On sort le chien une fois par jour. Il marche devant, s’arrête pour renifler, et si on le distance il s’assied.',
        'Il n’y a aucune façon de rater la promenade. Le seul enjeu, c’est qu’on ne peut pas la faire en regardant ailleurs.'] },

  { k: 'les-saisons', m: 'detail', s: { saison: 'hiver', zoom: 1 },
    t: { mot: 'L’île suit le vrai calendrier.' },
    l: ['En décembre, le sol est blanc. En mars, des pétales. En septembre, les feuilles tombent.',
        'Une saison ajoute, elle ne repeint jamais : la neige se pose par-dessus ce que l’enfant a choisi, elle ne le remplace pas.'] },

  { k: 'la-pluie', m: 'detail', s: { meteo: 'pluie', zoom: 1 },
    t: { mot: 'Il pleut sur l’île.' },
    l: ['Les mouettes se sont posées, les nuages sont descendus d’un cran.',
        'Rien ne s’abîme et rien ne pousse : c’est juste la pluie. Il n’y a pas de mauvais temps dans ce jeu.'] },

  { k: 'le-livre-dor', m: 'claim', s: { sousLesPieds: { t: 'boitelettres', c: '#FF8F70' },
                                        zoom: 2, mots: MOTS },
    t: { sur: 'CE QUI FAIT GRANDIR UNE ÎLE', titre: 'Un mot laissé chez quelqu’un.',
         sous: 'On plante un mot sur l’île d’un copain. Il le lit chez lui, et peut y répondre.' },
    l: ['C’est le seul endroit du jeu où le texte de quelqu’un arrive sur l’écran d’un autre.',
        'Et c’est ce qui fait grandir la terre : dix mots reçus, un cran d’île en plus. Le propriétaire peut retirer un mot quand il veut.'] },

  { k: 'la-chambre', m: 'detail', s: { dedans: 'chambre' },
    t: { mot: 'La chambre, l’atelier, le salon.', cadre: [0.02, 0.02, 0.98, 0.98], ay: 0.5 },
    l: ['Trois pièces, chacune avec son sol, ses murs et ses meubles. Un vase se pose sur la commode, un tableau s’accroche au mur.',
        'Un meuble qui ne peut pas aller là où on le pose le dit, au lieu d’effacer ce qui était là.'] },

  { k: 'peindre-le-sol', m: 'detail', s: { zoom: 2 },
    t: { mot: 'On peint le sol, case par case.' },
    l: ['Douze couleurs, un chemin qu’on trace, une plage qu’on dessine soi-même.',
        'La peinture se pose sur le sol sans changer ce qu’est la case : on peut faire un chemin bleu sans que l’eau vienne avec.'] },

  { k: 'rien-a-perdre', m: 'absence', s: { ciel: 'crépuscule', zoom: 1 },
    t: { sur: 'IL N’Y A PAS MOYEN DE',
         rien: ['perdre', 'rater', 'casser', 'recommencer', 'prendre du retard'],
         mais: 'Un requin passe, et il n’attrape personne.' },
    l: ['Un requin traverse au large, un poisson saute, un voilier passe au nord. Aucun ne peut toucher le bonhomme.',
        'La mer qui remonte le repose à terre au lieu de le noyer. C’est la même règle que le chien qui s’assied.'] },

  { k: 'la-carte-postale', m: 'boucle',
    ss: [{ zoom: 2, objets: ILE_MOYENNE }, { ciel: 'crépuscule', zoom: 1 }, { zoom: 1, mots: MOTS }],
    t: { sur: 'LE MOTEUR DU JEU', titre: 'La carte postale',
         pas: [{ quoi: 'Tu prépares ta carte.', pourquoi: 'Elle porte ton île, ton nom et ton adresse.' },
               { quoi: 'Tu l’envoies sur WhatsApp.', pourquoi: 'La vraie image part avec le message, pas un lien qui la promet.' },
               { quoi: 'Ton adresse est ton code.', pourquoi: 'Quand le copain fait son île, vous gagnez tous les deux.' }] },
    l: ['Il n’y a pas de code de parrainage à retenir : l’adresse de ton île en est un.',
        'Envoyer une carte ne rapporte rien. Ce qui paie, c’est quelqu’un qui arrive.'] },

  { k: 'le-visage', m: 'claim', s: { zoom: 2 },
    t: { sur: 'LE SEUL ENDROIT OÙ L’ON DESSINE', titre: 'Ton visage, au pixel.',
         sous: 'Cinq réglages donnent cinq cents bonshommes. Un pinceau en donne autant qu’il y a d’enfants.' },
    l: ['Une grille de 24 sur 24 et treize couleurs, sur la tête du bonhomme.',
        'Partout ailleurs on choisit dans une liste. Ici on dessine.'] },

  { k: 'le-potager', m: 'detail', s: { sousLesPieds: { t: 'potager', c: '#4E9B5E' }, zoom: 2 },
    t: { mot: 'Il ne rapporte rien. Il pousse.' },
    l: ['Le potager met six jours. Un pas par jour, et rien à arroser.',
        'C’est le seul objet du jeu dont tout le propos est qu’il ne se passe rien aujourd’hui, et qu’il faut revenir demain. Rien ne meurt jamais.'] },

  { k: 'la-brume', m: 'detail', s: { meteo: 'brume', zoom: 1 },
    t: { mot: 'La brume délave tout.' },
    l: ['Le temps change toutes les deux heures et demie, et il est le même pour tout l’archipel.',
        'Donc deux enfants qui jouent le même soir peuvent en parler.'] },

  { k: 'pas-de-pub', m: 'absence', s: { zoom: 1 },
    t: { sur: 'CE QUE VOUS NE TROUVEREZ PAS',
         rien: ['de publicité', 'd’achat intégré', 'de classement', 'de notification', 'de messagerie privée'],
         mais: 'Un livre d’or, que le propriétaire peut vider.' },
    l: ['Pas de pub, aucun paiement réel, et rien qui rappelle de revenir.',
        'Le seul texte qui circule est un mot laissé sur le livre d’or d’une île — public, et effaçable par celui qui le reçoit.'] },

  { k: 'les-batiments', m: 'detail', s: { zoom: 1 },
    t: { mot: 'Un village, et des gens dedans.' },
    l: ['Une école, un restaurant, une ferme, un lieu de culte. Chacun occupe quatre cases, comme la maison.',
        'Et chacun a un habitant qui en sort, va chez le voisin, et lève le bras en te croisant.'] },

  { k: 'la-dalle', m: 'claim', s: { sousLesPieds: { t: 'dalle', c: '#72D6D0' },
                                    marcher: [{ touche: 'ArrowRight', ms: 500 }], zoom: 2 },
    t: { sur: 'LE SEUL INSTRUMENT DU JEU', titre: 'On en joue en marchant.',
         sous: 'Une rangée de dalles monte toute seule : la note se déduit de la case. On compose en posant.' },
    l: ['Pose des dalles côte à côte, marche dessus : ça fait une mélodie.',
        'La hauteur se voit aussi, en points sur la dalle — il y a des appareils où le son ne sort pas.'] },

  { k: 'le-coffre', m: 'detail', s: { sousLesPieds: { t: 'coffre', c: '#8B5E3C' },
                                      toucheE: true, zoom: 2 },
    t: { mot: 'Le cadeau du jour est dans un coffre.' },
    l: ['Il ne tombe pas tout seul dans la bourse : on y va à pied, et on l’ouvre.',
        'Sans le geste, il n’y a pas de moment. C’est la règle de tout le jeu : rien n’arrive par un bouton dans un panneau.'] },

  { k: 'aucun-effet', m: 'source', s: { zoom: 1 },
    t: { sur: 'ON CITE AUSSI CE QUI DÉRANGE',
         citation: '« Peu ou pas de lien causal entre le temps de jeu et le bien-être. »',
         dit: 'Vuorre, Johannes, Magnusson & Przybylski · Royal Society Open Science 9(7), 2022 · 38 935 joueurs, sept jeux, six semaines',
         donc: 'Donc la durée n’est pas la bonne question.' },
    l: ['La plus grosse étude du domaine ne trouve aucun effet — pas même positif.',
        'On la cite parce qu’elle ne nous arrange pas, et parce qu’elle rend l’autre intéressante : si la durée ne fait rien, reste ce qu’on y fait.'] },

  { k: 'larc-en-ciel', m: 'detail', s: { zoom: 1 },
    t: { mot: 'Après l’averse, quelquefois.' },
    l: ['L’arc-en-ciel ne se décide pas : il suit une éclaircie qui suit une pluie, et il ne dure qu’une demi-tranche.',
        'Ce qui ne se rate jamais ne se remarque plus.'] },

  { k: 'lappareil-photo', m: 'claim', s: { ciel: 'crépuscule', zoom: 2 },
    t: { sur: 'DEUX TEMPS, PAS UN', titre: 'On vise, puis on déclenche.',
         sous: 'L’appareil photo ne prend pas le cadre entier : il prend ce que tu as cadré.' },
    l: ['Le premier appui ouvre le viseur, le second déclenche. Cadrer est tout ce qu’il y a à faire.',
        'La photo ne rapporte rien. Une photo qui paierait deviendrait une corvée, et le jeu en a déjà trois.'] },

  { k: 'le-compagnon', m: 'detail', s: { zoom: 2 },
    t: { mot: 'Il te suit partout.' },
    l: ['Un chat, un chien, un crabe, une mouette, un renard. Il te suit chez les voisins et dans la maison.',
        'Il ne rapporte rien et ne se perd jamais : il reste à moins d’une case, donc il n’a rien à rater.'] },

  { k: 'les-voisins', m: 'boucle',
    ss: [{ zoom: 1, mots: MOTS }, { ciel: 'nuit', zoom: 1 }, { saison: 'automne', zoom: 1 }],
    t: { sur: 'POURQUOI ALLER CHEZ LES AUTRES', titre: 'Il y a un archipel',
         pas: [{ quoi: 'Tu marches sur leur île.', pourquoi: 'Vingt îles à visiter dès le premier jour.' },
               { quoi: 'Tu leur laisses un mot.', pourquoi: 'Sur leur livre d’or. Ils peuvent y répondre.' },
               { quoi: 'Tu rapportes un souvenir.', pourquoi: 'Une copie d’un de leurs objets, posée chez toi.' }] },
    l: ['On visite l’île des autres à pied, et on y laisse quelque chose.',
        'On ne s’y croise pas en temps réel, et ce n’est pas un manque : c’est ce qui fait qu’on peut y aller à son rythme.'] },

  { k: 'le-vent', m: 'detail', s: { zoom: 2 },
    t: { mot: 'Le vent traverse l’île.' },
    l: ['Ce n’est pas dix arbres qui battent ensemble : c’est une onde qui passe, et la phase se déduit de la case.',
        'Ce qui bat à l’unisson se lit comme un clignotement d’écran, pas comme du vent.'] },

  { k: 'lhiver-la-nuit', m: 'detail', s: { saison: 'hiver', ciel: 'nuit', zoom: 1 },
    t: { mot: 'Une nuit d’hiver sur l’archipel.' },
    l: ['Le sol est blanc, les fenêtres sont allumées, et la Casserole est au-dessus de la mer.',
        'Les constellations ne se cliquent pas et ne rapportent rien. Dans ce jeu, ce qui brille est ce qu’on peut prendre — alors elles ne brillent pas, elles luisent.'] },

  { k: 'se-detendre', m: 'claim', s: { ciel: 'crépuscule', zoom: 1 },
    t: { sur: 'MON PETIT ENDROIT POUR RALENTIR', titre: 'Un écran pour se détendre, enfin.',
         sous: 'Personne ne gagne, personne ne perd, tout se partage. C’est le jeu entier, en une phrase.' },
    l: ['Trente jours qu’on publie cette île. Voilà ce qu’elle est, en une ligne.',
        'Personne ne gagne, personne ne perd, tout se partage. Les raisons de ce choix — et les quatre études citées — sont sur dansisland.app/pourquoi-un-jeu-calme'] },
];

/* ── Le calendrier ─────────────────────────────────────────────────────
 *
 * Il ne porte **pas de dates**, et c'est délibéré : un calendrier daté se
 * périme, et il faudrait le réécrire à chaque report. Le workflow prend
 * la plus ancienne entrée non parue — il demande à Instagram ce qui est
 * déjà en ligne plutôt que de tenir un compteur. Un jour sauté se
 * rattrape donc tout seul, et une double exécution ne publie pas deux
 * fois. C'est la règle déjà tenue en SQL pour `visites` et
 * `parrainages` : le test d'existence *est* l'écriture. */
function entree(j, i) {
  const nom = String(i + 1).padStart(2, '0') + '-' + j.k;
  return {
    n: i + 1,
    image: nom + '.jpg',
    url: RACINE_IMG + nom + '.jpg',
    maquette: j.m,
    legende: j.l.join('\n\n') + '\n\n' + ADRESSE,
    hashtags: TAGS.join(' '),
  };
}

const CAL = { parJour: PAR_JOUR, total: JOURS.length, posts: JOURS.map(entree) };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(new URL('./calendrier.json', import.meta.url).pathname,
                 JSON.stringify(CAL, null, 2) + '\n');
console.log('  calendrier.json · ' + JOURS.length + ' publications · ' +
            PAR_JOUR + ' par jour');

// Combien de fois chaque maquette sert : un compte qui publierait trente
// fois le même gabarit se lit comme un gabarit, pas comme quelqu'un.
const part = {};
for (const j of JOURS) part[j.m] = (part[j.m] || 0) + 1;
console.log('  maquettes : ' + Object.entries(part)
  .sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ×' + n).join(' · '));

if (SEC) process.exit(0);

const nav = await navigateur();
let port = 4950;
for (let i = 0; i < JOURS.length; i++) {
  const j = JOURS[i];
  const scenes = j.ss || [j.s || {}];
  const pngs = [];
  for (const s of scenes) {
    const { png, erreur } = await capturer(nav, port++, s);
    if (erreur) console.log('  ⚠ ' + j.k + ' : ' + erreur.slice(0, 80));
    pngs.push(png.toString('base64'));
  }
  const dest = OUT + CAL.posts[i].image;
  const octets = await composer(nav, {
    pngs, maquette: j.m, mots: j.t, multi: !!j.ss, dest,
  });
  console.log('  ' + String(i + 1).padStart(2) + '. ' + j.k.padEnd(20) +
              j.m.padEnd(9) + (octets / 1024).toFixed(0) + ' ko');
}
await nav.close();
console.log('\n  ' + OUT);
