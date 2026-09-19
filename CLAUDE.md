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

   **Et ce vide ne se vérifie pas depuis l'éditeur SQL du dashboard**, qui
   tourne en rôle `postgres` et **contourne la RLS** : un insert lancé tel
   quel y passe la policy sans la voir, et ce qu'on lit ensuite est une
   autre erreur — le 19/09, un `23503` de clé étrangère, pris un instant
   pour une preuve alors qu'il n'en était pas une. Il faut prendre le rôle
   du client :

       begin;
       set local role anon;
       insert into public.parrainages (filleul, parrain, code)
       values (gen_random_uuid(), gen_random_uuid(), 'x');
       rollback;

   Rendu attendu : `42501`. Le `rollback` couvre le cas où l'insert
   passerait. Vaut pour les quatre tables sans policy d'écriture —
   `bourses`, `livraisons`, `visites`, `parrainages`.
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

Ce qui restait petit en portrait est traité : voir la section suivante.

## La caméra et le zoom — 17/09/2026

C'est la réponse au « ce qui reste petit » d'hier : en portrait, le cadre
fait 768x500 et la largeur de l'écran le borne, donc une case mesurait
26 px au doigt. La caméra suit le bonhomme et grossit jusqu'à ce qu'une
case fasse `CASE_MIN` pixels réels.

**`iso()`, `unIso()` et `vue` n'ont pas changé.** La caméra n'est pas une
seconde projection : c'est une transformation posée sur le contexte juste
avant de peindre (`camPoser()` / `camLever()`). Tout ce qui dessine
continue de travailler dans le repère d'avant et n'a rien à savoir du
zoom. C'est la seule raison pour laquelle deux mille lignes de dessin
n'ont pas eu à être relues, et c'est ce qu'il ne faut pas défaire.

Cinq règles qui tiennent ensemble :

1. **`pt()` est le seul endroit qui défait la transformation.** Il défait
   exactement ce que pose `camPoser()`. Une entrée qui lirait les
   coordonnées écran autrement viserait à côté dès qu'on zoome.
2. **Un `fillRect(0,0,CW,CH)` ne couvre plus le cadre sous la caméra.**
   `camRect()` rend le rectangle du monde qu'on voit ; c'est par lui que
   passent les deux voiles de nuit, dehors et dedans.
3. **Le ciel se peint hors caméra, la mer dedans.** `ocean()` a été coupé
   en `ciel()` et `mer()` : le fond ne glisse pas quand la caméra suit, la
   mer appartient au monde. Depuis la marée, le ciel est en **deux**
   morceaux : `ciel()` (papier, soleil ou lune, étoiles) passe avant la
   mer, `cielDevant()` (nuages, mouettes) passe après. La mer agrandie
   remplit presque le cadre et aurait avalé tout ce qui traverse. Les deux
   restent en repère écran ; un nouveau décor de fond va dans l'un des
   deux, jamais dans `mer()`.
4. **`ZMIN` a valu 1 jusqu'au 17/09 au soir**, et c'était la garantie que
   le zoom n'avait rien enlevé à personne. La marée a changé ça : voir la
   section suivante. Il vaut 0,78, et c'est `zPlancher()` qu'on lit — pas
   `ZMIN` — parce que **dedans, le plancher reste 1**.
5. **`boiteIle()` borne le cadrage sur la tache de mer de `seaPath()`.**
   Les rayons ne sont plus écrits deux fois : `boiteIle()` lit `MER_RX`,
   `MER_RY` et `merCentre()`. La consigne « si l'une change, l'autre doit
   suivre » était une consigne de trop, et la marée l'a fait changer.

Le zoom se déduit de `echelleEcran`, la largeur réelle du cadre divisée
par `CW` — jamais de la taille du canvas, qui ne bouge pas. Elle se mesure
à la rotation et sur `ResizeObserver`, pas à chaque image : un
`getBoundingClientRect()` par frame fait recalculer la mise en page
soixante fois par seconde.

Dedans, **la caméra ne suit personne** : la pièce est petite, elle est
centrée, et `fitDedans()` plafonne le zoom pour que les murs restent dans
le cadre. Suivre le bonhomme dans huit cases sur six ne ferait que secouer
l'image.

`#world` porte **`touch-action:pan-y`** et non plus `manipulation` : la
page continue de défiler d'un doigt, mais le navigateur ne confisque plus
le pincement pour zoomer le site, et les deux pointeurs arrivent au jeu.
Y revenir, c'est perdre le pincement sans prévenir.

Les deux boutons ronds du bord droit ne sont pas un doublon du pincement :
ce sont les seuls qui marchent à coup sûr partout, et un zoom qui ne se
découvre qu'en pinçant n'existe pas pour l'enfant qui ne pince pas. Ils
sont au milieu du bord droit parce que c'est le seul endroit libre du
cadre : le pad tient le coin bas-gauche, le murmure la bande du bas, les
plaques celle du haut.

**Éprouvé, pas supposé :** la visée a été remesurée comme le 16/09, neuf
points par losange sur toute la grille, à zoom 1, 1,8 et 2,6, dehors et
dedans — environ six mille clics, **zéro faux**. Et sur les 221 cases que
le rayon maximal peut rendre praticables, le bonhomme reste à au moins
68 px des bords latéraux du cadre.

## La page allégée autour du jeu, 17/09/2026

Deux choses ont quitté l'écran, pour la même raison : elles parlaient
par-dessus le jeu.

**Le murmure ne couvre plus le bas du cadre.** Il était une carte opaque
sur toute la largeur, et depuis que la caméra ramène le bonhomme au
centre, c'est exactement là qu'on marche. Il garde sa place, et ça n'est
pas négociable : un refus doit tomber là où est le doigt, c'est la leçon
de la boutique et elle vaut toujours. Ce qui a changé, c'est le poids :
plus de cadre, plus d'ombre, un fond à `.58`, un halo de texte à la
place de la bordure pour tenir la lisibilité sur un toit sombre, et
`2200 ms` au lieu de `3400`. Les messages verrouillés (`say(msg, lock)`)
ne passent pas par ce minuteur et restent tant que l'état dure : c'est
`proximity()` et `taireLattente()` qui les lèvent, pas l'horloge.

**La section de présentation sous le jeu est supprimée.** La palette
commentée, les notes de typo, les quatre couches, la feuille de route :
c'était la planche de vente d'un prototype, elle n'a plus rien à faire
sous une île jouable. Le CSS qui n'allait qu'avec (`.pitch`, `.eyebrow`,
`.lede`, `.layers`, `.layer`, `.ident`, `.identnote`, `.scrollx`,
`.tbl`, `.tag`) est parti avec. `.mono` reste : il sert aux codes d'île
et au message de mode démo.

**Le pied de page est parti avec la section, contrairement à ce que ce
fichier a longtemps dit ici.** Il portait « Flèches ou ZQSD pour marcher,
clic pour te déplacer ou pour poser. Tout est stocké dans ton navigateur »,
et cette dernière phrase était fausse depuis les comptes. Le commit
`1473433` a emporté les deux, et `index.html` n'a plus aucun `<footer>` :
vérifié. Comment marcher se dit maintenant dans le murmure au chargement,
en une phrase choisie selon `pointer:coarse`, et rien n'y parle du
stockage. Il n'y a donc plus de phrase fausse à l'écran, et plus d'endroit
où ajouter du texte sous le jeu : ce qui doit se dire se dit dans le
murmure ou dans un panneau.

## La sortie de la maison, 17/09/2026

Dedans, la plaque du nom de l'île devient **`← Ton île`**, rose et cliquable
(`#hud-name.retour`), et elle ressort. Avant, la seule porte était le
paillasson : il fallait le retrouver dans huit cases sur six, et on cliquait
le nom de l'île en espérant que ça marche. Ça marche, maintenant.

Trois choses à ne pas défaire :

1. **`#hud-name.retour` l'emporte volontairement sur le `display:none` du
   portrait.** Le nom de l'île part à 640 px parce qu'il n'apprend rien ;
   le retour, lui, est ce qui compte le plus dedans.
2. **Dedans, `hud-mode` ne dit plus que la pièce**, sans « Chez toi ». Ce
   n'est pas cosmétique : à quatre plaques et 360 px, le bouton Son passait
   à la ligne et se posait sur les boutons de zoom. C'est exactement
   l'avertissement déjà écrit plus haut, et il a été vérifié à 360 px après
   coup. On n'entre que chez soi, donc « Chez toi » n'y apprenait rien.
3. **Le bouton rose et la touche `E` n'ont pas changé** : ils restent les
   portes, et l'ordre de `agir()` reste celui de `proximity()`. La sortie
   est une plaque à part, et c'est ce qui permet de ne pas toucher à cet
   accord-là. `E` sur une case sans porte dit maintenant où est la plaque
   plutôt que « il n'y a pas de porte ici ».

## Ce qui bouge tout seul, 17/09/2026

Quatre choses, et pas une ne touche à l'état du jeu : rien en base, aucune
clé de plus dans `mondeNu()`, rien à mémoriser pour `Ctrl+Z`, aucun gain,
aucune perte possible. C'est du dessin. Un requin ne peut pas attraper le
bonhomme et il n'y aura pas de moyen de perdre son île : ce jeu n'a pas
besoin qu'on y perde quelque chose, il a besoin qu'il s'y passe des choses.

**La pastille du cadeau bat** (`cadeaubat` + `cadeauonde`, sur
`.tabs button.cadeau::after`). Une pastille immobile dans une barre
d'onglets se lit comme une décoration, et le cadeau restait fermé des
journées. Le `prefers-reduced-motion` global la fige.

**Le bonhomme respire et saute** (`vieDuBonhomme()`). Un personnage
parfaitement arrêté se lit comme une image figée. Le saut est **calculé à
partir du temps immobile, jamais accumulé** : une image sautée ne décale
rien. `drawChar()` a gagné un dernier paramètre `saut`, optionnel, et
l'ombre reste au sol en rétrécissant : c'est elle qui dit qu'il a décollé.
L'hôte, quand on visite son île, vit pareil.

**Les mouettes et les nuages traversent le ciel** (`MOUETTES`, `NUAGES`).
Tout se déduit de `t` : aucun état à tenir, rien à remettre à zéro en
entrant dans la maison ou en changeant d'île. Ils vivent dans `ciel()`,
donc en repère écran : ils ne glissent pas avec la caméra. Un nouveau décor
de fond va là, jamais dans `mer()`.

**Un requin passe, un poisson saute** (`avancerRequin()`, `avancerPoisson()`).
Trois pièges, et ils se tiennent :

1. **`kPlage()` n'est pas le calcul évident.** L'image d'un cercle de rayon
   r par `iso()` a pour demi-largeur `r*TW/racine(2)`, mais une case déborde
   encore de `TW/2` au-delà de son centre. Ce demi-losange oublié a fait
   nager le requin **sous la plage, invisible, pendant tout son passage**,
   et rien ne le signalait : ni erreur, ni trace, juste rien à l'écran.
2. **La bande d'eau était mince, et elle se refermait quand l'île
   grandissait.** Ça a été corrigé le 17/09 au soir avec la marée : la mer
   fait maintenant 438x240, et il reste 50 px d'eau au-delà de la terre
   même à `RAYON_MAX`. Le passage du requin sur les flancs **est et ouest**
   reste le bon choix, mais pour une autre raison : c'est là que la bande
   est la plus large, donc là qu'on le voit le mieux.
3. **`wMer()` est partagé avec `seaPath()`.** Nager « à 98 % du bord » n'a
   de sens que si c'est le même bord : deux contours qui divergent, et un
   aileron sort sur le papier une fois sur trois, là où la tache rentre.

Les deux sont dessinés **après `mer()` et avant `drawTiles()`** : quand leur
route croise l'île, ils passent dessous, et ça se lit comme « derrière ».

Leur minuterie est en `dt` accumulé, pas en `t` : un onglet en arrière-plan
met `requestAnimationFrame` en pause, donc le requin attend au lieu de
traverser sans témoin. C'est aussi ce qui rend ces deux-là pénibles à
éprouver dans un navigateur piloté, où le `rAF` est bridé : pour les
regarder, il faut baisser le délai d'apparition, pas attendre.

## Le mode paysage et l'app, 17/09/2026

En paysage court sur téléphone, le jeu prend tout l'écran : la page
disparaît, l'île tient toute la hauteur à gauche, la carte de connexion se
pose en haut à droite et l'atelier remplit la colonne sous elle. Rien ne
défile. Détail dans README.md.

Trois choses à ne pas rouvrir :

1. **Le bloc paysage est en fin de feuille de style, pas avec les autres
   media queries en haut.** Une media query n'a pas plus de poids qu'une
   règle ordinaire : c'est l'ordre qui tranche. Placé en haut, il était
   écrasé par les `.tabs`, `.panel`, `.viewport` et `.atelier` déclarés
   plus bas, sans erreur et sans trace, et seul le rendu le disait. Toute
   nouvelle règle de ce mode va là.
2. **`display:contents` sur `.stage` est ce qui sauve la connexion.** Le
   cadre et l'atelier deviennent des cases de la grille de `.wrap`, donc
   `#compte` peut se glisser entre les deux. Sans ça il fallait cacher la
   carte de connexion, et on ne pouvait plus se connecter en paysage.
3. **La largeur du cadre se calcule depuis la hauteur, jamais l'inverse**
   (`width:min(calc(100svh * 1.536), calc(100vw - 236px))`). Le canvas doit
   garder le rapport de son contenu : lui donner une largeur et une hauteur
   toutes deux contraintes, ou un `object-fit`, déforme la boîte et `pt()`
   vise à côté. Ce sont les six mille clics du 17/09 qui repartent.

**Le manifest a des chemins absolus.** Une page d'île est servie à `/simon`
par le catch-all de `_redirects` : un chemin relatif s'y casse le jour où
quelqu'un écrit `/simon/`. `start_url` vaut `/`, jamais l'île d'où on a
installé.

**Il n'y a pas de service worker, et c'est un choix.** Chrome n'en exige
plus pour proposer l'installation, iOS n'en a jamais eu besoin, et un
service worker sert la version d'hier à qui vient de recevoir le lien de la
nouvelle. Le jour où il en faudra un, il faudra d'abord une version
affichée dans l'app et une invite à recharger. En attendant, ne pas en
ajouter un « juste pour le cache » : un service worker est collant, et
c'est la façon classique de briquer un site.

**Les icônes se régénèrent, elles ne se dessinent pas à la main.** Elles
sont le SVG du logo de `index.html` relu en repère 64 et rasterisé. Si le
logo change, elles changent avec lui, et `build.sh` doit les copier toutes :
une icône manquante fait échouer l'installation en silence.

## La marée, et la place qu'il a fallu lui faire — 17/09/2026 au soir

`supabase/2026-09-17_maree.sql`, **rejouable** : il n'y a que des
`create or replace`. Il ajoute `maree()`, met `maree` dans `plafond()`,
`gain()`, `economie()` et dans la liste blanche de `bourse_gagner()`.

Deux fois par jour la mer se retire et l'anneau de cases juste au-delà du
bord de l'île devient du sable mouillé praticable, où elle laisse trois
choses à ramasser. À marée haute c'est de l'eau.

### Ce que la mesure a dit, et qui a changé le plan

Le plan de départ était « agrandir la tache de mer, et remonter `OY` ».
La mesure a dit autre chose, et elle est dans `geo.js` de la session :

- il ne restait que **10 px** d'eau au point le plus serré sur une île
  neuve, pas 47 : les 47 px oublient le gonflement de `wMer()` ;
- au rayon maximal, l'île **sortait déjà** de sa propre mer de 38 px ;
- pour tenir l'anneau de marée du rayon maximal avec 20 px d'eau autour,
  il faut `MER_RX ≈ 438`, donc une tache de 944 px de large dans un cadre
  de 768. **La contrainte qui bloque est horizontale, pas verticale**, et
  `OY` n'y peut rien.

Les deux sorties de secours ont été mesurées et écartées : baisser
`RAYON_MAX` demanderait de descendre à ~6,5, sous `RAYON0` ; et une mer
qui suivrait le rayon de l'île déborde du cadre dès le rayon 7,0.

### Ce qui a été fait à la place

**Le zoom de base recule : `ZMIN` passe de 1 à 0,78.** Le cadre montre
985x641 de monde au lieu de 768x500. Aucun CSS n'est touché, donc le mode
paysage et le portrait ne bougent pas — et c'est le point : le rapport
1,536 n'est pas un chiffre au hasard, c'est exactement
`(100vw - 236px) / 100vh` sur un téléphone en paysage, et c'est ce qui
fait que le cadre y remplit pile la hauteur. Agrandir le canvas l'aurait
cassé.

Sur un écran large, une case passe de 56 à 44 px réels, soit exactement le
`CASE_MIN` déjà retenu comme confortable au doigt. Sur téléphone **rien ne
change** : `zoomAuto()` y est déjà entre 1,7 et 2,1, et `ZMIN` ne mord pas.

Trois conséquences à tenir :

1. **`zPlancher()`, pas `ZMIN`.** Dedans, le plancher reste 1 : la pièce
   n'a pas grandi, et à 0,78 elle serait un timbre-poste au milieu d'un
   cadre vide. `fitDedans()` plafonne toujours à partir de 1.
2. **`MER_RX`/`MER_RY` valent 438x240**, et les coefficients de `wMer()`
   ont été réduits d'autant (x0,7). Le gonflement est multiplicatif : sans
   ça, une mer plus grande aurait ondulé plus fort. Le contour garde les
   mêmes ±34 px qu'avant.
3. **`OY` passe de 84 à 12**, pour que le centre de l'île tombe au milieu
   du cadre. La mer y tient avec 16 px de papier sur les côtés et 60 en
   haut et en bas — mesuré sur les pixels du canvas, pas déduit.

Et `ciel()` a été coupé en deux. `cielDevant()` (nuages, mouettes) passe
**après** la mer : le fond d'avant les aurait tous avalés, puisque la mer
remplit maintenant presque le cadre. Ils restent en repère écran et passent
sous l'île, comme le requin et le poisson.

### Les règles de la marée

1. **La phase vient du serveur** (`maree()`), comme `jour_du_jeu()`. Entre
   deux appels le client avance la phase avec `performance.now()` et
   **jamais** `Date.now()` : avancer sa montre ne doit pas faire descendre
   la mer. Sans compte ou hors ligne, il retombe sur le même cycle calculé
   en local, comme `dansisland:bourse` sert de bourse de secours.
2. **Le cycle est semi-diurne : 12 h 25 min, comme la vraie marée.** Ce
   n'est pas de la coquetterie. Une marée calée sur l'horloge civile
   tomberait à la même heure tous les jours, et l'enfant qui joue toujours
   après l'école ne verrait jamais que la même moitié du jeu. Les
   cinquante minutes de décalage par jour sont la règle. Mesuré : deux
   basses mers par jour, environ 3 h 45 chacune.
3. **Rien n'en part en base.** Pas une clé de plus dans `mondeNu()`, rien
   pour `Ctrl+Z`. Le sable se déduit du rayon, ce que la mer laisse se
   déduit du numéro de la marée. Seul `bourse.faits.maree` change.
4. **Le sable se découvre depuis le large, de proche en proche**
   (`majMouillees()`), pas case par case. Le premier essai prenait toute
   l'eau entre le rayon et le rayon plus un : le bord dentelé de l'île
   laissait alors des trous d'eau isolés au milieu du sable. La
   propagation règle les deux cas d'un coup, et elle donne une règle de
   jeu en cadeau : **une mare creusée au milieu de l'île reste une mare**,
   puisque la mer ne l'atteint pas.
5. **`terre()` remplace `tileAt()!==EAU` partout** où il s'agissait de
   savoir sur quoi on marche et où court l'écume. `tileAt()` reste la
   donnée, `terre()` est l'état du moment. C'est ce qui fait que l'écume
   recule à marée basse sans une ligne de plus — et c'est ce recul de la
   ligne blanche qui dit, sans un mot, que la mer s'est retirée.
6. **`avancerMaree()` passe en tête de `frame()`**, avant le déplacement :
   c'est le masque que lit `blocked()`, et un pas fait sur un masque
   périmé serait un pas dans l'eau.
7. **On ne bâtit pas sur le sable mouillé**, et il n'y a rien à écrire
   pour ça : il est hors du rayon acquis, donc `dansLeRayon()` refuse déjà
   d'y peindre, d'y poser et d'y faire pousser des herbes. Seul le message
   de refus a changé, parce que « le large » est faux quand on a les pieds
   dessus.
8. **La mer qui remonte repose le bonhomme à terre** (`laMerMonte()`),
   elle ne le noie pas. Pas de perte, pas de gronderie : c'est la même
   règle que le chien qui s'assied.

Pas de plaque dans le bandeau pour la marée, et c'est délibéré : à quatre
plaques et 360 px, le bouton Son passe à la ligne et se pose sur les
boutons de zoom. Elle se dit dans le murmure quand elle tourne, et dans le
panneau **Île** le reste du temps — d'où le `buildAll()` sur la bascule.

Six shells par jour, deux par chose ramassée. Du même ordre que la tonte
et la promenade, très en dessous des trente-cinq des visites : **l'île
grandit parce que des gens sont passés**, jamais parce que le temps passe.
Une marée généreuse serait exactement le contraire, un gain qui tombe tout
seul deux fois par jour.

## Le coffre du jour, 17/09/2026 au soir

Le cadeau du jour existait ; ce qui manquait, c'était le geste. Il s'ouvrait
par un bouton dans un panneau, et c'est exactement ce que le jeu se refuse
partout ailleurs : « un bouton qui donne des shells ne serait pas un jeu ».
Le coffre est le même cadeau, mais posé quelque part : on y va en marchant,
on appuie sur `E` ou sur le bouton rose, comme pour la porte et le chien.

**Aucune migration, aucune clé de plus.** `bourse.cadeau` tenait déjà le
jour du dernier cadeau ouvert et `bourse_cadeau()` le débite déjà côté
serveur. Rien n'entre dans `mondeNu()`, rien pour `Ctrl+Z` : le coffre
est un objet d'île gratuit qui existait, et son état se déduit de la bourse.

Cinq choses à ne pas défaire :

1. **Tous les coffres de l'île portent le même cadeau**, et il n'y en a
   qu'un par jour. On n'en élit pas un : dix coffres ne donnent pas dix
   cadeaux, puisque c'est `bourse.cadeau` qui compte et que le serveur
   refuse le second. Élire « le vrai » coffre coûterait une donnée de plus
   et ne rendrait rien.
2. **Chez un voisin, le coffre reste fermé.** `cadeauDispo()` lit *ta*
   bourse : un coffre ouvert chez l'hôte parlerait de toi, pas de lui.
   C'est la même règle que sa porte. `coffrePlein()` et `coffreOuvert()`
   sont tous les deux faux quand `visiting`.
3. **Le bouton du panneau ne disparaît que s'il y a un coffre.** Une gomme
   passée sur le dernier coffre ne doit pas rendre le cadeau injoignable :
   sans coffre, la Boutique garde son bouton et propose d'en poser un
   (`poserUnCoffre()`).
4. **L'ordre de `agir()` a gagné un rang**, et `proximity()` l'a gagné au
   même endroit : souvenir, chien, **coffre**, porte. Les deux doivent
   rester d'accord, c'est la règle déjà écrite pour le chien. Les deux
   passent par `coffreProche()`, et pas par une recherche recopiée.
5. **Un coffre vide n'est pas un refus.** Il n'a rien à donner aujourd'hui,
   la bulle le dit, et le bouton rose ne s'affiche pas. Pas de gronderie,
   même règle que le chien qui s'assied.

`DRAW.coffre` a gagné un troisième paramètre, `ouvert`, et `dessinDe()` le
laisse passer sous le nom `etat`. C'est le même choix que le dernier
paramètre `saut` de `drawChar()` : un argument optionnel coûte moins
qu'une seconde fonction de dessin. Un seul dessin le lit.

Le scintillement (`etincelle()`) est le geste de `dessinTrouvaille()`,
en or plutôt qu'en blanc. C'est voulu : **dans ce jeu, une chose qui brille
est une chose à prendre.** Il est peint dans `drawWorld()` et non dans
`DRAW.coffre`, sinon la vignette de l'atelier scintillerait aussi.

## Les niveaux dans la maison, 17/09/2026 au soir

Trois défauts qui n'en faisaient qu'un : il manquait la notion de **sur quoi
un meuble se pose**. Un tableau occupait une case de plancher où l'on ne
passait plus, poser un vase sur la table effaçait la table sans un mot, et
`⟳ Tourner` existait mais personne ne le trouvait.

`NIVEAU` vit à côté de `TAILLE`, et pour la même raison : c'est une
propriété du **type**, dans le catalogue, jamais dans le jsonb. **Aucune
migration**, et un meuble reste `{t,x,y,o,c}`.

    'plat'    au sol, sous tout le reste, ne bloque pas    tapis, tapis rond
    'dessus'  sur un meuble à plateau, ou par terre        vase, plante, télé
    'mur'     accroché au fond, ne bloque pas              tableau, guirlande
    absent    par terre, et il bloque                      tout le reste

`PLAT` a disparu : il se déduisait de `NIVEAU`, donc il n'avait plus de
raison d'être. Une seule notion, pas deux listes à tenir d'accord.

Six choses à ne pas défaire :

1. **Poser sur une case prise ne l'efface plus, ça le dit.** L'ancienne
   version filtrait en silence tout meuble dont on prenait la case. Le
   refus nomme ce qui est là et dit quoi faire, là où est le doigt : c'est
   la leçon de la boutique, et elle vaut ici aussi.
2. **`SURFACE` porte la hauteur du plateau**, et c'est elle qui dit à quelle
   hauteur dessiner ce qu'on pose. Les dessins ne savent rien du niveau :
   ils partent de leur propre zéro, et `dessinerMeuble(m,h)` les monte. Ni
   l'étagère ni la bibliothèque n'y sont : leur haut est hors de vue dans
   cette isométrie, et un vase posé là ne se lirait pas.
3. **Ce qui est posé se trie juste après son porteur** (`prof(por)+0.01`),
   jamais à sa propre profondeur. Un vase 1x1 au coin d'une commode 2x1
   passe avant elle dans le tri par `x+y`, et la commode lui repasserait
   devant.
4. **C'est le `Sens` qui choisit le mur**, pour un cadre : `sw` vise la
   colonne 0, `se` la rangée 0, les deux seules parois dessinées. Un cadre
   ailleurs est refusé, en disant les deux façons de s'en sortir.
5. **Une rotation qui ne change pas l'encombrement ne vérifie rien.** Les
   cases sont identiques, donc tout a déjà été vérifié à la pose. Sans ça,
   tourner un vase posé sur une commode butait sur la commode elle-même.
   Pour un vrai demi-tour, ce qui est posé **sur** le meuble ne compte pas
   comme obstacle : il suit, et s'il se retrouve à côté du plateau il
   redescend au sol tout seul. Rien n'est perdu, jamais.
6. **`attraper()` est l'ordre unique de la gomme et de ⟳ Tourner** : ce qui
   est posé, le meuble, le cadre, le tapis. Deux ordres différents, et on
   efface le tapis sous la table en croyant prendre la table.

**Une pièce décorée avant ce changement ne perd rien.** Les cadres se
posaient au sol, donc une pièce d'hier peut en avoir un au milieu, où il
serait maintenant accroché dans le vide. `accrocherAuMur()`, appelé depuis
`normaliserInterieur()`, le **glisse contre la paroi dont il est le plus
près**. On ne l'efface jamais : on ne reprend pas ce qui a été posé, c'est
la même règle que le phare offert à qui en avait déjà un. Conséquence
assumée : deux cadres qui glissent au même endroit se recouvrent, et c'est
au joueur d'en déplacer un. Un recouvrement se voit et se corrige ; une
disparition, non.

L'atelier du dedans a les mêmes étiquettes que celui du dehors : `Sens` et
non « Orientation », et `⌫ Gomme` + `⟳ Tourner` sous **Corriger** et non
sous « Marcher ». L'étiquette du groupe était le nom de son premier bouton,
et c'est pour ça qu'on ne trouvait pas Tourner.

## La commande du jour, et le sac, 17/09/2026 au soir

`supabase/2026-09-17_commande.sql`, **joué le 17/09/2026 au soir** et
**rejouable** : `create or replace`, `add column if not exists`,
`create table if not exists`.

Vérifié contre le vrai projet, sans compte : `commande()` rend la même
paire que `commandeDuJour()` calcule en local, `bourse_ramasser()` et
`livrer()` répondent « connecte-toi » et non « function does not exist »,
et l'insert direct dans `livraisons` est refusé en `42501`. Le vide de
policy fait ce qu'on attend de lui, mesuré.

La question tranchée avant d'écrire une ligne : la commande se paie-t-elle
en shells, un revenu solitaire de plus contre la règle « l'île grandit
parce que des gens sont passés », ou demande-t-elle d'aller chez les
autres, ce qui rouvrirait le choix écrit dans `majLaisse()` : « chez les
voisins, il n'y a rien à ramasser » ?

**Ni l'un ni l'autre. La commande se remplit chez soi et se livre chez un
voisin.** La règle de `majLaisse()` parle de *ramasser* ; livrer est le
verbe inverse. On arrive les mains pleines au lieu de repartir les mains
pleines, et cette ligne-là n'a pas bougé d'un mot.

Et la commande paie dans la **famille des visites**, pas dans celle des
corvées : `commande` / `commande_recue` ont la forme de `mot_pose` /
`mot_recu` jusqu'à la vérifiabilité : une ligne signée d'un compte, sur
l'île d'un autre, et le bénéficiaire n'est pas l'appelant. Le revenu
solitaire reste à **19** shells par jour ; le revenu « quelqu'un est
passé » monte de 35 à **65**. Le rapport passe de 1,8x à 3,4x : ça
renforce la règle au lieu de l'éroder. Ne jamais refaire de la commande
une corvée qui se boucle chez soi.

Sept choses à ne pas défaire.

1. **Le sac est au joueur, pas à l'île.** Il vit dans `bourses.sac` avec
   la bourse, et pour la même raison : c'est la personne qui visite, et
   c'est elle qui porte le panier. Donc **aucune clé de plus dans
   `mondeNu()`**, rien pour Ctrl+Z, aucune migration du jsonb. Et il
   suit d'un appareil à l'autre. Le remettre dans `monde` serait rendre
   le sac au navigateur, exactement comme la bourse d'avant le 16/09.
2. **Le sac ne se remplit que tant que la marée paie.** Pas de second
   compteur : `plafond('maree')` borne déjà à trois objets par jour.
   `bourse_ramasser()` compare `faits.maree` avant et après, et n'ajoute
   au sac que si le crédit a eu lieu. Un sac sans plafond serait une
   monnaie que le client s'écrit, et cette monnaie-là achète des shells
   chez le voisin.
3. **La commande se déduit du jour, elle n'est stockée nulle part.** La
   même pour tout l'archipel, comme la marée se déduit de l'heure : deux
   enfants qui jouent le même jour peuvent en parler. Le calcul est en
   **arithmétique entière pure des deux côtés** (`commande()` en SQL,
   `commandeDuJour()` en JS) : `hashtext()` ne se rejoue pas en
   JavaScript, et deux calculs qui divergent, c'est une commande qui
   demande autre chose que ce que la livraison accepte. L'ordre de
   `TROUVAILLES` **est** celui du tableau SQL : `commande()` désigne une
   sorte par son rang. C'est pour ça que la liste est déclarée en haut du
   fichier, loin de ses dessins.
4. **La mer dépose les deux sortes demandées, plus une au hasard**
   (`majLaisse()`). Le jeu de la commande n'est pas de deviner ce que la
   marée voudra bien donner, c'est de porter le panier chez quelqu'un.
   La clé de la laisse porte donc le **jour** en plus du numéro de marée :
   la commande tourne à minuit et le sable doit tourner avec elle.
5. **Le geste est le pas de la porte du voisin.** Cette case ne savait
   dire que « c'est fermé » ; elle devient la seule chose qu'on vient y
   faire. Pas de nouvel objet à poser, pas de quatrième plaque dans le
   bandeau : l'avertissement des 360 px vaut toujours. `agir()` la met au
   **rang de la porte**, et `proximity()` au même : chez soi ce rang fait
   entrer, chez l'autre il ne faisait rien.
6. **Chaque état de cette case a sa clé de bulle** (`porte:pret`,
   `porte:livre`, `porte:manque`, `porte:ferme`), toutes préfixées
   `porte` pour que le ménage du bas de `proximity()` les lève.
   `porterLaCommande()` pose lui-même `porte:livre` : avec une clé unique,
   le « +6 shells » serait recouvert au battement suivant par « tu as déjà
   porté ». (Le coffre a encore ce défaut-là, lui.)
7. **Le panier se voit** (`panier()`, `panierEnMain()`). Un inventaire qui
   ne vit que dans un panneau se lit comme une liste de courses, et
   l'enfant qui traverse l'archipel ne porte alors rien. Il sort dès que
   le sac peut remplir la commande, se range quand elle est portée, et se
   montre **chez les voisins aussi**, puisque c'est là qu'on l'emmène. Il occupe
   la place de la tondeuse, donc un seul objet en main à la fois : on ne
   pousse pas la tondeuse un panier au bras.

Le sac est dans l'onglet **Toi**, pas dans un septième onglet : c'est ce
que le bonhomme porte, comme les bottes, et la barre est déjà à six. La
commande est en tête de **Voisins**, parce que c'est la raison d'y aller
et que c'est là qu'on choisit chez qui. La pastille de l'onglet Voisins
(`commandeAPorter()`) ne s'allume que quand il y a vraiment quelque chose
à faire : une pastille allumée en permanence devient une décoration.

`livraisons` n'a **aucune policy d'écriture**, comme `bourses` : l'insert
passe par `livrer()`, qui vérifie le sac. Un insert direct, c'est un reçu
écrit sans avoir rien porté, donc le voisin crédité depuis la console.
Elle se **lit** en revanche, par l'hôte et par le porteur : c'est un reçu,
pas un mur public, et c'est ce qui permet de mettre un nom sur le gain.
Un gain anonyme se lit comme une bizarrerie du compteur.

Ce que ça ne fait pas : le serveur ne voit toujours pas l'île, donc « j'ai
ramassé un coquillage » n'est pas vérifiable. La **livraison**, elle, l'est
de bout en bout. Même honnêteté que pour les mots.

Tant que la migration n'est pas passée, `bourse_ramasser` n'existe pas :
`ramasser()` retombe sur `bourse_gagner('maree', n)`, qui sait au moins
créditer. Le sac ne remonte pas, mais les shells ne se perdent pas entre
le déploiement du client et le passage du SQL.

## L'appareil photo, 17/09/2026 au soir

Aucune migration côté monde : seules **deux lignes de catalogue** partent en
base (`appareil`, 28 shells, et `compagnon`, 20), dans
`supabase/2026-09-17_commande.sql`. Un article absent de `catalogue` est
refusé à l'achat quoi qu'en dise la vitrine.

La carte postale existait, et c'était un bouton dans un panneau qui
enregistrait tout le cadre. C'est ce que le jeu se refuse partout ailleurs,
et c'est la leçon déjà écrite pour le coffre. L'appareil fait pareil pour
l'image : on vise, puis on déclenche. **La carte postale reste** et garde
son travail à elle : elle porte l'adresse de l'île, c'est une invitation.
La photo ne porte que ce qu'on a cadré.

Six choses à ne pas défaire.

1. **Rien n'en part en base.** Pas une clé de plus dans `mondeNu()` : une
   photo, ce sont des pixels, et des pixels n'ont rien à faire dans un
   jsonb que chaque sauvegarde réécrit. L'album vit dans `localStorage`
   sous `dansisland:album`, comme la bourse de secours. Il ne suit donc
   pas d'un appareil à l'autre, **et il le dit lui-même** plutôt que de
   le laisser découvrir. C'est le seul endroit qui le dise : le pied de
   page qui annonçait « tout est stocké dans ton navigateur » n'existe
   plus depuis le commit `1473433` (voir la section « la page allégée »).
2. **Deux temps, pas un.** Le premier appui ouvre le viseur, le second
   déclenche. Un déclencheur immédiat ne laisse pas cadrer, et cadrer est
   tout ce qu'il y a à faire ici. Même forme que le comptoir de la
   boutique, et pour la même raison.
3. **La photo se prend entre le dessin du monde et celui du viseur.**
   `declencher` est lu là, dans `frame()`. Peinte avant, la photo
   porterait ses propres bandes noires et sa croix de visée, ce qui se
   voit tout de suite et ne se rattrape pas.
4. **Le découpage est à l'échelle réelle des pixels** (`cv.width/CW`), pas
   en unités de dessin : sinon la photo est floue sur un écran à deux
   pixels par point.
5. **Le viseur se ferme tout seul** quand on entre, quand on sort et quand
   on change d'île (`fermerLeViseur()`), et sur Échap. Un viseur oublié,
   c'est une île qu'on ne voit plus qu'à travers deux bandes noires sans
   savoir pourquoi.
6. **Elle ne rapporte rien.** Pas de gain, pas de plafond, rien dans
   `faits`. Une photo qui paierait deviendrait une corvée, et le jeu en a
   déjà trois.

Le troisième bouton rond du bord droit n'apparaît qu'une fois l'appareil
acheté : un bouton mort n'apprend rien, c'est la règle déjà tenue pour les
objets verrouillés de l'atelier. Mesuré : une vignette d'album pèse ~11 ko,
donc ~140 ko pour les douze, là où douze tirages PNG en feraient plus de
deux mégaoctets.

**`pb.hidden = true` ne suffisait pas, et il a fallu une ligne de CSS.**
`.zoom button` porte `display:grid`, et une règle d'auteur l'emporte sur le
`[hidden]{display:none}` de la feuille du navigateur : le bouton restait
visible et cliquable avant tout achat. `basculerViseur()` refusait bien, donc
rien ne fuyait, mais c'est exactement le bouton mort que la règle ci-dessus
interdit, et rien ne le signalait. D'où `.zoom button[hidden]{display:none}`.
Les quatre autres éléments à attribut `hidden` du cadre (`rose-btn`,
`hud-balade`, `pad`, `tourne`) n'ont pas de `display` d'auteur et sont
indemnes : vérifié sur les cinq. Toute nouvelle règle qui donne un `display`
à un élément qu'on cache par `hidden` doit prévoir son `[hidden]`.

## Le compagnon, 17/09/2026 au soir

Une bestiole qui suit le bonhomme partout, y compris chez les voisins et
dans la maison. Elle ne rapporte rien et ne se perd pas : c'est la ligne
déjà écrite pour les mouettes et le requin.

Six choses à ne pas défaire.

1. **Aucune clé de plus dans `mondeNu()`.** Le choix vit dans
   `me.compagnon`, et `me` y est déjà : l'avatar voyage avec l'île, le
   compagnon voyage avec l'avatar. Sa position ne se sauvegarde pas du
   tout, comme celle du chien en balade.
2. **La Boutique ouvre le rayon, elle ne vend pas la bestiole.** On
   choisit parmi celles qu'on a déjà (`compagnonChoisi()` vérifie
   `achete('compagnon')` **et** `achete(k)`). Sans ça, un renard coûterait
   20 shells par cette porte et 32 par l'autre, et la boutique cesserait
   de vouloir dire quelque chose. Effet voulu : un chat acheté sert deux
   fois. La double vérification protège aussi d'une île importée par un
   code de sauvegarde qui porterait un renard non payé.
3. **Il ne sort pas pendant la balade du chien.** Un animal à la fois,
   même règle que le panier qui se range quand la tondeuse sort. Et si le
   compagnon *est* le chien, ce serait le même deux fois à l'écran.
4. **Il ne consulte pas `blocked()`.** Il reste à moins d'une case du
   bonhomme, donc sur du sol praticable de toute façon, et un compagnon
   coincé derrière la maison est bien pire qu'un compagnon qui frôle un
   buisson. Il n'a pas de but à atteindre : rien à rater, donc rien à
   gronder.
5. **L'hôte a le sien**, assis à côté de lui quand on visite. On lit
   `world.me.compagnon` sans pouvoir vérifier ses achats : la RLS ne montre
   pas la bourse du voisin, et ce n'est pas grave, c'est du dessin. C'est
   la même ligne que « l'hôte vit pareil » écrite pour la respiration.
6. **Il est semé de côté, jamais sur le bonhomme.** À la même case, la
   profondeur est la même, il s'empile avant lui et le sprite le recouvre
   entièrement : tant qu'on n'a pas encore marché, on croirait qu'il
   n'existe pas. « Au nord » ne suffit pas non plus, ça se projette droit
   au-dessus, derrière la tête.

## Le crédit du jour quitte le mur, 18/09/2026

`supabase/2026-09-18_visites.sql`, **rejouable** : `create table if not
exists`, `create or replace`, et la reprise finit par `on conflict do
nothing`.

Trouvé en éprouvant les visites payantes : **supprimer son mot rouvrait le
crédit du jour.** On plante chez un ami (+2), on efface, on replante, ça
repaie. `mot_credite()` demandait « ai-je déjà une ligne aujourd'hui ? » à
`mots`, c'est-à-dire à un mur, une table faite pour perdre des lignes.

Le compteur prend sa table, `visites`, clé primaire `(ile, auteur, jour)`,
sur le modèle de l'`unique (ile, auteur, jour)` de `livraisons`. Trois
choses à ne pas défaire :

1. **Aucune policy, aucun grant, pas même en lecture.** Le joueur n'a rien
   à lire ici : sa bourse dit ce qu'il a gagné, `faits.mot_pose` dit
   combien de fois. Seule `mot_credite()`, `security definer`, y écrit.
   `livraisons` était immunisée par accident (pas de policy de delete) ;
   ici c'est écrit exprès, avec les `drop policy if exists` qui le disent.
2. **Le jeton ne pointe aucun mot**, ni par id ni par texte. S'il pointait
   un mot, effacer ce mot rouvrirait la question, et le trou reviendrait
   par la porte de derrière.
3. **Le test d'existence *est* l'insert** (`on conflict do nothing` puis
   `get diagnostics row_count`). Le `select exists` suivi d'un `insert`
   laissait passer deux mots plantés dans la même seconde.

La reprise remonte tout l'historique de `mots`, pas seulement le jour :
sans elle, le premier mot replanté après la migration repaierait une
journée déjà payée.

Ce qui ne change pas : un mot supprimé ne reprend pas les shells. On ne
punit pas le propriétaire qui fait le ménage sur son mur. Il ne les
redonne simplement plus.

## Le jeu se présente comme un jeu de détente — 18/09/2026

Tout ce qui suit répond à une seule phrase : **« Mon petit endroit pour
ralentir. »** Ce n'est pas une accroche, c'est ce qui tranche les
arbitrages. Un jeu de détente ne se présente pas en ouvrant six onglets
d'un coup, ne compte pas les points, ne gronde pas, et donne envie de
rester même quand on ne fait rien.

### L'accueil, et les premiers pas

`#accueil` est un **voile, pas une page** : le jeu tourne derrière, flouté,
la mer bouge et les mouettes passent. C'est délibéré, et c'est ce qui dit
ce qu'est le jeu mieux qu'un paragraphe. Ne pas en faire un écran plein
opaque, et ne pas le remplacer par une image fixe.

Trois choses à ne pas défaire :

1. **Son texte est dans le HTML, en dur.** C'est le **seul** texte du site
   qu'un robot puisse lire — tout le reste est peint dans un canvas. Le
   réécrire en JavaScript, c'est rendre le site muet pour Google. Les
   trois blocs du socle (« Rien à perdre », « Une île qui vit », « Des
   voisins ») sont là pour ça autant que pour le lecteur.
2. **Il ne s'ouvre qu'à la racine**, et une seule fois
   (`dansisland:entre`). Qui arrive par le lien d'une île vient voir cette
   île, pas une page de présentation. Et si le compte a déjà une île,
   `demarrer()` referme l'accueil dès que la session est revenue.
3. **`ZMIN`, `vue`, `iso()` n'ont pas bougé.** L'accueil est du CSS
   par-dessus, rien de plus.

Le **guide** tient en quatre pas — bonhomme, maison, île, visite — dans le
bandeau au-dessus des onglets. Chaque pas **se coche sur le geste**, pas
sur la lecture : `guideFait(n)` est appelé depuis `set()` (pour `me.*` et
`house.*`), depuis le clic qui pose sur l'île, et depuis `go()` quand on
débarque chez quelqu'un. Un guide qui avance sur un bouton « suivant »
apprend à lire, pas à jouer. Il s'efface au quatrième pas et ne revient
jamais (`dansisland:guide`).

### La note qui ne s'efface pas

Le murmure ne convient pas à ce qui s'explique **une fois dans une vie**.
Il dure 2,2 s, et surtout `proximity()` le réécrit à l'image suivante dès
qu'un coffre ou un souvenir est sous les pieds : mesuré, le « +1 shell,
voilà à quoi ça sert » était recouvert avant d'avoir été lu.

`noteUneFois(icone, html)` prend donc la place du bandeau du guide, au
même endroit, et **attend qu'on la referme**. Elle passe devant le guide ;
le pas repris à la fermeture n'a pas bougé. Deux choses l'utilisent : les
premiers shells gagnés (`dansisland:shells1`) et la bienvenue d'un
parrain. Ne pas y mettre autre chose : une note qui revient n'est plus une
note.

`say()` a gagné un troisième paramètre, `duree`, pour les phrases un peu
longues qui n'ont pas d'état à dire. Les messages **verrouillés** ne
passent toujours pas par ce minuteur.

### Cinq onglets, et « Dedans » qui n'en est plus un

`Moi · Maison · Île · Voisins · Boutique`. On n'entre pas chez soi par une
barre de navigation : **le panneau Maison suit le bonhomme.** Dehors il
règle la maison qu'on voit et porte le bouton **🚪 Entrer** ; dedans,
`buildMaison()` appelle `buildDedans(p)` avec son propre panneau, et c'est
l'atelier des pièces. `buildDedans` reçoit donc l'élément à remplir au
lieu d'aller le chercher — c'est ce qui permet aux deux ateliers de vivre
au même endroit.

Conséquence assumée : **on ne décore plus l'intérieur depuis le dehors.**
Il faut entrer. C'est la même règle que partout ici — le coffre s'ouvre là
où il est, la commande se porte au pas de la porte.

En paysage court, cinq onglets dans 235 px font 47 px chacun et
« Boutique » serait coupé. La barre y passe donc à **trois puis deux**, et
c'est une grille de **six** colonnes qui le rend (les trois premiers sur
deux colonnes, les deux derniers sur trois) : une grille de trois aurait
laissé un trou à droite de la seconde rangée. Vérifié à 360 px et à
780x360, sans débordement.

Au passage, un défaut qui datait d'avant : en paysage court, `.objs` en
quatre colonnes de 60 px débordait d'une colonne de 210 px utiles, et la
quatrième vignette sortait de l'écran. Trois colonnes et des vignettes de
52 px. Mesuré, pas déduit.

### Ce qui bouge en plus

Quatre choses, et pas une ne touche à l'état du jeu : rien en base, aucune
clé de plus dans `mondeNu()`, rien pour Ctrl+Z, aucun gain, aucune perte.
C'est la ligne déjà écrite pour les mouettes et le requin.

**Le voilier** (`avancerVoilier`, `dessinerVoilier`) passe au **nord**,
derrière l'île, et il suit la **corde de l'ellipse de la mer** à sa
latitude : le même contour que `seaPath()`, pour la raison déjà écrite
pour le requin — deux contours qui divergent, et la coque sort sur le
papier. Sa minuterie est en `dt` accumulé et pas en `t`, comme celle du
requin : un onglet en arrière-plan met `rAF` en pause, et un bateau qui
traverse sans témoin n'a traversé pour personne.

**Les papillons le jour, les lucioles la nuit** (`insectes()`). Tout se
déduit de `t` : aucun état à tenir, rien à remettre à zéro. Deux pièges :

1. Elles ne volent **qu'au-dessus de `terre()`**, jamais `tileAt()` : à
   marée basse le sable mouillé compte, et un papillon au milieu de la mer
   se lit comme un défaut d'affichage.
2. Elles se peignent **après le voile de nuit**, sinon une luciole passe
   sous le bleu nuit et ne brille plus du tout.

Mesuré : à zoom 0,78 un papillon de 6 px était un grain de poussière. Ils
font le double, et le blanc a été remplacé par un bleu clair — un papillon
blanc sur du sable clair est une tache.

**L'étoile filante** (`etoileFilante`) vit dans `ciel()`, donc en repère
écran et derrière la mer. Tout se déduit de `t` : une toutes les onze
secondes environ, deux fois sur trois, et la course est tirée du numéro de
son passage. Si on la rate, il y en a une autre.

## La carte postale, le parrainage, les pages publiques — 18/09/2026

`supabase/2026-09-18_parrainage.sql`, **rejouable** : `create table if not
exists`, `create or replace`, et les réglages s'insèrent en `on conflict
do nothing` — rejouer le fichier ne réécrit pas une valeur réglée à la
main dans le dashboard.

### La carte postale

Elle existait, et c'était un bouton qui enregistrait le cadre dans les
fichiers : une image qui ne partait nulle part. C'est maintenant l'objet
qu'on envoie. Six choses à ne pas défaire :

1. **Rien n'en part en base.** Pas de table, pas de stockage, pas une clé
   de plus dans `mondeNu()`. La carte se **redessine** depuis l'île à
   chaque fois : c'est une image dérivée, comme le sable de la marée se
   déduit du rayon. Une carte stockée serait une île figée à purger un
   jour.
2. **L'image part avec le message.** `navigator.share({files})` met la
   vraie image dans la conversation WhatsApp, pas un lien qui la promet.
   C'est le seul chemin qui donne ça sans serveur, et c'est pour ça qu'il
   passe avant tous les autres. Le lien est **aussi** dans le texte :
   Android laisse tomber `url` quand il y a des fichiers.
3. **Il y a toujours une sortie** : `wa.me` (application sur téléphone,
   web.whatsapp.com sur ordinateur, aucun numéro à donner), le lien à
   copier, l'image à enregistrer. Un bouton qui ne marche que sur un
   téléphone récent n'existe pas pour les autres.
4. **Deux temps, pas un.** On ouvre le comptoir, on voit ce qu'on envoie,
   puis on envoie. Même forme que la boutique, le viseur et le coffre.
5. **La photo est en large (1,8) et pas au rapport du cadre (1,536).** Le
   cadre montre l'île entourée d'eau jusqu'aux quatre coins, et sur une
   carte ça fait une île perdue dans une flaque : on prend une tranche
   horizontale centrée sur le milieu du monde, qui est aussi le milieu du
   cadre. `CARTE_H` se **déduit** de la marge, de la photo et de la bande.
   Jamais d'étirement : une île écrasée se voit tout de suite.
6. **Elle ne rapporte rien à l'envoi.** Ce qui paie, c'est quelqu'un qui
   arrive. Une carte qui paierait à l'envoi deviendrait une corvée, et on
   en enverrait dix par jour sans les regarder.

Le comptoir se ferme dans `go()`, comme le viseur : une carte préparée
chez soi puis envoyée depuis l'île d'un autre montrerait l'île d'un autre.

La **commande du jour reste en tête de Voisins** et la carte vient juste
après : la commande est la raison d'y aller *aujourd'hui* et elle se
périme à minuit ; la carte est la raison pour laquelle il y a des voisins
tout court.

### Le parrainage

**Ton adresse est ton code.** Pas de code à inventer, pas de table de
codes à tenir, et un lien qui se lit. Trois choses à ne pas défaire :

1. **`parrainages` n'a aucune policy d'écriture**, comme `bourses`,
   `livraisons` et `visites`. Le vide *est* la protection. Seule
   `parrainer()`, `security definer`, y écrit.
2. **La clé primaire est le filleul**, et le test d'existence *est*
   l'insert (`on conflict do nothing` puis `row_count`) : un `select
   exists` suivi d'un `insert` laisse passer deux appels lancés dans la
   même seconde. C'est la leçon de `visites`.
3. **Le filleul doit vraiment avoir son île.** Ouvrir un compte ne vaut
   rien : c'est l'île créée qui paie, des deux côtés. C'est aussi ce qui
   rend le parrainage coûteux à fabriquer en série.

Les récompenses sont dans la table **`reglages`**, et se changent par une
ligne de SQL sans redéployer :

    update public.reglages set v = 40 where k = 'parrainage_parrain';

`plafond()` et `gain()` sont passées de `immutable` à `stable` parce
qu'elles lisent maintenant cette table. Les sept clés d'avant rendent
exactement les mêmes nombres. La borne anti-abus est
`plafond('parrainage') = gain × parrainage_par_jour` : un lien magique est
gratuit, donc fabriquer des comptes l'est aussi.

Le parrainage est dans la **famille des visites**, pas dans celle des
corvées : c'est quelqu'un qui n'était pas là et qui est arrivé. Ne jamais
en faire un revenu qui se boucle chez soi.

Côté client, le code est retenu dans `localStorage` (`dansisland:parrain`)
jusqu'à ce qu'il serve : entre le clic sur la carte postale et l'île
créée, il y a un lien magique, une boîte mail et parfois un autre jour.
`reglerLeParrainage()` est appelé à deux endroits (création de l'île,
chargement du compte) — le serveur refuse le second appel, donc ça ne
coûte rien. Une **erreur** garde le code pour la prochaine fois ; un
**refus ordinaire** (code inconnu, déjà parrainé) le jette.

### Les pages publiques, et l'aller-retour qui a servi de leçon

Le jeu est **une seule page peinte dans un canvas**, et `_redirects` la
sert à toutes les adresses. Un robot — Google, WhatsApp, Signal — ne lit
pas le JavaScript : il voit « Dan's Island » et la même vignette pour les
cinquante îles de l'archipel. Trois Cloudflare Pages Functions y répondent
(`/island/<slug>`, `/carte/<slug>`, `/sitemap.xml`).

`functions/` est à la **racine du dépôt** et `build.sh` ne le copie **pas**
dans `dist/` : Cloudflare cherche les Pages Functions dans le répertoire du
projet, pas dans le dossier publié. Copiées dans la sortie, elles seraient
servies comme du texte — du code publié au lieu d'être exécuté.

**L'aller-retour du 18/09/2026 au soir, et ce qu'il a coûté de ne pas
mesurer.** Après la fusion qui les apportait, le déploiement a cessé de
passer. Cloudflare compile automatiquement `functions/`, et une compilation
qui échoue fait échouer **tout** le déploiement : hypothèse plausible, et
le dossier est sorti pour la lever. **Elle était fausse.** Six minutes plus
tard, la production servait toujours l'ancienne page.

Le diagnostic — écrit après, et qui aurait dû venir avant — a tranché en
deux minutes : `dansisland.app` **et** `dansisland.pages.dev` servaient
tous deux la vieille page (donc ni DNS ni cache), et
`main.dansisland.pages.dev` répondait « Deployment Not Found » (donc aucun
déploiement pour `main`). Le build ne se déclenchait plus, et le contenu du
dépôt n'y était pour rien. Les fonctions sont revenues telles quelles.

La leçon est celle que ce fichier répète partout : **mesurer d'abord,
retirer ensuite.** Un pas de diagnostic qui distingue deux causes vaut une
demi-heure d'hypothèses, et il est maintenant en tête du workflow.

Trois règles, elles n'ont pas bougé :

1. **En cas de doute, `next()`.** Île inconnue, base injoignable, slug mal
   formé : on s'efface et le catch-all sert le jeu.
2. **On ne lit que ce qui est public** : la clé publishable sans jeton
   d'utilisateur, donc `auth.uid()` vaut null et la RLS ne montre que les
   îles publiées.
3. **Les clés de `functions/_commun.js` doublent celles de
   `src/config.js`.** Deux listes qui divergent, et la page publique ne
   trouve plus l'île que le jeu affiche.

Et une quatrième, née de l'aller-retour : **les adresses publiques ont deux
réponses acceptables.** Leur propre page quand les fonctions sont servies,
le jeu quand elles ne le sont pas — `routerDepuisURL()` sait ouvrir
`/island/x` et `/carte/x`, et il retient le parrainage au passage. Le
workflow n'échoue que sur la troisième réponse, ni l'une ni l'autre, et son
log dit laquelle des deux on a. Un avertissement permanent finit par ne
plus être lu ; une vérification qui accepte les deux états réels, non.

### L'import du module est en chemin absolu

`import * as store from '/src/store.js'` et non `./src/store.js`, pour
exactement la raison déjà écrite pour le manifest et les icônes. Le
catch-all sert `index.html` à **toutes** les adresses, y compris à deux
segments comme `/carte/dan` — le repli quand la fonction n'a pas répondu.
Un chemin relatif s'y résout en `/carte/src/store.js`, que le catch-all
sert en `text/html`, et **un module au mauvais type MIME est refusé sans
appel** : le jeu ne démarre pas du tout, écran vide, une seule ligne dans
la console. Trouvé en éprouvant `/carte/<slug>`, pas deviné.

### L'invite de rotation

Elle disait quoi faire et pas pourquoi, et une consigne sans raison se
referme d'un doigt sans qu'on l'ait suivie. Elle dit maintenant les deux,
et la seconde ligne est une invitation : on ne tourne pas son téléphone
pour obéir, on le tourne pour entrer sur son île.

Elle **arrive à 2,6 s**, après que le murmure du chargement s'est effacé
(2,2 s). Rétrécir le murmure pour lui faire de la place donnait une
colonne de six mots qui couvrait l'île : c'est le temps qui les sépare,
pas la largeur.

## Le lien de connexion, et l'invite qui clignotait — 19/09/2026

Deux défauts trouvés en éprouvant le parrainage sur un vrai téléphone. Ils
n'ont rien en commun sauf l'essentiel : **l'écran ne répondait pas au
geste.**

### « Recevoir mon lien » ne disait pas que le lien était parti

Le bouton repassait à son texte d'origine et la confirmation tombait dans
le **murmure** — en bas du cadre, 2,2 s. La carte de connexion, elle, est
hors du cadre : en portrait elle est au-dessus, sur un autre écran que le
doigt. Donc « je clique et rien ne se passe », et on appuie dix fois.

C'est exactement le défaut de la boutique d'avant le 16/09, et la règle est
la même : **la réponse tombe là où est le doigt.** Elle a maintenant sa
place dans la carte (`.envoye`, `.souci`), et elle y reste.

Quatre choses à ne pas défaire :

1. **Le champ disparaît quand le lien est parti.** Un champ vide et un
   bouton actif n'invitent qu'à réappuyer. À la place : ce qui est envoyé,
   à qui, d'où l'ouvrir, et où chercher s'il tarde.
2. **Le renvoi attend une minute et l'annonce** (`RENVOI`, le compte à
   rebours sur le bouton). Ce n'est pas de la prudence : Supabase refuse
   tout second envoi avant une minute, donc dix appuis ne donnaient pas dix
   mails, ils donnaient neuf erreurs. Mesuré : dix appuis, **un** appel.
3. **L'adresse tapée survit au refus** (`lienSaisi`). La retaper après une
   erreur est la deuxième chose qui fait abandonner.
4. **Le bouton du compte à rebours porte `aria-live="off"`.** `#compte` est
   une région `aria-live="polite"` : sans ça, un lecteur d'écran énoncerait
   la carte entière une fois par seconde pendant une minute.

`refusLisible()` traduit le refus de Supabase, qui arrive en anglais et dont
le cas le plus fréquent est justement celui de la minute d'attente — celui
qu'on rencontrait en appuyant plusieurs fois. « For security purposes » dans
un jeu français pour enfants, non.

### L'invite de rotation battait trop vite

`tournepivot` faisait un cycle de 3,2 s dont la bascule tenait 0,58 s, et il
tournait **à l'infini**. Sur un téléphone, à 19 px, ça ne se lit plus comme
un geste : ça se lit comme un clignotement, et on referme l'invite pour
faire cesser le mouvement — pas parce qu'on a compris.

Cycle à 5,5 s, bascule à 0,83 s, maintien à 1,4 s, et **trois tours
seulement**, avec `both` pour rester à plat ensuite. Un indice de geste qui
se répète indéfiniment n'est plus un indice, c'est une insistance.

Toute accélération future de ces valeurs se regarde **sur un vrai
téléphone**, pas sur un cadre de 19 px dans un navigateur de bureau : c'est
là que la différence se voit, et c'est de là qu'est venu le signalement.

## La musique, et la mer qui a enfin un fond — 19/09/2026

Deux ajouts, aucune migration, **aucune clé de plus dans `mondeNu()`** : le
choix d'ambiance y était déjà, et la mer est du dessin.

### La musique est une ambiance de plus

Il y avait des nappes, des oiseaux et des grillons ; il n'y avait pas une
note. `AMBIANCES` gagne `musique`, et c'est tout ce que ça coûte en
données — `mine.ambiance` est déjà dans `mondeNu()`, donc une valeur de
plus dans un jsonb ne demande rien à personne. Le défaut reste `vagues` :
personne ne se réveille avec de la musique qu'il n'a pas choisie.

Cinq choses à ne pas défaire :

1. **Elle est générative, jamais enregistrée.** C'est la règle déjà écrite
   en tête de la section audio : pas de fichier à héberger, pas de licence
   à vérifier, pas un octet à charger avant de jouer. Et une boucle de
   trois minutes se reconnaît au bout d'un quart d'heure — or c'est une
   île où l'on reste.
2. **La gamme est pentatonique, cinq degrés et pas un de plus.** Il n'y a
   pas de note fausse dans une pentatonique : c'est ce qui permet de tirer
   les notes au hasard sans jamais déraper. Une gamme de sept degrés
   demanderait des règles d'enchaînement, donc un moteur, donc un bug.
3. **Le mode suit le ciel de l'île, et se relit à chaque note.** Passer en
   nuit assombrit la musique sans rien redémarrer. `GAMMES` a donc les
   mêmes clés que `sky` — si une quatrième heure apparaît un jour, elle
   doit y entrer aussi, sinon on retombe sur `jour` en silence.
4. **Une phrase sur trois reste une note seule.** Dans une musique de ce
   genre le silence fait autant que les notes ; un tapis continu devient
   un fond qu'on n'entend plus, et qu'on finit par couper.
5. **L'écho n'est pas un effet, c'est la pièce.** Sans lui chaque note
   s'arrête net et s'entend comme un bip. Le passe-bas est **dans** la
   boucle : la reprise est plus sourde que la note, ce qui est exactement
   ce que fait de l'air, et c'est ça qui se lit comme de la distance.

`arreterAmbiance()` coupe le minuteur des notes **et** débranche la boucle
de délai. Une boucle de délai laissée branchée sur elle-même continue de
tourner à vide : elle s'éteint toute seule, mais elle n'a plus de raison
d'exister.

### La mer avait une couleur, pas un fond

Un aplat d'une seule couleur, et une île posée dessus flotte. Le dégradé
part **du bord de l'île** — `kPlage()`, déjà calculé pour le requin — et
non du centre : sous l'île il n'y a rien à voir, et un dégradé parti du
milieu s'assombrirait trop tôt là où on regarde.

Il est **elliptique, pas circulaire**, d'où le passage dans un repère mis à
l'échelle. La mer fait 438x240 : un dégradé rond atteindrait le large bien
plus tôt au nord et au sud qu'à l'est et à l'ouest, soit l'inverse de la
vérité, puisque c'est au nord et au sud que la bande d'eau est la plus
mince. Le `clip` est posé **avant** la mise à l'échelle — la découpe reste
dans le repère du monde, seul le dégradé s'étire.

Mesuré sur les pixels : `(83,221,243)` contre la plage, `(63,201,226)` au
large. Le haut-fond existe, il ne se devine pas.

### Les éclats sur l'eau

Vingt-deux, tirés de `h2()` et de `t` : aucun état, rien en base, rien pour
Ctrl+Z. La ligne déjà écrite pour les mouettes et le requin.

**Chacun a sa propre période.** Des éclats qui battraient ensemble se
liraient comme un clignotement de l'écran, pas comme de l'eau. Vérifié en
arithmétique pure, hors navigateur : 22 périodes distinctes sur 22, tous
s'allument au moins une fois en vingt secondes, 2,7 allumés en moyenne,
sept au plus — et parfois zéro, l'eau se repose.

Ils vivent dans l'anneau qui va du bord de l'île à 97 % du rayon. Tout
contre le contour ils déborderaient sur le papier une fois sur trois, là où
`wMer()` rentre.

### Le voile laissait enfin passer l'île

`#accueil` promettait de laisser voir le jeu derrière — c'est écrit plus
haut, et c'est la raison même de n'en pas faire une page. Il ne le faisait
pas : les bords étaient à **86 %** d'opacité, et l'île n'y était plus
qu'une tache.

Le piège est arithmétique et il vaut d'être écrit : la couche plate et le
dégradé **se composent**. Lire `.66` dans le dégradé et `.58` dessous ne
donne pas 66 %, ça donne `1-(1-,66)(1-,58) = 86 %`. Les valeurs avaient
l'air modérées et ne l'étaient pas.

Le halo garde ce qui compte — 95 % au centre, 85 % encore sous la carte,
donc le texte ne perd rien — et les bords descendent à 54 %. La mer, le
soleil et les mouettes reviennent.

Les **trois** déclarations doivent rester d'accord : la claire, celle du
`@media (prefers-color-scheme: dark)` et celle de `:root[data-theme="dark"]`.
Vérifié dans les deux thèmes, en large et à 390 px.

*(Au passage, une mesure à ne pas refaire comme moi : j'ai d'abord calculé
le contraste du titre contre une luminance de voile **écrite en dur**, en
supposant le voile crème dans les deux thèmes. Il rendait 1,05 en sombre et
j'ai cru à un titre invisible. Le voile est bleu nuit en sombre, et tout
allait bien. Un contraste se mesure contre le fond réellement calculé, pas
contre celui qu'on croit.)*

**Ces trois choses ne se vérifient pas dans un navigateur piloté**, et
c'est la limite déjà notée pour le requin : le `rAF` y est bridé, le canvas
garde la dernière image peinte, et seize mesures rendent seize fois la même
valeur — mesuré, pas supposé. On éprouve donc la formule, pas le rendu. Le
son, lui, ne s'éprouve pas du tout de cette façon : il n'y a pas de sortie
audio ici, et le jugement musical revient à l'oreille de quelqu'un.

## Reste du contexte

Voir README.md : modèle de données, file d'attente de sauvegarde, mise en route.
