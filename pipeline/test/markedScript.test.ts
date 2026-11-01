import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMarkedScript, parseMarkedScript, validateStory } from '../../src/video-engine/story.ts';

const TEXT = `[Scène 1 | bureau]
Narrateur : Chaque matin, Karim arrive au bureau à 8 h 05 précises, jamais une minute plus tôt. Ce lundi-là, il trouve sa fiche de paie sur son écran, et quelque chose ne va pas.

[Scène 2 | bureau]
Narrateur : Le montant est le double de l'habitude. Karim relit trois fois, puis se pince le bras.
Karim (surpris) : Ce n'est pas possible…

[Scène 3 | couloir]
Narrateur : Il se lève, traverse le couloir et frappe à la porte du directeur.
Monsieur Dubois : Entrez ! … Ah, Karim. Vous avez vu votre fiche ?
Karim : Justement, oui. Il y a une erreur, non ?

[Scène 4 | salle de réunion]
Narrateur : Monsieur Dubois ne répond pas tout de suite. Il pose une tasse de café sur la table, puis il sourit.
Monsieur Dubois (content) : Ce n'est pas une erreur. C'est une prime.
Narrateur : Karim se souvient à peine du dossier.

[Scène 5 | couloir]
Narrateur : Dans le couloir, ses collègues le regardent passer.
Stagiaire : Alors, c'est vrai ? Tu as eu la prime ?`;

test('script balisé : détecté, scènes et décors repris du texte', () => {
  assert.equal(isMarkedScript(TEXT), true);
  assert.equal(isMarkedScript('Un texte simple sans marqueur.'), false);
  const { input, mode } = parseMarkedScript(TEXT);
  assert.equal(mode, 'both');
  const story = validateStory(input, mode);
  assert.equal(story.scenes.length, 5);
  assert.deepEqual(story.scenes.map((s) => s.set), ['bureau', 'bureau', 'couloir', 'salle-reunion', 'couloir']);
});

test('script balisé : phrases reprises telles quelles, émotions et locuteurs', () => {
  const story = validateStory(parseMarkedScript(TEXT).input, 'both');
  const karim = story.characters.find((c) => c.id === 'karim');
  assert.ok(karim, 'Karim est créé à partir de son nom');
  assert.equal(story.scenes[1].lines[0].expression, 'surpris');
  assert.equal(story.scenes[3].lines[0].expression, 'content');
  assert.equal(story.scenes[0].narration?.startsWith('Chaque matin, Karim arrive'), true);
  assert.equal(story.scenes[2].lines[0].text, 'Entrez ! … Ah, Karim. Vous avez vu votre fiche ?');
});

test('script balisé : voix féminine pour un nom finissant par e, quatre héros au plus', () => {
  const story = validateStory(parseMarkedScript(TEXT).input, 'both');
  assert.equal(story.characters.find((c) => c.name === 'Stagiaire')?.voice.gender, 'f');
  assert.equal(story.characters.find((c) => c.name === 'Karim')?.voice.gender, 'm');
  const many = TEXT + '\nAlice : a\nBruno : b\nChloé : c\nDavid : d\nEmma : e';
  assert.throws(() => parseMarkedScript(many), /Quatre héros maximum/);
});

test('script balisé : une ligne sans locuteur est signalée', () => {
  assert.throws(() => parseMarkedScript('[Scène 1 | bureau]\nune phrase sans personne'), /Ligne sans locuteur/);
});
