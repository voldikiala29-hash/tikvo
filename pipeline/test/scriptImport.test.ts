import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScriptPaste } from '../../src/services/scriptImport.ts';

const SAMPLE = `Format: 9:16, face cam + 2 cuts tenues
Audio: son TikTok phonk / afro trending sans parole, ou ta voix en x1.2

0:00 - 0:02 HOOK - tu bloques le scroll:
Toi face cam, très proche:
"Tu fais 1m60 mais tu veux paraître 1m73? Fais juste ça."
Texte à l'écran en GROS: 1m60 -> 1m73 ?

0:02 - 0:08 LA RÈGLE D'OR - la transfo:
Cut 1: tu montres l'erreur (tenue coupée cheville + gros contraste haut/bas)
Cut 2: tu montres la correction direct

Voix off:
"1. Un seul bloc de couleur, 2. Taille haute rentrée, 3. Chaussure qui prolonge ta jambe. Pas de coupure à la cheville."`;

test('script complet : voix off = ce qui est dit, dans l’ordre', () => {
  const s = parseScriptPaste(SAMPLE);
  assert.equal(s.voiceover, 'Tu fais 1m60 mais tu veux paraître 1m73? Fais juste ça.\n1. Un seul bloc de couleur, 2. Taille haute rentrée, 3. Chaussure qui prolonge ta jambe. Pas de coupure à la cheville.');
});

test('format, audio, texte à l’écran et indications de tournage sont séparés', () => {
  const s = parseScriptPaste(SAMPLE);
  assert.equal(s.format, '9:16, face cam + 2 cuts tenues');
  assert.match(s.audio ?? '', /phonk/);
  assert.deepEqual(s.onScreen, ['1m60 -> 1m73 ?']);
  assert.ok(s.shots.some((l) => l.startsWith('Cut 1')));
  assert.ok(s.shots.some((l) => l.startsWith('Cut 2')));
  assert.ok(!s.shots.some((l) => l.includes('Fais juste ça')), 'la parole n’est pas une indication de tournage');
});

test('texte sans structure : tout devient la voix off', () => {
  const s = parseScriptPaste('Bois de l’eau le matin.\nTu verras la différence.');
  assert.equal(s.voiceover, 'Bois de l’eau le matin.\nTu verras la différence.');
});
