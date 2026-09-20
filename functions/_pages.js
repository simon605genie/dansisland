// ============================================================
//  Les pages éditoriales : /how-to-play, /features, /build-your-island,
//  /postcards.
//
//  **Le contenu et la maquette vivent ici**, et les quatre fichiers de route
//  ne font qu'appeler `rendre()`. Quatre copies de la maquette, du fil et de
//  l'appel à l'action divergeraient au premier changement — c'est la règle
//  déjà tenue pour la vignette de la vitrine et pour les rayons lus dans
//  `OBJ_GROUPS`.
//
//  **Pourquoi quatre fichiers et pas un `[page].js`.** Un fichier attrape-tout
//  à la racine intercepterait *toutes* les adresses d'un segment, donc
//  `/simon` et chaque île de l'archipel. Son `next()` les rattraperait — mais
//  ça met un aiguillage sur le chemin critique de tous les liens partagés du
//  jeu, pour quatre pages dont on connaît les noms. Quatre routes nommées ne
//  peuvent pas se tromper de client.
//
//  **Ce sont les seules pages du site qui s'indexent**, avec l'accueil. Le
//  reste — les îles, les cartes postales — appartient à quelqu'un : voir
//  `ROBOTS_NON` dans `_commun.js`.
//
//  Pourquoi elles existent : le jeu est une page peinte dans un canvas, donc
//  un moteur n'a **rien** à lire de ce qu'on y fait. Il voit un titre et
//  trois paragraphes d'accueil. Quelqu'un qui cherche « jeu de construction
//  d'île relaxant » ne peut pas tomber sur un canvas ; il peut tomber sur
//  une page qui raconte ce qu'on y construit.
//
//  Ce qu'elles ne sont **pas** : une ferme à contenu. Il y en a quatre, elles
//  disent des choses vraies et vérifiables dans le jeu, et le moteur de ce
//  jeu reste le partage — une carte postale envoyée vaut mille mots-clés.
//  Ne pas en faire cinquante.
//
//  En cas de doute, `next()` : une adresse inconnue retombe sur le
//  catch-all de `_redirects`, qui sert le jeu. C'est la règle des îles.
// ============================================================
import { page, reponse, ech, SITE, PAGES, ROBOTS_OUI } from './_commun.js';

const CTA = `
  <div class="portes">
    <a class="btn p" href="/">Créer mon île</a>
    <a class="btn" href="/dan">Visiter l’île de Dan</a>
  </div>`;

// Le fil : où on est, et où sont les trois autres. Un lien par page, pas
// plus : quatre pages qui se relient toutes entre elles suffisent.
function fil(ici) {
  const autres = PAGES.filter(p => p.chemin !== ici);
  return `<nav class="liens" style="margin:30px 0 0">` +
    autres.map(p => `<a href="${p.chemin}">${ech(p.nom)}</a>`).join('') + `</nav>`;
}

const CONTENU = {
  '/how-to-play': {
    titre: 'Comment jouer à Dan’s Island | Jeu relaxant de construction d’île',
    h1: 'Comment jouer',
    desc: 'Créer son personnage, construire sa maison et son île, aller marcher ' +
          'chez les voisins. Gratuit, dans le navigateur, sans rien à installer.',
    chapo: 'Il n’y a rien à apprendre. On clique, on marche, on pose. Voilà quand même ' +
           'par où commencer.',
    corps: `
    <h2>1. Ton bonhomme</h2>
    <p>Onglet <b>Moi</b>. Fille ou garçon, la silhouette, le teint, les cheveux, la
    tenue, un chapeau ou une couronne. Rien n’est verrouillé&nbsp;: un garçon peut
    porter une couronne et des cheveux longs.</p>

    <h2>2. Ta maison</h2>
    <p>Onglet <b>Maison</b>. Les murs, le toit, la porte, les volets, une cheminée.
    Tu peux la déplacer d’un clic. Et tu peux <b>entrer dedans</b>&nbsp;: trois pièces à
    décorer, un salon, une chambre, un atelier — avec des tapis, des meubles, des
    tableaux au mur et des objets posés sur les tables.</p>

    <h2>3. Ton île</h2>
    <p>Onglet <b>Île</b>. Un pinceau pour l’herbe, le sable, les chemins et l’eau —
    oui, tu peux creuser une mare au milieu de ton île, elle restera une mare même
    à marée basse. Puis l’atelier&nbsp;: des arbres, des rochers, un phare, une
    balançoire, une montgolfière amarrée, et des bâtiments pour faire un village.</p>

    <h2>4. Les voisins</h2>
    <p>Ton île a une adresse, du genre <span class="mono">dansisland.app/ton-nom</span>.
    Onglet <b>Voisins</b> pour aller marcher sur celle des autres. Tu peux y laisser
    un mot dans leur livre d’or et rapporter un souvenir chez toi. Tu ne peux rien
    y casser&nbsp;: chez les voisins, on regarde.</p>

    <h2>Marcher</h2>
    <p>Les flèches ou <b>ZQSD</b> au clavier, un doigt sur le pad en bas à gauche au
    téléphone, ou simplement un clic sur la case où tu veux aller. <b>E</b> ou le
    bouton rose agit sur ce qui est sous tes pieds&nbsp;: une porte, un coffre, la
    boîte aux lettres, le chien.</p>

    <div class="encart">
      <p><b>Il n’y a pas de partie ratée.</b> Pas de score, pas de minuteur, pas de
      vies. Le requin qui passe au large ne peut pas t’attraper, la mer qui remonte
      te repose sur la terre, et le chien qui s’éloigne s’assied et t’attend.</p>
    </div>` + CTA
  },

  '/features': {
    titre: 'Ce qu’on peut faire | Dan’s Island, jeu relaxant de construction d’île',
    h1: 'Ce qu’on peut faire',
    desc: 'Construction d’île, maison et intérieur, personnage, décoration, marées, ' +
          'visites chez les voisins, cartes postales, parrainage. Tout est gratuit.',
    chapo: 'Un jeu de détente où l’on construit, où l’on se promène, et où il se passe ' +
           'des choses sans qu’on ait rien à faire.',
    corps: `
    <h2>Construire</h2>
    <ul>
      <li><b>Le terrain</b> — herbe, sable, chemin, eau, au pinceau, case par case.</li>
      <li><b>Une quarantaine d’objets</b> — arbres, rochers, fontaine, puits, phare,
      moulin, hamac, tente, toboggan, cabane perchée, montgolfière.</li>
      <li><b>Des bâtiments</b> — ferme, école, coiffeur, supermarché, restaurant,
      lieu de culte. Ils occupent quatre cases, comme la maison, et le clocher est
      la chose la plus haute de l’île.</li>
      <li><b>Ta maison, dedans et dehors</b> — et trois pièces à meubler.</li>
    </ul>

    <h2>Une île qui vit</h2>
    <ul>
      <li><b>La marée</b> — deux fois par jour la mer se retire, comme la vraie&nbsp;:
      un cycle de 12&nbsp;h&nbsp;25, donc jamais à la même heure. Le sable mouillé
      devient praticable et la mer y laisse des choses à ramasser.</li>
      <li><b>Le jour et la nuit</b>, le soleil, la lune, les étoiles filantes.</li>
      <li><b>Ce qui passe</b> — mouettes, nuages, un voilier au nord, un requin au
      large, un poisson qui saute, des papillons le jour et des lucioles la nuit.</li>
      <li><b>Le son</b> — vagues, oiseaux, grillons, ou une petite musique. Elle est
      calculée, jamais enregistrée&nbsp;: elle ne se répète pas.</li>
    </ul>

    <h2>Les voisins</h2>
    <ul>
      <li><b>Visiter</b> une île par son adresse, et marcher dessus.</li>
      <li><b>Laisser un mot</b> dans le livre d’or, qui se plante sur l’île comme un
      petit panneau.</li>
      <li><b>Rapporter un souvenir</b> de chez un ami.</li>
      <li><b>Porter la commande du jour</b> — on remplit son panier chez soi à marée
      basse, on va le déposer sur le pas de la porte de quelqu’un.</li>
    </ul>

    <h2>Se détendre</h2>
    <p>Il y a une monnaie, le <b>shell</b>, et une boutique. On la gagne en tondant,
    en promenant le chien, en ramassant ce que la mer laisse — et surtout en
    recevant des gens. <b>L’île grandit parce que des gens sont passés</b>, jamais
    parce que le temps passe&nbsp;: il n’y a donc rien à attendre, et rien ne se perd
    si on ne vient pas pendant une semaine.</p>
    <p>Rien ne s’achète avec de l’argent réel. Il n’y a pas de publicité,
    pas d’achat, pas de compte à créer avec un mot de passe&nbsp;: un lien reçu par
    e-mail suffit.</p>

    <h2>Partager</h2>
    <p>Une <a href="/postcards">carte postale</a> de ton île s’envoie par WhatsApp en
    deux gestes, l’image comprise. Et si quelqu’un crée son île par ton lien, vous
    recevez tous les deux des shells.</p>` + CTA
  },

  '/build-your-island': {
    titre: 'Construire son île | Dan’s Island, jeu relaxant dans le navigateur',
    h1: 'Construire son île',
    desc: 'Le terrain, les objets, les bâtiments, la maison et son intérieur — et ' +
          'comment l’île s’agrandit. Gratuit, sans installation.',
    chapo: 'Une île commence petite et ronde. Ce qu’elle devient ne tient qu’à toi — ' +
           'et à ceux qui passent.',
    corps: `
    <h2>Le terrain</h2>
    <p>Quatre pinceaux&nbsp;: herbe, sable, chemin, eau. Tu peux tracer une allée
    jusqu’à ta porte, border l’île de sable, ou creuser un étang au milieu. Un
    <b>Ctrl+Z</b> annule le dernier geste, et rien n’est définitif.</p>

    <h2>Poser des choses</h2>
    <p>L’atelier est rangé en rayons&nbsp;: Nature, Village, Bâtiments, Dehors,
    Bestioles. Un objet s’achète <b>une fois, pour toujours</b>&nbsp;: tu en poses
    ensuite autant que tu veux sans repayer. Un enfant qui efface une fontaine pour
    la remettre deux cases plus loin ne perd rien.</p>

    <h2>Un village</h2>
    <p>Les bâtiments occupent quatre cases, comme la maison, et ils se voient de
    loin. Le lieu de culte est la chose la plus haute de l’île&nbsp;: c’est ce qu’on
    aperçoit d’abord quand on arrive chez quelqu’un. Pose les grands au nord, au
    fond du cadre&nbsp;: devant, ils cachent le reste.</p>

    <h2>Dedans</h2>
    <p>On entre chez soi en marchant sur le paillasson. Trois pièces, et de quoi les
    meubler&nbsp;: des tapis par terre, des meubles, des tableaux et des guirlandes au
    mur, un vase ou une plante <b>posés sur</b> une commode. Les fenêtres posent une
    tache de jour sur le plancher.</p>

    <h2>Agrandir l’île</h2>
    <div class="encart">
      <p>L’île gagne un cran de terrain à chaque mot qu’on te laisse. Ce n’est pas
      le temps qui la fait grandir, ni les shells&nbsp;: <b>ce sont les gens qui
      passent</b>. C’est pour ça que la carte postale est au cœur du jeu et pas dans
      un coin de menu.</p>
    </div>` + CTA
  },

  '/postcards': {
    titre: 'Les cartes postales | Dan’s Island, jeu relaxant de construction d’île',
    h1: 'Les cartes postales',
    desc: 'Envoie une image de ton île par WhatsApp, avec son adresse. C’est ce qui ' +
          'fait venir du monde — et c’est ce qui agrandit ton île.',
    chapo: 'Une image de ton île, une phrase, et l’adresse pour venir. C’est tout, et ' +
           'c’est ce qui fait tourner le jeu.',
    corps: `
    <h2>Ce que c’est</h2>
    <p>Une carte postale est une image de <b>ton</b> île, redessinée au moment où tu
    l’envoies, avec ton adresse dessus. Elle n’est stockée nulle part&nbsp;: c’est un
    message, pas une donnée du jeu.</p>

    <h2>Comment l’envoyer</h2>
    <p>Onglet <b>Voisins</b>, « Ta carte postale ». Tu vois ce que tu envoies avant
    de l’envoyer. Puis&nbsp;:</p>
    <ul>
      <li><b>WhatsApp</b> — sur téléphone, la vraie image part dans la conversation,
      pas un lien qui la promet.</li>
      <li><b>Copier le lien</b> — pour le coller où tu veux.</li>
      <li><b>Enregistrer l’image</b> — si tu préfères l’envoyer toi-même.</li>
    </ul>
    <p>Il y a toujours une sortie&nbsp;: un bouton qui ne marcherait que sur un
    téléphone récent n’existerait pas pour les autres.</p>

    <h2>Ce que ça rapporte</h2>
    <p>Rien à l’envoi, et c’est voulu&nbsp;: une carte qui paierait deviendrait une
    corvée, et on en enverrait dix par jour sans les regarder. Ce qui paie, c’est
    <b>quelqu’un qui arrive</b> — un mot laissé chez toi, une commande portée, une
    île créée par ton lien.</p>

    <h2>L’appareil photo</h2>
    <p>À côté de la carte postale, il y a un appareil photo dans le jeu. Il ne porte
    pas d’adresse et n’invite personne&nbsp;: on vise, on déclenche, et la photo va
    dans un album. C’est pour garder un moment, pas pour le partager.</p>

    <div class="encart">
      <p><b>Ton adresse est ton code de parrainage.</b> Pas de code à retenir&nbsp;:
      quand quelqu’un crée son île par ton lien, vous recevez tous les deux des
      shells — et il faut vraiment qu’il fasse son île, ouvrir un compte ne compte
      pas.</p>
    </div>` + CTA
  }
};

export function rendre(chemin, context) {
  const c = CONTENU[chemin];
  // En cas de doute, on s'efface : le catch-all de `_redirects` sert le jeu.
  // C'est la règle des îles, et elle vaut ici aussi.
  if (!c) return context.next();

  const ld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: c.h1, url: SITE + chemin, inLanguage: 'fr',
    description: c.desc,
    isPartOf: { '@type': 'VideoGame', name: "Dan's Island", url: SITE + '/' }
  });

  const corps = `
  <main class="page">
    <h1>${ech(c.h1)}</h1>
    <p class="chapo">${ech(c.chapo)}</p>
    ${c.corps}
    ${fil(chemin)}
  </main>`;

  return reponse(page({ chemin, titre: c.titre, desc: c.desc, ld, corps,
                        robots: ROBOTS_OUI }));
}
