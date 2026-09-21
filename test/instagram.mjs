/* La publication automatique sur Instagram.
 *
 * `.github/publier-instagram.mjs` publie une entrée du calendrier par
 * exécution. Il ne tient **aucun compteur** : il demande au compte ce qui
 * est déjà paru et prend la plus ancienne entrée qui n'y est pas.
 *
 * C'est la bonne façon de le faire — lire l'état réel plutôt qu'un
 * souvenir de cet état, comme `visites` et `parrainages` en SQL — mais
 * c'est aussi une logique qui se trompe **en silence** : publier deux
 * fois, sauter un jour pour toujours, ou republier tout le calendrier
 * ne lèvent aucune erreur. Ça ne peut donc pas s'éprouver en production,
 * sur un compte public, une fois par jour.
 *
 * D'où `IG_API`, qui pointe l'API sur un faux serveur local. Un workflow
 * qui ne s'essaie qu'en production n'est pas essayé.
 *
 * ── Le piège du harnais, et il valait la leçon ────────────────────────
 *
 * Le premier jet lançait le script par `execFileSync`. **Les cinq
 * sections ont échoué, sauf une.** Cause : le faux serveur vit dans ce
 * processus-ci, et `execFileSync` bloque la boucle d'événements — donc
 * le serveur ne pouvait pas répondre, donc le fils attendait jusqu'au
 * délai. Un harnais incapable de répondre à son propre sujet.
 *
 * Et la seule assertion qui passait était « à blanc, aucun appel
 * d'écriture » : vraie, parce que **rien ne s'était produit du tout.**
 * C'est le repère absent qui absout au lieu de faire échouer, nommé le
 * 20/09 pour le rayon Bâtiments et retrouvé ici. Chaque section vérifie
 * donc maintenant qu'elle a bien choisi une entrée **avant** de conclure
 * quoi que ce soit sur ce qui n'a pas été envoyé.
 *
 * Une hypothèse fausse écartée en chemin, et par la mesure : j'ai d'abord
 * accusé le proxy du conteneur d'avaler les appels à `127.0.0.1`. Mesuré :
 * un `fetch` local répond en 31 ms. « Mesurer d'abord » — c'est la phrase
 * que CLAUDE.md répète, et elle vaut aussi contre moi.
 *
 * ── Ce qu'il ne couvre pas ────────────────────────────────────────────
 *
 * L'API de Meta elle-même. Le faux serveur rend ce que la documentation
 * décrit ; si Meta change la forme d'une réponse, seul un vrai appel le
 * dira. Ce qui s'éprouve ici, c'est **notre** logique de choix.
 */
import { compteur } from './aide.mjs';
import http from 'http';
import fs from 'fs';
import { execFile } from 'child_process';

const CHEMIN = new URL('../social/calendrier.json', import.meta.url).pathname;
const SCRIPT = new URL('../.github/publier-instagram.mjs', import.meta.url).pathname;
const CAL = JSON.parse(fs.readFileSync(CHEMIN, 'utf8'));
const repere = p => p.legende.split('\n')[0].trim();
const c = compteur();

function serveur(dejaParues, journal) {
  return http.createServer((req, res) => {
    let b = ''; req.on('data', x => b += x);
    req.on('end', () => {
      if (req.method === 'HEAD') {                       // l'image, que l'API va chercher
        res.setHeader('content-type', 'image/jpeg');
        res.setHeader('content-length', '123456');
        return res.end();
      }
      res.setHeader('content-type', 'application/json');
      if (req.url.includes('/media_publish')) {
        journal.push('publie:' + JSON.parse(b).creation_id);
        return res.end('{"id":"POST1"}');
      }
      if (req.url.includes('/comments')) { journal.push('commentaire'); return res.end('{"id":"COM1"}'); }
      if (req.method === 'POST' && req.url.includes('/media')) {
        journal.push('conteneur'); return res.end('{"id":"CONT1"}');
      }
      if (req.url.includes('/media')) {
        return res.end(JSON.stringify({ data: dejaParues.map(x => ({ caption: x })) }));
      }
      res.statusCode = 404; res.end('{}');
    });
  });
}

async function essai(dejaParues, aBlanc) {
  const journal = [];
  const s = serveur(dejaParues, journal);
  await new Promise(r => s.listen(0, r));
  const port = s.address().port;

  /* Les images sont servies par le même faux serveur. On n'éprouve pas
     ici que `raw.githubusercontent.com` répond — ça, c'est le réseau de
     GitHub — mais que le script refuse de publier une image injoignable,
     ce que la section « image absente » vérifie à part. */
  const cal = JSON.parse(JSON.stringify(CAL));
  cal.posts.forEach(p => { p.url = 'http://127.0.0.1:' + port + '/img/' + p.image; });
  fs.writeFileSync(CHEMIN, JSON.stringify(cal, null, 2));

  const sortie = await new Promise(r => execFile('node', [SCRIPT], {
    env: { ...process.env, IG_USER_ID: '1', IG_ACCESS_TOKEN: 'x',
           IG_API: 'http://127.0.0.1:' + port, IG_ATTENTE: '50',
           A_BLANC: aBlanc ? 'true' : 'false' },
    encoding: 'utf8', timeout: 30000,
  }, (e, out, err) => r((out || '') + (err || ''))));

  s.close();
  fs.writeFileSync(CHEMIN, JSON.stringify(CAL, null, 2));  // on rend le fichier intact
  return { sortie, journal };
}

// ──────────────────────────────────────────────────────────────────────
c.titre('1. le calendrier tient ses promesses');
{
  const reperes = CAL.posts.map(repere);
  console.log('     ' + CAL.posts.length + ' publications · ' + CAL.parJour + ' par jour · ' +
              Math.max(...CAL.posts.map(p => p.legende.length)) + ' caractères au plus long');
  c.dit(CAL.posts.length >= 10, 'le calendrier a été lu (' + CAL.posts.length + ')');
  /* **Le repère doit être unique**, et c'est l'invariant dont tout le
     reste dépend : deux légendes qui commencent pareil, et la seconde
     est prise pour déjà parue, donc sautée pour toujours, sans erreur. */
  c.dit(new Set(reperes).size === reperes.length,
        'chaque publication a un repère distinct (' + new Set(reperes).size + ')');
  // 2200 est la limite d'Instagram ; au-delà la légende est coupée.
  c.dit(CAL.posts.every(p => p.legende.length <= 2200), 'aucune légende ne dépasse 2200 caractères');
  c.dit(CAL.posts.every(p => p.hashtags.split(/\s+/).length <= 30), 'au plus 30 hashtags');
  // Les fichiers existent : un calendrier qui nomme une image absente
  // ferait échouer la publication un mois plus tard, un matin.
  const manquantes = CAL.posts.filter(p =>
    !fs.existsSync(new URL('../social/images/' + p.image, import.meta.url).pathname));
  if (manquantes.length) console.log('     manquantes : ' + manquantes.map(p => p.image).join(', '));
  c.dit(manquantes.length === 0, 'les ' + CAL.posts.length + ' images nommées existent');
  c.dit(CAL.posts.every(p => p.url.endsWith(p.image)),
        'chaque URL publique pointe sur son image');
}

c.titre('2. un compte vide : on publie la première');
{
  const { sortie, journal } = await essai([], false);
  c.dit(/1\. 01-ouverture/.test(sortie), 'il choisit la première entrée');
  c.dit(journal.join(',') === 'conteneur,publie:CONT1,commentaire',
        'conteneur → publication → hashtags en commentaire (' + (journal.join(' · ') || 'rien') + ')');
}

c.titre('3. il saute ce qui est déjà paru');
{
  const { sortie, journal } = await essai(CAL.posts.slice(0, 3).map(repere), false);
  c.dit(/4\. 04-comment-on-joue/.test(sortie), 'trois parues → il prend la quatrième');
  c.dit(journal.includes('conteneur'), 'et elle part bien');
}

c.titre('4. un jour sauté se rattrape');
{
  // Le cas qui justifie de ne pas tenir de compteur : GitHub peut ne pas
  // planifier une exécution, et l'entrée manquante ne doit pas être
  // perdue pour toujours.
  const { sortie } = await essai([0, 1, 3, 4].map(i => repere(CAL.posts[i])), false);
  c.dit(/3\. 03-ce-quil-ny-a-pas/.test(sortie), 'il reprend le trou, pas la suite');
}

c.titre('5. à blanc, rien ne part');
{
  const { sortie, journal } = await essai([], true);
  // D'abord qu'il a choisi quelque chose : sans ça, « rien n'est envoyé »
  // serait vrai parce que rien ne s'est produit. C'est le défaut qu'a eu
  // ce harnais lui-même.
  c.dit(/1\. 01-ouverture/.test(sortie), 'il choisit quand même une entrée');
  c.dit(journal.length === 0, 'aucun appel d’écriture (' + journal.length + ')');
  c.dit(/à blanc/.test(sortie), 'et il dit que c’est à blanc');
}

c.titre('6. tout paru : rien à faire, et ça ne rate pas');
{
  const { sortie, journal } = await essai(CAL.posts.map(repere), false);
  c.dit(/Tout le calendrier est publié/.test(sortie), 'il le dit et s’arrête');
  c.dit(journal.length === 0, 'et rien n’est envoyé');
}

c.titre('7. une image injoignable arrête tout avant de publier');
{
  /* Meta répond « media could not be fetched », qui ne dit pas si c'est
     l'URL, le type ou le réseau. On refuse donc avant d'appeler, et
     surtout : **on refuse avant de créer le conteneur**, sinon on laisse
     des conteneurs orphelins sur le compte. */
  const journal = [];
  const s = serveur([], journal);
  await new Promise(r => s.listen(0, r));
  const port = s.address().port;
  const cal = JSON.parse(JSON.stringify(CAL));
  cal.posts.forEach(p => { p.url = 'http://127.0.0.1:' + port + '/introuvable/' + p.image; });
  // Ce chemin-là répond 404 : le faux serveur ne sert d'image que sur HEAD.
  cal.posts.forEach(p => { p.url = 'http://127.0.0.1:1/' + p.image; });   // port mort
  fs.writeFileSync(CHEMIN, JSON.stringify(cal, null, 2));
  const sortie = await new Promise(r => execFile('node', [SCRIPT], {
    env: { ...process.env, IG_USER_ID: '1', IG_ACCESS_TOKEN: 'x',
           IG_API: 'http://127.0.0.1:' + port, IG_ATTENTE: '50', A_BLANC: 'false' },
    encoding: 'utf8', timeout: 30000,
  }, (e, out, err) => r((out || '') + (err || ''))));
  s.close();
  fs.writeFileSync(CHEMIN, JSON.stringify(CAL, null, 2));
  c.dit(!journal.includes('conteneur'), 'aucun conteneur n’est créé');
  c.dit(!journal.includes('commentaire'), 'et rien n’est publié');
}

c.titre('8. le workflow ne peut pas se bloquer tout seul');
{
  /* `toJSON(secrets)` fait refuser la planification par GitHub, avant le
     job, donc sans aucun log. Treize exécutions muettes le 19/09. La
     consigne est dans CLAUDE.md ; ici elle est mesurée. */
  const wf = fs.readFileSync(new URL('../.github/workflows/instagram.yml', import.meta.url).pathname, 'utf8');
  c.dit(wf.length > 400, 'le workflow a été lu (' + wf.length + ' caractères)');

  /* **On enlève les commentaires avant de chercher.** Premier essai :
     rouge — parce que l'en-tête du workflow écrit `toJSON(secrets)` pour
     dire de ne jamais le remettre, et l'assertion tombait sur sa propre
     interdiction. C'est exactement le « shell » cherché dans sa propre
     bulle, du 19/09 : une assertion se vérifie contre ce que le fichier
     fait, pas contre ce qu'il raconte. */
  const vif = wf.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
  console.log('     ' + wf.split('\n').length + ' lignes, dont ' +
              vif.split('\n').length + ' hors commentaire');
  c.dit(vif.split('\n').length > 25, 'il reste du workflow après les commentaires');
  c.dit(!/toJSON\s*\(\s*secrets\s*\)/.test(vif), 'il ne sérialise pas le contexte des secrets');
  c.dit(/concurrency:/.test(wf), 'deux exécutions ne peuvent pas se chevaucher');
  // Le déclenchement à la main est à blanc par défaut : on ne publie pas
  // sur un compte public en cliquant pour voir ce que ça fait.
  c.dit(/a_blanc[\s\S]{0,200}default:\s*true/.test(wf), 'le déclenchement manuel est à blanc par défaut');
}

process.exit(c.fin() ? 1 : 0);
