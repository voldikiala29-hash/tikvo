import test from 'node:test';
import assert from 'node:assert/strict';
import { NICHE_VOICE, VOICES, VOICE_STYLES, resolveVoice } from '../../src/video-engine/voices.ts';
import * as workerVoices from '../../worker/src/voices.ts';
import { chunkAt, chunkCaptions } from '../../src/video-engine/captions.ts';
import { resolveRenderSettings } from '../../src/video-engine/montage.ts';

test('chaque niche a sa voix et son style par défaut', () => {
  // Les 12 niches du catalogue (programGenerator.ts n'est pas importable sous Node : import sans extension).
  const nicheIds = ['mode', 'fitness', 'business', 'crypto', 'motivation', 'cuisine', 'voyage', 'tech', 'beaute', 'musique', 'sport', 'humour'];
  assert.equal(Object.keys(NICHE_VOICE).length, nicheIds.length);
  for (const id of nicheIds) {
    const entry = NICHE_VOICE[id];
    assert.ok(entry, `pas de voix pour ${id}`);
    assert.ok(VOICES.some((v) => v.id === entry.voice), `voix inconnue pour ${id}`);
    assert.ok(VOICE_STYLES.some((s) => s.id === entry.style), `style inconnu pour ${id}`);
  }
  const used = new Set(Object.values(NICHE_VOICE).map((v) => v.voice));
  assert.ok(used.size >= 4, 'les niches doivent avoir des voix différentes');
});

test('la voix choisie prime, sinon celle de la niche', () => {
  assert.equal(resolveVoice('business', 'fr-FR-DeniseNeural').voice, 'fr-FR-DeniseNeural');
  assert.equal(resolveVoice('business').voice, NICHE_VOICE.business.voice);
  assert.equal(resolveVoice('inconnue', 'voix-fausse').voice, 'fr-FR-VivienneMultilingualNeural');
  const r = resolveVoice('fitness', null, 'energique');
  assert.equal(r.style, 'energique');
  assert.equal(r.pitch, '+4Hz');
});

test('la copie du Worker reste identique au catalogue du site', () => {
  assert.deepEqual(workerVoices.VOICES, VOICES);
  assert.deepEqual(workerVoices.VOICE_STYLES, VOICE_STYLES);
  assert.deepEqual(workerVoices.NICHE_VOICE, NICHE_VOICE);
});

test('réglages : voix et style absents = niche, valeurs valides conservées', () => {
  assert.equal(resolveRenderSettings({}).voice, null);
  assert.equal(resolveRenderSettings({ voice: 'fr-FR-HenriNeural', voiceStyle: 'pose' }).voiceStyle, 'pose');
  assert.equal(resolveRenderSettings({ voice: 'hack', voiceStyle: 'hack' }).voice, null);
});

test('sous-titres : groupes courts, coupés aux fins de phrase', () => {
  const words = 'Le bitcoin baisse. Pourquoi maintenant ? On regarde les chiffres ensemble aujourd’hui'.split(' ');
  const chunks = chunkCaptions(words);
  // Chaque mot appartient à un seul groupe, sans trou.
  assert.equal(chunks[0].first, 0);
  assert.equal(chunks[chunks.length - 1].last, words.length - 1);
  for (let i = 1; i < chunks.length; i++) assert.equal(chunks[i].first, chunks[i - 1].last + 1);
  // Une fin de phrase ferme le groupe.
  assert.equal(chunks[0].last, 2);
  for (const c of chunks) {
    assert.ok(c.last - c.first + 1 <= 6);
  }
  assert.deepEqual(chunkAt(chunks, 3), chunks[1]);
});

test('sous-titres : un long texte sans ponctuation est tout de même découpé', () => {
  const words = Array.from({ length: 20 }, () => 'mot');
  const chunks = chunkCaptions(words);
  assert.ok(chunks.length >= 4);
  assert.equal(chunkCaptions([]).length, 0);
});
