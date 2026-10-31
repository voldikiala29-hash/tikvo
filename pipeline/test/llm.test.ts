import test from 'node:test';
import assert from 'node:assert/strict';
import { callProvider, extractChatText, providerChain } from '../../worker/src/llm.ts';

test('ordre des fournisseurs : seuls ceux qui ont une clé sont essayés', () => {
  assert.deepEqual(providerChain({}), []);
  const names = providerChain({ OPENROUTER_API_KEY: 'x', GROQ_API_KEY: 'y' }).map((p) => p.name);
  assert.deepEqual(names, ['groq', 'openrouter']);
  assert.equal(providerChain({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'mon-modele' })[0].model, 'mon-modele');
});

test('texte extrait d’une réponse « chat completions »', () => {
  assert.equal(extractChatText({ choices: [{ message: { content: '[1]' } }] }), '[1]');
  assert.equal(extractChatText({ choices: [] }), null);
  assert.equal(extractChatText({ choices: [{ message: { content: '  ' } }] }), null);
  assert.equal(extractChatText(null), null);
});

test('un quota atteint (HTTP 429) lève une erreur pour passer au fournisseur suivant', async () => {
  const provider = providerChain({ GROQ_API_KEY: 'k' })[0];
  const fakeFetch = (async () => new Response('limit', { status: 429 })) as unknown as typeof fetch;
  await assert.rejects(callProvider(provider, [{ role: 'user', content: 'bonjour' }], 50, 1000, fakeFetch), /HTTP 429/);
});

test('réponse valide : le texte est renvoyé', async () => {
  const provider = providerChain({ GROQ_API_KEY: 'k' })[0];
  const fakeFetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: 'salut' } }] }), { status: 200 })) as unknown as typeof fetch;
  assert.equal(await callProvider(provider, [{ role: 'user', content: 'bonjour' }], 50, 1000, fakeFetch), 'salut');
});
