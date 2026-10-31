import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_MEDIA_BYTES, cleanDescription, mediaType } from '../../worker/src/mediaRules.ts';

test('formats acceptés : photos et vidéos courantes, rien d’autre', () => {
  assert.deepEqual(mediaType('image/jpeg'), { kind: 'image', ext: 'jpg' });
  assert.deepEqual(mediaType('video/mp4; codecs=avc1'), { kind: 'video', ext: 'mp4' });
  assert.deepEqual(mediaType('video/quicktime'), { kind: 'video', ext: 'mov' });
  assert.equal(mediaType('application/pdf'), null);
  assert.equal(mediaType('image/gif'), null);
});

test('taille maximale : 25 Mo', () => {
  assert.equal(MAX_MEDIA_BYTES, 25 * 1024 * 1024);
});

test('description : espaces réduits, 200 caractères au plus, texte seulement', () => {
  assert.equal(cleanDescription('  femme   qui pleure  '), 'femme qui pleure');
  assert.equal(cleanDescription(42), '');
  assert.equal(cleanDescription('a'.repeat(300)).length, 200);
});
