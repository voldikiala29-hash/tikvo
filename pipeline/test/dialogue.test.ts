import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heroVoice, placeSpoken, speakerAt, FEMALE_VOICES, MALE_VOICES } from '../../src/video-engine/cartoon/dialogue.ts';
import { poseFor, REST_POSE } from '../../src/video-engine/cartoon/poses.ts';

test('voix : deux héros du même genre ont des voix différentes', () => {
  const a = heroVoice({ voice: { gender: 'm', age: 'adulte' } }, 0);
  const b = heroVoice({ voice: { gender: 'm', age: 'adulte' } }, 1);
  assert.notEqual(a.voice, b.voice);
  assert.ok(MALE_VOICES.includes(a.voice) && MALE_VOICES.includes(b.voice));
  assert.ok(FEMALE_VOICES.includes(heroVoice({ voice: { gender: 'f', age: 'jeune' } }, 0).voice));
  assert.equal(heroVoice({ voice: { gender: 'f', age: 'jeune' } }, 0).rate, '+10%');
});

const ev = (text: string) => [{ offsetSec: 0, durationSec: 0.3, text }];

test('calage : répliques en séquence, scènes contiguës, durée minimale respectée', () => {
  const t = placeSpoken(
    [
      { speaker: 'narrator', sceneIndex: 0, text: 'Il arrive.', expression: 'neutre', audioSec: 1, events: ev('Il') },
      { speaker: 'patron', sceneIndex: 1, text: 'Bonjour.', expression: 'colere', audioSec: 1, events: ev('Bonjour') },
    ],
    [0.5, 4],
  );
  assert.equal(t.sceneWindows[0].from, 0);
  assert.equal(t.sceneWindows[1].from, t.sceneWindows[0].durationInFrames);
  assert.equal(t.sceneWindows[1].durationInFrames, 4 * 30);
  assert.equal(t.totalFrames, t.sceneWindows[1].from + t.sceneWindows[1].durationInFrames);
  assert.equal(t.items[1].startFrame >= t.sceneWindows[1].from, true);
});

test('calage : une réplique plus longue que la scène prolonge la scène', () => {
  const t = placeSpoken([{ speaker: 'narrator', sceneIndex: 0, text: 'Long.', expression: 'neutre', audioSec: 6, events: ev('Long') }], [2]);
  assert.ok(t.sceneWindows[0].durationInFrames >= 6 * 30);
});

test('locuteur actif retrouvé à partir de la frame', () => {
  const t = placeSpoken(
    [
      { speaker: 'narrator', sceneIndex: 0, text: 'Un.', expression: 'neutre', audioSec: 1, events: ev('Un') },
      { speaker: 'patron', sceneIndex: 0, text: 'Deux.', expression: 'neutre', audioSec: 1, events: ev('Deux') },
    ],
    [1],
  );
  assert.equal(speakerAt(t.items, 5), 'narrator');
  assert.equal(speakerAt(t.items, t.items[1].startFrame + 3), 'patron');
  assert.equal(speakerAt(t.items, t.totalFrames + 100), null);
});

test('gestes : pose de repos sans geste, bras levés et larmes selon le geste', () => {
  assert.deepEqual(poseFor('immobile', 1), REST_POSE);
  assert.ok(poseFor('lever-bras', 1).armRight > 150);
  assert.equal(poseFor('pleurer', 0.2).tears, true);
  assert.ok(poseFor('sauter', 0.35).bodyY < 0);
});

import { visemeOpen } from '../../src/video-engine/cartoon/lipsync.ts';

test('bouche : voyelles ouvertes plus grandes que les fermées, mot sans voyelle au repos', () => {
  assert.ok(visemeOpen('oh') > visemeOpen('idée'));
  assert.ok(visemeOpen('mouche') > 0.5);
  assert.equal(visemeOpen('brr'), 0.2);
  assert.ok(visemeOpen('a') <= 1 && visemeOpen('i') >= 0.15);
});
