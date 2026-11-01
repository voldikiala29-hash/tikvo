import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStory, parseSubjects, storyPrompt, SUBJECT_FALLBACK } from '../../worker/src/story.ts';

const hero = (id: string, name: string) => ({
  id,
  name,
  hair: 'court',
  hairColor: '#2B2B2B',
  shirt: '#E6EEF8',
  tie: '#D62B2B',
  glasses: false,
  voice: { gender: 'm', age: 'adulte' },
});

const scene = (over: Record<string, unknown> = {}) => ({
  set: 'bureau',
  seconds: 5,
  narration: 'Il arrive au bureau un lundi matin.',
  lines: [],
  ...over,
});

const story = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    title: 'Une fiche de paie étrange',
    hook: 'Il regarde sa fiche de paie et tombe des nues.',
    characters: [hero('employe', 'Karim'), hero('patron', 'Monsieur Dubois')],
    scenes: [scene(), scene({ set: 'couloir', seconds: 6, narration: 'Il court jusqu’au couloir.', lines: [{ speaker: 'patron', text: 'Qu’est-ce que vous faites là ?', expression: 'colere' }] })],
    ...over,
  });

test('histoire valide : mode narrateur accepté et normalisé', () => {
  const s = parseStory(story(), 'narrator');
  assert.equal(s.mode, 'narrator');
  assert.equal(s.characters.length, 2);
  assert.equal(s.scenes[1].lines[0].expression, 'colere');
});

test('réponse entourée de texte et de balises de code : tolérée', () => {
  const raw = '```json\n' + story() + '\n```\nVoilà.';
  assert.equal(parseStory(raw, 'narrator').title, 'Une fiche de paie étrange');
});

test('mode dialogues : narration interdite', () => {
  assert.throws(() => parseStory(story(), 'dialogue'), /narration interdite/);
});

test('mode narrateur : pas de réplique du narrateur acceptée en mode dialogues', () => {
  const raw = story({ scenes: [scene({ narration: undefined, lines: [{ speaker: 'narrator', text: 'Il sourit.', expression: 'content' }] }), scene({ lines: [{ speaker: 'patron', text: 'Bonjour.', expression: 'neutre' }] })] });
  assert.throws(() => parseStory(raw, 'dialogue'), /pas de narrateur/);
});

test('locuteur inconnu refusé', () => {
  const raw = story({ scenes: [scene({ lines: [{ speaker: 'inconnu', text: 'Bonjour.', expression: 'neutre' }] }), scene()] });
  assert.throws(() => parseStory(raw, 'both'), /locuteur inconnu/);
});

test('durée totale hors bornes refusée', () => {
  const raw = story({ scenes: [scene({ seconds: 2 }), scene({ seconds: 3 })] });
  assert.throws(() => parseStory(raw, 'narrator'), /Durée totale/);
});

test('couleur invalide et identifiant en double refusés', () => {
  assert.throws(() => parseStory(story({ characters: [{ ...hero('employe', 'A'), shirt: 'rouge' }, hero('patron', 'B')] }), 'narrator'), /couleur du vêtement/);
  assert.throws(() => parseStory(story({ characters: [hero('employe', 'A'), hero('employe', 'B')] }), 'narrator'), /en double/);
});

test('une scène vide (ni narration ni réplique) refusée', () => {
  const raw = story({ scenes: [scene({ narration: undefined }), scene()] });
  assert.throws(() => parseStory(raw, 'narrator'), /narration ou réplique attendue/);
});

test('prompt : le texte fourni est repris tel quel en mode script', () => {
  const p = storyPrompt({ source: 'script', script: 'Phrase fournie par moi.', mode: 'narrator' });
  assert.match(p, /Phrase fournie par moi\./);
  assert.match(p, /ne les réécris pas/);
});

test('sujets : liste lue, entrées trop courtes écartées, repli si réponse inutilisable', () => {
  // « Trop court » (10 caractères) reste valide : 4 sujets, ceux de moins de 8 caractères sont écartés.
  assert.equal(parseSubjects('["Un employé perd ses clés au travail","Une équipe découvre un colis","Trop court","Le chef annonce une fête","ok"]').length, 4);
  assert.deepEqual(parseSubjects('pas du json'), SUBJECT_FALLBACK);
  assert.deepEqual(parseSubjects('["seulement un"]'), SUBJECT_FALLBACK);
});
