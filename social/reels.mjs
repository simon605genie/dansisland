/* ============================================================
   Les sept Reels, et ce qu'ils disent.

       node social/reels.mjs          relit et affiche
       node social/reels.mjs --ecrire réécrit social/reels.json

   Comme `calendrier.mjs`, la liste des légendes est **ici**, et le JSON
   que lit le publieur est **engendré** : la durée, le poids et l'URL se
   mesurent sur le vrai fichier. Écrire le JSON à la main, c'est laisser
   une URL pointer un film qu'on a renommé — le piège des deux listes que
   ce dépôt refuse partout.

   `ordre` entrelace les Reels dans le calendrier d'images : les images
   portent `n*10` (10 à 310), les Reels tombent entre elles. Le premier
   Reel part donc en deuxième position, parce que c'est le meilleur de ce
   qu'on a et qu'un compte neuf se juge sur ses premiers jours.
   ============================================================ */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://dansisland.app/reels/';

/* La couverture est à 900 ms, jamais à zéro : la première image est prise
   au tout début du fondu de l'accroche, et une vignette de Reel qui ne
   porte pas sa phrase ne donne aucune raison de cliquer. */
const COUVERTURE_MS = 900;

export const REELS = [
  { n: 1, ordre: 15, nom: 'reel-ile',
    legende: `Voilà ce qu’on fait sur Dan’s Island : on pose, on marche, on rentre chez soi.

Pas de score, pas de minuteur, pas de partie perdue. Ce n’est pas une fonctionnalité qui manque — c’est la décision de départ.

dansisland.app — gratuit, dans le navigateur, rien à installer.`,
    hashtags: '#cosygame #jeurelaxant #wholesomegames #isometricart #jeuxpourenfants #jeuenfrancais #sansecranviolent #jeugratuit #indiegame #pixelart' },

  { n: 2, ordre: 55, nom: 'reel-maree',
    legende: `Deux fois par jour, la mer se retire pour de vrai.

Le cycle fait 12 h 25 comme la vraie marée — pas 24 h. Il se décale donc de cinquante minutes chaque jour, et l’enfant qui joue toujours après l’école finit par voir l’autre moitié du jeu.

Sur le sable mouillé, la mer laisse des choses à ramasser.

dansisland.app`,
    hashtags: '#cosygame #jeurelaxant #maree #wholesomegames #jeuxpourenfants #jeuenfrancais #apprendreenjouant #jeugratuit #indiegame #isometricart' },

  { n: 3, ordre: 95, nom: 'reel-nuit',
    legende: `La nuit, ton phare balaie la mer.

Un bouton, et le ciel change. Les lucioles sortent, les constellations s’allument — la Casserole et le Voilier, les deux qu’on sait retrouver.

Rien de tout ça ne rapporte quoi que ce soit. C’est là pour être regardé.

dansisland.app`,
    hashtags: '#cosygame #jeurelaxant #nuit #wholesomegames #ambiance #jeuxpourenfants #jeuenfrancais #jeugratuit #indiegame #pixelart' },

  { n: 4, ordre: 135, nom: 'reel-pluie',
    legende: `Il pleut sur l’île. Il n’y a rien à faire.

Et c’est le but : la pluie n’est pas une punition, c’est une chose qu’on regarde depuis sa fenêtre. Quand elle s’arrête, il arrive qu’un arc-en-ciel se lève — pas à tous les coups, sinon on ne le remarquerait plus.

dansisland.app`,
    hashtags: '#cosygame #jeurelaxant #pluie #arcenciel #wholesomegames #jeuxpourenfants #jeuenfrancais #jeugratuit #indiegame #slowgaming' },

  { n: 5, ordre: 175, nom: 'reel-village',
    legende: `Ton village finit par avoir des habitants.

Une école, une ferme, un restaurant — et des gens qui se rendent visite entre eux. Ils te font signe au passage et te disent où ils vont.

Ils ne bloquent rien, ils ne demandent rien, on ne peut pas les rater.

dansisland.app`,
    hashtags: '#cosygame #jeurelaxant #village #wholesomegames #citybuilder #jeuxpourenfants #jeuenfrancais #jeugratuit #indiegame #isometricart' },

  { n: 6, ordre: 215, nom: 'reel-chien',
    legende: `Il y a un chien, et il faut le sortir.

Il part devant, il s’arrête en route, et si tu traînes il s’assied et il t’attend. Il ne gronde jamais, il n’y a pas de minuteur, rien ne se perd.

C’est à peu près tout ce que ce jeu demande de quelqu’un.

dansisland.app`,
    hashtags: '#cosygame #jeurelaxant #chien #wholesomegames #jeuxpourenfants #jeuenfrancais #jeugratuit #indiegame #slowgaming #pixelart' },

  { n: 7, ordre: 255, nom: 'reel-voisins',
    legende: `Le seul moyen d’agrandir son île, c’est que quelqu’un passe.

Pas le temps qui passe, pas une corvée répétée : un ami qui vient marcher chez toi et qui te laisse un mot. Chaque personne distincte allume une lanterne sur ton rivage.

C’est la seule règle d’économie du jeu, et tout le reste en découle.

dansisland.app`,
    hashtags: '#cosygame #jeurelaxant #wholesomegames #entreamis #jeuxpourenfants #jeuenfrancais #jeugratuit #indiegame #isometricart #slowgaming' },
];

/* La durée se **mesure** sur le fichier : une couverture posée après la fin
   est refusée par Meta, et c'est le genre de chose qu'on découvre un matin
   sur un compte public. */
function duree(f) {
  try {
    return Math.round(parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
      'format=duration', '-of', 'default=nw=1:nk=1', f], { encoding: 'utf8' }).trim()) * 1000);
  } catch { return null; }
}

export function construire() {
  return {
    parJour: 1,
    posts: REELS.map(r => {
      const f = path.join(ICI, 'reel', r.nom + '.mp4');
      if (!fs.existsSync(f)) throw new Error('vidéo absente : ' + f + ' — lancer social/reel/reels.mjs');
      return {
        ...r,
        video: r.nom + '.mp4',
        url: SITE + r.nom + '.mp4',
        octets: fs.statSync(f).size,
        ms: duree(f),
        couverture_ms: COUVERTURE_MS,
      };
    }),
  };
}

const d = construire();
if (process.argv.includes('--ecrire')) {
  fs.writeFileSync(path.join(ICI, 'reels.json'), JSON.stringify(d, null, 2) + '\n');
  console.log('social/reels.json écrit · ' + d.posts.length + ' Reels');
}
for (const p of d.posts)
  console.log(`  ${String(p.ordre).padStart(3)}  ${p.video.padEnd(18)} ` +
              `${(p.ms / 1000).toFixed(1)}s  ${Math.round(p.octets / 1024)} ko  ` +
              `${p.legende.split('\n')[0].slice(0, 46)}`);
