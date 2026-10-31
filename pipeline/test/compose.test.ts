import test from 'node:test';
import assert from 'node:assert/strict';
import { composeProps, resolveBranding } from '../compose.ts';

const base = { hook: 'Test', nicheName: 'Tech', script: 'Bonjour le monde ici.', events: [], audioSec: 3, audioSrc: 'audio/voice.mp3', clips: [] };

test('par défaut : pas de nom de marque, badge et barre affichés', () => {
  const p = composeProps(base);
  assert.equal(p.brandTag, undefined);
  assert.equal(p.showNiche, true);
  assert.equal(p.showProgress, true);
});

test('branding activé : le nom choisi est affiché', () => {
  const p = composeProps({ ...base, branding: resolveBranding({ showBrand: true, brandName: 'Ma Marque' }) });
  assert.equal(p.brandTag, 'Ma Marque');
});

test('resolveBranding ignore les valeurs invalides', () => {
  const b = resolveBranding({ showBrand: 'oui', showNiche: false, brandName: '   ' });
  assert.equal(b.showBrand, false);
  assert.equal(b.showNiche, false);
  assert.equal(b.brandName, 'tikvo');
});
