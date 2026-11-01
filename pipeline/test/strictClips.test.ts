import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSceneHit } from '../scenes.ts';

const hits = [
  { id: 1, tags: 'kitchen, coffee, morning' },
  { id: 2, tags: 'woman, crying, sad, tears' },
  { id: 3, tags: 'city, traffic, night' },
];

test('clip accepté seulement si la moitié des mots utiles est dans les tags', () => {
  // « sad woman crying close » : 4 mots utiles, il en faut 2 dans les tags.
  assert.equal(pickSceneHit(hits, 'sad woman crying close', new Set())?.id, 2);
});

test('aucun clip hors sujet : un seul mot en commun ne suffit pas', () => {
  assert.equal(pickSceneHit(hits, 'mountain sunrise drone shot', new Set()), null);
});

test('un clip déjà utilisé n\'est pas repris', () => {
  assert.equal(pickSceneHit(hits, 'sad woman crying close', new Set([2])), null);
});
