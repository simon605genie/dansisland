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
 * ── Les Reels, et la mesure qui a décidé de leur hébergement ──────────
 *
 * Mesuré le 11/11 : `raw.githubusercontent.com` sert une image en
 * `image/png` — c'est pourquoi le calendrier d'images passe par là — mais
 * un `.mp4` en **`application/octet-stream` avec `nosniff`**. Ce n'est pas
 * un repli générique, c'est le choix de GitHub pour la vidéo, et c'est ce
 * que le fetcher de Meta refuse. Les Reels sont donc servis par notre
 * domaine, et la section 12 est ce qui le dira le jour où quelqu'un
 * remettra une URL GitHub dans le manifeste.
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

import { file, repere } from '../social/file.mjs';

const CHEMIN = new URL('../social/calendrier.json', import.meta.url).pathname;
const CHEMIN_R = new URL('../social/reels.json', import.meta.url).pathname;
const SCRIPT = new URL('../.github/publier-instagram.mjs', import.meta.url).pathname;
const CAL = JSON.parse(fs.readFileSync(CHEMIN, 'utf8'));
const REE = JSON.parse(fs.readFileSync(CHEMIN_R, 'utf8'));
/* **La file vient de `social/file.mjs`, celle que le publieur lit.** La
   recalculer ici serait un second tri à tenir d'accord avec le premier, et
   un contrôle qui modélise son objet à côté de lui finit par éprouver sa
   propre copie. */
const F = file().posts;
const nomDe = p => p.video || p.image;
const c = compteur();

function serveur(dejaParues, journal, opt = {}) {
  let tours = 0;
  return http.createServer((req, res) => {
    let b = ''; req.on('data', x => b += x);
    req.on('end', () => {
      if (req.method === 'HEAD') {          // le fichier, que l'API va chercher
        /* Le type suit l'extension, comme un vrai serveur. `typeVideo`
           permet de fabriquer le cas GitHub — un mp4 en
           `application/octet-stream` — qui est la raison pour laquelle
           les vidéos ne sont pas hébergées là. */
        const mp4 = /\.mp4(\?|$)/.test(req.url);
        res.setHeader('content-type', mp4 ? (opt.typeVideo || 'video/mp4') : 'image/jpeg');
        res.setHeader('content-length', '123456');
        return res.end();
      }
      res.setHeader('content-type', 'application/json');
      if (req.url.includes('/media_publish')) {
        journal.push('publie:' + JSON.parse(b).creation_id);
        if (opt.refus) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: {
            message: 'The media you are trying to publish is not ready',
            code: 9007, error_subcode: opt.refus } }));
        }
        return res.end('{"id":"POST1"}');
      }
      if (req.url.includes('/comments')) { journal.push('commentaire'); return res.end('{"id":"COM1"}'); }
      if (req.method === 'POST' && req.url.includes('/media')) {
        const corps = JSON.parse(b);
        journal.push('conteneur' + (corps.media_type ? ':' + corps.media_type : ''));
        if (corps.thumb_offset) journal.push('couverture:' + corps.thumb_offset);
        return res.end('{"id":"CONT1"}');
      }
      // Le transcodage d'un Reel : on rend la suite d'états demandée, et on
      // reste sur le dernier. Un vrai conteneur passe par IN_PROGRESS.
      if (req.url.includes('fields=status_code')) {
        const suite = opt.etats || ['IN_PROGRESS', 'FINISHED'];
        const e = suite[Math.min(tours++, suite.length - 1)];
        journal.push('etat:' + e);
        return res.end(JSON.stringify({ status_code: e, status: opt.detail || '' }));
      }
      if (req.url.includes('/media')) {
        return res.end(JSON.stringify({ data: dejaParues.map(x => ({ caption: x })) }));
      }
      res.statusCode = 404; res.end('{}');
    });
  });
}

/* On rend les deux manifestes **au texte près** plutôt qu'en les
   re-sérialisant : une virgule de formatage en moins, et le dépôt porte un
   diff que personne n'a voulu. */
const CAL_TXT = fs.readFileSync(CHEMIN, 'utf8');
const REE_TXT = fs.readFileSync(CHEMIN_R, 'utf8');
const rendreLesFichiers = () => {
  fs.writeFileSync(CHEMIN, CAL_TXT); fs.writeFileSync(CHEMIN_R, REE_TXT);
};

async function essai(dejaParues, aBlanc, opt = {}) {
  const journal = [];
  const s = serveur(dejaParues, journal, opt);
  await new Promise(r => s.listen(0, r));
  const port = s.address().port;

  /* Les fichiers sont servis par le même faux serveur. On n'éprouve pas
     ici que notre hébergeur répond — ça, c'est le réseau — mais que le
     script refuse de publier un fichier injoignable ou mal servi, ce que
     les sections 7 et 12 vérifient à part. */
  const cal = JSON.parse(CAL_TXT);
  cal.posts.forEach(p => { p.url = (opt.urlImage || ('http://127.0.0.1:' + port + '/img/')) + p.image; });
  fs.writeFileSync(CHEMIN, JSON.stringify(cal, null, 2));
  const ree = JSON.parse(REE_TXT);
  ree.posts.forEach(p => { p.url = (opt.urlVideo || ('http://127.0.0.1:' + port + '/v/')) + p.video; });
  fs.writeFileSync(CHEMIN_R, JSON.stringify(ree, null, 2));

  const sortie = await new Promise(r => execFile('node', [SCRIPT], {
    env: { ...process.env, IG_USER_ID: '1', IG_ACCESS_TOKEN: 'x',
           IG_API: 'http://127.0.0.1:' + port, IG_ATTENTE: '20',
           IG_TOURS: String(opt.tours ?? 6),
           A_BLANC: aBlanc ? 'true' : 'false' },
    encoding: 'utf8', timeout: 30000,
  }, (e, out, err) => r((out || '') + (err || ''))));

  s.close();
  rendreLesFichiers();
  return { sortie, journal };
}

// ──────────────────────────────────────────────────────────────────────
c.titre('1. la file tient ses promesses');
{
  const reperes = F.map(repere);
  const reels = F.filter(p => p.video);
  console.log('     ' + F.length + ' publications dont ' + reels.length + ' Reels · ' +
              Math.max(...F.map(p => p.legende.length)) + ' caractères au plus long');
  c.dit(F.length >= 30, 'la file a été lue (' + F.length + ')');
  c.dit(reels.length >= 5, 'les Reels y sont (' + reels.length + ')');
  /* **Le repère doit être unique**, et c'est l'invariant dont tout le
     reste dépend : deux légendes qui commencent pareil, et la seconde
     est prise pour déjà parue, donc sautée pour toujours, sans erreur.
     Il porte maintenant sur la file entière, images **et** Reels. */
  c.dit(new Set(reperes).size === reperes.length,
        'chaque publication a un repère distinct (' + new Set(reperes).size + ')');
  // 2200 est la limite d'Instagram ; au-delà la légende est coupée.
  c.dit(F.every(p => p.legende.length <= 2200), 'aucune légende ne dépasse 2200 caractères');
  c.dit(F.every(p => p.hashtags.split(/\s+/).length <= 30), 'au plus 30 hashtags');
  // Un `ordre` en double rendrait le tri instable : la file changerait
  // d'un jour à l'autre sans que rien ne bouge dans les manifestes.
  const ordres = F.map(p => p.ordre);
  c.dit(new Set(ordres).size === ordres.length, 'aucun ordre en double (' + ordres.length + ')');

  // Les fichiers existent : un manifeste qui nomme une image ou une vidéo
  // absente ferait échouer la publication un mois plus tard, un matin.
  const manquants = F.filter(p => !fs.existsSync(new URL(
    (p.video ? '../social/reel/' : '../social/images/') + nomDe(p), import.meta.url).pathname));
  if (manquants.length) console.log('     manquants : ' + manquants.map(nomDe).join(', '));
  c.dit(manquants.length === 0, 'les ' + F.length + ' fichiers nommés existent');
  c.dit(F.every(p => p.url.endsWith(nomDe(p))), 'chaque URL publique pointe sur son fichier');

  /* La couverture d'un Reel doit tomber **dans** la vidéo : Meta refuse un
     `thumb_offset` au-delà de la fin, et c'est le genre de chose qu'on
     découvre un matin sur un compte public. Et jamais zéro — la première
     image est prise pendant le fondu de l'accroche. */
  c.dit(reels.every(p => p.couverture_ms > 0 && p.couverture_ms < p.ms),
        'chaque couverture tombe dans sa vidéo (' +
        reels.map(p => p.couverture_ms + '/' + p.ms).join(' ') + ')');

  /* **Les vidéos ne sont pas servies par GitHub**, et c'est une mesure et
     pas une préférence : raw.githubusercontent rend un .mp4 en
     `application/octet-stream` avec `nosniff`. */
  c.dit(reels.every(p => !/githubusercontent/.test(p.url)),
        'aucune vidéo n’est servie depuis GitHub');
}

c.titre('2. un compte vide : on publie la première de la file');
{
  const { sortie, journal } = await essai([], false);
  c.dit(sortie.includes(nomDe(F[0])), 'il choisit la première entrée (' + nomDe(F[0]) + ')');
  c.dit(journal.join(',') === 'conteneur,publie:CONT1,commentaire',
        'conteneur → publication → hashtags en commentaire (' + (journal.join(' · ') || 'rien') + ')');
}

c.titre('3. il saute ce qui est déjà paru');
{
  const { sortie, journal } = await essai(F.slice(0, 3).map(repere), false);
  c.dit(sortie.includes(nomDe(F[3])), 'trois parues → il prend la quatrième (' + nomDe(F[3]) + ')');
  c.dit(journal.some(x => x.startsWith('conteneur')), 'et elle part bien');
}

c.titre('4. un jour sauté se rattrape');
{
  // Le cas qui justifie de ne pas tenir de compteur : GitHub peut ne pas
  // planifier une exécution, et l'entrée manquante ne doit pas être
  // perdue pour toujours.
  const { sortie } = await essai([0, 1, 3, 4].map(i => repere(F[i])), false);
  c.dit(sortie.includes(nomDe(F[2])), 'il reprend le trou, pas la suite (' + nomDe(F[2]) + ')');
}

c.titre('5. à blanc, rien ne part');
{
  const { sortie, journal } = await essai([], true);
  // D'abord qu'il a choisi quelque chose : sans ça, « rien n'est envoyé »
  // serait vrai parce que rien ne s'est produit. C'est le défaut qu'a eu
  // ce harnais lui-même.
  c.dit(sortie.includes(nomDe(F[0])), 'il choisit quand même une entrée');
  c.dit(journal.length === 0, 'aucun appel d’écriture (' + journal.length + ')');
  c.dit(/à blanc/.test(sortie), 'et il dit que c’est à blanc');
}

c.titre('6. tout paru : rien à faire, et ça ne rate pas');
{
  const { sortie, journal } = await essai(F.map(repere), false);
  c.dit(/Tout le calendrier est publié/.test(sortie), 'il le dit et s’arrête');
  c.dit(journal.length === 0, 'et rien n’est envoyé');
}

c.titre('7. une image injoignable arrête tout avant de publier');
{
  /* Meta répond « media could not be fetched », qui ne dit pas si c'est
     l'URL, le type ou le réseau. On refuse donc avant d'appeler, et
     surtout : **on refuse avant de créer le conteneur**, sinon on laisse
     des conteneurs orphelins sur le compte. */
  const { journal } = await essai([], false, { urlImage: 'http://127.0.0.1:1/' });
  c.dit(!journal.some(x => x.startsWith('conteneur')), 'aucun conteneur n’est créé');
  c.dit(!journal.includes('commentaire'), 'et rien n’est publié');
}

// ────────────────────────────────── les Reels ────────────────────────────
const PREM_REEL = F.findIndex(p => p.video);
const avantLeReel = () => F.slice(0, PREM_REEL).map(repere);

c.titre('9. un Reel passe par le chemin vidéo, pas par celui des images');
{
  c.dit(PREM_REEL > 0, 'il y a bien un Reel dans la file, en ' + (PREM_REEL + 1) + 'e position');
  const r = F[PREM_REEL];
  const { sortie, journal } = await essai(avantLeReel(), false);
  c.dit(sortie.includes(nomDe(r)), 'il choisit le Reel (' + nomDe(r) + ')');
  /* `media_type: REELS` est ce qui distingue les deux chemins. Sans lui,
     Meta crée un conteneur d'image à partir d'une vidéo et échoue plus
     tard, avec un message qui ne dit pas pourquoi. */
  c.dit(journal.includes('conteneur:REELS'), 'le conteneur est déclaré REELS (' +
        journal.filter(x => x.startsWith('conteneur')).join(',') + ')');
  c.dit(journal.includes('couverture:' + r.couverture_ms),
        'et il porte sa couverture (' + r.couverture_ms + ' ms)');
  /* **On attend `FINISHED` au lieu de dormir.** Meta transcode, et publier
     avant la fin rend une erreur qui ne dit pas qu'il fallait attendre. */
  c.dit(journal.some(x => x === 'etat:IN_PROGRESS'), 'il voit le transcodage en cours');
  /* **Les deux repères doivent exister avant d'être comparés.** Premier
     jet : `indexOf(...) < indexOf(...)`, et avec le transcodage débranché
     ça donnait `-1 < 1`, donc vert. C'est le repère absent qui absout au
     lieu de faire échouer — nommé le 20/09 pour le rayon Bâtiments, et
     retrouvé ici dans mon propre contrôle, par la panne posée exprès. */
  const iPret = journal.indexOf('etat:FINISHED'), iPub = journal.indexOf('publie:CONT1');
  c.dit(iPret >= 0 && iPub >= 0 && iPret < iPub,
        'et il ne publie qu’une fois la vidéo prête (prêt ' + iPret + ', publié ' + iPub + ')');
}

c.titre('10. une vidéo qui n’arrive jamais à FINISHED ne publie rien');
{
  const { sortie, journal } = await essai(avantLeReel(), false,
    { etats: ['IN_PROGRESS'], tours: 3 });
  c.dit(journal.some(x => x.startsWith('conteneur')), 'le conteneur est bien créé');
  c.dit(!journal.some(x => x.startsWith('publie')), 'mais rien n’est publié');
  c.dit(/toujours pas prête/.test(sortie), 'et il dit pourquoi il s’arrête');
}

c.titre('11. un ERROR de Meta arrête tout de suite, sans épuiser les tours');
{
  const { sortie, journal } = await essai(avantLeReel(), false,
    { etats: ['IN_PROGRESS', 'ERROR'], detail: 'Video format not supported', tours: 20 });
  c.dit(!journal.some(x => x.startsWith('publie')), 'rien n’est publié');
  /* Attendre encore cinq minutes ne changerait pas un format refusé, et un
     contrôle qui met cinq minutes à dire non finit par ne plus être lu. */
  c.dit(journal.filter(x => x.startsWith('etat:')).length <= 3,
        'il n’insiste pas (' + journal.filter(x => x.startsWith('etat:')).length + ' relevés)');
  c.dit(/Video format not supported/.test(sortie), 'et il rapporte la raison de Meta telle quelle');
}

c.titre('12. une vidéo mal servie est refusée avant le conteneur');
{
  /* **C'est la mesure qui a décidé de l'hébergement.** GitHub sert un .mp4
     en `application/octet-stream` avec `nosniff` — relevé le 11/11 — et le
     fetcher de Meta le refuse. Ce contrôle fabrique exactement ce cas :
     le fichier répond 200, il est simplement servi avec le mauvais type. */
  const { sortie, journal } = await essai(avantLeReel(), false,
    { typeVideo: 'application/octet-stream' });
  c.dit(!journal.some(x => x.startsWith('conteneur')), 'aucun conteneur n’est créé');
  c.dit(/application\/octet-stream/.test(sortie) && /video\//.test(sortie),
        'et il dit ce qu’il a reçu et ce qu’il attendait');
}

c.titre('13. le refus 2207089 ne déclenche aucune nouvelle tentative');
{
  /* Il tombe **après** un conteneur prêt et n'a pas de correctif
     documenté. Réessayer à l'aveugle sur un compte public, c'est risquer
     de publier trois fois la même vidéo — et ce publieur existe
     précisément pour que ça n'arrive pas. */
  const { sortie, journal } = await essai(avantLeReel(), false, { refus: 2207089 });
  const essais = journal.filter(x => x.startsWith('publie')).length;
  c.dit(essais === 1, 'une seule tentative de publication (' + essais + ')');
  c.dit(/2207089/.test(sortie), 'il nomme le sous-code');
  c.dit(/on ne réessaie pas/.test(sortie), 'et il dit explicitement qu’il n’insiste pas');
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
