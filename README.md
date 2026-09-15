# DAN'S ISLAND — V1

Chacun fabrique son île, la publie à son adresse, et va marcher sur celle des autres.

## Ce qu'il y a dans le dossier

    index.html          l'app entière (moteur isométrique + éditeur + panneaux)
    src/config.js       URL et clé anon Supabase
    src/store.js        seule couche qui parle à Supabase
    supabase/schema.sql tables, RLS, vue archipel — idempotent
    _redirects          Cloudflare Pages : /dan et /simon servent index.html

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

## Reste à faire

1. Exécuter `supabase/schema.sql` dans l'éditeur SQL (voir lien ci-dessus).
   Vérification : la requête ci-dessous doit répondre 200 et non 404.

       curl -s -o /dev/null -w "%{http_code}\n" \
         "https://cgputbitzfgokpwbbind.supabase.co/rest/v1/archipel?select=slug&limit=1" \
         -H "apikey: sb_publishable_3V1nUy5JTTqXw2CfGdFtrQ_3VG0iIP2"

2. Dans Auth → URL Configuration, mettre `http://localhost:8080` en Site URL
   pour tester en local, puis le vrai domaine au déploiement. Sans ça le lien
   magique renvoie vers `localhost:3000`.
3. Déployer sur Cloudflare Pages (le dossier tel quel, `_redirects` fait le reste).

## Mise en route

1. Coller `supabase/schema.sql` dans l'éditeur SQL Supabase.
2. Renseigner `SUPABASE_ANON_KEY` dans `src/config.js`.
3. Dans Supabase → Authentication → URL Configuration, ajouter le domaine
   en Site URL et en Redirect URL.
4. Servir le dossier : `python3 -m http.server 8080` (les adresses d'îles
   ne marchent qu'une fois déployé, `_redirects` n'existe que sur Pages).

## Modèle

Une ligne par île. Tout le monde du jeu tient dans `iles.monde` (jsonb) :
`tiles` (144 chiffres), `house`, `objects`, `me`, `pal`, `sky`.
Les mots du livre d'or vivent à part, dans `mots`, pour être modérables un par un.

La RLS est la seule protection : la clé anon est publique par construction.
Ne jamais mettre la `service_role` dans `src/`.

## Sauvegarde

L'éditeur écrit à chaque clic. `store.planifierSauvegarde` attend 1,2 s de calme
avant de pousser, garde une copie dans `localStorage`, et rejoue en cas de coupure.
Au chargement, si le brouillon local est plus récent que `maj_le`, il gagne.
