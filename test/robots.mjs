/* Ce qu'un robot lit.

   Le jeu est **une page peinte dans un canvas** : un moteur, un aperçu
   WhatsApp, un lecteur d'écran n'y voient rien du tout. Ce qu'ils lisent,
   c'est le HTML servi — et lui seul. Ce harnais le prend donc **par le
   réseau, sans navigateur** : pas de JavaScript, pas de `localStorage`,
   exactement ce qu'un robot qui ne rend pas les pages reçoit.

   Il est né d'un audit, le 20/09, qui a trouvé trois choses :

     le seul texte lisible du site était derrière `hidden`
     il y avait deux `<h1>`, et aucun ne disait de quoi parle la page
     `go()` écrasait le <title> par « Dan's Island » dès le démarrage

   Et une quatrième, plus grave que les trois : **toutes les îles des
   joueurs étaient indexables et listées dans le plan du site.** Publier son
   île pour qu'un ami la visite n'est pas consentir à la voir dans Google.

   Ce qu'il ne couvre pas, et il ne faut pas prétendre le contraire : les
   pages éditoriales et les pages d'île sont servies par des Cloudflare
   Pages Functions, qui ne tournent pas ici. Leur contenu est donc vérifié
   dans la source, leur rendu ne l'est pas. */
import { servir, compteur } from './aide.mjs';
import { readFileSync } from 'fs';

const s = await servir(8203);
const c = compteur();
const lire = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

c.titre('1. la page servie, sans une ligne de JavaScript');
{
  const html = await (await fetch(s.url)).text();
  const un = re => { const m = html.match(re); return m ? m[1].trim().replace(/\s+/g, ' ') : ''; };

  const titre = un(/<title>([^<]*)<\/title>/);
  console.log('     title : ' + titre);
  c.dit(/jeu relaxant/i.test(titre) && /île/i.test(titre),
        'le titre dit ce qu’est le jeu, pas seulement son nom');
  c.dit(titre.length <= 65, 'et il tient dans un résultat de recherche (' + titre.length + ' car.)');

  const h1s = html.match(/<h1[\s>][\s\S]*?<\/h1>/g) || [];
  const h1 = un(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  console.log('     h1    : ' + h1);
  // Deux h1, c'est deux réponses à « de quoi parle cette page ? ». Il y en
  // avait deux avant le 20/09 : la marque dans l'en-tête et la promesse
  // dans le voile.
  c.dit(h1s.length === 1, 'il y a exactement un <h1> (' + h1s.length + ')');
  c.dit(/construis/i.test(h1) && /île/i.test(h1),
        'et il parle de construire une île, pas de la marque');

  /* Le défaut principal de l'audit : `#accueil` portait `hidden`, donc le
     seul texte du site que l'on puisse lire l'était aussi pour les robots
     qui ne rendent pas le JavaScript. Il part visible, et un script en
     ligne le cache avant le premier affichage pour qui revient. */
  c.dit(/<div class="accueil" id="accueil">/.test(html),
        'le voile d’accueil n’est pas `hidden` dans la source');
  c.dit(/window\.__accueilDu/.test(html),
        'et c’est un script en ligne qui le cache, avant le premier affichage');

  const desc = un(/<meta name="description" content="([^"]*)"/);
  c.dit(desc.length > 90 && desc.length < 320, 'la description a une vraie longueur (' + desc.length + ')');
  c.dit(/relaxant|détente/i.test(desc), 'et elle nomme le genre');

  // Ce qu'un robot peut lire, en mots. Avant le 20/09 le voile était caché,
  // donc il n'en restait qu'une poignée dans l'en-tête.
  const mots = html.replace(/<script[\s\S]*?<\/script>/g, ' ')
                   .replace(/<style[\s\S]*?<\/style>/g, ' ')
                   .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
  console.log('     mots lisibles hors script : ' + mots);
  c.dit(mots > 150, 'il y a de quoi lire sans exécuter le jeu (' + mots + ' mots)');

  const liens = (html.match(/href="\/(how-to-play|features|build-your-island|postcards)"/g) || []);
  c.dit(liens.length === 4, 'les quatre pages éditoriales sont reliées depuis l’accueil (' + liens.length + ')');
  c.dit(/<link rel="canonical" href="https:\/\/dansisland\.app\/">/.test(html), 'la page porte son canonique');
  c.dit(/og:image" content="https:/.test(html), 'et une image de partage absolue et en https');
}

c.titre('2. rien n’est indexable par défaut');
{
  /* Le point le plus important de l'audit, et le seul qui touche à la vie
     privée : une île porte un prénom, le nom qu'un enfant a donné à son
     île, et le livre d'or où ses copains ont écrit. */
  const commun = lire('functions/_commun.js');
  c.dit(/ROBOTS_NON\s*=\s*'noindex/.test(commun), 'le défaut de `page()` est `noindex`');
  c.dit(/content="\$\{ech\(o\.robots \|\| ROBOTS_NON\)\}"/.test(commun),
        'et il s’applique à toute page qui ne demande rien');

  const ile = lire('functions/island/[slug].js');
  c.dit(/ILES_INDEXABLES\.indexOf\(slug\)/.test(ile),
        'une île n’est indexable que si elle est nommée dans la liste');
  c.dit(/robots: indexable \? ROBOTS_OUI : ROBOTS_NON/.test(ile), 'et le noindex est bien posé sinon');

  const carte = lire('functions/carte/[slug].js');
  c.dit(/robots: ROBOTS_NON/.test(carte),
        'une carte postale n’est **jamais** indexée : elle porte un message');
  c.dit(/t\\u2019envoie une carte postale/.test(carte),
        'et son titre nomme l’expéditeur, pas l’île');

  /* Un plan du site qui annonce une page que la page marque `noindex` dit
     deux choses contraires. Il listait toutes les îles. */
  const plan = lire('functions/sitemap.xml.js');
  c.dit(!/iles\.forEach/.test(plan), 'le plan du site ne liste plus toutes les îles');
  c.dit(/ILES_INDEXABLES\.forEach/.test(plan) && /PAGES\.forEach/.test(plan),
        'il liste les pages éditoriales et les îles nommées');
}

c.titre('3. les quatre pages éditoriales, et les listes qui doivent s’accorder');
{
  const commun = lire('functions/_commun.js');
  const pages = [...commun.matchAll(/chemin:\s*'(\/[a-z-]+)'/g)].map(m => m[1]);
  c.dit(pages.length === 4, 'quatre pages déclarées dans PAGES (' + pages.length + ')');

  const mod = lire('functions/_pages.js');
  const contenu = [...mod.matchAll(/^  '(\/[a-z-]+)':\s*\{/gm)].map(m => m[1]);
  console.log('     PAGES    : ' + pages.join(' · '));
  console.log('     CONTENU  : ' + contenu.join(' · '));
  // Deux listes qui divergent, et le plan du site annonce une adresse qui
  // rend le jeu : le piège déjà nommé pour les prix SQL et pour les rayons.
  const manque = pages.filter(p => contenu.indexOf(p) < 0);
  c.dit(manque.length === 0, 'chaque page de PAGES a son contenu' + (manque.length ? ' → ' + manque.join(', ') : ''));
  const orphelin = contenu.filter(p => pages.indexOf(p) < 0);
  c.dit(orphelin.length === 0, 'et rien n’est écrit sans être relié' + (orphelin.length ? ' → ' + orphelin.join(', ') : ''));

  // Et chaque page doit avoir son fichier de route : une route absente, et
  // l'adresse retombe sur le jeu sans que personne ne le remarque.
  const sansRoute = pages.filter(p => {
    try { lire('functions' + p + '.js'); return false; } catch (e) { return true; }
  });
  c.dit(sansRoute.length === 0,
        'chaque page a son fichier de route' + (sansRoute.length ? ' → ' + sansRoute.join(', ') : ''));

  // Le contenu lui-même : un titre qui dit le genre, un h1, de quoi lire.
  let courtes = [];
  contenu.forEach(p => {
    const bloc = mod.slice(mod.indexOf("  '" + p + "':"), mod.indexOf("  '" + p + "':") + 6000);
    const mots = bloc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').split(' ').length;
    if (mots < 180) courtes.push(p + ' (' + mots + ')');
  });
  c.dit(courtes.length === 0,
        'chaque page a de quoi se lire' + (courtes.length ? ' → ' + courtes.join(', ') : ''));
  /* Les titres des quatre pages, et **eux seuls** : `titre:` apparaît une
     cinquième fois dans l'appel à `page()`, et compter les cinq faisait
     échouer ce contrôle pour rien. Un faux positif use un contrôle aussi
     sûrement qu'un faux négatif. */
  const titres = [...mod.matchAll(/^    titre:\s*'([^']*)'/gm)].map(m => m[1]);
  const sansGenre = titres.filter(t => !/jeu relaxant/i.test(t));
  console.log('     titres   : ' + titres.length + ' · sans le genre : ' + (sansGenre.length || 'aucun'));
  c.dit(titres.length === 4, 'les quatre titres ont été lus (' + titres.length + ')');
  c.dit(sansGenre.length === 0,
        'et chacun porte le positionnement' + (sansGenre.length ? ' → ' + sansGenre.join(' / ') : ''));
}

s.fermer();
process.exit(c.fin() ? 1 : 0);
