import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQueries, pickVariant, toCandidate, type PixabayHit } from '../stock.ts';

const v = (width: number, height: number) => ({ url: `https://cdn/${width}x${height}.mp4`, width, height });

test('pickVariant préfère la plus grande variante en portrait', () => {
  const hit: PixabayHit = { id: 1, duration: 8, videos: { large: v(1080, 1920), medium: v(720, 1280), tiny: v(360, 640) } };
  assert.equal(pickVariant(hit)?.width, 1080);
});

test('pickVariant retombe sur une variante disponible', () => {
  assert.equal(pickVariant({ id: 2, videos: { tiny: v(360, 640) } })?.width, 360);
  assert.equal(pickVariant({ id: 3, videos: {} }), null);
});

test('toCandidate écarte les clips trop courts ou sans fichier', () => {
  assert.equal(toCandidate({ id: 4, duration: 1, videos: { large: v(1080, 1920) } }), null);
  assert.equal(toCandidate({ id: 5, duration: 9, videos: {} }), null);
  assert.equal(toCandidate({ id: 6, duration: 9, user: 'Ana', videos: { large: v(1080, 1920) } })?.credit, 'Ana');
});

test('buildQueries met les requêtes de la niche en premier, sans doublon', () => {
  const q = buildQueries('mode', ['Mode', 'fashion outfit']);
  assert.equal(q[0], 'fashion outfit');
  assert.equal(new Set(q).size, q.length);
  assert.ok(buildQueries('inconnue', []).includes('aesthetic lifestyle'));
});
