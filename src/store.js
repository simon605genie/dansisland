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

/* ---------------- livre d'or ---------------- */

export async function motsDe(ileId) {
  const { data, error } = await sb.from('mots')
    .select('id, auteur, auteur_nom, texte, case_x, case_y, masque, cree_le')
    .eq('ile', ileId).order('cree_le', { ascending: true });
  if (error) throw error;
  return data || [];
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
