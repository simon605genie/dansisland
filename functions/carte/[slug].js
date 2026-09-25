// ============================================================
//  /carte/<slug> — la carte postale reçue.
//
//  C'est l'adresse que porte le message envoyé depuis le jeu. Celui qui
//  l'ouvre n'a peut-être jamais entendu parler de Dan's Island : la page
//  doit donc dire d'où vient la carte, ce que c'est, et ce qu'on peut en
//  faire — visiter l'île, ou en fabriquer une.
//
//  La phrase de l'expéditeur voyage dans `?m=`, et **nulle part ailleurs** :
//  pas de table de cartes postales, pas d'image stockée, rien à purger un
//  jour. Une carte postale est un message, pas une donnée du jeu.
//
//  Ce qui arrive par `?m=` est du texte écrit par n'importe qui : il est
//  échappé comme tout le reste par `ech()`, coupé à 120 caractères, et il
//  ne sort jamais du bloc qui lui est réservé.
// ============================================================
import { ileParSlug, page, reponse, vignette, ech, SITE, SLUG, ROBOTS_NON, rang,
         langueDe, avecLangue } from '../_commun.js';

export async function onRequestGet(context) {
  const { params, request, env, next } = context;
  const slug = String(params.slug || '').toLowerCase();
  if (!SLUG.test(slug)) return next();

  let ile = null;
  try { ile = await ileParSlug(env, slug); } catch (e) { ile = null; }
  if (!ile) return next();

  const nom = ile.nom || 'Une île';
  const qui = ile.proprietaire || 'Quelqu’un';

  let mot = '';
  try {
    mot = (new URL(request.url).searchParams.get('m') || '').slice(0, 120).trim();
  } catch (e) { mot = ''; }

  /* La langue ne fait que traverser : elle arrive par l'adresse et repart
     dans les deux portes. Sans ça, une carte envoyée en anglais fait
     débarquer son destinataire dans un jeu en français, sans rien dire. */
  const lg = langueDe(request);

  // Le titre nomme **l'expéditeur**, pas l'île : c'est ce qui s'affiche
  // dans l'aperçu WhatsApp, et « Simon t'envoie une carte postale » se lit
  // comme un message reçu. « Une carte postale de Sable-Rose » se lit comme
  // une page de catalogue, et on ne l'ouvre pas.
  const titre = qui + ' t\u2019envoie une carte postale de Dan\u2019s Island';
  const desc = qui + ' t’envoie une carte postale depuis son île sur Dan’s Island. ' +
               'Viens la visiter, et crée la tienne.';

  const ld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Message',
    about: { '@type': 'CreativeWork', name: nom, url: SITE + '/island/' + slug },
    sender: { '@type': 'Person', name: qui }, inLanguage: 'fr'
  });

  const corps = `
  <main class="carte">
    ${vignette(ile.palette)}
    <div class="dedans">
      <h1>${ech(qui)} t’envoie une carte postale</h1>
      <p class="qui">Depuis <b>${ech(nom)}</b>, son île sur Dan’s Island
        · <span class="mono">dansisland.app/${ech(slug)}</span></p>
      ${mot ? '<p class="mot">« ' + ech(mot) + ' »</p>' : ''}
      <p class="dit">Dan’s Island est un jeu de détente&nbsp;: on crée son personnage,
        on construit sa maison et son île, puis on va découvrir celles des autres.
        ${ech(qui)} t’invite à venir marcher sur la sienne.</p>
      <div class="portes">
        <a class="btn p" href="${ech(avecLangue('/' + slug, lg))}">Visiter cette île</a>
        <a class="btn" href="${ech(avecLangue('/?de=' + slug, lg))}">Créer mon île</a>
      </div>
    </div>
  </main>
  ${rang('')}`;

  /* **Jamais indexée.** Elle porte un message personnel dans son adresse,
     donc il n'y a pas de cas où elle devrait se retrouver dans un moteur.
     C'est une lettre, pas une page. */
  return reponse(page({ chemin: '/carte/' + slug, titre, desc, ld, corps,
                        langue: lg, robots: ROBOTS_NON }));
}
