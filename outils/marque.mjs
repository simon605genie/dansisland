/* ============================================================
   Régénérer ce qui se déduit du logo : les quatre icônes et l'image de
   partage.

       node outils/marque.mjs            les deux
       node outils/marque.mjs icones
       node outils/marque.mjs og

   **Pourquoi un outil plutôt qu'une consigne.** CLAUDE.md écrit depuis le
   17/09 que « les icônes se régénèrent, elles ne se dessinent pas à la
   main ». C'était vrai et personne ne pouvait le faire : il n'y avait pas
   d'outil, donc la consigne attendait quelqu'un de très consciencieux. Le
   20/09, le logo a changé et les icônes ne l'ont pas suivi — jusqu'à ce
   fichier.

   Il ne part de rien qu'il invente : le carré vient de `index.html`, l'île
   vient de `vignette()` dans `functions/_commun.js`. Si l'un des deux
   change, les images changent avec lui.

   `build.sh` ne copie pas ce dossier : il copie une liste explicite, et
   ceci n'est pas un fichier du site.

   Ce que ça ne fait pas : juger le résultat. **Regarde les images.** Le
   choix du logo du 20/09 s'est fait sur un rendu à trois tailles, et deux
   candidates sur quatre avaient une bande d'eau qui sortait du coin
   arrondi — ce qui ne se voit pas dans le balisage.
   ============================================================ */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = f => readFileSync(path.join(RACINE, f), 'utf8');

// Le dessin du logo, tel qu'il est dans la page. Pas une copie : la source.
const src = lire('index.html');
const m = src.match(/<svg class="mark" viewBox="0 0 64 64"[^>]*>([\s\S]*?)<\/svg>/);
if (!m) { console.error('logo introuvable dans index.html'); process.exit(1); }
const LOGO = m[1];

async function ouvrir() {
  try { return await chromium.launch(); }
  catch (e) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (base) {
      const { readdirSync, existsSync } = await import('fs');
      for (const d of readdirSync(base).sort().reverse()) {
        const p = path.join(base, d, 'chrome-linux', 'chrome');
        if (existsSync(p)) return chromium.launch({ executablePath: p });
      }
    }
    throw e;
  }
}

/* ---- les icônes ---- */
async function icones(nav) {
  const rendre = async (taille, masque, sortie) => {
    const pg = await nav.newPage({ viewport: { width: taille, height: taille } });
    /* La maskable recule à 80 % sur un aplat d'océan. Android découpe
       jusqu'à 20 % de chaque bord, et découper un cercle dans un carré
       **arrondi** laisse quatre encoches à la place des coins. */
    const svg = masque
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${taille}" height="${taille}">
           <rect width="64" height="64" fill="#0D2630"/>
           <g transform="translate(6.4 6.4) scale(0.8)">${LOGO}</g></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${taille}" height="${taille}">${LOGO}</svg>`;
    await pg.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    await pg.waitForTimeout(150);
    writeFileSync(path.join(RACINE, sortie), await pg.screenshot({ omitBackground: true }));
    console.log('  ' + sortie.padEnd(22) + taille + 'x' + taille);
    await pg.close();
  };
  await rendre(192, false, 'icone-192.png');
  await rendre(512, false, 'icone-512.png');
  await rendre(512, true, 'icone-maskable.png');
  await rendre(180, false, 'apple-touch-icon.png');
  console.log('  (test/design.mjs, section 4, compare ces PNG au SVG de la source)');
}

/* ---- l'image de partage ---- */
const POLICES = [
  ['Baloo 2', 'Baloo+2:wght@800', 800],
  ['Nunito', 'Nunito:wght@700', 700],
];

/* Les polices sont **incorporées** dans la page, pas chargées par elle.
   Un premier essai les demandait à Google Fonts depuis le navigateur
   piloté : il ne les a pas eues, et l'image est partie avec la pile
   système sans un mot dans la console. Une image cuite une fois pour
   toutes ne doit pas dépendre de ce qui répond ce jour-là. */
async function fonte([nom, requete, poids]) {
  const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + requete + '&display=swap',
                                 { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  const url = (css.match(/https:\/\/[^)]*\.ttf/) || [])[0];
  if (!url) throw new Error('pas de .ttf pour ' + nom);
  const b64 = Buffer.from(await (await fetch(url)).arrayBuffer()).toString('base64');
  return `@font-face{font-family:'${nom}';font-weight:${poids};font-style:normal;` +
         `src:url(data:font/ttf;base64,${b64}) format('truetype')}`;
}

async function og(nav) {
  const { vignette } = await import(path.join(RACINE, 'functions/_commun.js'));
  // L'île de la carte porte les couleurs de la **planche**, pas celles d'un
  // joueur : c'est l'image du jeu, pas celle d'une île.
  const ile = vignette({ water: '#72D6D0', sand: '#F4D7A1', grass: '#5FAF78' });

  let faces;
  try { faces = (await Promise.all(POLICES.map(fonte))).join('\n'); }
  catch (e) {
    console.error('  polices injoignables (' + e.message + ') — image non écrite.');
    console.error('  Une og.png dans la mauvaise fonte ne se rattrape pas : elle est cuite.');
    return false;
  }

  const pg = await nav.newPage({ viewport: { width: 1200, height: 630 } });
  await pg.setContent(`<!doctype html><meta charset="utf-8"><style>
 ${faces}
 *{box-sizing:border-box;margin:0}
 body{width:1200px;height:630px;overflow:hidden;font-family:Nunito,system-ui,sans-serif;
   color:#FFF8E8;background:linear-gradient(155deg,#184D5B 0%,#0D2630 68%);
   display:grid;grid-template-columns:1fr 520px;align-items:center;padding:0 0 0 72px;position:relative}
 .soleil{position:absolute;top:-120px;right:330px;width:420px;height:420px;border-radius:50%;
   background:radial-gradient(circle,rgba(255,143,112,.55) 0%,rgba(255,143,112,.20) 46%,rgba(255,143,112,0) 72%)}
 .g{position:relative;z-index:2}
 .marque{display:flex;align-items:center;gap:18px;margin-bottom:30px}
 .marque svg{width:74px;height:74px;border-radius:17px;display:block}
 .marque b{font-family:"Baloo 2",sans-serif;font-size:40px;font-weight:800;letter-spacing:.012em}
 h1{font-family:"Baloo 2",sans-serif;font-size:82px;font-weight:800;line-height:1.02;letter-spacing:-.015em}
 .sous{font-size:29px;font-weight:700;color:#72D6D0;margin-top:14px}
 .pied{margin-top:34px;font-size:19px;font-weight:700;letter-spacing:.12em;
   text-transform:uppercase;color:#9CC0C7}
 .ile{position:relative;z-index:2;width:520px;padding-right:44px}
 .ile svg{width:100%;height:auto;filter:drop-shadow(0 28px 44px rgba(0,0,0,.45))}
 .vague{position:absolute;left:0;right:0;bottom:0;width:100%;height:56px;z-index:1}
</style>
<span class="soleil"></span>
<div class="g">
  <div class="marque"><svg viewBox="0 0 64 64">${LOGO}</svg><b>DAN’S ISLAND</b></div>
  <h1>Ton île.<br>Ton rythme.</h1>
  <p class="sous">Construis, regarde vivre, partage.</p>
  <p class="pied">Gratuit · Sans installation · Pas de score</p>
</div>
<div class="ile">${ile}</div>
<svg class="vague" viewBox="0 0 1200 56" preserveAspectRatio="none">
  <path d="M0 30c100-22 200 18 300 6s200-26 300-10 200 24 300 10 200-18 300-6V56H0z" fill="#FFF8E8" opacity=".10"/>
  <path d="M0 40c110-14 220 14 330 4s220-16 330-4 210 16 320 6 220-10 220-10V56H0z" fill="#72D6D0" opacity=".26"/>
</svg>`, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(300);
  // On **vérifie** la fonte plutôt que d'espérer : c'est le seul défaut de
  // cette image qui ne se voit pas tant qu'on ne compare pas.
  if (!await pg.evaluate(() => document.fonts.check('800 82px "Baloo 2"'))) {
    console.error('  Baloo 2 n’a pas été prise — image non écrite.');
    await pg.close(); return false;
  }
  writeFileSync(path.join(RACINE, 'og.png'), await pg.screenshot());
  console.log('  og.png                1200x630');
  console.log('  ⚠ pense à passer `og.png?v=N` au numéro suivant dans index.html');
  console.log('    et functions/_commun.js : sans ça WhatsApp sert l’ancienne pendant des jours.');
  await pg.close();
  return true;
}

const quoi = process.argv[2] || 'tout';
const nav = await ouvrir();
if (quoi === 'tout' || quoi === 'icones') { console.log('— les icônes —'); await icones(nav); }
if (quoi === 'tout' || quoi === 'og') { console.log('— l’image de partage —'); await og(nav); }
await nav.close();
