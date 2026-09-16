# DAN'S ISLAND

Jeu web : chacun fabrique son île, la publie à son adresse, visite celle des autres.

## Le projet Supabase — un seul, et ce n'est pas celui de mamash

    dansisland   cgputbitzfgokpwbbind   ← LE SEUL à utiliser ici
    mamash       gtorhfrnjpphujvootuo   ← NE JAMAIS y exécuter le SQL de ce dossier

Éditeur SQL du bon projet :
https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new

Avant d'exécuter quoi que ce soit dans le dashboard, vérifier que l'en-tête
affiche « dansisland » et non « mamash's project ». Le 15/09/2026, le schéma a
été appliqué par erreur sur mamash et a écrasé son trigger `on_auth_user_created`
(restauré depuis `~/Desktop/mamash/supabase/auth_roles.sql`).

Conséquence tenue depuis : aucun objet de ce projet ne porte un nom générique
d'écosystème Supabase. Le trigger d'inscription s'appelle
`dansisland_profil_a_la_creation`, jamais `on_auth_user_created`.

## Clés

`src/config.js` porte une clé **publishable** (`sb_publishable_…`), publique par
construction — c'est la RLS qui protège. Ne jamais y mettre `sb_secret_` ni
`service_role`. `store.js` charge `@supabase/supabase-js@2` : les versions
antérieures à 2.49 ne gèrent pas les clés publishable.

## La migration SQL du 16/09/2026

`supabase/2026-09-16_grille18.sql` décale les mots de trois cases, pour
accompagner le passage de la grille de 12x12 à 18x18. **Elle n'est pas
idempotente** : la rejouer décale de trois cases de plus. `schema.sql`,
lui, reste réexécutable sans casse.

## Reste du contexte

Voir README.md : modèle de données, file d'attente de sauvegarde, mise en route.
