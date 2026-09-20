// ============================================================
//  /island/<slug> — la page publique d'une île.
//
//  Elle n'est pas le jeu et ne cherche pas à l'être : c'est la page qu'un
//  moteur indexe et qu'un aperçu de lien montre. Deux boutons en sortent —
//  visiter cette île, ou créer la sienne — et le second emporte le
//  parrainage.
//
//  L'adresse du **jeu** reste `/<slug>`, et c'est elle qu'on partage depuis
//  l'application. Celle-ci est l'entrée par la porte de devant : un lien
//  trouvé dans une recherche, une carte postale relayée, un signet.
// ============================================================
import { ileParSlug, page, reponse, vignette, ech, SITE, SLUG,
         ROBOTS_OUI, ROBOTS_NON, ILES_INDEXABLES, rang } from '../_commun.js';

export async function onRequestGet(context) {
  const { params, env, next } = context;
  const slug = String(params.slug || '').toLowerCase();
  if (!SLUG.test(slug)) return next();

  let ile = null;
  try { ile = await ileParSlug(env, slug); } catch (e) { ile = null; }
  // Île inconnue ou base injoignable : on s'efface, le jeu prend la main.
  if (!ile) return next();

  const nom = ile.nom || 'Une île';
  const qui = ile.proprietaire || 'Quelqu’un';
  const mots = Number(ile.mots) || 0;
  const titre = nom + ' — une île sur Dan’s Island';
  const desc = qui + ' a construit ' + nom + ' sur Dan’s Island, un jeu de détente. ' +
               'Viens t’y promener, laisse-lui un mot, et crée la tienne.';

  const ld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CreativeWork',
    name: nom, url: SITE + '/island/' + slug, inLanguage: 'fr',
    author: { '@type': 'Person', name: qui },
    dateModified: ile.maj_le || undefined,
    isPartOf: { '@type': 'VideoGame', name: "Dan's Island", url: SITE + '/' }
  });

  const corps = `
  <main class="carte">
    ${vignette(ile.palette)}
    <div class="dedans">
      <h1>${ech(nom)}</h1>
      <p class="qui">Par <b>${ech(qui)}</b> · ${mots} mot${mots > 1 ? 's' : ''} dans son livre d’or
        · <span class="mono">dansisland.app/${ech(slug)}</span></p>
      <p class="dit">Tu peux marcher dessus, lire ce que les autres y ont laissé,
        y planter un mot à ton tour et rapporter un souvenir chez toi.
        Tu ne peux rien y casser&nbsp;: chez les voisins, on regarde.</p>
      <div class="portes">
        <a class="btn p" href="/${ech(slug)}">Visiter cette île</a>
        <a class="btn" href="/?de=${ech(slug)}">Créer mon île</a>
      </div>
    </div>
  </main>
  ${rang('')}`;

  /* **Noindex par défaut, et c'est le seul réglage qui compte ici.** Cette
     page porte le prénom de quelqu'un, le nom qu'il a donné à son île et le
     compte des mots qu'on lui a laissés — souvent ceux d'un enfant. Publier
     son île pour qu'un ami la visite et la voir remonter dans Google sont
     deux choses différentes, et il n'a consenti qu'à la première.

     `follow` reste : les liens de la page mènent au jeu, et rien n'oblige à
     couper ça en plus. Seule l'île de démonstration, qui n'appartient à
     personne, est indexable — et elle l'est nommément. */
  const indexable = ILES_INDEXABLES.indexOf(slug) >= 0;
  return reponse(page({ chemin: '/island/' + slug, titre, desc, ld, corps,
                        robots: indexable ? ROBOTS_OUI : ROBOTS_NON }));
}
