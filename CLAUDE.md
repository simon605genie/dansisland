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

## L'intérieur de la maison, ajouté le 16/09/2026

Trois pièces, réservées au propriétaire, entièrement dans `monde.interieur` :
**aucune migration SQL**. Deux pièges à ne jamais rouvrir :

1. `mondeNu()` liste les clés qui partent en base. Une clé absente de cette
   liste est effacée à la sauvegarde suivante, sans erreur et sans trace.
2. `memoriser()` sérialise ce que Ctrl+Z sait rendre. Ce qui n'y est pas
   n'est pas annulable.

La taille des pièces et la place des portes sont du code (`PIECES`), jamais
de la donnée. Seule la décoration est en base. Élargir une pièce ne demande
donc aucune migration, mais `normaliserInterieur()` écarte les meubles qui
se retrouveraient dehors : c'est voulu, pas un bug.

La porte fermée est une règle de jeu, pas un secret : `interieur` est dans
le jsonb public. Ne rien y mettre de sensible.

On entre en marchant sur le seuil. `sasArme` est ce qui empêche la boucle
(ressortir sur le seuil, rentrer aussitôt) : il ne redevient vrai qu'une
fois la case de la porte quittée. Ne pas le retirer en croyant simplifier.

## La visée de l'île, corrigée le 16/09/2026

`vue.probe` vaut `LIFT`, plus `LIFT-TH/2`. L'ancienne valeur sondait un
demi-losange trop haut et renvoyait la case en haut à gauche de celle
qu'on visait : 43 % de clics justes, mesurés. Si un jour le rendu d'une
case change de hauteur, c'est `probe` qu'il faut suivre, pas `tileFrom()`.

## La bourse et la boutique, ajoutées le 16/09/2026

La monnaie s'appelle le **shell**, jamais « pièce » : `interieur.pieces`, ce
sont les salles de la maison, et l'homonyme a déjà coûté une relecture. La
clé en base est `bourse.shells` ; `shellsDe()` relit l'ancien nom `pieces`
d'une bourse écrite avant le 16/09 au soir.

Rien ne s'achète avec autre chose que des shells. Il n'y a pas de paiement
réel dans ce jeu et il n'y en aura pas : ne jamais brancher quoi que ce soit
qui y ressemble.

**`bourse` et `achats` ne sont plus dans `monde`.** Ils sont sortis de
`mondeNu()` le 16/09 au soir : voir la section « la bourse côté serveur »
plus bas. Les y remettre serait rendre la caisse au navigateur.

**`jour` et `pousse` sont deux marqueurs, pas un.** `jour` remet les plafonds
de gain à zéro, `pousse` autorise une repousse des herbes. Les fondre en un
seul, et une île ouverte aujourd'hui n'aurait sa première touffe que demain.
Les deux sont tenus par le serveur, dans deux fonctions différentes.

**La valeur de tuile `4` est les hautes herbes.** `encode()` colle les cases
bout à bout et `decode()` les relit chiffre par chiffre : une valeur de tuile
à deux chiffres casserait tous les codes de sauvegarde. Onze valeurs au
maximum, donc, et pas une de plus.

Corollaire tenu : `tondre()` ne passe pas par `memoriser()`, donc `Ctrl+Z`
peut faire repousser une touffe déjà tondue. Ce n'est pas un oubli : c'est le
plafond du jour (`PLAFOND.tonte`) qui borne la corvée, jamais la tuile.

Un objet acheté se débloque **une fois, pour toujours** : on ne paie pas à
chaque pose. Un enfant qui efface une fontaine pour la remettre deux cases
plus loin aurait perdu son argent, et il pleure.

**L'achat se fait en deux temps**, et ce n'est pas une politesse. La version
d'avant achetait au clic et disait le refus dans le murmure, en bas du
cadre : sur téléphone, c'est trois écrans au-dessus du doigt, donc « je clique
et rien ne se passe ». Choisir un article ouvre un **comptoir** sous la
vitrine, qui porte le prix, ce qui manque, et le seul bouton qui débite. Ne
jamais revenir à l'achat au clic, quelle que soit la confirmation ajoutée.

**Un objet qui devient payant doit être offert à qui en a déjà un.**
`normaliserEconomie()` parcourt `objects` et les meubles et crédite `achats`
pour tout type verrouillé déjà posé : sans ça le phare posé hier reste sur
l'île mais son pinceau disparaît de l'atelier. Les souvenirs (`o.de`) sont
exclus, sinon une visite chez un ami débloquerait la boutique.

**Le cadeau du jour** vit dans la même bourse : `cadeau` (dernier jour
ouvert) et `serie` (jours d'affilée). Il ne tombe pas tout seul dans la
bourse, on l'ouvre : sans le geste, il n'y a pas de moment. Le septième jour
d'affilée donne un objet plutôt que des shells.

Le rayon `ou:'toi'` du catalogue (`EQUIPEMENT`) vend des capacités, pas des
objets : rien dans `objects`, rien dans les meubles, `achats` suffit. Les
bottes multiplient la vitesse de marche, le moteur élargit la coupe aux
quatre cases voisines sans toucher au plafond du jour. Ne jamais faire monter
un plafond de gain avec un achat : ça revient à vendre de la monnaie.

La tondeuse n'est **pas** un objet de l'île : rien en base, rien à poser,
rien à acheter. C'est un dessin que le moteur sort quand une touffe est sous
les pieds ou à côté.

Ne pas mettre d'objet de la boutique sur les îles bot : on en ramène un
souvenir gratuitement, et la boutique ne sert plus à rien.

## Sortir le chien, ajouté le 16/09/2026

Le chien posé se décroche de sa case et marche seul. **Rien n'en part en
base** : pas de clé de plus dans `mondeNu()`, l'objet garde sa case pendant
toute la balade, c'est le dessin qui bouge. Seul `bourse.faits.promenade`
change, plafonné à son propre gain (`PLAFOND.promenade === GAIN_BALADE`) :
c'est ce qui dit « une fois par jour » en une ligne.

`balade.o` est une **référence d'identité** dans `mine.objects`. Tout ce qui
refait cette liste — `annuler()`, un chargement, la gomme — casse la
référence, et `avancerLaBalade()` en profite pour finir la balade sans rien
dire. C'est voulu : c'est le seul garde-fou nécessaire, ne pas le remplacer
par une recherche par coordonnées.

**Le chien attend, il n'échoue jamais.** Trop loin, il s'assied et le tour
n'avance plus. Pas de minuteur, pas de perte, rien qui gronde. Ne pas
ajouter d'échec en croyant ajouter de l'enjeu : l'enjeu, c'est qu'on ne
peut pas faire la corvée en regardant ailleurs.

Le seuil de la maison est **désarmé pendant une balade** (`sasArme=false`) :
passer devant chez soi en promenant le chien ne doit pas remettre le tour à
zéro. `E` rentre quand même.

La bulle « il t'attend » porte le verrou `baladeloin`, que `proximity()` ne
connaît pas et n'efface donc jamais. C'est `taireLattente()` qui s'en
charge, appelé partout où la balade finit. Un verrou de bulle qui survit à
son état, c'est un message qui reste à l'écran pour toujours.

Le bouton rose du cadre n'est plus « la porte » : c'est `rose-btn`,
`boutonRose()` et `agir()`, et il dit ce qui est sous la main — un souvenir,
le chien, une porte. L'ordre dans `agir()` compte, et il est le même que
dans `proximity()` : les deux doivent rester d'accord, sinon le bouton
annonce un geste et la touche en fait un autre.

## La bourse côté serveur, et les visites payantes — 16/09/2026

`supabase/2026-09-16_bourse_serveur.sql`, **rejouable** (la reprise depuis
le jsonb ne trouve plus rien à reprendre une fois qu'elle a tourné).
Contrairement à `2026-09-16_grille18.sql`, celle-ci se rejoue sans casse.

La bourse a quitté `monde` pour la table `bourses`, une ligne par **joueur**
(pas par île : c'est la personne qui visite, et c'est elle qu'on crédite).

Les règles à ne pas défaire :

1. **`bourses` n'a aucune policy d'écriture.** Pas une policy restrictive :
   pas de policy du tout. RLS refuse par défaut, et ce vide *est* la
   protection. Ne pas « réparer » en ajoutant une policy `update`.
2. **`bourse_crediter(joueur, quoi, n)` n'est jamais exposée.** Elle prend
   un joueur en paramètre parce que les visites créditent l'hôte ; exposée,
   elle laisserait n'importe qui créditer n'importe qui. Elle est révoquée
   de `public`, `anon` et `authenticated`, et c'est la ligne la plus
   importante du fichier.
3. **Le client ne demande jamais `mot_pose` ni `mot_recu`.**
   `bourse_gagner()` les refuse par son nom. Les visites se créditent par le
   trigger `mots_credite`, sur l'insert dans `mots` : le bénéficiaire n'est
   pas l'appelant, et c'est ce qui les rend vérifiables.
4. **Les prix et les plafonds sont en SQL** (`catalogue`, `plafond()`). Ce
   que porte `index.html` n'est qu'un affichage de secours, recopié depuis
   la base au chargement par `chargerCatalogue()`. Même piège que
   `slug_libre()` face aux contraintes : deux listes qui divergent, et la
   vitrine annonce un prix que l'achat refuse.
5. **Le temps est celui du serveur** (`jour_du_jeu()`, heure de Bruxelles,
   pas UTC). Le client n'a plus le droit de décider quel jour on est :
   `jourDuJeu()` renvoie le jour connu du serveur, pas `aujourdhui()`.

Ce que ça ne fait pas, et il ne faut pas prétendre le contraire : **le
serveur ne voit pas l'île.** « J'ai tondu une touffe » n'est pas
vérifiable. Ce qui borne la triche sur les corvées, c'est le plafond du
jour, pas la preuve du geste. Inutile d'empiler des contrôles côté client
pour ça.

Côté `index.html`, `mine.bourse` et `mine.achats` ne sont plus qu'un
**miroir** : on l'avance tout de suite pour que le « +1 shell » tombe avec
le geste, et la réponse du serveur l'écrase. Jamais l'inverse.
`appliquerBourse()` est le seul endroit qui écrit ce miroir depuis la base.

Sans compte, hors ligne, ou avant que la migration ne soit passée, la bourse
tient seule dans `localStorage` sous `dansisland:bourse`. C'est ce qui garde
l'île de démonstration jouable ; ce n'est pas une porte de sortie pour qui
voudrait s'écrire des shells, puisque rien n'en remonte.

## Le graphisme et l'ergonomie — passage du 16/09/2026 au soir

Quatre pièges qui ne doivent pas se rouvrir.

1. **`--card` et `--navy` sont la même couleur en thème sombre.** Tout ce
   qui peignait le « choisi » en `--navy` devenait donc invisible : chips,
   pinceau actif, pastille de couleur. Le jeton à utiliser est **`--sel` /
   `--on-sel`**, jamais `--navy`. Vérifier tout nouvel état sélectionné
   dans les deux thèmes, pas seulement dans celui qu'on a sous les yeux.
2. **Les objets sont dessinés pour le papier clair du jeu.** Une vignette
   d'objet posée sur un fond de carte sombre ne se devine plus. `.obj
   canvas` et `.neighbor canvas` portent donc leur propre fond `#FDFBF0`,
   toujours le même. Tout nouveau dessin d'objet sorti du canvas principal
   doit faire pareil.
3. **`buildAll()` garde la position de défilement du panneau ouvert.**
   Chaque panneau se reconstruit entier (`innerHTML=''`) : sans ça,
   l'atelier remontait en haut à chaque clic et il fallait redescendre
   jusqu'au rayon Village après chaque objet posé.
4. **Un pinceau armé au mauvais endroit doit le dire.** Un meuble choisi
   pendant qu'on est dehors, un pinceau d'île pendant qu'on est dedans :
   le clic ne faisait rien et rien ne l'expliquait. C'est le même défaut
   que la boutique d'avant — le refus doit tomber là où est le doigt.

En portrait étroit, le nom de l'île quitte le bandeau et le bouton Son perd
son mot (`.plate .mot`) : à trois plaques, le bouton passait à la ligne et
se posait sur le ciel. Ne pas rajouter de plaque sans vérifier à 360 px.

**Ce qui reste petit, et qui n'est pas réparable en CSS :** en portrait, le
cadre fait 768x500 et la largeur de l'écran le borne, donc l'île tient dans
230 px de haut. L'agrandir demanderait une caméra qui suit le bonhomme et
un zoom, c'est-à-dire de toucher `iso()` / `unIso()` et `vue`. À faire un
jour, pas à l'improviste.

## Reste du contexte

Voir README.md : modèle de données, file d'attente de sauvegarde, mise en route.
