import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySourceUrl } from '../../worker/src/inspirationRules.ts';

test('accepte TikTok, YouTube et Facebook en https', () => {
  assert.equal(classifySourceUrl('https://www.tiktok.com/@ana/video/123')?.platform, 'tiktok');
  assert.equal(classifySourceUrl('https://youtu.be/abc')?.platform, 'youtube');
  assert.equal(classifySourceUrl('https://m.facebook.com/page/videos/1')?.platform, 'facebook');
});

test('refuse les autres sites, le http et les liens malformés', () => {
  assert.equal(classifySourceUrl('https://example.com/video'), null);
  assert.equal(classifySourceUrl('http://www.youtube.com/watch?v=1'), null);
  assert.equal(classifySourceUrl('pas un lien'), null);
  assert.equal(classifySourceUrl(''), null);
  assert.equal(classifySourceUrl(42), null);
});

test('refuse un lien trop long', () => {
  assert.equal(classifySourceUrl('https://www.youtube.com/watch?v=' + 'a'.repeat(600)), null);
});
