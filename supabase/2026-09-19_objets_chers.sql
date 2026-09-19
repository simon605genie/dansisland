-- ============================================================
-- Trois objets chers, et qui font quelque chose — 19/09/2026
--
-- **Rejouable** : un seul `insert ... on conflict do update`. Le rejouer
-- remet les trois prix à ceux d'ici, et rien d'autre.
--
-- À jouer dans l'éditeur SQL du projet **dansisland**
-- (cgputbitzfgokpwbbind), jamais dans celui de mamash. Vérifier l'en-tête
-- avant de lancer : le 15/09/2026, le schéma est parti sur le mauvais
-- projet et y a écrasé un trigger.
--
--   https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new
--
-- ------------------------------------------------------------
-- Pourquoi une migration pour trois lignes
--
-- Les prix vivent dans `catalogue` et pas en JavaScript :
-- `bourse_acheter()` lit cette table, et **un article absent en est refusé
-- à l'achat quoi qu'en dise la vitrine**. Ce que porte `index.html` n'est
-- qu'un affichage de secours. Tant que ce fichier n'est pas joué, les
-- trois objets s'affichent dans la Boutique et l'achat répond que
-- l'article n'existe pas. Rien ne se perd, mais rien ne s'achète.
--
-- ------------------------------------------------------------
-- Ce qu'ils font, et ce qu'ils ne font pas
--
--   girouette      42   dit où en est la marée et dans combien de temps
--                       elle change. Le panneau Île le disait déjà ; la
--                       girouette le dit là où on marche, chez soi comme
--                       chez un voisin.
--   carillon       50   sonne tout seul, de loin en loin, dans la gamme
--                       de l'heure de l'île. Il appartient à l'île, donc
--                       **les visiteurs l'entendent**.
--   boitelettres   55   lève son drapeau quand on t'a laissé un mot, et
--                       le relever lit ce qu'on t'a écrit.
--
-- **Aucun des trois ne rapporte un shell, et aucun ne touche à un
-- plafond.** C'est la règle du 16/09 et elle ne se négocie pas : faire
-- monter un plafond de gain avec un achat revient à vendre de la monnaie.
-- Ils ne sont pas non plus des corvées de plus — le revenu solitaire
-- reste à 19 shells par jour, le revenu « quelqu'un est passé » à 65.
--
-- Ils ne demandent **rien d'autre** au serveur : pas de table, pas de
-- fonction, pas une clé de plus dans le jsonb `monde`. Un objet posé est
-- un objet posé, et ce qu'ils lisent — la marée, les mots reçus — existe
-- déjà et se calcule ailleurs.
--
-- Ne pas les mettre sur les îles bot : on en ramènerait un souvenir
-- gratuitement, et la Boutique ne servirait plus à rien.
-- ============================================================

insert into public.catalogue (k, rayon, prix) values
  ('girouette',   'ile', 42),
  ('carillon',    'ile', 50),
  ('boitelettres','ile', 55)
on conflict (k) do update set rayon = excluded.rayon, prix = excluded.prix;

-- ------------------------------------------------------------
-- Vérification. Attendu : trois lignes, aux prix ci-dessus.
-- ------------------------------------------------------------
select k, rayon, prix
  from public.catalogue
 where k in ('girouette','carillon','boitelettres')
 order by prix;
