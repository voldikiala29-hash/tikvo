import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProgram } from '../../src/services/programGenerator.ts';
import { carryOverrides, nichesOf, totalOf, withNicheForVideo, withProgramNiches } from '../../src/services/programEdit.ts';
import { queryPlan } from '../../pipeline/stock.ts';

const start = new Date('2026-11-01T12:00:00');
const base = generateProgram(['tech', 'sport'], '1week', start).days;

test('changer la niche d’une vidéo ne touche que celle-ci', () => {
  const next = withNicheForVideo(base, base[2].date, 1, 'cuisine', 7);
  assert.equal(next[2].videos[1].niche, 'cuisine');
  assert.equal(next[2].videos[1].time, base[2].videos[1].time);
  assert.equal(next[2].videos[0].script, base[2].videos[0].script);
  assert.equal(next[1].videos[1].script, base[1].videos[1].script);
  assert.notEqual(next[2].videos[1].script, base[2].videos[1].script);
});

test('changer les niches garde les jours passés et aujourd’hui', () => {
  const today = base[2].date;
  const next = withProgramNiches(base, ['voyage'], '1week', today);
  assert.equal(next.length, base.length);
  for (let d = 0; d <= 2; d++) assert.deepEqual(next[d], base[d]);
  for (let d = 3; d < next.length; d++) {
    assert.ok(next[d].videos.every((v) => v.niche === 'voyage'));
  }
});

test('niches et total recalculés', () => {
  assert.deepEqual(nichesOf(base).sort(), ['sport', 'tech']);
  assert.equal(totalOf(base), 21);
});

test('les scripts validés sont recopiés seulement pour les vidéos inchangées', () => {
  const today = base[0].date;
  const changed = withNicheForVideo(base, base[3].date, 0, 'mode', 3);
  const overrides = {
    [`old|${base[0].date}|0`]: 'Script validé du jour 1 ici.',
    [`old|${base[3].date}|0`]: 'Ancien script du jour 4 ici.',
    [`old|${base[3].date}|1`]: 'Script du jour 4 video 2 ici.',
    'other|x|0': 'ignoré car autre programme',
  };
  const carried = carryOverrides('old', 'new', overrides, base, changed);
  assert.equal(carried[`new|${today}|0`], 'Script validé du jour 1 ici.');
  assert.equal(carried[`new|${base[3].date}|1`], 'Script du jour 4 video 2 ici.');
  assert.equal(carried[`new|${base[3].date}|0`], undefined);
  assert.equal(Object.keys(carried).length, 2);
});

test('recréation : variante 0 = comportement d’origine, autres variantes = autres requêtes', () => {
  const q = ['a', 'b', 'c'];
  assert.deepEqual(queryPlan(q, 0), { queries: ['a', 'b', 'c'], page: 1 });
  assert.notDeepEqual(queryPlan(q, 1).queries, q);
  assert.equal(queryPlan(q, 3).page, 2);
});
