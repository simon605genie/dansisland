-- ============================================================
--  DAN'S ISLAND — schéma V1
--  Une ligne par île. Le monde entier tient dans une colonne jsonb.
--  Idempotent : réexécutable sans casse.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- profils : le pseudo public rattaché au compte
-- ------------------------------------------------------------
create table if not exists public.profils (
  id      uuid primary key references auth.users(id) on delete cascade,
  pseudo  text not null default 'Quelqu''un',
  cree_le timestamptz not null default now()
);

-- ------------------------------------------------------------
-- iles : le coeur. `monde` porte tiles / house / objects / me / pal / sky
-- ------------------------------------------------------------
create table if not exists public.iles (
  id           uuid primary key default gen_random_uuid(),
  proprietaire uuid not null references auth.users(id) on delete cascade,
  slug         text not null,
  nom          text not null default 'Mon île',
  publiee      boolean not null default false,
  monde        jsonb not null,
  cree_le      timestamptz not null default now(),
  maj_le       timestamptz not null default now(),
  -- Dernier coup d'oeil du propriétaire sur son propre livre d'or.
  vu_le        timestamptz not null default now()
);

alter table public.iles add column if not exists vu_le timestamptz not null default now();

create unique index if not exists iles_slug_unique         on public.iles (lower(slug));
create unique index if not exists iles_proprietaire_unique on public.iles (proprietaire);
create index        if not exists iles_publiee_idx         on public.iles (publiee, maj_le desc);

-- Clé étrangère vers profils, en plus de celle vers auth.users : sans elle
-- PostgREST ne sait pas relier les deux tables et l'embed
-- `profils:proprietaire(pseudo)` de chargerIle() échoue en PGRST200.
-- auth.users n'est pas traversable : il faut un lien direct dans public.
alter table public.iles drop constraint if exists iles_proprietaire_profil_fkey;
alter table public.iles add  constraint iles_proprietaire_profil_fkey
  foreign key (proprietaire) references public.profils(id) on delete cascade;

alter table public.iles drop constraint if exists iles_slug_forme;
alter table public.iles add  constraint iles_slug_forme
  check (slug ~ '^[a-z0-9][a-z0-9-]{1,23}$');

-- Slugs réservés : une seule liste, tenue par slug_reserve(), pour que la
-- contrainte et la vérification côté client ne puissent jamais diverger.
-- « dan » n'en fait pas partie : c'est le prénom du site, pas une route.
create or replace function public.slug_reserve(s text)
returns boolean language sql immutable as $$
  select lower(s) in (
    'api','admin','app','archipel','assets','auth','compte','login','logout',
    'src','static','supabase','www','index','aide','cgu'
  );
$$;

alter table public.iles drop constraint if exists iles_slug_reserve;
alter table public.iles add  constraint iles_slug_reserve
  check (not public.slug_reserve(slug));

-- ------------------------------------------------------------
-- mots : le livre d'or. Un mot est planté sur une case de l'île.
-- ------------------------------------------------------------
create table if not exists public.mots (
  id         uuid primary key default gen_random_uuid(),
  ile        uuid not null references public.iles(id) on delete cascade,
  auteur     uuid references auth.users(id) on delete set null,
  auteur_nom text not null default 'Quelqu''un',
  texte      text not null check (char_length(btrim(texte)) between 1 and 200),
  case_x     smallint not null check (case_x between 0 and 17),
  case_y     smallint not null check (case_y between 0 and 17),
  masque     boolean not null default false,
  cree_le    timestamptz not null default now()
);

create index if not exists mots_ile_idx on public.mots (ile, cree_le desc);

-- La grille est passée de 12x12 à 18x18 le 16/09/2026. Les bornes suivent.
-- Le décalage des mots déjà plantés est une migration à part, non
-- rejouable : supabase/2026-09-16_grille18.sql.
alter table public.mots drop constraint if exists mots_case_x_check;
alter table public.mots drop constraint if exists mots_case_y_check;
alter table public.mots drop constraint if exists mots_case_x_grille;
alter table public.mots drop constraint if exists mots_case_y_grille;
alter table public.mots add  constraint mots_case_x_grille check (case_x between 0 and 17);
alter table public.mots add  constraint mots_case_y_grille check (case_y between 0 and 17);

-- ------------------------------------------------------------
-- maj_le se tient à jour tout seul
-- ------------------------------------------------------------
-- maj_le ne bouge que si le contenu de l'île a bougé. Sans ce filtre,
-- marquer vu_le suffirait à faire remonter l'île en tête de l'archipel :
-- regarder son propre livre d'or passerait pour une mise à jour.
create or replace function public.touch_maj_le()
returns trigger language plpgsql as $$
begin
  if new.monde   is distinct from old.monde
  or new.nom     is distinct from old.nom
  or new.slug    is distinct from old.slug
  or new.publiee is distinct from old.publiee then
    new.maj_le = now();
  else
    new.maj_le = old.maj_le;
  end if;
  return new;
end $$;

drop trigger if exists iles_touch on public.iles;
create trigger iles_touch before update on public.iles
  for each row execute function public.touch_maj_le();

-- ------------------------------------------------------------
-- un profil naît avec le compte
-- ------------------------------------------------------------
create or replace function public.creer_profil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id, pseudo)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Quelqu''un'))
  on conflict (id) do nothing;
  return new;
end $$;

-- Nom volontairement préfixé : « on_auth_user_created » est le nom que Supabase
-- rend générique et que d'autres projets utilisent déjà. Ne jamais le reprendre ici.
drop trigger if exists dansisland_profil_a_la_creation on auth.users;
create trigger dansisland_profil_a_la_creation after insert on auth.users
  for each row execute function public.creer_profil();

-- ============================================================
--  RLS — personne ne touche l'île de personne
-- ============================================================
alter table public.profils enable row level security;
alter table public.iles    enable row level security;
alter table public.mots    enable row level security;

-- profils : le pseudo est public, le reste t'appartient
drop policy if exists profils_lecture  on public.profils;
drop policy if exists profils_ecriture on public.profils;
drop policy if exists profils_maj      on public.profils;
create policy profils_lecture  on public.profils for select using (true);
create policy profils_ecriture on public.profils for insert with check (auth.uid() = id);
create policy profils_maj      on public.profils for update using (auth.uid() = id) with check (auth.uid() = id);

-- iles : on voit les îles publiées, et toujours la sienne
drop policy if exists iles_lecture   on public.iles;
drop policy if exists iles_creation  on public.iles;
drop policy if exists iles_maj       on public.iles;
drop policy if exists iles_suppr     on public.iles;
create policy iles_lecture  on public.iles for select
  using (publiee or proprietaire = auth.uid());
create policy iles_creation on public.iles for insert
  with check (proprietaire = auth.uid());
create policy iles_maj      on public.iles for update
  using (proprietaire = auth.uid()) with check (proprietaire = auth.uid());
create policy iles_suppr    on public.iles for delete
  using (proprietaire = auth.uid());

-- mots : lisibles sur une île visible ; le propriétaire voit aussi les masqués
drop policy if exists mots_lecture  on public.mots;
drop policy if exists mots_creation on public.mots;
drop policy if exists mots_maj      on public.mots;
drop policy if exists mots_suppr    on public.mots;

create policy mots_lecture on public.mots for select using (
  exists (
    select 1 from public.iles i
    where i.id = mots.ile
      and (i.proprietaire = auth.uid() or (i.publiee and not mots.masque))
  )
);

-- on ne plante un mot que connecté, sur une île publiée, et signé de son propre compte
create policy mots_creation on public.mots for insert with check (
  auteur = auth.uid()
  and exists (select 1 from public.iles i where i.id = mots.ile and i.publiee)
);

-- masquer un mot : seul le propriétaire de l'île
create policy mots_maj on public.mots for update using (
  exists (select 1 from public.iles i where i.id = mots.ile and i.proprietaire = auth.uid())
) with check (
  exists (select 1 from public.iles i where i.id = mots.ile and i.proprietaire = auth.uid())
);

-- supprimer : son propre mot, ou n'importe lequel chez soi
create policy mots_suppr on public.mots for delete using (
  auteur = auth.uid()
  or exists (select 1 from public.iles i where i.id = mots.ile and i.proprietaire = auth.uid())
);

-- ============================================================
--  archipel : la liste publique, sans trimballer tout le monde jsonb
-- ============================================================
drop view if exists public.archipel;
create view public.archipel with (security_invoker = true) as
select
  i.slug,
  i.nom,
  i.maj_le,
  coalesce(p.pseudo, 'Quelqu''un')      as proprietaire,
  i.monde -> 'me'                        as avatar,
  i.monde -> 'pal'                       as palette,
  (select count(*) from public.mots m
     where m.ile = i.id and not m.masque) as mots
from public.iles i
left join public.profils p on p.id = i.proprietaire
where i.publiee
order by i.maj_le desc;

grant select on public.archipel to anon, authenticated;

-- ============================================================
--  slug_libre : le client demande avant de se faire jeter
-- ============================================================
-- Répond faux aussi pour un slug mal formé ou réservé : sans ça le client
-- annonce « libre », puis l'insert casse sur iles_slug_forme / iles_slug_reserve.
-- Les deux listes doivent rester identiques à celles des contraintes ci-dessus.
create or replace function public.slug_libre(candidat text)
returns boolean language sql security definer set search_path = public stable as $$
  select not public.slug_reserve(candidat)
     and not exists (select 1 from public.iles where lower(slug) = lower(candidat));
$$;

grant execute on function public.slug_libre(text) to anon, authenticated;
