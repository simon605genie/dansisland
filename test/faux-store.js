/* ============================================================
   Le faux store : un serveur simulé, à la place de `src/store.js`.

   Il existe pour que les épreuves tournent **sans réseau, sans compte et
   sans toucher à la base de production**. `test/aide.mjs` le copie sous le
   nom `src/store.js` dans une copie jetable du site ; le dépôt n'est
   jamais modifié.

   Il doit exporter **exactement** ce que `index.html` importe. Un export
   qui manque, et la page ne démarre pas du tout : module refusé, écran
   vide, une seule ligne dans la console. Quand `index.html` se met à
   appeler un nouveau `store.quelquechose`, il faut l'ajouter ici.

   Ce qu'il rend se règle depuis `localStorage`, écrit avant le démarrage
   de la page :

     test:scenario   'ok' (défaut) · 'erreur' · 'refus' · 'deconnecte'
     test:mail       'ok' (défaut) · 'erreur' (attente d'une minute)
                     · 'quota' (limite d'envoi du projet)
     test:appels     le journal des appels reçus, relu par les épreuves
   ============================================================ */

const sc = () => { try { return localStorage.getItem('test:scenario') || 'ok'; } catch (e) { return 'ok'; } }
const trace = (q) => { try {
  const t = JSON.parse(localStorage.getItem('test:appels') || '[]'); t.push(q);
  localStorage.setItem('test:appels', JSON.stringify(t));
} catch (e) {} }

export const configure = true;

const MOI = { id: '11111111-1111-1111-1111-111111111111', email: 'filleul@example.test' };

export async function utilisateur() { return sc() === 'deconnecte' ? null : MOI; }
export function surChangementDeCompte(cb) { /* pas de second évènement dans ce test */ }
export async function deconnexion() {}
export async function envoyerLienDeConnexion(v) {
  trace('mail:' + v);
  let mode = 'ok'; try { mode = localStorage.getItem('test:mail') || 'ok'; } catch (e) {}
  if (mode === 'erreur') throw new Error('For security purposes, you can only request this after 47 seconds');
  if (mode === 'quota')  throw new Error('email rate limit exceeded');
  return true;
}
export async function pseudo() { return 'Filleul'; }

/* Une île semée par le harnais.

   `test:objets` est un tableau d'objets d'île ({t,x,y}) à poser, et
   `test:mots` une liste de mots reçus. Les deux sont vides par défaut,
   donc rien ne change pour les harnais qui ne s'en servent pas.

   Ils passent par le monde et par `motsDe()`, c'est-à-dire par le vrai
   chemin de chargement : un harnais qui écrirait directement dans `mine`
   n'éprouverait pas `normaliserMonde()`, et c'est précisément là que se
   perdent les clés absentes de `mondeNu()`. */
const lu = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };

export async function monIle() {
  const objets = lu('test:objets', null);
  return { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', slug: 'filleul', nom: 'L’île du filleul',
           monde: objets ? { objects: objets } : null,
           maj_le: new Date().toISOString(),
           // `vu_le` à l'époque zéro : tous les mots semés comptent comme
           // reçus pendant l'absence, donc le drapeau de la boîte se lève.
           vu_le: new Date(0).toISOString() };
}
export async function chargerIle() { return null; }
export async function creerIle() { return null; }
export async function slugLibre() { return true; }
export function brouillonLocal() { return null; }
export function planifierSauvegarde() {}
export async function marquerVu() {}

export async function motsDe() {
  return lu('test:mots', []).map((m, i) => ({
    id: 'm' + i, auteur: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    auteur_nom: m[0], texte: m[1], masque: false,
    // `replanter()` plante chaque mot sur l'île sous forme de panneau, et
    // `proximity()` fait passer un panneau avant tout le reste. Sans case,
    // la distance vaut NaN, `NaN >= 0.95` est faux, et le panneau gagne
    // partout : la bulle d'un mot recouvrait celle de l'objet visé.
    case_x: 2 + i, case_y: 2,
    cree_le: new Date(Date.now() - (10 - i) * 1000).toISOString(),
  }));
}
export async function planterMot() { return null; }
export async function supprimerMot() {}
export async function masquerMot() {}
export async function archipel() { return []; }
export async function livraisonsDe() { return []; }
export async function livrer() { return null; }

export async function catalogue() { return []; }
export async function economie() {
  return { plafonds: { tonte: 8, promenade: 5, maree: 6, mot_pose: 10, mot_recu: 25,
                       commande: 6, commande_recue: 24, parrainage: 125, bienvenue: 15 },
           gains: { maree: 2, mot_pose: 2, mot_recu: 5, commande: 6, commande_recue: 8,
                    parrainage: 25, bienvenue: 15 } };
}
export async function parrainage() { return { parrain: 25, filleul: 15 }; }
export async function maree() { return null; }
export async function commande() { return null; }

/* La bourse d'avant le parrainage : dix shells, rien d'autre. */
const BOURSE0 = { shells: 10, jour: '2026-09-19', faits: {}, pousse: '', cadeau: '',
                  serie: 0, sac: {}, achats: [] };
let bourse = JSON.parse(JSON.stringify(BOURSE0));

export async function bourseDuJour() { return JSON.parse(JSON.stringify(bourse)); }
export async function bourseGagner() { return JSON.parse(JSON.stringify(bourse)); }
export async function bourseAcheter() { return JSON.parse(JSON.stringify(bourse)); }
/* Le cadeau du jour **débite vraiment**, sinon le harnais n'éprouve rien.

   Un faux qui rend la bourse inchangée laisse `cadeauDispo()` vrai, donc
   `proximity()` réaffiche « il y a quelque chose dedans » à l'image
   suivante — et le contrôle qui vise le recouvrement du gain passe alors
   pour la mauvaise raison. Le faux doit tenir le contrat du serveur :
   marquer le jour, et rendre `gain`, `serie`, ou `deja`. */
export async function bourseCadeau() {
  if (bourse.cadeau === bourse.jour) return { ...JSON.parse(JSON.stringify(bourse)), deja: true };
  bourse.cadeau = bourse.jour;
  bourse.serie = (bourse.serie | 0) + 1;
  bourse.shells += 5;
  return { ...JSON.parse(JSON.stringify(bourse)), gain: 5, serie: bourse.serie };
}
export async function bourseRepousse() { return JSON.parse(JSON.stringify(bourse)); }
export async function bourseRamasser() { return JSON.parse(JSON.stringify(bourse)); }

/* Le cœur du test. */
export async function parrainer(code) {
  trace('parrainer:' + code);
  const s = sc();
  if (s === 'erreur') throw new Error('function public.parrainer(text) does not exist');
  if (s === 'refus')  return { ok: false, pourquoi: 'déjà parrainé' };
  bourse = Object.assign({}, bourse, { shells: bourse.shells + 15 });
  return { ok: true, gagne: 15, offert: 25, bourse: JSON.parse(JSON.stringify(bourse)) };
}

export async function mesFilleuls() { trace('mesFilleuls'); return 1; }
