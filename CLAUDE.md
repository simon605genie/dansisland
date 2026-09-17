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

Le pied de page, lui, reste : c'est le seul endroit qui dit comment
marcher. Sa dernière phrase (« tout est stocké dans ton navigateur »)
n'est plus vraie depuis les comptes, et n'a pas été touchée ici.

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

## Reste du contexte

Voir README.md : modèle de données, file d'attente de sauvegarde, mise en route.
