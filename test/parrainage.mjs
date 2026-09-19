/* La chaîne du parrainage, côté client, dans un vrai navigateur.

   Le serveur, lui, s'éprouve en SQL (voir README, « les cinq
   vérifications »). Ce qui ne s'éprouvait nulle part, c'est ce que fait la
   page selon ce que le serveur répond — et c'est là que vivent les pièges,
   parce que les trois branches de `reglerLeParrainage()` ne se distinguent
   que par ce qu'elles **ne** font pas :

     le serveur accepte → la note, le code jeté, le miroir avancé
     le serveur échoue  → aucune note, et le code **gardé** : c'est une
                          migration absente ou du réseau qui manque, pas un
                          refus, et le lien de la carte postale ne doit pas
                          se perdre entre la boîte mail et le lendemain
     le serveur refuse  → aucune note, et le code **jeté** : code inconnu
                          ou déjà parrainé, le rejouer ne donnera rien */
import { navigateur, servir, onglet, compteur, attendre } from './aide.mjs';

const s = await servir(8153);
const nav = await navigateur();
const c = compteur();

const CAS = [
  { nom: 'ok',     dit: 'note affichée, code jeté, bourse à 25' },
  { nom: 'erreur', dit: 'aucune note, code GARDÉ pour la prochaine fois' },
  { nom: 'refus',  dit: 'aucune note, code jeté' },
];

for (const cas of CAS) {
  c.titre('le serveur « ' + cas.nom +' » — ' + cas.dit);
  const { ctx, page, erreurs } = await onglet(nav, {
    taille: { width: 1200, height: 800 },
    memoire: { 'dansisland:parrain': 'dan', 'test:scenario': cas.nom, 'test:appels': '[]' },
  });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(2500);

  const vu = await page.evaluate(() => ({
    note: (() => { const g = document.getElementById('guide');
                   return g && !g.hidden ? g.innerText.replace(/\s+/g, ' ').trim() : ''; })(),
    parrain: localStorage.getItem('dansisland:parrain'),
    shells1: localStorage.getItem('dansisland:shells1'),
    appels: JSON.parse(localStorage.getItem('test:appels') || '[]'),
    sous: (document.getElementById('hud-sous') || {}).textContent || '',
  }));
  console.log('     note   : ' + (vu.note || '(aucune)'));
  console.log('     parrain: ' + (vu.parrain === null ? '(jeté)' : vu.parrain));
  console.log('     plaque : ' + vu.sous);

  c.dit(vu.appels.includes('parrainer:dan'), 'parrainer() appelé avec « dan »');

  if (cas.nom === 'ok') {
    c.dit(/\+15 shells/.test(vu.note), 'la note porte « +15 shells »');
    c.dit(/dan/.test(vu.note), 'la note nomme le parrain');
    c.dit(/Boutique/.test(vu.note), 'la note dit à quoi servent les shells');
    c.dit(/Compris/.test(vu.note), 'la note attend qu’on la referme');
    c.dit(vu.parrain === null, 'le code est jeté');
    c.dit(vu.shells1 === '1', 'la note des premiers shells ne reviendra pas');
    c.dit(vu.appels.includes('mesFilleuls'), 'le compteur de filleuls est relu');
    c.dit(/\b25 shells\b/.test(vu.sous), 'la plaque affiche 25 shells — 10 + 15, le miroir a suivi');
  }
  if (cas.nom === 'erreur') {
    c.dit(!/\+15 shells/.test(vu.note), 'aucune note de bienvenue');
    c.dit(vu.parrain === 'dan', 'le code est GARDÉ pour la prochaine fois');
    c.dit(/\b10 shells\b/.test(vu.sous), 'la bourse n’a pas bougé : 10 shells');
    c.dit(vu.shells1 === null, 'rien n’est marqué comme expliqué');
  }
  if (cas.nom === 'refus') {
    c.dit(!/\+15 shells/.test(vu.note), 'aucune note de bienvenue');
    c.dit(vu.parrain === null, 'le code est jeté — il ne sera pas rejoué');
  }
  c.dit(erreurs.length === 0, 'aucune erreur de console' + (erreurs.length ? ' → ' + erreurs[0] : ''));
  await ctx.close();
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
