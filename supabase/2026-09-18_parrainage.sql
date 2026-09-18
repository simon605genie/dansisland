-- ============================================================
--  DAN'S ISLAND — le parrainage, et les réglages
--  18/09/2026
--
--  Une carte postale se partage, quelqu'un la reçoit, et parfois il crée
--  son île. Jusqu'ici ce fil-là se perdait : rien ne reliait l'île neuve à
--  celle qui l'avait fait naître.
--
--  Ce que ça respecte, et c'est la seule raison d'écrire ce fichier :
--  **l'île grandit parce que des gens sont passés**, jamais parce que le
--  temps passe. Un parrainage n'est pas une corvée de plus qui se boucle
--  chez soi — c'est quelqu'un qui n'était pas là et qui est arrivé. Il est
--  dans la famille des visites, comme la commande portée, et pour la même
--  raison : le bénéficiaire n'est pas l'appelant, et il y a une ligne
--  signée d'un compte pour le prouver.
--
--  Trois choses à ne pas défaire :
--
--    1. `parrainages` n'a **aucune policy d'écriture**, comme `bourses`,
--       `livraisons` et `visites`. Pas une policy restrictive : pas de
--       policy du tout, et RLS refuse par défaut. Seule `parrainer()`,
--       `security definer`, y écrit. Un insert direct, ce serait un
--       parrainage écrit depuis la console, donc des shells sortis de rien.
--    2. La clé primaire est le **filleul**. On est parrainé une fois dans
--       sa vie, jamais deux, et c'est la base qui le tient — pas le client.
--       Le test d'existence *est* l'insert (`on conflict do nothing` puis
--       `row_count`), comme pour `visites` : un `select exists` suivi d'un
--       `insert` laisse passer deux appels lancés dans la même seconde.
--    3. Le filleul doit **vraiment avoir son île**. Ouvrir un compte ne
--       vaut rien : c'est l'île créée qui paie, des deux côtés. C'est ce
--       que demande le brief, et c'est aussi ce qui rend le parrainage
--       coûteux à fabriquer en série.
--
--  Réexécutable sans casse : `create table if not exists`,
--  `create or replace`, et les réglages s'insèrent en
--  `on conflict do nothing` — rejouer le fichier ne réécrit pas une
--  valeur qu'on aurait réglée à la main dans le dashboard.
-- ============================================================

-- ------------------------------------------------------------
-- reglages : les nombres qu'on veut pouvoir changer sans redéployer.
--
-- Le brief demande « des paramètres de récompense dans une configuration
-- facilement modifiable ». En SQL, donc, et pas en JavaScript : c'est la
-- même règle que les prix du `catalogue` et les plafonds de `plafond()`.
-- Deux listes qui divergent, et la vitrine annonce un nombre que le
-- serveur refuse.
--
-- Pour changer une récompense, une ligne dans l'éditeur SQL du projet
-- **dansisland** (jamais celui de mamash) :
--
--     update public.reglages set v = 40 where k = 'parrainage_parrain';
--
-- Elle prend effet tout de suite : `gain()` la relit à chaque appel.
-- ------------------------------------------------------------
create table if not exists public.reglages (
  k    text primary key,
  v    integer not null,
  quoi text not null default ''
);

insert into public.reglages (k, v, quoi) values
  ('parrainage_parrain', 25, 'shells au parrain, quand un filleul crée vraiment son île'),
  ('parrainage_filleul', 15, 'shells au filleul, à la création de son île'),
  ('parrainage_par_jour', 5, 'filleuls comptés par parrain et par jour — la borne anti-abus')
on conflict (k) do nothing;

alter table public.reglages enable row level security;

-- Les réglages se lisent : le client écrit « +25 shells pour toi » sans
-- recopier le nombre. Ils ne s'écrivent pas — pas de policy d'écriture,
-- c'est le dashboard qui les change.
drop policy if exists reglages_lecture  on public.reglages;
drop policy if exists reglages_ecriture on public.reglages;
drop policy if exists reglages_maj      on public.reglages;
drop policy if exists reglages_suppr    on public.reglages;
create policy reglages_lecture on public.reglages for select using (true);

create or replace function public.reglage(p_k text, p_defaut integer)
returns integer language sql stable as $$
  select coalesce((select v from public.reglages where k = p_k), p_defaut);
$$;

grant execute on function public.reglage(text, integer) to anon, authenticated;

-- ------------------------------------------------------------
-- Les plafonds et les gains, étendus de deux clés.
--
-- `plafond()` et `gain()` étaient `immutable` ; elles deviennent `stable`
-- parce qu'elles lisent maintenant une table. Aucun index ne s'appuie
-- dessus, rien d'autre ne change. Les sept clés d'avant rendent exactement
-- les mêmes nombres.
--
--   parrainage   25   au parrain, par filleul qui crée son île
--   bienvenue    15   au filleul, une fois
--
-- Le plafond du parrain vaut `gain × filleuls_par_jour` : cinq filleuls
-- dans la journée, et le compteur s'arrête. C'est la protection minimale
-- demandée — un lien magique est gratuit, donc fabriquer des comptes l'est
-- aussi, et sans borne le parrainage serait la seule source de shells
-- qu'on peut s'écrire tout seul.
--
-- Le plafond du filleul vaut exactement son gain : une fois par jour, et
-- de toute façon une fois dans sa vie puisque `parrainages` a le filleul
-- pour clé primaire. C'est la même écriture que `promenade`, dont le
-- plafond vaut son gain pour dire « une fois par jour » en une ligne.
-- ------------------------------------------------------------
create or replace function public.plafond(quoi text)
returns integer language sql stable as $$
  select case quoi
    when 'tonte'          then 8
    when 'promenade'      then 5
    when 'maree'          then 6
    when 'mot_pose'       then 10
    when 'mot_recu'       then 25
    when 'commande'       then 6
    when 'commande_recue' then 24
    when 'parrainage'     then public.reglage('parrainage_parrain', 25)
                              * public.reglage('parrainage_par_jour', 5)
    when 'bienvenue'      then public.reglage('parrainage_filleul', 15)
    else 0
  end;
$$;

grant execute on function public.plafond(text) to anon, authenticated;

create or replace function public.gain(quoi text)
returns integer language sql stable as $$
  select case quoi
    when 'maree'          then 2
    when 'mot_pose'       then 2
    when 'mot_recu'       then 5
    when 'commande'       then 6
    when 'commande_recue' then 8
    when 'parrainage'     then public.reglage('parrainage_parrain', 25)
    when 'bienvenue'      then public.reglage('parrainage_filleul', 15)
    else 0
  end;
$$;

grant execute on function public.gain(text) to anon, authenticated;

create or replace function public.economie()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'plafonds', (select jsonb_object_agg(q, public.plafond(q))
                   from unnest(array['tonte','promenade','maree','mot_pose','mot_recu',
                                     'commande','commande_recue','parrainage','bienvenue']) q),
    'gains',    jsonb_build_object('maree',          public.gain('maree'),
                                   'mot_pose',       public.gain('mot_pose'),
                                   'mot_recu',       public.gain('mot_recu'),
                                   'commande',       public.gain('commande'),
                                   'commande_recue', public.gain('commande_recue'),
                                   'parrainage',     public.gain('parrainage'),
                                   'bienvenue',      public.gain('bienvenue'))
  );
$$;

grant execute on function public.economie() to anon, authenticated;

-- Ce que valent les deux récompenses, sans compte et sans rien d'autre.
-- La page publique d'une carte postale l'annonce avant qu'on se connecte :
-- « toi aussi tu reçois des shells » est la moitié de l'invitation.
create or replace function public.parrainage()
returns jsonb language sql stable as $$
  select jsonb_build_object('parrain', public.gain('parrainage'),
                            'filleul', public.gain('bienvenue'));
$$;

grant execute on function public.parrainage() to anon, authenticated;

-- ------------------------------------------------------------
-- parrainages : une ligne par filleul, pour toujours.
--
-- `code` garde le slug tel qu'il a été suivi, même si l'île change
-- d'adresse plus tard : c'est la trace de l'invitation, pas une clé
-- étrangère. Le lien qui compte, celui qui paie, c'est `parrain`.
-- ------------------------------------------------------------
create table if not exists public.parrainages (
  filleul uuid        primary key references auth.users(id) on delete cascade,
  parrain uuid        not null references auth.users(id) on delete cascade,
  code    text        not null,
  jour    date        not null default public.jour_du_jeu(),
  cree_le timestamptz not null default now(),
  check (filleul <> parrain)
);

create index if not exists parrainages_parrain_idx on public.parrainages (parrain, cree_le desc);

alter table public.parrainages enable row level security;

-- Lecture des deux côtés : le filleul voit qui l'a invité, le parrain voit
-- combien d'îles sont nées de ses cartes postales. C'est un reçu, comme
-- `livraisons` : un gain anonyme se lit comme une bizarrerie du compteur.
drop policy if exists parrainages_lecture  on public.parrainages;
drop policy if exists parrainages_creation on public.parrainages;
drop policy if exists parrainages_maj      on public.parrainages;
drop policy if exists parrainages_suppr    on public.parrainages;
create policy parrainages_lecture on public.parrainages for select
  using (filleul = auth.uid() or parrain = auth.uid());
-- Pas de policy d'insert, d'update ni de delete. Le vide *est* la
-- protection : seule `parrainer()` écrit ici.

-- ------------------------------------------------------------
-- parrainer(code) : le seul chemin.
--
-- Le client l'appelle une fois, juste après avoir créé son île, avec le
-- slug qu'il a suivi. Tout le reste est vérifié ici :
--
--   * il faut être connecté ;
--   * il faut **avoir son île** — c'est ça, « quand le filleul crée
--     réellement son île » ;
--   * on ne se parraine pas soi-même ;
--   * on n'est parrainé qu'une fois, et c'est l'insert qui le dit ;
--   * le code doit désigner une île qui existe.
--
-- Elle ne lève pas d'exception pour un refus ordinaire : elle rend
-- `{ok:false, pourquoi:…}`. Un enfant qui arrive par un lien périmé ne
-- doit pas voir la création de son île échouer pour autant.
-- ------------------------------------------------------------
create or replace function public.parrainer(code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  f uuid := auth.uid();
  p uuid;
  s text := lower(btrim(coalesce(code, '')));
  n integer;
  b public.bourses;
begin
  if f is null then raise exception 'connecte-toi'; end if;
  if s = '' then return jsonb_build_object('ok', false, 'pourquoi', 'sans code'); end if;

  -- Le compte ne suffit pas : c'est l'île qui paie.
  if not exists (select 1 from public.iles where proprietaire = f) then
    return jsonb_build_object('ok', false, 'pourquoi', 'pas encore d''île');
  end if;

  select proprietaire into p from public.iles where lower(slug) = s;
  if p is null then return jsonb_build_object('ok', false, 'pourquoi', 'code inconnu'); end if;
  if p = f    then return jsonb_build_object('ok', false, 'pourquoi', 'c''est ta propre île'); end if;

  -- Le test d'existence *est* l'insert : deux appels lancés dans la même
  -- seconde passeraient tous les deux un `select exists`.
  insert into public.parrainages (filleul, parrain, code, jour)
  values (f, p, s, public.jour_du_jeu())
  on conflict (filleul) do nothing;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'pourquoi', 'déjà parrainé'); end if;

  -- Le parrain d'abord : il n'est pas là, il trouvera ses shells en
  -- rentrant, exactement comme pour un mot reçu ou un panier porté.
  perform public.bourse_crediter(p, 'parrainage', public.gain('parrainage'));
  b := public.bourse_crediter(f, 'bienvenue', public.gain('bienvenue'));

  return jsonb_build_object('ok', true,
                            'gagne',  public.gain('bienvenue'),
                            'offert', public.gain('parrainage'),
                            'bourse', to_jsonb(b));
end $$;

revoke all on function public.parrainer(text) from public;
grant execute on function public.parrainer(text) to authenticated;

-- ------------------------------------------------------------
-- mes_filleuls() : combien d'îles sont nées de tes cartes postales.
-- Un chiffre, pas une liste de noms : le panneau n'a pas à devenir un
-- tableau de bord, et personne n'a demandé qu'on affiche qui a cliqué.
-- ------------------------------------------------------------
create or replace function public.mes_filleuls()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.parrainages where parrain = auth.uid();
$$;

revoke all on function public.mes_filleuls() from public;
grant execute on function public.mes_filleuls() to authenticated;
