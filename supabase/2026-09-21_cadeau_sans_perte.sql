-- ============================================================
--  Le cadeau du jour ne se perd plus
--  21/09/2026 · REJOUABLE (create or replace)
--
--  À jouer dans l'éditeur SQL du projet **dansisland**
--  (cgputbitzfgokpwbbind), jamais celui de mamash.
--  https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new
-- ------------------------------------------------------------
--
--  UNE LIGNE CHANGE, et c'est celle-ci :
--
--      b.serie := case when b.cadeau = j - 1 then b.serie + 1 else 1 end;
--      b.serie := b.serie + 1;
--
--  POURQUOI
--
--  C'était le seul endroit du jeu où l'on perdait quelque chose. Rater un
--  jour renvoyait la série à 1, donc le cadeau retombait de 10 shells à 4
--  et le septième jour — celui qui offre un objet — reculait d'une
--  semaine entière.
--
--  Tout le reste du jeu tient la règle inverse, et elle est écrite partout
--  dans CLAUDE.md : le chien qui s'assied n'échoue pas, la mer qui remonte
--  repose le bonhomme à terre au lieu de le noyer, le potager ne meurt
--  jamais, on ne reprend pas ce qui a été posé. « Ce jeu n'a pas besoin
--  qu'on y perde quelque chose, il a besoin qu'il s'y passe des choses. »
--
--  Et c'est la promesse que le compte Instagram s'apprête à publier
--  trente et une fois : « un jeu où personne ne perd ». Une série qui
--  punit l'enfant parti en vacances aurait fait mentir la première carte.
--
--  CE QUE ÇA NE CHANGE PAS
--
--  Le joueur régulier n'y perd rien : il atteint 10 shells et son objet
--  du septième exactement aussi vite qu'avant. Ce qui change, c'est que
--  l'irrégulier n'est plus renvoyé à zéro — il avance plus lentement dans
--  le calendrier, ce qui est la conséquence de son rythme et non une
--  punition. C'est le potager, transposé : six jours de pousse, et rien
--  ne meurt si on ne revient pas.
--
--  Le plafond reste `3 + least(serie, 7)`, donc **10 shells au maximum** :
--  personne ne gagne plus qu'avant, le plancher monte. Ne pas en profiter
--  pour relever ce nombre — faire monter un gain qui tombe tout seul est
--  exactement ce que ce dépôt refuse depuis le 16/09.
--
--  LE NOM DE LA COLONNE NE CHANGE PAS, et c'est délibéré : la renommer
--  demanderait de toucher le client, le repli hors ligne et la reprise du
--  jsonb pour un gain nul. Mais « serie » ne veut plus dire « jours
--  d'affilée », donc la colonne porte maintenant un commentaire qui le
--  dit — c'est le piège déjà nommé pour `pieces` contre `shells`, où
--  l'homonyme avait coûté une relecture.
-- ============================================================

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

  -- Le compte des cadeaux ouverts, jamais des jours d'affilée. Il ne
  -- redescend pas : sauter une semaine ne coûte rien, ça prend juste
  -- plus longtemps d'arriver au septième.
  b.serie := b.serie + 1;

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

comment on column public.bourses.serie is
  'Nombre de cadeaux du jour OUVERTS, pas des jours d''affilée : depuis le '
  '21/09/2026 il ne redescend jamais. Le nom est resté pour ne pas toucher '
  'au client et au repli hors ligne.';

-- Ce que ça donne pour ceux qui jouaient déjà : personne ne recule.
-- La colonne garde sa valeur, donc un joueur à 5 continue à 6.
select count(*) filter (where serie > 0) as joueurs_avec_serie,
       max(serie)                        as plus_longue
  from public.bourses;
