import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, characterById, DEFAULT_MAIN_CHARACTER } from '../../src/video-engine/cartoon/catalog.ts';
import { directScene } from '../../src/video-engine/cartoon/direction.ts';
import { cartoonScenes, characterForRole } from '../../src/video-engine/cartoon/props.ts';

test('mise en scène : décor par défaut et principal neutre sans mot reconnu', () => {
  assert.deepEqual(directScene('Une phrase sans rien de précis.'), {
    set: 'bureau',
    actors: [{ role: 'main', expression: 'neutre' }],
  });
});

test('mise en scène : décor reconnu, accents ignorés', () => {
  assert.equal(directScene('Il sort du couloir').set, 'couloir');
  assert.equal(directScene('Réunion urgente dans la salle').set, 'salle-reunion');
  assert.equal(directScene('Il attend dehors, dans la rue').set, 'exterieur');
});

test('mise en scène : émotion du principal et secondaire par segment', () => {
  const d = directScene('Le patron en colère, employé surpris');
  assert.deepEqual(d.actors, [
    { role: 'main', expression: 'surpris' },
    { role: 'patron', expression: 'colere' },
  ]);
});

test('mise en scène : une émotion sans personnage nommé va au principal', () => {
  const d = directScene('Il pleure en silence');
  assert.deepEqual(d.actors, [{ role: 'main', expression: 'triste' }]);
});

test('mise en scène : au plus trois personnages', () => {
  const d = directScene('le patron, la rh, le collègue, le stagiaire');
  assert.ok(d.actors.length <= 3);
  assert.equal(d.actors[0].role, 'main');
});

test('personnage secondaire : jamais le principal, repli sur un autre', () => {
  assert.equal(characterForRole('main', 'drh'), 'drh');
  assert.notEqual(characterForRole('patron', 'patron'), 'patron');
  assert.equal(characterForRole('collegue', 'employe'), 'collegue');
});

test('scènes : le principal parle, les autres non, placement selon le nombre', () => {
  const scenes = cartoonScenes(
    [directScene('employé content, patron en colère'), directScene('dans le couloir')],
    [
      { from: 0, durationInFrames: 90 },
      { from: 90, durationInFrames: 60 },
    ],
    'stagiaire',
  );
  const [first, second] = scenes;
  assert.equal(first.actors[0].characterId, 'stagiaire');
  assert.equal(first.actors[0].speaking, true);
  assert.equal(first.actors[1].speaking, false);
  assert.equal(first.actors[0].x < first.actors[1].x, true);
  assert.equal(second.actors.length, 1);
  assert.equal(second.actors[0].x, 0.5);
  assert.equal(second.from, 90);
});

test('catalogue : identifiants uniques, principal par défaut valide', () => {
  const ids = CHARACTERS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(characterById(DEFAULT_MAIN_CHARACTER).id, DEFAULT_MAIN_CHARACTER);
  assert.equal(characterById('inconnu').id, CHARACTERS[0].id);
});
