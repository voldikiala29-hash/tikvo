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

test('script balisé : geste lu dans la scène, héros reconnu même sans majuscule', () => {
  const raw = `[Scène 1 | bureau]
Narrateur : Karim ouvre sa fiche de paie sur son écran, et il lit le montant plusieurs fois avant de comprendre ce qui se passe.
[Geste : Karim lever les bras]
Karim : Enfin, la bonne nouvelle arrive après tous ces mois d'attente !
[Scène 2 | couloir]
Narrateur : Il pleure en silence dans le couloir, sans que personne ne le remarque vraiment ce matin-là.
[Geste : karim pleurer]`;
  const story = validateStory(parseMarkedScript(raw).input, 'both');
  assert.deepEqual(story.scenes[0].actions, [{ actor: 'karim', action: 'lever-bras' }]);
  assert.deepEqual(story.scenes[1].actions, [{ actor: 'karim', action: 'pleurer' }]);
});

test('script balisé : geste inconnu ou héros absent signalés', () => {
  assert.throws(() => parseMarkedScript('[Scène 1 | bureau]\nNarrateur : Bonjour.\n[Geste : Karim danser]'), /Geste inconnu/);
  assert.throws(() => parseMarkedScript('[Scène 1 | bureau]\nNarrateur : Bonjour.\n[Geste : pleurer]'), /Geste sans héros/);
  assert.throws(() => parseMarkedScript('[Scène 1 | bureau]\nNarrateur : Bonjour.\n[Geste : Zoé pleurer]'), /héros « Zoé » inconnu/);
});

test('animation : émotion déduite du texte quand elle n’est pas écrite', () => {
  const raw = `[Scène 1 | bureau]
Narrateur : Karim regarde son écran sans y croire.
Karim : Ce n'est pas possible, c'est incroyable !
[Scène 2 | couloir]
Narrateur : Il traverse le couloir d'un pas pressé jusqu'à la porte du directeur.
Monsieur Dubois : Entrez.`;
  const story = validateStory(parseMarkedScript(raw).input, 'both');
  assert.equal(story.scenes[0].lines[0].expression, 'surpris');
});

test('animation : gestes déduits du texte, héros nommé dans la phrase', () => {
  const raw = `[Scène 1 | bureau]
Narrateur : Karim se lève de sa chaise et traverse le bureau en silence.
Karim : Enfin !
[Scène 2 | couloir]
Narrateur : Monsieur Dubois applaudit à la porte du bureau.
Monsieur Dubois : Bravo.`;
  const story = validateStory(parseMarkedScript(raw).input, 'both');
  assert.deepEqual(story.scenes[0].actions, [{ actor: 'karim', action: 'marcher' }]);
  assert.deepEqual(story.scenes[1].actions, [{ actor: 'monsieur-dubois', action: 'applaudir' }]);
});

test('animation : un geste écrit remplace les gestes déduits', () => {
  const raw = `[Scène 1 | bureau]
Narrateur : Karim traverse le bureau sans un mot, les épaules basses et le regard fixé sur la porte du fond.
[Geste : Karim immobile]
Karim : Bonjour à tous, je suis là.
[Scène 2 | couloir]
Narrateur : Le couloir est vide et silencieux, seules les lumières clignotent au plafond.`;
  const story = validateStory(parseMarkedScript(raw).input, 'both');
  assert.deepEqual(story.scenes[0].actions, [{ actor: 'karim', action: 'immobile' }]);
});
