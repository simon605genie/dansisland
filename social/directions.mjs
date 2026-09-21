/* Cinq directions de départ pour le compte Instagram.
 *
 *   node directions.mjs
 *
 * Ce ne sont pas cinq variations d'une même carte : ce sont **cinq paris
 * différents sur ce qui fait cliquer un parent**. On en garde une, et
 * elle devient le gabarit de `fabrique.mjs`.
 *
 * Le reproche qui a produit ce fichier, et il était juste : la première
 * série parlait la voix intérieure du jeu — « il n'y a rien à finir » —
 * à quelqu'un qui n'y joue pas encore. C'est une légende pour un joueur,
 * pas une accroche pour un inconnu. Un visuel de départ doit répondre à
 * trois questions dans l'ordre : **qu'est-ce que c'est, pour qui, et
 * pourquoi maintenant.** La voix intérieure vient après, quand on est
 * déjà entré.
 *
 *   A · LE CLAIM       la promesse en face, comme une affiche
 *   B · L'ABSENCE      ce que le jeu n'a pas — l'angoisse du parent, nommée
 *   C · LA BOUCLE      tout le jeu en trois lignes et trois images
 *   D · LA SOURCE      une étude citée, pour le parent qui arbitre
 *   E · LE DÉTAIL      presque pas de texte — le cercle large, l'esthétique
 *
 * Aucune dépendance de plus : Playwright est déjà là pour `test/`, et la
 * composition se fait dans un canvas de navigateur.
 */
import { navigateur } from '../test/aide.mjs';
import { capturer, composer } from './maquettes.mjs';
import fs from 'fs';

const OUT = new URL('./directions/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const CARTES = [
  { k: 'A-claim', maquette: 'claim',
    scene: { saison: 'ete', meteo: 'beau', zoom: 1 },
    mots: {
      sur: 'GRATUIT · DÈS 6 ANS',
      titre: 'Un jeu où personne ne perd.',
      sous: 'Ton enfant construit son île, la décore, et l’envoie à ses copains. Rien à installer, rien à payer.',
    } },

  { k: 'B-absence', maquette: 'absence',
    scene: { saison: 'ete', meteo: 'beau', zoom: 1 },
    mots: {
      sur: 'CE QU’IL N’Y A PAS',
      rien: ['de score', 'de minuteur', 'de publicité', 'd’achat', 'de partie perdue'],
      mais: 'Juste une île, et des amis qui passent.',
    } },

  /* **Les trois vignettes montrent trois îles différentes**, et c'est
     tout ce qui sépare une explication d'une décoration. Le premier jet
     en montrait trois fois la même à un zoom près : le lecteur voyait
     trois photos identiques à côté de trois phrases qui promettaient
     une progression. C'est la faute que la fabrique a déjà écrite pour
     les feuilles d'automne — promettre un détail qu'on ne peint pas.

     Le texte nomme le geste, l'image montre sa conséquence : une île
     nue, une île qui se garnit, une île pleine. C'est littéralement ce
     que la boucle du jeu produit. */
  { k: 'C-boucle', maquette: 'boucle',
    scenes: [
      { saison: 'ete', meteo: 'beau', zoom: 2,
        objets: [ { t: 'palmier', x: 7, y: 8, c: '#2E7D5B' },
                  { t: 'fleur', x: 10, y: 9, c: '#F48CA8' } ] },
      { saison: 'ete', meteo: 'beau', ciel: 'crépuscule', zoom: 2,
        objets: [ { t: 'palmier', x: 7, y: 8, c: '#2E7D5B' },
                  { t: 'fleur', x: 10, y: 9, c: '#F48CA8' },
                  { t: 'boitelettres', x: 9, y: 11, c: '#FF8F70' },
                  { t: 'arbre', x: 12, y: 8, c: '#2E7D5B' },
                  { t: 'banc', x: 6, y: 11, c: '#8B5E3C' } ],
        mots: [['Lila', 'Trop belle ton île !', null, 8, 12]] },
      { saison: 'ete', meteo: 'beau', zoom: 1,
        mots: [['Lila', 'Trop belle ton île !', null, 8, 12],
               ['Nour', 'Je repasse demain', null, 11, 6],
               ['Ilan', 'J’adore le phare', null, 5, 10]] },
    ],
    mots: {
      sur: 'EN TROIS GESTES',
      titre: 'Comment on joue',
      pas: [
        { quoi: 'Tu construis ton île.',        pourquoi: 'Le relief, les arbres, la maison, ta tête au pinceau.' },
        { quoi: 'Tu envoies une carte postale.', pourquoi: 'À un copain, sur WhatsApp. C’est ton adresse.' },
        { quoi: 'Il passe, et ton île grandit.', pourquoi: 'C’est la seule façon d’avoir plus de terre.' },
      ],
    } },

  { k: 'D-source', maquette: 'source',
    scene: { saison: 'ete', meteo: 'beau', zoom: 1 },
    mots: {
      sur: 'POURQUOI SANS GAGNANT',
      citation: '« Les enfants partagent moins après avoir joué de façon compétitive qu’après avoir joué de façon coopérative. »',
      dit: 'Toppe, Hardecker & Haun · PLOS ONE 14(8), 2019 · 96 enfants de 4 à 5 ans',
      donc: 'Sur Dan’s Island, il n’y a rien à gagner sur quelqu’un.',
    } },

  { k: 'E-detail', maquette: 'detail',
    scene: { saison: 'ete', meteo: 'beau', ciel: 'nuit', zoom: 2 },
    mots: { mot: 'Il est 21 h sur l’île.' } },
];


// ── La boucle ─────────────────────────────────────────────────────────
const nav = await navigateur();
let port = 4880;

for (const carte of CARTES) {
  const scenes = carte.scenes || [carte.scene];
  const pngs = [];
  for (const s of scenes) {
    const { png, erreur } = await capturer(nav, port++, s);
    if (erreur) console.log('  ⚠ ' + carte.k + ' : ' + erreur.slice(0, 90));
    pngs.push(png.toString('base64'));
  }
  const octets = await composer(nav, {
    pngs, maquette: carte.maquette, mots: carte.mots,
    multi: !!carte.scenes, dest: OUT + carte.k + '.jpg',
  });
  console.log(`  ${carte.k}  ${(octets / 1024).toFixed(0)} ko`);
}

await nav.close();
console.log('\n' + OUT);
