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
import { navigateur, servir, onglet, compteur, attendre, remplacer } from './aide.mjs';
import { readFileSync } from 'fs';

const s = await servir(8158);
/* Une seconde copie, avec une sonde : `T` vit dans la portée du module, donc
   `page.evaluate` ne le voit pas. C'est la technique du 20/09 — instrumenter
   l'objet mesuré plutôt que de déduire son comportement d'un effet de bord. */
const sonde = await servir(8160, src => remplacer(src, /function langueDuNavigateur\(\)\{/,
  'window.__T=(k,v)=>T(k,v); window.__langue=()=>langue; function langueDuNavigateur(){'));
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
     `T()`.

     Cette section a longtemps exigé que **l'anglais soit incomplet** —
     « sinon ce contrôle ne prouverait rien ». C'était une preuve par effet
     de bord, donc une assertion qui se périmait le jour où le travail
     aboutirait : c'est arrivé le 22/09 au soir, à 100 % de couverture. Elle
     demande maintenant à `T()` lui-même, plus bas. */
  const o = await ouvrir({ 'dansisland:langue': 'en' });
  const html = await o.page.evaluate(() => document.body.innerHTML.length);
  c.dit(html > 1000, 'la page a bien été rendue (' + html + ' caractères)');

  /* **On retire les commentaires avant de chercher.** Ce fichier explique
     ses propres clés, donc un commentaire qui cite `T('…')` en devient une :
     mesuré, deux fausses clés dont « ` , ne peut pas les voir : c ». C'est
     le « shell » cherché dans sa propre bulle, du 19/09, et la même leçon
     que l'interdiction de `toJSON(secrets)` trouvée dans son propre
     avertissement. */
  const propre = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const lire = s2 => s2.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
                       .replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  const cles = [...propre.matchAll(/\bT\('((?:[^'\\]|\\.)*)'/g)].map(m => lire(m[1]));
  /* **Deux tables portent des clés sans les écrire dans un appel** :
     `POUSSE_DIT`, lu par un index, et les noms de `PIECES`, lus par
     `T(d.n)`. La regex ne voit ni l'une ni l'autre.

     J'ai d'abord écrit « `POUSSE_DIT` est la seule table dans ce cas ».
     C'était faux, et c'est le rendu qui l'a dit : l'anglais affichait
     « Here you are in the salon ». Un contrôle qui ne lit qu'une de ses
     sources dit « tout va bien » avec assurance — le défaut du contrôle 9
     qui ignorait `GRANDS`, et des trois prénoms au lieu de vingt. */
  const pousse = [...(((propre.match(/const POUSSE_DIT=\[([\s\S]*?)\];/) || [])[1]) || '')
    .matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => lire(m[1]));
  const pieces = [...(((propre.match(/const PIECES=\[([\s\S]*?)\n\];/) || [])[1]) || '')
    .matchAll(/\bn:\s*'((?:[^'\\]|\\.)*)'/g)].map(m => lire(m[1]));
  const uniques = [...new Set(cles.concat(pousse, pieces))];
  const bloc = (src.match(/TRAD\.en=\{([\s\S]*?)\n\};/) || [])[1] || '';
  const paires = [...bloc.matchAll(/^  '((?:[^'\\]|\\.)*)':\n    '((?:[^'\\]|\\.)*)',/gm)]
    .map(m => [lire(m[1]), lire(m[2])]);
  const traduites = paires.map(p => p[0]);
  // Un repère absent doit faire échouer ce qui s'appuie dessus, jamais
  // l'absoudre : sans clés lues, tout le reste serait vrai sans rien dire.
  c.dit(uniques.length > 120, uniques.length + ' phrases passent par T()');
  c.dit(pousse.length === 6, 'dont les ' + pousse.length + ' états du potager, lus par leur table');
  c.dit(pieces.length === 3, 'et les ' + pieces.length + ' noms de pièces, lus par la leur');
  c.dit(traduites.length > 120, traduites.length + ' sont traduites en anglais');
  console.log('     couverture : ' + Math.round(traduites.length * 100 / uniques.length) + ' %');

  /* **Le repli se mesure, il ne se déduit plus.** Ce contrôle exigeait
     jusqu'ici que l'anglais soit incomplet — ce qui prouvait le `|| fr` par
     un effet de bord, et devenait faux le jour où la traduction serait
     finie. C'est aujourd'hui. On demande donc à `T()` lui-même : une clé
     absente de la table doit rendre sa propre chaîne. */
  {
    const p = await ouvrir({ 'dansisland:langue': 'en' }, sonde.url);
    const r = await p.page.evaluate(() => ({
      pose: window.__langue(),
      absente: window.__T('Une phrase que personne n’a traduite.'),
      presente: window.__T('Rien à annuler.'),
      trou: window.__T('Il y a {objet} sous la maison. Efface-le d’abord.', { objet: 'X' }),
    }));
    c.dit(r.pose === 'en', 'la sonde tourne bien en anglais (' + r.pose + ')');
    c.dit(r.absente === 'Une phrase que personne n’a traduite.',
          'une clé absente rend sa propre chaîne — le repli est le `|| fr`');
    c.dit(r.presente === 'Nothing to undo.', 'et une clé présente rend sa traduction');
    c.dit(r.trou === 'There’s X under the house. Erase it first.',
          'les trous se remplissent dans la phrase traduite');
    await p.ctx.close();
  }

  /* **Un trou fantôme rend son accolade à l'écran.** `T()` ne remplace que
     ce que l'appelant lui donne : un `{qui}` écrit dans l'anglais là où le
     français dit `{hote}` ressort tel quel, en clair, sans erreur et sans
     trace. Failli le livrer sur la bulle de la photo chez un voisin. */
  let fantomes = 0;
  for (const [fr, en] of paires) {
    const ok = new Set([...fr.matchAll(/\{(\w+)\}/g)].map(x => x[1]));
    for (const t of new Set([...en.matchAll(/\{(\w+)\}/g)].map(x => x[1])))
      if (!ok.has(t)) { fantomes++; console.log('     {' + t + '} absent du français : ' + fr.slice(0, 56)); }
  }
  c.dit(paires.length === traduites.length && paires.length > 120,
        paires.length + ' paires relues en entier');
  c.dit(fantomes === 0, 'aucun trou de l’anglais n’est absent du français (' + fantomes + ')');

  /* **La majuscule voyage avec le trou.** `unObjet(t, maj, …)` et
     `laPiece(k, maj, …)` décident d'une capitale à l'appel, donc pour
     *toutes* les langues à la fois — et une traduction qui déplace le trou
     casse l'accord en silence. Mesuré : « Turning **A**n école changes
     nothing », « **a**n école needs four squares », « A photo of **A**
     palmier ». Trois fois, et aucune ne se voyait autrement qu'en rendant
     la phrase.

     L'invariant est exact : `maj` doit valoir vrai si et seulement si le
     trou ouvre la phrase, **dans les deux langues**. Il ne vaut que pour
     ces deux fonctions — `{qui}` rend un prénom, toujours capitalisé, et
     `{n}` un nombre. */
  const tete = (t, h) => new RegExp('^(?:<b>|📷 |↩ |<br>↩ )*\\{' + h + '\\}').test(t);
  const anglais = Object.fromEntries(paires);
  const appels = /\bT\('((?:[^'\\]|\\.)*)',\s*\{/g;
  let m3, majVus = 0, majFaux = [];
  while ((m3 = appels.exec(propre))) {
    let p = 0, k = appels.lastIndex - 1;
    for (; k < propre.length; k++) { const ch = propre[k];
      if (ch === '{') p++; else if (ch === '}') { p--; if (!p) break; } }
    const fr = lire(m3[1]), en = anglais[fr];
    if (!en) continue;
    for (const x of propre.slice(appels.lastIndex - 1, k + 1)
           .matchAll(/(\w+):\s*(?:unObjet|laPiece)\([^,]+,\s*(true|false)/g)) {
      majVus++;
      const maj = x[2] === 'true';
      if (tete(fr, x[1]) !== maj || tete(en, x[1]) !== maj)
        majFaux.push('maj=' + maj + ' fr=' + tete(fr, x[1]) + ' en=' + tete(en, x[1]) +
                     ' {' + x[1] + '} · ' + fr.slice(0, 46));
    }
  }
  c.dit(majVus > 10, majVus + ' trous à majuscule lus');
  for (const f of majFaux.slice(0, 4)) console.log('     ' + f);
  c.dit(majFaux.length === 0,
        'la majuscule tombe en tête de phrase dans les deux langues (' + majFaux.length + ' non)');

  const nonTraduites = uniques.filter(k => traduites.indexOf(k) < 0);
  for (const k of nonTraduites.slice(0, 5)) console.log('     sans anglais : ' + k.slice(0, 70));
  c.dit(nonTraduites.length === 0,
        'et l’anglais est complet (' + nonTraduites.length + ' sans traduction)');

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

  /* **Et l'autre moitié du même défaut, celle qui se cachait mieux :** une
     phrase traduite dont un trou reçoit du français écrit en dur. Ça rend
     un texte à moitié anglais, et rien ne le signale. Treize appels
     étaient dans ce cas — la repousse des touffes, la queue de saison du
     potager, « a répondu », « chez X » — parce que le contrôle ci-dessus
     ne regardait que l'argument de `say()`, jamais l'objet qui le suit.

     La règle est resserrée sur ce que les treize avaient **vraiment** en
     commun : un littéral collé par un `+`. « Un littéral dans un trou »
     attrapait aussi ' · ', '</b> ', 'fr-FR' et 'hiver' — sept faux
     positifs, et un faux positif use un contrôle aussi sûrement qu'un
     angle mort. */
  const sansT = t => {              // on aveugle les T(...) imbriqués
    let r = '', i = 0;
    while (i < t.length) {
      const j = t.indexOf('T(', i);
      if (j < 0) { r += t.slice(i); break; }
      r += t.slice(i, j);
      let p = 0, k = j + 1;
      for (; k < t.length; k++) { const ch = t[k];
        if (ch === '(') p++; else if (ch === ')') { p--; if (!p) break; } }
      r += ' '.repeat(k - j + 1); i = k + 1;
    }
    return r;
  };
  const motDedans = t => t.replace(/<\/?[a-z]+>/gi, '').replace(/\\u[0-9a-f]{4}/gi, 'e')
                          .replace(/[^A-Za-z]/g, '').length >= 3;
  const re = /\bT\('(?:[^'\\]|\\.)*',\s*\{/g;
  let m2, aTrous = 0, recolles = [];
  while ((m2 = re.exec(code))) {
    let p = 0, k = re.lastIndex - 1;
    for (; k < code.length; k++) { const ch = code[k];
      if (ch === '{') p++; else if (ch === '}') { p--; if (!p) break; } }
    aTrous++;
    for (const x of sansT(code.slice(re.lastIndex - 1, k + 1))
           .matchAll(/(?:\+\s*)'((?:[^'\\]|\\.)*)'|'((?:[^'\\]|\\.)*)'(?=\s*\+)/g)) {
      const t = x[1] ?? x[2];
      if (motDedans(t)) recolles.push(t.slice(0, 60));
    }
  }
  c.dit(aTrous > 50, aTrous + ' appels T() à trous lus');
  for (const t of recolles.slice(0, 6)) console.log('     recollé : ' + t);
  c.dit(recolles.length === 0,
        'aucun trou ne reçoit du français recollé (' + recolles.length + ')');
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

await nav.close(); s.fermer(); sonde.fermer();
process.exit(c.fin() ? 1 : 0);
