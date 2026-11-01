import test from 'node:test';
import assert from 'node:assert/strict';
import { alignedWords, wordsFromBoundaries } from '../../src/video-engine/timeline.ts';
import { sceneWindows, splitScenes } from '../scenes.ts';

// La voix lit « 5 » en « cinq » : sans alignement, tous les mots suivants décalent.
const script = 'Tu fais 5 erreurs le matin. Elle pleure devant son miroir.';
const spoken = [
  { offsetSec: 0.0, durationSec: 0.2, text: 'Tu' },
  { offsetSec: 0.2, durationSec: 0.2, text: 'fais' },
  { offsetSec: 0.4, durationSec: 0.3, text: 'cinq' },
  { offsetSec: 0.7, durationSec: 0.3, text: 'erreurs' },
  { offsetSec: 1.0, durationSec: 0.2, text: 'le' },
  { offsetSec: 1.2, durationSec: 0.3, text: 'matin' },
  { offsetSec: 1.6, durationSec: 0.3, text: 'Elle' },
  { offsetSec: 1.9, durationSec: 0.3, text: 'pleure' },
  { offsetSec: 2.2, durationSec: 0.3, text: 'devant' },
  { offsetSec: 2.5, durationSec: 0.3, text: 'son' },
  { offsetSec: 2.8, durationSec: 0.3, text: 'miroir' },
];

test('alignement : même nombre de mots que le script, avec le texte écrit', () => {
  const words = alignedWords(spoken, script, 3.2);
  assert.equal(words.length, 11);
  assert.equal(words[2].word, '5');
  assert.equal(words[10].word, 'miroir');
});

test('alignement : un mot lu autrement ne décale pas les mots suivants', () => {
  const words = alignedWords(spoken, script, 3.2);
  // « Elle » (index 7 du script) doit tomber sur le moment où la voix dit « Elle » (1.6 s = 48 images).
  assert.equal(words[6].startFrame, 48);
  assert.equal(words[7].startFrame, Math.round(1.9 * 30));
});

test('alignement : la phrase 2 commence au moment où elle est prononcée', () => {
  const lines = splitScenes(script.replace('. Elle', '.\nElle'));
  assert.equal(lines.length, 2);
  const words = alignedWords(spoken, script, 3.2);
  const [second] = sceneWindows(lines, words, 120).slice(1);
  assert.equal(second.from, 48);
});

test('alignement : sans timings de la voix, répartition identique au comportement précédent', () => {
  const plain = wordsFromBoundaries([], script, 4);
  const aligned = alignedWords([], script, 4);
  assert.deepEqual(aligned.map((w) => w.word), plain.map((w) => w.word));
  assert.equal(aligned[5].startFrame, plain[5].startFrame);
});
