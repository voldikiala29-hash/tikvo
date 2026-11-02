// Réglages de rendu : format, style de montage, nombre de plans, voix et style de voix.
// Les sous-titres mot par mot sont toujours actifs (pas de réglage).
import React from 'react';
import { ASPECTS, CLIP_CHOICES, MONTAGES, type RenderSettings } from '../video-engine/montage';
import { VOICES, VOICE_STYLES, resolveVoice } from '../video-engine/voices';

export const Chip: React.FC<{ active: boolean; onClick: () => void; title?: string; children: React.ReactNode }> = ({
  active,
  onClick,
  title,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
      active ? 'border-[#00FFC6] text-[#00FFC6] bg-[#00FFC6]/10' : 'border-white/10 text-gray-400 hover:text-white'
    }`}
  >
    {children}
  </button>
);

const selectClass = 'w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50';

export const RenderSettingsPanel: React.FC<{ settings: RenderSettings; onChange: (next: RenderSettings) => void }> = ({ settings, onChange }) => {
  const montage = MONTAGES.find((m) => m.id === settings.montage) ?? MONTAGES[0];
  // Voix par défaut quand aucune n'est choisie : le réglage général (sans niche).
  const defaults = resolveVoice(null);
  const voiceId = settings.voice ?? defaults.voice;
  const styleId = settings.voiceStyle ?? defaults.style;
  return (
    <section className="rounded-2xl bg-[#12121A] border border-white/5 p-4 space-y-4" aria-label="Réglages du rendu">
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Format</p>
        <div className="flex flex-wrap gap-1.5">
          {ASPECTS.map((a) => (
            <Chip key={a.id} active={settings.aspect === a.id} title={a.hint} onClick={() => onChange({ ...settings, aspect: a.id })}>
              {a.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Style de montage</p>
        <div className="flex flex-wrap gap-1.5">
          {MONTAGES.map((m) => (
            <Chip key={m.id} active={settings.montage === m.id} onClick={() => onChange({ ...settings, montage: m.id })}>
              {m.label}
            </Chip>
          ))}
        </div>
        <p className="text-[11px] text-[#00FFC6]/80">
          {montage.label} : {montage.description}
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Plans vidéo par script</p>
        <div className="flex flex-wrap gap-1.5">
          {CLIP_CHOICES.map((c) => (
            <Chip key={c} active={settings.clipsPerScript === c} onClick={() => onChange({ ...settings, clipsPerScript: c })}>
              {c === 0 ? 'Auto' : `${c} plans`}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[11px] text-gray-400 mb-1">Voix off</span>
          <select value={voiceId} onChange={(e) => onChange({ ...settings, voice: e.target.value })} className={selectClass}>
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} · {v.gender} · {v.note}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] text-gray-400 mb-1">Style de voix</span>
          <select value={styleId} onChange={(e) => onChange({ ...settings, voiceStyle: e.target.value })} className={selectClass}>
            {VOICE_STYLES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
};
