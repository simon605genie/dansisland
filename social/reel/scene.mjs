/* ============================================================
   La fabrique de Reels — version « vrai jeu ».

   La première version capturait `canvas.toDataURL()`, donc elle excluait
   par construction les panneaux, les plaques et le murmure : une île
   silencieuse, sans un mot de français à l'écran. C'est ce qu'on nous a
   reproché, et c'était juste. On capture maintenant **la page**.

   Trois choses que la panne retire, et chacune a sa raison :
     · `#compte` affiche l'adresse du serveur de test (127.0.0.1:…) —
       impubliable, et ça n'apprend rien au spectateur ;
     · `header.mast` libère la place du bandeau d'accroche ;
     · le cadre grandit (CH 500 → 640) pour occuper la moitié haute.
       `OY` suit de la moitié de l'écart, sinon l'île se décentre.
   ============================================================ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { servir, onglet, navigateur, attendre, remplacer } from '../../test/aide.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const POLICES = fs.readFileSync(path.join(ICI, 'polices/polices-inline.css'), 'utf8');

export const FPS = 24, CH_REEL = 640, OY_REEL = 12 + (CH_REEL - 500) / 2;

const HABILLAGE = `
<style>
${POLICES}
header.mast, #compte { display:none !important }
#bandeau{
  background:#FFF8E8; padding:14px 18px 11px;
  font-family:"Baloo 2",sans-serif; text-align:center;
  box-shadow:0 10px 18px -14px rgba(13,38,48,.5);
}
#bandeau .gros{ font-size:30px; font-weight:800; line-height:1.08; color:#0D2630; letter-spacing:-.01em }
#bandeau .gros em{ font-style:normal; color:#B8431E }
#bandeau .petit{ font-size:15px; font-weight:600; color:#184D5B; margin-top:5px; opacity:.9 }
#fin{
  position:fixed; inset:0; z-index:10000; display:none;
  background:#0D2630; color:#FFF8E8; font-family:"Baloo 2",sans-serif;
  flex-direction:column; align-items:center; justify-content:center; gap:14px; text-align:center;
}
#fin .t{ font-size:38px; font-weight:800; line-height:1.05 }
#fin .u{ font-size:26px; font-weight:800; color:#FF8F70 }
#fin .s{ font-size:16px; font-weight:600; color:#72D6D0; letter-spacing:.14em; text-transform:uppercase }
</style>
<div id="bandeau"><div class="gros"></div><div class="petit"></div></div>
<div id="fin"><div class="t"></div><div class="u">dansisland.app</div><div class="s"></div></div>
<script>
window.__bandeau=(gros,petit,op)=>{const b=document.getElementById('bandeau');
  b.querySelector('.gros').innerHTML=gros||''; b.querySelector('.petit').innerHTML=petit||'';
  b.style.opacity=op==null?1:op;};
window.__fin=(t,s,on)=>{const f=document.getElementById('fin');
  f.querySelector('.t').innerHTML=t||''; f.querySelector('.s').innerHTML=s||'';
  f.style.display=on?'flex':'none';};
</script>`;

export const panneScene = src => {
  let s = remplacer(src, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, HABILLAGE);
  s = remplacer(s, /const CW=768, CH=500;/, `const CW=768, CH=${CH_REEL};`);
  s = remplacer(s, /const GRID=18, TW=56, TH=28, OX=384, OY=12, LIFT=7;/,
                   `const GRID=18, TW=56, TH=28, OX=384, OY=${OY_REEL}, LIFT=7;`);
  s = remplacer(s, /<canvas id="world" width="768" height="500">/,
                   `<canvas id="world" width="768" height="${CH_REEL}">`);
  /* L'horloge devient pilotée. Une capture de page coûte ~150 ms : en
     laissant tourner `rAF`, on échantillonnerait un jeu à 7 images par
     seconde et la lecture serait trois fois trop rapide. Et comme
     `dt = t - last`, piloter `t` pilote aussi tout ce qui s'accumule en
     `dt` — le requin, le voilier, le phare. */
  s = remplacer(s, /\n  requestAnimationFrame\(frame\);\n\}/,
                   '\n  if(!window.__manuel) requestAnimationFrame(frame);\n}');
  s = remplacer(s, /\nrequestAnimationFrame\(frame\);\n/,
                   '\nwindow.__pas=(t)=>frame(t);\nwindow.__objets=()=>mine.objects.length;'
                   +'\nwindow.__murmure=()=>whisper.classList.contains(\'on\')?whisper.textContent:\'\';'
                   /* On demande au jeu quelle case un point d\'écran vise, au lieu
                      de parier sur des fractions du cadre : la caméra suit le
                      bonhomme, donc un point fixe tombe dans l\'eau dès qu\'il a
                      marché — et le Reel affiche alors un refus. */
                   +'\nwindow.__case=(sx,sy)=>{const q=tileFrom({clientX:sx,clientY:sy});'
                   +'const bon=q.x>=0&&q.y>=0&&q.x<GRID&&q.y<GRID&&dansLeRayon(q.x,q.y)'
                   +'&&terre(q.x,q.y)&&!objetEn(mine.objects,q.x,q.y,true);'
                   +'return {x:q.x,y:q.y,ok:!!bon};};'
                   +'\nwindow.__ou=()=>({x:+hero.x.toFixed(2),y:+hero.y.toFixed(2),dedans:!!dedans});'
                   +'\nwindow.__seuil=()=>{const c=porteIle(world.house)[0];return {x:c.x,y:c.y};};'
                   +'\nwindow.__outil=()=>({mode:tool.mode,kind:tool.kind,cible:target?{x:+target.x.toFixed(1),y:+target.y.toFixed(1)}:null,sas:!!sasArme});'
                   +'\nwindow.__laisse=()=>laisse.map(c=>({x:c.x,y:c.y,t:c.t}));'
                   +'\nwindow.__maison=()=>world.house?{x:world.house.x,y:world.house.y}:null;'
                   +'\nwindow.__ciel=()=>world.sky;'
                   +'\nwindow.__arc=()=>arcEnCiel();'
                   +'\nwindow.__chien=()=>balade?{x:balade.x,y:balade.y,attend:!!balade.attend}:null;'
                   +'\nrequestAnimationFrame(frame);\n');
  return s;
};

export const cadreMonde = p => p.evaluate(() => {
  const b = document.querySelector('#world').getBoundingClientRect();
  return { x: b.x, y: b.y, w: b.width, h: b.height };
});

/* Les cases libres visibles, rendues en coordonnées d'écran. On exige d'en
   trouver assez : un repère absent doit faire échouer ce qui s'appuie
   dessus, jamais l'absoudre. */
export async function casesLibres(p, mini = 6) {
  const c = await cadreMonde(p);
  const pts = await p.evaluate(({ x, y, w, h }) => {
    const out = [];
    for (let fy = 0.26; fy <= 0.82; fy += 0.04)
      for (let fx = 0.12; fx <= 0.88; fx += 0.04) {
        const sx = Math.round(x + w * fx), sy = Math.round(y + h * fy);
        if (document.elementFromPoint(sx, sy)?.id !== 'world') continue;
        const q = window.__case(sx, sy);
        if (q.ok) out.push({ sx, sy, tx: q.x, ty: q.y });
      }
    return out;
  }, c);
  const vus = new Set(), uniques = [];
  for (const q of pts) { const k = q.tx + ',' + q.ty; if (!vus.has(k)) { vus.add(k); uniques.push(q); } }
  if (uniques.length < mini)
    throw new Error(`seulement ${uniques.length} case(s) libre(s) visible(s), il en faut ${mini}`);
  return uniques;
}

/* L'écran d'une case donnée. On balaie et on demande au jeu : `pt()` est le
   seul endroit qui défait la transformation de la caméra, et le refaire ici
   serait une seconde projection à tenir d'accord avec la première. */
export async function pointDeCase(p, tx, ty) {
  const c = await cadreMonde(p);
  const q = await p.evaluate(({ x, y, w, h, tx, ty }) => {
    const bons = [];
    for (let fy = 0.08; fy <= 0.94; fy += 0.008)
      for (let fx = 0.04; fx <= 0.96; fx += 0.008) {
        /* **Les coordonnées sont arrondies** : le pilote clique à l'entier le
           plus proche, et un pixel suffit à tomber sur la case voisine — une
           case fait 56 unités de monde pour ~25 pixels d'écran. Mesuré : on
           visait (15,13) et le jeu recevait (14,13). On éprouve donc le point
           exact qui sera cliqué, jamais celui qu'on a calculé.
           Le pad de marche, les boutons ronds et les plaques recouvrent le
           canvas : un clic y tombe sans jamais atteindre le jeu, et sans rien
           dire. D'où `elementFromPoint`. */
        const sx = Math.round(x + w * fx), sy = Math.round(y + h * fy);
        if (document.elementFromPoint(sx, sy)?.id !== 'world') continue;
        const k = window.__case(sx, sy);
        if (k.x === tx && k.y === ty) bons.push({ sx, sy });
      }
    if (!bons.length) return null;
    // Le centre de ce qu'on peut viser, pas son premier pixel : un point au
    // bord du losange est à un arrondi de la case d'à côté.
    const cx = bons.reduce((a, b) => a + b.sx, 0) / bons.length;
    const cy = bons.reduce((a, b) => a + b.sy, 0) / bons.length;
    return bons.sort((a, b) => Math.hypot(a.sx - cx, a.sy - cy) - Math.hypot(b.sx - cx, b.sy - cy))[0];
  }, { ...c, tx, ty });
  if (!q) throw new Error(`la case (${tx},${ty}) n'est pas visée depuis le cadre`
                          + ' (hors écran, ou recouverte par le pad ou une plaque)');
  const vue = await p.viewportSize();
  if (q.sx < 0 || q.sy < 0 || q.sx > vue.width || q.sy > vue.height)
    throw new Error(`la case (${tx},${ty}) tombe hors de la fenêtre (${q.sx},${q.sy})`
                    + ' — la page a-t-elle défilé depuis le relevé ?');
  return q;
}

export const haut = p => p.evaluate(() => window.scrollTo(0, 0));
export const dire = (p, gros, petit) => p.evaluate(([g, s]) => window.__bandeau(g, s), [gros, petit]);
export const carte = (p, t, s) => p.evaluate(([a, b]) => window.__fin(a, b, true), [t, s]);

/* Caler le panneau sur le pinceau armé, en haut de ce qu'on voit de lui.
   `scrollIntoView` centre dans le conteneur de défilement, pas dans la
   fenêtre : le panneau n'en montre que 170 px et les vignettes tombaient
   sous le bord. On pose donc le décalage à la main. */
export const caler = p => p.evaluate(() => {
  const el = document.querySelector('.obj[aria-pressed="true"]');
  const boite = el?.closest('.panel');
  if (el && boite)
    boite.scrollTop += el.getBoundingClientRect().top - boite.getBoundingClientRect().top - 10;
  window.scrollTo(0, 0);
});

/* Marcher jusqu'à une case, au clic, comme un joueur. Tenir une flèche ne
   marche que depuis une position connue ; un clic marche d'où qu'on soit.
   La page a pu défiler depuis le dernier clic de panneau, d'où le `haut()`
   **avant** le relevé : c'est le quart d'heure perdu du 20/09. */
export async function allerA(p, tx, ty) {
  await haut(p);
  const q = await pointDeCase(p, tx, ty);
  await p.mouse.click(q.sx, q.sy);
  const t = await p.evaluate(() => window.__outil());
  if (!t.cible) throw new Error(`le clic sur (${tx},${ty}) n'a posé aucune cible`);
  await haut(p);
  return q;
}

export async function fabriquer({ nom, scenes, port = 8212, memoire = {}, panne = null,
                                  verifier = null, onglet: tab = 1, nomIle = 'L’île de Dan' }) {
  const brut = path.join(ICI, 'brut-' + nom);
  fs.rmSync(brut, { recursive: true, force: true });
  fs.mkdirSync(brut, { recursive: true });

  const s = await servir(port, panne ? src => panne(panneScene(src)) : panneScene);
  if (!s.pannePosee) throw new Error('la panne ne s\'est pas posée');
  const nav = await navigateur();
  const { page, erreurs } = await onglet(nav, {
    taille: { width: 360, height: 640 }, dpr: 3, tactile: true,
    memoire: { 'dansisland:guide': '9', ...memoire },
  });
  await page.goto(s.url);
  await attendre(2500);
  await page.evaluate(() => document.fonts.ready);
  /* Le faux serveur nomme l'île « L'île du filleul » : c'est de
     l'échafaudage de test, et ça n'a rien à faire dans une vidéo publique.
     On la renomme par le vrai champ du panneau, comme un joueur. */
  await page.click('.tabs button:nth-child(3)');
  await page.locator('#p-ile input[type="text"]').first().fill(nomIle);
  await page.locator('#p-ile input[type="text"]').first().blur();
  await page.click(`.tabs button:nth-child(${tab})`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await attendre(250);
  await page.evaluate(() => { window.__manuel = true; });

  const t0 = 1000;
  let i = 0;
  const journal = [], murmures = [];
  for (const sc of scenes) {
    const n = Math.round(sc.duree * FPS);
    if (sc.avant) await sc.avant(page);
    const debut = i;
    for (let k = 0; k < n; k++, i++) {
      if (sc.pendant) await sc.pendant(page, k, n);
      await page.evaluate(t => window.__pas(t), t0 + i * (1000 / FPS));
      const m = (await page.evaluate(() => window.__murmure())).trim();
      if (m && murmures[murmures.length - 1] !== m) murmures.push(m);
      await page.screenshot({ path: path.join(brut, String(i).padStart(4, '0') + '.png') });
    }
    journal.push(`${sc.nom} · ${(debut / FPS).toFixed(1)}s → ${(i / FPS).toFixed(1)}s · ${n} images`);
  }
  console.log(journal.join('\n'));
  if (murmures.length) console.log('ce que le jeu a dit :\n  · ' + murmures.join('\n  · '));
  if (verifier) await verifier({ murmures, page });
  console.log('erreurs de page :', erreurs.length ? erreurs : 'aucune');
  await nav.close(); s.fermer();

  const mp4 = path.join(ICI, nom + '.mp4');
  execFileSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(brut, '%04d.png'),
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '20',
    '-movflags', '+faststart', mp4], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log('\n' + mp4 + ' · ' + i + ' images · ' + (i / FPS).toFixed(1) + 's');
  return { mp4, images: i };
}
