import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScriptsJson, parseScriptRequest, validateScript } from '../../worker/src/scriptParse.ts';

const good = { hook: 'Ton smartphone te ment', phrase1: 'Ouvre les réglages.', phrase2: 'Coupe les notifications.', cta: 'Abonne-toi.', pexelsQuery: 'Smartphone Typing' };

test('valide un script complet et normalise la requête', () => {
  assert.equal(validateScript(good)?.pexelsQuery, 'smartphone typing');
});

test('rejette un script incomplet ou trop long', () => {
  assert.equal(validateScript({ ...good, phrase2: '' }), null);
  assert.equal(validateScript({ ...good, hook: 'mot '.repeat(20) }), null);
});

test('requête hors anglais : écartée sans rejeter le script', () => {
  assert.equal(validateScript({ ...good, pexelsQuery: 'téléphone' })?.pexelsQuery, '');
});

test('extrait le JSON même entouré de texte', () => {
  const raw = `Voici :\n[${JSON.stringify(good)}, {"hook": ""}]\nBonne chance`;
  assert.equal(parseScriptsJson(raw).length, 1);
});

test('réponse non JSON : liste vide, pas d’exception', () => {
  assert.deepEqual(parseScriptsJson('désolé, je ne peux pas'), []);
});

test('valide la requête : niches et durées autorisées', () => {
  assert.deepEqual(parseScriptRequest({ niches: ['tech'], duration: 21 }), { niches: ['tech'], duration: 21 });
  assert.throws(() => parseScriptRequest({ niches: ['tech'], duration: 30 }));
  assert.throws(() => parseScriptRequest({ niches: ['Tech!'], duration: 21 }));
  assert.throws(() => parseScriptRequest({ niches: ['a', 'b', 'c', 'd'], duration: 21 }));
});
