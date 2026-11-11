/* La file de publication : les images du calendrier et les Reels, dans un
   seul ordre.

   Elle vit ici et pas dans le publieur parce que **le harnais en a besoin
   aussi**. Recalculer le tri dans le contrôle, ce serait deux listes à
   tenir d'accord — et un contrôle qui modélise son objet à côté de lui
   finit par éprouver sa propre copie. C'est ce que ce dépôt refuse
   partout : `textesDeTable()` vit dans `index.html`, pas dans
   `test/langues.mjs`.

   `ordre` est le seul rang. Les images qui n'en déclarent pas portent
   `n*10`, ce qui laisse neuf places libres entre deux — assez pour
   entrelacer sans renuméroter quoi que ce soit le jour où on en ajoute. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const lire = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { posts: [] };

/* Le repère d'une publication est la **première ligne de sa légende**.
   Pas un identifiant caché : ce qui se lit dans la publication est ce qui
   sert à la reconnaître, donc on peut vérifier à l'œil ce que le programme
   a conclu. Son unicité est l'invariant dont tout le reste dépend. */
export const repere = p => p.legende.split('\n')[0].trim();

export function file() {
  const cal = lire(path.join(ICI, 'calendrier.json'));
  const reels = lire(path.join(ICI, 'reels.json'));
  return {
    parJour: cal.parJour || 1,
    posts: [...cal.posts.map(p => ({ ...p, ordre: p.ordre ?? p.n * 10 })), ...reels.posts]
      .sort((a, b) => a.ordre - b.ordre),
  };
}
