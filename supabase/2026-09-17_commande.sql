-- ============================================================
--  DAN'S ISLAND · la commande du jour, et le sac
--  17/09/2026 au soir
--
--  La question posée avant d'écrire une ligne était : la commande se
--  paie-t-elle en shells (un revenu solitaire de plus, contre la règle
--  « l'île grandit parce que des gens sont passés »), ou demande-t-elle
--  d'aller chez les autres, ce qui rouvrirait le choix écrit dans
--  `majLaisse()` : « chez les voisins, il n'y a rien à ramasser » ?
--
--  Réponse : ni l'un ni l'autre. **La commande se remplit chez soi et se
--  livre chez un voisin.** La règle de `majLaisse()` parle de *ramasser* ;
--  livrer est le verbe inverse. On arrive les mains pleines au lieu de
--  repartir les mains pleines, et la ligne reste vraie mot pour mot.
--
--  Et la commande ne paie pas comme une corvée : elle paie comme une
--  visite. Même famille que `mot_pose` / `mot_recu`, même vérifiabilité :
--  une ligne signée d'un compte, sur l'île d'un autre, créditée par le
--  serveur et jamais demandée par le client. Le revenu solitaire reste à
--  19 shells par jour ; le revenu « quelqu'un est passé » monte de 35 à
--  65. Le rapport passe de 1,8x à 3,4x : ça renforce la règle.
--
--  Réexécutable sans casse : `create or replace`, `add column if not
--  exists`, `create table if not exists`.
-- ============================================================

-- ------------------------------------------------------------
-- Le sac. Il appartient au **joueur**, pas à l'île, comme la bourse, et
-- pour la même raison : c'est la personne qui visite, et c'est elle qui
-- porte le panier chez le voisin. Il n'a donc rien à faire dans
-- `iles.monde`, et `mondeNu()` ne gagne pas une clé.
--
--   sac = {"coquillage": 2, "etoile": 1}
-- ------------------------------------------------------------
alter table public.bourses add column if not exists sac jsonb not null default '{}'::jsonb;

-- ------------------------------------------------------------
-- La commande du jour. Elle se **déduit du jour**, elle n'est stockée
-- nulle part : la même pour tout le monde, comme la marée se déduit de
-- l'heure. Deux enfants qui jouent le même jour ont la même commande et
-- peuvent en parler, et il n'y a pas une ligne de plus à écrire ni à
-- faire tourner à minuit.
--
-- Deux sortes, toujours différentes, une de chaque. Le calcul est en
-- arithmétique entière pure, sans hachage, pour que le client le refasse
-- à l'identique hors ligne : `hashtext()` ne se rejoue pas en JavaScript.
--
--   n = jours depuis l'origine
--   a = n mod 4
--   b = (a + 1 + (floor(n/4) mod 3)) mod 4      ← jamais égal à a
--
-- L'origine est la même date que celle de la marée. La déplacer décalerait
-- la commande de tout le monde d'un coup.
-- ------------------------------------------------------------
create or replace function public.commande()
returns jsonb language sql stable as $$
  with c as (
    select (public.jour_du_jeu() - date '2026-09-17')::integer as n,
           array['coquillage','etoile','boisflotte','bouteille'] as sortes
  ), k as (
    select sortes,
           ((n % 4) + 4) % 4                                  as a,
           ((floor(n / 4.0)::integer % 3) + 3) % 3            as r
      from c
  )
  select jsonb_build_object(
    'jour', public.jour_du_jeu(),
    'veut', jsonb_build_array(sortes[a + 1], sortes[((a + 1 + r) % 4) + 1])
  ) from k;
$$;

grant execute on function public.commande() to anon, authenticated;

-- ------------------------------------------------------------
-- Ce que la Boutique vend en plus, du même soir.
--
-- Les prix vivent ici et pas en JavaScript : `bourse_acheter()` lit le
-- catalogue, et un article absent de cette table est refusé à l'achat
-- quoi qu'en dise la vitrine. Deux listes qui divergent, et la vitrine
-- annonce un prix que l'achat refuse.
--
--   appareil   28   l'appareil photo : un viseur, un déclencheur, un album
--   compagnon  20   le rayon, pas la bestiole. Il fait suivre partout une
--                   de celles qu'on possède déjà, jamais une de plus :
--                   sinon un renard coûterait 20 shells par cette porte
--                   et 32 par l'autre, et la boutique cesserait de vouloir
--                   dire quelque chose.
--
-- Aucun des deux ne rapporte de shells : ce ne sont pas des corvées, et
-- une photo qui paierait en deviendrait une.
-- ------------------------------------------------------------
insert into public.catalogue (k, rayon, prix) values
  ('appareil','toi',28), ('compagnon','toi',20)
on conflict (k) do update set rayon = excluded.rayon, prix = excluded.prix;

-- ------------------------------------------------------------
-- Les plafonds et les gains.
--
--   commande        6   porter la commande, une fois par jour
--   commande_recue 24   la recevoir, 8 par personne, trois personnes
--
-- Exactement la forme de `mot_pose` / `mot_recu` : recevoir domine, et
-- trois à cinq visiteurs saturent la journée. Les corvées solitaires
-- (tonte, promenade, marée) restent à 19 shells et ne bougent pas.
-- ------------------------------------------------------------
create or replace function public.plafond(quoi text)
returns integer language sql immutable as $$
  select case quoi
    when 'tonte'          then 8
    when 'promenade'      then 5
    when 'maree'          then 6
    when 'mot_pose'       then 10
    when 'mot_recu'       then 25
    when 'commande'       then 6
    when 'commande_recue' then 24
    else 0
  end;
$$;

grant execute on function public.plafond(text) to anon, authenticated;

create or replace function public.gain(quoi text)
returns integer language sql immutable as $$
  select case quoi
    when 'maree'          then 2
    when 'mot_pose'       then 2
    when 'mot_recu'       then 5
    when 'commande'       then 6
    when 'commande_recue' then 8
    else 0
  end;
$$;

grant execute on function public.gain(text) to anon, authenticated;

create or replace function public.economie()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'plafonds', (select jsonb_object_agg(q, public.plafond(q))
                   from unnest(array['tonte','promenade','maree','mot_pose','mot_recu',
                                     'commande','commande_recue']) q),
    'gains',    jsonb_build_object('maree',          public.gain('maree'),
                                   'mot_pose',       public.gain('mot_pose'),
                                   'mot_recu',       public.gain('mot_recu'),
                                   'commande',       public.gain('commande'),
                                   'commande_recue', public.gain('commande_recue'))
  );
$$;

grant execute on function public.economie() to anon, authenticated;

-- ------------------------------------------------------------
-- livraisons : une ligne par panier porté. C'est ce qui rend la commande
-- **vérifiable de bout en bout**, comme `mots` rend les visites
-- vérifiables : une ligne signée d'un compte, sur l'île de quelqu'un
-- d'autre, et le bénéficiaire n'est pas l'appelant.
--
-- `unique (ile, auteur, jour)` : on ne porte pas dix paniers chez le même
-- ami dans la journée.
-- ------------------------------------------------------------
create table if not exists public.livraisons (
  id         uuid primary key default gen_random_uuid(),
  ile        uuid not null references public.iles(id)    on delete cascade,
  auteur     uuid not null references auth.users(id)     on delete cascade,
  auteur_nom text not null default 'Quelqu’un',
  jour       date not null default public.jour_du_jeu(),
  panier     text[] not null default '{}',
  cree_le    timestamptz not null default now(),
  unique (ile, auteur, jour)
);

create index if not exists livraisons_ile_jour on public.livraisons (ile, jour);

alter table public.livraisons enable row level security;

-- L'hôte voit qui lui a porté la commande, et le porteur voit ce qu'il a
-- porté. Personne d'autre : ce n'est pas un mur public, c'est un reçu.
drop policy if exists livraisons_lecture on public.livraisons;
create policy livraisons_lecture on public.livraisons for select using (
  auteur = auth.uid()
  or exists (select 1 from public.iles i where i.id = livraisons.ile and i.proprietaire = auth.uid())
);

-- Et c'est tout. **Aucune policy d'insert, d'update ou de delete** :
-- l'insert passe par `livrer()`, qui est `security definer` et qui vérifie
-- le sac. Ouvrir un insert direct, c'est laisser écrire un reçu sans avoir
-- rien porté, donc créditer le voisin depuis la console. Même vide que
-- celui de `bourses`, même protection.
drop policy if exists livraisons_creation on public.livraisons;
drop policy if exists livraisons_maj      on public.livraisons;
drop policy if exists livraisons_suppr    on public.livraisons;

grant select on public.livraisons to authenticated;

-- ============================================================
--  Ce que le client a le droit de demander
-- ============================================================

-- `create or replace` refuse de changer le type de retour : on dépose
-- avant, sinon rejouer le fichier après une modification échoue.
drop function if exists public.bourse_ramasser(text);
drop function if exists public.livrer(uuid, text);

-- ------------------------------------------------------------
-- Ramasser ce que la mer laisse. C'était `bourse_gagner('maree', 2)` ;
-- ça devient un appel qui dit **quoi**, parce que le sac a besoin de la
-- sorte.
--
-- **Le sac ne se remplit que si la marée a payé.** Pas de second
-- compteur à tenir : le plafond du jour (6 shells, 2 par chose) borne
-- déjà à trois objets, et un sac sans plafond serait une monnaie que le
-- client s'écrit tout seul. Ramassé au-delà, l'objet disparaît quand même
-- et le client le dit : c'est la règle déjà tenue pour la tonte.
-- ------------------------------------------------------------
create or replace function public.bourse_ramasser(quoi text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.bourses; av integer; ap integer;
begin
  if auth.uid() is null then raise exception 'connecte-toi'; end if;
  if quoi is null or quoi not in ('coquillage','etoile','boisflotte','bouteille') then
    raise exception 'la mer ne laisse pas ça : %', quoi;
  end if;

  b  := public.bourse_crediter(auth.uid(), null, 0);        -- crée, fait tourner le jour
  av := coalesce((b.faits ->> 'maree')::integer, 0);
  b  := public.bourse_crediter(auth.uid(), 'maree', public.gain('maree'));
  ap := coalesce((b.faits ->> 'maree')::integer, 0);

  if ap > av then
    update public.bourses
       set sac = sac || jsonb_build_object(quoi, coalesce((sac ->> quoi)::integer, 0) + 1),
           maj_le = now()
     where joueur = auth.uid()
    returning * into b;
  end if;

  return to_jsonb(b);
end $$;

revoke all on function public.bourse_ramasser(text) from public;
grant execute on function public.bourse_ramasser(text) to authenticated;

-- ------------------------------------------------------------
-- Porter la commande chez quelqu'un.
--
-- Trois refus, et aucun n'est négociable depuis le navigateur : chez soi,
-- déjà porté aujourd'hui, sac incomplet. Le panier n'est pas dans l'appel
-- (il est déduit de `commande()`) pour la même raison que le prix vient
-- du catalogue et jamais de l'appel : sinon autant laisser le client se
-- servir.
--
-- L'hôte n'a rien à faire et n'a pas à être là. Il trouve ses shells en
-- rentrant, comme pour les mots.
-- ------------------------------------------------------------
create or replace function public.livrer(p_ile uuid, p_nom text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare hote uuid; b public.bourses; veut text[]; q text;
begin
  if auth.uid() is null then raise exception 'connecte-toi'; end if;

  select proprietaire into hote from public.iles where id = p_ile;
  if hote is null then raise exception 'cette île n''existe pas'; end if;
  if hote = auth.uid() then raise exception 'la commande se porte chez quelqu''un d''autre'; end if;

  b := public.bourse_crediter(auth.uid(), null, 0);
  if coalesce((b.faits ->> 'commande')::integer, 0) >= public.plafond('commande') then
    raise exception 'tu as déjà porté la commande aujourd''hui';
  end if;

  select array_agg(x) into veut
    from jsonb_array_elements_text(public.commande() -> 'veut') x;

  foreach q in array veut loop
    if coalesce((b.sac ->> q)::integer, 0) < 1 then
      raise exception 'il manque % dans ton sac', q;
    end if;
  end loop;

  -- Le reçu d'abord : l'unique (ile, auteur, jour) est ce qui refuse le
  -- second panier chez le même hôte, et il doit refuser **avant** qu'on
  -- ait vidé le sac.
  insert into public.livraisons (ile, auteur, auteur_nom, jour, panier)
  values (p_ile, auth.uid(), coalesce(nullif(p_nom, ''), 'Quelqu’un'), b.jour, veut);

  foreach q in array veut loop
    update public.bourses
       set sac = sac || jsonb_build_object(q, coalesce((sac ->> q)::integer, 0) - 1),
           maj_le = now()
     where joueur = auth.uid();
  end loop;

  perform public.bourse_crediter(hote, 'commande_recue', public.gain('commande_recue'));
  b := public.bourse_crediter(auth.uid(), 'commande', public.gain('commande'));
  return to_jsonb(b);
end $$;

revoke all on function public.livrer(uuid, text) from public;
grant execute on function public.livrer(uuid, text) to authenticated;
