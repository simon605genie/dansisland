// Ce qu’on peut faire — /fonctionnalites
//
//  Une route nommée, et rien d'autre : le contenu et la maquette des quatre
//  pages éditoriales vivent dans `_pages.js`. Voir l'en-tête de ce
//  fichier-là pour le pourquoi de ce découpage.
import { rendre } from './_pages.js';

export const onRequestGet = (context) => rendre('/fonctionnalites', context);
