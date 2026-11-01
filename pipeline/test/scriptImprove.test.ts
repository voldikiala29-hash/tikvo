import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptImproved, cleanImproved, improvePrompt } from '../../worker/src/scriptImprove.ts';

const original = 'Les plus anciennes chaussures ont environ dix mille ans. Nos ancêtres marchaient pieds nus sur la neige.';

test('version améliorée acceptée si elle garde la longueur et le format', () => {
  const candidate = 'Tes chaussures ont dix mille ans.\nAvant elles, nos ancêtres marchaient pieds nus sur la neige.';
  assert.equal(acceptImproved(original, candidate), candidate);
});

test('refusée : trop longue ou trop courte', () => {
  assert.equal(acceptImproved(original, 'Court.\nTrop.'), null);
  const long = Array.from({ length: 40 }, () => 'mot').join(' ') + '.\nDeux.';
  assert.equal(acceptImproved(original, long), null);
});

test('refusée : emoji, hashtag, ou plus de 8 lignes', () => {
  assert.equal(acceptImproved(original, 'Chaussures 👟 dix mille ans.\nPieds nus sur la neige.'), null);
  assert.equal(acceptImproved(original, 'Chaussures #mode dix mille ans.\nPieds nus sur la neige.'), null);
  const nine = Array.from({ length: 9 }, (_, i) => `ligne numéro ${i} ici.`).join('\n');
  assert.equal(acceptImproved(original, nine), null);
});

test('nettoyage : préfixe « script : » et balises retirés', () => {
  assert.equal(cleanImproved('```\nScript : Ligne un.\nLigne deux.\n```'), 'Ligne un.\nLigne deux.');
});

test('prompt : garde les faits, accroche forte, lignes filmables', () => {
  const prompt = improvePrompt(original, 'mode');
  assert.match(prompt, /mêmes faits/);
  assert.match(prompt, /accroche/);
  assert.match(prompt, /filmer/);
});
