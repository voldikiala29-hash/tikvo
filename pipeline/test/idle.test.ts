import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idleFor } from '../../src/video-engine/cartoon/idle.ts';

test('idle : le personnage cligne environ une fois toutes les 3,6 s', () => {
  const frames = Array.from({ length: 36 * 10 }, (_, k) => idleFor(k / 10, 0).blink);
  const blinks = frames.filter(Boolean).length;
  // 36 s échantillonnées au pas de 0,1 s = 10 cycles de 3,6 s : un clignement par cycle.
  assert.ok(blinks >= 9 && blinks <= 11, `clignements : ${blinks}`);
});

test('idle : respiration et balancement bornés, et différents selon le personnage', () => {
  for (let k = 0; k < 200; k++) {
    const a = idleFor(k * 0.05, 0);
    assert.ok(a.breath >= -1 && a.breath <= 1);
    assert.ok(a.sway >= -1 && a.sway <= 1);
    assert.ok(a.armSway >= -1 && a.armSway <= 1);
  }
  assert.notEqual(idleFor(1, 0).breath, idleFor(1, 1).breath);
});
