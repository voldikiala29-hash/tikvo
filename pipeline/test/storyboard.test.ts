import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SHOTS, parseStoryboard, planShotSeconds } from '../../src/video-engine/storyboard.ts';
import { pickSceneHit, shotWindows } from '../scenes.ts';

test('parse : préfixe, durée et description', () => {
  const { shots, errors } = parseStoryboard('Plan 1 | 4 s | femme qui pleure dans la cuisine\n2. billets sur une table, 2,5 sec\n- coucher de soleil');
  assert.deepEqual(errors, []);
  assert.deepEqual(shots, [
    { text: 'femme qui pleure dans la cuisine', seconds: 4 },
    { text: 'billets sur une table,', seconds: 2.5 },
    { text: 'coucher de soleil', seconds: null },
  ]);
});

test('parse : une durée hors bornes ou un plan vide est signalé', () => {
  const { errors } = parseStoryboard('Plan 1 | 30 s | une ville\nPlan 2 | 3 s |  ');
  assert.equal(errors.length, 2);
  assert.match(errors[0], /entre 1 et 15/);
  assert.match(errors[1], /décris/);
});

test('parse : trop de plans signalé, et lignes vides ignorées', () => {
  const raw = Array.from({ length: MAX_SHOTS + 1 }, (_, i) => `plan ${i} vue numéro ${i}`).join('\n\n');
  const { shots, errors } = parseStoryboard(raw);
  assert.equal(shots.length, MAX_SHOTS + 1);
  assert.ok(errors.some((e) => e.includes(`${MAX_SHOTS} plans`)));
});

test('répartition : les durées demandées couvrent exactement la voix', () => {
  const seconds = planShotSeconds([{ seconds: 4 }, { seconds: 2 }, { seconds: null }], 18);
  assert.equal(seconds.reduce((a, b) => a + b, 0).toFixed(6), '18.000000');
  // 4 : 2 : 3 (défaut) → proportions gardées
  assert.ok(Math.abs(seconds[0] / seconds[1] - 2) < 1e-9);
});

test('fenêtres : sans clip trop court, chaque plan garde sa durée', () => {
  const { windows, kept } = shotWindows([4, 3, 3], [10, 10, 10], 300, 30);
  assert.deepEqual(kept, [0, 1, 2]);
  assert.deepEqual(windows.map((w) => w.durationInFrames), [120, 90, 90]);
  assert.equal(windows[2].from + windows[2].durationInFrames, 300);
});

test('fenêtres : un clip trop court se termine tôt, le temps passe au plan suivant', () => {
  // Plan 1 veut 4 s mais son clip ne dure que 1 s : 3 s reportées sur le plan 2.
  const { windows } = shotWindows([4, 3, 3], [1, 10, 10], 300, 30);
  assert.equal(windows[0].durationInFrames, 30);
  assert.equal(windows[1].from, 30);
  assert.equal(windows[0].durationInFrames + windows[1].durationInFrames + windows[2].durationInFrames, 300);
});

test('fenêtres : un plan sans clip cède son temps au suivant, une image fixe ne se raccourcit pas', () => {
  const { windows, kept } = shotWindows([3, 3, 4], [null, Number.POSITIVE_INFINITY, 2], 300, 30);
  assert.deepEqual(kept, [1, 2]);
  assert.equal(windows[0].from, 0);
  assert.equal(windows[0].durationInFrames + windows[1].durationInFrames, 300);
  // Image : 3 s (plan 1 sans clip) + 3 s = 180 images ; le plan 3 (clip de 2 s) reçoit le reliquat, 120 images.
  assert.equal(windows[0].durationInFrames, 180);
});

test('choix : à pertinence égale, un plan assez long passe avant un plan trop court', () => {
  const hits = [
    { id: 1, tags: 'femme cuisine', duration: 2 },
    { id: 2, tags: 'femme cuisine', duration: 9 },
  ];
  assert.equal(pickSceneHit(hits, 'femme cuisine', new Set(), 4)?.id, 2);
  // Sans exigence de durée, le premier reste choisi.
  assert.equal(pickSceneHit(hits, 'femme cuisine', new Set())?.id, 1);
});

test('choix : un plan trop court reste utilisable si aucun n’est assez long', () => {
  const hits = [{ id: 1, tags: 'femme cuisine', duration: 2 }];
  assert.equal(pickSceneHit(hits, 'femme cuisine', new Set(), 8)?.id, 1);
});
