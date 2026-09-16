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

## Les souvenirs

Chez un voisin, s'arrêter à côté d'un objet propose de le ramener.
On ne vole rien : c'est une copie, signée `de: <pseudo de l'hôte>`, posée
sur une case libre de sa propre île. L'île visitée n'est pas touchée.
Un souvenir déjà rapporté du même hôte et du même type est refusé.

## Modèle

Une ligne par île. Tout le monde du jeu tient dans `iles.monde` (jsonb) :
`tiles` (144 chiffres), `house`, `objects`, `me`, `pal`, `sky`.
Les mots du livre d'or vivent à part, dans `mots`, pour être modérables un par un.

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
