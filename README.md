# DAN'S ISLAND — V1

Chacun fabrique son île, la publie à son adresse, et va marcher sur celle des autres.

**En ligne : https://dansisland.pages.dev**

## Ce qu'il y a dans le dossier

    index.html          l'app entière (moteur isométrique + éditeur + panneaux)
    src/config.js       URL et clé publishable Supabase
    src/store.js        seule couche qui parle à Supabase
    supabase/schema.sql tables, RLS, vue archipel — idempotent
    _redirects          Cloudflare Pages : catch-all, toute adresse sert index.html

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

Deux choses ne sont pas encore éprouvées :

- **Le livre d'or.** Aucun mot en base. Planter un mot chez soi valide
  l'écriture ; il faut un second compte pour vérifier qu'un visiteur ne voit
  pas les mots masqués.
- **Le lien magique en conditions réelles.** Le SMTP par défaut de Supabase
  est limité à 2 envois par heure — inutilisable au-delà d'une poignée de
  testeurs. Brancher un vrai SMTP avant d'ouvrir à du monde.

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
`simon@sababa.be`. Déploiement par upload direct — pas de build, pas d'intégration Git.

On ne pousse que les quatre fichiers du site : ni le schéma, ni les notes
internes n'ont à être publics.

```bash
D=$(mktemp -d) && mkdir -p "$D/src" && cp index.html _redirects "$D/" && cp src/*.js "$D/src/" && npx wrangler pages deploy "$D" --project-name dansisland --branch main
```

Après le déploiement, dans **Auth → URL Configuration** : Site URL sur
`https://dansisland.pages.dev`, et `https://dansisland.pages.dev/**` dans les
Redirect URLs — le `/**` est nécessaire pour revenir sur une adresse d'île.

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
