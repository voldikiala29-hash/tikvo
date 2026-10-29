import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clipCountFor,
  estimateWords,
  hookFramesFor,
  planSegments,
  splitWords,
  wordsFromBoundaries,
} from '../../src/video-engine/timeline.ts';

test('splitWords garde accents, apostrophes et tirets, retire les emojis', () => {
  assert.deepEqual(splitWords("Arrête d’acheter 50 pantalons ! 🚀 C'est vraiment peut-être génial."), [
    'Arrête',
    'd’acheter',
    '50',
    'pantalons',
    "C'est",
    'vraiment',
    'peut-être',
    'génial',
  ]);
});

test('wordsFromBoundaries : événements par mot', () => {
  const events = [
    { offsetSec: 0.1, durationSec: 0.4, text: 'Bonjour' },
    { offsetSec: 0.5, durationSec: 0.3, text: 'tout' },
    { offsetSec: 0.8, durationSec: 0.4, text: 'le' },
    { offsetSec: 1.2, durationSec: 0.5, text: 'monde' },
  ];
  const words = wordsFromBoundaries(events, 'Bonjour tout le monde', 2);
  assert.equal(words.length, 4);
  assert.equal(words[0].startFrame, 3);
  assert.equal(words[1].startFrame, 15);
  // continuité : chaque mot finit juste avant le suivant
  assert.equal(words[0].endFrame, words[1].startFrame - 1);
  assert.ok(words[3].endFrame > words[3].startFrame);
});

test('wordsFromBoundaries : événements par phrase répartis par mot', () => {
  const events = [{ offsetSec: 0, durationSec: 3, text: 'Un deux trois quatre' }];
  const words = wordsFromBoundaries(events, '', 3);
  assert.equal(words.length, 4);
  for (let i = 1; i < words.length; i++) assert.ok(words[i].startFrame > words[i - 1].startFrame);
  assert.ok(words[3].endFrame <= 3 * 30 + 1);
});

test('wordsFromBoundaries : sans événement, répartit le script sur la durée audio', () => {
  const words = wordsFromBoundaries([], 'Voici un script de test complet', 4);
  assert.equal(words.length, 6);
  assert.ok(words[0].startFrame >= 4);
  assert.ok(words[5].endFrame <= 4 * 30);
});

test('hookFramesFor reste entre 2 s et 5 s', () => {
  const words = estimateWords('Stop ! Arrête tout de suite ce geste. Voici la suite du script complet.');
  const frames = hookFramesFor('Stop ! Arrête tout de suite ce geste.', words);
  assert.ok(frames >= 60 && frames <= 150, String(frames));
  assert.equal(hookFramesFor('', words), 90);
});

test('clipCountFor et planSegments', () => {
  assert.equal(clipCountFor(5), 3);
  assert.equal(clipCountFor(30), 8);
  assert.equal(clipCountFor(200), 12);
  const seg = planSegments(1000, 3);
  assert.deepEqual(
    seg.map((s) => s.durationInFrames),
    [333, 333, 334],
  );
  assert.equal(seg.reduce((a, s) => a + s.durationInFrames, 0), 1000);
  assert.deepEqual(
    seg.map((s) => s.from),
    [0, 333, 666],
  );
});
