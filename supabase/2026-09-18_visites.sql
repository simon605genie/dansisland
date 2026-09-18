-- ============================================================
--  DAN'S ISLAND · la trace qui survit à la suppression
--  18/09/2026
--
--  Le défaut, trouvé en éprouvant les visites payantes : **supprimer son
--  mot rouvre le crédit du jour.** On plante chez un ami (+2), le
--  propriétaire fait le ménage (ou on efface soi-même), on replante, et
--  ça repaie. Deux enfants qui s'y mettent tirent la boutique à volonté.
--
--  La cause est dans `mot_credite()` : elle demandait « existe-t-il déjà
--  une ligne de moi, sur cette île, aujourd'hui ? » **à la table `mots`.**
--  Or `mots` est un mur : on y écrit et on y efface. Le compteur du jour
--  reposait sur une table faite pour perdre des lignes.
--
--  Le correctif reprend ce que `livraisons` fait déjà bien : une ligne de
--  reçu, `unique (ile, auteur, jour)`, que le client ne peut ni écrire ni
--  effacer. Le mur reste un mur, et le compteur prend sa propre table.
--  `livraisons` était immunisée par accident (aucune policy de delete) ;
--  ici c'est écrit exprès.
--
--  Réexécutable sans casse : `create table if not exists`, `create or
--  replace`, et la reprise se termine par `on conflict do nothing`.
-- ============================================================

-- ------------------------------------------------------------
-- visites : une ligne par (île, visiteur, jour) payé. Ce n'est pas un mur
-- et ce n'est pas un reçu à montrer : c'est un **jeton de passage**, la
-- preuve que ce visiteur a déjà été payé ici aujourd'hui.
--
-- Elle ne porte ni le texte du mot, ni son id. Sur le mot, elle n'a rien
-- à dire ; si elle pointait un mot, effacer ce mot poserait la question
-- de ce qu'on fait du jeton, et on rouvrirait le trou par la porte de
-- derrière.
-- ------------------------------------------------------------
create table if not exists public.visites (
  ile     uuid not null references public.iles(id)   on delete cascade,
  auteur  uuid not null references auth.users(id)    on delete cascade,
  jour    date not null default public.jour_du_jeu(),
  cree_le timestamptz not null default now(),
  primary key (ile, auteur, jour)
);

alter table public.visites enable row level security;

-- **Aucune policy, aucun grant.** Pas de select non plus : le joueur n'a
-- rien à lire ici. Ce que sa visite lui a rapporté, sa bourse le dit
-- (`shells`, et `faits.mot_pose` pour le compte du jour) ; ce que le
-- voisin a encaissé ne le regarde pas. Même vide que `bourses`, et c'est
-- ce vide qui protège : seule `mot_credite()`, `security definer`, écrit
-- dans cette table.
drop policy if exists visites_lecture  on public.visites;
drop policy if exists visites_creation on public.visites;
drop policy if exists visites_maj      on public.visites;
drop policy if exists visites_suppr    on public.visites;

-- ------------------------------------------------------------
-- La reprise. Les mots déjà plantés valent jetons : sans ça, le premier
-- mot replanté après la migration repaierait une journée déjà payée.
-- On remonte tout l'historique et pas seulement aujourd'hui : c'est
-- gratuit, et une table de jetons trouée ferait douter à la relecture.
--
-- Les mots dont l'auteur a été supprimé (`auteur is null`, le `on delete
-- set null` de `mots`) n'ont jamais rien crédité : ils sortent.
-- ------------------------------------------------------------
insert into public.visites (ile, auteur, jour)
select m.ile, m.auteur, (m.cree_le at time zone 'Europe/Brussels')::date
  from public.mots m
  join public.iles i on i.id = m.ile
 where m.auteur is not null
   and i.proprietaire is not null
   and i.proprietaire <> m.auteur
 group by 1, 2, 3
on conflict do nothing;

-- ------------------------------------------------------------
-- Le trigger. Le test d'existence et la pose du jeton sont le **même
-- insert** : `on conflict do nothing` puis `row_count`. Deux mots plantés
-- dans la même seconde ne peuvent pas passer tous les deux le test avant
-- que l'autre ait écrit, ce qu'un `select exists` suivi d'un `insert`
-- laissait faire.
--
-- Le reste ne bouge pas : 2 shells pour qui pose, 5 pour qui reçoit, une
-- seule fois par personne et par jour, rien chez soi. Et un mot supprimé
-- ne reprend toujours pas les shells : on ne punit pas le propriétaire
-- qui fait le ménage sur son mur. Il ne les redonne plus non plus.
-- ------------------------------------------------------------
create or replace function public.mot_credite()
returns trigger
language plpgsql security definer set search_path = public as $$
declare hote uuid; pose integer;
begin
  select proprietaire into hote from public.iles where id = new.ile;
  if hote is null or new.auteur is null or hote = new.auteur then
    return new;
  end if;

  insert into public.visites (ile, auteur, jour)
       values (new.ile, new.auteur, public.jour_du_jeu())
  on conflict do nothing;
  get diagnostics pose = row_count;
  if pose = 0 then return new; end if;

  perform public.bourse_crediter(new.auteur, 'mot_pose', public.gain('mot_pose'));
  perform public.bourse_crediter(hote,       'mot_recu', public.gain('mot_recu'));
  return new;
end $$;

drop trigger if exists mots_credite on public.mots;
create trigger mots_credite after insert on public.mots
  for each row execute function public.mot_credite();
