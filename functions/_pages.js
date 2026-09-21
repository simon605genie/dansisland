// ============================================================
//  Les pages éditoriales : /comment-jouer, /fonctionnalites,
//  /construire-son-ile, /cartes-postales — et leurs alias anglais, qui
//  servent la même page avec le canonique pointé sur le français.
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
import { page, reponse, ech, SITE, PAGES, ROBOTS_OUI, VAGUE, PALMES, rang } from './_commun.js';

const CTA = `
  <div class="portes">
    <a class="btn p" href="/">Créer mon île</a>
    <a class="btn" href="/dan">Visiter l’île de Dan</a>
  </div>`;

/* La citation de la planche d'identité. Elle n'est **pas** décorative : elle
   dit en une ligne ce que les quatre pages mettent trois écrans à dire, et
   c'est elle qu'on retient. Une seule par page, toujours au même endroit —
   juste avant le fil — sinon elle devient un slogan qui traîne. */
const CITATION = `
  <blockquote class="citation">« Un petit coin de douceur, ouvert sur le monde. »
    <span>Dan’s Island — un jeu où l’on ne perd rien, jamais.</span></blockquote>`;

// Le fil : où on est, et où sont les trois autres. Un lien par page, pas
// plus : quatre pages qui se relient toutes entre elles suffisent.
function fil(ici) {
  const autres = PAGES.filter(p => p.chemin !== ici);
  return `<nav class="liens" style="margin:30px 0 0">` +
    autres.map(p => `<a href="${p.chemin}">${ech(p.nom)}</a>`).join('') + `</nav>`;
}

const CONTENU = {
  '/comment-jouer': {
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

    <h2 id="ta-maison">2. Ta maison</h2>
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

  '/fonctionnalites': {
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
    <p>Une <a href="/cartes-postales">carte postale</a> de ton île s’envoie par WhatsApp en
    deux gestes, l’image comprise. Et si quelqu’un crée son île par ton lien, vous
    recevez tous les deux des shells.</p>` + CTA
  },

  '/construire-son-ile': {
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

  '/cartes-postales': {
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
  },

  /* ── La cinquième page ───────────────────────────────────────────────
   *
   * Les quatre autres disent *comment*. Celle-ci dit *pourquoi*, et c'est
   * la **seule page du site qui cite des travaux publiés**. Ça lui impose
   * une discipline que les autres n'ont pas.
   *
   * **Trois règles, et elles ne se négocient pas :**
   *
   * 1. **Aucune étude citée ne porte sur ce jeu-ci.** On rapporte ce
   *    qu'elles ont mesuré, avec auteurs, revue, année et effectif, et le
   *    jeu se place à côté. Écrire « des études montrent que Dan's Island
   *    aide votre enfant » serait faux, invérifiable, et ce serait
   *    exactement le genre de promesse qu'on fait à des parents parce
   *    qu'ils ne vont pas vérifier.
   *
   * 2. **On cite ce qui dérange autant que ce qui arrange.** La plus
   *    grosse étude du lot (38 935 joueurs) ne trouve *aucun* lien causal
   *    entre temps de jeu et bien-être — pas même positif. La citer
   *    renforce le propos au lieu de l'affaiblir, parce que le propos
   *    n'est pas « les jeux font du bien », c'est « le temps n'est pas la
   *    bonne question ». Un dossier qui ne garderait que les résultats
   *    flatteurs se reconnaît à ça, et un parent qui vérifie une source
   *    vérifie les autres.
   *
   * 3. **On dit sur qui ont porté les études.** Trois des quatre portent
   *    sur des adultes. C'est écrit dans la page, parce que le lecteur ne
   *    peut pas le deviner et que l'omettre ferait passer des résultats
   *    d'adultes pour des résultats d'enfants.
   *
   * Les liens sortent vers les revues par leur DOI, pas vers des articles
   * qui les résument : une source qu'on ne peut pas ouvrir n'est pas une
   * source.
   *
   * Et le chapô porte la phrase qui a donné cette page : « un écran pour
   * se détendre, enfin ». */
  '/pourquoi-un-jeu-calme': {
    titre: 'Pourquoi un jeu où personne ne gagne | Jeu relaxant pour enfants',
    h1: 'Pourquoi un jeu calme',
    desc: 'Un jeu sans score, sans minuteur et sans partie perdue — et ce que ' +
          'disent vraiment les travaux publiés sur le temps d’écran, le jeu ' +
          'coopératif et le bien-être. Sources citées.',
    chapo: 'Un écran pour se détendre, enfin. Voilà les choix qu’il y a derrière, ' +
           'et ce que dit la recherche — y compris quand elle ne nous arrange pas.',
    corps: `
    <p>Dan’s Island n’a pas de score, pas de minuteur, pas de niveau à finir et
    aucune façon de perdre. Ce n’est pas une fonctionnalité manquante&nbsp;: c’est
    la décision de départ, et tout le reste en découle.</p>

    <h2>Personne ne gagne, personne ne perd</h2>
    <p>Il n’y a pas d’adversaire. On ne peut pas rater une partie, casser son île,
    se faire attraper, ni prendre du retard sur quelqu’un. Un requin passe au large
    et ne peut attraper personne. Le chien qu’on promène, s’il est trop loin,
    <b>s’assied et attend</b> — il ne gronde pas, il n’y a pas de compte à rebours.
    La mer qui remonte repose le bonhomme à terre au lieu de le noyer.</p>
    <p>Ça se voit jusque dans les petits refus&nbsp;: quand un geste n’est pas
    possible, le jeu dit <i>pourquoi</i> et <i>quoi faire</i>, à l’endroit exact où
    est le doigt. Il ne dit jamais «&nbsp;perdu&nbsp;».</p>

    <h2>Tout se partage</h2>
    <p>La seule façon d’agrandir son île, c’est que <b>quelqu’un soit passé</b> —
    un mot laissé sur ton livre d’or, une commande portée chez toi, un copain qui
    crée son île par ton lien. Jamais parce que le temps passe, jamais parce qu’on
    a joué longtemps.</p>
    <p>C’est la règle qui tranche tous les arbitrages du jeu, et elle a une
    conséquence qui vaut d’être dite&nbsp;: <b>inviter est la seule façon de
    progresser.</b> Le jeu pousse à partager sans jamais le demander.</p>

    <h2>Ce que dit la recherche — et ce qu’elle ne dit pas</h2>
    <p><b>Aucune de ces études ne porte sur Dan’s Island.</b> Elles sont citées pour
    ce qu’elles ont mesuré, pas comme une preuve sur ce jeu. Et trois des quatre
    portent sur des adultes&nbsp;: c’est précisé à chaque fois.</p>

    <h3>Le temps d’écran n’est pas la bonne question</h3>
    <p>En 2025, une équipe de l’Oxford Internet Institute a croisé les données de jeu
    réelles de <b>703 joueurs adultes</b> sur 150 jeux — plus de 140&nbsp;000 heures —
    avec leur bien-être déclaré. Le nombre d’heures jouées <b>n’était pas lié</b> au
    bien-être. Ce qui l’était, c’est la valeur que les joueurs accordaient à ce
    temps-là.</p>
    <p>Ballou, Vuorre, Hakman, Magnusson et Przybylski (2025).
    <a href="https://doi.org/10.1098/rsos.241174" rel="nofollow noopener">Perceived value
    of video games, but not hours played, predicts mental well-being in casual adult
    Nintendo players</a>. <i>Royal Society Open Science</i> 12(3), 241174.</p>

    <h3>La plus grosse étude ne trouve aucun effet, dans aucun sens</h3>
    <p>La même équipe avait suivi <b>38&nbsp;935 joueurs</b> sur sept jeux pendant six
    semaines, en reliant le temps de jeu mesuré par les éditeurs au bien-être
    déclaré. Conclusion&nbsp;: <b>peu ou pas de lien causal</b>, ni dans un sens ni
    dans l’autre. Nous la citons parce qu’elle ne nous arrange pas, et parce que
    c’est elle qui rend la précédente intéressante&nbsp;: si la durée ne fait rien,
    reste ce qu’on y fait.</p>
    <p>Vuorre, Johannes, Magnusson et Przybylski (2022).
    <a href="https://doi.org/10.1098/rsos.220411" rel="nofollow noopener">Time spent
    playing video games is unlikely to impact well-being</a>.
    <i>Royal Society Open Science</i> 9(7), 220411. Joueurs adultes.</p>

    <h3>Coopérer, pas s’affronter</h3>
    <p>C’est la seule des quatre qui porte sur des enfants. <b>96 enfants de 4 à
    5&nbsp;ans</b> ont joué au même jeu, les uns de façon coopérative, les autres de
    façon compétitive. On a ensuite observé ce qu’ils partageaient avec des enfants
    qui n’avaient pas joué. Ceux qui avaient joué de façon <b>compétitive
    partageaient moins</b>. Jouer seul donnait un résultat intermédiaire.</p>
    <p>Toppe, Hardecker et Haun (2019).
    <a href="https://doi.org/10.1371/journal.pone.0221092" rel="nofollow noopener">Playing
    a cooperative game promotes preschoolers’ sharing with third-parties, but not social
    inclusion</a>. <i>PLOS ONE</i> 14(8), e0221092.</p>

    <h3>Et la première du genre</h3>
    <p>En 2021, la même équipe avait trouvé une <b>petite corrélation positive</b>
    entre temps de jeu et bien-être, chez des joueurs adultes d’<i>Animal Crossing</i>
    et de <i>Plants vs. Zombies</i>, en utilisant là encore les données réelles des
    éditeurs plutôt que des durées déclarées de mémoire.</p>
    <p>Johannes, Vuorre et Przybylski (2021).
    <a href="https://doi.org/10.1098/rsos.202049" rel="nofollow noopener">Video game play
    is positively correlated with well-being</a>.
    <i>Royal Society Open Science</i> 8(2), 202049. Joueurs adultes.</p>

    <div class="encart">
      <p><b>Ce qu’on en retient, et rien de plus&nbsp;:</b> compter les minutes
      renseigne mal, et la nature de ce qu’on fait devant l’écran pèse plus lourd
      que sa durée. Dan’s Island est construit du côté calme, coopératif et créatif
      de cette distinction. Ça ne veut pas dire qu’il «&nbsp;fait du bien&nbsp;» —
      personne ne l’a mesuré, et nous ne le prétendrons pas.</p>
    </div>

    <h2>Ce qu’il n’y a pas, et n’y aura pas</h2>
    <p>Pas de publicité. <b>Aucun paiement réel</b>, et il n’y en aura jamais&nbsp;:
    la monnaie du jeu, le shell, se gagne en jouant et ne s’achète pas. Pas de
    classement, pas de série à ne pas briser, pas de notification qui rappelle de
    revenir. Pas de messagerie privée&nbsp;: on laisse un mot sur le livre d’or
    d’une île, et le propriétaire peut le retirer.</p>
    <p>Et rien à installer&nbsp;: ça s’ouvre dans le navigateur, sur un téléphone
    comme sur un ordinateur.</p>` + CTA
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

  /* Le bandeau, puis le rang des cinq, puis le texte. C'est l'ordre de la
     planche, et c'est aussi la règle que ce dépôt s'est donnée le 19/09
     après « Voisins ne montrait aucun voisin » : **ce qu'une page est doit
     être en haut de cette page.** Quelqu'un qui arrive ici depuis une
     recherche veut savoir de quoi on parle avant de lire trois écrans. */
  const corps = `
  <header class="banniere">
    <span class="soleil" aria-hidden="true"></span>
    ${PALMES}
    <h1>${ech(c.h1)}</h1>
    <p class="chapo">${ech(c.chapo)}</p>
    ${VAGUE}
  </header>
  ${rang(chemin)}
  <main class="page">
    ${c.corps}
    ${CITATION}
    ${fil(chemin)}
  </main>`;

  return reponse(page({ chemin, titre: c.titre, desc: c.desc, ld, corps,
                        robots: ROBOTS_OUI }));
}
