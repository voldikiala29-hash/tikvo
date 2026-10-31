import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeDropped, pickSceneHit, sceneWindows, splitScenes } from '../scenes.ts';
import { parseBriefPlan, sanitizeQuery } from '../../worker/src/briefs.ts';

test('une phrase du script = un plan, les lignes vides et sans mot sont ignorées', () => {
  const lines = splitScenes('Première phrase ici.\n\n🔥🔥\nDeuxième phrase là.');
  assert.deepEqual(lines, ['Première phrase ici.', 'Deuxième phrase là.']);
});

test('au plus 8 plans : les phrases les plus courtes sont fusionnées', () => {
  const script = Array.from({ length: 12 }, (_, i) => `Phrase numéro ${i + 1} ici.`).join('\n');
  assert.equal(splitScenes(script).length, 8);
});

test('fenêtres calées sur les mots prononcés, sans trou', () => {
  const words = [
    { word: 'Un', startFrame: 0, endFrame: 10 },
    { word: 'deux', startFrame: 11, endFrame: 20 },
    { word: 'trois', startFrame: 30, endFrame: 40 },
  ];
  const windows = sceneWindows(['Un deux', 'trois'], words, 60);
  assert.deepEqual(windows, [
    { from: 0, durationInFrames: 30 },
    { from: 30, durationInFrames: 30 },
  ]);
});

test('une phrase sans plan rend sa durée à la précédente', () => {
  const windows = [
    { from: 0, durationInFrames: 10 },
    { from: 10, durationInFrames: 10 },
    { from: 20, durationInFrames: 10 },
  ];
  assert.deepEqual(mergeDropped(windows, [true, false, true]), {
    windows: [
      { from: 0, durationInFrames: 10 },
      { from: 10, durationInFrames: 20 },
    ],
    kept: [0, 2],
  });
  const leading = mergeDropped(windows, [false, true, true]);
  assert.deepEqual(leading.windows, [
    { from: 0, durationInFrames: 20 },
    { from: 20, durationInFrames: 10 },
  ]);
});

test('le clip choisi correspond aux mots de la requête, sans prendre deux fois le même', () => {
  const hits = [
    { id: 1, tags: 'city, rain, street' },
    { id: 2, tags: 'woman, crying, tears, sad' },
    { id: 3, tags: 'woman, crying, face' },
  ];
  assert.equal(pickSceneHit(hits, 'sad woman crying close up', new Set()).id, 2);
  assert.equal(pickSceneHit(hits, 'sad woman crying close up', new Set([2])).id, 3);
});

test('réponse du modèle : requêtes en anglais, invalides remplacées par null', () => {
  const plan = parseBriefPlan('Voici : ["Sad woman crying close up", "man laughing", 42]', 3);
  assert.deepEqual(plan.queries, ['sad woman crying close up', 'man laughing', null]);
  assert.deepEqual(plan.mediaIds, [null, null, null]);
  assert.deepEqual(parseBriefPlan('pas de tableau', 2).queries, [null, null]);
});

test('un média personnel n’est retenu que s’il existe dans la liste envoyée', () => {
  const id = '3f2a9c1e-1111-4222-8333-444455556666';
  const raw = `[{"query": "sad woman crying", "media": "${id}"}, {"query": "city rain", "media": "inventé"}]`;
  const plan = parseBriefPlan(raw, 2, [id]);
  assert.deepEqual(plan.mediaIds, [id, null]);
  assert.deepEqual(plan.queries, ['sad woman crying', 'city rain']);
});

test('requête nettoyée : accents, ponctuation et six mots au maximum', () => {
  assert.equal(sanitizeQuery('Femme qui pleure, « très triste » !!'), 'femme qui pleure tres triste');
  assert.equal(sanitizeQuery('one two three four five six seven'), 'one two three four five six');
});
