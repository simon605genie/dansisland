-- ============================================================
--  « Lila t'a répondu » — la pastille qui ne ment pas
--  21/09/2026 · REJOUABLE (add column if not exists)
--
--  À jouer dans l'éditeur SQL du projet **dansisland**
--  (cgputbitzfgokpwbbind), jamais celui de mamash.
--  https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new
-- ------------------------------------------------------------
--
--  UNE colonne, et rien d'autre : pas de table, pas de fonction, pas de
--  policy. `iles_maj` ouvre déjà l'update au propriétaire de son île, et
--  c'est exactement le droit qu'il faut — en ajouter une seconde qui dit
--  la même chose, c'est se préparer à ce qu'elles ne le disent plus
--  pareil (la leçon de `mots_maj`, le 20/09).
--
--  POURQUOI PAS `vu_le`, QUI EXISTE DÉJÀ
--
--  `vu_le` répond à « depuis quand n'ai-je pas regardé MON livre d'or »,
--  et il est remis à l'heure **à chaque chargement**. S'en servir pour
--  les réponses donnerait exactement le défaut qu'on vient de corriger :
--  on ouvre le jeu, on ne regarde pas, et le signal est perdu pour
--  toujours. Deux questions différentes, deux dates.
--
--  Celle-ci n'est posée que quand on **ouvre l'onglet Voisins**, donc
--  quand on a vraiment eu la liste sous les yeux.
--
--  SANS CETTE MIGRATION, LE JEU MARCHE
--
--  `mesReponses()` n'en a pas besoin : elle lit `mots` par auteur, ce que
--  `mots_lecture` permet depuis le 16/09. Les réponses s'affichent donc
--  en tête de l'onglet Voisins dès le déploiement du client. Seule la
--  pastille « il y a du neuf » attend ce fichier — et `marquerReponsesVues()`
--  avale son erreur en silence tant qu'il n'est pas joué, comme
--  `ramasser()` le fait pour `bourse_ramasser`.
-- ============================================================

alter table public.iles
  add column if not exists vu_reponses timestamptz not null default now();

comment on column public.iles.vu_reponses is
  'Dernier coup d''oeil du joueur sur les réponses qu''on lui a faites, '
  'ailleurs que chez lui. Distinct de vu_le, qui parle de son propre livre d''or.';

-- Le trigger touch_maj_le doit l'ignorer, comme il ignore déjà vu_le :
-- sans ça, regarder ses réponses ferait remonter son île en tête de
-- l'archipel, ce qui n'est pas un signe de vie de l'île.
-- (Rien à faire ici si touch_maj_le ne se déclenche que sur `monde` —
--  c'est le cas, et ce commentaire est là pour le jour où ça changerait.)
