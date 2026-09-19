/* Les cinq épreuves, l'une après l'autre.

   En série et non en parallèle : chacune ouvre un navigateur, et quatre
   Chromium à la fois sur une machine ordinaire donnent des délais qui
   dépassent — donc des échecs qui ne disent rien du jeu.

   Le code de sortie est celui qu'attend une CI : 0 si tout passe. */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const EPREUVES = ['balises.mjs', 'etroit.mjs', 'parrainage.mjs', 'lien.mjs', 'objets.mjs'];

const lancer = f => new Promise(r => {
  console.log('\n\n══════════════ ' + f + ' ══════════════');
  spawn(process.execPath, [path.join(ICI, f)], { stdio: 'inherit' }).on('close', r);
});

let ratees = [];
for (const f of EPREUVES) if (await lancer(f)) ratees.push(f);

console.log('\n\n══════════════ bilan ══════════════');
if (ratees.length) { console.log('❌ en échec : ' + ratees.join(', ')); process.exit(1); }
console.log('✅ les ' + EPREUVES.length + ' épreuves passent');
