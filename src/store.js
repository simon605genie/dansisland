// ============================================================
//  store.js — tout ce qui parle à Supabase.
//  Le reste de l'app ne connaît que ces fonctions.
// ============================================================
// @2 (dernière v2) : requis pour les clés sb_publishable_, pas gérées par 2.45.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export const configure = !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'À COMPLÉTER';

/* ---------------- compte ---------------- */

export async function utilisateur() {
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.user : null;
}

export function surChangementDeCompte(fn) {
  return sb.auth.onAuthStateChange((_e, session) => fn(session ? session.user : null));
}

// Lien magique : pas de mot de passe à saisir, donc rien à stocker ni à fuiter.
export async function envoyerLienDeConnexion(email) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: SITE_URL + location.pathname }
  });
  if (error) throw error;
}

export async function deconnexion() {
  await sb.auth.signOut();
}

export async function pseudo(id) {
  const { data } = await sb.from('profils').select('pseudo').eq('id', id).maybeSingle();
  return data ? data.pseudo : null;
}

export async function renommer(id, nouveau) {
  const { error } = await sb.from('profils').update({ pseudo: nouveau }).eq('id', id);
  if (error) throw error;
}

/* ---------------- îles ---------------- */

// L'île du compte connecté, ou null s'il n'en a pas encore.
export async function monIle() {
  const u = await utilisateur();
  if (!u) return null;
  const { data, error } = await sb.from('iles').select('*').eq('proprietaire', u.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function slugLibre(candidat) {
  const { data, error } = await sb.rpc('slug_libre', { candidat });
  if (error) throw error;
  return data === true;
}

export async function creerIle(slug, monde, nom) {
  const u = await utilisateur();
  if (!u) throw new Error('Connecte-toi d’abord.');
  const { data, error } = await sb.from('iles')
    .insert({ proprietaire: u.id, slug, nom: nom || 'Mon île', monde, publiee: true })
    .select().single();
  if (error) throw error;
  return data;
}

// Sauvegarde du monde. Appelée en différé (voir file d'attente plus bas).
export async function sauverIle(id, patch) {
  const { data, error } = await sb.from('iles').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// Une île publique par son slug, mots compris.
export async function chargerIle(slug) {
  const { data, error } = await sb.from('iles')
    .select('id, slug, nom, monde, publiee, proprietaire, maj_le, profils:proprietaire(pseudo)')
    .eq('slug', slug.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  data.proprietaire_nom = data.profils ? data.profils.pseudo : 'Quelqu’un';
  data.mots = await motsDe(data.id);
  return data;
}

// « Qui est passé » : on retient la date du dernier coup d'oeil du
// propriétaire. Le trigger touch_maj_le ignore cette colonne, sinon
// regarder sa propre île la ferait remonter en tête de l'archipel.
export async function marquerVu(id) {
  const { error } = await sb.from('iles').update({ vu_le: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

/* Le même geste, pour l'autre question : « depuis quand n'ai-je pas
   regardé les réponses qu'on m'a faites **ailleurs** ». Deux dates parce
   que ce sont deux questions — `vu_le` est remis à l'heure à chaque
   chargement, donc s'en servir ici ferait perdre le signal à qui ouvre le
   jeu sans regarder. Voir `2026-09-21_reponses_vues.sql`.

   Elle **avale son erreur** : tant que la colonne n'existe pas, la liste
   des réponses s'affiche quand même en tête de Voisins, seule la pastille
   manque. C'est le repli déjà tenu par `ramasser()` face à
   `bourse_ramasser`. */
export async function marquerReponsesVues(id) {
  try {
    await sb.from('iles').update({ vu_reponses: new Date().toISOString() }).eq('id', id);
  } catch (e) { /* la migration n'est pas encore jouée */ }
}

export async function archipel(limite = 40) {
  const { data, error } = await sb.from('archipel').select('*').limit(limite);
  if (error) throw error;
  return data || [];
}

/* ---------------- la bourse ----------------
   Elle ne vit plus dans `iles.monde` : elle a sa table, `bourses`, que la
   RLS laisse lire à son propriétaire et que **personne** ne peut écrire.
   Seules les fonctions `security definer` ci-dessous la modifient, et
   c'est le serveur qui dit quel jour on est.

   Chacune remonte l'erreur telle quelle : tant que la migration
   `2026-09-16_bourse_serveur.sql` n'est pas passée, PostgREST répond
   « function does not exist » et l'app retombe sur sa bourse locale.
   C'est la seule raison d'être de ce chemin-là — pas une porte de sortie
   pour qui voudrait s'écrire des shells. */

export async function bourseDuJour() {
  const { data, error } = await sb.rpc('bourse_du_jour');
  if (error) throw error;
  return data;
}

// Réclame la repousse des herbes du jour. Vrai à qui l'obtient — une fois
// par jour et par joueur, le serveur tenant le marqueur.
export async function bourseRepousse() {
  const { data, error } = await sb.rpc('bourse_repousse');
  if (error) throw error;
  return data === true;
}

// Les corvées, et elles seules : `mot_pose` et `mot_recu` sont refusés
// côté serveur. Les visites se créditent en plantant un mot, pas en le
// demandant.
export async function bourseGagner(quoi, n) {
  const { data, error } = await sb.rpc('bourse_gagner', { quoi, n });
  if (error) throw error;
  return data;
}

export async function bourseAcheter(article) {
  const { data, error } = await sb.rpc('bourse_acheter', { article });
  if (error) throw error;
  return data;
}

export async function bourseCadeau() {
  const { data, error } = await sb.rpc('bourse_cadeau');
  if (error) throw error;
  return data;
}

// Les prix et les plafonds vivent en SQL : le client les lit au lieu de
// les recopier. Sans réponse, il garde ceux qu'il porte en dur, qui ne
// servent qu'à afficher — c'est le serveur qui débite.
export async function catalogue() {
  const { data, error } = await sb.from('catalogue').select('k, prix, rayon');
  if (error) throw error;
  return data || [];
}

// L'état de la mer, maintenant. C'est le serveur qui le tient, pour la
// même raison que le jour : une marée lue sur l'horloge du téléphone se
// remonte d'un doigt, et surtout elle ne serait pas la même pour deux
// enfants au même moment. Or on va chez les autres.
//
// La réponse porte `bascule`, le nombre de secondes avant que la mer ne
// change d'avis : le client avance la phase tout seul entre deux appels
// plutôt que d'en faire un par image.
export async function maree() {
  const { data, error } = await sb.rpc('maree');
  if (error) throw error;
  return data;
}

// Ce que la mer laisse, ramassé. C'était `bourseGagner('maree', 2)` ; ça
// dit maintenant **quoi**, parce que le sac a besoin de la sorte. Le sac ne
// se remplit que si la marée a payé : c'est le plafond du jour qui le
// borne, et il n'y a donc pas un second compteur à tenir.
export async function bourseRamasser(quoi) {
  const { data, error } = await sb.rpc('bourse_ramasser', { quoi });
  if (error) throw error;
  return data;
}

// La commande du jour. Elle se déduit du jour et n'est stockée nulle part :
// la même pour tout le monde, comme la marée se déduit de l'heure.
export async function commande() {
  const { data, error } = await sb.rpc('commande');
  if (error) throw error;
  return data;
}

// Porter la commande chez quelqu'un. Le panier n'est pas dans l'appel : il
// est déduit de `commande()` côté serveur, pour la même raison que le prix
// vient du catalogue. Sinon autant laisser le client se servir.
export async function livrer(ileId, nom) {
  const { data, error } = await sb.rpc('livrer', { p_ile: ileId, p_nom: nom || null });
  if (error) throw error;
  return data;
}

// Le reçu : qui a porté la commande ici, aujourd'hui. La RLS ne le montre
// qu'à l'hôte et au porteur : ce n'est pas un mur public.
export async function livraisonsDe(ileId, jour) {
  let q = sb.from('livraisons').select('id, auteur_nom, jour, panier, cree_le').eq('ile', ileId);
  if (jour) q = q.eq('jour', jour);
  const { data, error } = await q.order('cree_le', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Plafonds du jour et gains des visites, en un seul aller-retour.
export async function economie() {
  const { data, error } = await sb.rpc('economie');
  if (error) throw error;
  return data || {};
}

/* ---------------- le parrainage ----------------
   Une carte postale part, quelqu'un la reçoit, et parfois il crée son île.
   `parrainer()` est le seul chemin : le client donne le slug qu'il a
   suivi, le serveur vérifie que l'île du filleul existe vraiment, refuse
   l'auto-parrainage et le second, et crédite les deux comptes.

   Elle ne lève pas d'exception pour un refus ordinaire (code inconnu,
   déjà parrainé) : elle rend `{ok:false, pourquoi}`. Créer son île ne
   doit pas échouer parce qu'on est arrivé par un lien périmé. */
export async function parrainer(code) {
  const { data, error } = await sb.rpc('parrainer', { code });
  if (error) throw error;
  return data || { ok: false };
}

// Ce que valent les deux récompenses. Lisible sans compte : la page
// publique d'une carte postale l'annonce avant qu'on se connecte.
export async function parrainage() {
  const { data, error } = await sb.rpc('parrainage');
  if (error) throw error;
  return data || {};
}

// Combien d'îles sont nées de tes cartes postales. Un chiffre, pas une
// liste de noms.
export async function mesFilleuls() {
  const { data, error } = await sb.rpc('mes_filleuls');
  if (error) throw error;
  return Number(data) || 0;
}

/* ---------------- livre d'or ---------------- */

const MOT_CHAMPS = 'id, auteur, auteur_nom, texte, case_x, case_y, masque, cree_le';

/* Tant que `2026-09-20_reponses.sql` n'est pas joué, `mots.reponse`
   n'existe pas et demander la colonne rend une erreur `42703`. On
   redemande alors sans elle : le livre d'or continue de marcher, sans
   les réponses, et rien ne se perd entre le déploiement du client et le
   passage du SQL. C'est exactement ce que fait déjà `ramasser()` quand
   `bourse_ramasser` n'existe pas encore.

   Le repli est **retenu** : sans ça, chaque île visitée referait la
   requête ratée avant la bonne, ce qui double les allers-retours pour
   toute la durée du déploiement. */
let motsAvecReponse = true;
export async function motsDe(ileId) {
  if (motsAvecReponse) {
    const r = await sb.from('mots').select(MOT_CHAMPS + ', reponse, reponse_le')
      .eq('ile', ileId).order('cree_le', { ascending: true });
    if (!r.error) return r.data || [];
    if (!/reponse/i.test(r.error.message || '')) throw r.error;
    motsAvecReponse = false;
  }
  const { data, error } = await sb.from('mots').select(MOT_CHAMPS)
    .eq('ile', ileId).order('cree_le', { ascending: true });
  if (error) throw error;
  return data || [];
}

/* ── La boucle des réponses, refermée ───────────────────────────────────
 *
 * `motsDe()` interroge **par île**. Donc quand on plante un mot chez
 * quelqu'un et qu'il répond, l'auteur ne l'apprend jamais : sa réponse ne
 * s'affiche que s'il retourne là-bas **et** marche jusqu'à son propre
 * panneau. Personne ne fait ça, puisque rien ne l'annonce.
 *
 * C'était donc une migration jouée pour une fonctionnalité que le joueur
 * qui en bénéficie ne voyait pas — et c'est la seule boucle du jeu qui
 * fasse **revenir** quelqu'un : je plante, il répond, je reviens lire.
 *
 * Ici on interroge par **auteur**. `mots_lecture` le permet déjà sans une
 * ligne de policy : elle ouvre le select sur toute île publiée dont le mot
 * n'est pas masqué. Un mot que l'hôte a masqué n'annonce donc rien, et
 * c'est le bon défaut : masquer, c'est justement retirer de la vue.
 *
 * Trois choses à ne pas défaire :
 *
 * 1. **Ça ne doit jamais empêcher le jeu de démarrer.** C'est un appel de
 *    confort au chargement : toute erreur rend une liste vide et se tait.
 *    Un livre d'or qui casse l'île serait un très mauvais marché.
 * 2. **Le repli de `motsAvecReponse` vaut ici aussi.** Tant que
 *    `2026-09-20_reponses.sql` n'est pas joué, la colonne n'existe pas :
 *    on rend une liste vide plutôt que de lever, comme `motsDe()`.
 * 3. **On lit le pseudo par le même chemin que `chargerIle()`**
 *    (`profils:proprietaire(pseudo)`), et pas une seconde façon : deux
 *    orthographes de la même jointure finissent par diverger. */
export async function mesReponses(limite = 20) {
  if (!motsAvecReponse) return [];
  let u = null;
  try { u = await utilisateur(); } catch (e) { return []; }
  if (!u) return [];
  try {
    const { data, error } = await sb.from('mots')
      .select('id, texte, reponse, reponse_le, iles!inner(slug, nom, profils:proprietaire(pseudo))')
      .eq('auteur', u.id).not('reponse', 'is', null)
      .order('reponse_le', { ascending: false }).limit(limite);
    if (error) throw error;
    return (data || []).map(m => ({
      id: m.id, texte: m.texte, reponse: m.reponse, reponse_le: m.reponse_le,
      slug: m.iles && m.iles.slug, ile: m.iles && m.iles.nom,
      qui: (m.iles && m.iles.profils && m.iles.profils.pseudo) || 'Quelqu\u2019un',
    })).filter(m => m.slug);
  } catch (e) { return []; }
}

/* Répondre à un mot laissé chez soi. Aucune policy nouvelle : `mots_maj`
   ouvre déjà l'update au propriétaire de l'île, et le trigger
   `mots_figer` interdit de toucher au texte du visiteur. La date est
   posée par le serveur — une date d'écriture que l'appelant choisit ne
   vaut rien.

   Une réponse vide **efface** la réponse plutôt que d'en écrire une de
   zéro caractère : c'est le geste qu'on attend en vidant le champ. */
export async function repondreAuMot(id, reponse) {
  const t = (reponse || '').trim();
  const { error } = await sb.from('mots')
    .update({ reponse: t || null }).eq('id', id);
  if (error) throw error;
  return t || null;
}

export async function planterMot(ileId, texte, x, y, nom) {
  const u = await utilisateur();
  if (!u) throw new Error('Il faut être connecté pour laisser un mot.');
  const { data, error } = await sb.from('mots')
    .insert({ ile: ileId, auteur: u.id, auteur_nom: nom || 'Quelqu’un', texte, case_x: x, case_y: y })
    .select().single();
  if (error) throw error;
  return data;
}

// Modération : masquer garde le mot en base, supprimerMot l'efface pour de bon.
export async function masquerMot(id, masque = true) {
  const { error } = await sb.from('mots').update({ masque }).eq('id', id);
  if (error) throw error;
}

export async function supprimerMot(id) {
  const { error } = await sb.from('mots').delete().eq('id', id);
  if (error) throw error;
}

/* ============================================================
   File d'attente de sauvegarde.
   L'éditeur écrit à chaque clic ; on ne pousse au serveur qu'une
   fois calmé, et on garde une copie locale en cas de coupure.
   ============================================================ */
const CACHE = 'dansisland:brouillon';
let minuteur = null, enVol = false, enAttente = null;

export function brouillonLocal() {
  try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) { return null; }
}
export function ecrireBrouillon(monde, nom) {
  try { localStorage.setItem(CACHE, JSON.stringify({ monde, nom, le: Date.now() })); } catch (e) {}
}

export function planifierSauvegarde(ileId, monde, nom, surEtat) {
  ecrireBrouillon(monde, nom);
  if (!ileId) return;
  enAttente = { ileId, patch: { monde, nom } };
  if (surEtat) surEtat('en attente');
  clearTimeout(minuteur);
  minuteur = setTimeout(() => pousser(surEtat), 1200);
}

async function pousser(surEtat) {
  if (enVol || !enAttente) return;
  const job = enAttente; enAttente = null; enVol = true;
  if (surEtat) surEtat('envoi');
  try {
    await sauverIle(job.ileId, job.patch);
    if (surEtat) surEtat('sauvé');
  } catch (e) {
    enAttente = job;                       // on rejoue au prochain tour
    if (surEtat) surEtat('hors ligne');
    setTimeout(() => pousser(surEtat), 5000);
  } finally {
    enVol = false;
    if (enAttente) pousser(surEtat);
  }
}

// Si l'onglet se ferme avec une sauvegarde en attente, le brouillon local
// a déjà été écrit par planifierSauvegarde : on repart de là au prochain chargement.
export function sauvegardeEnAttente() { return !!enAttente; }
