/* Publie une entrée du calendrier sur Instagram.
 *
 *   node publier-instagram.mjs           publie (ou rend compte, à blanc)
 *   node publier-instagram.mjs --jeton   dit combien de jours il reste
 *
 * ── Comment il choisit quoi publier ──────────────────────────────────
 *
 * **Il ne tient aucun compteur.** Il lit les dernières publications du
 * compte, en tire les repères qu'elles portent, et publie la plus
 * ancienne entrée du calendrier qui n'y est pas.
 *
 * Un compteur dans un fichier demanderait de le réécrire après chaque
 * publication, donc un commit depuis le workflow, donc une course entre
 * deux exécutions — et il mentirait dès qu'une publication échoue à
 * mi-chemin. Demander à Instagram, c'est lire l'état réel plutôt qu'un
 * souvenir de cet état. C'est la règle que ce dépôt tient en SQL pour
 * `visites` et `parrainages`, et la leçon écrite le 20/09 : une mesure
 * qui ne vérifie pas qu'elle regarde la bonne chose passe au vert sans
 * rien voir.
 *
 * Le repère est la **première ligne de la légende**, qui est unique dans
 * le calendrier — vérifié ici même avant de publier quoi que ce soit.
 * Pas un identifiant caché : ce qui se lit dans la publication est ce
 * qui sert à la reconnaître, donc on peut vérifier à l'œil ce que le
 * programme a conclu.
 *
 * ── Ce qu'il ne fait pas ─────────────────────────────────────────────
 *
 * Il ne répond à personne. Les commentaires et les messages restent à
 * quelqu'un — et la règle du plan tient : jamais de réponse à un enfant
 * qui ne soit publique et anodine.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { file, repere } from '../social/file.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
/* La file — images et Reels dans un seul ordre — vit dans `social/file.mjs`
   parce que le harnais la lit aussi. Deux tris écrits de part et d'autre,
   et le contrôle éprouverait sa propre copie. */
const { posts: FILE, parJour: PAR_JOUR } = file();

const ID = process.env.IG_USER_ID;
const JETON = process.env.IG_ACCESS_TOKEN;
const A_BLANC = process.env.A_BLANC === 'true';
/* `IG_API` existe pour le harnais, et pour lui seul : il pointe l'API sur
   un faux serveur local. Sans ça, la seule façon d'éprouver « qu'est-ce
   qui est déjà paru » serait de publier pour de vrai sur un compte
   public — donc de ne jamais l'éprouver. Un workflow qui ne s'essaie
   qu'en production n'est pas essayé. */
const API = process.env.IG_API || 'https://graph.instagram.com/v21.0';

const sortir = (msg, code = 1) => { console.error('\n  ✗ ' + msg); process.exit(code); };

async function graph(chemin, options = {}) {
  const r = await fetch(API + chemin, options);
  const txt = await r.text();
  let json; try { json = JSON.parse(txt); } catch { json = { brut: txt }; }
  if (!r.ok) {
    // Le message de Meta arrive en anglais et dit souvent la vraie cause
    // (jeton expiré, plafond atteint, image injoignable). On le montre tel
    // quel plutôt que de le traduire à moitié.
    const e = json.error || {};
    const err = new Error(r.status + ' · ' + (e.message || txt.slice(0, 300)) +
                    (e.error_user_msg ? ' — ' + e.error_user_msg : ''));
    // Le sous-code est porté tel quel : c'est lui qui distingue « réessaie »
    // de « n'insiste pas », et le lire dans le texte du message serait une
    // seconde liste à tenir d'accord avec celle de Meta.
    err.meta = e;
    throw err;
  }
  return json;
}

/* ── Le jeton ──────────────────────────────────────────────────────── */
if (process.argv.includes('--jeton')) {
  if (!JETON) process.exit(0);
  try {
    const d = await graph('/refresh_access_token?grant_type=ig_refresh_token' +
                          '&access_token=' + encodeURIComponent(JETON));
    const jours = Math.round((d.expires_in || 0) / 86400);
    console.log('  Le jeton vaut encore ' + jours + ' jour(s).');
    /* Le rafraîchissement **rend un nouveau jeton**, et on ne peut pas
       l'écrire dans les secrets du dépôt depuis ici : ça demanderait un
       jeton GitHub avec droit d'écriture sur les secrets, c'est-à-dire
       un secret plus puissant que celui qu'on protège. On prévient, et
       c'est une personne qui le remplace. */
    if (jours < 12) {
      console.log('::warning::Le jeton Instagram expire dans ' + jours + ' jours. ' +
        'Régénérer dans le panneau « API setup with Instagram login » et remplacer ' +
        'le secret IG_ACCESS_TOKEN. Sans ça le compte s’arrête en silence.');
    }
  } catch (e) {
    console.log('::warning::Le jeton n’a pas pu être vérifié : ' + e.message);
  }
  process.exit(0);
}

if (!ID || !JETON) sortir('IG_USER_ID ou IG_ACCESS_TOKEN manque');

/* ── Le repère doit être unique ────────────────────────────────────────
 *
 * Deux publications qui commenceraient par la même phrase rendraient la
 * détection fausse : la seconde serait prise pour déjà parue et sautée
 * pour toujours, sans erreur. On le vérifie **avant** de publier, pas
 * après — c'est le seul moment où ça se répare gratuitement. */
const vus = new Set();
for (const p of FILE) {
  const r = repere(p);
  if (vus.has(r)) sortir('deux publications commencent par la même phrase : « ' +
    r.slice(0, 60) + ' ». Le repère ne serait plus unique.');
  vus.add(r);
}
console.log('  file : ' + FILE.length + ' publications (' +
            FILE.filter(p => p.video).length + ' Reels), ' +
            vus.size + ' repères distincts');

/* ── Ce qui est déjà en ligne ─────────────────────────────────────────
 *
 * On lit plus de légendes qu'il n'y a de publications au calendrier :
 * un compte qui publie aussi à la main ne doit pas faire sauter un tour.
 * `limit` est plafonné par l'API, donc on pagine. */
async function dejaParues() {
  const vues = [];
  let url = '/' + ID + '/media?fields=caption,timestamp&limit=50&access_token=' +
            encodeURIComponent(JETON);
  for (let page = 0; page < 4 && url; page++) {
    const d = await graph(url);
    for (const m of d.data || []) vues.push((m.caption || '').split('\n')[0].trim());
    const suite = d.paging && d.paging.next;
    if (!suite) break;
    url = suite.replace(API, '');
  }
  return new Set(vues);
}

const parues = await dejaParues();
console.log('  le compte porte ' + parues.size + ' légende(s) distincte(s)');

const reste = FILE.filter(p => !parues.has(repere(p)));
if (!reste.length) {
  console.log('\n  Tout le calendrier est publié. Rien à faire.');
  process.exit(0);
}

// `PAR_JOUR` publications par exécution, dans l'ordre du calendrier.
const aFaire = reste.slice(0, PAR_JOUR);
console.log('  ' + reste.length + ' entrée(s) restante(s) · on publie ' + aFaire.length);

/* ── Une vidéo n'est pas prête quand le conteneur répond ──────────────
 *
 * Pour une image, le conteneur est utilisable tout de suite. Pour un Reel,
 * Meta **transcode**, et publier avant la fin rend une erreur qui ne dit
 * pas qu'il fallait attendre. On demande donc `status_code` jusqu'à
 * `FINISHED`, au lieu de dormir un nombre de secondes choisi au hasard :
 * c'est la différence entre lire l'état réel et lire un souvenir de cet
 * état, la règle que ce dépôt tient partout.
 *
 * Et on s'arrête sur `ERROR` plutôt que d'épuiser les tours : Meta y met
 * la vraie cause (format, durée, URL injoignable), et l'attendre encore
 * cinq minutes ne la changerait pas. */
async function attendrePret(id) {
  const pas = +(process.env.IG_ATTENTE ?? 12000);
  const tours = +(process.env.IG_TOURS ?? 25);
  let vu = '';
  for (let i = 0; i < tours; i++) {
    await new Promise(r => setTimeout(r, pas));
    const d = await graph('/' + id + '?fields=status_code,status&access_token=' +
                          encodeURIComponent(JETON));
    if (d.status_code !== vu) { vu = d.status_code; console.log('     ' + (vu || '(sans état)')); }
    if (d.status_code === 'FINISHED') return;
    if (d.status_code === 'ERROR')
      sortir('Meta refuse la vidéo : ' + (d.status || 'sans détail') +
             '\n    Rien n’a été publié, et le conteneur ' + id + ' reste inutilisé.');
  }
  sortir('la vidéo n’est toujours pas prête après ' + Math.round(pas * tours / 1000) + ' s' +
         ' (dernier état : ' + (vu || 'aucun') + '). Rien n’a été publié.');
}

for (const p of aFaire) {
  const reel = !!p.video;
  console.log('\n  ── ' + p.n + '. ' + (p.video || p.image) +
              ' (' + (reel ? 'reel' : p.maquette) + ')');
  console.log('     ' + repere(p).slice(0, 78));

  /* Le fichier doit être **joignable publiquement** : l'API va le chercher
     elle-même, elle n'accepte pas d'octets. On le vérifie ici plutôt que
     de laisser Meta répondre « media could not be fetched », qui ne dit
     pas si c'est l'URL, le type ou le réseau.

     **Le type compte autant que le code 200**, et c'est une mesure et pas
     une précaution : GitHub sert un .mp4 en `application/octet-stream`
     avec `nosniff`, relevé le 11/11. C'est pour ça que les vidéos sont
     servies par notre propre domaine, et ce contrôle est ce qui le dira
     le jour où quelqu'un remettra une URL GitHub dans le manifeste. */
  const attendu = reel ? 'video/' : 'image/';
  const tete = await fetch(p.url, { method: 'HEAD' });
  const type = tete.headers.get('content-type') || '';
  if (!tete.ok || !type.startsWith(attendu)) {
    sortir((reel ? 'la vidéo' : 'l’image') + ' n’est pas servie comme il faut : ' +
           p.url + ' → ' + tete.status + ' ' + (type || '(sans type)') +
           '\n    Attendu : ' + attendu + '*');
  }
  console.log('     ' + (reel ? 'vidéo' : 'image') + ' ' + tete.status + ' · ' + type + ' · ' +
              Math.round((+tete.headers.get('content-length') || 0) / 1024) + ' ko');

  if (A_BLANC) { console.log('     à blanc : rien n’est publié'); continue; }

  // Deux temps, comme l'API l'impose : on crée un conteneur, puis on le
  // publie. Entre les deux, une image attend, une vidéo se transcode.
  const corps = reel
    ? { media_type: 'REELS', video_url: p.url, caption: p.legende,
        /* La couverture n'est pas la première image : à t=0 le fondu de
           l'accroche n'a pas fini, et une vignette sans sa phrase ne donne
           aucune raison de cliquer. */
        thumb_offset: String(p.couverture_ms ?? 900), access_token: JETON }
    : { image_url: p.url, caption: p.legende, access_token: JETON };

  const conteneur = await graph('/' + ID + '/media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corps),
  });
  console.log('     conteneur ' + conteneur.id);

  if (reel) await attendrePret(conteneur.id);
  // Pour une image, le délai suffit. Réglable pour le harnais, qui n'a pas
  // de raison d'attendre douze secondes trente fois — un contrôle lent
  // finit par ne plus être lancé.
  else await new Promise(r => setTimeout(r, +(process.env.IG_ATTENTE ?? 12000)));

  let publie;
  try {
    publie = await graph('/' + ID + '/media_publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creation_id: conteneur.id, access_token: JETON }),
    });
  } catch (e) {
    /* `2207089` tombe **après** un conteneur `FINISHED`, et il n'a pas de
       correctif documenté. On rapporte et on s'arrête : réessayer à
       l'aveugle sur un compte public, c'est risquer de publier trois fois
       la même vidéo — et le publieur existe précisément pour que ça
       n'arrive pas. Une personne décide de la suite. */
    if (String(e.meta?.error_subcode) === '2207089')
      sortir('Meta a rendu error_subcode=2207089 après un conteneur prêt (' + conteneur.id + ').' +
             '\n    C’est un refus connu, sans correctif documenté, et on ne réessaie pas :' +
             '\n    une nouvelle tentative republierait peut-être la même vidéo.' +
             '\n    Message : ' + e.message);
    throw e;
  }
  console.log('     publié ' + publie.id);

  /* Les hashtags en **premier commentaire**, pas dans la légende : ça
     garde la légende lisible. Un commentaire qui échoue ne doit pas
     faire échouer la publication — elle, elle est déjà en ligne, et une
     exécution rouge ferait croire qu'elle ne l'est pas. */
  try {
    await graph('/' + publie.id + '/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: p.hashtags, access_token: JETON }),
    });
    console.log('     hashtags en commentaire');
  } catch (e) {
    console.log('::warning::Publication en ligne, mais le commentaire des hashtags a échoué : ' + e.message);
  }
}

console.log('\n  ✓ fait' + (A_BLANC ? ' (à blanc)' : ''));
