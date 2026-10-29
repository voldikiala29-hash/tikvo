import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQueries, pickFile } from '../pexels.ts';

const f = (width: number, height: number, type = 'video/mp4') => ({ width, height, file_type: type, link: `https://x/${width}x${height}` });

test('pickFile préfère 1080 de large en portrait et évite la 4K', () => {
  const picked = pickFile([f(540, 960), f(720, 1280), f(1080, 1920), f(2160, 3840), f(1920, 1080)]);
  assert.equal(picked?.width, 1080);
});

test('pickFile retombe sur le meilleur disponible', () => {
  assert.equal(pickFile([f(540, 960), f(360, 640)])?.width, 540);
  assert.equal(pickFile([f(1080, 1920, 'video/webm')]), null);
  assert.equal(pickFile([]), null);
});

test('buildQueries met les requêtes anglaises de la niche en premier, sans doublon', () => {
  const q = buildQueries('mode', ['Mode', 'fashion outfit']);
  assert.equal(q[0], 'fashion outfit');
  assert.equal(new Set(q).size, q.length);
  assert.ok(q.includes('mode'));
  assert.ok(buildQueries('inconnue', []).includes('aesthetic lifestyle'));
});
