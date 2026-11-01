import test from 'node:test';
import assert from 'node:assert/strict';
import { clampVideoDuration, extractVideoUrl, utcDay, videoRatio } from '../../worker/src/videoRules.ts';

test('durée : 3 s demandées deviennent 4 s (minimum de minimax/h3-lite)', () => {
  assert.equal(clampVideoDuration(3), 4);
  assert.equal(clampVideoDuration('3'), 4);
  assert.equal(clampVideoDuration(undefined), 4);
  assert.equal(clampVideoDuration(NaN), 4);
});

test('durée : bornée à 15 s et arrondie', () => {
  assert.equal(clampVideoDuration(30), 15);
  assert.equal(clampVideoDuration(6.4), 6);
  assert.equal(clampVideoDuration(5), 5);
});

test('format : 9:16 par défaut, formats connus conservés', () => {
  assert.equal(videoRatio('9:16'), '9:16');
  assert.equal(videoRatio('16:9'), '16:9');
  assert.equal(videoRatio('21:9'), '9:16');
  assert.equal(videoRatio(undefined), '9:16');
});

test('extraction de l\'URL vidéo selon le format de réponse', () => {
  assert.equal(extractVideoUrl({ task: { content: { url: 'https://x.example/a.mp4' } } }), 'https://x.example/a.mp4');
  assert.equal(extractVideoUrl({ result: { video: 'https://x.example/b.mp4' } }), 'https://x.example/b.mp4');
  assert.equal(extractVideoUrl({ video: 'https://x.example/c.mp4' }), 'https://x.example/c.mp4');
  assert.equal(extractVideoUrl({ task: { status: 'failed' } }), null);
  assert.equal(extractVideoUrl(null), null);
});

test('jour de quota : date UTC', () => {
  assert.equal(utcDay(new Date('2026-11-01T23:30:00Z')), '2026-11-01');
});
