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
*(Formulation corrigée le 19/09 : `.tourne` **a** un `display` d'auteur,
mais il est gardé par `:not([hidden])`, ce qui est l'autre forme
acceptable. Les huit éléments à attribut `hidden` sont sains, et ce n'est
plus une relecture qui le dit : voir le contrôle 12 plus bas.)*

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

### La pièce n'avait pas de volume

Les deux parois étaient séparées de **seize valeurs** (`-18` contre `-2`) :
à l'écran, elles se lisaient comme un seul plan replié. Trente-quatre
suffisent à ce que l'œil les sépare, et c'est encore doux. Les quatre
couleurs de mur sont toutes claires, donc un écart **plat** ne peut rien
écraser vers le noir ; le jour où un mur sombre apparaît, il faudra un
écart relatif, et c'est ici qu'il faudra le mettre.

Et les fenêtres montraient le ciel sans rien éclairer. Une pièce dont les
fenêtres ne posent aucune tache de jour sur le plancher se lit comme un
décor, pas comme un endroit. La flaque est **écrasée au rapport de la
case** (`th/tw`) — un rond y serait posé sur le sol au lieu d'être couché
dans le plan — et elle passe **après le sol et avant les meubles**, sinon
elle traverserait une commode.

**La nuit, rien.** C'est le halo du lampadaire qui éclaire, et deux sources
qui s'ajoutent feraient une pièce plus claire de nuit que de jour.

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

## Les épreuves entrent dans le dépôt — 19/09/2026

`npm test`, **six** harnais dans `test/` (quatre le matin du 19/09, six
le soir : `objets.mjs` et `dedans.mjs` sont venus après). Ils font tourner
**la vraie page
dans un vrai navigateur** contre `test/faux-store.js`, copié sous le nom
`src/store.js` dans un dossier jetable : sans réseau, sans compte, et sans
toucher à la base de production.

Ils ont chacun un défaut réel derrière eux, trouvé à l'œil et tard :

    balises.mjs     des `</b>` affichés en clair au milieu d'une phrase
    etroit.mjs      une vignette qui sortait de l'écran en paysage court
    parrainage.mjs  les trois branches de reglerLeParrainage()
    lien.mjs        dix appuis qui donnaient neuf erreurs
    objets.mjs      un « +5 shells » recouvert avant d'avoir été lu
    dedans.mjs      « Te voilà dans **le** chambre », et une pièce à 51 %

Quatre choses à ne pas défaire :

1. **Le site n'a toujours ni dépendance ni build.** `package.json` ne sert
   qu'à `test/`, et `build.sh` ne copie ni l'un ni l'autre dans `dist/` —
   il copie une liste explicite, donc il n'y a rien à y ajouter.
2. **`faux-store.js` doit exporter exactement ce que `index.html`
   importe.** Un export qui manque, et la page ne démarre pas du tout :
   module refusé, écran vide, une ligne dans la console. Quand
   `index.html` appelle un nouveau `store.quelquechose`, il faut l'ajouter
   là aussi.
3. **`navigateur()` se rabat sur le Chromium présent.** Le paquet npm
   attend un numéro de build précis ; un conteneur qui porte déjà des
   navigateurs sous `PLAYWRIGHT_BROWSERS_PATH` n'a pas forcément le même,
   et l'erreur ne dit que « Executable doesn't exist ». Ne pas remplacer ça
   par un chemin en dur : il serait faux sur l'autre machine.
4. **Un test qui ne tombe pas sur le défaut qu'il vise ne vaut rien.**
   `balises.mjs` a été éprouvé en remettant le bug d'origine — et le
   premier essai le laissait passer, parce qu'il lisait
   `.panel:not([hidden])`, ce qui rendait une chaîne vide. C'est
   `offsetParent !== null` qu'il faut : ce qui compte est ce qui est
   **visible**.

Ce qu'ils ne couvrent pas, et il ne faut pas prétendre le contraire : le
SQL (qui s'éprouve dans l'éditeur du projet), le rendu image par image (le
`rAF` est bridé sous pilotage), le son (pas de sortie audio), et tout ce
qui demande deux comptes.

## Le chien qui salit, les bestioles qu'on ne trouvait pas, et la terre qu'on ne voyait pas grandir — 19/09/2026

Trois retours d'usage, aucune migration, **aucune clé de plus dans
`mondeNu()`** — la crotte est un objet de `objects`, qui y est déjà.

### Le chien laisse quelque chose, et on le nettoie

Une fois par balade, à un point tiré au hasard entre le premier et
l'avant-dernier, le chien s'arrête. Une crotte se pose sur sa case, et
elle se ramasse comme le reste : on marche dessus, `E` ou le bouton rose.

Cinq choses à ne pas défaire :

1. **Ce n'est pas une corvée de plus, et ça ne paie rien.** Pas de gain,
   pas de plafond, rien dans `faits`. Une troisième corvée payante ferait
   un revenu solitaire de plus, contre la règle « l'île grandit parce que
   des gens sont passés ». Et un enfant qui ne nettoie pas ne perd rien :
   c'est la ligne déjà écrite pour le chien qui s'assied.
2. **Le rang dans `agir()` est le même que dans `proximity()`** —
   souvenir, chien, **crotte**, coffre, porte — et les deux passent par
   `crotteProche()`. *(Ce n'était pas vrai quand cette ligne a été
   écrite : `proximity()` testait `objet.t` en ligne. Corrigé le 19/09,
   voir « les sept rangs ».)*
3. **Elle est exclue des souvenirs.** `souvenirProche()` ignore
   `t==='crotte'` : sans ça on en rapporterait une de chez un voisin, et
   ce n'est pas un cadeau.
4. **`leChienSarrete()` refuse une case déjà occupée**, hors rayon ou hors
   terre. Rien ne se pose sous un objet existant, et rien ne tombe à
   l'eau : un objet invisible qu'on ne peut pas ramasser est pire que pas
   d'objet du tout.
5. **`nettoyer()` passe par `memoriser()`**, donc Ctrl+Z la fait revenir.
   C'est cohérent avec la gomme, qui est le même geste.

Elle n'est **pas** dans l'atelier : rien à poser, rien à acheter. C'est le
chien qui la met, comme la tondeuse est un dessin que le moteur sort.

### Les bestioles étaient là, et personne ne les trouvait

Signalé par des joueurs : « les animaux ne sont pas accessibles ». Ils
l'étaient — `chien`, `crabe` et `mouette` sont **gratuits**, absents de
`BOUTIQUE`, donc `achete()` est vrai pour eux dès le premier jour. Ce qui
coûte 20 shells, c'est la capacité `compagnon`, c'est-à-dire le fait d'en
avoir un qui te suit.

Rien à corriger dans le code, donc, et tout à corriger dans ce qui se lit :

- le bloc **Compagnon** passe **au-dessus du sac** dans l'onglet Toi : il
  était sous un inventaire, à un écran de défilement du haut ;
- la description de la Boutique **nomme les trois bestioles** et dit
  qu'elles sont déjà à toi — « Compagnon, 20 shells » ne disait pas ce
  qu'on achetait ;
- la note affichée sans l'achat **donne le prix et le chemin**.

La leçon est celle de la boutique du 16/09, transposée : ce qui existe
mais ne se nomme nulle part n'existe pas. Ne pas le « réparer » en
baissant le prix ou en offrant la capacité : rien n'était cassé.

### « Permet d'agrandir l'île » — mesuré, et ce qui a été fait à la place

Demandé, mesuré avant de coder, et **la géométrie dit non** :

    rayon  terre   +anneau de marée   mer au creux   eau restante
    7,0    305 px  345 px             403 px          59 px
    8,3    357 px  396 px             403 px           7 px
    9,0    384 px  424 px             403 px         -21 px

`RAYON_MAX` vaut 8,3 parce qu'au-delà l'**anneau de marée sort de la
mer**. Agrandir la mer demande `MER_RX > 438`, or la tache fait déjà
945 px de large (bosses comprises) dans les 985 px que le cadre montre à
`ZMIN`. Baisser `ZMIN` ne rend rien : sur un cadre de 768 px c'est
`CASE_MIN` qui borne déjà le zoom automatique à 0,786, pas `ZMIN`. Et la
demi-grille 18x18 plafonne de toute façon à 8,5.

Élargir la grille reste possible, mais c'est un chantier et pas un
réglage : les `tiles` changent de longueur (et `normaliserMonde()` les
**réinitialise** si elle ne tombe pas juste — c'est-à-dire efface le
relief peint de toutes les îles), les `objects` se décalent, et les mots
se décalent en SQL par une migration non idempotente, comme celle du
16/09. À ne lancer que sur décision explicite, et avec une sauvegarde.

Ce qui a été fait à la place répond au vrai manque : **la croissance
existait et ne se voyait pas.** Elle se disait en quatorzième note grise
tout en bas du panneau Île, après Ctrl+Z. Elle a maintenant son bloc
**Ta terre** en tête du panneau, juste sous le nom de l'île : une jauge,
le nombre de crans gagnés sur dix, le nombre de mots reçus, et la seule
chose à faire pour en gagner — envoyer sa carte postale. Et
`faireGrandir()` dit, au moment où ça arrive, combien de mots il reste.

Deux choses à tenir :

1. **La jauge part de `RAYON0`, pas de zéro.** Une île neuve n'a pas une
   terre vide : ce qui se remplit est ce qu'on *gagne*, et une jauge à
   moitié pleine dès le premier jour ne dirait rien.
2. **Le compte est en crans, pas en pixels** (`(r-RAYON0)/PAS_RAYON`).
   Si `RAYON_MAX` ou `PAS_RAYON` bougent, le total suit tout seul et il
   n'y a pas de dix écrit en dur à retrouver.

## Trois objets chers, et qui font quelque chose — 19/09/2026

`supabase/2026-09-19_objets_chers.sql`, **rejouable** : un seul
`insert ... on conflict do update`. Trois lignes de catalogue, rien
d'autre — pas de table, pas de fonction, **aucune clé de plus dans
`mondeNu()`**. Un objet posé est un objet posé.

    girouette      42   dit où en est la marée, et dans combien de temps
    carillon       50   sonne tout seul, et les visiteurs l'entendent
    boitelettres   55   lève son drapeau quand on t'a laissé un mot

La question tranchée avant d'écrire une ligne : **qu'est-ce qu'un objet
cher a le droit de faire ?** Pas rapporter de shells — ce serait une
quatrième corvée, et le revenu solitaire est tenu à 19 par jour contre 65
pour « quelqu'un est passé ». Pas monter un plafond — « ça revient à
vendre de la monnaie », c'est écrit depuis le 16/09. Pas donner un
avantage sur quelqu'un — il n'y a personne contre qui gagner.

Reste une chose, et c'est celle que le jeu fait déjà partout : **sortir
une information d'un panneau et la poser quelque part où l'on va à pied.**
Le coffre a fait ça au cadeau du jour, l'appareil à la carte postale, le
pas de la porte à la commande. Les trois objets chers font ça à la marée,
aux mots reçus, et au son de l'île.

Sept choses à ne pas défaire.

1. **Le prix est en SQL, et la vitrine n'est qu'un affichage de secours.**
   Tant que la migration n'est pas jouée, les trois s'affichent et l'achat
   répond que l'article n'existe pas. C'est le piège déjà écrit pour
   `slug_libre()` et les contraintes : deux listes qui divergent.
2. **Aucun n'est sur les îles bot** (`THEMES`). On en ramènerait un
   souvenir gratuitement, et la Boutique ne servirait plus à rien.
   *(`phare` et `boutique` l'étaient, contre cette règle : corrigé le
   19/09, voir la section « les îles de démonstration ».)*
3. **`etatObjet(o,t)` est le seul endroit qui dit ce qu'un dessin lit du
   jeu.** Quatre objets le font — coffre, boîte, girouette, carillon — et
   le cinquième passera par là aussi. Avant, `drawWorld()` appelait
   `coffreOuvert(o)` pour tous les objets du monde, et le prochain état
   aurait ajouté un `if` sur place.
4. **Les vignettes appellent le dessin sans état.** Un `etat` absent doit
   rendre une image posée, pas une image vide : d'où les `||0` de la
   girouette et du carillon, et le drapeau baissé par défaut.
5. **Chaque geste pose lui-même la clé de bulle de l'état d'après.** C'est
   la règle déjà écrite pour `porterLaCommande()` et `porte:livre`, et
   c'est le défaut que ce chantier a rouvert deux fois avant de la
   relire : le premier essai affichait « ta boîte est vide » à la place des
   mots qu'on venait de lire, parce que `proximity()` repassait à l'image
   suivante et recouvrait tout sous une clé différente. `releverLaBoite()`
   écrit sous `boite:vide`, qui est l'état d'après ; `lireLaGirouette()`
   sous `girouette`, la même clé que son invitation. Les deux ont été
   trouvés par `test/objets.mjs`, pas à la relecture.
6. **Le rang de la boîte et de la girouette est le même dans `agir()` et
   dans `proximity()`** — souvenir, chien, crotte, coffre, **boîte**,
   **girouette**, porte — et les deux passent par `boiteProche()` et
   `girouetteProche()`. La règle déjà écrite pour le chien et le coffre,
   et c'est elle que `test/objets.mjs` éprouve en premier : il lit ce que
   la plaque annonce, appuie sur `E`, et compare.
7. **La girouette marche chez les voisins, la boîte non.** La marée est la
   même pour tout l'archipel — c'est ce qui permet d'en parler — et le
   courrier est personnel, comme la porte et comme le coffre.

### Le carillon, et pourquoi il n'a pas de minuteur à lui

Une seule boucle, démarrée avec l'ambiance, qui regarde `world.objects` à
chaque tour et ne sonne que s'il y a un carillon. On pose, on efface, on
entre chez un voisin, on ressort : il n'y a rien à rebrancher ni à remettre
à zéro. **Un minuteur par objet posé, et la gomme laisserait sonner un
fantôme.**

Il sonne dans la pentatonique de `GAMMES[world.sky]`, deux octaves plus
haut et à moitié moins fort que la musique : plus bas, il se confondrait
avec elle et on aurait payé 50 shells pour quelque chose qu'on n'entend
pas. Il ne sonne pas en ambiance `silence` — `ambiance` n'existe pas
alors, et `cloche()` sort tout de suite. Et il appartient à **l'île**, pas
au joueur, comme l'ambiance elle-même : c'est ce qui en fait un objet
qu'on a envie de payer.

### Le comptoir porte le prix

Il ne le portait que dans le bouton, qui dit « il te manque 45 shells »
quand on ne peut pas encore payer — et « il te manque 45 » ne dit pas si
l'objet en vaut 50 ou 500. Le prix est maintenant dans la ligne du titre,
toujours.

### `test/objets.mjs`, et ce qu'il a trouvé

Cinquième harnais. Il pose l'objet **sous les pieds du bonhomme** plutôt
que de le faire marcher : viser une case demanderait de refaire la caméra,
et `pt()` est seul à avoir le droit de défaire cette transformation. La
case de départ, **(8,10)**, est mesurée et non déduite — le bonhomme
démarre devant sa porte, pas au `9,5 ; 11,5` de la déclaration de `hero`,
qui n'est que le repli.

Deux choses à savoir sur `faux-store.js`, qui a gagné deux crochets :

- `test:objets` sème des objets d'île, et `test:mots` des mots reçus. Les
  deux passent par le **vrai** chemin de chargement : un harnais qui
  écrirait directement dans `mine` n'éprouverait pas `normaliserMonde()`,
  et c'est là que se perdent les clés absentes de `mondeNu()`.
- Un mot semé **doit** porter `case_x`/`case_y`. `replanter()` en fait un
  panneau sur l'île, `proximity()` fait passer un panneau avant tout le
  reste, et sans case la distance vaut `NaN` : `NaN >= 0.95` est faux,
  donc le panneau gagnait partout et recouvrait la bulle de l'objet visé.
  Une heure perdue là-dessus.

## Pourquoi le site n'était pas en ligne — 19/09/2026, réglé le 20/09 au soir

**Deux secrets manquaient, et rien d'autre.** `CLOUDFLARE_API_TOKEN` et
`CLOUDFLARE_ACCOUNT_ID` ont été ajoutés dans *Settings → Secrets and
variables → Actions* le 20/09 au soir, et le run suivant est passé de bout
en bout en **22 secondes** — les deux `[ -z … ]` du premier pas, `build.sh`,
`npx wrangler`, la compilation du Worker, le déploiement. Le contrôle
« Vérifier le déploiement » a confirmé dans la minute : empreinte servie =
empreinte du dépôt, octet pour octet.

**Un push sur `main` publie donc, désormais.** Tout ce qui suit dans cette
section reste écrit parce que ce sont des pannes qu'on peut rouvrir, pas
parce que le site attend encore quelque chose.

La voie à la main marche toujours, et elle reste la bonne pour un correctif
qu'on ne veut pas faire passer par GitHub :

    ./build.sh && npx wrangler pages deploy dist \
      --project-name dansisland --branch main

C'est un projet Pages en **upload direct**, pas une intégration Git : ce
n'est pas un contournement, c'est le chemin normal de ce projet. `build.sh`
affiche l'empreinte et le commit juste avant de publier — **les lire** est
ce qui distingue une mise en ligne d'une mise en ligne du mauvais code, et
c'est la leçon du 20/09 écrite plus bas.

### Le second défaut, non résolu, et les trois fausses pistes

À côté de ça, le workflow de déploiement finit en `action_required` en
deux secondes, **avec zéro job créé** — donc bloqué avant d'être planifié.
Ce n'est ni un secret manquant (le premier pas l'aurait écrit), ni un
échec de build : rien ne démarre. Sur le même push, à la même seconde,
`epreuves.yml` et `verifier-le-deploiement.yml` passent.

Quatre hypothèses éprouvées, **trois fausses**, et elles sont écrites ici
pour qu'on ne les reprenne pas :

1. **L'action tierce `cloudflare/wrangler-action@v3.** Retirée au profit
   de `npx wrangler`. Aucun changement. **Faux.**
2. **L'identité du fichier** — son chemin, donc son workflow id. Renommé
   `deployer.yml` → `mettre-en-ligne.yml`, id neuf, run #1 bloqué pareil.
   **Faux.**
3. **La lecture d'un secret.** Deux sondes identiques à une ligne près,
   l'une lisant `secrets.CLOUDFLARE_API_TOKEN` et l'autre non : les deux
   démarrent et réussissent. **Faux.**
4. **`toJSON(secrets)`**, qui sérialisait tout le contexte des secrets
   pour en lister les noms. **C'était ça — vérifié.** Retiré, le run
   suivant est passé en `queued`, a tourné, et a échoué à son premier pas
   comme prévu faute de secret Cloudflare. GitHub refuse de planifier un
   workflow qui sérialise le contexte `secrets` en entier ; il ne le dit
   nulle part et le bloque **avant** le job, donc sans aucun log.

### Où en est le déploiement, mesuré le 19/09 au soir

Repris et vérifié en fin de journée, plutôt que supposé depuis le matin :
le workflow **n'est plus bloqué**. Les douze derniers runs se planifient,
tournent, passent le `checkout`, et s'arrêtent tous au même pas — « Les
secrets sont-ils là ? » — avec les quatre suivants en `skipped`.

    1 success  Set up job
    2 success  Run actions/checkout@v4
    3 failure  Les secrets sont-ils là ?
    4 skipped  Préparer dist/
    5 skipped  Publier sur Cloudflare Pages

Donc : **il ne manquait que les deux secrets Cloudflare.** Le diagnostic
tenait, et il n'a pas eu besoin d'être refait : les secrets ajoutés le
20/09 au soir, le run suivant est passé sans qu'une ligne du workflow
change. Une panne dont on sait nommer la cause exacte se règle par un
geste, pas par une enquête de plus.

Ce qui a servi ce soir-là, et qui vaut pour la prochaine fois : **le log du
run dit lequel des deux manque.** Le run 27 affichait `JETON: ***` et
`COMPTE:` vide — donc le jeton était déjà en place et il ne restait que
l'identifiant de compte. Demander « lequel as-tu ajouté ? » aurait coûté un
aller-retour ; le log le disait déjà.

Et un **Account ID n'est pas un secret** : c'est un identifiant, il se lit
dans `npx wrangler whoami` et il peut circuler. Un **jeton d'API**, si : il
ne doit jamais être collé dans une conversation, où il resterait écrit. La
distinction est ce qui permet de débloquer ce genre de chose vite sans rien
exposer.

Le contrôle « Le site répond, et il est complet » était rouge tant que
personne n'avait déployé, et il avait raison : il compare l'empreinte du
dépôt à celle de la page servie. Il est vert depuis le 20/09 au soir.

**Ne jamais remettre `toJSON(secrets)` dans un workflow de ce dépôt.**
Lister les noms des secrets — une commodité que j'avais ajoutée pour
rendre le diagnostic plus clair — a coûté treize exécutions muettes, et
c'est précisément le genre de panne que ce workflow existait pour
supprimer. Les deux `[ -z ... ]` du premier pas disent ce qui manque, et
c'est assez.

La leçon est celle déjà écrite pour l'aller-retour du 18/09, et je l'ai
rappris à mes dépens : **mesurer d'abord.** J'ai retiré l'action tierce
sur une hypothèse plausible et non vérifiée, exactement comme le dossier
`functions/` avait été sorti la veille — et, comme la veille, ça n'a rien
changé. Ce qui a fait avancer, c'est la paire de sondes : deux fichiers
identiques à une ligne près. Une comparaison qui isole **une** variable
vaut dix relectures.

## Les verrous de bulle, et le coffre qui se taisait — 19/09/2026

Deux défauts de la même famille, trouvés en peaufinant, tous deux
attrapés par `test/objets.mjs` avant d'être corrigés — et le second était
**écrit dans ce fichier depuis le 17/09** sans que personne le reprenne.

### Le ménage des verrous ne peut plus se périmer

Le bas de `proximity()` levait les bulles dont la clé commençait par l'un
des cinq préfixes d'une **liste écrite à la main** :
`['sign','souv','porte','chien','coffre']`. Les trois clés ajoutées le
19/09 — `crotte`, `boite:*`, `girouette` — n'y étaient pas. Conséquence
exacte : **leur bulle restait à l'écran pour toujours** dès qu'on
s'éloignait de l'objet. C'est la faute déjà nommée pour le chien — « un
verrou de bulle qui survit à son état, c'est un message qui reste à
l'écran pour toujours » — et elle est revenue par la porte de derrière :
la règle était écrite, la liste ne l'était pas.

Le remplaçant est un **registre qui se remplit tout seul** : `bulle()`
inscrit sa clé dans `VERROUS_PROX`, et le ménage lève ce que le registre
connaît. Une bulle de proximité nouvelle est couverte le jour où elle est
écrite, sans que personne ait à y penser. `verrouProx(k)` rend sa clé,
pour que les constantes s'écrivent en `const`.

**`baladeloin` en reste dehors, et gratuitement** : il ne passe pas par
`bulle()` mais par `say()` en direct, donc il ne s'inscrit jamais, et
c'est toujours `taireLattente()` qui le lève. La règle du chien survit au
changement sans une ligne pour la tenir.

### Le coffre recouvrait son propre cadeau

« Le coffre a encore ce défaut-là, lui », écrit le 17/09 à propos de la
clé de bulle de `porterLaCommande()`. C'était vrai, et ça restait vrai :
`ouvrirCadeau()` finissait par un `say(msg)` **sans verrou**, donc
`proximity()` repassait à l'image suivante, voyait un coffre désormais
vide, et recouvrait le « +5 shells » par « tu l'as déjà ouvert
aujourd'hui » — avant qu'on ait eu le temps de lire ce qu'on avait gagné.
Le contrôle 8 de `test/objets.mjs` le reproduit mot pour mot quand on
remet le défaut.

`ouvrirCadeau(surLeCoffre)` prend donc un paramètre, et les deux clés du
coffre existent (`coffre:plein`, `coffre:vide`) comme celles de la boîte.
**Le paramètre n'est pas une commodité** : depuis le bouton du panneau,
personne n'est sur un coffre, donc le ménage lèverait la bulle à l'image
suivante et le message n'aurait fait que clignoter. C'est l'appelant qui
sait où est le doigt.

### Deux choses apprises sur le harnais

1. **Un contrôle peut passer pour la mauvaise raison.** Le premier essai
   du contrôle « s'éloigner efface la bulle » passait — parce qu'en
   marchant le bonhomme tondait une touffe, et ce message-là recouvrait
   la bulle sans rien prouver. Il attend maintenant **2,8 s** : un
   message de tonte n'a pas de verrou et s'efface seul à 2,2 s, un verrou
   survivant ne s'efface jamais. Après l'attente, un murmure encore
   allumé *est* le défaut.
2. **Un faux trop gentil n'éprouve rien.** `bourseCadeau()` de
   `faux-store.js` rendait la bourse inchangée : `cadeauDispo()` restait
   vrai, et le contrôle du recouvrement passait pour la mauvaise raison.
   Le faux tient maintenant le contrat du serveur — il marque le jour et
   rend `gain`, `serie` ou `deja`. **Quand un contrôle porte sur ce qui
   se passe *après* un appel, le faux doit changer d'état comme le vrai.**

## Les îles de démonstration ne portent plus rien de payant — 19/09/2026

La règle est écrite depuis le 16/09 : « ne pas mettre d'objet de la
boutique sur les îles bot : on en ramène un souvenir gratuitement, et la
boutique ne sert plus à rien. » Elle était enfreinte à **deux** endroits,
et depuis le début.

    THEMES                port    → phare     (30 shells)   →  crabe
                          village → boutique  (35 shells)   →  coffre
    DEMO, écrites à la    pins    → phare                   →  rocher
    main                  cactus  → boutique                →  barriere

Rien ne le signalait, et c'est ce qui rend ce défaut instructif : un
souvenir porte `o.de`, donc `normaliserEconomie()` ne crédite pas le
pinceau. Il n'y a ni erreur, ni trace, ni pinceau débloqué — juste un
objet à 30 shells qu'on ramène en allant se promener.

Le port garde son caractère avec un crabe sur ses rochers, le village
avec un coffre au milieu de la place, « Îlot Cactus » avec un enclos de
bois, et « Pins-Noirs » avec un second rocher sur sa côte nord. Vérifié
en rendant les îles, pas en relisant la liste.

### Ce que ce défaut a appris sur les contrôles

Le contrôle 9 de `test/objets.mjs` est **statique** : il lit `BOUTIQUE`,
`THEMES` et le bloc `DEMO` dans la source et croise les listes. Un
contrôle qui visiterait les îles n'en couvrirait jamais vingt, et celui-ci
ne peut pas se périmer quand la boutique s'agrandit.

**Mais mon premier essai ne lisait que `THEMES`, et il passait au vert.**
Ce sont les îles écrites à la main qui l'ont démenti — repérées sur une
capture d'écran, pas par le test. Un contrôle qui ne couvre qu'une des
deux sources dit « tout va bien » avec assurance, et c'est pire que pas de
contrôle du tout : il ferme la question.

La leçon, à côté de « mesurer d'abord » : **vérifier que le contrôle voit
tout ce qu'il prétend voir.** Ici, la preuve tenait en une ligne — compter
ce qu'il a lu (`31` articles, `5` thèmes, `16` types posés à la main) et
refuser un compte qui sent le vide. Les trois `c.dit()` de comptage sont
là pour ça, pas pour décorer.

## Les sept rangs, et les listes qui doivent rester d'accord — 19/09/2026

### `proximity()` ne passait pas par les sondes qu'elle prétendait utiliser

Ce fichier écrit depuis le 16/09 que `agir()` et `proximity()` doivent
lister les mêmes choses dans le même ordre, et il l'a répété pour le
chien, pour le coffre, pour la crotte — « les deux passent par
`crotteProche()` ». **C'était faux.** `proximity()` testait
`objet && objet.t === 'chien'` et `objet && objet.t === 'crotte'` en
ligne, où `objet` est le **dernier** objet trouvé sous les pieds par la
boucle du haut.

Les deux branches faisaient bien la même chose, parce qu'aucune case ne
porte deux objets — la pose refuse une case prise, `leChienSarrete()`
aussi, et un souvenir va sur « une case libre ». Mais rien ne le
garantissait, et une case à deux objets aurait donné exactement ce que
l'accord existe pour empêcher : la plaque annonce un geste, la touche en
fait un autre.

Les deux branches passent maintenant par `chienProche()` et
`crotteProche()`. La règle n'est plus une consigne, c'est la structure.

### Le contrôle qui couvre les sept rangs sans faire un pas

Les contrôles 2 à 8 de `test/objets.mjs` éprouvent **trois rangs sur
sept** : il faudrait amener le bonhomme devant chaque chose, et un chien
se promène. Le contrôle 10 prend le problème par la source — il extrait
le corps des deux fonctions, retire les commentaires (qui citent les
sondes sans les appeler), et compare les deux séquences :

    agir()      : souvenir → chien → crotte → coffre → boîte → girouette → porte
    proximity() : souvenir → chien → crotte → coffre → boîte → girouette → porte

Il compte aussi les sondes : un rang oublié ou dupliqué se voit avant
l'ordre. Éprouvé en inversant vraiment deux rangs — un premier essai
déplaçait seulement une garde, l'ordre ne changeait pas, et le contrôle
passait à juste titre. **Une fausse panne qui ne change pas ce qu'on
mesure ne prouve rien.**

### Les trois listes qui doivent rester d'accord

Le contrôle 11 croise, dans la source :

    la vitrine (BOUTIQUE)     avec   les lignes de `catalogue` des .sql
    GAMMES                    avec   les valeurs de `sky`
    faux-store.js             avec   les appels à `store.*` d'index.html

Les trois étaient d'accord quand elles ont été écrites — vérifié avant,
aucune ne corrigeait quoi que ce soit. Elles sont là pour le jour où
elles ne le seront plus, et elles répondent en une seconde plutôt
qu'après un achat refusé chez un joueur.

Deux choses apprises en les écrivant :

1. **Un faux positif use un contrôle aussi sûrement qu'un faux
   négatif.** Le premier essai comptait `store.js` — le nom de fichier du
   chemin d'import — comme un export manquant, et rendait le contrôle
   rouge pour rien. Un `(?<![/\w])` suffit ; sans lui, on finit par ne
   plus lire ce que le contrôle dit.
2. **Auditer avant d'écrire le garde-fou.** Les trois croisements ont été
   mesurés d'abord, hors harnais : 31 articles contre 31 lignes SQL,
   3 gammes contre 3 heures, 33 appels tous exportés. Écrire un contrôle
   en espérant qu'il trouve quelque chose, c'est ne pas savoir s'il
   marche quand il passe.

## Un souvenir décore, il ne fonctionne pas — 19/09/2026

Trou ouvert le matin même par les trois objets chers, et que je n'avais
pas pesé en les écrivant.

Le souvenir est une copie signée `o.de`, posée sur une case libre de sa
propre île. Jusqu'au 19/09, **tous** les objets de la boutique étaient
décoratifs : en ramener un de chez un ami coûtait au vendeur une
décoration, rien de plus. Une girouette, un carillon et une boîte aux
lettres, eux, *font* quelque chose — donc une seule visite chez quelqu'un
qui en possède un suffisait à obtenir gratuitement les trois articles les
plus chers de la Boutique.

C'est exactement la règle des îles bot — « on en ramène un souvenir
gratuitement, et la boutique ne sert plus à rien » — qui revenait par la
porte des vrais voisins. Et c'est la double vérification du compagnon,
transposée : **posséder le dessin ne suffit pas.**

Quatre choses à ne pas défaire :

1. **On ne reprend rien.** Le souvenir reste posé, se regarde, se
   déplace, se montre. Il ne fait simplement pas le travail de celui
   qu'on achète. C'est la même règle que le cadre glissé contre le mur
   plutôt qu'effacé : on ne reprend pas ce qui a été posé.
2. **`FONCTIONNEL` vit à côté d'`EQUIPEMENT`**, et pour la même raison :
   c'est une propriété du type, dans le catalogue. **Tout nouvel objet
   payant qui fait quelque chose doit y entrer**, sinon une visite chez
   un ami le donne gratuitement.
3. **`estSouvenir(o)` est le seul test**, et les trois sondes le lisent —
   `boiteProche()`, `girouetteProche()`, `aUnCarillon()`. Pas de cas
   particulier pour la visite : un objet qui porte `o.de` ne fonctionne
   nulle part, y compris celui que l'hôte a lui-même rapporté d'ailleurs.
4. **Le refus tombe là où est le doigt**, deux fois. La bulle de la
   branche « souvenir rapporté » de `proximity()` — qui existait déjà —
   nomme l'article et **donne son prix**. Et `ramasserSouvenir()` le dit
   au moment du ramassage, le seul instant où le doigt est sur l'objet :
   un carillon n'a pas de bulle, et un son qui ne vient jamais ne
   s'explique pas au pied de l'objet.

### Trois assertions fausses, et ce qu'elles apprennent

Le contrôle « 9 bis » a échoué trois fois avant de passer, et **les trois
échecs venaient du harnais, pas du jeu** :

- il cherchait l'absence du mot « shell » après `E` — mais la bulle du
  souvenir **porte le prix**, donc elle contient ce mot. L'assertion
  tombait sur son propre texte. Elle regarde maintenant ce que le *vrai*
  objet aurait produit : les mots reçus, ou l'état de la mer ;
- il cherchait `C’est un souvenir` avec l'apostrophe en caractère, alors
  que le fichier la porte en **échappement** `\u2019`. Mesuré, pas deviné.

La leçon est la même que pour `store.js` compté comme export manquant :
**une assertion se vérifie contre ce que le fichier contient vraiment**,
pas contre ce qu'on croit y avoir écrit.

## L'audit des invariants, et le contrôle qui avait l'angle mort du bug — 19/09/2026

Plutôt que de chercher au hasard, j'ai relu les **affirmations** de ce
fichier contre le code. C'est ce qui avait payé deux fois dans la journée
— la crotte qui ne passait pas par sa sonde, le phare sur les îles bot.

### Ce qui tient, et qui n'a donc rien coûté à vérifier

    TROUVAILLES         l'ordre du client == celui du tableau SQL      ✅
    mondeNu()           ni bourse, ni achats, ni sac, ni album         ✅
    valeurs de tuile    toutes sur un chiffre (encode/decode)          ✅
    #hud-name.retour    l'emporte par spécificité sur le portrait      ✅
    le voile d'accueil  mêmes alphas dans les trois déclarations       ✅

Deux remarques sur la méthode. La première : mon contrôle du voile a
d'abord dit « pas d'accord » — les trois déclarations **n'ont pas** la
même couleur, et c'est normal, l'une est crème et les deux autres bleu
nuit. Ce sont les **alphas** qui doivent s'accorder, et ils s'accordent.
Un contrôle mal posé accuse à tort aussi facilement qu'il absout à tort.

La seconde : `.tourne` porte bien un `display` d'auteur, contrairement à
ce que ce fichier disait — mais il est gardé par `:not([hidden])`. La
règle tenait ; c'est sa formulation qui était fausse, et elle est
corrigée plus haut.

### Le contrôle 12, et pourquoi sa première version ne valait rien

Le défaut du 17/09 — `.zoom button{display:grid}` qui l'emportait sur le
`[hidden]` du navigateur, et un bouton d'appareil photo visible avant
tout achat — avait laissé une **consigne** : « toute nouvelle règle qui
donne un `display` à un élément qu'on cache par `hidden` doit prévoir son
`[hidden]` ». Une consigne, donc quelque chose que personne ne relit.

Ma première mesure était une regex : pour chaque élément caché,
construire ses sélecteurs depuis son `id` et ses classes, et chercher une
règle qui lui donne un `display` sans garde. **Elle ne trouvait pas le
bug d'origine**, parce que la règle fautive vise un **ancêtre**
(`.zoom button`) et non l'élément. Elle avait donc exactement l'angle
mort du défaut qu'elle visait — et elle passait au vert en le disant.

La version qui compte demande au **navigateur** : elle cache chaque
élément, lit `getComputedStyle().display`, et remet l'état d'avant.
Le navigateur résout toute la cascade — spécificité, ordre, media
queries — et ne peut pas se tromper sur ce que voit l'œil. Deux tailles,
parce qu'une règle peut ne mordre que sous media query. Éprouvée en
retirant la garde : elle rend `photo-btn:grid`, aux deux tailles.

**La leçon, et c'est la troisième fois de la journée :** quand une mesure
et son objet raisonnent de la même façon, la mesure hérite de ses angles
morts. Une regex qui cherche des sélecteurs ne verra jamais ce qu'un
moteur CSS calcule. Quand un navigateur peut répondre, c'est à lui qu'il
faut demander.

*(Et un rappel du comptage : la première version trouvait **zéro**
élément caché, parce qu'elle découpait la source à `indexOf('<body')` —
or ce fichier n'a pas de balise `<body>`, donc `slice(-1)`. Elle
déclarait l'invariant tenu sur un caractère. C'est l'assertion de
comptage qui l'a rattrapée.)*

## On entre enfin chez soi, et on y lit du français — 19/09/2026

Aucune migration, **aucune clé de plus dans `mondeNu()`** : c'est du zoom et
des articles. Deux défauts trouvés en **entrant** dans la maison et en
regardant, pas en relisant le code — et c'est tout ce qui les distingue des
quinze relectures qui ne les avaient pas vus.

### La pièce ne remplissait pas le cadre

Mesuré à l'entrée : le salon occupait **65 %** de la largeur du cadre, la
chambre et l'atelier **51 %**, et quatre cinquièmes des pixels étaient du
papier vide. On entrait chez soi et il n'y avait presque rien à voir.

`fitDedans()` calculait pourtant le bon zoom **depuis le début**. Il
n'était branché qu'en **plafond** (`zPlafond()`), jamais en zoom visé :
dedans, `zoomAuto()` rendait `zPlancher()`, c'est-à-dire 1, et le plafond
ne mord que par le haut. Une fonction juste, appelée au mauvais endroit,
ne se voit pas à la lecture — les deux lignes ont l'air de coopérer.

    function zoomAuto(){
      if(dedans) return zPlafond();
      return Math.max(zPlancher(), CASE_MIN/(TW*(echelleEcran||1)));
    }

Remesuré : **salon 86 %, chambre et atelier 78 %**, et rien ne touche le
bord. Les marges de `fitDedans()` (28 px en largeur, 44 en hauteur) sont ce
qui permet d'en faire le zoom visé sans couper un mur : **ne pas les
réduire pour gagner quelques pour cent**, elles sont la différence entre
« ça remplit » et « ça déborde ».

Et `zoomVoulu()` garde `zPlafond()` en borne haute, ce qui est une vraie
protection et pas une redite : une panne posée exprès — `zoomAuto()`
multiplié par 1,35 dedans — n'a **rien changé à l'image**, parce que le
clamp l'a absorbée. Pour faire sortir un mur du cadre, il a fallu attaquer
`fitDedans()` lui-même.

Dehors, rien ne bouge : la branche est gardée par `dedans`.

### « Te voilà dans le chambre »

Vu sur une capture, pas dans le code. Quatre phrases collaient un article
**en dur** devant un nom de pièce variable :

    Te voilà dans **le** chambre        Passer **au** chambre
    Une porte vers **le** atelier       **Le** chambre fait 6x5 cases

Il y a trois pièces et trois genres — masculin, féminin, et masculin devant
voyelle, qui élide. L'article est donc une **propriété de la pièce**, au
même titre que son nom et sa taille, et il vit dans `PIECES` :

    {k:'salon',   n:'Salon',   art:'le ', a:'au '   }
    {k:'chambre', n:'Chambre', art:'la ', a:'à la ' }
    {k:'atelier', n:'Atelier', art:'l’',  a:'à l’'  }

Une quatrième pièce ajoutée un jour porte son `art` et son `a`, et c'est
tout ce qu'elle a à porter.

### Ce que la fausse panne a révélé, et qui était le vrai défaut

`laPiece()` et `aLaPiece()` existaient. En posant la panne — `laPiece()`
rendant « le » pour tout le monde — **deux des quatre phrases ont continué
de dire juste**. Elles ne passaient pas par la fonction du tout : elles
recollaient `pieceDef(k).art` devant `'<b>'+nom+'</b>'`, chacune à sa
façon, et la troisième rattrapait le gras après coup avec un `.replace()`.

Trois orthographes d'une même idée, donc **trois endroits à tenir
d'accord** le jour où une quatrième pièce arrive — exactement ce que ce
fichier interdit partout ailleurs. Et rien ne le signalait, puisque les
trois rendaient le bon texte.

`laPiece(k, maj, gras)` a donc gagné un troisième paramètre qui met le
**nom** en gras, jamais l'article — c'est ce dont les trois phrases avaient
besoin, et c'est pour l'avoir écrit à la main qu'elles avaient divergé.
C'est le même choix que le `saut` de `drawChar()` et l'`ouvert` de
`DRAW.coffre` : un argument optionnel coûte moins qu'une seconde fonction.

**L'invariant tenu est donc `art` et `a` ne se lisent que dans leurs deux
fonctions**, et c'est ça que le harnais mesure — pas la phrase telle
qu'elle est écrite, qui ne prouverait que ma capacité à la recopier.

### `test/dedans.mjs`, sixième harnais

Quatre sections, et **les quatre ont été éprouvées en remettant une vraie
panne**, une par une :

    zoomAuto sans sa branche dedans   → 65 % / 51 %, les chiffres d'avant
    les marges de fitDedans mangées   → 100 %, « ça touche le bord »
    laPiece rendant « le » partout    → six rouges là où il y en avait trois
    une phrase qui recolle l'article  → la section 3 la nomme
    « Chez toi · » remis dans dedans  → écart vertical 42 px, à 360 px seul

Trois choses apprises, et les trois sont des erreurs de **mesure**, pas de
jeu :

1. **Une panne absorbée par un clamp ne prouve rien.** La première
   tentative de faire déborder la pièce multipliait `zoomAuto()` ; le
   `Math.min(zPlafond(), …)` de `zoomVoulu()` la rendait invisible. Le
   contrôle passait à juste titre, et je n'avais rien éprouvé. C'est la
   leçon déjà écrite le 19/09 pour l'inversion de deux rangs qui ne
   changeait pas l'ordre.
2. **Trois tours qui rendent trois fois le même nombre ne mesurent
   peut-être qu'une chose.** Ma section 4 entrait dans les trois pièces et
   lisait « 22 px de marge » à chaque fois — parce que la plaque Son est
   poussée au bord et n'y bouge jamais. Ce qui se resserre quand le nom
   s'allonge, c'est le **trou juste avant elle**. Depuis, la section lit ce
   trou, **et** vérifie sur la plaque dans quelle pièce elle est : sans ça,
   elle aurait mesuré trois fois le salon en ayant l'air de prouver
   quelque chose.
3. **Le salon est le nom le plus court des trois**, donc le cas le plus
   favorable, et c'était le seul que je mesurais.

Mesuré au passage, et c'est le cas que l'avertissement des 360 px vise
depuis le 16/09 : **dedans, on est à quatre plaques** — retour, pièce,
bourse, son. Ça tient, avec 8 px entre voisines et 22 de marge, dans les
trois pièces et aux deux tailles. « Chez toi » remis devant le nom de la
pièce fait repasser la quatrième à la ligne, **à 360 px seulement** : la
règle du 16/09 est juste, et elle a maintenant sa mesure plutôt que sa
consigne.

## La règle qui mesurait la mauvaise largeur — 19/09/2026

Vu sur une capture d'écran large, pas dans le code : dans le bandeau du
guide, « Passer » tombait **seul** sous « Suivant », et le bandeau montait
à 105 px.

Or la feuille de style porte, depuis le 18/09, une règle écrite exprès pour
que les deux tiennent ensemble :

    @media (max-width:520px){ .guide .pas{display:none} .guide .quoi{flex:1 1 100%} }

Elle marchait — sur un téléphone. **Ce qui serre ce bandeau, c'est la
largeur du panneau, pas celle de la fenêtre.** La colonne de droite fait
360 px sur un écran de 1280 : la règle ne se déclenchait donc jamais là où
elle servait. Mesuré aux quatre tailles : séparés de 47 px sur grand écran,
ensemble partout ailleurs.

C'est la même famille que `fitDedans()` branché en plafond et que les deux
phrases qui ne passaient pas par `laPiece()` : **une règle juste, dont la
condition ne porte pas sur ce qu'elle protège.** Aucune des trois ne se
voit à la lecture, parce que chacune a l'air de faire son travail.

La correction ne demande plus de largeur à personne. `--pasw` est la place
que prend le numéro, gouttière comprise, et la phrase prend exactement le
reste de sa rangée :

    .guide{ --pasw:35px }                  /* 25 de pastille + 10 de gouttière */
    .guide .quoi{ flex:1 1 calc(100% - var(--pasw)) }

Les points et les deux boutons descendent donc ensemble **à n'importe
quelle largeur**. Deux choses à tenir :

1. **`--pasw` doit suivre `gap` et `.pas`**, et c'est pour ça que c'est une
   variable redéclarée à chaque palier plutôt que le même nombre recopié
   trois fois. À 700 px la pastille passe à 21 px et la gouttière à 7, donc
   `--pasw:28px` ; à 520 px la pastille s'en va, donc `0`.
2. **Le palier de 520 px ne s'occupe plus que de la pastille.** Il ne
   reste plus rien de la mise en page dedans : elle est vraie partout, ou
   elle est fausse partout.

Gagné au passage : le bandeau perd 18 px sur grand écran (105 → 87) et
16 px en paysage court (85 → 69).

### Le harnais ne pouvait pas le voir, et c'est le vrai enseignement

`etroit.mjs` éprouve 360 px et 780x360 — les deux tailles que ce dépôt
exige. **Les deux étaient vertes**, et elles avaient raison de l'être : le
défaut n'existait qu'au-dessus de 520 px.

Un harnais qui n'éprouve que les tailles étroites raisonne comme la règle
fautive : il regarde la fenêtre. Il hérite donc de son angle mort — c'est
mot pour mot la leçon du contrôle 12 de `test/objets.mjs`, où une regex qui
cherchait des sélecteurs ne pouvait pas voir ce qu'un moteur CSS calcule.

La section ajoutée regarde donc **les deux bouts**, 1280 px compris. Et
elle ouvre le bandeau pour de bon : `aide.mjs` sème `dansisland:guide = 4`
par défaut, pour que l'accueil ne gêne pas les autres harnais, donc il faut
le remettre à zéro et cliquer « créer mon île » — sans quoi on mesure un
bandeau absent en croyant mesurer sa mise en page.

*(Deux fausses pistes écartées avant celle-là, et toutes deux par la
mesure. **Le guide n'avance pas tout seul** : je l'ai cru en le voyant au
pas 4 sur une capture, c'était la graine d'`aide.mjs`. Et **la caméra ne
dérive pas** : la boîte englobante de la mer est décentrée de 37 px, mais
c'est la bosse de `wMer()`, pas le cadrage — le centroïde eau+herbe tombe à
1,2 px du centre du cadre. Une boîte englobante mesure le contour le plus
saillant ; un centroïde mesure où est la masse. Pour juger d'un centrage,
c'est le second qu'il faut.)*

## « Voisins » ne montrait aucun voisin — 19/09/2026

L'onglet s'ouvrait sur la commande du jour, puis la carte postale, puis
l'invitation : plus de 500 px de texte avant la première île. Mesuré, dans
les trois mises en page :

    grand écran     1re île à y=670   panneau de 660 px   hors de vue
    portrait 390    1re île à y=656   panneau de 625 px   hors de vue
    paysage court   1re île à y=833   panneau de  73 px   hors de vue

Et au pire moment : le **quatrième pas du guide** dit « va marcher sur
l'île d'un autre », et le moyen de le faire était sous un écran de
défilement. Tant que le sac est vide — donc pour tout nouveau venu — la
commande ne propose personne, elle explique.

C'est le défaut déjà corrigé le 19/09 pour le bloc Compagnon, « à un écran
de défilement du haut », et la règle est la même : **ce qu'un onglet est
doit être en haut de cet onglet.**

L'archipel passe donc en deuxième, juste après la commande. Ce que ça ne
change pas, et qui reste raisonné comme le 18/09 :

1. **La commande garde la tête.** C'est la raison d'y aller *aujourd'hui*,
   et elle se périme à minuit.
2. **La carte reste avant l'invitation.** Elle descend seulement sous les
   îles : elle se construit toujours au même endroit dans `buildVoisins()`,
   elle se **pose** plus bas — d'où le `DocumentFragment`.

Résultat : la première île passe de y=670 à **y=333**, visible sans défiler
sur grand écran comme en portrait.

**En paysage court, non, et ce n'est pas cet ordre-là qui le décidera** :
le panneau n'y fait que 73 px de haut. Mesuré à 780x360 — carte de
connexion 156 px, bandeau du guide 69, onglets 62, et il reste 73 pour le
panneau. La carte de connexion prend à elle seule 43 % de la hauteur de
l'écran, deux fois ce que reçoit le panneau. C'est noté ici pour ce que
c'est : un vrai défaut d'ergonomie, mesuré, pas encore corrigé.

Le contrôle de `etroit.mjs` distingue les deux : **l'ordre** des blocs est
vérifié aux quatre tailles, la **visibilité sans défiler** seulement là où
le panneau a la place. Affirmer la seconde en paysage court, ce serait
demander au test de mentir.

### La carte de connexion prenait la place du jeu

Corrigé dans la foulée, puisque c'est ce que la mesure précédente avait
mis au jour. À 780x360, `#compte` faisait **156 px des 360** de l'écran :
six enfants empilés par `#compte>span{flex:1 1 100%}`, deux fois ce qui
restait au panneau.

Elle a deux états, et un seul a besoin de place. **Tant qu'il reste
quelque chose à saisir** — une adresse e-mail pour se connecter, ou
l'adresse de l'île à choisir — elle doit s'étaler. Une fois tout réglé,
elle ne fait plus que dire qui on est.

`pose` marque le second, et **il se déduit** : la carte porte-t-elle encore
un `input` ? `peindreCompte()` a quatre branches et sort par `return` au
milieu de trois d'entre elles — un drapeau posé à la main dans quatre
branches, c'est une branche qui l'oubliera. D'où le découpage en
`peindreCarteCompte()` + `formeDuCompte()`.

Ce qui part en paysage est marqué `redite` : **ce qui existe ailleurs.**
L'adresse de l'île et son bouton de copie sont dans l'onglet Voisins, sous
« 🔗 Copier mon lien ». Ce qui reste est ce qui n'est nulle part ailleurs —
le nom, la pastille d'état, « Se déconnecter ». Ne pas marquer `redite` un
élément dont ce serait le seul endroit.

    carte de connexion   156 px  →   61 px
    panneau               73 px  →  168 px

**On se connecte toujours en paysage**, et c'est la raison d'être du
`display:contents` sur `.stage` : rien de tout ceci ne touche l'état « il
reste à saisir ». Le contrôle l'éprouve pour de bon — le faux serveur rend
toujours un compte complet, donc il **remet un champ à la main** et vérifie
que l'état « posé » tombe, que le champ est large, et que ce qui avait été
caché revient. Un harnais qui ne sait pas produire un état doit le
fabriquer et le dire, pas faire comme si.

Ce que ça ne règle pas : la première île reste hors de vue en paysage
court, parce que le bloc de la commande y fait 322 px à lui seul, soit plus
que les 168 px du panneau. Le panneau a plus que doublé, ce n'est pas la
même chose que d'avoir de la place.

**Debout aussi**, et c'était la même cause. `.compte>span{flex:1 1 100%}`
existe, à 430 px, pour faire de la place au **champ** — mais quand il n'y a
plus de champ, il empilait cinq rangées : nom, adresse, Copier, état, Se
déconnecter, soit **167 px**, sur un téléphone où le cadre du jeu n'en fait
que 234. La carte faisait les trois quarts de la taille du jeu, pour dire au
joueur sa propre adresse.

Pas le même remède, en revanche : en portrait **rien ne disparaît**, les
rangées se remettent simplement à la file. Il y a la place pour deux, et
l'adresse de l'île est ce qu'on partage. C'est l'écran couché, et lui seul,
qui doit en plus cacher les `redite` : sa colonne ne fait que 235 px.

    carte, portrait 375x667   167 px  →  77 px
    cadre du jeu              y=240   →  y=150

### Un seuil calibré sur une machine tombe sur une autre

Le contrôle de la carte couchée est passé ici et a **échoué en CI**, sur la
seule ligne qui exigeait `panneau >= 150` : le runner rend le texte un peu
plus large, la carte y fait 67 px au lieu de 61 et le panneau 143 au lieu de
168. Le gain était pourtant bien là — 73 → 143.

Le défaut tenait en une phrase, « deux fois plus de place pour dire qui on
est que pour jouer », et c'est donc un **rapport** qu'il fallait vérifier :
`panneau > carte`. Vrai à 168/61 comme à 143/67, faux à 73/156. L'écart
entre deux mesures du même écran ne dépend pas de la police ; un nombre
absolu, si. Un plancher large (120 px) reste à côté, pour le cas où tout
rétrécirait en gardant le rapport.

C'est la troisième fois de la journée qu'une mesure raisonne comme son
objet : la regex qui cherchait des sélecteurs, le harnais qui ne mesurait
que des fenêtres étroites, et maintenant le seuil qui ne connaissait qu'une
police.

## « Un fleur de chez Lila » — 19/09/2026

Lu à l'écran en allant visiter un voisin, pas dans le code. Trois phrases
collaient un article en dur devant un nom d'objet variable, et **15 des 37
objets sont féminins** : une échoppe, une tortue, une balançoire, une
montgolfière, une boîte aux lettres… La phrase de la visite est celle qu'on
voit le plus souvent de tout le jeu.

C'est mot pour mot le défaut de « Te voilà dans le chambre », corrigé le
matin même, réapparu ailleurs. Écrit une fois de plus, donc : **un article
en dur devant un nom qui change ne peut pas être juste.**

Le remède est le même que pour les pièces. Le genre est une propriété du
**type**, dans le catalogue — troisième case de la ligne, `'f'` :

    ['fleur','Fleur','f']      ['rocher','Rocher']

Les deux consommateurs d'`OBJ_GROUPS` lisent par position (`[v]`, `[v,n]`),
donc une case de plus ne coûte rien. Quatre phrases passent maintenant par
`unObjet(t,maj,gras)` et `tonObjet(t)` : le souvenir chez un voisin, l'objet
sous la maison, l'objet qu'on ne peut pas tourner, le compagnon qui te suit.

Trois choses à tenir :

1. **Tout nouvel objet féminin doit porter son `'f'`.** C'est la même
   consigne que « une quatrième pièce portera son `art` », et elle a le même
   garde-fou : le contrôle 13 refuse toute phrase qui recolle un article
   devant `NOM_OBJ`.
2. **La crotte n'est dans aucun rayon**, donc son genre ne peut pas venir du
   catalogue : il se pose à la main, à côté de son nom, et c'est exactement
   celui qu'on peut oublier. Le contrôle le vérifie nommément.
3. **`ta` redevient `ton` devant une voyelle.** Aucune bestiole n'est dans
   ce cas aujourd'hui ; la règle est du français, pas un cas particulier de
   cette liste-ci.

Au passage, les trois `<span></span>` vides qui séparaient « Un » du nom
sont partis avec : aucun commentaire ne les expliquait, et ils ne faisaient
rien.

### Ce qu'un contrôle peut prouver ici, et ce qu'il ne peut pas

Le contrôle 13 vérifie le **câblage** — qu'aucune phrase ne recolle un
article à la main — et c'est ce qui empêche le défaut de revenir.

Il ne peut pas vérifier le **français**. Mon premier jet comparait les
marques `'f'` du catalogue à une liste de féminins que j'avais écrite juste
à côté : deux listes de la même main, qui s'accordent par construction. Ça
ne prouve que ma constance. Il **imprime** donc les deux relevés, « une
fleur · une mare aux canards · … » et « un rocher · un puits · … », pour
qu'une personne les relise une fois — et la phrase de la visite a été lue
dans le jeu qui tournait : « Une fleur de chez Lila ».

C'est la limite déjà rencontrée avec le son, qui ne s'éprouve pas sous
pilotage : il y a des choses dont le juge est quelqu'un, pas un harnais. Un
contrôle honnête les affiche au lieu de prétendre les vérifier.

## Deux listes mal rangées, et une phrase de concepteur — 19/09/2026

Trouvées en **parcourant les panneaux et en lisant ce qui s'y écrit**, comme
« Un fleur ».

### La vitrine revenait en arrière

Chaque rayon de `BOUTIQUE` est écrit par prix croissant, et c'est l'ordre de
déclaration qui s'affiche : ce que le fichier montre est ce que l'enfant
voit. Or les trois chers du matin avaient été **ajoutés à la fin** du rayon
« île », donc après la montgolfière à 60. La colonne des prix lisait :

    … 38  40  45  50  60  42  50  55

Et le rayon « toi » n'avait jamais été rangé : **25, 45, 28, 20**. Un prix
qui revient en arrière au milieu d'une liste se lit comme une erreur.

Les deux rayons sont rangés, et le contrôle 13 le tient. Ajouter un article
à la fin de son rayon est le geste le plus naturel du monde, donc c'est
celui qu'il faut garder : le contrôle nomme l'article fautif et son prix.

Le commentaire qui expliquait les trois chers a suivi en tête du tableau :
il parlait d'eux en tant que groupe, et ils ne sont plus côte à côte.

### « c'est ça, tout est donnée »

Le bas de l'onglet Toi disait : « Les pastilles sont les couleurs de la
charte. La pipette au bout de chaque rangée ouvre tout le spectre — c'est
ça, "tout est donnée". » Trois mots de concepteur et la citation d'un slogan
que le joueur n'a jamais lu.

C'est exactement ce pour quoi la section de présentation sous le jeu a été
supprimée le 17/09 — « la planche de vente d'un prototype » — revenu par un
panneau. Ce qui compte pour l'enfant, c'est qu'il y a un bouton au bout de
la rangée et qu'il donne toutes les couleurs : « Les pastilles sont des
couleurs toutes prêtes. La pipette, au bout de chaque rangée, ouvre toutes
les autres — la couleur exacte de tes cheveux, si tu veux. »

## « La porte de Adam est fermée » — 19/09/2026

Troisième fois dans la journée, et la dernière de cette famille : un mot
grammatical collé devant une valeur qui change. Sept phrases disaient
« La porte de <b>X</b> est fermée », et c'est ce qu'on rencontre à **chaque
porte de voisin** — devenue la seule chose qu'on vient y faire depuis la
commande du jour.

Sur les vingt prénoms que le jeu livre, **cinq commencent par une
voyelle** : Inès, Ilan, Alba, Elias, Adam. Et un prénom est du texte libre,
donc ça ne se réglait pas en renommant les bots.

`deQui(nom)` rend « de <b>Lila</b> » ou « d'<b>Inès</b> ». Deux choix à ne
pas défaire :

1. **Le `h` est laissé tel quel**, délibérément. « d'Hugo » est juste,
   « d'Hans » ne l'est pas, et rien dans un prénom ne dit lequel des deux
   `h` on a. Élider sur les voyelles est vrai à tous les coups ; élider sur
   le `h` serait juste plus souvent, faux parfois, et invérifiable.
2. **Le `y` n'est pas une voyelle ici.** Un `y` initial se comporte comme
   une consonne en français — le yaourt, **de Yann**.

### Le `y` a été trouvé par l'impression, pas par l'assertion

Je l'avais mis dans la liste des voyelles, et **tous les contrôles
passaient** : la règle mordait, au moins un prénom s'élidait, au moins un
ne s'élidait pas. Ce qui a dit la vérité, c'est la ligne que le contrôle
**imprime** — `de Lila · de Nour · d'Yann · …` — où « d'Yann » saute aux
yeux.

C'est la même idée que les deux relevés de genres imprimés une heure plus
tôt : quand un contrôle ne peut pas juger, qu'il **montre**. Une assertion
qui passe ne prouve que ce qu'elle demande ; une ligne imprimée se relit.

Et le contrôle applique la règle **telle qu'elle est écrite dans le
fichier** aux prénoms que le jeu **livre vraiment** — la liste de voyelles
est extraite de `deQui()`, les prénoms des deux sources. Ce n'est donc pas
ma table comparée à ma table.

### Les prénoms venaient de deux endroits, et je n'en lisais qu'un

Premier jet : **3 prénoms au lieu de 20**. Les îles écrites à la main
(`mkN`) et la liste des bots (`NOMS_GENS`) sont deux sources, et je n'avais
branché que la première. C'est **exactement** le défaut des îles de
démonstration du matin, où le contrôle ne lisait que `THEMES` et ratait les
îles écrites à la main.

Les deux fois, c'est l'assertion de comptage qui l'a rattrapé. Elle n'est
pas là pour décorer : un contrôle qui ne dit pas **combien** il a lu peut
passer au vert en ne regardant presque rien.

## Le livre d'or éprouvé pour de bon — 19/09/2026

C'est le **seul endroit du jeu où le texte d'un inconnu arrive sur la page
de quelqu'un d'autre** : on plante un mot chez un voisin, l'hôte le lit
chez lui. Un `<img onerror=…>` qui s'exécuterait là tournerait dans la
session de l'hôte, avec son compte.

**La discipline était tenue** — `esc()` partout sur `auteur_nom` et
`texte`, vérifié champ par champ sur les quinze chemins de texte libre du
jeu, et rien n'a eu à être corrigé. Mais une discipline ne se relit pas, et
il suffit d'un `+` oublié un jour de fatigue.

Le contrôle 15 ne lit donc pas la source : il **envoie une vraie tentative**
— `<b>gras ?</b>`, `<i>Ana</i>`, `<img src=x onerror="document.title='PERCÉ'">`
— et demande au navigateur ce qu'il en a fait. Trois questions :

    le titre de la page a-t-il changé ?          non
    une <img> a-t-elle été créée ?               aucune
    les trois mots s'affichent-ils en clair ?    3/3

Éprouvé en retirant les deux `esc()` de la ligne du livre d'or : le titre
devient **PERCÉ**, une `<img>` apparaît, et les trois mots cessent de
s'afficher. Le garde-fou mord.

C'est la leçon du contrôle 12, transposée : **quand un navigateur peut
répondre, c'est à lui qu'il faut demander.** Une regex qui cherche `esc(`
dans la source ne verrait ni les fonctions qui échappent pour vous — comme
`deQui()`, qui a fait sonner trois faux positifs dans mon relevé — ni un
chemin de rendu qu'elle n'aurait pas pensé à regarder.

## Le panneau Île ne se fermait qu'à moitié chez les voisins — 19/09/2026

`fermerEnVisite()` existe depuis longtemps et éteint les commandes qui ne
servent à rien chez quelqu'un d'autre. Il était appliqué à quatre champs —
le nom de l'île, l'Heure, l'Ambiance, la Palette — et **pas à l'atelier**.
Mesuré chez un voisin : **23 puces éteintes sur 23, et 0 vignette éteinte
sur 17**.

On pouvait donc armer un pinceau chez quelqu'un, cliquer, et il ne se
passait rien. **Rien n'était perdu** — vérifié en armant un pinceau de force
et en cliquant quatre fois : le code de sauvegarde ne bougeait pas d'un
octet, ni mon île ni la sienne. Mais c'est mot pour mot le défaut nommé le
16/09 : « un pinceau armé au mauvais endroit doit le dire ; le clic ne
faisait rien et rien ne l'expliquait ». L'explication existait, tout en haut
du panneau, à un écran de défilement des vignettes.

Cinq sections de plus passent par `fermerEnVisite()` : le pinceau de
terrain, chaque rayon de l'atelier, Corriger, Sens, la couleur de l'objet.

Deux choses à tenir :

1. **Les vignettes restent visibles, seulement éteintes.** On voit ce qu'on
   aura chez soi ; les faire disparaître donnerait un atelier plus court
   sans explication, et c'est ce que la note « ce qui manque est à la
   Boutique » existe déjà pour éviter.
2. **Le contrôle vérifie d'abord que rien n'est éteint chez soi.** Un
   `fermerEnVisite()` mal branché fermerait l'atelier pour tout le monde, et
   le jeu n'aurait plus d'atelier du tout : c'est la première chose à
   refuser, avant même de vérifier la visite.

Vérifié aussi que le changement est **neutre chez soi**, en faisant tourner
la même sonde sur la version d'avant et sur la nouvelle : 52 boutons, un
seul éteint (« ↶ Annuler », faute d'historique), identique des deux côtés.

### Et le panneau Maison, d'un cran plus loin

Le même défaut, trouvé en regardant à côté : ses deux boutons d'action
(déplacer, entrer) étaient bien fermés en visite, mais les **sept réglages
d'apparence** restaient ouverts — enseigne, toiture, couleurs, volets,
cheminée.

Différence qui compte : ceux-là **marchaient**. Ce n'était pas un clic mort,
c'était une modification de **ta** maison, faite depuis l'île de quelqu'un
d'autre, dont tu ne vois pas le résultat. C'est mot pour mot la raison déjà
écrite dans le panneau Île — « tu ne verrais rien changer d'ici, alors il
attend que tu sois rentré » — et elle vaut pour la maison sans changer un
mot.

    en visite   36/36 boutons et 4/4 champs fermés
    chez soi     0/36 et 0/4 — rien n'a bougé

La note d'en-tête le dit, à la place où on la lit : « Ces réglages sont ceux
de **ta** maison, que tu ne vois pas d'ici : ils t'attendent chez toi. »

*(Au passage, deux pièges de sonde. `world` dans une page de test n'est pas
le monde du jeu mais le **canvas** : un élément à `id` devient une globale,
donc `world.objects` vaut `undefined` et compte zéro sans rien prouver.
C'est le code de sauvegarde, lisible dans le panneau Voisins, qui dit
vraiment si l'île a changé. Et une sonde qui ne pose rien ne prouve pas
qu'on ne peut pas poser : il a fallu la faire tourner sur les deux versions
pour savoir que « rien posé » venait du clic, pas du changement.)*

## Fille ou garçon, et six bâtiments — 19/09/2026 au soir

`supabase/2026-09-19_batiments.sql`, **rejouable** : un seul
`insert ... on conflict do update`. Six lignes de catalogue, rien d'autre —
pas de table, pas de fonction, **aucune clé de plus dans `mondeNu()`**.

### Fille ou garçon, et c'est la jupe qui le dit

`me.genre`, et `me` est déjà dans `mondeNu()` : l'avatar voyage avec l'île,
donc **aucune migration**.

**C'est la jupe, et rien d'autre.** Pas un rose contre un bleu, pas des
cils : la tenue, les cheveux, le teint et l'accessoire se choisissent déjà
librement juste à côté, et un enfant qui veut une couronne et des cheveux
longs sur un garçon doit pouvoir. Une seule forme de plus, et tout le reste
reste au choix.

**`genre` absent vaut garçon**, ce qui est exactement la silhouette d'avant :
aucune île déjà faite ne change d'allure le jour du déploiement. Les îles
bot en tirent un au hasard (`pick(22)`), sinon l'archipel n'en montrerait
qu'une.

Mesuré, parce qu'un choix qui ne change rien à l'écran n'est pas un choix :
la tenue peinte passe de **8 141 à 10 238 pixels**, et le bas de la
silhouette de 174 à 226 px de large.

### Les six bâtiments

    ferme          34   une grange, un silo, une porte à planches croisées
    ecole          36   deux rangées de trois fenêtres, une cloche
    coiffeur       44   une vitrine, et l'enseigne à spirale
    supermarche    48   un auvent rayé, une grande vitrine
    restaurant     52   un parasol de terrasse, deux fenêtres allumées
    culte          58   un clocher qui domine tout

Cinq choses à tenir :

1. **Un bâtiment tient sur une case.** La maison est le seul objet 2x2 du
   jeu, et elle l'est parce qu'on y **entre**. Ceux-ci se posent comme
   l'échoppe et le phare.
2. **Ils décorent, et c'est tout.** Aucun n'entre dans `FONCTIONNEL` :
   aucun gain, aucun plafond, rien à faire — donc un souvenir rapporté de
   chez un ami en vaut un vrai, et c'est très bien. C'est la règle du 16/09
   (vendre un plafond revient à vendre de la monnaie) et celle du 19/09 (ce
   qui *fait* quelque chose ne se ramène pas gratuitement d'une visite).
3. **Ils tournent sans une ligne de dessin de plus.** `dessinDe()` retourne
   le canevas pour `sw`, donc un bâtiment dessiné asymétrique change de
   façade tout seul — il suffit d'entrer dans `PIVOT_ILE`. Et la phrase du
   Sens, qui **lit** `PIVOT_ILE` depuis cet après-midi, les a nommés toute
   seule.
4. **Ils ont leur propre rayon**, « Bâtiments » : « Village » était déjà à
   quatorze articles.
5. **Rien sur les îles bot**, comme tout ce qui est payant.

### Ce que le premier jet a raté, et ce que la capture a dit

Écrits une première fois avec des murs bas et de gros toits, trois d'entre
eux — école, coiffeur, supermarché — étaient **la même boîte crème sous le
même toit sombre** en vignette. Les détails y étaient : ils étaient trop
petits pour se lire.

Six bâtiments qui se ressemblent ne sont pas six bâtiments. Refaits avec
des **murs plus hauts que les toits**, et une signature franche qui sort du
volume quand il le faut — l'enseigne à spirale du coiffeur, le parasol du
restaurant, le silo de la ferme, le clocher du lieu de culte. Les deux
signes repris du vocabulaire du jeu sont l'auvent rayé de l'échoppe (pour
le supermarché) et les rangées de fenêtres (pour l'école).

Ça ne se voit que rendu : c'est la règle de la journée, et ici il a fallu
capturer les vignettes à trois fois la résolution pour juger.

### Les garde-fous du matin ont rattrapé le travail du soir

Sans qu'on y pense, et c'est ce pour quoi ils existent :

    contrôle 11   les six lignes SQL croisées avec la vitrine      ✅
    contrôle 13   les prix restent croissants dans chaque rayon    ✅
    contrôle 14   « une ferme », « une école » dans les féminins   ✅

Le contrôle 14 bis n'ajoute donc que ce que les autres ne couvrent pas :
que les six sont branchés partout (dessin, atelier, vitrine, orientation),
et que le choix fille/garçon **change vraiment le dessin**.

*(Un piège de sonde de plus : compter les pixels **opaques** de l'aperçu du
bonhomme rend le même nombre dans les deux réglages — 660 contre 660 — car
il est peint sur un mur rayé, donc tout y est opaque. C'est la couleur de
la tenue qu'il faut compter.)*

## La Boutique ne montrait pas de boutique — 20/09/2026

Question posée en regardant le jeu, pas le code : « les six bâtiments, le
joueur les trouve où ? » La mesure a répondu, et la réponse était mauvaise.
Panneau de 636 px, onglet Boutique ouvert :

    y=  297   Ce qui rapporte aujourd’hui   (816 px de jauges)
    y= 1113   le premier article
    y= 1762   les six bâtiments

Deux défauts distincts, et ils se cumulaient.

### Sept jauges passaient avant la première vignette

C'est mot pour mot « Voisins ne montrait aucun voisin », corrigé la veille,
et le bloc Compagnon « à un écran de défilement du haut » avant lui. La
règle est écrite depuis : **ce qu'un onglet est doit être en haut de cet
onglet.**

« Ce qui rapporte aujourd'hui » descend donc **sous** la vitrine, par le
même `DocumentFragment` que l'archipel de `buildVoisins()` : il se
construit là où il était, avec la bourse dont il dépend, et se **pose**
plus bas. Ce qui reste en tête est ce qu'on vient lire à chaque fois et qui
tient en deux lignes — le cadeau du jour, et ce qu'on a en poche.

Il n'est pas caché pour autant, et c'est ce qui rend le déplacement
acceptable : une ligne sous la bourse y mène **et dit le nombre**, « il te
reste 19 shells à gagner aujourd'hui », ce qui répond à la seule question
qu'on se pose devant un prix trop cher. Et le comptoir disait déjà quoi
faire quand il manque des shells, là où est le doigt.

    1er article   y1113 → y370      les bâtiments   y1762 → y1018

### Vingt-six vignettes en une grille plate

« Sur ton île » était une seule grille triée par prix, où les six bâtiments
étaient éparpillés entre l'échoppe (35) et le toboggan (38), la girouette
(42) et la statue (50). Rien ne disait qu'il y avait un village à bâtir.
C'est la leçon du 19/09 au matin : **ce qui existe mais ne se nomme nulle
part n'existe pas.**

La vitrine reprend les rayons de l'atelier, et elle les **lit dans
`OBJ_GROUPS`** plutôt que de les recopier : le rayon d'un objet est le même
des deux côtés le jour où on en ajoute un, sans que personne ait à y
penser. C'est la règle déjà tenue pour `PIVOT_ILE` dans la phrase du Sens
et pour les prix SQL.

Trois choses à ne pas défaire :

1. **Un article d'île absent de tout rayon tomberait dans « Divers »**,
   il ne disparaît pas. Une vitrine qui perd un article le vend sans
   pouvoir le poser, et rien ne le dirait. Aucun aujourd'hui — mesuré, les
   26 sont rangés — mais la branche existe pour le jour où.
2. **Le comptoir tombe sous le rayon d'où vient le clic**, plus en bas de
   la section. Règle de la boutique du 16/09 : le prix et le refus tombent
   là où est le doigt. Avec 26 vignettes, « en bas de la section » était
   déjà à un écran de défilement — le défaut qu'on croyait corrigé revenait
   par la longueur de la liste.
3. **La vignette est fabriquée à un seul endroit.** Elle se construit
   maintenant dans deux boucles ; deux copies du même bouton, et elles
   divergent au premier changement.

Le titre « Sur ton île » porte sa ligne plutôt que de flotter seul au-dessus
de ses rayons — un libellé sans rien dessous se lit comme un rayon vide — et
elle travaille : elle dit que ces rayons-là sont ceux de l'atelier, donc où
l'objet ira se ranger une fois payé.

### Ce que les deux pannes ont appris

Les deux sections d'`etroit.mjs` ont été éprouvées en remettant le vrai
défaut, une par une. La première a rendu cinq rouges, la seconde six.

**Mais la section du comptoir est passée au vert pendant la seconde**, et
c'est elle qui vaut d'être écrite ici : sans rayon Bâtiments, `bat` valait
`-1`, donc « le comptoir est sous le rayon » était vrai sans rien mesurer.
Un repère absent doit faire **échouer** ce qui s'appuie dessus, jamais
l'absoudre. La section vérifie donc d'abord que le rayon existe.

C'est la même famille que les trois prénoms au lieu de vingt et que les
îles écrites à la main : un contrôle qui ne s'assure pas d'avoir trouvé ce
qu'il mesure passe au vert en ne regardant rien.

## Les bâtiments deviennent des bâtiments — 20/09/2026

**Aucune migration, aucune clé de plus dans `mondeNu()`** : un objet posé
reste `{t,x,y,o,c}`. Une île d'hier qui porte une ferme la voit simplement
grandir au prochain chargement.

### Ce que la mesure a dit

On était **plus grand qu'une ferme**. En unités du monde, le bonhomme fait
38 et la maison 80 :

    Phare               91        Lieu de culte       58
    Montgolfière        90        Palmier             46
    Cabane perchée      62        École               43   ← sous un arbre
    Moulin              60        Ferme               33   ← sous le bonhomme
                                  Restaurant          33

Les six avaient été dessinés comme des objets. Et le défaut ne se corrige
pas en hauteur seule : **une église plus grande qu'une maison ne tient pas
dans une case.**

### `EMPRISE_ILE` — un bâtiment occupe 2x2, comme la maison

C'est la seule règle, et elle est mémorable : ce qui occupe quatre cases
est un bâtiment. `EMPRISE_ILE` est une propriété du **type**, dans le
catalogue, au même titre que `PIVOT_ILE`, `NIVEAU` et `TAILLE` — donc rien
n'entre dans le jsonb.

Six choses à ne pas défaire :

1. **`empriseCases()` ne s'appelle pas `casesDe()`, et c'est la leçon de la
   journée.** `casesDe(m)` existait déjà — la version des meubles. Deux
   déclarations de fonction du même nom ne lèvent **aucune erreur** : la
   dernière gagne. Écrite sous ce nom, la mienne rendait
   `[{x:NaN,y:NaN}]` à tous ses appelants, `NaN <= rayon` est faux, et
   **aucune des vingt îles n'a reçu son village** — sans une ligne dans la
   console. Trouvé en comptant les refus (6075 sur 6075, tous au même
   test), pas à la relecture.
2. **`couvre(o,x,y)` est le seul test d'occupation.** Un `o.x===x` laisse
   poser un arbre dans l'église. La gomme, la rotation, la crotte du chien,
   les îles bot et `freeTile()` passent tous par lui.
3. **Le dessin est centré sur l'emprise et se trie à ce centre**
   (`centreDe()`), pas à la case d'ancrage : sinon un objet posé au coin
   sud de l'emprise passerait devant le bâtiment. `ce.x+ce.y` rend
   exactement l'ancien `o.x+o.y+1` pour une case, et la profondeur de la
   maison pour un 2x2 — une seule expression pour les deux.
4. **`proximity()` détecte un bâtiment à son emprise, pas à la distance.**
   Le centre d'un 2x2 est à `+1`, donc le coin opposé est à 1,41 case du
   centre d'ancrage : la distance ne l'aurait jamais vu, et on aurait été
   dans l'église sans que l'église compte. Les objets d'une case gardent le
   test de distance, qui n'a pas bougé.
5. **Un bâtiment n'écrase pas ce qu'il couvre, il le dit.** Un 1x1 continue
   de remplacer en silence — c'est le geste ordinaire du pinceau — mais une
   église posée d'un clic emporterait jusqu'à quatre objets d'un coup.
6. **La gomme prend le bâtiment par n'importe laquelle de ses quatre
   cases.** Viser l'angle d'ancrage serait un jeu d'adresse.

### `ECH_BAT` — une échelle, pas six dessins refaits

Chaque bâtiment est une trentaine de coordonnées nouées entre elles : la
porte est une fraction de la façade, le silo est à une hauteur de mur,
l'auvent suit une arête. Les réécrire à la main, c'est trente occasions de
se tromper par bâtiment, sans que rien ne le signale à part l'œil. Une
**échelle uniforme** garde toutes ces relations exactes par construction,
et elle s'applique dans `dessinDe()`, seul endroit qui peigne un objet
d'île — vignettes comprises.

Ce que ça coûte : la largeur suit la hauteur. Mesuré, ça tombe bien.

    Lieu de culte   118   1,47× la maison   le plus haut de l'île
    École            96   1,20×
    Ferme            88   1,10×
    Supermarché      74   0,93×
    Restaurant       70   0,88×
    Coiffeur         68   0,85×

Les six restent entre 35 et 49 de demi-largeur, donc **tous à l'intérieur
de leur 2x2** (56) : aucun ne mord sur la case du voisin.

**`APERCU_ECH` divise par le même facteur**, et c'est calculé, pas recopié
(`APERCU_ECH[k]=0.60/ECH_BAT[k]`). Une vignette est une icône de 60 px, pas
une maquette : sans ça les six déborderaient de leur case dans l'atelier,
du facteur exact dont ils ont grandi sur l'île.

### Le village des îles de démonstration, et l'exception assumée

Les grands bâtiments sont posés **au nord** et **en premier** : au nord
parce que dans cette isométrie le nord est le fond du cadre — une église de
118 posée devant cache tout ce qui est derrière — et en premier parce que
le décor se sème ensuite sur les cases restantes.

Ils sont **payants**, et la règle du 16/09 dit qu'on ne met rien de payant
sur une île bot. Elle tient toujours, mais elle est maintenant tenue par
**`ramasserSouvenir()`**, qui refuse un objet payant pris sur une île
`demo` en nommant son prix, plutôt que par l'absence de l'objet. Un village
de démonstration sans un seul bâtiment ne montre pas le jeu ; vingt îles
infinies qui donnent une église gratuite ne laissent rien à la Boutique.

**Chez un vrai voisin, rien ne change** : un souvenir d'ami reste gratuit,
c'est le choix écrit le 19/09 et c'est ce qui donne envie d'aller chez les
gens.

Deux pièges rencontrés en posant ces bâtiments, tous deux vus **sur une
capture** :

1. **`dansLeRayon()` et pas « la tuile n'est pas de l'eau ».** Le
   restaurant de « La Crique » flottait au nord, au-dessus de la mer : les
   tuiles hors du rayon ne portent pas toutes la valeur eau. C'est le rayon
   qui dit où est l'île ; la tuile ne dit que ce qui y est peint.
2. **Une case de marge sur ce rayon.** Le balayage part du nord, donc sans
   elle le bâtiment se pose sur la toute dernière rangée de terre et se lit
   comme perché au bord de la falaise.

### Agrandir l'île se propose là où le besoin se sent

Un bâtiment refusé faute de place ne dit plus « le large ne t'appartient
pas » : il dit qu'il faut **quatre cases**, et que l'île gagne un cran à
chaque mot qu'on te laisse — donc d'envoyer sa carte postale. C'est le seul
refus du jeu auquel on peut répondre quelque chose, et la réponse n'est pas
« recommence ».

### Ce que les contrôles ont appris, et ce qu'ils ne prouvent pas

Le contrôle 9 lisait `THEMES` et `DEMO`. **Il est passé au vert** alors que
six articles payants venaient d'arriver sur vingt îles, parce qu'il ne
connaissait pas `GRANDS` — la troisième source. C'est, mot pour mot, son
propre angle mort du 19/09, où il ne lisait que `THEMES` et ratait les îles
écrites à la main. Un contrôle qui ne connaît pas la source qu'on vient
d'ajouter ne dit rien : il rassure.

Il croise donc maintenant les trois, et il vérifie **l'exception avec son
garde-fou** : `GRANDS` ne pose que des bâtiments, et `ramasserSouvenir()`
refuse bien sur une île `demo`. Ce second point est un contrôle de
**câblage**, pas de comportement, et il faut le dire : amener le bonhomme
sur une église d'île bot demanderait de le téléporter, et rien ici n'en
donne le moyen.

Le contrôle 9 ter mesure les proportions dans le navigateur et **imprime la
table** — la vignette montre le dessin brut, `ECH_BAT` le remultiplie, donc
c'est de l'arithmétique sur une mesure, pas une lecture du code. Éprouvé en
remettant les deux vraies pannes : `ECH_BAT.ferme` à 1 rend « aucun
bâtiment n'est plus petit que le bonhomme → **ferme** », et le garde-fou
retiré rend sa ligne rouge.

*(Et un rappel du comptage, pour la deuxième fois de la journée : ma
première lecture d'`ECH_BAT` prenait une tranche de 300 caractères et
comptait **huit** échelles au lieu de six, en mordant sur le code suivant.
Un compte qui déborde ment aussi sûrement qu'un compte qui manque.)*

### Ce qui reste à faire, et qui n'est pas fait

**Des habitants.** Mis de côté explicitement, et rien n'a été préparé pour
eux ici : ne pas prendre `EMPRISE_ILE` pour un premier pas vers des
personnages qui vivraient dans les bâtiments. Le jour où ça se fera, la
question à trancher avant d'écrire une ligne est celle de toujours — est-ce
que ça rapporte, et si oui, dans la famille des corvées ou dans celle des
visites ?

## Ce qu'un robot lit, et ce qu'il n'a pas à lire — 20/09/2026

Un audit de référencement, et **la moitié de ce qu'il décrit était déjà
corrigé sans être déployé** : « Prototype jouable, en isométrique » n'existe
nulle part dans le dépôt. Google montrait un instantané d'avant le 18/09.
Premier réflexe à avoir devant un audit : vérifier que ce qu'il décrit est
la version qu'on a, pas celle qui est indexée.

L'autre moitié était vraie, et pire que ce qu'elle disait.

### Rien n'est indexable par défaut, et c'est le point qui compte

`page()` écrivait `index, follow` **en dur**, et `sitemap.xml.js` listait
**toutes** les îles publiées. Une page d'île porte un prénom, le nom qu'un
enfant a donné à son île, et le compte des mots que ses copains y ont
laissés. Une carte postale porte en plus un message personnel dans son
adresse.

**Publier son île pour qu'un ami la visite n'est pas consentir à la
retrouver dans Google.** Le joueur n'avait accepté que la première.

Quatre choses à ne pas défaire :

1. **`ROBOTS_NON` est le défaut de `page()`.** Une page qui ne demande rien
   n'est pas indexée. Le jour où une cinquième sorte de page apparaît, elle
   est protégée sans que personne y pense — c'est la leçon du registre
   `VERROUS_PROX`, qui a remplacé une liste écrite à la main.
2. **`ILES_INDEXABLES` est une liste écrite à la main**, et elle ne contient
   que `dan`, l'île de démonstration, qui n'appartient à personne. Y ajouter
   une île est une décision.
3. **Une carte postale n'est jamais indexée**, sans exception. C'est une
   lettre, pas une page.
4. **Le plan du site ne liste que ce qui s'indexe.** Un plan qui annonce une
   adresse que la page marque `noindex` dit deux choses contraires, et c'est
   la première qu'un robot suit.

### Le seul texte lisible du site était caché

`#accueil` portait l'attribut `hidden` dans le HTML. Or c'est, par
construction, **le seul texte qu'un robot puisse lire** : tout le reste est
peint dans un canvas. Pour Googlebot, qui rend le JavaScript, ça passait ;
pour WhatsApp, Signal, et tous les moteurs qui ne rendent pas, la page
n'avait pas de contenu du tout.

Il part donc **visible**, et un petit script en ligne le cache avant le
premier affichage quand il n'a rien à faire là. En ligne et non-module
exprès : un module est différé, donc le voile clignoterait chez tous ceux
qui reviennent — vérifié, six relevés consécutifs après `domcontentloaded`,
tous « caché ».

`window.__accueilDu` est la **seule** réponse à « faut-il le montrer ? ».
Le module la relit au lieu de recalculer la condition : deux endroits qui
décident, et le jour où l'un change, l'autre ment. `dejaEntre()` a disparu
avec.

### Deux `<h1>`, et un titre écrasé au démarrage

Il y en avait deux — la marque dans l'en-tête de page, la promesse dans le
voile — et aucun ne disait de quoi parle la page. **« Dan's Island » comme
seul titre ne répond à aucune recherche.** La marque est donc un logotype
(`.marque-page`, `.marque`), et le `h1`, unique, est la promesse :
*Construis ton île. Détends-toi. Partage-la.*

*(Ce que le `h1` **dit** a changé le soir même, avec la planche d'identité :
il porte maintenant deux lignes, « Ton île. Ton rythme. » puis « Construis
ton île, regarde-la vivre, partage-la. » — voir « Le site prend une
identité ». Ce qui est écrit ici tient toujours, et c'est le seul point qui
comptait : **un seul `h1`, et c'est la promesse, pas la marque.** La
formulation est restée là exprès plutôt que d'être réécrite, parce que
c'est celle qui a été demandée par l'audit, et qu'un dépôt qui efface ses
propres versions successives ne raconte plus comment il en est arrivé là.)*

Et `go()` faisait `document.title = 'Dan's Island'` au démarrage, donc **le
`<title>` de la page était effacé par le jeu lui-même** — y compris pour
Googlebot, qui rend. D'où `TITRE_SITE`, qui doit rester d'accord avec la
balise `<title>` du haut du fichier. Chez un voisin, le nom de son île
passe devant : c'est ce qu'on lit dans ses favoris.

### Quatre pages éditoriales, et pas quarante

`/comment-jouer`, `/fonctionnalites`, `/construire-son-ile`,
`/cartes-postales` — **les chemins canoniques sont en français**, parce que
le site l'est et que « comment jouer à » se tape en français. Les quatre
adresses anglaises (`/how-to-play`, `/features`, `/build-your-island`,
`/postcards`) sont des **alias** : même page, canonique pointé sur le
français, donc un moteur consolide les deux.

Pas de `noindex` sur un alias, et ce n'est pas un oubli : posé sur une page
qui canonicalise ailleurs, il envoie deux signaux contraires et aucun
moteur ne sait lequel suivre.

Le contenu et la maquette vivent dans `functions/_pages.js` ; les **huit**
fichiers de route ne font qu'appeler `rendre()` avec le chemin **canonique**
— l'alias aussi, et c'est ça qui pose le canonique au bon endroit.

**Les huit adresses sont réservées côté base**
(`supabase/2026-09-20_slugs_reserves.sql`, rejouable). C'est un défaut
trouvé avant d'écrire le français, et il valait pour l'anglais depuis la
veille : ce sont des routes d'**un seul segment**, comme l'adresse d'une
île. Sans réservation, un joueur prenait `comment-jouer`, la fonction
répondait avant le catch-all, et **son île devenait inatteignable** — sans
erreur, sans trace, et sans qu'on puisse le lui expliquer. `slug_reserve()`
est la source unique, et le contrôle 3 de `test/robots.mjs` croise les deux
listes.

**Pourquoi quatre routes nommées et pas un `[page].js`.** Un attrape-tout à
la racine intercepterait *toutes* les adresses d'un segment — donc `/simon`
et chaque île de l'archipel. Son `next()` les rattraperait, mais ça met un
aiguillage sur le chemin critique de tous les liens partagés du jeu, pour
quatre pages dont on connaît les noms.

Elles disent des choses vraies et vérifiables dans le jeu. **Ne pas en
faire cinquante** : le moteur de ce jeu reste le partage, et une carte
postale envoyée vaut mille mots-clés.

### La carte postale nomme son expéditeur

Le titre était « Une carte postale de Sable-Rose », qui se lit comme une
page de catalogue. Il dit maintenant **« Untel t'envoie une carte postale de
Dan's Island »**, qui se lit comme un message reçu — et c'est ce qui
s'affiche dans l'aperçu WhatsApp.

**Ce qui n'est pas fait, et qu'il ne faut pas prétendre :** l'image de
partage reste `og.png`, la même pour toutes les cartes. Une image
**engendrée par île** demande un rasteriseur dans le Worker (satori +
resvg en wasm), donc un build et des dépendances — or ce dépôt n'en a
aucun, et c'est un invariant tenu depuis le début. C'est une décision à
prendre, pas quelque chose à glisser. À noter tout de même : sur téléphone,
`navigator.share({files})` met déjà **la vraie image** dans la conversation
WhatsApp ; l'`og:image` ne sert que l'aperçu du lien ailleurs.

### `test/robots.mjs`, septième harnais

Il prend la page **par le réseau, sans navigateur** : pas de JavaScript,
pas de `localStorage`, exactement ce qu'un robot qui ne rend pas reçoit.
C'est le seul harnais du dépôt qui n'ouvre pas Chromium, et c'est voulu —
mesurer ce qu'on veut mesurer, pas ce qu'un moteur de rendu veut bien
montrer. Mesuré : **212 mots lisibles** hors script, là où le voile caché
n'en laissait qu'une poignée.

Éprouvé en remettant les trois défauts de l'audit — `hidden` sur le voile,
le titre court, `index, follow` en dur — et les trois lignes rougissent.

Deux choses apprises :

1. **`aide.mjs` ne savait pas dé-semer une clé.** `setItem(k, null)` écrit
   la chaîne « null », qui est vraie, donc l'état le plus important du site
   — celui de quelqu'un qui arrive pour la première fois — était le seul
   qu'aucun harnais ne savait produire. `null` retire maintenant la clé.
2. **Un faux positif use un contrôle autant qu'un faux négatif.** Compter
   les `titre:` d'un fichier en comptait cinq : les quatre des pages, et
   celui de l'appel à `page()`. La même leçon que `store.js` compté comme
   export manquant.
3. **Une liste recopiée dans un contrôle est une liste de trop.** La
   section 1 cherchait `href="/how-to-play"` en dur : le jour où les
   chemins sont passés au français, elle est devenue rouge pour rien. Elle
   lit `PAGES` maintenant, comme tout le reste du fichier.
4. **Un contrôle qui ne parcourt qu'un côté a l'angle mort de l'autre.**
   « Chaque alias rend le chemin canonique » ne regardait que les alias :
   la panne posée sur un fichier **canonique** est passée. Il parcourt les
   huit, et la remet en rouge en nommant le fichier. C'est, une fois de
   plus, le défaut du contrôle 9 qui ne lisait pas `GRANDS`.

## Le contrôle de déploiement attendait une phrase — 20/09/2026

Le site a été publié, et **le contrôle a répondu « Pas déployé »**. Six
minutes d'attente, puis un rouge, sur un déploiement réussi.

Son témoin était `Ton petit endroit pour ralentir`, **recopié en dur dans
le workflow**. Cette phrase a quitté l'accueil le matin même, quand le `h1`
est devenu « Construis ton île ». Le contrôle ne vérifiait donc plus le
site : il vérifiait que personne n'avait touché à une phrase.

C'est, mot pour mot, la leçon écrite une heure plus tôt pour
`test/robots.mjs` — « une liste recopiée dans un contrôle est une liste de
trop » — et je ne l'avais pas cherchée ici. **Une leçon apprise dans un
fichier ne s'applique pas toute seule aux autres.**

Trois témoins corrigés, et la distinction compte :

1. **L'attente lit l'empreinte du dépôt.** `dist/index.html` *est* ce qu'on
   publie, donc son sha256 répond à « ce commit est-il en ligne ? » sans
   rien savoir de ce qu'il contient, et sans jamais se périmer. Le contrôle
   1 ter faisait déjà exactement ça vingt lignes plus bas : il n'y avait
   aucune raison que l'attente regarde autre chose. Les deux partagent
   maintenant le même calcul — deux calculs de la même chose finissent par
   diverger.
2. **Les deux autres passent à `id="world"`**, le canvas du jeu. Là, la
   question posée est « cet hôte sert-il **le jeu** ? » — pour distinguer
   la page d'une fonction du repli par le catch-all — et il faut donc bien
   une marque dans la page. Mais une marque de **structure** : une accroche
   se réécrit un matin, un `id` sur lequel le moteur s'appuie, non.
3. **`build.sh` ne copie pas `.github/`**, donc corriger ce fichier ne
   change pas l'empreinte et ne demande aucun redéploiement.

## Trois retours d'usage, et un visage qu'on peint — 20/09/2026

**Aucune migration, aucune clé de plus dans `mondeNu()`** : le visage vit
dans `me.face`, et `me` y est déjà. L'avatar voyage avec l'île, le visage
voyage avec l'avatar — la ligne déjà écrite pour le compagnon et `me.genre`.

Ce que les trois ont en commun : **le jeu ne répondait pas à ce que le
joueur venait de faire.**

### Reprendre son bonhomme

Un pinceau armé confisque le clic sur l'île. On pose un arbre, on veut
marcher — et le seul moyen était de rouvrir l'onglet Île pour y retrouver
« ✋ Marcher », à un écran de défilement, loin du doigt qui vient de poser.
C'est la leçon de la boutique du 16/09 : **la réponse tombe là où est le
doigt.**

Le bouton est le quatrième rond du bord droit, avec le zoom et l'appareil.
Deux choses à tenir :

1. **Il n'apparaît que quand un outil est armé**, et s'en va dès qu'on
   marche. Toujours là, il serait mort neuf fois sur dix — la règle déjà
   tenue pour l'appareil photo.
2. **Il remet l'atelier d'accord** (`buildAll()`), sinon la puce
   « ✋ Marcher » et la réalité disent deux choses différentes.

### Le nom de l'île suivait « Dan »

Signalé : on change son prénom, et l'île s'appelle toujours « L'île de
Dan ». « Dan » est le nom de démonstration de `defaultWorld()`, et rien ne
le reliait à `me.name` : un enfant qui s'appelle Léa habitait chez Dan.

**On ne renomme que ce qui n'a pas été choisi.** Le test est une égalité
avec la valeur *dérivée de l'ancien prénom* : si l'île s'appelle exactement
« L'île de Dan » et que le prénom était « Dan », c'est le nom par défaut et
il suit. Dès qu'on l'a renommée, l'égalité tombe et on n'y touche plus
jamais. Pas de clé de plus pour retenir « ce nom a-t-il été choisi ? » : la
question se déduit. C'est la règle du cadre glissé contre le mur plutôt
qu'effacé — on ne reprend pas ce qui a été choisi.

Deux pièges tenus :

1. **L'apostrophe est la droite**, comme dans `defaultWorld()`. Le reste du
   jeu écrit des apostrophes typographiques, mais c'est avec cette
   chaîne-là qu'il faut tomber d'accord, sinon l'égalité échoue en silence.
2. **`rafraichirChamps()`**, parce que `textField` ne reconstruit pas les
   panneaux pendant qu'on tape — le champ en cours perdrait le focus à
   chaque lettre. Mesuré : la plaque disait « L'île de Léa » et le champ du
   panneau Île affichait encore « L'île de Dan ». Retaper dedans aurait
   réécrit le vieux nom par-dessus le neuf. Chaque champ porte son chemin
   et se relit — **sauf celui qui a le focus**, qu'on n'écrit jamais sous
   les doigts.

### Le visage se peint

Cinq réglages donnent cinq cents bonshommes ; un pinceau en donne autant
qu'il y a d'enfants. C'est le seul endroit du jeu où l'on dessine vraiment
quelque chose plutôt que de choisir dans une liste.

Six choses à ne pas défaire :

1. **Une chaîne, pas un tableau.** 12x12 cases, un caractère par case,
   l'index dans `FACE_COUL` en base 36 et `.` pour « rien ». Un tableau de
   144 nombres dans un jsonb que chaque sauvegarde réécrit pèse dix fois ça
   pour rien.
2. **Treize couleurs au maximum**, parce qu'un caractère par case. Une
   quatorzième demanderait deux caractères, et **toutes les chaînes déjà
   enregistrées se reliraient de travers** — c'est mot pour mot le piège
   d'`encode()` et des valeurs de tuile.
3. **Le rond passe devant la coiffure**, et c'est une mesure qui l'a
   décidé. Peint avant, il ne se voyait que dans la moitié basse : toutes
   les coiffures sauf « Rasé » couvrent le demi-cercle du haut
   (`arc(0,hy,10.6,π,2π)`). Quatre cases peintes à hauteur des yeux
   rendaient **zéro** pixel sur le bonhomme, les mêmes à hauteur de bouche
   en rendaient 174. Le rond **est** la tête : il passe devant. La
   coiffure garde ce qui dépasse du crâne — chignon, mèches, piquants —
   puisque la peinture est découpée au cercle. Le chapeau et la couronne
   restent au-dessus : ils se posent sur le crâne, pas sur la figure.
4. **Il remplace le regard, pas les cheveux.** Deux yeux dessinés
   par-dessus un visage qui en porte déjà, ça fait quatre yeux.
5. **La découpe reste sur le crâne, le dessin glisse dedans.** Les yeux
   dessinés se décalent quand le bonhomme regarde de côté ; un visage
   planté au milieu se lirait comme un masque collé.
6. **L'éditeur ne passe pas par `buildAll()`.** Reconstruire le panneau à
   chaque case détruirait le canvas et le doigt lâcherait sa trace au
   premier pixel — la discipline de `textField()`. Et `touch-action:none`
   sur le canvas : sans lui, un doigt qui trace fait défiler le panneau et
   ne peint rien.

### `test/toi.mjs`, huitième harnais, et le témoin qui se vérifiait lui-même

Ma première assertion comptait les pixels **sombres** de l'aperçu et
passait au vert à 4084 — sauf que le bonhomme a les cheveux noirs. Elle
serait restée verte avec l'éditeur débranché : elle se vérifiait
elle-même. C'est la leçon du « shell » cherché dans sa propre bulle, du
19/09.

Le témoin est donc le **violet** `#9B6BC9`, qui n'est ni dans les teints,
ni dans les cheveux, ni dans les tenues : s'il apparaît sur la tête, il
vient du pinceau et de nulle part ailleurs. Le contrôle vérifie d'abord
qu'il y en a **zéro** avant de peindre — un témoin sale ne prouve rien.

Et c'est ce témoin-là qui a trouvé le défaut de la coiffure : avec le
noir, il ne se voyait pas.

*(Un piège de sonde de plus, et il vaut pour tout ce panneau : **le canvas
doit être amené à l'écran avant qu'on clique.** Le panneau défile, un clic
à des coordonnées hors cadre ne touche rien, et la première version
peignait zéro case sans rien dire.)*

## Le site prend une identité — 20/09/2026

Une planche d'identité est arrivée : sept couleurs nommées, un logotype,
une accroche, une signature, et une maquette de page. Tout ce qui suit en
découle. **Aucune migration, aucune clé de plus dans `mondeNu()`** : c'est
du CSS, du HTML en dur et quatre fichiers PNG régénérés.

    Océan profond   #0D2630      Sable chaud    #F4D7A1
    Mer profonde    #184D5B      Corail doux    #FF8F70
    Lagon           #72D6D0      Végétation     #5FAF78
    Crème           #FFF8E8

### La planche a été mesurée avant d'être posée

Une trentaine de couples de texte, contre le seuil AA, avant d'écrire une
ligne de CSS. **Un seul est tombé** : « mer sur corail », à 4,18. Il n'est utilisé
nulle part, et c'est une règle et pas un hasard — **l'encre d'une pastille
colorée est toujours l'océan**, jamais la mer. Le reste passe largement :
l'encre sur le papier rend 14,8, le bouton corail 7,0, la puce choisie 8,8.

Deux couleurs ne sont pas sur la planche et ont chacune leur raison :

- **`--mer-claire` #146A78**, le lien. La planche n'a pas de bleu moyen :
  le lagon sur le crème rend 1,4 (illisible) et la mer ne se distingue plus
  de l'encre. Celle-ci rend 5,9.
- **`--corail-ecrit`**, le corail *écrit*. Le corail de la planche est une
  couleur d'aplat : en texte sur du crème il rend 2,2. En clair c'est
  #B8431E (5,2 sur le papier du jeu) ; **en sombre c'est l'inverse**, le
  foncé y disparaît, donc #FFA98F (5,0 sur la carte).

### Ce qui ne change pas de couleur, et pourquoi

**Le dessin du jeu garde sa palette.** `PAPER`, `SEA`, `ROOFS`, `WALLS`,
`OBJ_COLORS`, les teints, les cheveux : rien n'a bougé dans le canvas. La
planche habille le **cadre**, pas le monde qui vit dedans — c'est d'ailleurs
ce que montre la planche elle-même, une illustration posée dans un chrome.
Repeindre deux mille lignes de dessin aurait été le chantier d'une semaine
pour un gain nul, et il aurait fallu relire chaque objet.

Corollaire tenu : `.obj canvas` et `.neighbor canvas` gardent `#FDFBF0`,
l'invariant du 16/09. Et le gras du murmure est un corail **profond fixe**,
parce qu'il se peint sur le papier du jeu et non sur `--paper`.

### Les anciens noms sont des alias, pas des reliques

`--navy`, `--teal`, `--mint`, `--sand`, `--pink`, `--brown` existent
toujours et pointent sur la planche. Deux cents usages les lisent : les
renommer d'un coup aurait donné un diff qu'on ne relit pas. Ils disent le
**rôle** (« le rose », c'est l'accent) là où la planche dit la teinte.

Le piège du 16/09 tient toujours : en sombre, `--navy` **est** `--card`. Ce
qui est choisi se peint en `--sel`, qui vaut le lagon en sombre.

### Les vingt-trois `#0B3C5D` en dur

Ils voulaient tous dire la même chose — « l'encre sur une pastille claire »
— et il fallait les retrouver un par un le jour où le bleu changerait.
C'était ce jour-là. `--encre` les remplace, et le contrôle 1 de
`test/design.mjs` refuse désormais toute couleur en dur hors d'une liste de
neuf, chacune documentée dans la feuille.

### L'accueil dit la planche

« Ton île. Ton rythme. » en grand, « Construis, regarde vivre, partage. »
dessous, la porte corail, puis les trois cartes de la planche — Pas de
score, Ton île vit, Cartes postales — et la signature en capitales
espacées.

Quatre choses à ne pas défaire :

1. **C'est toujours un voile, pas une page.** Les cartes du socle ont un
   fond **translucide** (`--voile-carte`) : une carte opaque rendrait l'île
   invisible derrière elle, et l'accueil redeviendrait la page qu'il ne
   doit pas être. Le voile s'est d'ailleurs ouvert d'un cran (94/80/40/24 →
   90/74/34/18), parce que le papier a éclairci et qu'à alphas constants on
   voyait **moins** l'île qu'avant.
2. **Le `h1` porte les deux lignes.** La grande est la marque parlée, la
   petite dit les verbes — et c'est elle qui porte « construis », « île »,
   « partage ». Un seul `h1`, donc une seule réponse à « de quoi parles-tu ».
   Ne pas remonter « Ton île. Ton rythme. » seul en `h1` : il ne répond à
   aucune recherche.

   Il **remplace** la phrase que l'audit du matin avait demandée, « Construis
   ton île. Détends-toi. Partage-la. » — donc ce n'est pas un détail de mise
   en forme, c'est une consigne écartée. Signalée comme telle, et arbitrée :
   les deux lignes restent. La section « Ce qu'un robot lit » garde la
   formulation d'origine avec sa note, plutôt que d'être réécrite.
3. **La coupure du titre est un `<br>`, pas une largeur.** À 12 caractères
   de large, « Ton île. Ton » tient et la coupure tombait après « Ton ».
   Une largeur qui donne la bonne coupure à une taille la donne fausse à la
   suivante.
4. **En portrait, les cartes se replient sur leur titre** (`font-size:0` sur
   le conteneur, la taille rendue aux enfants). Le texte reste dans le
   HTML — c'est un robot qui le lit, pas un pouce — mais trois phrases de
   plus tiendraient l'écran et la porte tomberait sous le pli.

### Les pages publiques ont enfin une maquette

`page()` porte maintenant un en-tête (logotype, menu, porte corail), un
**bandeau de titre** en océan avec son soleil et ses palmiers en filigrane,
le **rang des cinq** (Moi · Maison · Île · Voisins · Cartes postales), une
**citation**, et un pied qui porte la signature et les cinq verbes.

Six choses à tenir :

1. **Le bandeau n'a pas de photo, et n'en aura pas.** Ce dépôt n'a ni build
   ni dépendance : une image par page demanderait un rasteriseur. Le
   dégradé, le halo de corail et les palmiers en crème à 9 % ne chargent
   rien et sont vrais dans les deux thèmes — un bandeau est un **panneau**,
   il n'a pas à suivre le thème.
2. **Le rang des cinq dit « Voisins », pas « Explorer ».** La planche écrit
   Explorer ; le jeu affiche Voisins. Un site qui apprend un mot que le jeu
   n'emploie pas fait chercher un onglet qui n'existe pas. La structure
   vient de la planche, le vocabulaire vient du jeu.
3. **Le rang est aussi sur la page d'une île et sur une carte postale.**
   C'est là qu'arrive quelqu'un qui n'a jamais entendu parler du jeu, par
   un lien reçu sur WhatsApp : « c'est quoi, ce truc ? » a besoin d'une
   réponse en images, pas d'un paragraphe.
4. **`PAGES` a gagné un champ `court`, pas une seconde liste.** Le menu du
   haut porte `court`, le pied porte `nom`. Mesuré : à 1100 px, les quatre
   noms longs poussaient « Créer mon île » à la ligne — une porte tombée
   sous son propre menu. Un champ de plus sur la même ligne ne peut pas
   diverger ; une seconde liste, si.
5. **Pas d'accent grave dans un commentaire de gabarit.** Une apostrophe
   inversée dans un commentaire HTML **à l'intérieur** d'un littéral de
   gabarit ferme la chaîne, et le module ne se charge plus du tout. Trouvé
   en cassant `_commun.js`, pas à la relecture.
6. **Les deux feuilles portent la même planche.** `index.html` et
   `functions/_commun.js` déclarent les sept couleurs chacune de leur côté ;
   le contrôle 1 croise les deux. C'est le piège déjà nommé pour les clés
   Supabase de ce fichier et pour les prix SQL.

### Le logo, et les icônes qui le suivent enfin

Le carré porte maintenant une île de sable sous un palmier vert, un soleil
corail et une vague lagon. Il a été jugé **rendu**, à trois tailles et en
quatre variantes : celle qui l'a emporté est la seule dont la mer ne
déborde pas du coin arrondi — deux candidates avaient une bande d'eau qui
sortait du `rx`, ce qui ne se voit pas dans le balisage.

Les quatre PNG ont été **régénérés depuis ce SVG**, comme la consigne le
demandait depuis le 17/09. La maskable recule à 80 % sur un aplat d'océan :
Android découpe jusqu'à 20 % de chaque bord, et un carré arrondi découpé en
cercle laisse quatre encoches.

Et cette consigne est maintenant **mesurée**. Le contrôle 4 rasterise le
SVG de la source dans un canvas, décode le PNG du dépôt dans un autre, et
compare pixel par pixel : 1,3 sur 255 d'écart moyen aujourd'hui, 111 quand
on met un autre dessin à la place. Une consigne que personne ne relit
finit par être fausse ; celle-ci ne peut plus l'être en silence.

### `test/design.mjs`, neuvième harnais — et ce qu'il a trouvé tout de suite

Quatre sections : la planche est la seule source de couleur, tout ce qui
s'écrit reste lisible dans les **deux** thèmes, le voile garde ses trois
déclarations d'accord, les icônes sont celles du logo.

**Il a trouvé trois vrais défauts à sa première exécution**, tous les trois
en thème sombre et tous les trois invisibles à la relecture :

    la sous-ligne du h1      2,51   `--teal` était resté la mer claire
    la pastille corail       4,18   le corail d'aplat, écrit sur la carte
    les alphas du voile        —    mon propre motif n'en lisait qu'un sur trois

Le troisième est le plus instructif : c'est le **contrôle** qui était
faux. Son expression s'arrêtait au premier `), rgba(` venu, donc elle
concluait que les trois déclarations s'accordaient — sur un tiers de ce
qu'elles disent. C'est, mot pour mot, le défaut des trois prénoms au lieu
de vingt et des îles écrites à la main : *un contrôle qui ne lit pas tout
ce qu'il prétend lire absout à tort.* D'où l'assertion « chacune a bien ses
trois arrêts **et** sa couche plate », qui refuse un relevé trop court.

Les quatre sections ont été éprouvées en remettant une vraie panne, une par
une, et **chacune n'a fait rougir que sa propre ligne** :

    une couleur en dur dans une règle        → section 1
    `--teal` sombre rendu à la mer claire    → section 2, « sous » à 2,51
    un alpha du voile qui dérive             → section 3
    une icône qui n'est plus le logo         → section 4, écart 111

**Ce qu'il ne mesure pas, et il ne faut pas prétendre le contraire :** le
goût. Il n'y a pas d'assertion sur « est-ce joli », et c'est pour ça que
chaque écran a été **regardé** — trois tailles, deux thèmes, le voile, le
jeu, les six pages publiques. C'est la limite déjà écrite pour le son et
pour les deux relevés de genres : il y a des choses dont le juge est
quelqu'un.

Au passage, `aide.mjs` sert maintenant les icônes, le manifeste et
`robots.txt`. Ils ne servaient à aucun harnais — et c'est exactement pour
ça que personne ne vérifiait qu'ils suivaient le logo.

## Le nom de l'île ratait la moitié des cas — 20/09/2026

`suivreLePrenom()` existait depuis le matin et `test/toi.mjs` le disait
vert. Signalé quand même : « l'île de Dan doit se mettre en île de Simon
quand je change mon prénom ». Éprouvé sur **quatre** états de départ au
lieu du seul que le harnais savait produire :

    « L'île de Dan » + prénom « Dan »   → L'île de Simon   ✅
    « L’île de Dan » + prénom « Dan »   → L'île de Dan     ❌
    « L'île de Dan » + prénom vide      → L'île de Dan     ❌
    « Mon île »      + prénom vide      → L'île de Simon   ✅

La deuxième ligne est le piège, et il est bête : tout le jeu écrit
l'apostrophe **typographique**, `defaultWorld()` écrit la droite, et
l'égalité les distinguait. La troisième est celle d'un enfant qui efface
son prénom avant de taper le sien — le lien se coupait pour toujours, sans
rien dire.

Le harnais ne pouvait pas le voir : il fabriquait l'état de départ avec le
même caractère que le code éprouvé. **Une mesure qui raisonne comme son
objet hérite de ses angles morts** — quatrième fois que cette phrase
s'écrit ici, après la regex qui cherchait des sélecteurs, le harnais qui ne
mesurait que des fenêtres étroites, et le seuil qui ne connaissait qu'une
police.

L'égalité est remplacée par une question de **forme** : `nomGenere()`
répond à « ce nom, est-ce le jeu qui l'a écrit ? » et rend la partie
variable, les deux apostrophes valant l'une pour l'autre. On suit alors si
cette partie est l'ancien prénom, ou le nom du compte, ou si l'ancien
prénom était vide. Donc :

    « Roche-Ronde »      n'a pas la forme                  → jamais touché
    « L'île de Marie »   a la forme, mais « Marie » n'est
                         ni l'ancien prénom ni le compte   → jamais touché

C'est la règle du cadre glissé contre le mur plutôt qu'effacé : **on ne
reprend pas ce qui a été choisi.** Toujours aucune clé dans `mondeNu()`
pour retenir « ce nom a-t-il été choisi ? » — la question se déduit encore.

Les cinq cas sont dans `test/toi.mjs`, le refus compris.

## Un déploiement a publié l'ancienne version — 20/09/2026

Le site est en ligne, vérifié : `dansisland.app` sert `eebd21736e9ad6a2`,
l'empreinte exacte du dépôt. Mais **il a fallu deux déploiements**, et le
premier vaut d'être écrit.

Le clone de déploiement était resté sur un vieux commit. La mise en ligne
a donc parfaitement fonctionné — sur le mauvais code.

    ce que servait dansisland.app   cd121071a0adae80   463 210 octets
    ce que portait le dépôt         eebd21736e9ad6a2   492 066 octets

### La vérification à la main ne pouvait pas le voir

Pour trancher vite, j'avais donné deux commandes : l'empreinte du
`dist/index.html` local, et celle de la page servie. Elles sont revenues
**identiques** — et c'était vrai : l'ancienne comparée à l'ancienne.

Le bloc de déploiement que j'avais écrit contenait pourtant « vérifier
qu'on est bien sur le bon commit ». Le raccourci l'a laissé tomber.

C'est, mot pour mot, ce que ce fichier répète depuis le 19/09 : **une
mesure qui ne vérifie pas qu'elle regarde la bonne chose passe au vert en
ne regardant rien.** Les trois prénoms au lieu de vingt, le contrôle 9 qui
ne lisait pas `GRANDS`, le repère absent qui absolvait au lieu de faire
échouer — et maintenant celle-ci, la première qui ait coûté une mise en
production.

Le contrôle du dépôt, lui, l'a vu : il compare l'empreinte servie à celle
du dépôt **reconstruit par le runner**, donc il ne peut pas se tromper de
source. Mais six minutes après coup.

### Le garde-fou est passé de la consigne au script

Une consigne dans un message ne se relit pas. `build.sh` affiche
maintenant, juste avant qu'on publie :

    empreinte : eebd21736e9ad6a2   (492066 octets)
    commit    : 30d31af  (claude/dans-island-relaxation-game-wtkjm8)

et, quand c'est le cas, l'avertissement qui manquait — le nombre de
commits de retard, et la commande exacte pour se remettre à jour. C'est le
seul endroit que personne ne peut sauter : la sortie de la commande qu'on
lance de toute façon.

L'empreinte affichée est **celle que compare le workflow**. Les deux
doivent coïncider après la mise en ligne, et c'est vérifiable d'un coup
d'œil au lieu d'un aller-retour.

Trois choses à ne pas défaire :

1. **Ça ne va jamais chercher le réseau.** `git fetch` déclenché par un
   script de build est une surprise, et une surprise dans un script qu'on
   lance avant de publier est la dernière chose qu'on veut. On lit les
   références déjà présentes, ou on se tait.
2. **C'est `@{u}`, pas `origin/$branche`.** Éprouvé en détachant HEAD —
   ce que fait `actions/checkout` sur un runner : la branche s'y appelle
   « HEAD », donc `origin/HEAD` **résout** vers la branche par défaut et
   le script annonçait un retard inexistant avec un remède absurde
   (`git checkout -B HEAD origin/HEAD`). `@{u}` n'existe que pour une
   branche qui suit vraiment quelque chose, donc le cas détaché se tait
   tout seul. Un faux positif use un garde-fou aussi sûrement qu'un angle
   mort — c'est la leçon de `store.js` compté comme export manquant.
3. **Ça ne fait jamais échouer le build.** Les trois cas — à jour, en
   retard, hors dépôt git — sortent en 0, mesuré. Un script de
   construction qui refuse de construire parce qu'un clone est en retard
   empêche aussi de déployer un correctif en urgence.

Éprouvé sur les trois états, en fabriquant chacun : un clone à jour, un
clone reculé d'un commit, un dossier sans `.git`. Et vérifié que la
modification **ne change pas** `dist/index.html` — l'empreinte est restée
`eebd21736e9ad6a2` de part et d'autre, donc ce garde-fou ne demande aucun
redéploiement.

## Le rAF n'est pas bridé, et ça faisait un an qu'on ne mesurait rien — 20/09/2026 au soir

Ce fichier écrit depuis le 19/09 que le rendu image par image ne s'éprouve
pas : « le rAF y est bridé, le canvas garde la dernière image peinte, et
seize mesures rendent seize fois la même valeur — mesuré, pas supposé ».
Cette phrase a servi de raison de ne rien mesurer pour le requin, le
voilier, les lucioles, les éclats sur l'eau, la respiration du bonhomme et
l'étoile filante. **Remesurée :**

    images par seconde : 60,5
    relevés du canvas  : 6 valeurs distinctes sur 6

**Elle est fausse ici.** Elle a peut-être été vraie sur une autre machine —
ce n'est pas la question. Une limite qu'on n'a pas revérifiée depuis qu'on
l'a écrite cesse d'être une mesure et devient une habitude, et celle-ci
tenait six animations hors de toute épreuve.

C'est la leçon déjà écrite pour l'audit de référencement (« vérifier que ce
qu'il décrit est la version qu'on a ») retournée vers ce fichier lui-même :
**les affirmations d'hier se remesurent, surtout celles qui nous
arrangent.**

### `test/vivant.mjs`, dixième harnais

Il échantillonne le canvas dans le **temps réel** et compte les pixels qui
changent dans une région. Un contrôle qui dirait seulement « ça bouge » ne
prouverait rien — le ciel est plein de mouettes, la mer scintille, le
bonhomme respire. **Ce qui prouve, c'est l'écart avec la même scène dont on
a débranché la chose.**

D'où `servir(port, panne)` : `aide.mjs` sert maintenant une copie d'
`index.html` passée par une fonction. Fabriquer la panne ne demande plus de
modifier le dépôt, et `pannePosee` dit si le remplacement a mordu — une
panne qui ne se pose pas rend le contrôle vert pour la pire des raisons.

Quatre erreurs de sonde, toutes rattrapées par l'image et non par une
assertion, et les quatre valent d'être écrites :

1. **J'ai mesuré le vent sur une île sans un seul arbre.** `test:objets`
   attend `{t,x,y}` et j'écrivais `['palmier',7,6]` : `normaliserMonde()`
   a écarté les neuf objets en silence. Trois sections ont tourné comme
   ça. D'où l'assertion de comptage — 9 sur 9 — avant toute mesure.
2. **Mon comptage rendait 0 sur 9 devant une île qui les portait.** Le
   code de sauvegarde est en **base64** ; je cherchais `"palmier"` dans la
   chaîne encodée. Un compte qui rend zéro devant une chose visible est un
   compte cassé, pas une découverte.
3. **Les trois boîtes du phare visaient le sud-ouest, et le balayage passe
   au nord-ouest.** Elles rendaient 1175/576, puis 327/323, puis 174/164 —
   et resserrer une boîte qui vise à côté ne fait que mesurer le vide de
   plus près. J'ai failli conclure que le faisceau n'existait pas ; il est
   parfaitement visible sur la capture.
4. **`max` ne mesurait pas ce que je croyais.** L'écart le plus fort d'un
   pixel entre deux instants est saturé par les éclats sur l'eau, à 158 des
   deux côtés. Un faisceau **ajoute de la lumière** : c'est la clarté
   moyenne qu'il faut lire.

Les constellations, elles, se mesurent **sur leurs propres segments**, aux
coordonnées que `CONSTEL` déclare, comparées aux mêmes points décalés de
huit pixels. Compter les « pixels clairs » d'une bande de ciel comptait
surtout des nuages et la lune : 1608 contre 1232, un rapport qui ne disait
rien. Sur les traits : 188 contre 126, et 133 juste à côté.

**Les seuils viennent d'une dispersion mesurée, pas d'un chiffre rond.**
Trois tours de chaque côté : 3591/3727/3834 avec le vent, 1667/1694/1703
sans. Le rapport observé va de 1,7 à 2,3 et vaut **1,0 par construction**
vent coupé. Le seuil est à 1,4 — entre les deux, jamais au bord de l'un
d'eux, parce qu'un contrôle qui clignote finit par ne plus être lu. Et il
n'a **pas** été obtenu en forçant la rafale : remonter l'amplitude pour
faire passer une mesure, c'est laisser la mesure décider du jeu.

## Le vent, le phare et les constellations — 20/09/2026 au soir

**Aucune migration, aucune clé de plus dans `mondeNu()`** — vérifié par le
harnais, qui relit le code de sauvegarde avant et après une rafale et
refuse toute clé de vent. C'est du dessin : la ligne déjà écrite pour les
mouettes, le requin et le voilier.

**`VENT_PLIE` est une propriété du type**, dans le catalogue, au même titre
que `NIVEAU`, `PIVOT_ILE`, `EMPRISE_ILE` et `ECH_BAT`. **Un type absent ne
plie pas, et c'est le bon défaut** : une maison qui ondulerait serait bien
pire qu'un arbre immobile. Le rocher, le puits et les six bâtiments n'y
sont pas, et n'ont pas à y être.

Cinq choses à ne pas défaire :

1. **Le vent est une onde qui traverse l'île**, pas dix objets qui battent
   ensemble : la phase se déduit de `x+y`. C'est mot pour mot la leçon des
   vingt-deux éclats sur l'eau — ce qui bat à l'unisson se lit comme un
   clignotement d'écran. Deux périodes non multiples l'une de l'autre,
   sinon c'est un métronome.
2. **Il se pose dans `drawWorld()`, jamais dans `DRAW.*`.** `dessinDe()`
   peint aussi les vignettes de l'atelier et de la vitrine, et un palmier
   qui ondule dans une case de 60 px se lit comme une image qui tremble.
   C'est la règle déjà écrite pour le scintillement du coffre.
3. **C'est un cisaillement, pas un déplacement** : la base reste plantée
   dans le sol et c'est le haut qui part. Un objet déplacé en bloc
   glisserait sur sa case. L'ombre ne bouge pas : c'est l'arbre qui plie,
   pas le soleil.
4. **`touffe()` reçoit le vent en quatrième paramètre, et il est
   optionnel.** Absent, il vaut zéro et la touffe est celle d'avant — un
   dessin qui exige son état ne peut plus servir de vignette, c'est la
   règle des `||0` de la girouette. Les brins ne plient pas tous pareil,
   sinon la touffe se lit comme un éventail.
5. **Le faisceau du phare est peint dans la section de nuit**, où le
   `clip()` sur `seaPath()` et le `lighter` sont déjà posés : il s'arrête
   donc au bord de la mer au lieu de déborder sur le papier — la règle de
   `wMer()` partagé, écrite pour le requin — et il ajoute de la lumière au
   lieu de peindre par-dessus. Il est **écrasé au rapport de la case**
   (`TH/TW`) comme la flaque de jour sur le plancher : un faisceau rond
   serait posé debout sur l'eau.

**Les constellations sont des formes, pas des étoiles reliées au hasard.**
Un premier essai tirait des traits entre les vingt-six étoiles déjà semées
par `h2()` : ça ne donne pas une constellation, ça donne un gribouillis.
La Casserole, parce que c'est celle que tout le monde sait retrouver, et le
Voilier, parce qu'il passe déjà au nord de l'île. Deux, pas cinq : trois
formes de plus et ce ne serait plus un ciel, ce serait un planétarium.
Elles ne se cliquent pas et ne rapportent rien — dans ce jeu une chose qui
brille est une chose à prendre, alors elles ne brillent pas, elles luisent.

**Ce qui a été écarté en chemin :** « les fenêtres s'allument une à une au
crépuscule ». `world.sky` est un **choix du joueur**, pas une transition —
il n'y a pas de crépuscule qui tombe, il y a un bouton. Simuler l'allumage
progressif aurait donné une maison qui clignote. Écarté après avoir lu le
code, pas après l'avoir écrit.

## La météo, déduite de l'horloge de la marée — 20/09/2026 au soir

**Aucune migration, aucune clé de plus dans `mondeNu()`, et pas une ligne
de SQL** — c'est ce dernier point qui a décidé de sa forme. La marée porte
déjà une horloge accordée au serveur : `etatMaree()` rend `numero + phase`,
qui avance de 1 toutes les 12 h 25 et que `accorderMaree()` remet à l'heure
dès que le serveur répond. `meteoNo()` la découpe en cinq tranches de
2 h 29 et tire le temps de ce numéro.

Conséquence voulue, la même que pour la marée : **il fait le même temps sur
tout l'archipel**, donc deux enfants qui jouent le même soir peuvent en
parler. Une météo tirée dans chaque navigateur serait une décoration.

Sans compte ou hors ligne, le cycle local prend le relais, comme pour la
mer et comme `dansisland:bourse` pour la bourse.

**Rien ne rapporte, rien ne coûte, rien ne ralentit.** Pas de plafond, rien
dans `faits`, pas une ligne qui touche au déplacement — vérifié par le
contrôle 6 de `vivant.mjs`, qui lit le bloc et refuse `PLAFOND`, `GAIN_`,
`bourse_gagner`, `vitesse`, `blocked(`. Un temps qui paierait serait un
gain qui tombe tout seul cinq fois par jour, exactement ce que la marée a
refusé d'être. Et **il n'y a pas de mauvais temps** : la pluie est une
chose à regarder depuis sa fenêtre, pas une punition. C'est la ligne du
chien qui s'assied.

### Le défaut du premier jet : des particules sans lumière

La pluie tombait, **et le soleil brillait au-dessus**. Ça ne se lit pas
comme de la pluie, ça se lit comme des rayures sur l'écran. Un temps se
reconnaît d'abord à la **lumière du cadre**, et seulement ensuite aux
gouttes — d'où `SOLEIL_VOILE` (ce qui reste du soleil) et `METEO_VOILE`
(le voile posé sur tout le cadre). Sans eux, un contrôle qui compte les
gouttes serait passé au vert sur un dessin qui ne marchait pas.

Mesuré, clarté moyenne du cadre : beau 212, nuages 205, pluie 192,
brume 220 — la brume **délave** au lieu d'assombrir, et c'est ce qui la
distingue d'un ciel couvert.

Cinq choses à tenir :

1. **Un type absent n'a ni voile ni pli**, et c'est le bon défaut — la
   même règle que `VENT_PLIE`. Ce qui n'est pas déclaré ne change rien.
2. **La pluie est peinte après le voile**, pas avant : le voile la
   délavait, et c'est ce qui lui manquait.
3. **Le voile est hors caméra**, en tout dernier : il est entre l'œil et
   l'île, pas posé sur l'eau. Sous la caméra, il glisserait avec le monde.
4. **L'arc-en-ciel, lui, appartient au monde** : il est posé sur la mer,
   donc il glisse avec elle, et l'île le cache — un arc-en-ciel est loin.
   Il n'est pas dans `METEO` : il se **déduit** d'une tranche belle qui
   suit une tranche de pluie, et ne dure qu'une demi-tranche. Ce qui ne se
   rate jamais ne se remarque plus.
5. **Il doit passer largement au-dessus de l'île.** Le premier jet, à
   `MER_RX*0,86` centré près du niveau de la mer, n'en laissait voir que
   **deux pieds** posés sur l'eau : l'île mangeait toute l'arche. Ce
   n'était pas un défaut de profondeur, c'était un défaut de taille — un
   arc dont on ne voit pas l'arche n'est pas un arc.

Les mouettes ne volent plus sous la pluie et les nuages descendent d'un
cran : **ce sont les mêmes `NUAGES`, décalés d'un demi-écran et abaissés**,
jamais une seconde liste — deux listes divergent au premier réglage.

## Les saisons ajoutent, elles ne repeignent jamais — 20/09/2026 au soir

L'île suit le vrai calendrier. Tout se déduit de `jourDuJeu()`, qui est
déjà le jour du **serveur** : aucune clé de plus dans `mondeNu()`, aucune
migration, aucun gain.

**La règle qui a décidé de toute la forme : une saison ajoute, elle ne
remplace jamais.** Le joueur a choisi sa palette de terrain et la couleur
de chacun de ses objets ; un hiver qui repeindrait son herbe en blanc lui
prendrait son île. La neige se **pose dessus**, les feuilles se **sèment
dessus**, les pétales **passent devant**. On voit toujours ce qu'on a
choisi.

Corollaire tenu, et c'est celui que le contrôle vérifie en premier :
**l'été n'ajoute rien du tout**, donc c'est exactement l'île d'avant.
Personne ne se réveille avec une île qu'il ne reconnaît pas. Mesuré, clarté
du sol : été 182, printemps 182, automne 180, hiver 206 — le printemps ne
touche pas à la terre, il ne fait tomber que des pétales.

Trois choses à tenir :

1. **Les dates sont météorologiques** (1er mars, juin, septembre,
   décembre), pas les solstices : elles tombent sur un premier du mois,
   donc elles se disent à un enfant en une phrase.
2. **`saisonNow` se relit une fois par image, pas par case.**
   `jourDuJeu()` traverse la bourse, et le faire quatre cents fois par
   image pour un résultat qui change une fois par trimestre serait absurde.
3. **Pas de neige quand il pleut.** Les deux à la fois, c'est un ciel qui
   se contredit.

**Les phrases disent ce qui est vraiment dessiné.** Le premier jet
promettait « il a neigé sur les toits » — la neige se pose sur les cases,
pas sur les toitures, qui sont des dessins à part. Promettre un détail
qu'on ne peint pas, c'est envoyer un enfant le chercher ; la phrase dit
donc « il neige, et le sol est blanc ».

### Le crochet `test:me`, et le piège d'`Object.assign`

`test:me` sème un avatar **tel qu'il serait déjà en base**, par le vrai
chemin de chargement. Il est né pour éprouver le passage du visage en
24x24, et il a immédiatement cassé tous les autres harnais : le jeu charge
par `Object.assign(defaultWorld(), monde)`, et **`Object.assign` recopie
une clé même quand sa valeur est `undefined`**. Un `me: undefined` écrasait
donc l'avatar par défaut, et le jeu mourait au premier `mine.me.name`.

La clé n'est ajoutée que si elle existe. C'est une ligne, mais c'est le
genre de ligne qui fait tomber dix harnais d'un coup — et le message
(`Cannot read properties of undefined`) ne nomme jamais le coupable.

## L'hôte fait les cent pas chez lui — 20/09/2026 au soir

Vingt îles de démonstration sont la première chose qu'un nouveau venu voit
en cliquant « Voisins ». Leur hôte était **assis** : vingt cartes postales
où rien ne bouge. Il marche maintenant devant sa porte, s'arrête, repart.

**Aucune clé de plus dans `mondeNu()`** — tout se déduit de `t` et de la
position de la maison, donc deux voisins ne marchent pas au pas, et rien ne
se remet à zéro quand on change d'île. La bestiole de l'hôte suit
gratuitement : elle se cale déjà sur sa position.

Trois choses à ne pas défaire :

1. **Le segment est éprouvé case par case avant d'être parcouru.** Une
   maison au bord de l'île peut avoir la mer devant sa porte, et un hôte
   qui marcherait sur l'eau serait le défaut qu'on ne découvre qu'à la
   dix-septième île. On rétrécit tant qu'une extrémité n'est pas sur
   `terre()`, et **s'il ne reste rien, l'hôte reste assis** — c'est-à-dire
   exactement l'état d'avant. Un repli qui rend l'ancien comportement ne
   peut pas faire de dégât, et c'est ce que le contrôle vérifie en
   refusant `terre()` partout.
2. **Il ne va pas à ta rencontre**, et c'est un choix : ça demanderait un
   chemin, donc un état, donc quelque chose qui peut se coincer. Un
   va-et-vient dit « il habite ici » aussi bien et ne peut rien rater —
   la ligne du chien qui s'assied.
3. **Deux pauses par aller-retour.** Sans elles, c'est un pendule : le
   défaut déjà nommé pour un vent à une seule période.

## `vivant.mjs` mesure par beau temps d'été, et c'est son garde-fou le plus important

La saison et la météo ajoutent toutes deux des choses qui tombent, et elles
tombent dans les régions où l'on mesure le vent. Sans les figer, ce harnais
**mesure autre chose selon le jour et l'heure où on le lance** :

- lancé un 20 septembre, le contrôle du vent est tombé de 2,1x à 1,2x
  parce que les feuilles d'automne bougeaient des **deux** côtés de la
  comparaison ;
- et la météo tourne toutes les 2 h 29, donc une tranche de pluie aurait
  rendu le même contrôle rouge une fois sur sept, au hasard.

**Un contrôle dont le verdict dépend du calendrier n'est pas un contrôle,
c'est un oracle.** Il aurait été rouge tout l'automne et vert en juillet
sans que rien du jeu n'ait changé — et c'est le pire des deux mondes, parce
qu'on finit par ne plus le lire. `NEUTRE` fige l'été et le beau temps ;
seules les sections qui éprouvent l'un ou l'autre forcent le leur.

C'est la même famille que le seuil calibré sur une police (19/09) et que la
fenêtre d'échantillonnage tirée au hasard dans le cycle du vent : **une
mesure doit tenir toutes ses variables sauf celle qu'elle nomme.**

## Le lit était une sculpture ratée — 20/09/2026 au soir

Signalé en jouant, et c'était juste : une tête de lit de **52 unités**,
plus haute qu'une commode et qui masquait le bonhomme ; un édredon posé
**à côté** du matelas au lieu de le couvrir ; un oreiller qui flottait en
biais. Trois boîtes sans rapport.

**Ce qui l'avait rendu illisible tient en une ligne : deux jeux de
coordonnées écrits à la main**, un par orientation, avec des ternaires
partout. Impossible de voir qu'un décalage était faux, puisqu'il n'y avait
rien à quoi le comparer. C'est exactement le défaut des trois phrases qui
recollaient leur article à la main avant `laPiece()`.

D'où `axe()` : **le lit s'écrit une fois**, dans un repère tête-pieds, et
l'orientation ne choisit plus que la façon de reposer ce repère. Un lit se
lit à quatre choses, et il les faut toutes — un sommier qui porte, un
matelas en retrait dessus, une couette qui part **des pieds** et s'arrête
avant l'oreiller, et un revers replié à son bord. Sans le revers, la
couette est une planche posée.

La leçon, et c'est la même que pour les six bâtiments du 19/09 : **ça ne se
voit que rendu.** Quinze relectures n'avaient pas vu ce lit ; une capture
d'écran l'a dit en une seconde.

## Le bouton qui rend la main est toujours là — 20/09/2026 au soir

Il n'apparaissait que quand un outil était armé, au nom de la règle du
bouton mort tenue pour l'appareil photo. **Le raisonnement était faux, et
c'est une distinction qui vaut d'être écrite** : l'appareil photo, on sait
qu'on ne l'a pas acheté ; un bonhomme qui ne répond plus, on ne sait
**pas pourquoi**. Demander de trouver un bouton qui n'existe que dans
l'état où l'on est déjà perdu, c'est demander le diagnostic avant le
remède.

Demandé explicitement — « peu importe où l'on se trouve dans le jeu » — et
c'est ce qui en fait un secours plutôt qu'un raccourci.

Trois choses à tenir :

1. **Il lève les trois choses qui confisquent le clic** d'un seul geste :
   le pinceau armé, le viseur de l'appareil, le comptoir de la carte
   postale. Un enfant n'a pas à savoir laquelle des trois le retient.
2. **Il rend, il n'annule jamais.** La balade du chien continue, rien
   n'est effacé. Et il reste visible après coup : un secours qui disparaît
   quand tout va bien est introuvable quand ça ne va plus.
3. **Il se met en avant quand il a quelque chose à rendre** (`aria-pressed`
   + corail), parce qu'un bouton permanent dans une colonne de quatre
   devient sinon un meuble qu'on ne voit plus. C'est `--accent`, et l'état
   choisi se peint en `--sel` ailleurs : jamais `--navy`, qui est la
   couleur de la carte en thème sombre.

La colonne du bord droit est la seule qui existe **partout** — dehors,
dedans, chez les voisins — et c'est pour ça que le bouton y vit.

## Le potager, et la date qui n'existe nulle part — 20/09/2026 au soir

Deux questions tranchées avant d'écrire une ligne, et ce sont toujours les
mêmes.

**Est-ce que ça rapporte ?** Non. Pas un shell, pas un plafond, pas un cran
de terrain. « L'île grandit parce que des gens sont passés, jamais parce
que le temps passe » — et un potager qui paierait serait exactement ce que
cette phrase interdit, puisque tout ce qu'il fait, c'est attendre.

**Où vit la date de plantation ?** Nulle part. C'est la réponse qui a
décidé de toute la forme : un objet posé reste `{t,x,y,o,c}`, et la pousse
**se déduit du jour**, exactement comme la marée se déduit de l'heure et la
météo de l'horloge de la marée. Aucune clé de plus, aucune migration.

Conséquence voulue, la même que pour la marée et le temps : **tous les
potagers de l'archipel en sont au même point**, donc deux enfants qui
jouent le même jour peuvent en parler. Et il n'y a rien à planter, rien à
arroser, rien à rater.

Quatre choses à tenir :

1. **Six jours de cycle, un pas par jour.** Ni sept ni trente : une semaine
   se compte, un mois s'oublie.
2. **Rien ne meurt jamais.** Après le sixième jour ça recommence — il n'y a
   pas de récolte manquée. La ligne du chien qui s'assied.
3. **Le calcul part d'une date, pas d'un hachage.** Deux jours de suite
   doivent donner deux pas de suite, ce qu'un `h2()` ne garantit pas.
4. **L'hiver, la terre se repose** : le potager reste au premier état. Ce
   n'est pas une perte, c'est une saison — et la neige le couvre déjà.

Il est **gratuit**, au rayon Nature. Un objet payant aurait demandé une
ligne de `catalogue` en SQL, donc une migration à jouer — et surtout, un
potager qu'on ne trouve qu'après avoir gagné trente shells n'est pas un
potager, c'est une récompense. `potagerProche()` ne lit pas `estSouvenir()`
non plus : un carré de terre rapporté de chez un ami pousse comme les
autres, puisqu'il ne *fait* rien au sens de `FONCTIONNEL`.

C'est le seul objet du jeu dont tout le propos est **qu'il ne se passe rien
aujourd'hui** et qu'il faut revenir demain. Pas de plaque rose, pas de `E` :
il se regarde.

## L'album n'est plus une impasse — 20/09/2026 au soir

On prenait une photo, elle descendait dans les fichiers, et la vignette
restait dans ce navigateur pour toujours. **Une chose qu'on fabrique et
qu'on ne peut montrer à personne n'a pas sa place dans un jeu dont le
moteur est le partage.** Cliquer une photo l'envoie.

**Ce n'est pas une carte postale, et il ne faut pas les confondre** — c'est
écrit depuis le 18/09 : la carte porte l'adresse de l'île, c'est une
**invitation** ; la photo ne porte que ce qu'on a cadré, c'est un
**souvenir**. Le texte de partage le dit donc autrement, et il ne porte
**pas de lien** : une photo n'invite personne, elle se montre.

Trois choses à tenir :

1. **La photo est passée de 260 à 720 px**, parce qu'à 260 elle arrive
   dans une conversation comme un timbre flou. Mesuré sur le vrai cadre :
   260 px → 6 ko, 520 → 13, 720 → 20, 900 → 26. Les douze tiennent dans
   **0,2 Mo**, très loin des cinq mégaoctets que `localStorage` accorde.
   Ce qui rend l'agrandissement sûr, c'est la boucle de
   `rangerDansLalbum()` qui existait déjà : quand le stockage refuse, on
   jette la plus ancienne jusqu'à ce que ça rentre. Le coût n'est donc pas
   un risque de casse, c'est un album plus court sur un navigateur serré.
2. **Jamais plus large que la source** (`Math.min(720, vue.width)`). Sur un
   écran à un pixel par point le cadrage fait moins de 720 : demander 720
   donnerait un JPEG plus lourd **et** plus flou que l'original.
3. **Le repli n'est pas perdu, il est devenu le repli.** `envoyerPhoto()`
   tente `navigator.share({files})`, puis retombe sur l'enregistrement —
   l'ancien geste, exactement. Un `AbortError` ne déclenche pas le repli :
   on ne renvoie pas ce qu'on vient de refuser.

Ce que le harnais **ne peut pas** éprouver, et il le dit : `navigator.share`
n'existe pas dans un navigateur piloté. On éprouve le repli — celui que la
plupart des joueurs sur ordinateur rencontreront — et on vérifie dans la
source que le chemin natif est tenté d'abord. Le partage natif reste dans
la liste de ce qui ne s'éprouve qu'à la main, avec le son et le parrainage
à deux comptes.

## Le tirage devient une carte qu'on publie — 20/09/2026 au soir

Le tirage de l'appareil photo était un polaroid : marge blanche, bande plus
large en bas, le nom de l'île. Il est maintenant au **format 4:5**, celui
d'un fil Instagram, et il porte `dansisland.app`.

**Il ne recadre pas l'île, il la monte.** Un 4:5 est un portrait et le
cadre du jeu est un paysage de 1,536:1 : découper un 4:5 dedans ne
garderait qu'une tranche verticale de l'île, c'est-à-dire presque rien. On
garde donc la photo entière et on lui donne du papier au-dessus et en
dessous — ce qui est exactement ce à quoi ressemble une affiche, et ce qui
laisse la place à la signature.

Deux choses à tenir :

1. **Les deux bandes se déduisent du rapport voulu**, elles ne sont pas
   écrites en dur : `reste = H - h - 2m`, puis 34 % en haut. Des hauteurs
   fixes seraient fausses le jour où la photo change de proportion.
2. **Le joueur ne perd rien.** Il obtient la même photo, sur une carte
   qu'il peut publier telle quelle — et le jour où il la publie, elle
   porte l'adresse. Chaque photo partagée devient une invitation, comme la
   carte postale.

Mesuré : 1206x1508, rapport 0,800 exactement.

## Le visage se peint en 24x24 — 20/09/2026 au soir

`FACE_N` passe de 12 à 24, et **le choix du nombre est tout le sujet** :
24 est le double exact de 12, donc chaque ancienne case devient exactement
quatre nouvelles et un visage déjà dessiné se relit **sans une perte de
pixel**. Une grille de 16 ou de 20 aurait demandé un rééchantillonnage,
c'est-à-dire d'abîmer un dessin que quelqu'un a fait à la main.

C'est la règle qui prime sur toutes les autres ici : **on ne touche jamais
aux données d'un joueur.** Une grille plus fine ne vaut pas un visage flou.

Quatre choses à tenir :

1. **La conversion est à la lecture, jamais à la sauvegarde.**
   `faceAgrandie()` relit une chaîne de 144 dans la grille du jour ; elle
   reste une chaîne de 144 en base tant que l'enfant ne repeint pas.
   Aucune migration, aucune clé de plus.
2. **L'agrandissement est entier ou il n'a pas lieu.** `FACE_N % n` refuse
   ce qui ne tombe pas juste, plutôt que d'interpoler. Un visage d'enfant
   qu'on lisserait ne serait plus le sien.
3. **Le quadrillage s'allège quand la grille se resserre.** À douze cases,
   un trait par case aidait à viser ; à vingt-quatre, les vingt-cinq traits
   dans chaque sens mangeaient le dessin. Traits fins très pâles, **un sur
   quatre** marqué — le papier millimétré.
4. **Le canvas passe de 264 à 384 pixels** pour que chaque case en fasse
   seize et non onze. C'est du dessin plus net, pas un panneau plus large :
   la taille d'affichage ne bouge pas, et `peindreCase()` ramène le point
   dans ce repère, donc la visée suit toute seule.

**Corrigé au passage, un commentaire faux depuis le début :** « treize
couleurs au maximum, parce qu'un caractère par case ». Un caractère en base
36 en porte **trente-six**. Il y a treize couleurs parce qu'on en a choisi
treize, pas parce que le format s'arrête là. Le piège d'`encode()` est réel
— il commence à trente-sept.

`test:me` est né pour ce chantier : il sème un avatar **tel qu'il serait
déjà en base**, par le vrai chemin de chargement. C'est la seule façon de
poser la question qui compte — *un visage dessiné avant que la grille ne
change se relit-il encore ?* — et un harnais qui écrirait dans `mine.me`
après coup sauterait `normaliserMonde()`, c'est-à-dire l'endroit exact où
une donnée de joueur se perd sans bruit.

*(Et un témoin de plus qui se vérifiait lui-même : mon premier jet
cherchait le violet sous le caractère `'9'`, alors que `#9B6BC9` est le
onzième de `FACE_COUL`, donc l'index 10, donc `'a'`. Le contrôle rendait
zéro pixel et il avait raison — c'est le témoin qui était faux. L'index se
lit maintenant dans la source.)*

## Reste du contexte

Voir README.md : modèle de données, file d'attente de sauvegarde, mise en route.
