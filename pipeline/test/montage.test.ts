import test from 'node:test';
import assert from 'node:assert/strict';
import { ASPECTS, DEFAULT_RENDER_SETTINGS, MONTAGES, clipCountFor, estimateSeconds, resolveRenderSettings } from '../../src/video-engine/montage.ts';

test('six styles de montage, quatre formats', () => {
  assert.equal(MONTAGES.length, 6);
  assert.equal(ASPECTS.length, 4);
});

test('réglages invalides retombent sur les valeurs par défaut', () => {
  assert.deepEqual(resolveRenderSettings({ aspect: '21:9', montage: 'inconnu', clipsPerScript: 7 }), {
    aspect: '9:16',
    montage: 'cinema',
    clipsPerScript: 0,
  });
  assert.equal(resolveRenderSettings({ clipsPerScript: 3 }).clipsPerScript, 3);
});

test('nombre de plans : automatique selon la durée, sinon le choix', () => {
  assert.equal(clipCountFor(12, 0), 3);
  assert.equal(clipCountFor(45, 0), 9);
  assert.equal(clipCountFor(200, 0), 12);
  assert.equal(clipCountFor(45, 5), 5);
});

test('estimation de la durée d’un script', () => {
  const words = Array.from({ length: 28 }, () => 'mot').join(' ');
  assert.equal(Math.round(estimateSeconds(words)), 10);
});

test('Cinéma est le style par défaut, format 9:16', () => {
  assert.deepEqual(DEFAULT_RENDER_SETTINGS, { aspect: '9:16', montage: 'cinema', clipsPerScript: 0 });
});
