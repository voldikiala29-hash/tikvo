import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIP_QUERIES, clipQueryFor } from '../../src/services/clipQueries.ts';

test('chaque niche a 30 requêtes distinctes', () => {
  for (const [niche, list] of Object.entries(CLIP_QUERIES)) {
    assert.equal(list.length, 30, niche);
    assert.equal(new Set(list).size, 30, `doublon dans ${niche}`);
  }
});

test('les 3 vidéos d’un même jour ont 3 requêtes différentes', () => {
  // Même numérotation que generateProgram : n = jour × 3 + position de la vidéo.
  for (let day = 0; day < 30; day++) {
    const queries = [0, 1, 2].map((j) => clipQueryFor('business', day * 3 + j));
    assert.equal(new Set(queries).size, 3, `jour ${day} : ${queries.join(' | ')}`);
  }
});

test('la vidéo n utilise la requête n % 30', () => {
  assert.equal(clipQueryFor('business', 0), CLIP_QUERIES.business[0]);
  assert.equal(clipQueryFor('business', 31), CLIP_QUERIES.business[1]);
});
