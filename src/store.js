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
