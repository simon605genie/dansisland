-- ============================================================
--  DAN'S ISLAND — la marée
--  17/09/2026
--
--  Deux fois par jour la mer se retire, et l'anneau de cases juste au-delà
--  du bord de l'île devient du sable mouillé praticable, où la mer laisse
--  des choses à ramasser. À marée haute c'est de l'eau, et on ne peut plus
--  y aller.
--
--  Pourquoi c'est ici et pas dans le navigateur : pour la même raison que
--  `jour_du_jeu()`. Une marée lue sur l'horloge du téléphone se remonte
--  d'un doigt, et surtout elle ne serait pas la même pour deux enfants au
--  même moment. Or on va chez les autres : il faut que la mer soit basse
--  chez le voisin quand elle est basse chez soi.
--
--  Le cycle est **semi-diurne, comme la vraie marée** : 12 h 25 min, donc
--  deux basses mers par jour et un décalage d'environ cinquante minutes
--  d'un jour sur l'autre. Ce décalage n'est pas un détail d'exactitude,
--  c'est la règle de jeu : un enfant qui se connecte toujours après
--  l'école verrait sinon éternellement la même marée, et la moitié du jeu
--  ne lui arriverait jamais.
--
--  Réexécutable sans casse : ce fichier ne contient que des
--  `create or replace`.
-- ============================================================

-- ------------------------------------------------------------
-- L'état de la mer, maintenant.
--
--   phase   0 à 1 dans le cycle : 0 = basse mer pleine, 0,5 = pleine mer
--   niveau  0 (retirée) à 1 (haute) — le cosinus de la phase, comme la
--           vraie mer, qui ne monte pas à vitesse constante
--   basse   vrai quand le sable est découvert. Le seuil est à 0,25, ce qui
--           découvre le sable un tiers du cycle, soit environ 4 h par
--           marée et deux fois par jour.
--   cycle   la période en secondes, pour que le client ne la recopie pas
--   numero  combien de marées depuis l'origine. C'est la graine de ce que
--           la mer dépose : la même pour tout le monde, stable tant que la
--           marée dure, et différente à la suivante.
--   bascule dans combien de secondes `basse` change d'avis. Le client
--           interpole entre deux appels au lieu d'en faire un par image.
--
-- L'origine est posée à la basse mer du 17/09/2026 à 7 h du matin, heure
-- de Bruxelles. Elle est arbitraire mais fixe : la déplacer décalerait la
-- marée de tout le monde d'un coup.
-- ------------------------------------------------------------
create or replace function public.maree()
returns jsonb language sql stable as $$
  with c as (
    select 44700::numeric as cycle,                                   -- 12 h 25 min
           extract(epoch from now())::numeric as t,
           extract(epoch from timestamptz '2026-09-17 07:00:00+02')::numeric as t0
  ), p as (
    select cycle, t, t0,
           floor((t - t0) / cycle)          as numero,
           mod(mod(t - t0, cycle) + cycle, cycle) / cycle as phase
    from c
  ), n as (
    -- Le cosinus travaille en double précision ; on rentre en numeric tout
    -- de suite, sinon `round(x, 4)` ne trouve pas de fonction pour lui.
    select *, ((1 - cos(2 * pi() * phase::double precision)) / 2)::numeric as niveau from p
  )
  select jsonb_build_object(
    'phase',   round(phase, 6),
    'niveau',  round(niveau, 4),
    'basse',   niveau < 0.25,
    'cycle',   cycle,
    'numero',  numero,
    -- cos(2.pi.p) = 0,5 en p = 1/6 et p = 5/6 : ce sont les deux bascules.
    'bascule', round(cycle * (case when phase < 1.0/6 then 1.0/6 - phase
                                   when phase < 5.0/6 then 5.0/6 - phase
                                   else 7.0/6 - phase end))
  ) from n;
$$;

grant execute on function public.maree() to anon, authenticated;

-- ------------------------------------------------------------
-- Ce que la marée rapporte, et ce qu'elle ne rapporte pas.
--
-- Six shells par jour, deux par chose ramassée : trois objets, et c'est
-- tout. C'est volontairement du même ordre que la tonte et la promenade,
-- et très en dessous des trente-cinq shells des visites. La règle ne
-- bouge pas : **l'île grandit parce que des gens sont passés**, jamais
-- parce que le temps passe. Une marée généreuse serait exactement le
-- contraire : un gain qui tombe tout seul, deux fois par jour.
--
-- Le plafond est journalier, pas par marée : deux basses mers dans la
-- même journée ne donnent pas six shells chacune.
-- ------------------------------------------------------------
create or replace function public.plafond(quoi text)
returns integer language sql immutable as $$
  select case quoi
    when 'tonte'     then 8
    when 'promenade' then 5
    when 'maree'     then 6
    when 'mot_pose'  then 10
    when 'mot_recu'  then 25
    else 0
  end;
$$;

grant execute on function public.plafond(text) to anon, authenticated;

create or replace function public.gain(quoi text)
returns integer language sql immutable as $$
  select case quoi
    when 'maree'    then 2
    when 'mot_pose' then 2
    when 'mot_recu' then 5
    else 0
  end;
$$;

grant execute on function public.gain(text) to anon, authenticated;

create or replace function public.economie()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'plafonds', (select jsonb_object_agg(q, public.plafond(q))
                   from unnest(array['tonte','promenade','maree','mot_pose','mot_recu']) q),
    'gains',    jsonb_build_object('maree',    public.gain('maree'),
                                   'mot_pose', public.gain('mot_pose'),
                                   'mot_recu', public.gain('mot_recu'))
  );
$$;

grant execute on function public.economie() to anon, authenticated;

-- ------------------------------------------------------------
-- `maree` rejoint les corvées que le client a le droit de réclamer.
--
-- Ce que ça ne fait pas, et il ne faut pas prétendre le contraire : le
-- serveur ne voit pas l'île, donc « j'ai ramassé un coquillage » n'est pas
-- plus vérifiable que « j'ai tondu une touffe ». Ce qui borne la triche,
-- c'est le plafond du jour, pas la preuve du geste. `mot_pose` et
-- `mot_recu` restent dehors : eux se gagnent par le trigger, sur une ligne
-- signée dans `mots`, et c'est ce qui les rend vérifiables.
-- ------------------------------------------------------------
create or replace function public.bourse_gagner(quoi text, n integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'connecte-toi'; end if;
  if quoi is null or quoi not in ('tonte','promenade','maree') then
    raise exception 'ce gain-là ne se demande pas : %', quoi;
  end if;
  if coalesce(n,0) < 1 or n > 8 then
    raise exception 'gain hors bornes';
  end if;
  return to_jsonb(public.bourse_crediter(auth.uid(), quoi, n));
end $$;

revoke all on function public.bourse_gagner(text, integer) from public;
grant execute on function public.bourse_gagner(text, integer) to authenticated;
