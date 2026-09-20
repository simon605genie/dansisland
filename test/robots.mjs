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

  /* Les adresses ne sont pas recopiées ici : elles se **lisent** dans
     `PAGES`. Écrites à la main, ce contrôle serait resté vert le jour où
     les chemins sont passés au français — ou rouge pour rien, ce qui est
     arrivé. Une liste de plus à tenir d'accord est une liste de trop. */
  const commun0 = lire('functions/_commun.js');
  const chemins = [...commun0.matchAll(/chemin:\s*'(\/[a-z-]+)'/g)].map(m => m[1]);
  const liens = chemins.filter(p => html.indexOf('href="' + p + '"') >= 0);
  console.log('     liens : ' + liens.join(' · '));
  c.dit(chemins.length === 4 && liens.length === 4,
        'les quatre pages éditoriales sont reliées depuis l’accueil (' + liens.length + '/' + chemins.length + ')');
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
  const alias = [...commun.matchAll(/alias:\s*'(\/[a-z-]+)'/g)].map(m => m[1]);
  c.dit(pages.length === 4, 'quatre pages déclarées dans PAGES (' + pages.length + ')');
  c.dit(alias.length === 4, 'et leurs quatre alias (' + alias.length + ')');
  // Le canonique est le français : c'est ce qu'un enfant francophone tape.
  c.dit(pages.every(p => /^\/[a-z-]+$/.test(p) && !/^\/(how|features|build|post)/.test(p)),
        'les chemins canoniques sont en français (' + pages.join(' · ') + ')');

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

  // Et chaque adresse doit avoir son fichier de route — canonique **et**
  // alias : une route absente, et l'adresse retombe sur le jeu sans que
  // personne ne le remarque.
  const sansRoute = pages.concat(alias).filter(p => {
    try { lire('functions' + p + '.js'); return false; } catch (e) { return true; }
  });
  c.dit(sansRoute.length === 0,
        'les huit adresses ont leur fichier de route' + (sansRoute.length ? ' → ' + sansRoute.join(', ') : ''));

  /* **Les huit** routes doivent rendre un chemin **canonique**, pas le
     leur : sinon deux adresses se déclarent chacune canonique et un moteur
     en indexe deux là où il n'y a qu'une page.

     Éprouvé en posant la panne sur le fichier **canonique** — et la
     première version de ce contrôle l'a laissée passer, parce qu'elle ne
     parcourait que les alias. Elle avait l'angle mort du côté qu'elle
     n'avait pas pensé à regarder, comme le contrôle 9 qui ne lisait pas
     `GRANDS`. Elle parcourt les huit maintenant. */
  const fautifs = pages.concat(alias).filter(a => {
    const src = lire('functions' + a + '.js');
    const m = src.match(/rendre\('(\/[a-z-]+)'/);
    return !m || pages.indexOf(m[1]) < 0;
  });
  c.dit(fautifs.length === 0,
        'les huit routes rendent un chemin canonique' + (fautifs.length ? ' → ' + fautifs.join(', ') : ''));

  /* **Les huit adresses doivent être réservées côté base.** Ce sont des
     routes d'un seul segment, comme l'adresse d'une île : sans réservation,
     un joueur pouvait prendre `comment-jouer`, la fonction répondait avant
     le catch-all, et **son île devenait inatteignable** — sans erreur, sans
     trace, et sans qu'on puisse le lui expliquer.

     Deux listes qui doivent rester d'accord, donc, et ce contrôle est le
     seul endroit qui les regarde ensemble. */
  const sql = lire('supabase/2026-09-20_slugs_reserves.sql');
  const bloc = sql.slice(sql.indexOf('select lower(s) in ('), sql.indexOf('$$;'));
  const reserves = [...bloc.matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]);
  console.log('     réservés : ' + reserves.length + ' noms');
  c.dit(reserves.length > 20, 'la liste SQL des slugs réservés a été lue (' + reserves.length + ')');
  const nus = pages.concat(alias).map(p => p.slice(1));
  const oubliees = nus.filter(n => reserves.indexOf(n) < 0);
  c.dit(oubliees.length === 0,
        'les huit adresses sont réservées en base' + (oubliees.length ? ' → ' + oubliees.join(', ') : ''));
  // Les quinze noms d'avant ne doivent pas avoir disparu au passage.
  const avant = ['api', 'admin', 'app', 'archipel', 'auth', 'compte', 'src', 'www'];
  const perdus = avant.filter(n => reserves.indexOf(n) < 0);
  c.dit(perdus.length === 0,
        'et les réservations d’avant sont toujours là' + (perdus.length ? ' → ' + perdus.join(', ') : ''));

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

c.titre('4. le rang des cinq — cinq cartes, cinq endroits');
{
  /* Ce contrôle **rend** les pages au lieu de lire la source : `rang()` et
     `rendre()` sont des modules ES ordinaires, donc Node peut les appeler.
     Seul Supabase manquerait, et les quatre pages éditoriales ne lui
     demandent rien. C'est ce qui permet de vérifier le HTML qui part
     vraiment, plutôt qu'une expression régulière sur une liste.

     Le défaut qui vaut ce contrôle a été vu **sur la page rendue** : Maison
     et Île pointaient toutes deux sur `/construire-son-ile`, donc cette
     page-là montrait **deux** repères « tu es ici » côte à côte, et les
     trois autres deux liens vers la même adresse. Voir le commentaire de
     `rang()` dans `_commun.js`. */
  const { rang, PAGES } = await import('../functions/_commun.js');
  const { rendre } = await import('../functions/_pages.js');

  const cibles = [...rang('').matchAll(/<a href="([^"]+)"/g)].map(m => m[1]);
  console.log('     cibles   : ' + cibles.join(' · '));
  // Un contrôle qui ne dit pas combien il a lu peut passer au vert en ne
  // regardant presque rien. C'est la leçon des trois prénoms au lieu de vingt.
  c.dit(cibles.length === 5, 'les cinq cartes ont été lues (' + cibles.length + ')');
  const doublons = cibles.filter((v, i) => cibles.indexOf(v) !== i);
  c.dit(doublons.length === 0,
        'et elles mènent à cinq endroits différents' +
        (doublons.length ? ' → ' + [...new Set(doublons)].join(', ') : ''));

  /* L'unicité des cibles *est* la garantie « au plus un repère ». On la
     vérifie quand même sur le rendu, parce que c'est elle qu'on voit : une
     propriété démontrée sur la liste et fausse à l'écran ne vaut rien. */
  const ou = [...PAGES.map(p => p.chemin), ''];
  const trop = ou.filter(p => (rang(p).match(/<div>/g) || []).length > 1);
  c.dit(trop.length === 0,
        'aucune page ne montre deux repères « tu es ici »' +
        (trop.length ? ' → ' + trop.join(', ') : ''));

  const rendus = {};
  for (const p of PAGES) rendus[p.chemin] = await (await rendre(p.chemin, {
    next: () => new Response('next', { status: 404 }) })).text();
  c.dit(Object.keys(rendus).length === 4,
        'les quatre pages ont été rendues (' + Object.keys(rendus).length + ')');

  /* Une cible doit exister des deux côtés : la page, et l'ancre dedans.
     Une ancre absente ne lève rien — le saut ne fait simplement rien, et
     personne ne peut l'expliquer au lecteur. C'est le défaut silencieux que
     ce dépôt traque partout. */
  const perdues = [], sansAncre = [];
  for (const t of cibles) {
    const [chemin, ancre] = t.split('#');
    if (!rendus[chemin]) { perdues.push(t); continue; }
    if (ancre && rendus[chemin].indexOf('id="' + ancre + '"') < 0) sansAncre.push(t);
  }
  c.dit(perdues.length === 0,
        'chaque carte vise une page qui existe' + (perdues.length ? ' → ' + perdues.join(', ') : ''));
  c.dit(sansAncre.length === 0,
        'et chaque ancre existe dans la page visée' +
        (sansAncre.length ? ' → ' + sansAncre.join(', ') : ''));
}

s.fermer();
process.exit(c.fin() ? 1 : 0);
