import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REEL_DEFAULTS,
  REEL_DURATION_FRAMES,
  REEL_SCENES,
  gridSkills,
  hookHighlight,
  totalPrice,
} from '../../src/video-engine/reel/props.ts';

test('reel : 45 s à 30 i/s, segments contigus et sans trou', () => {
  assert.equal(REEL_DURATION_FRAMES, 1350);
  let cursor = 0;
  for (const scene of REEL_SCENES) {
    assert.equal(scene.from, cursor, `trou avant ${scene.name}`);
    cursor += scene.durationInFrames;
  }
  assert.equal(cursor, REEL_DURATION_FRAMES);
});

test('reel : la solution affiche au plus 11 skills', () => {
  assert.equal(gridSkills(Array.from({ length: 20 }, (_, i) => `s${i}`)).length, 11);
  assert.equal(gridSkills(['a', 'b']).length, 2);
});

test('reel : mot-clé de l’accroche et total des prix', () => {
  assert.deepEqual(hookHighlight('Tes outils IA coûtent une fortune.'), { before: 'Tes outils IA coûtent une', keyword: 'fortune' });
  assert.equal(totalPrice(REEL_DEFAULTS.priceItems), 93);
});

import { parseReel } from '../../src/video-engine/reel/parse.ts';

const goodJson = JSON.stringify({
  hook: 'Tu paies trop pour tes outils IA',
  priceItems: [{ name: 'Rédaction', price: 29 }, { name: 'Design', price: 15 }],
  appName: 'Notion',
  ctaKeyword: 'REPLICA',
  skills: Array.from({ length: 13 }, (_, i) => `Fonction ${i}`),
});

test('reel : sortie du modèle validée, grille limitée à 11 skills', () => {
  const props = parseReel(goodJson);
  assert.equal(props.skills.length, 11);
  assert.equal(props.skills[0], 'fonction-0');
  assert.equal(props.voiceOverUrl, '');
  assert.equal(props.ctaKeyword, 'REPLICA');
});

test('reel : refuse un mot-clé non alphabétique ou un prix hors limites', () => {
  assert.throws(() => parseReel(goodJson.replace('REPLICA', 'REPLICA2')));
  assert.throws(() => parseReel(goodJson.replace('"price":29', '"price":-4')));
});
