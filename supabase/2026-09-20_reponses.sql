-- ============================================================
--  DAN'S ISLAND · répondre à un mot
--  20/09/2026
--
--  Le livre d'or ne parlait que dans un sens. On plante un mot chez un
--  ami, il le lit, et c'est fini : il n'y a pas de raison de repasser.
--  Or tout ce jeu tient sur une phrase — « l'île grandit parce que des
--  gens sont passés » — et une réponse est exactement ce qui fait
--  revenir quelqu'un.
--
--  Deux colonnes, aucune table, aucune fonction. **Et aucune policy
--  nouvelle** : `mots_maj` autorise déjà le propriétaire de l'île à
--  modifier les mots de son île, et c'est précisément le droit qu'il
--  faut ici. Ajouter une policy serait en ajouter une deuxième qui dit
--  la même chose, et deux règles qui disent la même chose finissent par
--  ne plus la dire pareil.
--
--  Ce que ça **ne** fait pas, et il ne faut pas prétendre le contraire :
--  la réponse ne paie rien. Elle est écrite par le propriétaire sur sa
--  propre île, donc c'est un geste solitaire, et un geste solitaire ne
--  paie pas dans ce jeu — c'est la règle tenue depuis le 16/09, et le
--  potager et la dalle qui chante l'ont tenue aussi. Ce qui paie, c'est
--  que le filleul revienne planter un mot : il est déjà payé, et c'est
--  la réponse qui lui en donne envie.
--
--  ------------------------------------------------------------
--  Et un trou qui existait avant celui-ci, fermé au passage.
--
--  `mots_maj` laisse le propriétaire faire un `update` sur **toutes** les
--  colonnes, y compris `texte` et `auteur_nom`. Autrement dit : depuis
--  le 16/09, le propriétaire d'une île peut réécrire le mot d'un
--  visiteur en gardant sa signature. Personne ne l'a fait parce que le
--  client ne l'expose pas — mais « le client ne l'expose pas » n'a jamais
--  été une protection, c'est ce que ce dépôt répète à propos des quatre
--  tables sans policy d'écriture.
--
--  Ajouter une réponse rendait le trou pire, puisque l'update devient un
--  geste ordinaire. `mots_figer()` gèle donc tout ce qui appartient à
--  l'auteur et laisse passer ce qui appartient au propriétaire :
--  `masque`, `reponse`, `reponse_le`.
--
--  Le nom n'est pas générique, comme tout dans ce projet : `mots_figer`,
--  jamais `on_mots_update`. Voir la note du 15/09 sur mamash.
--
--  Réexécutable sans casse : `add column if not exists`, `create or
--  replace`, `drop trigger if exists`.
-- ============================================================

-- ------------------------------------------------------------
-- Les deux colonnes. `reponse_le` est tenue par le trigger et non par le
-- client : une date d'écriture que l'appelant choisit ne vaut rien.
-- ------------------------------------------------------------
alter table public.mots add column if not exists reponse    text;
alter table public.mots add column if not exists reponse_le timestamptz;

alter table public.mots drop constraint if exists mots_reponse_len;
alter table public.mots add  constraint mots_reponse_len
  check (reponse is null or char_length(btrim(reponse)) between 1 and 200);

-- ------------------------------------------------------------
-- Ce qu'un update a le droit de changer.
--
-- Le propriétaire modère (`masque`) et répond (`reponse`). Tout le reste
-- appartient à celui qui a planté le mot, et lui n'a aucun droit
-- d'update du tout : `mots_maj` ne s'ouvre qu'au propriétaire de l'île.
-- Donc **aucun chemin** ne peut plus réécrire le texte de quelqu'un.
--
-- `reponse_le` est posée ici plutôt que par le client, et remise à null
-- quand la réponse est effacée : une île qui afficherait « répondu le 3
-- mars » sous une réponse vide serait un défaut qu'on ne verrait qu'une
-- fois chez quelqu'un.
-- ------------------------------------------------------------
create or replace function public.mots_figer()
returns trigger
language plpgsql
as $$
begin
  new.id         := old.id;
  new.ile        := old.ile;
  new.auteur     := old.auteur;
  new.auteur_nom := old.auteur_nom;
  new.texte      := old.texte;
  new.case_x     := old.case_x;
  new.case_y     := old.case_y;
  new.cree_le    := old.cree_le;

  if new.reponse is null or btrim(new.reponse) = '' then
    new.reponse    := null;
    new.reponse_le := null;
  elsif new.reponse is distinct from old.reponse then
    new.reponse_le := now();
  else
    new.reponse_le := old.reponse_le;
  end if;

  return new;
end;
$$;

drop trigger if exists mots_figer on public.mots;
create trigger mots_figer
  before update on public.mots
  for each row execute function public.mots_figer();

-- ============================================================
--  Ce qu'il faut voir après l'avoir joué
--
--  1. Les colonnes sont là :
--
--       select column_name from information_schema.columns
--        where table_schema='public' and table_name='mots'
--          and column_name in ('reponse','reponse_le');
--
--     Rendu attendu : deux lignes.
--
--  2. Le texte d'un visiteur ne se réécrit plus, **même en `postgres`** —
--     c'est un trigger et non une policy, donc l'éditeur SQL du dashboard
--     ne le contourne pas. C'est d'ailleurs ce qui le rend vérifiable
--     ici, contrairement au vide de policy des quatre autres tables, qui
--     demande `set local role anon` :
--
--       begin;
--       update public.mots set texte = 'PIRATÉ'
--        where id = (select id from public.mots limit 1);
--       select texte from public.mots
--        where id = (select id from public.mots limit 1);
--       rollback;
--
--     Rendu attendu : le texte **d'origine**, pas « PIRATÉ ».
--
--  3. Et une réponse, elle, passe, avec sa date posée toute seule :
--
--       begin;
--       update public.mots set reponse = 'Merci d’être passé !'
--        where id = (select id from public.mots limit 1);
--       select reponse, reponse_le is not null as datee from public.mots
--        where id = (select id from public.mots limit 1);
--       rollback;
--
--     Rendu attendu : la réponse, et `datee` à true.
-- ============================================================
