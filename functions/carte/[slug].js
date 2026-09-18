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
import { ileParSlug, page, reponse, vignette, ech, SITE, SLUG } from '../_commun.js';

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

  const titre = 'Une carte postale de ' + nom;
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
      <h1>Une carte postale de ${ech(nom)}</h1>
      <p class="qui">Envoyée par <b>${ech(qui)}</b>
        · <span class="mono">dansisland.app/${ech(slug)}</span></p>
      ${mot ? '<p class="mot">« ' + ech(mot) + ' »</p>' : ''}
      <p class="dit">Dan’s Island est un jeu de détente&nbsp;: on crée son personnage,
        on construit sa maison et son île, puis on va découvrir celles des autres.
        ${ech(qui)} t’invite à venir marcher sur la sienne.</p>
      <div class="portes">
        <a class="btn p" href="/${ech(slug)}">Visiter cette île</a>
        <a class="btn" href="/?de=${ech(slug)}">Créer mon île</a>
      </div>
    </div>
  </main>`;

  return reponse(page({ chemin: '/carte/' + slug, titre, desc, ld, corps }));
}
