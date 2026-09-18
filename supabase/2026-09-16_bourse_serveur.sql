-- ============================================================
--  DAN'S ISLAND — la bourse passe côté serveur
--  16/09/2026
--
--  Jusqu'ici la bourse vivait dans `iles.monde`, le client l'écrivait, et
--  la console d'un navigateur rendait millionnaire en trente secondes.
--  Tant que l'économie n'était faite que de corvées solitaires, ça n'avait
--  aucune importance. Les visites payantes changent ça : elles créditent
--  quelqu'un d'autre que celui qui joue. Un compte qui peut s'écrire
--  lui-même peut aussi écrire celui du voisin.
--
--  La règle posée ici, et qui ne bouge plus :
--
--    * la bourse quitte le jsonb et prend sa propre table ;
--    * cette table n'a **aucune** policy d'écriture — personne, jamais,
--      ne fait un update dessus ;
--    * seules des fonctions `security definer` la modifient ;
--    * le temps est celui du serveur (`jour_du_jeu()`), pas celui du
--      téléphone ;
--    * les plafonds et les prix sont en SQL, pas en JavaScript.
--
--  Ce que ça ne fait pas, et il faut le dire : le serveur ne voit pas
--  l'île. Quand le client annonce « j'ai tondu une touffe », personne ne
--  peut le contredire. Ce qui borne la triche, c'est le plafond du jour,
--  pas la preuve du geste. Les visites, elles, sont vérifiables de bout en
--  bout : c'est une ligne de `mots` qui déclenche le crédit, et le
--  bénéficiaire n'est pas celui qui appelle.
--
--  Réexécutable sans casse : la reprise des bourses du jsonb ne trouve
--  plus rien à reprendre une fois qu'elle a tourné.
-- ============================================================

-- ------------------------------------------------------------
-- Le jour du jeu. Pas UTC : à minuit et demi à Bruxelles, un enfant est
-- encore dans la journée d'hier pour Postgres, et son cadeau du jour
-- tomberait deux fois.
-- ------------------------------------------------------------
create or replace function public.jour_du_jeu()
returns date language sql stable as $$
  select (now() at time zone 'Europe/Brussels')::date;
$$;

grant execute on function public.jour_du_jeu() to anon, authenticated;

-- ------------------------------------------------------------
-- bourses : une ligne par joueur, et pas par île. La bourse suit la
-- personne — c'est elle qui visite, et c'est elle qu'on crédite.
-- ------------------------------------------------------------
create table if not exists public.bourses (
  joueur uuid        primary key references auth.users(id) on delete cascade,
  shells integer     not null default 10 check (shells >= 0),
  achats text[]      not null default '{}',
  jour   date        not null default public.jour_du_jeu(),
  faits  jsonb       not null default '{}'::jsonb,   -- {tonte:5, mot_pose:4}
  pousse date,                                       -- repousse des herbes du jour
  cadeau date,                                       -- dernier cadeau ouvert
  serie  integer     not null default 0 check (serie >= 0),
  maj_le timestamptz not null default now()
);

-- ------------------------------------------------------------
-- catalogue : les prix. Ils étaient en JavaScript, donc négociables.
-- Le client garde les noms, les textes et les dessins ; il lit les prix
-- ici. Une seule source, comme pour `slug_reserve`.
-- ------------------------------------------------------------
create table if not exists public.catalogue (
  k     text primary key,
  rayon text    not null check (rayon in ('ile','dedans','toi')),
  prix  integer not null check (prix > 0)
);

insert into public.catalogue (k, rayon, prix) values
  ('chat','ile',12),          ('herisson','ile',14),      ('puits','ile',16),
  ('fontaine','ile',18),      ('feudecamp','ile',20),     ('hamac','ile',24),
  ('balancoire','ile',25),    ('tente','ile',28),         ('mare','ile',30),
  ('phare','ile',30),         ('renard','ile',32),        ('boutique','ile',35),
  ('toboggan','ile',38),      ('moulin','ile',40),        ('cabane','ile',45),
  ('statue','ile',50),        ('montgolfiere','ile',60),
  ('tapisrond','dedans',12),  ('guirlande','dedans',14),  ('bibliotheque','dedans',20),
  ('poele','dedans',22),      ('tele','dedans',30),       ('aquarium','dedans',35),
  ('piano','dedans',45),
  ('bottes','toi',25),        ('moteur','toi',45)
on conflict (k) do update set rayon = excluded.rayon, prix = excluded.prix;

-- ------------------------------------------------------------
-- Les plafonds du jour. En SQL, pour la même raison que les prix.
--
--   tonte      8   la corvée, elle se joue en marchant
--   promenade  5   le tour de l'île avec le chien, une fois par jour
--   mot_pose  10   aller laisser un mot chez cinq personnes
--   mot_recu  25   en recevoir de cinq personnes
--
-- Les deux derniers dominent les deux premiers, et c'est le but :
-- **l'île grandit parce que des gens sont passés**, jamais parce que le
-- temps passe. Une économie de corvées solitaires contredirait le jeu.
-- ------------------------------------------------------------
create or replace function public.plafond(quoi text)
returns integer language sql immutable as $$
  select case quoi
    when 'tonte'     then 8
    when 'promenade' then 5
    when 'mot_pose'  then 10
    when 'mot_recu'  then 25
    else 0
  end;
$$;

grant execute on function public.plafond(text) to anon, authenticated;

-- Ce que rapporte une visite. Ici aussi, et pas dans le trigger : deux
-- nombres écrits à deux endroits finissent par ne plus dire la même chose.
create or replace function public.gain(quoi text)
returns integer language sql immutable as $$
  select case quoi
    when 'mot_pose' then 2
    when 'mot_recu' then 5
    else 0
  end;
$$;

grant execute on function public.gain(text) to anon, authenticated;

-- Le client a besoin des mêmes nombres pour écrire « il te reste 3 shells
-- à gagner » sans les recopier. Un seul aller-retour, au chargement.
create or replace function public.economie()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'plafonds', (select jsonb_object_agg(q, public.plafond(q))
                   from unnest(array['tonte','promenade','mot_pose','mot_recu']) q),
    'gains',    jsonb_build_object('mot_pose', public.gain('mot_pose'),
                                   'mot_recu', public.gain('mot_recu'))
  );
$$;

grant execute on function public.economie() to anon, authenticated;

-- ============================================================
--  RLS : la bourse se lit, elle ne s'écrit pas
-- ============================================================
alter table public.bourses   enable row level security;
alter table public.catalogue enable row level security;

-- On ne voit que la sienne. Le nombre de shells du voisin ne regarde
-- personne, et surtout pas la boutique.
drop policy if exists bourses_lecture on public.bourses;
create policy bourses_lecture on public.bourses for select
  using (joueur = auth.uid());

-- Et c'est tout. **Aucune policy d'insert, d'update ou de delete** : sans
-- policy, RLS refuse. Ce vide est la protection ; ne pas le combler en
-- croyant réparer quelque chose.
drop policy if exists bourses_ecriture on public.bourses;
drop policy if exists bourses_maj      on public.bourses;
drop policy if exists bourses_suppr    on public.bourses;

-- Les prix sont publics : la vitrine les affiche avant qu'on soit connecté.
drop policy if exists catalogue_lecture on public.catalogue;
create policy catalogue_lecture on public.catalogue for select using (true);
grant select on public.catalogue to anon, authenticated;

-- ============================================================
--  Le cœur : la seule fonction qui touche à `shells`
-- ============================================================
-- `create or replace` refuse de changer le type de retour d'une fonction
-- existante : on dépose avant, sinon rejouer le fichier après une
-- modification échoue sur « cannot change return type ».
drop function if exists public.bourse_du_jour();
drop function if exists public.bourse_gagner(text, integer);
drop function if exists public.bourse_acheter(text);
drop function if exists public.bourse_cadeau();
drop function if exists public.bourse_repousse();
drop function if exists public.bourse_crediter(uuid, text, integer);

-- Elle crée la bourse si elle manque, fait tourner le jour si le jour a
-- tourné, et crédite sous plafond. Tout le reste passe par elle.
--
-- Elle prend un `joueur` en paramètre parce que les visites créditent
-- quelqu'un d'autre que l'appelant. C'est exactement pour ça qu'elle
-- n'est **jamais** exposée : voir le `revoke` juste en dessous.
create or replace function public.bourse_crediter(p_joueur uuid, p_quoi text, p_n integer)
returns public.bourses
language plpgsql security definer set search_path = public as $$
declare
  b public.bourses;
  j date := public.jour_du_jeu();
  p integer; f integer; d integer := 0;
begin
  if p_joueur is null then raise exception 'bourse sans joueur'; end if;

  insert into public.bourses (joueur) values (p_joueur) on conflict (joueur) do nothing;
  select * into b from public.bourses where joueur = p_joueur for update;

  -- Le passage du jour, au seul endroit qui compte. Le client ne le
  -- décide plus : avancer l'horloge du téléphone ne refait plus les
  -- corvées de la veille.
  if b.jour <> j then
    b.jour  := j;
    b.faits := '{}'::jsonb;
  end if;

  if p_quoi is not null and coalesce(p_n, 0) > 0 then
    p := public.plafond(p_quoi);
    f := coalesce((b.faits ->> p_quoi)::integer, 0);
    d := least(p_n, greatest(0, p - f));
    if d > 0 then
      b.faits  := b.faits || jsonb_build_object(p_quoi, f + d);
      b.shells := b.shells + d;
    end if;
  end if;

  update public.bourses
     set shells = b.shells, jour = b.jour, faits = b.faits, maj_le = now()
   where joueur = p_joueur
  returning * into b;
  return b;
end $$;

-- Le verrou de tout le dispositif. Exposée, cette fonction permettrait de
-- se créditer soi-même et de créditer n'importe qui.
revoke all on function public.bourse_crediter(uuid, text, integer) from public;
revoke all on function public.bourse_crediter(uuid, text, integer) from anon, authenticated;

-- ============================================================
--  Ce que le client a le droit de demander
-- ============================================================

-- La bourse du jour. Crée la ligne, fait tourner le jour, et la renvoie.
-- Elle ne touche à rien d'autre : c'est la lecture, et le client l'appelle
-- souvent — au chargement, chaque minute, après avoir planté un mot.
create or replace function public.bourse_du_jour()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'connecte-toi'; end if;
  return to_jsonb(public.bourse_crediter(auth.uid(), null, 0));
end $$;

revoke all on function public.bourse_du_jour() from public;
grant execute on function public.bourse_du_jour() to authenticated;

-- La repousse des herbes, à part. `jour` et `pousse` sont **deux marqueurs
-- et non un** : le premier remet les plafonds à zéro, le second autorise
-- une repousse. Fondus en un seul, une île ouverte aujourd'hui n'aurait sa
-- première touffe que demain.
--
-- Elle se réclame, et elle ne se réclame qu'une fois : c'est pour ça
-- qu'elle n'est pas dans bourse_du_jour(), qu'on appelle à tout bout de
-- champ. Renvoie vrai à celui qui a eu la repousse du jour.
create or replace function public.bourse_repousse()
returns boolean
language plpgsql security definer set search_path = public as $$
declare b public.bourses;
begin
  if auth.uid() is null then raise exception 'connecte-toi'; end if;
  b := public.bourse_crediter(auth.uid(), null, 0);
  if b.pousse is not distinct from b.jour then return false; end if;
  update public.bourses set pousse = b.jour, maj_le = now() where joueur = b.joueur;
  return true;
end $$;

revoke all on function public.bourse_repousse() from public;
grant execute on function public.bourse_repousse() to authenticated;

-- Les corvées, et elles seules. `mot_pose` et `mot_recu` ne sont pas dans
-- la liste : ils se gagnent en plantant un mot, et c'est le trigger qui
-- crédite. Ouvrir cette porte-là viderait les visites de leur sens.
create or replace function public.bourse_gagner(quoi text, n integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'connecte-toi'; end if;
  if quoi is null or quoi not in ('tonte','promenade') then
    raise exception 'ce gain-là ne se demande pas : %', quoi;
  end if;
  if coalesce(n,0) < 1 or n > 8 then
    raise exception 'gain hors bornes';
  end if;
  return to_jsonb(public.bourse_crediter(auth.uid(), quoi, n));
end $$;

revoke all on function public.bourse_gagner(text, integer) from public;
grant execute on function public.bourse_gagner(text, integer) to authenticated;

-- L'achat. Le prix vient du catalogue, jamais de l'appel : sinon autant
-- laisser le client se servir. Un objet déjà acquis ne se repaie pas —
-- on débloque un type une fois, pour toujours.
create or replace function public.bourse_acheter(article text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.bourses; p integer;
begin
  if auth.uid() is null then raise exception 'connecte-toi'; end if;
  select prix into p from public.catalogue where k = article;
  if p is null then raise exception 'cet article n''existe pas : %', article; end if;

  b := public.bourse_crediter(auth.uid(), null, 0);   -- crée et fait tourner le jour
  if article = any (b.achats) then return to_jsonb(b); end if;
  if b.shells < p then raise exception 'il te manque % shells', p - b.shells; end if;

  update public.bourses
     set shells = shells - p, achats = achats || article, maj_le = now()
   where joueur = auth.uid()
  returning * into b;
  return to_jsonb(b);
end $$;

revoke all on function public.bourse_acheter(text) from public;
grant execute on function public.bourse_acheter(text) to authenticated;

-- Le cadeau du jour. La série compte les jours d'affilée et repart à un
-- dès qu'un jour est sauté ; tous les sept jours, la boutique offre le
-- moins cher des articles qui manquent plutôt que des shells.
-- Il ne tombe pas tout seul : c'est le client qui l'ouvre, sinon il n'y a
-- pas de moment. Mais c'est le serveur qui dit quel jour on est.
create or replace function public.bourse_cadeau()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.bourses; j date; n integer; offert text;
begin
  if auth.uid() is null then raise exception 'connecte-toi'; end if;
  b := public.bourse_crediter(auth.uid(), null, 0);
  j := b.jour;
  if b.cadeau is not distinct from j then
    return to_jsonb(b) || jsonb_build_object('offert', null, 'gain', 0, 'deja', true);
  end if;

  b.serie := case when b.cadeau = j - 1 then b.serie + 1 else 1 end;

  if b.serie % 7 = 0 then
    select c.k into offert from public.catalogue c
     where not (c.k = any (b.achats)) order by c.prix, c.k limit 1;
  end if;

  if offert is not null then
    n := 0;
    update public.bourses set cadeau = j, serie = b.serie,
           achats = achats || offert, maj_le = now()
     where joueur = auth.uid() returning * into b;
  else
    n := 3 + least(b.serie, 7);
    update public.bourses set cadeau = j, serie = b.serie,
           shells = shells + n, maj_le = now()
     where joueur = auth.uid() returning * into b;
  end if;

  return to_jsonb(b) || jsonb_build_object('offert', offert, 'gain', n, 'deja', false);
end $$;

revoke all on function public.bourse_cadeau() from public;
grant execute on function public.bourse_cadeau() to authenticated;

-- ============================================================
--  Les visites payantes
-- ============================================================
-- Laisser un mot chez quelqu'un rapporte 2 shells, en recevoir un en
-- rapporte 5. C'est le seul gain que le serveur peut **vérifier** : il y a
-- une ligne dans `mots`, signée d'un compte, sur l'île d'un autre. Le
-- client ne demande rien et ne pourrait rien demander.
--
-- Un seul crédit par (auteur, île) et par jour : sans ça on plante dix
-- mots chez le même ami et la boutique n'a plus de sens. Deux enfants qui
-- s'écrivent tous les jours gagnent 7 shells chacun, et il leur faut
-- cinq correspondants pour saturer la journée.
--
-- Chez soi, rien : `hote = auteur` sort tout de suite.
-- Un mot supprimé ne reprend pas les shells. C'est voulu : on ne punit
-- pas le propriétaire qui fait le ménage sur son mur.
--
-- ATTENTION, 18/09/2026 : cette version-ci est **périmée**. Demander « y
-- a-t-il déjà une ligne de moi aujourd'hui ? » à `mots`, c'est compter
-- sur un mur : effacer son mot rouvrait le crédit du jour. Le compteur a
-- pris sa propre table dans `supabase/2026-09-18_visites.sql`, qui
-- remplace la fonction ci-dessous. Si on rejoue ce fichier-ci, rejouer
-- celui du 18 derrière, sinon le trou revient.
create or replace function public.mot_credite()
returns trigger
language plpgsql security definer set search_path = public as $$
declare hote uuid; deja boolean;
begin
  select proprietaire into hote from public.iles where id = new.ile;
  if hote is null or new.auteur is null or hote = new.auteur then
    return new;
  end if;

  select exists (
    select 1 from public.mots m
     where m.ile = new.ile
       and m.auteur = new.auteur
       and m.id <> new.id
       and (m.cree_le at time zone 'Europe/Brussels')::date = public.jour_du_jeu()
  ) into deja;
  if deja then return new; end if;

  perform public.bourse_crediter(new.auteur, 'mot_pose', public.gain('mot_pose'));
  perform public.bourse_crediter(hote,       'mot_recu', public.gain('mot_recu'));
  return new;
end $$;

drop trigger if exists mots_credite on public.mots;
create trigger mots_credite after insert on public.mots
  for each row execute function public.mot_credite();

-- Le client veut savoir ce que son mot vient de rapporter, sans avoir le
-- droit de lire la bourse de l'hôte. Il relit la sienne : c'est tout ce
-- qui le regarde.

-- ============================================================
--  Reprise des bourses écrites dans le jsonb
-- ============================================================
-- Elles y sont depuis le 16/09 au matin. On les recopie telles quelles,
-- puis on retire les deux clés de `monde` : à partir de maintenant,
-- `mondeNu()` ne les envoie plus et une clé absente de cette liste
-- s'efface de toute façon à la sauvegarde suivante.
--
-- `on conflict do nothing` rend le tout rejouable : une bourse déjà
-- reprise n'est pas écrasée par le jsonb, qui n'existe plus.
insert into public.bourses (joueur, shells, achats, jour, faits, pousse, cadeau, serie)
select
  i.proprietaire,
  greatest(0, coalesce( nullif(i.monde->'bourse'->>'shells','')::integer,
                        nullif(i.monde->'bourse'->>'pieces','')::integer,  -- le nom de la veille
                        10 )),
  coalesce(a.ks, '{}'::text[]),
  coalesce( nullif(i.monde->'bourse'->>'jour','')::date, public.jour_du_jeu() ),
  case when jsonb_typeof(i.monde->'bourse'->'faits') = 'object'
       then i.monde->'bourse'->'faits' else '{}'::jsonb end,
  nullif(i.monde->'bourse'->>'pousse','')::date,
  nullif(i.monde->'bourse'->>'cadeau','')::date,
  coalesce( nullif(i.monde->'bourse'->>'serie','')::integer, 0 )
from public.iles i
left join lateral (
  select array_agg(x) as ks
    from jsonb_array_elements_text(
           case when jsonb_typeof(i.monde->'achats') = 'array'
                then i.monde->'achats' else '[]'::jsonb end) x
) a on true
on conflict (joueur) do nothing;

-- Un objet devenu payant est offert à qui en a déjà un posé. C'était une
-- règle de chargement côté client (`normaliserEconomie`), rejouée à chaque
-- ouverture ; c'est une reprise d'historique, elle se fait une fois, ici.
-- Les souvenirs (`de`) sont exclus : sinon une visite chez un ami
-- débloquerait la boutique.
with poses as (
  select i.proprietaire as joueur, o->>'t' as k
    from public.iles i,
         jsonb_array_elements(
           case when jsonb_typeof(i.monde->'objects') = 'array'
                then i.monde->'objects' else '[]'::jsonb end) o
   where o->>'de' is null
  union
  select i.proprietaire, m->>'t'
    from public.iles i,
         jsonb_each(
           case when jsonb_typeof(i.monde->'interieur'->'pieces') = 'object'
                then i.monde->'interieur'->'pieces' else '{}'::jsonb end) p,
         jsonb_array_elements(
           case when jsonb_typeof(p.value->'meubles') = 'array'
                then p.value->'meubles' else '[]'::jsonb end) m
),
ajouts as (
  select p.joueur, array_agg(distinct p.k) as ks
    from poses p
    join public.catalogue c on c.k = p.k
   group by p.joueur
),
fusion as (
  select a.joueur, array_agg(distinct x) as achats
    from ajouts a
    join public.bourses b on b.joueur = a.joueur,
         unnest(b.achats || a.ks) x
   group by a.joueur
)
update public.bourses b
   set achats = f.achats, maj_le = now()
  from fusion f
 where f.joueur = b.joueur;

-- Et on vide le jsonb de ce qui ne lui appartient plus.
update public.iles
   set monde = (monde - 'bourse' - 'achats')
 where monde ? 'bourse' or monde ? 'achats';
