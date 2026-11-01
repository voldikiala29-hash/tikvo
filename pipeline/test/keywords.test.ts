import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanKeyword, keywordsPrompt, parseKeywords } from '../../worker/src/keywords.ts';
import { buildBriefPrompt } from '../../worker/src/briefs.ts';

test('lecture de la réponse : objet {keywords} au milieu d\'un texte', () => {
  const raw = 'Voici : {"keywords": ["morning routine mistake", "tired woman bed", "alarm clock"]} merci';
  assert.deepEqual(parseKeywords(raw), ['morning routine mistake', 'tired woman bed', 'alarm clock']);
});

test('lecture de la réponse : tableau nu, doublons et mots isolés écartés', () => {
  assert.deepEqual(parseKeywords('["Sad Woman", "sad woman", "phone", "crying woman close up", "x y", "a b"]'), [
    'sad woman',
    'crying woman close up',
    'x y',
  ]);
});

test('lecture de la réponse : au plus 3 mots-clés, texte invalide → liste vide', () => {
  assert.equal(parseKeywords('["a b c", "d e f", "g h i", "j k l"]').length, 3);
  assert.deepEqual(parseKeywords('pas du json'), []);
  assert.deepEqual(parseKeywords('{"keywords": "pas une liste"}'), []);
});

test('nettoyage : accents retirés, ponctuation supprimée, 6 mots au maximum', () => {
  assert.equal(cleanKeyword('Femme qui pleure, à la maison !'), 'femme qui pleure a la maison');
  assert.equal(cleanKeyword('un deux trois quatre cinq six sept'), 'un deux trois quatre cinq six');
  assert.equal(cleanKeyword(42), null);
});

test('prompt : contient le script et demande du JSON', () => {
  const prompt = keywordsPrompt('5 erreurs matinales qui ruinent ta journée');
  assert.match(prompt, /5 erreurs matinales/);
  assert.match(prompt, /"keywords"/);
});

test('plan par phrase : le script complet est ajouté au contexte quand il est fourni', () => {
  const withScript = buildBriefPrompt(['Elle pleure.'], 'drama', [], 'Une femme apprend la nouvelle.');
  assert.match(withScript, /Script complet/);
  assert.match(withScript, /Une femme apprend la nouvelle/);
  const without = buildBriefPrompt(['Elle pleure.'], 'drama', []);
  assert.doesNotMatch(without, /Script complet/);
});
