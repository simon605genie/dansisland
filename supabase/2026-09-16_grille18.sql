-- ============================================================
--  Migration du 16/09/2026 : la grille passe de 12x12 à 18x18.
--  NE PAS REJOUER. Chaque exécution décale les mots de trois cases
--  supplémentaires. À lancer une seule fois, après schema.sql.
--  Projet dansisland (cgputbitzfgokpwbbind), jamais celui de mamash.
-- ============================================================

-- L'ancienne grille est reposée au centre de la nouvelle : trois cases
-- vers la droite, trois vers le bas. Le monde des îles (jsonb) est
-- recentré côté client au chargement ; seuls les mots vivent en colonnes
-- et doivent être déplacés ici.
update public.mots set case_x = case_x + 3, case_y = case_y + 3;

-- Contrôle : plus rien ne doit dépasser la nouvelle grille.
select count(*) as mots_hors_grille
from public.mots
where case_x not between 0 and 17 or case_y not between 0 and 17;
