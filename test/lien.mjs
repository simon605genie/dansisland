/* Le lien de connexion : ce qu'on voit après avoir appuyé.

   Le défaut signalé le 19/09/2026 : rien n'indiquait que le mail était
   parti. La confirmation tombait dans le murmure — en bas du cadre, 2,2 s
   — alors que la carte de connexion est hors du cadre, en portrait sur un
   autre écran que le doigt. « Je clique et rien ne se passe », et on
   appuie dix fois. Or Supabase refuse tout second envoi avant une minute :
   dix appuis ne donnaient pas dix mails, ils donnaient neuf erreurs.

   Le contrôle qui compte est le dernier de la section 3 : **dix appuis,
   un seul appel**. */
import { navigateur, servir, onglet, compteur, attendre } from './aide.mjs';

const s = await servir(8154);
const nav = await navigateur();
const c = compteur();

const ouvrir = async mail => {
  const o = await onglet(nav, {
    taille: { width: 390, height: 780 }, tactile: true, dpr: 3,
    memoire: { 'test:scenario': 'deconnecte', 'test:mail': mail, 'test:appels': '[]' },
  });
  await o.page.goto(s.url, { waitUntil: 'load' });
  await attendre(1200);
  return o;
};
const carte = p => p.evaluate(() => {
  const c = document.getElementById('compte');
  return {
    texte: c.innerText.replace(/\s+/g, ' ').trim(),
    boutons: [...c.querySelectorAll('button')].map(b => b.textContent + (b.disabled ? ' [inactif]' : '')),
    champ: (c.querySelector('input') || {}).value ?? null,
  };
});

c.titre('1. le formulaire, avant tout');
{
  const { ctx, page, erreurs } = await ouvrir('ok');
  const v = await carte(page);
  c.dit(/lien de connexion par e-mail/.test(v.texte), 'la carte propose le lien');
  c.dit(v.boutons.join() === 'Recevoir mon lien', 'un seul bouton, actif');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('2. une adresse invalide — le refus tombe DANS la carte');
{
  const { ctx, page, erreurs } = await ouvrir('ok');
  await page.fill('#compte input', 'pasunemail');
  await page.click('#compte .primary');
  await attendre(400);
  const v = await carte(page);
  c.dit(/adresse e-mail valide/.test(v.texte), 'le refus est écrit dans la carte');
  c.dit(v.champ === 'pasunemail', 'l’adresse tapée est conservée — rien à retaper');
  c.dit((await page.evaluate(() => JSON.parse(localStorage.getItem('test:appels')))).length === 0,
        'rien n’est parti au serveur');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('3. l’envoi réussit — c’est le défaut signalé');
{
  const { ctx, page, erreurs } = await ouvrir('ok');
  await page.fill('#compte input', 'moi@exemple.be');
  await page.click('#compte .primary');
  await attendre(500);
  const v = await carte(page);
  console.log('     ' + v.texte);
  c.dit(/Lien envoy(é|e) à moi@exemple\.be/.test(v.texte), 'la carte dit que le lien est parti, et à qui');
  c.dit(/depuis cet appareil/.test(v.texte), 'elle dit d’où l’ouvrir');
  c.dit(/indésirables/.test(v.texte), 'elle dit où chercher s’il tarde');
  c.dit(v.champ === null, 'le champ a disparu : plus rien qui invite à réappuyer');
  c.dit(v.boutons.some(b => /Renvoyer dans \d+.s \[inactif\]/.test(b)), 'le renvoi attend, et il le dit');
  c.dit(v.boutons.some(b => /Changer d’adresse/.test(b)), 'on peut corriger l’adresse');

  for (let i = 0; i < 10; i++) await page.click('#compte button', { force: true }).catch(() => {});
  await attendre(300);
  const appels = await page.evaluate(() => JSON.parse(localStorage.getItem('test:appels')));
  c.dit(appels.length === 1, 'dix appuis ne font toujours qu’UN envoi (' + appels.length + ')');

  await page.click('#compte button:nth-of-type(2)');
  await attendre(300);
  c.dit((await carte(page)).champ === 'moi@exemple.be', '« Changer d’adresse » ramène le champ, rempli');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('4. l’attente d’une minute — dite en français, avec le délai réel');
{
  const { ctx, page, erreurs } = await ouvrir('erreur');
  await page.fill('#compte input', 'moi@exemple.be');
  await page.click('#compte .primary');
  await attendre(600);
  const v = await carte(page);
  c.dit(/Attends encore 47.s/.test(v.texte), 'le délai réel du serveur est repris');
  c.dit(!/For security purposes/.test(v.texte), 'plus une ligne d’anglais à l’écran');
  c.dit(v.champ === 'moi@exemple.be', 'l’adresse est conservée');
  c.dit(!/Lien envoyé/.test(v.texte), 'rien ne prétend que le lien est parti');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('5. la limite d’envoi du projet — aucun délai promis');
{
  const { ctx, page, erreurs } = await ouvrir('quota');
  await page.fill('#compte input', 'moi@exemple.be');
  await page.click('#compte .primary');
  await attendre(600);
  const v = await carte(page);
  console.log('     ' + v.texte);
  c.dit(/satur/.test(v.texte), 'le message dit que le service est saturé');
  // Celle-là n'est pas l'attente d'une minute par adresse : c'est la limite
  // du projet, globale et horaire. On ne la connaît pas depuis le client,
  // donc on ne promet rien — « réessaie dans une minute » était faux.
  c.dit(!/une minute/.test(v.texte) && !/\d+.s\b/.test(v.texte.replace(/Renvoyer[^.]*/, '')),
        'aucun délai n’est promis');
  c.dit(/indésirables/.test(v.texte), 'il envoie chercher le lien déjà parti');
  c.dit(!/rate limit/i.test(v.texte), 'plus une ligne d’anglais à l’écran');
  c.dit(v.champ === 'moi@exemple.be', 'l’adresse est conservée');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

c.titre('6. l’invite de rotation, en portrait tactile');
{
  const { ctx, page, erreurs } = await onglet(nav, {
    taille: { width: 390, height: 780 }, tactile: true, dpr: 3,
    memoire: { 'dansisland:tourne': '' },
  });
  await page.goto(s.url, { waitUntil: 'load' });
  await attendre(3200);
  const t = await page.evaluate(() => {
    const el = document.getElementById('tourne'), sp = el && el.querySelector('span');
    const a = sp && getComputedStyle(sp);
    return { visible: !!el && getComputedStyle(el).display !== 'none',
             duree: a && a.animationDuration, tours: a && a.animationIterationCount,
             fin: a && a.animationFillMode };
  });
  c.dit(t.visible, 'l’invite se montre en portrait tactile');
  // Elle battait toutes les 3,2 s à l'infini : à 19 px sur un téléphone,
  // ça se lit comme un clignotement et on la referme pour faire cesser le
  // mouvement, pas parce qu'on a compris.
  c.dit(t.duree === '5.5s', 'le cycle dure 5,5 s et non 3,2 s');
  c.dit(t.tours === '3', 'le geste ne joue que trois fois, puis s’arrête');
  c.dit(t.fin === 'both', 'il reste à plat après le dernier tour');
  c.dit(erreurs.length === 0, 'aucune erreur de console');
  await ctx.close();
}

await nav.close(); s.fermer();
process.exit(c.fin() ? 1 : 0);
