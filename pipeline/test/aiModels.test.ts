import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYZE_MODEL,
  DEFAULT_TEXT_MODELS,
  TTS_MODEL,
  audioFromOutput,
  dedupe,
  extractWorkersAiText,
  parseModelList,
} from '../../worker/src/aiModels.ts';

test('liste par défaut : trois modèles de texte gratuits, glm-5.3-flash écarté (plan payant)', () => {
  assert.deepEqual(DEFAULT_TEXT_MODELS, [
    '@cf/zai-org/glm-4.7-flash',
    '@cf/google/gemma-4-26b-a4b-it',
    '@cf/openai/gpt-oss-120b',
  ]);
  assert.ok(!DEFAULT_TEXT_MODELS.some((m) => m.includes('glm-5')));
});

test('parseModelList : ordre conservé, invalides ignorés, doublons retirés', () => {
  const parsed = parseModelList(' @cf/a/b-1 , pas-un-modele , @cf/a/b-1,@cf/c/d.e ', ['@cf/fallback/x']);
  assert.deepEqual(parsed, ['@cf/a/b-1', '@cf/c/d.e']);
});

test('parseModelList : variable absente ou entièrement invalide → liste de secours', () => {
  assert.deepEqual(parseModelList(undefined, DEFAULT_TEXT_MODELS), [...DEFAULT_TEXT_MODELS]);
  assert.deepEqual(parseModelList('n-importe-quoi', DEFAULT_TEXT_MODELS), [...DEFAULT_TEXT_MODELS]);
});

test('dedupe garde le premier exemplaire', () => {
  assert.deepEqual(dedupe([ANALYZE_MODEL, '@cf/zai-org/glm-4.7-flash', ANALYZE_MODEL]), [ANALYZE_MODEL, '@cf/zai-org/glm-4.7-flash']);
});

test('extractWorkersAiText lit le format natif et le format compatible OpenAI', () => {
  assert.equal(extractWorkersAiText({ response: 'Bonjour' }), 'Bonjour');
  assert.equal(extractWorkersAiText({ choices: [{ message: { content: 'Salut' } }] }), 'Salut');
  assert.equal(extractWorkersAiText('brut'), 'brut');
  assert.equal(extractWorkersAiText({ autre: 1 }), '');
  assert.equal(extractWorkersAiText(null), '');
});

test('audioFromOutput accepte tampon, vue binaire, flux et base64', async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  assert.deepEqual([...(await audioFromOutput(bytes.buffer))], [1, 2, 3, 4]);
  assert.deepEqual([...(await audioFromOutput(bytes))], [1, 2, 3, 4]);
  const stream = new Response(new Uint8Array([9, 8])).body;
  assert.deepEqual([...(await audioFromOutput(stream))], [9, 8]);
  assert.deepEqual([...(await audioFromOutput({ audio: 'data:audio/mpeg;base64,AQID' }))], [1, 2, 3]);
  assert.equal((await audioFromOutput({ rien: true })).byteLength, 0);
});

test('modèles de tâche : voix MeloTTS, analyse gpt-oss-20b', () => {
  assert.equal(TTS_MODEL, '@cf/myshell-ai/melotts');
  assert.equal(ANALYZE_MODEL, '@cf/openai/gpt-oss-20b');
});
