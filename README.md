# DAN'S ISLAND — V1

Chacun fabrique son île, la publie à son adresse, et va marcher sur celle des autres.

**En ligne : https://dansisland.pages.dev**

## Ce qu'il y a dans le dossier

    index.html          l'app entière (moteur isométrique + éditeur + son + panneaux)
    src/config.js       URL et clé publishable Supabase
    src/store.js        seule couche qui parle à Supabase
    supabase/schema.sql tables, RLS, vue archipel — idempotent
    supabase/2026-09-16_grille18.sql  migration à jouer une seule fois
    _redirects          Cloudflare Pages : catch-all, toute adresse sert index.html
    build.sh            copie dans dist/ les seuls fichiers à publier

Pas de build : ce sont des modules ES servis tels quels.

## Le projet Supabase

Organisation **Dan's Island** (plan Free) — compte `simon605genie`.
Projet **dansisland**, ref `cgputbitzfgokpwbbind`, région Europe.
C'est un projet séparé de celui de mamash : rien n'est partagé, ni les comptes ni les données.

    Dashboard   https://supabase.com/dashboard/project/cgputbitzfgokpwbbind
    Éditeur SQL https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new
    Auth URLs   https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/auth/url-configuration

La clé dans `src/config.js` est une clé **publishable** (`sb_publishable_…`), pas
l'ancienne `anon` : Supabase ne propose plus les clés legacy sur les nouveaux
projets. C'est pour ça que `store.js` charge `@supabase/supabase-js@2` et non une
version épinglée plus ancienne — les clés publishable ne sont pas gérées avant 2.49.

## État

Le schéma est appliqué, le site est déployé, les URLs d'auth pointent sur le
domaine public. Vérifié en production : création de compte, création d'île,
vue `archipel`, et les pages d'île (`/simon`) en mode visiteur.

Pas encore éprouvé :

- **La bourse côté serveur.** `supabase/2026-09-16_bourse_serveur.sql` n'a
  pas été joué au moment où il a été écrit : il n'y avait pas de Postgres
  sous la main pour le relire autrement qu'à l'œil. Tant qu'il n'est pas
  passé, le client retombe sur sa bourse locale sans rien casser — mais les
  shells gagnés entre-temps restent dans le navigateur. À jouer dans
  [l'éditeur SQL](https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new),
  d'un bloc, en vérifiant que l'en-tête dit bien « dansisland ».
- **Les visites payantes en vrai.** Elles demandent deux comptes : un qui
  plante, un qui reçoit. Le crédit du visiteur se voit tout de suite dans
  le murmure ; celui de l'hôte ne se vérifie qu'en se reconnectant avec
  l'autre compte.

- **Le livre d'or.** Aucun mot en base. Planter un mot chez soi valide
  l'écriture ; il faut un second compte pour vérifier qu'un visiteur ne voit
  pas les mots masqués.
- **Le lien magique en conditions réelles.** Le SMTP par défaut de Supabase
  est limité à 2 envois par heure — inutilisable au-delà d'une poignée de
  testeurs. Brancher un vrai SMTP avant d'ouvrir à du monde.

- **Le ramassage d'un souvenir en marchant.** La touche `E` et la bulle de
  proximité n'ont pas pu être essayées en pilotage automatique : un
  navigateur en arrière-plan met `requestAnimationFrame` en pause, donc le
  bonhomme ne marche pas. À essayer à la main chez un voisin qui a des
  objets.

### Pas de renommage de slug dans l'app

Une fois l'île créée, le panneau bascule sur « copier le lien » : l'adresse
n'est plus modifiable depuis l'interface. Ça se fait en SQL.

```sql
update public.iles set slug = 'nouveau' where slug = 'ancien';
```

## Mise en route en local

1. Servir le dossier :

       python3 -m http.server 8080

2. Garder `http://localhost:8080` dans les **Redirect URLs** Supabase, sinon
   le retour du lien magique est refusé.

Les adresses d'îles (`/simon`) renvoient un 404 en local : `_redirects` n'est
lu que par Cloudflare Pages. Seule la racine est testable ainsi.

## Déploiement

Projet Pages **dansisland**, branche de production `main`, compte
`simon@sababa.be`.

`build.sh` prépare `dist/` avec les **quatre fichiers du site** et rien
d'autre : ni `supabase/schema.sql`, ni `CLAUDE.md`, ni ce README n'ont à être
servis publiquement. C'est le seul rôle du build — il n'y a toujours rien à
compiler, ce sont des modules ES.

Réglages de l'intégration Git, côté Cloudflare :

    Build command       bash build.sh
    Output directory    dist
    Production branch   main

Déploiement à la main, si besoin :

```bash
./build.sh && npx wrangler pages deploy dist --project-name dansisland --branch main
```

Après le déploiement, dans **Auth → URL Configuration** : Site URL sur
`https://dansisland.pages.dev`, et `https://dansisland.pages.dev/**` dans les
Redirect URLs — le `/**` est nécessaire pour revenir sur une adresse d'île.

## La grille, et pourquoi elle fait 18

Elle a fait 12x12 jusqu'au 16/09/2026. Le rayon de l'île, lui, est une
donnée : `monde.rayon`. Il part à 7,0 et gagne 0,13 par mot reçu dans le
livre d'or, plafonné à 8,3. **L'île grandit parce que des gens sont
passés**, jamais parce que le temps passe. On ne peut ni peindre ni poser
hors du rayon acquis.

La grille est fixe et large, le rayon bouge : c'est ce qui évite de
refaire une migration à chaque fois que l'île doit grandir.

Les coordonnées écrites en dur dans `index.html` datent du 12x12 et
passent par `depuis12()`. Les îles déjà en base passent par
`recentrer()` au chargement, qui déplace `tiles`, `house` et `objects` de
trois cases. Les mots, eux, vivent en colonnes SQL et ne peuvent pas être
décalés côté client : c'est le rôle de `supabase/2026-09-16_grille18.sql`,
**à ne jouer qu'une fois**.

## Portrait et paysage

Il manquait le `<meta name="viewport">` : sans lui un téléphone rend la
page à 980 px et dézoome, le jeu devient illisible. Le reste tient en
trois règles CSS.

Le cadre fait 768x500, soit un rapport de 1,536. Sa largeur est bornée
par la hauteur disponible (`max-width: calc((100svh - Xpx) * 1.536)`),
sinon en paysage il déborde sous l'écran et on joue sans voir son île.

En paysage court (moins de 560 px de haut), l'atelier reprend sa place à
droite et l'en-tête se fait petit : la hauteur est la denrée rare. En
portrait étroit, l'accroche disparaît, la grille d'objets passe à trois
colonnes et la bulle de murmure rétrécit pour ne pas manger l'île.

Le jeu se joue au doigt sans rien ajouter : toucher l'île déplace le
bonhomme, toucher avec un pinceau actif pose. Le message d'accueil teste
`(pointer:coarse)` et cesse d'annoncer des touches à qui n'a pas de
clavier.

## Le son

Aucun fichier audio dans le dépôt, et rien à charger. Les trois ambiances
(vagues, oiseaux, nuit) et les bruits d'outil sont synthétisés par l'API
Web Audio : du bruit filtré dont le volume respire pour la mer, des notes
glissées pour les oiseaux, une stridulation pour les grillons. Pas de
licence à vérifier, pas de poids à héberger.

L'ambiance appartient à l'île (`monde.ambiance`) : un visiteur entend
celle que le propriétaire a choisie. Le bouton **Son** du cadre, lui, est
une préférence de joueur, gardée dans `localStorage`.

Un navigateur refuse de faire du bruit avant un geste de l'utilisateur :
le contexte audio ne s'ouvre qu'au premier clic sur la page. C'est normal
que le premier chargement soit silencieux.

## Les îles bot

Vingt îles peuplent l'archipel : trois écrites à la main, dix-sept
fabriquées par `mkBot()` à partir d'une graine, donc identiques pour tout
le monde. Chacune a son parti pris (plage, forêt, désert, village, port) :
une île qui mélange tout ne ressemble à rien.

Ce ne sont pas des comptes. Elles n'existent pas en base, `iles` n'a pas
de ligne pour elles, et les mots qu'on y laisse restent dans le
navigateur. Elles servent à éprouver la visite, les souvenirs et
l'annuaire sans attendre d'avoir du monde. Elles complètent l'archipel
réel au lieu de le remplacer, sinon elles disparaîtraient à la première
vraie île.

Leur slug vient de leur nom (`/la-crique`). `go()` regarde les bots avant
la base : si un jour quelqu'un réserve un de ces slugs, c'est le bot qui
gagnerait. À surveiller le jour où on ouvre les inscriptions.

## L'intérieur de la maison

Trois pièces, salon, chambre, atelier, et personne d'autre que le
propriétaire n'y entre.

**On entre en marchant.** Monter sur le seuil, la case devant la porte
dessinée, fait entrer ; le paillasson du salon fait ressortir ; les
embrasures font passer d'une pièce à l'autre. `E` et le bouton rose du
cadre restent là pour qui préfère, et pour l'autre case devant la maison,
celle qui invite sans ouvrir.

Entrer ouvre l'onglet **Dedans**, ressortir rend l'onglet qu'on avait.
L'atelier suit le bonhomme au lieu d'attendre qu'on le retrouve.

Une porte franchie en marchant se **réarme** : `sasArme` empêche de
ressortir sur le seuil et de rentrer aussitôt, en boucle. Il redevient
vrai dès qu'on quitte la case de la porte.

**Rien n'a bougé dans le schéma SQL.** Tout vit dans `monde.interieur`,
dans le même jsonb que le reste :

    interieur: { v:1, pieces: { salon:{sol,mur,meubles:[…]}, chambre:…, atelier:… } }

La ligne est celle-ci : **l'architecture est du code, la décoration est de
la donnée.** La taille des pièces, la position des portes, leur
enchaînement vivent dans `PIECES`, en dur. Élargir le salon un jour ne
demandera aucune migration. C'est la même règle que dehors, où la forme de
la maison est en dur et où seules ses couleurs sont en base.

Un meuble, c'est `{t,x,y,o,c}` : le type, la case, le sens, la couleur.
L'encombrement (1x1, 2x1, 2x2) est une propriété du **type**, il vit dans
`TAILLE` et jamais dans le jsonb. Le tapis est le seul « plat » : il se
pose au sol, sous le reste, et ne bloque pas la marche.

La porte fermée est une **règle de jeu, pas un secret** : `interieur`
voyage dans le même jsonb que le reste, donc un visiteur qui lit l'API
voit la décoration. Rien de sensible n'a à vivre là. Le jour où il
faudrait que ce soit vraiment privé, il faudra une colonne à part et une
policy RLS, donc du SQL.

### Le rendu

Même moteur, même projection, même tri par `x+y`. Le seul changement est
`vue` : la caméra que lisent `iso()` et `unIso()`. Elle vaut l'île dehors,
la pièce dedans, et tout ce qui en dépend (le curseur, le bonhomme, la
profondeur) suit sans une ligne de plus. La case fait 72 px dedans contre
56 dehors : une pièce est petite, les meubles ont le droit d'être lisibles.

La pièce est une **boîte ouverte** : seules les deux parois du fond sont
dessinées, celles près de la caméra sont omises. Sans ça, on ne voit rien.

### La visée, corrigée le 16/09/2026

`vue.probe` est ce qu'on ajoute à l'ordonnée d'un clic avant de repasser
par `unIso()`. Le losange peint pour la case `(x,y)` est le quadrilatère
`iso(x,y)…iso(x,y+1)` remonté de `lift` : rendre le clic exact demande
donc d'ajouter `lift`, et rien d'autre.

La valeur d'avant, `LIFT-TH/2`, sondait un demi-losange trop haut et
renvoyait une case en haut à gauche de celle qu'on croyait viser. Mesuré
sur neuf points répartis dans chaque losange : **43 % de clics justes
avant, 100 % après**. Dedans le sol est plat, `probe` vaut 0.

C'est corrigé partout : le pinceau, la gomme, le déplacement du bonhomme
et le losange rose de survol passent tous par `tileFrom()`.

### Les fenêtres, et le pas de la porte

Une pièce sans fenêtre est une boîte, et de nuit une boîte noire. Chaque
pièce en a deux ou trois, déclarées dans `PIECES.fen` : le carreau reprend
exactement la teinte que `skyTone()` donne au ciel de l'île, avec un nuage
le jour et la lune la nuit. C'est le seul lien entre le dedans et le
dehors, et il ne coûte rien puisque la couleur existait déjà.

Sur l'île, la case devant la porte porte un **pas de porte**. Sans lui,
rien ne dit qu'on peut entrer : une maison où l'on entre et une maison qui
est un décor se ressemblent trop. Il n'est dessiné que chez soi, la porte
des autres étant fermée.

### Le sens des meubles et des objets

`o` vaut `'se'` ou `'sw'`, et se choisit avant de poser. **⟳ Tourner**
retourne ce qui est déjà en place, dedans comme dehors : un sens qu'on ne
choisit qu'au moment de poser oblige à effacer pour se corriger.

Sur l'île, le sens ne s'applique qu'à ce qui suit un axe : banc,
barrière, clôture, ponton, boutique (`PIVOT_ILE`). Un arbre est pareil des
deux côtés, et on le dit plutôt que de faire semblant. Techniquement c'est
un miroir horizontal, qui échange exactement les deux axes de
l'isométrie : pas un dessin de plus à maintenir.

Les objets posés avant n'ont pas de `o` : ils s'affichent comme avant.

Les vingt îles bot tirent le sens de leurs bancs et de leurs pontons de la
**même graine** que le reste : tout le monde voit le même archipel, et il
n'a plus l'air peigné. Attention à l'ordre de déclaration, `PIVOT_ILE` est
lu par `mkBot()` au chargement du module : il vit avec les données, pas
près des dessins.

### Déplacer la maison

Les quatre flèches ont disparu : elles suivaient les axes de l'isométrie
et personne ne savait dans quel sens elles allaient. **✣ Déplacer la
maison** arme un pinceau, on clique la case, la maison s'y pose. Le
survol montre les deux cases sur deux visées. La pose refuse l'eau, le
large hors rayon, et une case occupée par un objet ou par un mot du livre
d'or, en le disant. Si le bonhomme se retrouve dans les murs, il est
reposé devant la porte.

## La bourse et la boutique

Une bourse, une corvée, un cadeau quotidien, vingt-quatre objets à débloquer.
Le tout vit dans le même jsonb que le reste : `monde.bourse` et
`monde.achats`, **aucune migration SQL**, comme l'intérieur.

    bourse = { shells: 42, jour: '2026-09-17', faits: {tonte:5},
               pousse: '2026-09-17', cadeau: '2026-09-17', serie: 4 }
    achats = ['fontaine','moulin']

La monnaie s'appelle le **shell**, pas la pièce : `interieur.pieces`, ce sont
les salles de la maison, et l'homonyme portait à confusion. `shellsDe()`
relit l'ancien nom pour une bourse écrite avant le changement.

**Payant veut dire payant en shells.** Il n'y a pas d'argent réel dans ce
jeu, et il n'y en aura pas.

### La règle qu'on ne casse pas

L'âme du jeu tient en une phrase : **l'île grandit parce que des gens sont
passés**, jamais parce que le temps passe. Une économie faite seulement de
corvées la contredirait : on s'enrichirait seul, en boucle, et l'archipel ne
servirait plus à rien. C'est pourquoi la tonte est plafonnée à huit shells
par jour, et la promenade du chien à cinq. De quoi voir un compteur monter,
pas de quoi vivre sans voisins.

Les **visites**, elles, ne sont pas bridées si serré : trente-cinq shells
par jour contre treize pour les corvées. C'est la meilleure source, et de
loin, et c'est exprès. Un enfant qui joue seul avance ; un enfant qui va
voir les autres avance vraiment.

### La tonte

Une case d'herbe (`0`) se laisse gagner par les hautes herbes (`4`). La
traverser la tond et rapporte un shell. Le bonhomme sort une **tondeuse** dès
qu'une touffe est sous ses pieds ou sur une case voisine, et la range une
seconde après la dernière : on ne tond pas à mains nues, et une tondeuse
portée en permanence n'aurait plus rien à dire. Elle n'est pas un objet de
l'île — rien en base, rien à poser, rien à acheter. Huit touffes au plus sur l'île, une
repousse par jour, huit shells par jour : c'est la corvée la moins chère à
écrire, elle ne demande aucun objet neuf, et elle **se joue en marchant**. Un
bouton qui donne des shells ne serait pas un jeu.

`4` est une valeur de tuile comme les autres : elle part en base dans
`tiles`, elle tient en un chiffre — `encode()` colle les cases bout à bout,
une valeur à deux chiffres casserait tous les codes de sauvegarde — et rien
ne la précède en SQL.

Les herbes ne poussent ni sur le sable, ni hors du rayon acquis, ni sous un
objet, ni contre la maison ou son pas de porte : une touffe qu'on ne voit pas
est une touffe qu'on ne tondra jamais.

`jour` et `pousse` sont **deux marqueurs et non un** : le premier remet les
plafonds à zéro, le second autorise la repousse. Fondus en un seul, une île
ouverte aujourd'hui n'aurait sa première touffe que demain.

### Sortir le chien

Le chien est un objet d'île comme un autre, gratuit, au rayon **Bestioles**
de l'atelier. Aller à côté de lui et appuyer sur **E** (ou toucher le bouton
rose) le décroche de sa case : il part devant et fait le tour de l'île,
d'un point de passage au suivant. **5 shells** à l'arrivée, une fois par
jour, et il se ressort autant qu'on veut le reste de la journée.

Ce qui en fait un jeu et pas un bouton : **il ne repart pas sans son
maître**. À plus de trois cases, il s'assied et attend. Il n'y a pas
d'échec, pas de compte à rebours, rien qui gronde un enfant — seulement un
tour qui n'avance plus tant qu'on n'est pas revenu. C'est la première
corvée qui demande d'être quelque part plutôt que de cliquer, et la
seconde qui se joue en marchant.

Le compteur du tour (🐾 3/7) vit dans le bandeau du cadre et pas dans le
murmure du bas : le murmure s'efface au premier panneau croisé, et un tour
dure une bonne dizaine de secondes.

**Rien de tout ça ne part en base**, et il n'y a donc pas de clé de plus
dans `mondeNu()`. L'objet garde sa case pendant toute la balade et la
retrouve à la fin : c'est le dessin qui se déplace, pas la donnée. Seul
`bourse.faits.promenade` change, et `reveiller()` le remet à zéro chaque
jour comme le reste.

Trois choses finissent un tour : il est bouclé, le maître ramène le chien
(**E**, bouton **Ramener**), ou il quitte l'île — la maison, un voisin, une
annulation qui refait la liste des objets. Marcher sur le seuil de sa
maison pendant une balade **n'ouvre plus la porte tout seul** : passer
devant chez soi ne doit pas remettre le tour à zéro sans qu'on ait rien
demandé. `E` rentre quand même, et le dit.

### Le cadeau du jour

Revenir doit valoir quelque chose, et se voir. Une pastille rose s'allume sur
l'onglet Boutique, et un bouton ouvre le cadeau : `3 + série` shells, jusqu'à
dix. La **série** compte les jours d'affilée et repart à un dès qu'un jour est
sauté. Tous les sept jours d'affilée, la boutique offre un objet — le moins
cher de ceux qui manquent — plutôt que des shells.

Le cadeau ne tombe pas tout seul dans la bourse : on l'ouvre. Sans le geste,
il n'y a pas de moment.

### Ce qu'on achète

Dix-sept objets d'île, de 12 à 60 shells : chat, hérisson, puits, fontaine,
feu de camp, hamac, balançoire, tente, mare aux canards, phare, renard,
échoppe, toboggan, moulin, cabane perchée, statue, montgolfière. Et sept
meubles, de 12 à 45 : tapis rond, guirlande, bibliothèque, poêle à bois,
télévision, aquarium, piano.

Le **phare** et l'**échoppe** étaient libres jusqu'au 16/09 au soir. Une île
qui en porte déjà un le garde : `normaliserEconomie()` crédite `achats` pour
tout type verrouillé déjà posé, sinon le pinceau disparaîtrait de l'atelier
d'un joueur qui avait l'objet la veille. Les souvenirs rapportés d'un voisin
(`o.de`) sont exclus de ce cadeau, sinon une visite chez un ami débloquerait
la boutique.

**On débloque un type d'objet une fois, pour toujours.** Pas de paiement à
chaque pose : un enfant qui efface une fontaine pour la remettre deux cases
plus loin aurait perdu son argent, et il pleure. Une fois la fontaine
achetée, il en pose dix s'il veut.

**L'achat se fait en deux temps.** Choisir un article ouvre un comptoir sous
la vitrine : le prix, ce qui manque, et le bouton qui paie. La version d'avant
achetait au clic et annonçait le refus dans le murmure, en bas du cadre :
sur téléphone, à trois écrans du doigt qui venait de cliquer. Ça se vivait
comme « je clique et rien ne se passe ». Le refus doit être là où est le
doigt.

Un objet verrouillé n'apparaît pas dans l'atelier : un bouton mort n'apprend
rien, la vitrine le dit mieux. Un encart sous les objets dit combien il en
reste à la boutique, sans quoi un atelier plus court qu'hier ressemble à une
panne.

Rien n'a été ajouté aux îles bot : on y ramènerait un souvenir gratuit, et la
boutique ne servirait plus à rien.

### Ce qu'on porte

Un troisième rayon, **Pour toi**, ne vend pas des objets à poser mais ce que
le bonhomme sait faire. Rien n'entre dans `objects` ni dans les meubles :
`achats` suffit, et le moteur lit la liste au moment d'agir.

- **Bottes**, 25 shells. La marche passe de 1 à 1,34, dehors comme dedans.
- **Tondeuse à moteur**, 45 shells. La coupe s'élargit aux quatre cases
  voisines. Elle **ne rapporte pas plus** : le plafond du jour ne bouge pas,
  c'est la corvée qui raccourcit. Le dessin change aussi, bac à herbe et bloc
  moteur : un outil amélioré qui ne se voit pas n'a pas été amélioré.

Un équipement n'a pas d'atelier : il agit dès l'achat, et l'onglet **Toi** en
donne la liste, acquis ou pas. Un pouvoir qu'on a payé et qu'on ne retrouve
nulle part finit par s'oublier.

### Les visites payantes

Laisser un mot chez quelqu'un rapporte **2 shells**, en recevoir un en
rapporte **5**. Une fois par personne et par jour : dix mots chez le même
ami ne comptent que pour un, sinon deux enfants se financent en boucle et
l'archipel n'a plus d'intérêt. Chez soi, rien.

C'est **le seul gain que le serveur peut vérifier de bout en bout**. Il ne
se demande pas : c'est le trigger `mots_credite`, sur l'insert dans `mots`,
qui crédite les deux comptes. Le client n'appelle rien, et `bourse_gagner()`
refuse explicitement `mot_pose` et `mot_recu` — ouvrir cette porte-là
viderait les visites de leur sens.

L'hôte n'a rien à faire et n'a pas à être là : il trouve les shells en
rentrant, avec les mots. Le visiteur, lui, voit son gain tout de suite,
parce qu'il relit sa propre bourse après avoir planté. Celle de l'hôte ne
le regarde pas, et la RLS ne la lui montrerait pas.

Un mot supprimé ne reprend pas les shells. C'est voulu : on ne punit pas le
propriétaire qui fait le ménage sur son mur.

Plafonds du jour : **10** shells à gagner en allant écrire (cinq
personnes), **25** à recevoir (cinq personnes). Trente-cinq contre les
treize des corvées, et c'est tout le propos.

### Le point honnête

**Ce n'est plus l'honnêteté qui protège la caisse.** Jusqu'au 16/09 au soir,
le client écrivait sa propre bourse et lisait sa propre horloge : la console
d'un navigateur rendait millionnaire en trente secondes. Tant que l'économie
n'était faite que de corvées solitaires, ça n'avait aucune importance. Les
visites changent ça : elles créditent **quelqu'un d'autre** que celui qui
joue, et un compte qui peut s'écrire lui-même peut aussi écrire celui du
voisin.

Ce qui a été fait, avant d'écrire les visites et pas après :

- la bourse quitte `iles.monde` et prend sa table, `bourses` ;
- cette table n'a **aucune policy d'écriture**. Pas une policy restrictive :
  pas de policy du tout, et RLS refuse par défaut. Ce vide *est* la
  protection ;
- seules des fonctions `security definer` la modifient. `bourse_crediter()`,
  qui prend un joueur en paramètre parce que les visites créditent l'hôte,
  n'est **jamais exposée** : elle est révoquée de `public`, `anon` et
  `authenticated` ;
- le temps est celui du serveur (`jour_du_jeu()`, en heure de Bruxelles).
  Avancer la date du téléphone ne refait plus les corvées de la veille ;
- les **prix** et les **plafonds** sont en SQL (`catalogue`, `plafond()`).
  Le client les lit au lieu de les recopier : deux listes qui divergent, et
  la vitrine annonce un prix que l'achat refuse.

Ce que ça ne fait pas, et il faut le dire : **le serveur ne voit pas l'île.**
Quand le client annonce « j'ai tondu une touffe », personne ne peut le
contredire. Ce qui borne la triche sur les corvées, c'est le plafond du
jour, pas la preuve du geste. Les visites, elles, sont vérifiables : il y a
une ligne dans `mots`, signée d'un compte, sur l'île d'un autre.

Sans compte, hors ligne, ou avant que la migration ne soit passée, la bourse
tient toute seule dans `localStorage`, sous sa propre clé
(`dansisland:bourse`). C'est ce qui garde l'île de démonstration jouable.
Rien de ce qui s'y gagne ne remonte, et la réponse de la base écrase le
miroir local, jamais l'inverse.

Conséquence assumée : `tondre()` ne passe pas par `memoriser()`, donc
`Ctrl+Z` peut faire repousser une touffe déjà tondue. Ce n'est pas un oubli,
c'est le plafond du jour qui borne la corvée, jamais la tuile.

## Les souvenirs

Chez un voisin, s'arrêter à côté d'un objet propose de le ramener.
On ne vole rien : c'est une copie, signée `de: <pseudo de l'hôte>`, posée
sur une case libre de sa propre île. L'île visitée n'est pas touchée.
Un souvenir déjà rapporté du même hôte et du même type est refusé.

## Modèle

Une ligne par île. Le monde du jeu tient dans `iles.monde` (jsonb) :
`tiles` (324 chiffres), `house`, `objects`, `me`, `pal`, `sky`, `interieur`.
`mondeNu()` est la seule liste qui compte : **une clé oubliée là, et chaque
sauvegarde l'efface en silence.**

`bourse` et `achats` en sont **sortis le 16/09 au soir** et n'ont plus rien
à y faire : ils vivent dans `bourses`, une table que le client ne peut pas
écrire. Les y remettre serait rendre la caisse au navigateur.

Les mots du livre d'or vivent à part, dans `mots`, pour être modérables un
par un — et c'est un trigger sur cette table qui paie les visites.

La RLS est la seule protection : la clé publishable est publique par construction.
Ne jamais mettre la `service_role` dans `src/`.

`iles.proprietaire` porte **deux** clés étrangères : vers `auth.users` et vers
`profils`. La seconde n'est pas redondante — PostgREST ne traverse pas le schéma
`auth`, et sans lien direct dans `public` l'embed `profils:proprietaire(pseudo)`
de `chargerIle()` échoue en `PGRST200`.

De même, `slug_libre()` doit refuser exactement ce que refusent les contraintes
`iles_slug_forme` et `iles_slug_reserve` : si les listes divergent, le client
annonce « libre » un slug que l'insert va rejeter.

## Sauvegarde

L'éditeur écrit à chaque clic. `store.planifierSauvegarde` attend 1,2 s de calme
avant de pousser, garde une copie dans `localStorage`, et rejoue en cas de coupure.
Au chargement, si le brouillon local est plus récent que `maj_le`, il gagne.
