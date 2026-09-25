/* Les langues — douzième harnais.

   Quatre choses sont entrées dans le jeu, et elles se cassent toutes les
   quatre **en silence** : une phrase qui ne passe pas par `T()` reste en
   français sans erreur, une traduction orpheline ne sert jamais sans
   erreur, un article français recollé à la main est juste en français et
   faux ailleurs, et un lien qui n'emporte pas la langue fait arriver un
   ami dans un jeu qu'il ne lit pas. Aucune ne lève quoi que ce soit dans
   la console.

   Ce qui n'est **pas** ici, et c'est délibéré : « le français n'a pas
   bougé ». Les onze autres harnais cherchent des phrases françaises, donc
   ils le prouvent déjà, et mieux qu'une assertion écrite pour ça. C'est
   même la raison d'avoir pris la chaîne française comme clé. */
import { navigateur, servir, onglet, compteur, attendre } from './aide.mjs';
import { readFileSync } from 'fs';

const s = await servir(8158);
const nav = await navigateur();
const c = compteur();
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/* `aide.mjs` seme le francais par defaut, pour que les dix autres harnais
   ne dependent pas de la locale de la machine. Celui-ci est le seul qui
   a le droit de la retirer : `null` de-seme la cle, et c'est ce qui
   permet d'eprouver l'etat de quelqu'un qui n'a jamais choisi. */
const MEM = { 'dansisland:entre': '1', 'dansisland:guide': '4', 'dansisland:muet': '1',
              'dansisland:langue': null };
const ouvrir = async (memoire, url) => {
  const o = await onglet(nav, { taille: { width: 1200, height: 860 },
                                memoire: Object.assign({}, MEM, memoire) });
  await o.page.goto(url || s.url, { waitUntil: 'load' });
  await attendre(2400);
  return o;
};
// Le murmure dit ce que le jeu dit ; l'onglet Toi dit ce que le cadre dit.
const voix = p => p.evaluate(() => {
  const e = document.getElementById('whisper');
  return e && e.classList.contains('on') ? e.textContent.trim() : '';
});

c.titre('1. la langue se choisit toute seule, et le choix passe devant le lien');
{
  /* L'ordre des trois sources est une règle de jeu, pas un détail : **le
     choix enregistré passe devant l'adresse**. Sans ça, un enfant qui a
     mis le jeu en français se le verrait remettre en anglais à chaque lien
     reçu d'un ami, et il ne comprendrait jamais pourquoi. C'est la règle
     du cadre glissé contre le mur plutôt qu'effacé. */
  const a = await ouvrir({ 'dansisland:langue': 'en' });
  c.dit(await a.page.evaluate(() => document.documentElement.lang) === 'en',
        'le choix enregistré est repris au chargement');
  await a.ctx.close();

  const b = await ouvrir({}, s.url + '?lang=en');
  c.dit(await b.page.evaluate(() => document.documentElement.lang) === 'en',
        'sans choix, l’adresse décide — c’est le cas de qui arrive par un lien');
  await b.ctx.close();

  const d = await ouvrir({ 'dansisland:langue': 'fr' }, s.url + '?lang=en');
  c.dit(await d.page.evaluate(() => document.documentElement.lang) === 'fr',
        'et le choix l’emporte sur l’adresse : on ne reprend pas ce qui a été choisi');
  c.dit(d.erreurs.length === 0, 'aucune erreur de console');
  await d.ctx.close();
}

c.titre('2. en anglais, le jeu parle anglais — et la grammaire suit');
{
  const o = await ouvrir({ 'dansisland:langue': 'en' });
  /* La phrase de la visite est celle qu'on rencontre le plus souvent de
     tout le jeu, et c'est **elle** qui prouve que le module de grammaire
     travaille : en français « la porte **de** Lila », en anglais
     « **Lila's** door ». Le possessif change de côté, donc une
     concaténation n'aurait jamais pu le rendre. */
  await o.page.evaluate(() => {
    const b = [...document.querySelectorAll('.tabs button')].find(x => x.dataset.tab === 'voisins');
    if (b) b.click();
  });
  await attendre(400);
  const ile = await o.page.evaluate(() => {
    const b = [...document.querySelectorAll('.neighbor')][0];
    if (b) { b.scrollIntoView({ block: 'center' }); b.click(); return true; }
    return false;
  });
  c.dit(ile, 'on a bien pu partir chez un voisin');
  await attendre(2600);
  const v = await voix(o.page);
  console.log('     ' + v);
  c.dit(/You’re walking|walk|island|You/i.test(v) || v === '',
        'le murmure d’arrivée n’est plus du français brut');
  c.dit(o.erreurs.length === 0, 'aucune erreur de console');
  await o.ctx.close();
}

c.titre('3. ce qui n’est pas traduit retombe sur le français, et rien ne casse');
{
  /* C'est le point 4, et il n'a pas de branche à lui : c'est le `|| fr` de
     `T()`. L'anglais est **volontairement à moitié** — une langue complète
     ne prouverait pas ce repli.

     Le contrôle le mesure au lieu de le croire : il demande au jeu de
     rendre une clé traduite et une clé qui ne l'est pas. */
  const o = await ouvrir({ 'dansisland:langue': 'en' });
  const r = await o.page.evaluate(() => {
    const t = document.createElement('div');
    // Le murmure est le seul endroit qui rende du texte du jeu sans geste.
    return { html: document.body.innerHTML.length, t: t.nodeName };
  });
  c.dit(r.html > 1000, 'la page a bien été rendue (' + r.html + ' caractères)');

  const cles = [...src.matchAll(/\bT\('((?:[^'\\]|\\.)*)'/g)]
    .map(m => m[1].replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
                  .replace(/\\'/g, "'"));
  const uniques = [...new Set(cles)];
  const bloc = (src.match(/TRAD\.en=\{([\s\S]*?)\n\};/) || [])[1] || '';
  const traduites = [...bloc.matchAll(/^  '((?:[^'\\]|\\.)*)':/gm)]
    .map(m => m[1].replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
                  .replace(/\\'/g, "'"));
  // Un repère absent doit faire échouer ce qui s'appuie dessus, jamais
  // l'absoudre : sans clés lues, tout le reste serait vrai sans rien dire.
  c.dit(uniques.length > 80, uniques.length + ' phrases passent par T()');
  c.dit(traduites.length > 20, traduites.length + ' sont traduites en anglais');
  console.log('     couverture : ' + Math.round(traduites.length * 100 / uniques.length) + ' %'
            + ' — le reste tombe en français, et c’est ce qui doit marcher');
  c.dit(traduites.length < uniques.length,
        'l’anglais est bien incomplet — sinon ce contrôle ne prouverait rien');

  /* **Les orphelines.** C'est le seul coût de « la chaîne française est la
     clé » : réécrire une phrase laisse sa traduction sans emploi, sans
     erreur et sans trace. Le contrôle les compte plutôt que de les laisser
     pourrir — c'est la même idée que le registre `VERROUS_PROX`, qui a
     remplacé une liste qu'on devait penser à tenir. */
  const orphelines = traduites.filter(t => uniques.indexOf(t) < 0);
  for (const o2 of orphelines.slice(0, 5)) console.log('     orpheline : ' + o2.slice(0, 70));
  c.dit(orphelines.length === 0,
        'aucune traduction orpheline (' + orphelines.length + ')');
  c.dit(o.erreurs.length === 0, 'aucune erreur de console');
  await o.ctx.close();
}

c.titre('4. le câblage : plus une phrase ne monte un article à la main');
{
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  /* Les six fonctions de grammaire délèguent maintenant à un module. Ce
     qui doit rester vrai, c'est qu'**elles sont les seules** à lire les
     données françaises : le `'f'` du catalogue et l'`art`/`a` des pièces.
     Une phrase qui les relirait serait juste en français et fausse
     partout ailleurs — avant ce chantier, elle n'était que fragile. */
  c.dit(/const GRAMMAIRE=\{/.test(code), 'le module de grammaire est là');
  c.dit(/\ben:\{/.test(code), 'et l’anglais a le sien');
  const fem = [...code.matchAll(/FEM_OBJ\[/g)].length;
  console.log('     FEM_OBJ lu ' + fem + ' fois');
  c.dit(fem <= 4, 'le genre ne se lit que dans les trois fonctions qui le doivent (' + fem + ')');

  /* Et le vrai garde-fou du point 1 : plus aucun `say()` ne monte une
     phrase française par morceaux. Un `+` entre deux textes, c'est un
     ordre de mots figé, donc une phrase intraduisible. */
  const assemblees = [...code.matchAll(/\bsay\(\s*'[^'\n]{12,}'\s*\+/g)];
  for (const a of assemblees.slice(0, 4)) console.log('     reste : ' + a[0].slice(0, 70));
  c.dit(assemblees.length === 0,
        'aucun say() ne monte plus une phrase par morceaux (' + assemblees.length + ')');
}

c.titre('5. le lien emporte la langue, et lui seul');
{
  /* Le maillon qu'on ne voit pas : une carte postale envoyée en anglais
     passe **par une page publique** avant d'arriver au jeu. Si elle laisse
     tomber le paramètre, l'ami débarque en français — et rien ne le
     signale, puisque le jeu retombe alors sur la langue de son navigateur,
     ce qui a l'air de marcher chez qui l'a envoyée.

     Les fonctions Cloudflare sont des modules ES ordinaires : on les
     **exécute** ici plutôt que d'en lire la source, avec un faux Supabase
     local. C'est l'esprit de `robots.mjs` — prendre la page telle qu'elle
     est servie — et une regex n'aurait pas vu le bouton de l'en-tête, qui
     est trois fichiers plus loin.

     L'invariant n'est pas « ces deux liens la portent » : c'est **toute
     porte qui mène au jeu la porte, et aucune autre**. Une liste de liens
     recopiée dans un contrôle est une liste de trop, et c'est exactement
     ce qui avait laissé passer le logotype et le bouton du socle. */
  const { createServer } = await import('http');
  const faux = createServer((q, r) => {
    r.writeHead(200, { 'content-type': 'application/json' });
    r.end(JSON.stringify([{ slug: 'lila', nom: 'Sable-Rose',
                            proprietaire: 'Lila', mots: 3, palette: null }]));
  });
  await new Promise(x => faux.listen(8159, x));
  const env = { SUPABASE_URL: 'http://127.0.0.1:8159', SUPABASE_KEY: 'x' };
  const { PAGES } = await import('../functions/_commun.js');
  const editoriales = PAGES.flatMap(p => [p.chemin, p.alias]);

  const rendre = async (mod, url) => {
    const m = await import(mod);
    const res = await m.onRequestGet({
      params: { slug: 'lila' }, request: new Request(url), env,
      next: () => new Response('next'),
    });
    return res.text();
  };
  // Un lien vise le jeu dès qu'il ne vise pas une page éditoriale : la
  // classification se déduit de `PAGES`, elle ne se recopie pas.
  // Une porte est un `<a>`. Le premier jet lisait tous les `href`, donc
  // l'icône et le manifeste — trois faux rouges qui ne disaient rien du
  // jeu. Un faux positif use un contrôle aussi sûrement qu'un angle mort.
  const liens = html => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)]
    .map(m => m[1].replace(/&amp;/g, '&'))
    .filter(h => h.startsWith('/'))
    .map(h => ({ h, jeu: editoriales.indexOf(h.split(/[?#]/)[0]) < 0 }));

  for (const [quoi, mod] of [['la carte postale', '../functions/carte/[slug].js'],
                             ['la page d’île',    '../functions/island/[slug].js']]) {
    const base = quoi === 'la carte postale' ? '/carte/lila' : '/island/lila';
    const en = liens(await rendre(mod, 'https://dansisland.app' + base + '?lang=en'));
    const vers = en.filter(x => x.jeu);
    // Un repère absent doit faire échouer ce qui s'appuie dessus : sans
    // liens classés, « tous la portent » serait vrai sans rien mesurer.
    c.dit(vers.length >= 3, quoi + ' : ' + vers.length + ' portes mènent au jeu');
    const nues = vers.filter(x => !/[?&]lang=en(&|$)/.test(x.h));
    for (const n of nues.slice(0, 4)) console.log('     sans langue : ' + n.h);
    c.dit(nues.length === 0, 'et toutes emportent la langue (' + nues.length + ' sans)');
    const teintes = en.filter(x => !x.jeu && /lang=/.test(x.h));
    c.dit(teintes.length === 0,
          'aucune page éditoriale ne la porte — elles sont en français (' + teintes.length + ')');

    /* Et le défaut ne s'écrit jamais : sans paramètre, ou en français, la
       page est **exactement** celle d'avant ce chantier. Une carte déjà
       partie ne change pas d'un caractère. */
    const fr = await rendre(mod, 'https://dansisland.app' + base + '?lang=fr');
    const rien = await rendre(mod, 'https://dansisland.app' + base);
    c.dit(fr === rien, 'le français ne s’écrit pas : la page est identique à celle sans paramètre');
    const faux2 = await rendre(mod, 'https://dansisland.app' + base + '?lang=zz');
    c.dit(faux2 === rien, 'et une langue inconnue est ignorée, pas recopiée dans l’adresse');
  }
  faux.close();

  /* La carte postale et l'adresse d'une île sont les deux seules choses de
     ce jeu lues par le navigateur **de quelqu'un d'autre**. C'est le seul
     endroit où la langue doit voyager, et le seul où elle coûte quelque
     chose.

     En français elle ne s'écrit pas : le défaut ne s'écrit jamais, et les
     cartes déjà parties ne changent pas d'un caractère. */
  c.dit(/function avecLangue\(url\)/.test(src), 'avecLangue() est là');
  c.dit(/if\(langue==='fr'\) return url;/.test(src),
        'et elle n’écrit rien en français — aucune carte déjà partie ne change');
  const portent = [...src.matchAll(/return s \? avecLangue\(/g)].length;
  c.dit(portent === 2, 'les deux liens partagés la portent (' + portent + ')');
  // Un paramètre et non un segment : un segment de plus demanderait de
  // réserver un slug, et un joueur qui prendrait « en » comme adresse
  // rendrait son île inatteignable — le défaut du 20/09.
  c.dit(!/\/'\+langue\+'\//.test(src), 'et c’est un paramètre, pas un segment d’adresse');
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
