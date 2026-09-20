-- ============================================================
--  Les adresses des pages éditoriales deviennent des slugs réservés
--  20/09/2026 — **joué le 20/09/2026 au soir**
--
--  **Rejouable** : un seul `create or replace`. Le rejouer réécrit la même
--  fonction, et rien d'autre.
--
--  Qu'il ait été joué **sur le bon projet** ne se déduit pas d'un fichier :
--  c'est `.github/workflows/verifier-les-slugs.yml` qui le demande à la
--  base, en lecture seule, et qui repart à chaque fois que ce dossier ou
--  `functions/_commun.js` bougent.
--
--  À jouer dans l'éditeur SQL du projet **dansisland**
--  (cgputbitzfgokpwbbind), jamais dans celui de mamash. Vérifier l'en-tête
--  avant de lancer.
--
--    https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new
--
-- ------------------------------------------------------------
--  Le défaut que ce fichier ferme
--
--  Quatre pages éditoriales sont arrivées le 20/09 — /comment-jouer,
--  /fonctionnalites, /construire-son-ile, /cartes-postales — plus leurs
--  quatre alias anglais. Ce sont des **Cloudflare Pages Functions**, donc
--  des routes d'un seul segment, exactement comme l'adresse d'une île.
--
--  Or `slug_reserve()` ne les connaissait pas. Un joueur pouvait donc
--  prendre `comment-jouer` comme adresse d'île : la fonction aurait
--  répondu avant le catch-all, et **son île serait devenue inatteignable**
--  — sans erreur, sans trace, et sans que personne puisse le lui expliquer.
--
--  C'est le piège que ce dépôt nomme partout : deux listes qui doivent
--  rester d'accord. Ici la liste du serveur est celle-ci, et celle du
--  client est `PAGES` dans `functions/_commun.js`. Le contrôle 3 de
--  `test/robots.mjs` les croise, et refuse un chemin de page qui ne serait
--  pas réservé ici.
--
-- ------------------------------------------------------------
--  Ce qui ne change pas
--
--  Les quinze noms d'avant sont repris tels quels. « dan » n'en fait
--  toujours pas partie : c'est le prénom du site, pas une route.
--
--  Une île qui porterait **déjà** l'un de ces noms ne serait pas effacée :
--  la contrainte `iles_slug_reserve` ne s'applique qu'aux écritures. Le
--  `select` de vérification en bas les trouve, s'il y en a — au 20/09 il
--  n'y en a aucune, l'archipel est encore petit.
-- ============================================================

create or replace function public.slug_reserve(s text)
returns boolean language sql immutable as $$
  select lower(s) in (
    'api','admin','app','archipel','assets','auth','compte','login','logout',
    'src','static','supabase','www','index','aide','cgu',
    -- Les pages éditoriales, et leurs alias anglais. Si l'une bouge dans
    -- `PAGES` (functions/_commun.js), elle doit bouger ici.
    'comment-jouer','fonctionnalites','construire-son-ile','cartes-postales',
    'how-to-play','features','build-your-island','postcards',
    -- Les deux préfixes des pages publiques. Ils sont à deux segments
    -- aujourd'hui (/island/x, /carte/x), donc sans conflit — mais une île
    -- qui s'appellerait « island » ou « carte » ferait un lien qu'on ne
    -- sait plus lire.
    'island','carte','sitemap'
  );
$$;

-- La contrainte est déjà posée par schema.sql et pointe sur cette
-- fonction ; la remplacer suffit. On la repose quand même, pour qu'un
-- projet où schema.sql n'aurait pas été rejoué soit couvert aussi.
alter table public.iles drop constraint if exists iles_slug_reserve;
alter table public.iles add  constraint iles_slug_reserve
  check (not public.slug_reserve(slug));

-- ------------------------------------------------------------
--  Vérification. Attendu : aucune ligne.
--  Si une île apparaît ici, c'est qu'elle portait déjà un nom réservé
--  avant ce fichier : il faut la renommer à la main, et prévenir son
--  propriétaire — on ne renomme pas l'île de quelqu'un en silence.
-- ------------------------------------------------------------
select slug, nom
  from public.iles
 where public.slug_reserve(slug);
