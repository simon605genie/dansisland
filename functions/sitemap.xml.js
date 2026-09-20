// ============================================================
//  /sitemap.xml — l'archipel, pour les moteurs.
//
//  Il se fabrique à la demande depuis la vue `archipel` : un fichier
//  statique aurait à être régénéré à chaque île créée, et personne n'y
//  penserait. C'est la même raison que partout ailleurs ici — une seule
//  source, et elle est en base.
//
//  Chaque île y est **une fois**, sous `/island/<slug>` : c'est l'adresse
//  crawlable, celle qui porte du texte. `/<slug>` sert la même page que
//  toutes les autres (le jeu) et n'apprendrait rien de plus à un robot ;
//  la page publique y renvoie, et c'est suffisant.
//
//  Base injoignable : on rend quand même la racine plutôt qu'une erreur.
//  Un plan de site incomplet vaut mieux qu'un 500 dans la Search Console.
// ============================================================
import { toutesLesIles, SITE, SLUG, PAGES, ILES_INDEXABLES } from './_commun.js';

export async function onRequestGet(context) {
  const { env } = context;
  let iles = [];
  try { iles = await toutesLesIles(env); } catch (e) { iles = []; }

  const jour = (v) => {
    const d = v ? new Date(v) : new Date();
    return isNaN(d) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
  };
  const url = (loc, maj, prio, freq) =>
    '  <url><loc>' + loc + '</loc><lastmod>' + maj + '</lastmod>' +
    '<changefreq>' + freq + '</changefreq><priority>' + prio + '</priority></url>';

  /* **Le plan ne liste plus les îles des joueurs**, et c'est le changement
     du 20/09. Il les listait toutes : un plan qui annonce une page que la
     page elle-même marque `noindex` dit deux choses contraires, et c'est la
     première qu'un robot suit. Surtout, demander l'indexation de l'île d'un
     enfant est une décision — pas quelque chose qui arrive parce qu'il a
     publié son île pour qu'un ami la visite.

     Ce qui reste : l'accueil, les quatre pages éditoriales, et les îles
     nommément listées dans `ILES_INDEXABLES` — aujourd'hui la seule île de
     démonstration, qui n'appartient à personne. `iles` sert encore, mais
     seulement à donner à ces îles-là leur vraie date de mise à jour. */
  const lignes = [url(SITE + '/', jour(), '1.0', 'weekly')];
  PAGES.forEach(p => lignes.push(url(SITE + p.chemin, jour(), '0.8', 'monthly')));
  ILES_INDEXABLES.forEach(s => {
    if (!SLUG.test(s)) return;
    const i = iles.find(x => String(x.slug || '').toLowerCase() === s);
    if (!i) return;                       // pas encore créée : on ne l'annonce pas
    lignes.push(url(SITE + '/island/' + s, jour(i.maj_le), '0.6', 'weekly'));
  });

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    lignes.join('\n') + '\n</urlset>\n';

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400'
    }
  });
}
