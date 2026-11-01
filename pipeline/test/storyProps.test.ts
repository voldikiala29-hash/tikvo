import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStory } from '../../src/video-engine/story.ts';
import { placeSpoken } from '../../src/video-engine/cartoon/dialogue.ts';
import { sceneCast, storyCartoonProps } from '../../src/video-engine/cartoon/storyProps.ts';

const hero = (id: string, name: string) => ({ id, name, hair: 'court', hairColor: '#2B2B2B', shirt: '#E6EEF8', glasses: false, voice: { gender: 'm', age: 'adulte' } });

const story = validateStory(
  {
    title: 'Une fiche de paie',
    hook: 'Il ne croit pas ce qu’il lit.',
    mode: 'both',
    characters: [hero('employe', 'Karim'), hero('patron', 'Monsieur Dubois')],
    scenes: [
      { set: 'bureau', seconds: 6, narration: 'Karim ouvre sa fiche de paie.', lines: [], actions: [{ actor: 'employe', action: 'immobile' }] },
      { set: 'couloir', seconds: 6, lines: [{ speaker: 'patron', text: 'Qu’est-ce que vous faites là ?', expression: 'colere' }], actions: [{ actor: 'employe', action: 'pleurer' }] },
    ],
  },
  'both',
);

test('plan : seuls les héros qui parlent ou agissent sont à l’écran, jamais le narrateur', () => {
  assert.deepEqual(sceneCast(story, 0), ['employe']);
  assert.deepEqual(sceneCast(story, 1), ['patron', 'employe']);
});

test('montage : une piste audio par réplique, scènes contiguës, apparence propre au héros', () => {
  const timeline = placeSpoken(
    [
      { speaker: 'narrator', sceneIndex: 0, text: 'Karim ouvre sa fiche de paie.', expression: 'neutre', audioSec: 2, events: [] },
      { speaker: 'patron', sceneIndex: 1, text: 'Qu’est-ce que vous faites là ?', expression: 'colere', audioSec: 2, events: [] },
    ],
    story.scenes.map((s) => s.seconds),
  );
  const props = storyCartoonProps({
    story,
    timeline,
    audioFiles: ['audio/line-1.mp3', 'audio/line-2.mp3'],
    hook: story.hook,
    nicheName: 'test',
    width: 1080,
    height: 1920,
    showNiche: true,
    showProgress: true,
    hookFrames: 90,
    karaokeWords: [],
  });
  assert.equal(props.audioTracks?.length, 2);
  assert.equal(props.scenes.length, 2);
  assert.equal(props.scenes[1].actors[0].action, undefined);
  const pleurant = props.scenes[1].actors.find((a) => a.key === 'employe');
  assert.equal(pleurant?.action, 'pleurer');
  assert.equal(pleurant?.look?.hairColor, '#2B2B2B');
  assert.equal(props.utterances?.[1].speaker, 'patron');
});
