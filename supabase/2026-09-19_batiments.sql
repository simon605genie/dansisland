-- ============================================================
--  Six bâtiments pour le village — 19/09/2026
--
--  **Rejouable** : un seul `insert ... on conflict do update`. Le rejouer
--  remet les six prix à ceux d'ici, et rien d'autre.
--
--  À jouer dans l'éditeur SQL du projet **dansisland**
--  (cgputbitzfgokpwbbind), jamais dans celui de mamash. Vérifier l'en-tête
--  avant de lancer : le 15/09/2026, le schéma est parti sur le mauvais
--  projet et y a écrasé un trigger.
--
--    https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new
--
-- ------------------------------------------------------------
--  Pourquoi une migration pour six lignes
--
--  Les prix vivent dans `catalogue` et pas en JavaScript :
--  `bourse_acheter()` lit cette table, et **un article absent en est refusé
--  à l'achat quoi qu'en dise la vitrine**. Ce que porte `index.html` n'est
--  qu'un affichage de secours. Tant que ce fichier n'est pas joué, les six
--  bâtiments s'affichent dans la Boutique et l'achat répond que l'article
--  n'existe pas. Rien ne se perd, mais rien ne s'achète.
--
-- ------------------------------------------------------------
--  Ce qu'ils sont, et ce qu'ils ne sont pas
--
--    ferme          34   une grange, une grande porte, une botte de paille
--    ecole          36   trois fenêtres en rang, une cloche sous le pignon
--    coiffeur       44   une vitrine et l'enseigne à spirale
--    supermarche    48   une vitrine, un auvent, un caddie sur l'enseigne
--    restaurant     52   une fenêtre allumée, deux couverts pour enseigne
--    culte          58   un clocher plus haut que tout le reste
--
--  **Ils décorent, et c'est tout.** Aucun ne rapporte un shell, aucun ne
--  touche à un plafond, aucun ne fait quoi que ce soit — donc aucun n'entre
--  dans `FONCTIONNEL`, et un souvenir rapporté de chez un ami en vaut un
--  vrai. C'est la règle du 16/09 : faire monter un gain avec un achat
--  revient à vendre de la monnaie ; et celle du 19/09 : ce qui *fait*
--  quelque chose ne doit pas se ramener gratuitement d'une visite.
--
--  Ils ne demandent **rien d'autre** au serveur : pas de table, pas de
--  fonction, pas une clé de plus dans le jsonb `monde`. Un bâtiment posé
--  est un objet posé, comme l'échoppe et le phare — une seule case, la
--  maison restant le seul objet 2x2 du jeu parce qu'on y entre.
--
--  Ne pas les mettre sur les îles bot : on en ramènerait un souvenir
--  gratuitement, et la Boutique ne servirait plus à rien.
-- ============================================================

insert into public.catalogue (k, rayon, prix) values
  ('ferme',       'ile', 34),
  ('ecole',       'ile', 36),
  ('coiffeur',    'ile', 44),
  ('supermarche', 'ile', 48),
  ('restaurant',  'ile', 52),
  ('culte',       'ile', 58)
on conflict (k) do update set rayon = excluded.rayon, prix = excluded.prix;

-- ------------------------------------------------------------
--  Vérification. Attendu : six lignes, aux prix ci-dessus.
-- ------------------------------------------------------------
select k, rayon, prix
  from public.catalogue
 where k in ('ferme','ecole','coiffeur','supermarche','restaurant','culte')
 order by prix;
