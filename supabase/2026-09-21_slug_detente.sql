-- ============================================================
--  La cinquième page éditoriale devient un slug réservé
--  21/09/2026 — **À JOUER**
--
--  **Rejouable** : un seul `create or replace`, plus le repositionnement
--  d'une contrainte qui est déjà `drop ... if exists`. Le rejouer réécrit
--  la même fonction et rien d'autre.
--
--  À jouer dans l'éditeur SQL du projet **dansisland**
--  (cgputbitzfgokpwbbind), jamais dans celui de mamash. Vérifier que
--  l'en-tête affiche « dansisland » avant de lancer.
--
--    https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new
--
-- ------------------------------------------------------------
--  Pourquoi ce fichier existe, et pourquoi il est bloquant
--
--  `/pourquoi-un-jeu-calme` et son alias `/why-calm-games` sont des
--  Cloudflare Pages Functions, donc des routes d'**un seul segment** —
--  exactement la forme de l'adresse d'une île.
--
--  Tant que `slug_reserve()` ne les connaît pas, un joueur peut prendre
--  `pourquoi-un-jeu-calme` comme adresse d'île. La fonction répondrait
--  avant le catch-all, et **son île deviendrait inatteignable** : sans
--  erreur, sans trace, et sans qu'on puisse le lui expliquer.
--
--  C'est le défaut que le fichier du 20/09 a fermé pour les quatre
--  premières pages. Il se rouvre à chaque page ajoutée, et c'est pour ça
--  que le contrôle 3 de `test/robots.mjs` croise les deux listes : celle
--  du serveur est ici, celle du client est `PAGES` dans
--  `functions/_commun.js`. Une page ajoutée d'un seul côté rend le
--  contrôle rouge — c'est voulu.
--
-- ------------------------------------------------------------
--  Ce qui ne change pas
--
--  Les vingt-trois noms d'avant sont repris **tels quels**. « dan » n'en
--  fait toujours pas partie : c'est le prénom du site, pas une route.
--
--  Une île qui porterait déjà l'un de ces noms ne serait pas effacée : la
--  contrainte ne s'applique qu'aux écritures. Le `select` de vérification
--  en bas la trouverait, et il faudrait la renommer à la main en
--  prévenant son propriétaire — on ne renomme pas l'île de quelqu'un en
--  silence.
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
    -- La cinquième, ajoutée le 21/09 : celle qui cite des sources.
    'pourquoi-un-jeu-calme','why-calm-games',
    -- Les deux préfixes des pages publiques. Ils sont à deux segments
    -- aujourd'hui (/island/x, /carte/x), donc sans conflit — mais une île
    -- qui s'appellerait « island » ou « carte » ferait un lien qu'on ne
    -- sait plus lire.
    'island','carte','sitemap'
  );
$$;

-- La contrainte pointe déjà sur cette fonction ; la remplacer suffit. On
-- la repose quand même, pour qu'un projet où schema.sql n'aurait pas été
-- rejoué soit couvert aussi.
alter table public.iles drop constraint if exists iles_slug_reserve;
alter table public.iles add  constraint iles_slug_reserve
  check (not public.slug_reserve(slug));

-- ------------------------------------------------------------
--  Vérification. Attendu : aucune ligne.
-- ------------------------------------------------------------
select slug, nom
  from public.iles
 where public.slug_reserve(slug);
