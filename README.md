# DAN'S ISLAND — V1

Chacun fabrique son île, la publie à son adresse, et va marcher sur celle des autres.

**En ligne : https://dansisland.app**

`dansisland.pages.dev` reste servi par Cloudflare Pages et continue de
marcher : c'est l'adresse de build du projet Pages, elle ne se retire pas.
L'adresse du jeu, celle qu'on donne et celle qu'écrivent les cinq balises
d'en-tête (`canonical`, `og:url`, les images d'aperçu), est `dansisland.app`
depuis le 17/09/2026.

## Ce qu'il y a dans le dossier

    index.html          l'app entière (moteur isométrique + éditeur + son + panneaux)
    manifest.webmanifest  l'île ajoutable à l'écran d'accueil, plein écran, paysage
    icone-*.png           les icônes de l'app, tirées du logo SVG du site
    apple-touch-icon.png  la même, pour l'écran d'accueil iOS
    robots.txt          tout ouvert, et l'adresse du plan du site
    src/config.js       URL et clé publishable Supabase
    src/store.js        seule couche qui parle à Supabase
    functions/          les pages publiques (Cloudflare Pages Functions)
      island/[slug].js    /island/<slug> — la page d'une île, indexable
      carte/[slug].js     /carte/<slug>  — la carte postale reçue
      sitemap.xml.js      /sitemap.xml   — l'archipel, à la demande
      _commun.js          la maquette, la lecture de l'archipel, l'échappement
    supabase/schema.sql tables, RLS, vue archipel — idempotent
    supabase/2026-09-16_grille18.sql  migration à jouer une seule fois
    supabase/2026-09-16_bourse_serveur.sql  la bourse quitte le jsonb — rejouable
    supabase/2026-09-17_maree.sql     la marée — rejouable
    supabase/2026-09-17_commande.sql  la commande du jour et le sac, rejouable
    supabase/2026-09-18_visites.sql   le crédit du jour quitte le mur, rejouable
    supabase/2026-09-18_parrainage.sql  le parrainage et les réglages, rejouable
    _redirects          Cloudflare Pages : catch-all, toute adresse sert index.html
    build.sh            copie dans dist/ les seuls fichiers à publier

Pas de build : ce sont des modules ES servis tels quels. `functions/` n'est
**pas** copié dans `dist/` — Cloudflare lit les Pages Functions à la racine
du projet, pas dans le dossier publié, et copiées dans la sortie elles
seraient servies comme du texte.

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
vue `archipel`, et une page d'île en mode visiteur.

Cette vérification portait sur une île de slug `simon`, **qui n'existe
plus**. L'archipel ne contient aujourd'hui qu'une île, `dan`
(« L'île de Dan »), et sa ligne se lit bien en `anon` : c'est exactement
ce dont le mode visiteur a besoin. Le `/simon` qu'on lit ailleurs dans ce
fichier est un exemple d'adresse, pas une île à retrouver.

`supabase/2026-09-17_maree.sql` **est joué** (17/09/2026 au soir) : la mer
est tenue par le serveur, et les shells ramassés sur le sable remontent.

`supabase/2026-09-17_commande.sql` **est joué** aussi, et vérifié en vrai
contre le projet, sans compte, par les fonctions ouvertes à `anon` :

- `commande()` rend `coquillage + etoile` pour le 17/09, **exactement ce que
  `commandeDuJour()` calcule en local** : les deux arithmétiques sont
  d'accord contre le vrai serveur, pas seulement entre elles ;
- `economie()` porte les sept plafonds et les cinq gains, `commande` 6/6 et
  `commande_recue` 8/24 ;
- `catalogue` compte 28 lignes, dont `appareil` à 28 et `compagnon` à 20 ;
- `bourse_ramasser()` et `livrer()` existent et répondent « connecte-toi »
  (`P0001`), pas « function does not exist » ;
- `bourses.sac` se lit sans `42703` ;
- **l'insert direct dans `livraisons` est refusé** (`42501`,
  « new row violates row-level security policy »). Le vide de policy fait
  bien ce qu'on attend de lui, mesuré et pas supposé.

`supabase/2026-09-18_parrainage.sql` **est joué** (19/09/2026 au matin),
dans l'éditeur SQL du projet **dansisland** — en vérifiant que l'en-tête
affiche « dansisland » et pas « mamash's project » :
<https://supabase.com/dashboard/project/cgputbitzfgokpwbbind/sql/new>

Les cinq vérifications, et ce qu'elles ont rendu :

```sql
select public.parrainage();               -- {"filleul":15,"parrain":25}     ✅
select public.economie() -> 'gains';      -- porte bienvenue 15 et parrainage 25  ✅
select * from public.reglages order by k; -- 3 lignes : 15 / 5 / 25          ✅
select public.parrainer('dan');           -- P0001 « connecte-toi »          ✅
```

**Et le test du vide de policy, qui ne se fait pas comme les autres.**
L'éditeur SQL tourne en rôle `postgres`, qui **contourne la RLS** : un
insert lancé tel quel n'y rencontre jamais la policy. Le premier essai a
d'ailleurs rendu `23503` — la clé étrangère vers `auth.users` refusant un
UUID inventé, ce qui prouve autre chose et pas ce qu'on cherchait. Il faut
prendre le rôle du client :

```sql
begin;
set local role anon;
insert into public.parrainages (filleul, parrain, code)
values (gen_random_uuid(), gen_random_uuid(), 'x');
rollback;
```

Rendu : **`42501 — new row violates row-level security policy for table
"parrainages"`**. C'est ça, la mesure du vide de policy. Le `rollback` est
là pour le cas où l'insert passerait : rien ne resterait en base.

La même précaution vaut pour `bourses`, `livraisons` et `visites`. Leur
refus à elles a été mesuré autrement — depuis le client, avec la clé
publishable, donc en rôle `anon` pour de vrai — ce qui est équivalent et
reste valable.

`supabase/2026-09-16_bourse_serveur.sql` **est joué**. Il n'a pas pu
l'être le jour où il a été écrit, faute de Postgres sous la main, et le
README a longtemps dit qu'il attendait encore. Deux choses le démentent :
`bourses.sac` se lit sans `42703` (donc la table existe), et
`2026-09-17_commande.sql` fait un `alter table public.bourses`, donc il
n'aurait pas pu passer sans elle. Les quatre migrations sont en base. Ne
pas le rejouer par prudence : il est rejouable, mais il n'y a plus rien à
reprendre.

Pas encore éprouvé :

- **Le parrainage de bout en bout.** Comme les visites payantes et la
  livraison, il demande deux comptes : un qui invite, un qui crée son île
  depuis le lien. Le crédit du filleul se voit tout de suite (la note
  « +15 shells de bienvenue » au-dessus des onglets) ; celui du parrain ne
  se vérifie qu'en se reconnectant avec l'autre compte. La migration, elle,
  est jouée depuis le 19/09 : ce qui reste à éprouver est le geste, pas le
  serveur.
- ~~**Les pages publiques servies par Cloudflare.**~~ **Éprouvées en vrai
  le 18/09 au soir**, et c'est la première fois. Le run de vérification qui
  a suivi la mise en ligne l'a mesuré : `/island/dan` et `/carte/dan`
  rendent chacun **leur propre page**, pas le repli du catch-all, et
  `/sitemap.xml` rend trois adresses. Les Pages Functions tournent donc
  bien, à la racine du dépôt et sans être copiées dans `dist/`. Un lien de
  carte postale partagé porte sa vraie page et son aperçu.
- **Le partage natif de la carte postale.** `navigator.share({files})`
  n'existe pas dans un navigateur piloté sans contexte sécurisé ni geste
  d'utilisateur réel : le dessin de la carte, le découpage et le repli
  (enregistrement + lien copié) ont été éprouvés, l'envoi lui-même demande
  un vrai téléphone. Le repli, lui, ne dépend de rien.
- **La livraison en vrai.** Comme les visites payantes, elle demande deux
  comptes : un qui porte, un qui reçoit. Le crédit du porteur se voit tout
  de suite dans le murmure ; celui de l'hôte ne se vérifie qu'en se
  reconnectant avec l'autre compte.
- **Le déclenchement de l'appareil photo.** Le viseur a été ouvert et
  regardé, et le découpage a été éprouvé à la main dans la console : le
  canvas n'est pas *tainted*, le tirage sort à 182 ko et la vignette à
  11 ko. Mais le déclenchement lui-même passe par `frame()`, donc par
  `requestAnimationFrame`, et un navigateur piloté garde l'onglet en
  arrière-plan : la boucle y est en pause. C'est exactement ce qui empêche
  déjà d'éprouver le requin et la marche. À faire une fois à la main.
- **Le compagnon qui rattrape.** Même raison : il est dessiné au bon
  endroit et se choisit bien parmi les bestioles acquises (vérifié), mais
  sa course derrière le bonhomme demande que la boucle tourne.
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

- **Le pincement à deux doigts, sur un vrai téléphone.** Les boutons de
  zoom et la molette ont été éprouvés ; le pincement, lui, dépend de la
  façon dont le navigateur arbitre `touch-action:pan-y`, et un émulateur
  n'en dit rien de fiable. Si un jour il n'attrape pas le geste, les
  boutons restent le chemin qui marche.

### Pas de renommage de slug dans l'app

Une fois l'île créée, le panneau bascule sur « copier le lien » : l'adresse
n'est plus modifiable depuis l'interface. Ça se fait en SQL.

```sql
update public.iles set slug = 'nouveau' where slug = 'ancien';
```

## L'entrée, la carte postale, le parrainage — 18/09/2026

Le jeu se présente maintenant comme ce qu'il est : **un jeu de détente**.
On arrive sur un accueil qui dit une phrase — « Ton petit endroit pour
ralentir » — et pose deux portes : *Créer mon île* et *Visiter l'île de
Dan*. Le jeu tourne derrière, flouté : la mer bouge, les mouettes passent.
Puis un guide de quatre pas — bonhomme, maison, île, visite — se coche
tout seul au fur et à mesure qu'on les fait, et s'efface pour de bon.

La barre est passée de six onglets à cinq : **Moi · Maison · Île · Voisins
· Boutique**. « Dedans » n'en est plus un — on entre en marchant sur le
seuil, par `E`, par le bouton rose, ou par **🚪 Entrer** dans le panneau
Maison, et c'est ce panneau qui devient l'atelier des pièces une fois la
porte franchie.

La **carte postale** est devenue l'objet qu'on envoie : une image de l'île
avec son nom, son adresse, un timbre et une phrase de soi. Sur téléphone,
le partage natif met la **vraie image** dans la conversation WhatsApp ;
partout ailleurs il reste `wa.me`, le lien à copier et l'image à
enregistrer. Le lien mène à `/carte/<slug>`, une page publique qui montre
la carte, l'île, et propose de créer la sienne.

Et **ton adresse est ton code de parrainage** : qui crée son île en
arrivant par ton lien te rapporte des shells, et en reçoit autant. Les
montants vivent dans la table `reglages` et se changent par une ligne de
SQL, sans redéployer.

Quatre choses de plus bougent toutes seules, et aucune ne touche à l'état
du jeu : un voilier passe au large, des papillons volent le jour, des
lucioles la nuit, et une étoile filante traverse le ciel de temps en
temps.

## Ce qu'un robot voit, et les pages publiques qui sont sorties

Le jeu est une seule page peinte dans un canvas, et `_redirects` la sert à
toutes les adresses : Google et WhatsApp voient donc le même titre et la
même vignette pour toutes les îles. Trois Cloudflare Pages Functions
écrivaient de vraies pages HTML côté serveur — `/island/<slug>`,
`/carte/<slug>` et `/sitemap.xml`, chacune avec son `title`, sa
description, son `canonical`, ses balises OpenGraph et ses données
structurées.

**Elles sont sorties du dépôt le 18/09/2026 au soir, puis remises le même
soir**, et l'aller-retour vaut d'être raconté parce qu'il dit ce qu'on a
appris.

Après la fusion qui les apportait, le site a cessé d'être redéployé.
Cloudflare compile automatiquement un dossier `functions/` à la racine, et
une compilation qui échoue fait échouer **tout** le déploiement : c'était
l'hypothèse la plus probable, et le dossier est sorti pour la lever.

**Elle était fausse.** Six minutes après la fusion qui les retirait, la
production servait toujours l'ancienne page. Le diagnostic a ensuite
tranché : `dansisland.app` **et** `dansisland.pages.dev` servaient tous
deux la vieille page — donc ni DNS ni cache — et
`main.dansisland.pages.dev` répondait « Deployment Not Found », donc aucun
déploiement n'existait pour `main`. Le build ne se déclenchait plus, et ça
n'avait rien à voir avec le contenu du dépôt.

Les fonctions sont donc revenues telles quelles, par
`git checkout 7da69bf -- functions/`, avec la ligne `Sitemap:` de
`robots.txt` et les vérifications du workflow.

**Ce qui reste vrai quoi qu'il arrive :** les adresses publiques ont
**deux** réponses acceptables. Leur propre page quand les fonctions sont
servies ; le jeu quand elles ne le sont pas, le catch-all prenant le relais
et `routerDepuisURL()` sachant les ouvrir en retenant le parrainage. Le
workflow n'échoue que sur la troisième réponse — ni l'une ni l'autre — et
son log dit laquelle des deux on a, donc il dit aussi si les fonctions sont
vivantes.

## Mise en route en local

1. Servir le dossier :

       python3 -m http.server 8080

2. Garder `http://localhost:8080` dans les **Redirect URLs** Supabase, sinon
   le retour du lien magique est refusé.

Les adresses d'îles (`/simon`) renvoient un 404 en local : `_redirects` n'est
lu que par Cloudflare Pages. Seule la racine est testable ainsi.

## Les épreuves

    npm install          # une seule dépendance, et seulement pour test/
    npx playwright install chromium
    npm test

Quatre harnais, dans `test/`, qui font tourner **la vraie page dans un vrai
navigateur** contre un serveur simulé (`test/faux-store.js` remplace
`src/store.js` dans une copie jetable — le dépôt n'est jamais modifié, et
rien ne touche la base de production).

    balises.mjs     aucun panneau ne montre de balise en clair
    etroit.mjs      360 px et 780x360 : rien ne déborde, rien n'est coupé
    parrainage.mjs  les trois branches de reglerLeParrainage()
    lien.mjs        le lien de connexion, et l'invite de rotation

Ils existent parce que les quatre défauts qu'ils surveillent ont tous été
trouvés à l'œil, tard, et qu'aucun n'aurait survécu à un contrôle : des
`</b>` affichés en clair au milieu d'une phrase, dix appuis qui donnaient
neuf erreurs, une invite qui battait trop vite, une vignette qui sortait de
l'écran en paysage court.

**Le site n'a toujours ni dépendance ni build.** `package.json` ne sert
qu'à `test/`, et `build.sh` ne copie ni l'un ni l'autre dans `dist/`.

Ce qu'ils ne couvrent pas, et il ne faut pas croire le contraire :

- **le SQL**, qui s'éprouve dans l'éditeur du projet — voir les cinq
  vérifications plus haut, et la mise en garde sur le rôle `postgres` ;
- **le rendu image par image**, parce que le `rAF` est bridé dans un
  navigateur piloté : le canvas garde la dernière image peinte et dix
  mesures rendent dix fois la même valeur. Ce qui se déduit de `t` —
  éclats sur l'eau, requin, voilier — s'éprouve par sa formule, hors
  navigateur ;
- **le son**, qui n'a pas de sortie ici ;
- **ce qui demande deux comptes** : parrainage de bout en bout, livraison,
  visites payantes.

`.github/workflows/epreuves.yml` les lance à chaque push, et vérifie que
`build.sh` passe.

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

Déploiement à la main, si besoin — et c'est le chemin le plus court quand
l'intégration Git ne répond plus :

```bash
./build.sh && npx wrangler pages deploy dist --project-name dansisland --branch main
```

### Quand l'intégration Git décroche

Le 18/09/2026, la production a cessé d'être redéployée : `dansisland.app`
**et** `dansisland.pages.dev` servaient tous deux l'ancienne page, et
`main.dansisland.pages.dev` répondait « Deployment Not Found » — donc aucun
déploiement n'existait pour `main`. Ni le DNS, ni le cache, ni le contenu du
dépôt : le build ne se déclenchait plus.

Une intégration Git qui décroche est **muette**. Rien dans le dépôt ne le
dit, aucun e-mail ne part, et on s'en aperçoit en regardant le site des
jours plus tard. D'où `.github/workflows/deployer.yml`, qui rend le
déploiement explicite : il se lit, il laisse un log, et il échoue
bruyamment.

Il demande deux secrets, à ajouter une fois dans **Settings → Secrets and
variables → Actions** :

    CLOUDFLARE_API_TOKEN    un jeton « Cloudflare Pages: Edit »
    CLOUDFLARE_ACCOUNT_ID   l'identifiant de compte, lisible dans l'URL
                            du tableau de bord

Sans eux, le job s'arrête au premier pas en nommant ce qui manque, plutôt
que d'échouer plus loin sur une erreur d'authentification illisible. Ils
restent chez GitHub : ils ne passent pas dans les logs et ne sont pas dans
ce dépôt.

Il ne remplace pas forcément l'intégration Git : si elle repart, les deux
coexistent sans dommage — deux déploiements du même contenu. Mais il ne
dépend plus d'elle.

**Ce qui a débloqué la situation le 18/09 au soir**, à défaut de ces
secrets : un `wrangler pages deploy` depuis un poste, sur un clone neuf.
Il n'a demandé aucun jeton — `npx wrangler` ouvre le navigateur pour une
autorisation, une fois.

```bash
cd $(mktemp -d) && git clone --depth 1 https://github.com/simon605genie/dansisland.git \
  && cd dansisland && ./build.sh \
  && npx wrangler pages deploy dist --project-name dansisland --branch main
```

Mesuré juste après : `dansisland.app` et `dansisland.pages.dev` portent
tous deux le nouveau titre et la phrase de l'accueil, et `robots.txt` y est
servi en `text/plain` — donc comme un fichier, pas par le catch-all. La
publication est bien allée en **production**.

`main.dansisland.pages.dev` répond toujours « Deployment Not Found ». Ce
n'est donc pas un témoin de l'état de la production, contrairement à ce que
le diagnostic du matin en avait tiré : un alias de branche peut ne jamais
avoir été créé. Ce qu'il dit reste utile — il distingue « le build ne
tourne pas » de « le domaine ne pointe pas sur le bon projet » — mais il ne
dit rien à lui seul.

### Savoir si c'est vraiment en ligne

`.github/workflows/verifier-le-deploiement.yml` le dit à chaque push, et
une fois par semaine. Il attend que le site porte la version qu'on vient
de pousser, puis vérifie `robots.txt`, le type MIME de `/src/store.js` et
le fait que `/island/<slug>` et `/carte/<slug>` mènent au jeu.

**Son témoin est du contenu, jamais un code HTTP**, et c'est une leçon
payée : `_redirects` porte un catch-all `/* /index.html 200`, donc *toute*
adresse répond 200 sur ce site, y compris celles qui n'existent pas. Le
premier essai de ce fichier concluait « déployé » sur un site inchangé.

**Et chercher ce contenu ne passe par aucun tuyau**, ce qui est la seconde
leçon, payée deux fois dans la même soirée. `grep -q` sort dès qu'il a
trouvé et ferme son entrée ; celui qui écrivait dedans reçoit un tuyau
cassé — `curl: (23)` d'abord, `printf: write error: Broken pipe` ensuite,
quand le correctif avait retiré `curl` du tuyau sans retirer le tuyau — et
`pipefail` rend cet échec-là plutôt que le succès de `grep`. Le test répond
donc faux **au moment précis où le motif est là**, le seul qui compte. La
course ne se voit pas sur `robots.txt`, qui tient en vingt lignes : il faut
la page entière, 368 ko, pour que l'écrivain n'ait pas fini à temps. Un
défaut qui ne se montre que sur le gros fichier est un défaut qu'on croit
corrigé. D'où `contient`, en bash pur, sans tuyau ni processus.

### Le SMTP intégré ne tient pas une ouverture au public

Rencontré pour de vrai le 19/09 : `email rate limit exceeded` sur le
service d'e-mail **intégré** de Supabase. Ce n'est pas la minute d'attente
par adresse, c'est la limite **du projet**, globale et horaire, et elle se
compte en poignée de mails. Elle est faite pour développer.

Conséquence à ne pas découvrir le jour du partage : **tout le jeu passe par
le lien magique.** Plus de mail, plus de compte, donc plus d'île — et le
joueur ne voit qu'un message d'erreur. Avant d'envoyer des cartes postales
à plus de deux ou trois personnes, il faut brancher un vrai SMTP dans
**Authentication → Emails / SMTP** du projet (Resend, Brevo, Postmark : les
trois ont un palier gratuit largement suffisant ici). Les limites par heure
se règlent juste à côté, dans **Auth → Rate Limits**.

Côté client, `refusLisible()` ne promet **aucun délai** pour ce refus-là :
on ne le connaît pas. Il dit la seule chose utile — un lien est
probablement déjà parti, va le chercher dans les indésirables.

Après le déploiement, dans **Auth → URL Configuration** : Site URL sur
`https://dansisland.app`, et `https://dansisland.app/**` dans les Redirect
URLs. Le `/**` est nécessaire pour revenir sur une adresse d'île.

Garder `https://dansisland.pages.dev/**` dans la liste tant que cette
adresse répond : le lien magique part avec `emailRedirectTo:
location.origin`, donc quelqu'un qui se connecte depuis l'ancienne adresse
demande un retour vers elle, et Supabase refuse toute adresse absente de la
liste. Deux entrées ne coûtent rien ; une de moins casse la connexion sans
rien dire.

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

En portrait étroit, l'accroche disparaît, la grille d'objets passe à trois
colonnes et la bulle de murmure rétrécit pour ne pas manger l'île. Une
pastille « Tourne ton téléphone » se pose en bas à droite du cadre, une
seule fois par appareil : le média la montre, un doigt la retire pour de
bon.

**En paysage court (moins de 560 px de haut), le jeu prend tout l'écran.**
La page disparaît : plus de logo, plus d'accroche, plus de défilement.
L'île occupe toute la hauteur à gauche, la carte de connexion se pose en
haut à droite et l'atelier remplit la colonne sous elle, avec ses six
onglets sur deux rangées de trois. C'est `display:contents` sur `.stage`
qui le permet : le cadre et l'atelier deviennent des cases de la grille de
`.wrap`, et la carte de connexion peut se glisser entre les deux. Sans ça
il fallait la cacher, et on ne pouvait plus se connecter en paysage.

Ce bloc est **à la fin de la feuille de style**, et pas avec les autres
media queries en haut. Une media query n'a pas plus de poids qu'une règle
ordinaire : placé en haut, il était écrasé par les `.tabs`, `.panel`,
`.viewport` et `.atelier` déclarés plus bas, en silence.

## L'île sur l'écran d'accueil

`manifest.webmanifest` et quatre icônes (`icone-192`, `icone-512`,
`icone-maskable`, `apple-touch-icon`), générées depuis le logo SVG du site.
Ajoutée à l'écran d'accueil, l'île s'ouvre plein écran, sans barre
d'adresse, en paysage (`display: standalone`, `orientation: landscape`).

Ça reste un site : la même adresse s'ouvre dans n'importe quel navigateur,
et une île se partage toujours par son lien (`/simon`). `start_url` vaut
`/`, jamais l'île d'où on a installé : l'app s'ouvre chez toi.

Les chemins du manifest et des icônes sont **absolus**. Une page d'île est
servie à `/simon` par le catch-all de `_redirects` ; un chemin relatif s'y
casserait le jour où quelqu'un écrit `/simon/`.

**Pas de service worker, et c'est un choix.** Chrome n'en exige plus pour
proposer l'installation, iOS n'en a jamais eu besoin, et un service worker
mal réglé sert la version d'hier à quelqu'un qui vient de recevoir le lien
de la nouvelle, sans moyen de le lui dire. Le jour où il en faudra un, il
faudra d'abord une version affichée dans l'app et une invite à recharger.

Les icônes se refont avec la même recette que le logo : c'est le SVG de
`index.html` relu en repère 64, rien n'est dessiné à la main.

Le jeu se joue au doigt sans rien ajouter : toucher l'île déplace le
bonhomme, toucher avec un pinceau actif pose. Le message d'accueil teste
`(pointer:coarse)` et cesse d'annoncer des touches à qui n'a pas de
clavier.

## La caméra et le zoom

Le cadre fait 768x500 quoi qu'il arrive, mais en portrait le CSS le rend
sur 360 px de large : une case y mesurait 26 px, et personne ne vise une
case de 26 px au doigt. La caméra suit maintenant le bonhomme, et elle
grossit jusqu'à ce qu'une case fasse 44 pixels réels.

**Le zoom se déduit de la taille du cadre à l'écran, pas de celle du
canvas.** Sur un téléphone en portrait il monte à 1,7, et le cadre montre
une dizaine de cases autour du bonhomme au lieu de l'île entière en
timbre-poste.

Le plancher a valu 1 jusqu'à la marée. Il vaut **0,78** depuis : le cadre
montre 985x641 de monde au lieu de 768x500, parce que l'île et son anneau
de marée n'y tenaient plus. Sur un écran large une case passe donc de 56 à
44 px réels, soit exactement le minimum déjà retenu comme confortable au
doigt ; sur téléphone rien ne change, le zoom automatique y est déjà bien
au-dessus. **Dedans, le plancher reste 1** : la pièce n'a pas grandi.

Trois gestes pour le régler à la main : les deux boutons ronds du bord
droit du cadre, la molette, et le pincement à deux doigts. Les boutons
sont là parce qu'ils sont les seuls à marcher partout — un zoom qui ne se
découvre qu'en pinçant n'existe pas pour l'enfant qui ne pince pas. Le
bouton se grise quand on est au bout.

Dedans, la caméra ne suit personne : la pièce tient en huit cases sur six,
elle est centrée, et le zoom est plafonné pour que les murs restent dans
le cadre.

### Comment c'est fait, et pourquoi c'est tenable

`iso()`, `unIso()` et `vue` n'ont pas bougé d'une ligne. La caméra n'est
pas une seconde projection : c'est une transformation posée sur le
contexte juste avant de peindre le monde, et retirée après. Tout ce qui
dessine continue de travailler dans le repère d'avant et ignore le zoom.
C'est ce qui a permis de ne pas relire les deux mille lignes de dessin.

Ce que ça demande en échange, et qu'il ne faut pas oublier :

- `pt()` défait exactement la transformation que pose la caméra. C'est le
  seul endroit des entrées qui ait eu à changer.
- un `fillRect(0,0,CW,CH)` ne couvre plus le cadre une fois la caméra
  posée : `camRect()` rend le rectangle du monde qu'on voit, et c'est par
  lui que passent les voiles de nuit.
- le ciel se peint **hors** caméra et la mer **dedans** : `ocean()` a été
  coupé en `ciel()` et `mer()`. Le soleil, les nuages et les oiseaux sont
  un fond, ils ne glissent pas quand la caméra suit le bonhomme.
- `#world` porte `touch-action:pan-y` : la page défile toujours d'un
  doigt, mais le navigateur ne confisque plus le pincement.

**La visée a été remesurée**, comme au moment de la corriger : neuf points
répartis dans chaque losange, sur toute la grille, à zoom 1, 1,8 et 2,6,
dehors et dedans. Environ six mille clics, **zéro faux**. Et sur les 221
cases qu'un rayon maximal rend praticables, le bonhomme reste à au moins
68 px des bords latéraux du cadre.

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

### Les niveaux : au sol, sur un meuble, au mur

Jusqu'au 17/09 au soir, un meuble était au sol ou « plat » (les tapis), et
rien d'autre. Ça se payait trois fois. Le **tableau** était dessiné adossé
au mur mais occupait une case de plancher où l'on ne passait plus. Poser un
vase sur la table **effaçait la table**, en silence. Et `⟳ Tourner` existait
sans que personne le trouve, rangé sous un champ intitulé « Marcher ».

Les trois viennent de la même absence : il manquait **sur quoi un meuble se
pose**. C'est maintenant une propriété du type, à côté de son encombrement,
donc du code et pas de la donnée : **aucune migration**, et un meuble reste
`{t,x,y,o,c}`.

| Niveau | Ce que ça veut dire | Qui |
|---|---|---|
| `plat` | au sol, sous tout, ne bloque pas | tapis, tapis rond |
| `dessus` | sur un meuble à plateau, ou par terre | vase, plante, télévision |
| `mur` | accroché au fond, ne bloque pas | tableau, guirlande |
| (rien) | par terre, et il bloque | tout le reste |

On pose sur une table basse, une table de nuit, une commode, un bureau, une
malle et le piano. Pas sur une étagère ni une bibliothèque : dans cette
isométrie leur haut est hors de vue, et un vase posé là ne se lirait pas.

Un cadre s'accroche à l'une des deux parois du fond, et c'est le **Sens**
qui dit laquelle. Posé ailleurs, il est refusé, et le refus donne les deux
façons de s'en sortir.

**Rien ne s'efface plus tout seul.** Poser sur une case prise nomme ce qui
s'y trouve et dit quoi faire. C'est la leçon de la boutique, au même
endroit : le refus doit tomber là où est le doigt.

Une pièce décorée avant ce changement ne perd rien : un cadre resté au
milieu de la pièce est **glissé contre le mur le plus proche** au
chargement, jamais effacé. On ne reprend pas ce qui a été posé.

Et l'atelier du dedans porte enfin les mêmes étiquettes que celui du
dehors : **Sens** et non « Orientation », **Corriger** pour la gomme et
`⟳ Tourner`. L'étiquette d'un groupe était le nom de son premier bouton.

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

### Le cadeau du jour, et le coffre qui le porte

Revenir doit valoir quelque chose, et se voir. Une pastille rose s'allume sur
l'onglet Boutique : `3 + série` shells, jusqu'à dix. La **série** compte les
jours d'affilée et repart à un dès qu'un jour est sauté. Tous les sept jours
d'affilée, la boutique offre un objet, le moins cher de ceux qui manquent,
plutôt que des shells.

Le cadeau ne tombe pas tout seul dans la bourse : on l'ouvre. Sans le geste,
il n'y a pas de moment. Et depuis le 17/09 au soir, **ce geste a un lieu**.

Il s'ouvrait par un bouton dans un panneau, ce qui est exactement ce que le
jeu se refuse partout ailleurs : un bouton qui donne des shells n'est pas un
jeu. Le **coffre** est le même cadeau, mais posé quelque part. Il scintille
tant qu'il a quelque chose dedans ; on marche jusqu'à lui, `E` ou le bouton
rose l'ouvre, et il reste ouvert et vide jusqu'au lendemain. L'île elle-même
dit, sans un mot, si on est déjà passé aujourd'hui.

Le coffre était déjà là : un objet gratuit du rayon **Village**, sur toute
île neuve. Rien n'a été ajouté en base : pas une clé de plus dans
`mondeNu()`, aucune migration. `bourse.cadeau` tenait déjà le jour du
dernier cadeau ouvert, et c'est toujours `bourse_cadeau()` qui débite côté
serveur : le coffre ne fait que situer le geste.

Tous les coffres d'une île portent le même cadeau, et il n'y en a qu'un par
jour : dix coffres posés ne donnent pas dix cadeaux. Chez un voisin, le
coffre reste fermé. `cadeauDispo()` lit *ta* bourse, et un coffre ouvert
chez l'hôte parlerait de toi, pas de lui. C'est la même règle que sa porte.

Sans coffre sur l'île, la Boutique garde son bouton et propose d'en poser
un : une gomme passée sur le dernier coffre ne doit pas rendre le cadeau
injoignable.

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
propriétaire qui fait le ménage sur son mur. **Il ne les redonne pas non
plus** : le compteur du jour n'est pas dans `mots`, qui est un mur où l'on
efface, mais dans `visites`, une ligne `(île, auteur, jour)` que personne
ne peut écrire ni effacer depuis le client. Jusqu'au 18/09 au matin il
était dans `mots`, et effacer son mot rouvrait le crédit de la journée.

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

## La marée

Deux fois par jour la mer se retire, et l'anneau de cases juste au-delà du
bord de l'île devient du **sable mouillé praticable**, où elle laisse trois
choses à ramasser : un coquillage, une étoile de mer, un bout de bois
flotté, une bouteille. Deux shells chacune, six par jour au plus. À marée
haute c'est de l'eau, et on ne peut plus y aller.

Le cycle est **semi-diurne, 12 h 25 min, comme la vraie marée** : deux
basses mers par jour, d'environ 3 h 45 chacune, et cinquante minutes de
décalage d'un jour sur l'autre. Ce décalage n'est pas un détail
d'exactitude, c'est la règle de jeu : une marée calée sur l'horloge civile
tomberait à la même heure tous les jours, et l'enfant qui se connecte
toujours après l'école ne verrait jamais que la même moitié du jeu.

**La phase vient du serveur** (`maree()`, dans
`supabase/2026-09-17_maree.sql`), pour la même raison que le jour : une
marée lue sur l'horloge du téléphone se remonte d'un doigt, et surtout elle
ne serait pas la même pour deux enfants au même moment. Or on va chez les
autres — il faut que la mer soit basse chez le voisin quand elle est basse
chez soi. Entre deux appels, le client avance la phase tout seul.

**Rien n'en part en base.** Pas une clé de plus dans `mondeNu()`, rien à
mémoriser pour `Ctrl+Z`. Le sable se déduit du rayon acquis, ce que la mer
laisse se déduit du numéro de la marée : tout le monde voit la même chose
au même endroit, et rien ne se sauvegarde.

On ne bâtit pas sur le sable mouillé : il est hors du rayon acquis, donc
tout ce qui posait et peignait le refusait déjà. Et si la mer remonte
pendant qu'on y marche, le bonhomme est **reposé à terre**, pas noyé : pas
de perte, pas de gronderie, c'est la même règle que le chien qui s'assied.

Le sable se découvre **depuis le large, de proche en proche**. Le premier
essai prenait toute l'eau comprise entre le rayon et le rayon plus un, et
le bord dentelé de l'île laissait alors des trous d'eau isolés au milieu du
sable. La propagation règle ça, et elle donne une règle de jeu en cadeau :
**une mare creusée au milieu de l'île reste une mare**, puisque la mer ne
l'atteint pas.

### La place qu'il a fallu lui faire

La mer faisait 352x174 et l'île 357x178 à son rayon maximal : elle en
sortait. Il ne restait que dix pixels d'eau au point le plus serré sur une
île neuve. Il n'y avait donc de place ni pour la marée ni, à vrai dire,
pour une île adulte.

La mer fait maintenant **438x240**, et l'origine du dessin a remonté pour
que l'île retombe au milieu du cadre. Mais une tache de 944 px de large
n'entre pas dans un cadre de 768 : c'est la contrainte **horizontale** qui
bloquait, et aucun réglage vertical n'y pouvait rien. Agrandir le canvas
aurait cassé le rapport 1,536, qui est exactement
`(100vw - 236px) / 100vh` sur un téléphone en paysage — c'est lui qui fait
que le cadre y remplit pile la hauteur.

C'est donc **le zoom de base qui a reculé**, de 1 à 0,78. Le cadre montre
985x641 de monde, la mer y tient avec du papier tout autour, et pas une
ligne de CSS n'a bougé.

## La commande du jour, et le sac

Chaque matin, l'archipel demande deux choses : un coquillage et une étoile
de mer, un bout de bois flotté et une bouteille à la mer. **La même
commande pour tout le monde**, comme la marée est la même pour tout le
monde : deux enfants qui jouent le même jour peuvent en parler. Elle se
déduit du jour et n'est stockée nulle part.

On la remplit **chez soi**, sur le sable mouillé, à marée basse : la mer y
dépose les deux sortes demandées et une troisième au hasard. Ce qu'on
ramasse tombe dans le **sac**, et on la porte **chez quelqu'un**, jusqu'au
pas de sa porte : `E` ou le bouton rose. **6 shells** pour le porteur, une
fois par jour ; **8** pour l'hôte, qui les trouve en rentrant, jusqu'à
trois paniers.

### Pourquoi elle se livre, et pourquoi elle ne se ramasse pas

La question posée avant d'écrire une ligne : la commande se paie-t-elle en
shells (un revenu solitaire de plus, contre la règle « l'île grandit parce
que des gens sont passés »), ou demande-t-elle d'aller glaner chez les
autres, ce qui rouvrirait le choix déjà écrit pour la marée : « chez les
voisins, il n'y a rien à ramasser » ?

Ni l'un ni l'autre. **Elle se remplit chez soi et se livre chez un
voisin.** La règle de la marée parle de *ramasser* ; livrer est le verbe
inverse. On arrive les mains pleines au lieu de repartir les mains
pleines, et cette règle-là n'a pas bougé d'un mot.

Et elle paie dans la famille des **visites**, pas dans celle des corvées.
Le revenu solitaire reste à 19 shells par jour ; le revenu « quelqu'un est
passé » monte de 35 à 65. Le rapport passe de 1,8x à 3,4x. C'est le seul
ajout d'économie depuis les visites qui *renforce* la règle au lieu de
l'éroder, et c'est à ça qu'il faut mesurer le suivant.

C'est aussi, avec le mot planté, le seul gain que le serveur peut vérifier
de bout en bout : il y a une ligne dans `livraisons`, signée d'un compte,
sur l'île d'un autre. « J'ai ramassé un coquillage » ne l'est pas : c'est
le plafond du jour qui borne ça, comme pour la tonte.

### Le sac

Il appartient au **joueur**, pas à l'île : il vit dans `bourses.sac`, avec
la bourse, et pour la même raison : c'est la personne qui visite, et c'est
elle qui porte le panier. Rien n'entre dans `iles.monde`, aucune clé de
plus dans `mondeNu()`, aucune migration du jsonb. Il suit d'un appareil à
l'autre, et chez les voisins.

Il ne se remplit **que tant que la marée paie** : trois objets par jour,
bornés par le plafond de six shells, sans second compteur à tenir. Ramassé
au-delà, l'objet disparaît quand même et le dit. Même règle que la tonte.

Et **il se voit**. Dès que le sac peut remplir la commande, le bonhomme
porte un panier, chez lui comme chez les autres, et il le pose quand elle
est livrée. Un inventaire qui ne vit que dans un panneau se lit comme une
liste de courses ; là, on voit quelqu'un traverser l'archipel avec quelque
chose dans les mains. Il occupe la place de la tondeuse : un seul objet en
main à la fois.

Le sac est dans l'onglet **Toi**, à côté de l'équipement : c'est ce qu'on
porte. La commande est en tête de **Voisins**, parce que c'est la raison
d'y aller. La pastille de l'onglet ne s'allume que quand le sac est prêt
et que la commande n'est pas portée : une pastille allumée en permanence
n'est plus une pastille.

### Ce qu'on ne peut pas faire

- Porter deux commandes dans la journée. Le plafond vaut exactement le
  gain, comme pour la promenade du chien : c'est ce qui dit « une fois par
  jour » en une ligne.
- La porter chez soi, ni sur une île de démonstration : il n'y a personne
  pour recevoir le panier.
- Demander le gain. Le client appelle `livrer()`, qui déduit le panier de
  la commande du jour, vérifie le sac, écrit le reçu et crédite les deux
  comptes. Le panier n'est pas dans l'appel, pour la même raison que le
  prix vient du catalogue et jamais de l'appel.
- Écrire une ligne de `livraisons` à la main : la table n'a aucune policy
  d'écriture, comme `bourses`. Elle se lit, par l'hôte et par le porteur :
  c'est un reçu, pas un mur public.

## L'appareil photo

28 shells au rayon **Pour toi**. Un troisième bouton rond apparaît alors au
bord du cadre, et la touche **P** fait la même chose : le viseur s'ouvre,
deux voiles sombres cernent un rectangle 3:2, un point rouge bat dans le
coin. On se place, on cadre, et un second appui déclenche. Le tirage
descend dans les fichiers, avec le nom de l'île, chez qui on était et la
date ; une vignette reste dans l'album, onglet **Toi**.

Deux temps et non un, parce que cadrer est tout ce qu'il y a à faire ici.
C'est la forme du comptoir de la boutique, et celle du coffre : le jeu
préfère un geste à un bouton.

**L'album vit dans ce navigateur, pas en base**, et il le dit lui-même.
Une photo, ce sont des pixels, et des pixels n'ont rien à faire dans un
jsonb que chaque sauvegarde réécrit. Douze vignettes au plus, la plus
ancienne s'efface quand la treizième arrive. Mesuré : ~11 ko la vignette,
~140 ko l'album entier, contre plus de deux mégaoctets pour douze tirages.

La **carte postale** reste, dans l'onglet Voisins, et garde son travail à
elle : elle porte l'adresse de l'île, c'est une invitation. La photo ne
porte que ce qu'on a cadré.

Elle ne rapporte rien. Pas de gain, pas de plafond : une photo qui paierait
deviendrait une corvée, et il y en a déjà trois.

## Le compagnon

20 shells au rayon **Pour toi**, et ça n'achète **pas** une bestiole : ça
ouvre le rayon. On choisit ensuite, dans l'onglet **Toi**, parmi celles
qu'on a déjà : chien, crabe et mouette sont gratuits, chat, hérisson et
renard s'achètent à la Boutique comme objets d'île. Sans cette règle, un
renard coûterait 20 shells par cette porte et 32 par l'autre. Effet voulu :
un chat acheté sert deux fois.

Il suit partout : chez les voisins, et dans la maison. Il ne rapporte rien,
ne se perd pas, ne bloque rien, et il n'a aucun but à atteindre, donc rien
à rater. Au-delà de deux cases et demie il accélère pour rattraper, ce qui
le ramène après un clic à l'autre bout de l'île sans qu'il apparaisse d'un
coup aux pieds du joueur.

Il ne sort pas pendant la balade du chien : un animal à la fois, la même
règle que le panier qui se range quand la tondeuse sort.

Quand tu visites quelqu'un, **son** compagnon est assis à côté de lui,
devant sa porte. C'est la même ligne que l'hôte qui respire et qui saute :
une île habitée doit avoir l'air habitée.

Rien n'en part en base sinon le choix lui-même, qui tient dans
`me.compagnon` : l'avatar voyage avec l'île, le compagnon voyage avec
l'avatar. Sa position ne se sauvegarde pas du tout.

Des joueurs ont signalé que « les animaux ne sont pas accessibles ». Ils
l'étaient, et rien n'était cassé : le bloc **Compagnon** vivait sous le
sac, à un écran de défilement du haut de l'onglet Toi, et « Compagnon,
20 shells » ne disait pas qu'on achetait la capacité, ni que trois
bestioles étaient déjà à soi. Le bloc est remonté au-dessus du sac, et les
deux textes nomment le prix, le chemin et les trois gratuites.

## Ce que le chien laisse

Une fois par balade, à un point tiré au hasard, le chien s'arrête et pose
une crotte sur sa case. Elle se nettoie comme tout le reste se fait ici :
on marche dessus, puis `E` ou le bouton rose, qui affiche **Nettoyer**.

Elle ne paie rien et ne coûte rien. Ne pas la nettoyer n'a aucune
conséquence : c'est la même règle que le chien qui s'assied quand on va
trop loin. Elle n'est ni dans l'atelier ni à la Boutique — c'est le chien
qui la met, comme la tondeuse est un dessin que le moteur sort quand une
touffe est sous les pieds.

Elle est exclue des souvenirs : on n'en rapporte pas de chez un voisin.
`Ctrl+Z` la fait revenir, puisque la nettoyer passe par la même mémoire
que la gomme.

## Ta terre, et pourquoi elle s'arrête à 8,3

L'île grandit d'un cran (`PAS_RAYON`, 0,13) à chaque mot laissé dans le
livre d'or, de `RAYON0` = 7,0 à `RAYON_MAX` = 8,3 : **dix mots**, et c'est
la seule façon de gagner du terrain.

Le maximum n'est pas un réglage de confort, c'est la place disponible. Au
rayon 8,3 l'anneau de sable mouillé de la marée mesure 396 px de demi-
largeur à l'écran, et la mer, au plus serré de son contour ondulant,
403 px : il reste 7 px d'eau. Au rayon 9 l'anneau sortirait de la mer de
21 px. Et agrandir la mer n'est pas possible non plus : elle fait déjà
945 px de large, bosses comprises, dans les 985 px que le cadre montre au
zoom le plus large.

Ce qui manquait n'était donc pas de la terre, c'était de **voir** qu'on en
gagne. Le bloc **Ta terre**, en tête du panneau Île sous le nom, porte une
jauge, les crans gagnés sur dix, les mots reçus, et la seule chose à faire
pour en gagner : envoyer sa carte postale. Le murmure de `faireGrandir()`
dit au passage combien de mots il reste.

## Les trois objets chers

Ils ne décorent pas : ils font quelque chose, et ce qu'ils font était
jusqu'ici enfermé dans un panneau. C'est le geste que le jeu répète
partout — le coffre pour le cadeau du jour, l'appareil pour la photo, le
pas de la porte pour la commande : sortir une information d'un panneau et
la poser là où l'on va à pied.

    Girouette          42   marche sur elle : elle dit si la mer est haute
                            ou basse, et dans combien de temps elle change.
                            Marche aussi chez les voisins — la marée est la
                            même pour tout l'archipel.
    Carillon           50   sonne tout seul, de loin en loin, dans la gamme
                            de l'heure de l'île. Il appartient à l'île :
                            tes visiteurs l'entendent.
    Boîte aux lettres  55   son drapeau se lève quand on t'a laissé un mot,
                            et ça se voit de l'autre bout de l'île. Marche
                            dessus et appuie sur E pour lire. Chez un
                            voisin, elle reste baissée : c'est son courrier.

**Aucun des trois ne rapporte un shell et aucun ne touche à un plafond.**
Un achat qui ferait monter un gain reviendrait à vendre de la monnaie, et
une quatrième corvée déséquilibrerait le rapport entre ce qu'on gagne seul
(19 shells par jour) et ce qu'on gagne parce que quelqu'un est passé (65).

Leurs prix sont dans la table `catalogue`, comme tout le reste : tant que
`supabase/2026-09-19_objets_chers.sql` n'est pas joué, ils s'affichent dans
la Boutique et l'achat les refuse. La vitrine du client n'est qu'un
affichage de secours.

Rien n'en part en base au-delà de l'objet posé lui-même : pas une clé de
plus dans `mondeNu()`, rien pour Ctrl+Z, aucune table. Ce qu'ils lisent —
la marée, les mots reçus — se calcule déjà ailleurs.

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
écrire. Les y remettre serait rendre la caisse au navigateur. Le **sac**
(`bourses.sac`) n'y est jamais entré, pour la même raison et parce qu'il
appartient au joueur et non à l'île.

Les paniers portés vivent dans `livraisons`, une ligne par (île, porteur,
jour), écrite par `livrer()` seule : la table n'a aucune policy
d'écriture.

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
