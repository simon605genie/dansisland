// Construire son île — /build-your-island, l'alias anglais de /construire-son-ile
//
//  Il sert **exactement la même page**, canonique compris : `rendre()`
//  reçoit le chemin français, donc `<link rel="canonical">` et `og:url`
//  pointent sur lui. C'est ce qui consolide les deux adresses en une seule
//  aux yeux d'un moteur, sans rien cacher à personne.
//
//  Pas de `noindex` ici, et ce n'est pas un oubli : un `noindex` posé sur
//  une page qui canonicalise ailleurs envoie deux signaux contraires, et
//  aucun moteur ne sait lequel suivre.
import { rendre } from './_pages.js';

export const onRequestGet = (context) => rendre('/construire-son-ile', context);
