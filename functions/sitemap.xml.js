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
import { toutesLesIles, SITE, SLUG } from './_commun.js';

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

  const lignes = [url(SITE + '/', jour(), '1.0', 'weekly')];
  iles.forEach(i => {
    const s = String(i.slug || '').toLowerCase();
    if (!SLUG.test(s)) return;
    lignes.push(url(SITE + '/island/' + s, jour(i.maj_le), '0.7', 'weekly'));
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
